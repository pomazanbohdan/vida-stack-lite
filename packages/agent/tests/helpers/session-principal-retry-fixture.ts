import { createHash } from 'node:crypto';
import { spyOn } from 'bun:test';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadRuntimeConfig, runtimeConfigDigest, type WorkItemSelection } from '../../src/config/runtime-config.ts';
import type { WorkIdentity } from '../../src/host-state.ts';
import { acquireLocalSourceWriterLease } from '../../src/orchestration/local-work-admission.ts';
import { openAdmittedSessionExecution } from '../../src/orchestration/admitted-session-execution.ts';
import { reconcileUnissuedLocalSessionAction } from '../../src/orchestration/local-session-reconciliation.ts';
import { openConfiguredMastraSessionLedger } from '../../src/orchestration/persistent-session-handoff.ts';
import { prepareWorkflowExecution, reserveWorkflowAssignmentForSession } from '../../src/runtime-kernel.ts';
import * as runtimeKernel from '../../src/runtime-kernel.ts';
import { completeOwnedCleanup } from '../../tooling/owned-cleanup-completion.ts';
import { withInitialSourceCleanup } from './initial-source-work-fixture.ts';

interface Input {
  readonly mode: 'seed' | 'nested';
  readonly root: string;
  readonly identity: WorkIdentity;
  readonly selection: WorkItemSelection;
  readonly nativeSessionHandle: string;
  readonly successorSessionHandle?: string;
  readonly previousAttemptId?: string;
}

function required<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined) throw new Error(label + ' is missing');
  return value;
}

export async function runSessionPrincipalRetry(input: Input) {
  const config = loadRuntimeConfig(input.root);
  const ledger = openConfiguredMastraSessionLedger(input.root);
  let dispatchCalls = 0,
    casWriterCalls = 0;
  const compose = runtimeKernel.createTrustedLocalSessionComposition;
  const compositionObserver = spyOn(runtimeKernel, 'createTrustedLocalSessionComposition').mockImplementation(
    (request) =>
      compose({
        ...request,
        services: {
          ...request.services,
          dispatchWorkflowAssignment: (...args) => {
            dispatchCalls++;
            if (!request.services.dispatchWorkflowAssignment) throw new Error('Native dispatch boundary is absent');
            return request.services.dispatchWorkflowAssignment(...args);
          },
          casWriter: (...args) => {
            casWriterCalls++;
            return request.services.casWriter(...args);
          },
        },
      }),
  );
  return withInitialSourceCleanup(
    async () => {
      const host = ledger.hostState;
      const before = host.readHostStateSnapshot(input.identity);
      if (!before.work || !before.workVersion || !before.ledgerVersion || !before.work.lease)
        throw new Error('Native Source retry fixture has no current admitted lease');
      if (before.work.lease.thread_id !== input.nativeSessionHandle)
        throw new Error('Native Source retry fixture received a different current handle');
      const journal = required(ledger.resume(input.identity.work_id, 1), 'current Journal');
      if (journal.state.items.length !== 1)
        throw new Error('Native Source retry fixture needs one current Journal item');
      const item = required(journal.state.items[0], 'current Journal item');
      if (item.issue_id !== null || item.observation !== null || item.host_reservation !== undefined)
        throw new Error('Native Source retry fixture requires a genuinely unissued Journal item');
      if (item.request.stage_id !== 'develop_task')
        throw new Error('Native Source retry fixture is not at develop_task');

      if (input.mode === 'seed') {
        acquireLocalSourceWriterLease({
          repositoryRoot: input.root,
          config,
          store: host,
          identity: input.identity,
          nativeSessionHandle: input.nativeSessionHandle,
          stageId: item.request.stage_id,
          assignmentIndex: item.request.assignment_index,
          expectedWork: before.workVersion,
          expectedLedger: before.ledgerVersion,
          expectedSessionJournal: { attempt: journal.state.attempt, version: journal.version },
        });
      }

      const execution = await openAdmittedSessionExecution(
        input.root,
        host,
        input.selection.project,
        input.identity.work_id,
      );
      const capability = execution.composition.workflowExecutionCapability;
      if (!capability) throw new Error('Native Source retry fixture has no admitted workflow capability');
      const configDigest = runtimeConfigDigest(config);
      const prepared = await prepareWorkflowExecution(capability, {
        repositoryRoot: input.root,
        configDigest,
        teamId: input.selection.team,
        workItemId: input.identity.work_id,
      });
      const request = {
        repositoryRoot: input.root,
        configDigest,
        teamId: input.selection.team,
        workflowId: item.request.workflow_id,
        stageId: item.request.stage_id,
        assignmentIndex: item.request.assignment_index,
        workItemId: input.identity.work_id,
        workItemDigest: prepared.workItemDigest,
        workContextDigest: prepared.workContextDigest,
        input: { bindings_manifest_ref: item.request.bindings_manifest_ref },
      };
      const reservation = await reserveWorkflowAssignmentForSession(capability, request);
      if (
        reservation.schema !== 'WorkflowSessionReservation/v1' ||
        reservation.request.workflowId !== item.request.workflow_id ||
        reservation.request.stageId !== item.request.stage_id ||
        reservation.request.assignmentIndex !== item.request.assignment_index ||
        reservation.approvalAction !== 'source.write' ||
        reservation.authorization === null ||
        reservation.authorization.approval?.status !== 'commit_unknown'
      )
        throw new Error('Native Source retry fixture did not return the configured public Source reservation');
      const attempt = reservation.receipt.attempt;
      if (
        attempt.status !== 'started' ||
        (input.mode === 'seed'
          ? attempt.previous_attempt_id !== null
          : attempt.previous_attempt_id !== input.previousAttemptId)
      )
        throw new Error('Native Source retry fixture did not receive the exact real Host retry attempt');
      if (reservation.requestDigest !== attempt.request_digest)
        throw new Error('Native Source retry fixture reservation digest differs from its attempt');
      if (dispatchCalls !== 0 || casWriterCalls !== 0)
        throw new Error('Native Source reservation entered a dispatch or writer boundary');

      const successor =
        input.mode === 'seed'
          ? input.nativeSessionHandle
          : required(input.successorSessionHandle, 'successor session handle');
      const proofPath = `.agent/work/${input.identity.work_id}/session-principal-no-effect-${input.mode}-${attempt.attempt_id}.json`;
      const decisionPath = `.agent/work/${input.identity.work_id}/session-principal-decision-${input.mode}-${attempt.attempt_id}.json`;
      const inspectedAt = new Date().toISOString();
      const proof = {
        schema: 'LocalSessionNoEffectEvidence/v1',
        work_id: input.identity.work_id,
        attempt: 1,
        action_id: item.request.action_id,
        host_attempt_id: attempt.attempt_id,
        request_digest: attempt.request_digest,
        workflow_id: item.request.workflow_id,
        config_digest: configDigest,
        scope_digest: before.work.binding.work_source_revision,
        source_snapshot_digest: required(journal.state.source_scope, 'Journal source scope').digest,
        native_session_handle: attempt.lease.thread_id,
        successor_session_handle: successor,
        ticket_id: attempt.lease.ticket_id,
        lease_generation: attempt.lease.generation,
        native_inspection_ref: `fixture:session-principal-retry-fixture:${attempt.attempt_id}:reservation-before-dispatch`,
        decision_path: decisionPath,
        inspected_by: attempt.lease.thread_id,
        inspected_at: inspectedAt,
        finding: 'confirmed_not_invoked_and_quiescent',
      };
      const proofBytes = Buffer.from(JSON.stringify(proof));
      const evidence = {
        schema: proof.schema,
        path: proofPath,
        sha256: createHash('sha256').update(proofBytes).digest('hex'),
      };
      const decision = {
        schema: 'WorkflowAttemptRecoveryDecision/v1',
        work_id: input.identity.work_id,
        work_item_id: before.work.binding.provider_work_item_id,
        source_revision: before.work.binding.work_source_revision,
        scope_id: before.work.binding.scope_id,
        ac_ids: [...before.work.binding.ac_ids],
        action_id: item.request.action_id,
        host_attempt_id: attempt.attempt_id,
        provider_evidence: evidence,
        outcome: 'no_effect',
        retry_lease: {
          ticket_id: attempt.lease.ticket_id,
          thread_id: successor,
          generation: attempt.lease.generation + 1,
        },
        decided_by: attempt.lease.thread_id,
        decided_at: inspectedAt,
        reason: 'The configured Host reservation completed without Journal issue, dispatch, or writer argv entry.',
      };
      writeFileSync(path.join(input.root, proofPath), proofBytes, { flag: 'wx' });
      writeFileSync(path.join(input.root, decisionPath), JSON.stringify(decision), { flag: 'wx' });
      await reconcileUnissuedLocalSessionAction({
        root: input.root,
        proofPath,
        store: host,
        identity: input.identity,
        journal,
        configDigest,
      });
      const after = host.readHostStateSnapshot(input.identity);
      const retained = required(ledger.resume(input.identity.work_id, 1), 'retained Journal after reconciliation');
      if (retained.state.items[0]?.issue_id !== null || retained.state.items[0]?.observation !== null)
        throw new Error('Native Source retry fixture changed the Journal issue or observation');
      if (after.work?.lease?.thread_id !== successor || after.work.lease.generation !== attempt.lease.generation + 1)
        throw new Error('Native Source retry fixture did not persist the exact successor retry lease');
      if (!after.work) throw new Error('Native Source retry fixture lost its current Work afterimage');
      const afterimage = after.work.execution.assignment_attempts.find(
        (entry) => entry.attempt_id === attempt.attempt_id,
      );
      if (
        !afterimage ||
        afterimage.status !== 'no_effect' ||
        afterimage.result !== null ||
        afterimage.result_digest !== null ||
        afterimage.request_digest !== attempt.request_digest
      )
        throw new Error('Native Source retry fixture has no matching current no-effect Host afterimage');
      return {
        marker: 'SESSION_PRINCIPAL_RETRY_DONE',
        mode: input.mode,
        reservationSchema: reservation.schema,
        reservationRequest: reservation.request,
        attemptId: attempt.attempt_id,
        previousAttemptId: attempt.previous_attempt_id,
        requestDigest: reservation.requestDigest,
        approvalAction: reservation.approvalAction,
        approval: reservation.authorization.approval,
        workItemDigest: prepared.workItemDigest,
        workContextDigest: prepared.workContextDigest,
        input: request.input,
        attemptLease: attempt.lease,
        successor,
        retryLease: after.work.lease,
        proofPath,
        decisionPath,
        proofDigest: evidence.sha256,
        journalVersion: retained.version,
        journalItem: retained.state.items[0],
        stageId: item.request.stage_id,
        assignmentIndex: item.request.assignment_index,
        actionId: item.request.action_id,
        workVersion: after.workVersion,
        workLease: after.work.lease,
        noEffectAfterimage: afterimage,
        dispatchCalls,
        casWriterCalls,
        actualCompositionPrincipal: execution.composition.authentication.principal,
      };
    },
    () =>
      completeOwnedCleanup([
        () => {
          compositionObserver.mockRestore();
          return undefined;
        },
        () => {
          ledger.close();
          return undefined;
        },
      ]),
    'Native reserved retry fixture cleanup',
  );
}
