import { createHash } from 'node:crypto';
import { lstatSync } from 'node:fs';
import { Database } from 'bun:sqlite';
import path from 'node:path';
import {
  loadRuntimeConfig,
  runtimeConfigDigest,
  selectWorkflow,
  type WorkItemSelection,
} from '../config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import { validateResearchJournalItem, type MastraSessionLedgerState } from './persistent-session-handoff.js';
import { correctiveExecutionSchema } from './final-assurance.js';
import { parseSessionBridgeRequest, parseSessionBridgeObservation } from './mastra-session-bridge.js';
import { readSessionEngineSnapshot } from './session-engine-snapshot.js';
import { withHostStateExclusiveTransaction } from '../host-state.js';
import { validateHostOperationReservation } from '../governance/edictum-boundary.js';
import { deriveWorkspaceId } from '../workspace-identity.js';

export interface StagedRuntimeWitness {
  readonly schema: 'VidaStagedRuntimeWitness/v1';
  readonly payload_manifest_sha256: string;
  readonly config_sha256: string;
  readonly config_yaml: string;
  readonly config_digest: string;
  readonly workflow_id: string;
  readonly work_id: string;
  readonly attempt: number;
  readonly run_id: string;
  readonly ledger_revision: number;
  readonly ledger_digest: string;
  readonly ledger_state: MastraSessionLedgerState;
  readonly mastra_status: 'success';
  readonly mastra_observations_digest: string;
  readonly digest: string;
}

function requireWitness(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`staged runtime witness: ${message}`);
}

/** A local controller export from the validated config and persisted Mastra journal. */
export async function createStagedRuntimeWitness(input: {
  readonly repositoryRoot: string;
  readonly payloadManifestSha256: string;
  readonly workId: string;
  readonly attempt: number;
  readonly selection: WorkItemSelection;
}): Promise<StagedRuntimeWitness> {
  const { repositoryRoot, payloadManifestSha256, workId, attempt, selection } = input;
  requireWitness(/^[a-f0-9]{64}$/.test(payloadManifestSha256), 'payload digest is invalid');
  requireWitness(
    typeof workId === 'string' && workId.length > 0 && Number.isSafeInteger(attempt) && attempt >= 1,
    'work attempt is invalid',
  );
  const config = loadRuntimeConfig(repositoryRoot);
  const workflowId = selectWorkflow(config, selection).workflow_id;
  const access = requireSafeRepositoryAccess(repositoryRoot);
  const databasePath = `${config.control.work_root}/session-handoff.v1.sqlite`;
  requireWitness(
    access.fileExists(databasePath, 'staged witness persisted journal'),
    'persisted Mastra journal is absent',
  );
  const configBytes = access.readBytes('agent-runtime.config.v1.yaml', 'staged witness config');
  const physical = path.join(repositoryRoot, databasePath),
    before = lstatSync(physical);
  requireWitness(before.isFile() && !before.isSymbolicLink() && before.nlink === 1, 'journal database path is unsafe');
  requireWitness(
    Buffer.from(configBytes.toString('utf8'), 'utf8').equals(configBytes),
    'staged configuration is not UTF-8',
  );
  return withHostStateExclusiveTransaction(path.join(repositoryRoot, databasePath), () => {
    const workspaceId = deriveWorkspaceId(config.repository.repository_id, repositoryRoot);
    const database = new Database(path.join(repositoryRoot, databasePath), { readonly: true, strict: true });
    let snapshot;
    try {
      const governance = database
        .query(
          "SELECT record_key,revision,payload,digest FROM agent_host_governance WHERE workspace_id=? AND store_id='vida-session-producers' AND kind='operation'",
        )
        .all(workspaceId) as { record_key: string; revision: number; payload: string; digest: string }[];
      for (const row of governance) {
        const record = validateHostOperationReservation(JSON.parse(row.payload));
        requireWitness(
          record.store_id === 'vida-session-producers' &&
            record.operation_key === row.record_key &&
            canonicalJsonDigest({
              workspace_id: workspaceId,
              store_id: record.store_id,
              kind: 'operation',
              record_key: row.record_key,
              revision: row.revision,
              payload: record,
            }) === row.digest &&
            record.status === 'applied' &&
            row.revision === 3,
          'engine producer is unknown or invalid',
        );
      }
      const row = database
        .query(
          'SELECT revision,payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(workspaceId, workId, attempt) as { revision: number; payload: string; digest: string } | null;
      requireWitness(row && Number.isSafeInteger(row.revision) && row.revision > 0, 'persisted journal is absent');
      const state = JSON.parse(row.payload) as MastraSessionLedgerState;
      requireWitness(
        state.schema === 'MastraSessionLedger/v1' &&
          state.workspace_id === workspaceId &&
          state.work_id === workId &&
          state.attempt === attempt &&
          canonicalJsonDigest(state) === row.digest &&
          Array.isArray(state.items) &&
          Array.isArray(state.completed) &&
          state.items.length === 0 &&
          state.completed.every(
            (wave) => typeof wave.step_id === 'string' && Array.isArray(wave.items) && wave.items.length > 0,
          ) &&
          new Set(state.completed.map((wave) => wave.step_id)).size === state.completed.length,
        'journal identity or checksum differs',
      );
      if (state.corrective_execution)
        requireWitness(
          correctiveExecutionSchema.parse(state.corrective_execution).engine_run_id === state.run_id,
          'corrective engine differs',
        );
      if (state.source_scope)
        requireWitness(
          state.source_scope.schema === 'ScopedSourceSnapshot/v1' &&
            state.source_scope.digest ===
              canonicalJsonDigest({ schema: state.source_scope.schema, entries: state.source_scope.entries }),
          'source scope is invalid',
        );
      for (const item of [...state.items, ...state.completed.flatMap((wave) => wave.items)]) {
        parseSessionBridgeRequest(item.request);
        if (item.observation) parseSessionBridgeObservation(item.observation);
        requireWitness(
          validateResearchJournalItem(item, state) &&
            canonicalJsonDigest(item.request.corrective_execution ?? null) ===
              canonicalJsonDigest(state.corrective_execution ?? null) &&
            item.observation?.host_attempt_id === item.host_reservation?.receipt.attempt.attempt_id &&
            (!item.host_reservation ||
              (item.host_reservation.schema === 'WorkflowSessionReservation/v1' &&
                item.host_reservation.request.workItemId === workId &&
                item.host_reservation.request.stageId === item.request.stage_id &&
                item.host_reservation.request.assignmentIndex === item.request.assignment_index &&
                item.host_reservation.receipt.attempt.correction_generation ===
                  (state.corrective_execution?.correction_generation ?? 0) &&
                canonicalJsonDigest(item.host_reservation.receipt.attempt.correction_authorization ?? null) ===
                  canonicalJsonDigest(state.corrective_execution?.authorization ?? null))),
          'journal item binding differs',
        );
      }
      snapshot = {
        state,
        version: { revision: row.revision, digest: row.digest },
        resume_status: state.step_id === null ? 'complete' : 'ready',
      };
    } finally {
      database.close();
    }
    requireWitness(
      snapshot !== null &&
        snapshot.state.schema === 'MastraSessionLedger/v1' &&
        snapshot.state.work_id === workId &&
        snapshot.state.attempt === attempt &&
        snapshot.state.step_id === null &&
        snapshot.resume_status === 'complete' &&
        snapshot.state.run_id.length > 0 &&
        snapshot.version.digest === canonicalJsonDigest(snapshot.state),
      'persisted journal identity or digest is invalid',
    );
    const observed = snapshot.state.completed.flatMap((wave) => wave.items);
    requireWitness(
      observed.length > 0 &&
        observed.every(
          (item) =>
            item.issue_id !== null &&
            item.observation?.issue_id === item.issue_id &&
            item.observation.action_id === item.request.action_id &&
            item.observation.status === 'reported_complete' &&
            item.observation.output_digest === canonicalJsonDigest(item.observation.summary) &&
            item.request.run_id === snapshot.state.run_id &&
            item.request.workflow_id === workflowId &&
            item.request.config_digest === runtimeConfigDigest(config),
        ),
      'persisted journal lacks matching completed workflow observations',
    );
    const scopeDigest = observed[0]!.request.scope_digest;
    requireWitness(
      observed.every((item) => item.request.scope_digest === scopeDigest),
      'persisted journal scope differs between actions',
    );
    const mastra = readSessionEngineSnapshot({
      repositoryRoot,
      config,
      selection,
      context: { work_id: workId, attempt, scope_digest: scopeDigest },
      workflowId,
      runId: snapshot.state.run_id,
    });
    const journalObservations = observed.map((item) => item.observation);
    requireWitness(
      mastra?.status === 'success' &&
        mastra.run_id === snapshot.state.run_id &&
        mastra.step_id === null &&
        mastra.requests.length === 0 &&
        canonicalJsonDigest(mastra.observations) === canonicalJsonDigest(journalObservations),
      'persisted Mastra run is not the same successful completed journal',
    );
    const body = {
      schema: 'VidaStagedRuntimeWitness/v1' as const,
      payload_manifest_sha256: payloadManifestSha256,
      config_sha256: createHash('sha256').update(configBytes).digest('hex'),
      config_yaml: configBytes.toString('utf8'),
      config_digest: runtimeConfigDigest(config),
      workflow_id: workflowId,
      work_id: workId,
      attempt,
      run_id: snapshot.state.run_id,
      ledger_revision: snapshot.version.revision,
      ledger_digest: snapshot.version.digest,
      ledger_state: snapshot.state,
      mastra_status: 'success' as const,
      mastra_observations_digest: canonicalJsonDigest(mastra.observations),
    };
    requireWitness(
      access.readBytes('agent-runtime.config.v1.yaml', 'staged witness final config').equals(configBytes),
      'configuration changed during inspection',
    );
    const after = lstatSync(physical);
    requireWitness(
      after.isFile() &&
        !after.isSymbolicLink() &&
        after.nlink === 1 &&
        after.ino === before.ino &&
        after.dev === before.dev,
      'journal database was substituted',
    );
    return { ...body, digest: canonicalJsonDigest(body) };
  });
}
