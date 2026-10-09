import { Database } from 'bun:sqlite';
import Ajv2020 from 'ajv/dist/2020.js';
import workSchema from '../schemas/work-state.v1.schema.json' with { type: 'json' };
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.js';
import { loadProjectSetContext } from '../src/config/project-context.js';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.js';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.js';
import { coordinationLedgerDigest } from '../src/contracts/envelopes.js';
import {
  openConfiguredMastraSessionLedger,
  sessionHandoffDatabasePath,
  validateResearchJournalItem,
} from '../src/orchestration/persistent-session-handoff.js';
import {
  parseSessionBridgeObservation,
  parseSessionBridgeRequest,
  sessionBridgeDatabasePath,
  sessionBridgeRunId,
} from '../src/orchestration/mastra-session-bridge.js';
import { suspendCompletedReadOnlyWork } from '../src/orchestration/suspend-local-work.js';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.js';
import { assertAdmittedRuntimeCodeCurrent } from '../src/orchestration/admitted-session-execution.js';
import { inspectLocalSession } from '../src/orchestration/inspect-local-session.js';
import { checkedMaintenanceFence } from '../src/host-state.js';
import { deriveWorkspaceId } from '../src/workspace-identity.js';
import { cooperativeReadonlyAssignments } from './runtime-config-rebind.mjs';
import { verifyForwardCandidateAdmission } from './forward-candidate-admission.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const requireCapture = (value, message) => {
  if (!value) throw Error('completed readonly capture: ' + message);
};
const equal = (left, right) => canonicalJsonDigest(left) === canonicalJsonDigest(right);

/** Fixed admitted administrative route. Captured completion is not canonical acceptance. */
export async function runCompletedReadOnlyCapture({ root, payloadRoot, operationId, requestPath }, { onPhase } = {}) {
  root = path.resolve(root);
  payloadRoot = path.resolve(payloadRoot);
  const admission = () =>
    verifyForwardCandidateAdmission({
      root,
      payloadRoot,
      operationId,
      moduleUrl: import.meta.url,
      purpose: 'completed-readonly-capture',
    });
  const admitted = admission(),
    config = loadRuntimeConfig(root),
    access = requireSafeRepositoryAccess(root);
  const requestBytes = access.readBytes(requestPath, 'attributed completed readonly capture');
  requireCapture(requestBytes.length <= 65536, 'request exceeds bound');
  const request = JSON.parse(requestBytes);
  requireCapture(
    Object.keys(request).sort().join(',') ===
      [
        'work_id',
        'project_ids',
        'attempt',
        'native_session_handle',
        'user_request_pointer',
        'expected_work',
        'expected_ledger',
        'expected_journal',
        'reports',
      ]
        .sort()
        .join(',') &&
      typeof request.work_id === 'string' &&
      /^[a-z0-9][a-z0-9._-]{0,79}$/.test(request.work_id) &&
      Array.isArray(request.project_ids) &&
      request.project_ids.length === 1 &&
      typeof request.project_ids[0] === 'string' &&
      Number.isSafeInteger(request.attempt) &&
      request.attempt > 0 &&
      typeof request.native_session_handle === 'string' &&
      request.native_session_handle.trim() &&
      typeof request.user_request_pointer === 'string' &&
      request.user_request_pointer.trim() &&
      Array.isArray(request.reports) &&
      request.reports.length > 0 &&
      request.reports.length <= 32,
    'request identity or fields invalid',
  );
  let ledger = null,
    store = null;
  try {
    const context = loadProjectSetContext(root, config, config.repository.repository_id, request.project_ids);
    const identity = {
      repository_id: context.repository_id,
      project_ids: context.project_ids,
      integrations_digest: context.integrations_digest,
      work_id: request.work_id,
    };
    const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
    const inspected = inspectLocalSession({
      repositoryRoot: root,
      config,
      projectIds: identity.project_ids,
      integrationsDigest: identity.integrations_digest,
      workId: identity.work_id,
      attempt: request.attempt,
    });
    let maintenance;
    const fenceDatabase = new Database(sessionHandoffDatabasePath(root, config), { readonly: true, strict: true });
    try {
      const row = fenceDatabase
        .query('SELECT revision,payload,digest FROM agent_host_maintenance WHERE workspace_id=?')
        .get(workspaceId);
      if (row) {
        maintenance = checkedMaintenanceFence(JSON.parse(row.payload));
        requireCapture(
          maintenance.workspace_id === workspaceId &&
            maintenance.revision === row.revision &&
            canonicalJsonDigest(maintenance) === row.digest,
          'maintenance inspection checksum differs',
        );
      }
    } finally {
      fenceDatabase.close();
    }
    let host;
    if (inspected.lease === null) {
      if (maintenance?.status === 'held') {
        const intent = JSON.parse(
          access.readBytes(`.agent/cutover/${operationId}/forward-intent.v1.json`, 'terminal held-fence intent'),
        );
        requireCapture(
          maintenance.binding.operation_id === operationId &&
            maintenance.binding.bundle_digest === intent.old_payload_manifest_sha256 &&
            context.project_ids.every((id) => maintenance.binding.project_ids.includes(id)),
          'foreign terminal maintenance binding',
        );
      }
      requireCapture(
        inspected.work_version &&
          inspected.ledger_version &&
          inspected.lease === null &&
          inspected.execution_status === 'suspended',
        'incomplete capture conflicts with held global fence',
      );
      const database = new Database(sessionHandoffDatabasePath(root, config), { readonly: true, strict: true });
      try {
        const key = JSON.stringify([
          identity.repository_id,
          identity.project_ids,
          identity.integrations_digest,
          identity.work_id,
        ]);
        const workRow = database
          .query("SELECT payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='work' AND id=?")
          .get(workspaceId, key);
        const ledgerRow = database
          .query("SELECT payload,digest FROM agent_host_state WHERE workspace_id=? AND kind='ledger' AND id='shared'")
          .get(workspaceId);
        requireCapture(workRow && ledgerRow, 'terminal host state missing');
        const work = JSON.parse(workRow.payload),
          coordination = JSON.parse(ledgerRow.payload),
          validator = new Ajv2020({ allErrors: true });
        requireCapture(
          validator.compile(workSchema)(work) &&
            canonicalJsonDigest(work) === inspected.work_version.digest &&
            workRow.digest === inspected.work_version.digest &&
            coordinationLedgerDigest(coordination) === inspected.ledger_version.digest &&
            ledgerRow.digest === inspected.ledger_version.digest,
          'terminal host schema or snapshot drift',
        );
        host = {
          work,
          ledger: coordination,
          workVersion: inspected.work_version,
          ledgerVersion: inspected.ledger_version,
        };
      } finally {
        database.close();
      }
    } else {
      requireCapture(maintenance?.status !== 'held', 'incomplete capture conflicts with held global fence');
      ledger = openConfiguredMastraSessionLedger(root);
      store = ledger.hostState;
      host = store.readHostStateSnapshot(identity);
    }
    const terminal = host.work?.lease === null;
    let journal;
    if (terminal) {
      // After owner closure, publication may hold the global fence and change
      // scoped source bytes. Observe the exact persisted completion read-only;
      // never reopen the working journal or grant maintenance working access.
      const database = new Database(sessionHandoffDatabasePath(root, config), { readonly: true, strict: true });
      try {
        const row = database
          .query(
            'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
          )
          .get(workspaceId, request.work_id, request.attempt);
        requireCapture(
          row && Number.isSafeInteger(row.revision) && row.revision > 0,
          'terminal original journal missing',
        );
        const state = JSON.parse(row.payload);
        requireCapture(
          state.schema === 'MastraSessionLedger/v1' &&
            state.workspace_id === workspaceId &&
            state.work_id === request.work_id &&
            state.attempt === request.attempt &&
            row.digest === canonicalJsonDigest(state) &&
            Array.isArray(state.items) &&
            Array.isArray(state.completed) &&
            [...state.items, ...state.completed.flatMap((step) => step.items)].every((item) =>
              validateResearchJournalItem(item, state),
            ),
          'terminal journal identity or closure invalid',
        );
        journal = { state, version: { revision: row.revision, digest: row.digest } };
      } finally {
        database.close();
      }
    } else {
      requireCapture(
        store.readMaintenanceFence()?.status !== 'held',
        'incomplete capture conflicts with held global fence',
      );
      journal = ledger.resume(request.work_id, request.attempt);
    }
    requireCapture(journal, 'original attempt missing');
    requireCapture(
      host.work &&
        host.ledger &&
        host.workVersion &&
        host.ledgerVersion &&
        host.work.execution.run_id === journal.state.run_id &&
        host.work.binding.config_digest === runtimeConfigDigest(config) &&
        host.work.binding.lifecycle_work_id === request.work_id &&
        host.work.binding.repository_id === identity.repository_id &&
        equal(host.work.binding.project_ids, identity.project_ids) &&
        host.work.binding.integrations_digest === identity.integrations_digest &&
        host.work.execution.assignment_attempts.every((entry) => !['started', 'uncertain'].includes(entry.status)),
      'current original work/config or activity differs',
    );
    requireCapture(
      journal.state.source_scope?.schema === 'ScopedSourceSnapshot/v1' &&
        journal.state.source_scope.digest ===
          canonicalJsonDigest({
            schema: journal.state.source_scope.schema,
            entries: journal.state.source_scope.entries,
          }),
      'original source binding invalid',
    );
    if (!terminal)
      requireCapture(
        equal(
          snapshotDeclaredSources(
            access,
            journal.state.source_scope.entries.map((entry) => entry.path),
          ),
          journal.state.source_scope,
        ),
        'original source bytes differ',
      );
    const original = new Database(sessionBridgeDatabasePath(root, config), { readonly: true, strict: true });
    try {
      const rows = original
        .query('SELECT workflow_name,json(snapshot) AS snapshot FROM mastra_workflow_snapshot WHERE run_id=?')
        .all(journal.state.run_id);
      requireCapture(rows.length === 1, 'original suspended snapshot missing/ambiguous');
      const snapshot = JSON.parse(rows[0].snapshot),
        input = snapshot.context?.input;
      requireCapture(
        snapshot.status === 'suspended' &&
          snapshot.runId === journal.state.run_id &&
          input?.work_id === request.work_id &&
          input.attempt === request.attempt &&
          input.config_digest === runtimeConfigDigest(config) &&
          input.scope_digest === journal.state.source_scope.digest &&
          rows[0].workflow_name === input.workflow_id &&
          sessionBridgeRunId(
            workspaceId,
            { work_id: request.work_id, attempt: request.attempt, scope_digest: input.scope_digest },
            input.workflow_id,
          ) === journal.state.run_id,
        'original run/config/source differs',
      );
      for (const item of [...journal.state.completed.flatMap((step) => step.items), ...journal.state.items]) {
        const issued = parseSessionBridgeRequest(item.request),
          wave = snapshot.context?.[`wave-${issued.wave_index}`];
        requireCapture(
          !item.host_reservation &&
            issued.run_id === journal.state.run_id &&
            issued.workflow_id === input.workflow_id &&
            issued.config_digest === input.config_digest &&
            issued.scope_digest === input.scope_digest &&
            cooperativeReadonlyAssignments(config, issued) &&
            issued.action_id ===
              canonicalJsonDigest({
                context: { work_id: request.work_id, attempt: request.attempt, scope_digest: input.scope_digest },
                workflow_id: issued.workflow_id,
                wave_index: issued.wave_index,
                stage_id: issued.stage_id,
                assignment_index: issued.assignment_index,
              }) &&
            wave?.suspendPayload?.requests?.filter((entry) => entry.action_id === issued.action_id).length === 1 &&
            equal(
              wave.suspendPayload.requests.find((entry) => entry.action_id === issued.action_id),
              issued,
            ),
          'original issued action is not proven readonly',
        );
      }
    } finally {
      original.close();
    }
    const observations = request.reports.map((file) => {
      requireCapture(typeof file === 'string', 'report pointer invalid');
      const bytes = access.readBytes(file, 'actual completed native observation');
      requireCapture(bytes.length <= 65536, 'report exceeds bound');
      const observation = parseSessionBridgeObservation(JSON.parse(bytes));
      requireCapture(
        observation.status === 'reported_complete' && observation.host_attempt_id === undefined,
        'completed readonly observation required',
      );
      return observation;
    });
    requireCapture(
      new Set(observations.map((entry) => entry.action_id)).size === observations.length,
      'capture action duplicated',
    );
    const pending = observations.filter((observation) => {
      const item = journal.state.items.find((entry) => entry.request.action_id === observation.action_id);
      requireCapture(
        item && item.issue_id === observation.issue_id && !item.research_normalization,
        'exact open original issue required',
      );
      if (item.observation) {
        requireCapture(equal(item.observation, observation), 'different completion replay');
        return false;
      }
      return true;
    });
    const replayed = observations.length - pending.length;
    const originalState = {
      ...journal.state,
      items: journal.state.items.map((item) =>
        observations.some((entry) => entry.action_id === item.request.action_id)
          ? { ...item, observation: null }
          : item,
      ),
    };
    requireCapture(
      journal.version.revision === request.expected_journal.revision + replayed &&
        canonicalJsonDigest(originalState) === request.expected_journal.digest,
      'capture original journal compare-and-swap differs',
    );
    if (terminal) {
      const intentBytes = access.readBytes(
        `.agent/cutover/${operationId}/forward-intent.v1.json`,
        'terminal forward intent',
      );
      const intent = JSON.parse(intentBytes),
        prefix = access
          .readBytes(`.agent/cutover/${operationId}/forward-journal.v1.jsonl`, 'terminal prefix journal')
          .toString('utf8')
          .trim()
          .split('\n')
          .filter(Boolean)
          .map(JSON.parse);
      const current = snapshotDeclaredSources(
        access,
        journal.state.source_scope.entries.map((entry) => entry.path),
      );
      for (const entry of current.entries) {
        const prior = journal.state.source_scope.entries.find((value) => value.path === entry.path);
        if (equal(entry, prior)) continue;
        const change = intent.changed.find((value) => value.path === entry.path);
        requireCapture(
          change &&
            prior.exists &&
            entry.exists &&
            change.old_sha256 === prior.sha256 &&
            change.new_sha256 === entry.sha256 &&
            prefix.some(
              (event) =>
                event.schema === 'VidaForwardUpdateEvent/v1' &&
                event.operation_id === operationId &&
                event.lock_sha256 === admitted.intent_sha256 &&
                event.phase === 'file_replaced' &&
                event.path === entry.path,
            ),
          'terminal source drift is not declared published prefix',
        );
      }
      const releaseId =
        'completed-readonly-release-' +
        canonicalJsonDigest({
          work_id: identity.work_id,
          nativeSessionHandle: request.native_session_handle,
          userRequestPointer: request.user_request_pointer,
          requestIntent: 'linked_correction',
          journal: journal.version.digest,
        }).slice(0, 40);
      const release = host.ledger.operations.filter((entry) => entry.operation_id === releaseId);
      requireCapture(
        pending.length === 0 &&
          host.work.execution.status === 'suspended' &&
          host.workVersion.revision === request.expected_work.revision + 1 &&
          host.ledgerVersion.revision === request.expected_ledger.revision + 1 &&
          release.length === 1 &&
          release[0].kind === 'release' &&
          release[0].work_id === identity.work_id &&
          release[0].thread_id === request.native_session_handle &&
          release[0].decided_by === request.native_session_handle &&
          release[0].decision_pointer === request.user_request_pointer &&
          release[0].source_revision === host.work.binding.work_source_revision &&
          release[0].from_ledger_revision === request.expected_ledger.revision &&
          release[0].to_ledger_revision === request.expected_ledger.revision + 1 &&
          equal(
            [...release[0].resources].sort(),
            host.work.binding.implementation_paths.map((value) => 'file:' + value).sort(),
          ) &&
          host.ledger.tickets.some(
            (ticket) =>
              ticket.ticket_id === release[0].ticket_id &&
              ticket.status === 'released' &&
              ticket.work_id === identity.work_id &&
              ticket.thread_id === request.native_session_handle,
          ) &&
          host.ledger.claims.filter((claim) => claim.ticket_id === release[0].ticket_id).length === 1 &&
          host.ledger.claims
            .filter((claim) => claim.ticket_id === release[0].ticket_id)
            .every(
              (claim) =>
                claim.status === 'released' &&
                claim.work_id === identity.work_id &&
                claim.thread_id === request.native_session_handle,
            ) &&
          [...journal.state.completed.flatMap((step) => step.items), ...journal.state.items].every(
            (item) =>
              item.issue_id !== null &&
              item.observation?.status === 'reported_complete' &&
              !item.host_reservation &&
              !item.research_normalization,
          ),
        'terminal capture or exact owner release proof differs',
      );
      requireCapture(
        equal(admission(), admitted) && access.readBytes(requestPath, 'terminal capture request').equals(requestBytes),
        'terminal admission/request drift',
      );
      return {
        status: 'captured_normalization_pending',
        work_id: request.work_id,
        attempt: request.attempt,
        journal_version: journal.version,
        work_version: host.workVersion,
        ledger_version: host.ledgerVersion,
        owner_released: true,
        canonical_acceptance: false,
        native_calls: 0,
        runtime_acceptance: false,
      };
    }
    if (pending.length) {
      requireCapture(
        equal(host.workVersion, request.expected_work) && equal(host.ledgerVersion, request.expected_ledger),
        'capture owner compare-and-swap version differs',
      );
      const intake = assertAdmittedRuntimeCodeCurrent(root, store, identity);
      requireCapture(intake.native_session_handle === request.native_session_handle, 'original native session changed');
    }
    requireCapture(
      host.work.lease === null || host.work.lease.thread_id === request.native_session_handle,
      'foreign native owner',
    );
    for (const observation of pending) {
      requireCapture(
        equal(admission(), admitted) &&
          access.readBytes(requestPath, 'capture request replay').equals(requestBytes) &&
          runtimeConfigDigest(loadRuntimeConfig(root)) === runtimeConfigDigest(config),
        'admission/request/config drift',
      );
      requireCapture(
        equal(
          snapshotDeclaredSources(
            access,
            journal.state.source_scope.entries.map((entry) => entry.path),
          ),
          journal.state.source_scope,
        ),
        'original source changed before observation',
      );
      journal = ledger.report(
        request.work_id,
        request.attempt,
        journal.version,
        observation,
        journal.state.source_scope,
      );
      onPhase?.('observation_captured');
    }
    requireCapture(
      [...journal.state.completed.flatMap((step) => step.items), ...journal.state.items].every(
        (item) => item.issue_id !== null && item.observation?.status === 'reported_complete',
      ),
      'other issued activity remains unknown/failed',
    );
    requireCapture(equal(admission(), admitted), 'admission changed before owner release');
    requireCapture(
      access.readBytes(requestPath, 'capture release replay').equals(requestBytes) &&
        runtimeConfigDigest(loadRuntimeConfig(root)) === runtimeConfigDigest(config) &&
        equal(
          snapshotDeclaredSources(
            access,
            journal.state.source_scope.entries.map((entry) => entry.path),
          ),
          journal.state.source_scope,
        ),
      'original request/config/source changed before owner release',
    );
    host = store.readHostStateSnapshot(identity);
    requireCapture(
      host.work.lease === null ||
        (equal(host.workVersion, request.expected_work) && equal(host.ledgerVersion, request.expected_ledger)),
      'owner release compare-and-swap changed',
    );
    const released = suspendCompletedReadOnlyWork({
      store,
      identity,
      journal,
      expectedWork: host.workVersion,
      expectedLedger: host.ledgerVersion,
      nativeSessionHandle: request.native_session_handle,
      userRequestPointer: request.user_request_pointer,
      requestIntent: 'linked_correction',
      documentationContext: {
        repository_root: root,
        repository_id: identity.repository_id,
        project_id: identity.project_ids[0],
        work_id: request.work_id,
      },
    });
    onPhase?.('owner_released');
    requireCapture(
      released.work.lease === null && released.work.execution.status === 'suspended',
      'owner closure missing',
    );
    return {
      status: 'captured_normalization_pending',
      work_id: request.work_id,
      attempt: request.attempt,
      journal_version: journal.version,
      work_version: released.workVersion,
      ledger_version: released.ledgerVersion,
      owner_released: true,
      canonical_acceptance: false,
      native_calls: 0,
      runtime_acceptance: false,
    };
  } finally {
    ledger?.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const values = Object.fromEntries(
    Array.from({ length: (process.argv.length - 2) / 2 }, (_, index) => [
      process.argv[2 + index * 2],
      process.argv[3 + index * 2],
    ]),
  );
  try {
    const result = await runCompletedReadOnlyCapture({
      root: values['--project-root'],
      payloadRoot: values['--payload-root'],
      operationId: values['--forward-operation'],
      requestPath: values['--capture-request'],
    });
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(JSON.stringify({ status: 'blocked', message: error.message }));
    process.exitCode = 1;
  }
}
