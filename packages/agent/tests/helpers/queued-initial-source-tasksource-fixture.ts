import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect } from 'bun:test';
import { loadProjectSetContext } from '../../src/config/project-context.ts';
import { runtimeConfigDigest } from '../../src/config/runtime-config.ts';
import { canonicalJson } from '../../src/contracts/public-ingress.ts';
import { HostStateStore, type WorkIdentity } from '../../src/host-state.ts';
import { admitLocalSessionWork, acquireLocalSourceWriterLease } from '../../src/orchestration/local-work-admission.ts';
import type { TaskSourceBindingRequest } from '../../src/orchestration/task-source-binding.ts';
import { MastraSessionBridge } from '../../src/orchestration/mastra-session-bridge.ts';
import { runPreparationFixtureInProcess } from './public-prewriter-fixture.ts';
import {
  continuationState as initialSourceState,
  hostDatabase as initialSourceHostDatabase,
  hostLedger as initialSourceHostLedger,
  hostStore as initialSourceHostStore,
  withInitialSourceCleanup,
  type InitialWorkFixture,
} from './initial-source-work-fixture.ts';
import { requireHostState, trustedTaskSourcePolicyDecision } from './task-source-host-fixture.ts';

export async function prepareQueuedInitialSourceTaskSource(f: InitialWorkFixture) {
  const db = initialSourceHostDatabase(f);
  const host = new HostStateStore(
    db,
    initialSourceHostStore(f).workspaceId,
    undefined,
    undefined,
    undefined,
    undefined,
    f.root,
    undefined,
    {
      verify: async ({ request, hostSnapshot }) => {
        requireHostState(hostSnapshot);
        const reference = hostSnapshot.work.lifecycle.references.find(
          (ref) =>
            ref.kind === 'execution_approval' &&
            ref.artifact_schema === 'LocalSourceWriteAuthorization/v1' &&
            ref.decision === 'approved' &&
            ref.disposition === 'current',
        );
        if (!reference) throw new Error('Peer Source authorization is missing');
        return {
          ...trustedTaskSourcePolicyDecision(request),
          source_authorization_reference: reference,
          source_authorization_sha256: reference.sha256,
        };
      },
    },
  );
  const peerPath = 'docs/PEER.md';
  writeFileSync(path.join(f.root, peerPath), 'Disjoint public TaskSource peer\n');
  const peerId = 'queued-source-peer';
  const peerInput = f.preparePeerAdmission(peerId, [peerPath]);
  const intakePath = '.agent/work/' + peerId + '/local-session-intake.json';
  writeFileSync(
    path.join(f.root, intakePath),
    canonicalJson({
      schema: 'VidaLocalSessionIntake/v1',
      work_item: peerInput.workItem,
      native_session_handle: peerInput.nativeSessionHandle,
      scope_path: peerInput.scopePath,
      acceptance_path: peerInput.acceptancePath,
      source_authorization_path: peerInput.sourceAuthorizationPath,
      runtime_code_paths: peerInput.runtimeCodePaths,
      route: peerInput.route,
      risk: peerInput.risk,
      change_kind: peerInput.changeKind,
    }),
  );
  const admitted = admitLocalSessionWork({ ...peerInput, intakePath });
  const peerIdentity = { ...f.identity, work_id: peerId };
  let peerBridge: MastraSessionBridge | undefined;
  await withInitialSourceCleanup(
    async () => {
      const bridge = await MastraSessionBridge.open({
        repositoryRoot: f.root,
        config: f.config,
        ledger: initialSourceHostLedger(f),
        projectIds: f.identity.project_ids,
        selection: peerInput.selection,
        context: peerInput.context,
        workflowId: 'task_execution',
        workspaceId: host.workspaceId,
      });
      peerBridge = bridge;
      await bridge.start(admitted.source);
      const peerWork = admitted.host.work;
      if (!peerWork) throw new Error('Admitted peer is missing');
      await runPreparationFixtureInProcess(
        {
          args: [],
          publicRun: () => {
            throw new Error('Peer fixture must not run the public CLI');
          },
          sync: () => {
            const journal = initialSourceHostLedger(f).resume(peerId, 1);
            if (!journal) throw new Error('Peer Journal is missing');
            return journal;
          },
          repositoryRoot: f.root,
          workId: peerId,
          attempt: 1,
          work: peerWork,
        },
        { ledger: initialSourceHostLedger(f), bridge, source: admitted.source },
      );
    },
    async () => {
      if (peerBridge) await peerBridge.close();
    },
    'Queued TaskSource peer bridge cleanup',
  );
  const targetBefore = initialSourceState(f);
  requireHostState(targetBefore);
  const targetLease = targetBefore.work.lease;
  if (!targetLease) throw new Error('Queued TaskSource target lease is missing');
  acquireLocalSourceWriterLease({
    repositoryRoot: f.root,
    config: f.config,
    store: host,
    identity: f.identity,
    nativeSessionHandle: targetLease.thread_id,
    stageId: 'develop_task',
    assignmentIndex: 0,
    expectedWork: targetBefore.workVersion,
    expectedLedger: targetBefore.ledgerVersion,
    expectedSessionJournal: { attempt: 1, version: targetBefore.journalVersion },
  });
  const branchRef = 'refs/heads/fixture-same-work-queued';
  const sourceRoot = f.root + '-unexecuted-proposal';
  const project = loadProjectSetContext(f.root, f.config, f.identity.repository_id, f.identity.project_ids);
  const issueFor = async (
    identity: WorkIdentity,
    authorizationPath: string,
    proposal = { suffix: '', branchRef, sourceRoot },
  ) => {
    const current = host.readHostStateSnapshot(identity);
    requireHostState(current);
    const journal = host.readWorkSessionJournal(identity);
    if (!journal) throw new Error('TaskSource owner Journal is missing');
    const lease = current.work.lease;
    if (!lease) throw new Error('TaskSource owner lease is missing');
    const request: TaskSourceBindingRequest = {
      schema: 'TaskSourceBindingRequest/v1',
      operation: 'propose-create',
      operation_id: 'queued-source-' + identity.work_id + proposal.suffix,
      request_id: 'queued-source-request-' + identity.work_id + proposal.suffix,
      branch_ref: proposal.branchRef,
      source_root: proposal.sourceRoot,
      expected_host: {
        work: current.workVersion,
        ledger: current.ledgerVersion,
        journal: { attempt: 1, version: journal.version },
        maintenance_generation: current.maintenanceGeneration,
      },
      work_id: identity.work_id,
      attempt: 1,
      thread_id: lease.thread_id,
      repository_id: identity.repository_id,
      project_ids: identity.project_ids,
      canonical_host_root: f.root,
      config_digest: runtimeConfigDigest(f.config),
      project_context_digest: project.project_context_digest,
    };
    const sourceAuthorizationDigest = createHash('sha256')
      .update(readFileSync(path.join(f.root, authorizationPath)))
      .digest('hex');
    const prepared = host.prepareTaskSourceBindingOperation({
      request,
      identity,
      verifyCurrent: (state) => {
        expect(state.work).toEqual(current.work);
        expect(state.ledger).toEqual(current.ledger);
        expect(state.journal).toEqual(journal.state);
        return {
          source_authorization_sha256: sourceAuthorizationDigest,
          source_scope_digest: current.work.binding.work_source_revision,
        };
      },
    });
    expect(prepared.status).toBe('prepared');
    return { request, journal, result: await host.issueTaskSourceBindingOperation({ request, identity }) };
  };
  expect(
    db.query("SELECT name FROM sqlite_master WHERE name='agent_host_task_source_resource_transition'").get(),
  ).toBeNull();
  const peerAuthorizationPath = peerInput.sourceAuthorizationPath;
  if (!peerAuthorizationPath) throw new Error('Peer authorization path is missing');
  const peerIssued = await issueFor(peerIdentity, peerAuthorizationPath);
  expect(peerIssued.result.status).toBe('issued');
  const queued = await issueFor(f.identity, f.sourceAuthorizationPath);
  expect(queued.result).toMatchObject({ status: 'queued', action: null, state_version: null, command_argv: null });
  return { db, host, peerIdentity, peerIssued, queued, sourceRoot, branchRef, issueFor };
}
