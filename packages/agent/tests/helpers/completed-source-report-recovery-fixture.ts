import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { canonicalJsonDigest, isPlainRecord } from '../../src/contracts/public-ingress.js';
import { requireSafeRepositoryAccess } from '../../src/config/safe-repository-access.js';
import type { AgentRuntimeConfig } from '../../src/config/runtime-config.js';
import type { HostStateStore, WorkIdentity } from '../../src/host-state.js';
import type { InitialSourceContinuationState } from '../../src/orchestration/initial-source-continuation.js';
import type { InitialSourceFrontierCodeRebindReceipt } from '../../src/orchestration/initial-source-frontier-code-rebind.js';
import {
  type CompletedSourceReportRecoveryRequest,
  type CompletedSourceReportRecoveryVerifyCurrent,
} from '../../src/orchestration/completed-source-report-recovery.js';
import {
  parseSessionBridgeObservation,
  type SessionBridgeObservation,
} from '../../src/orchestration/mastra-session-bridge.js';
import type { MastraSessionLedgerSnapshot } from '../../src/orchestration/persistent-session-handoff.js';
import {
  compareScopedSourceSnapshots,
  snapshotDeclaredSources,
  snapshotRuntimePackageSources,
  type ScopedSourceSnapshot,
} from '../../src/orchestration/scoped-source-snapshot.js';
import { runtimePackageAccess, runtimePackageCodePaths } from '../../src/config/runtime-config.js';

export interface RecoveryReportFixtureContext {
  readonly root: string;
  readonly identity: WorkIdentity;
  readonly documents: readonly string[];
  readonly config: AgentRuntimeConfig;
  readonly hostStore: HostStateStore;
  readonly continuationState: () => InitialSourceContinuationState;
  readonly currentJournal: () => MastraSessionLedgerSnapshot;
}

export interface RecoveryWriterAction {
  readonly issue_id: string;
  readonly request: { readonly action_id: string };
}

export interface CompletedSourceReportRecoveryFixture {
  readonly request: CompletedSourceReportRecoveryRequest;
  readonly reportPath: string;
  readonly verifyCurrent: CompletedSourceReportRecoveryVerifyCurrent;
}

function record(value: unknown): string {
  return JSON.stringify(value) + '\n';
}
function sha256(bytes: string | Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}
function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isPlainRecord(value)) throw new Error(label + ' must be an object');
  return value;
}
function readJsonFixture(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}
function requireArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(label + ' must be an array');
  return value;
}
function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(label + ' must be a string');
  return value;
}

export function createCompletedSourceReportRecoveryFixture(
  f: RecoveryReportFixtureContext,
  writer: RecoveryWriterAction,
  writerAttemptId: string,
  observation: SessionBridgeObservation,
  sourceBefore: ScopedSourceSnapshot,
  sourceAfter: ScopedSourceSnapshot,
  frontierReceipt: InitialSourceFrontierCodeRebindReceipt | null,
  reportPath: string,
): CompletedSourceReportRecoveryFixture {
  const before = f.continuationState(),
    initialReceipt = f.hostStore.readInitialSourceContinuationReceipt(f.identity, 1),
    journalBefore = f.currentJournal(),
    pending = journalBefore.state.items.find((item) => item.request.action_id === writer.request.action_id),
    workDirectory = '.agent/work/' + f.identity.work_id,
    sourceSnapshotRef = workDirectory + '/completed-source-snapshot.fixture.json',
    sourceDiffRef = workDirectory + '/completed-source-diff.fixture.json',
    commandReceiptRef = workDirectory + '/completed-source-command.fixture.json',
    reportRef = path.relative(f.root, reportPath).split(path.sep).join('/');
  if (!initialReceipt || !pending?.host_reservation || !journalBefore.state.source_scope)
    throw new Error('Completed Source report fixture lacks its original receipt, reservation or Journal scope');
  if (journalBefore.state.source_scope.digest !== sourceBefore.digest)
    throw new Error('Completed Source report fixture original Journal scope changed');
  const sourceDiff = [...compareScopedSourceSnapshots(sourceBefore, sourceAfter)].sort((left, right) =>
      left.path.localeCompare(right.path),
    ),
    changedPaths = sourceDiff.map((change) => change.path).sort((left, right) => left.localeCompare(right)),
    reportSourcePaths = [...(observation.changed_paths ?? [])].sort((left, right) => left.localeCompare(right)),
    nextJournal = {
      ...journalBefore.state,
      source_scope: sourceAfter,
      items: journalBefore.state.items.map((item) =>
        item.request.action_id === observation.action_id ? { ...item, observation } : item,
      ),
    };
  if (pending.issue_id !== writer.issue_id || writerAttemptId !== pending.host_reservation.receipt.attempt.attempt_id)
    throw new Error('Completed Source report fixture writer IDs differ');
  if (canonicalJsonDigest(reportSourcePaths) !== canonicalJsonDigest(changedPaths))
    throw new Error('Completed Source report fixture changed paths differ from the exact report');

  const currentRuntimeCodePaths = [...runtimePackageCodePaths(f.config.runtime.bundle)].sort(),
    currentRuntime = snapshotRuntimePackageSources(
      runtimePackageAccess(),
      f.config.runtime.bundle,
      currentRuntimeCodePaths,
    ),
    systemUpdateOperationId = 'fixture-host-only-update-' + writer.request.action_id,
    currentManifestRef = 'fixture://host-only/current-manifest',
    currentInstallRef = 'fixture://host-only/current-install-marker',
    systemUpdateRef = 'fixture://host-only/system-update-marker',
    currentManifestDigest = canonicalJsonDigest({
      fixture_only: true,
      not_native_manifest: true,
      code_digest: currentRuntime.digest,
      code_paths: currentRuntimeCodePaths,
    }),
    nativeSelfAttestationDigest = canonicalJsonDigest({
      fixture_only: true,
      not_native_attestation: true,
      code_digest: currentRuntime.digest,
      systemUpdateOperationId,
    }),
    oldManifestRef = frontierReceipt?.record.request.successorManifestRef ?? 'fixture://host-only/prior-manifest',
    oldManifestDigest =
      frontierReceipt?.record.request.successorManifestDigest ??
      canonicalJsonDigest({
        fixture_only: true,
        not_native_manifest: true,
        prior_code_digest: before.work.binding.runtime_code_digest,
        prior_code_paths: currentRuntimeCodePaths,
      }),
    oldInstallRef = frontierReceipt?.record.request.systemUpdateRef ?? 'fixture://host-only/prior-install-marker';
  if (!frontierReceipt && before.work.binding.runtime_code_digest !== currentRuntime.digest)
    throw new Error('Expiry-only fixture must retain the actual current runtime code binding');
  // The callback proves only Host field binding against real fixture Source and
  // package bytes. Fixture endpoint labels do not attest to a native install.
  writeFileSync(path.join(f.root, sourceSnapshotRef), record(sourceAfter));
  writeFileSync(path.join(f.root, sourceDiffRef), record(sourceDiff));

  const reportId = observation.tool_call_ref,
    reportDigest = canonicalJsonDigest(observation),
    sourceDiffDigest = canonicalJsonDigest(sourceDiff),
    request: CompletedSourceReportRecoveryRequest = {
      schema: 'CompletedSourceReportRecoveryRequest/v1',
      identity: f.identity,
      attempt: 1,
      actionId: writer.request.action_id,
      issueId: writer.issue_id,
      hostAttemptId: writerAttemptId,
      nativeSessionHandle: initialReceipt.request.nativeSessionHandle,
      leaseGeneration: pending.host_reservation.receipt.attempt.lease.generation,
      expectedWork: before.workVersion,
      expectedLedger: before.ledgerVersion,
      expectedJournal: journalBefore.version,
      expectedMaintenanceGeneration: before.maintenanceGeneration,
      initialContinuationId: initialReceipt.continuation_id,
      initialContinuationRequestDigest: initialReceipt.request_digest,
      frontierReceiptId: frontierReceipt?.original_receipt_id ?? null,
      frontierRequestDigest: frontierReceipt?.record.request_digest ?? null,
      sourceReservationDigest: canonicalJsonDigest(pending.host_reservation),
      originalSourceAuthorizationDigest: initialReceipt.request.sourceAuthorizationSha256,
      originalSourceScopeDigest: sourceBefore.digest,
      evolvedJournalSourceScopeDigest: sourceAfter.digest,
      reportId,
      reportDigest,
      sourceDiffDigest,
      reportSourcePaths,
      nextJournal,
      sourceSnapshotRef,
      sourceDiffRef,
      changedPaths,
      oldRuntimeCodeDigest: before.work.binding.runtime_code_digest,
      oldRuntimeCodePaths: frontierReceipt
        ? [...frontierReceipt.record.request.runtimeCodePaths]
        : currentRuntimeCodePaths,
      currentRuntimeCodeDigest: currentRuntime.digest,
      currentRuntimeCodePaths,
      oldManifestRef,
      oldManifestDigest,
      oldInstallRef,
      currentManifestRef,
      currentManifestDigest,
      currentInstallRef,
      systemUpdateRef,
      systemUpdateOperationId,
      nativeSelfAttestationDigest,
      terminalCallerObservationRef: reportRef,
      terminalCommandReceiptRef: commandReceiptRef,
    };
  writeFileSync(
    path.join(f.root, commandReceiptRef),
    record({
      schema: 'FixtureTerminalCommandReceipt/v1',
      fixture_only: true,
      status: 'completed',
      action_id: request.actionId,
      issue_id: request.issueId,
      host_attempt_id: request.hostAttemptId,
      report_id: reportId,
      report_digest: reportDigest,
      source_diff_digest: sourceDiffDigest,
    }),
  );

  const verifyCurrent: CompletedSourceReportRecoveryVerifyCurrent = (candidate, state) => {
    const initial = state.initialReceipt,
      frontier = state.frontierReceipt;
    if (
      !initial ||
      initial.continuation_id !== candidate.initialContinuationId ||
      initial.request_digest !== candidate.initialContinuationRequestDigest ||
      (candidate.frontierReceiptId === null
        ? frontier !== null ||
          candidate.frontierRequestDigest !== null ||
          candidate.oldRuntimeCodeDigest !== initial.request.currentRuntimeCodeDigest
        : !frontier ||
          frontier.original_receipt_id !== candidate.frontierReceiptId ||
          frontier.record.request_digest !== candidate.frontierRequestDigest ||
          frontier.current_runtime_code_digest !== candidate.oldRuntimeCodeDigest ||
          frontier.record.request.successorManifestRef !== candidate.oldManifestRef ||
          frontier.record.request.successorManifestDigest !== candidate.oldManifestDigest ||
          frontier.record.request.systemUpdateRef !== candidate.oldInstallRef ||
          canonicalJsonDigest(frontier.record.request.runtimeCodePaths) !==
            canonicalJsonDigest(candidate.oldRuntimeCodePaths)) ||
      initial.request.nativeSessionHandle !== candidate.nativeSessionHandle
    )
      throw new Error('fixture endpoint callback: initial/frontier receipt or original owner changed');
    const sourceReservation = state.journal.state.items.find(
        (item) => item.request.action_id === candidate.actionId,
      )?.host_reservation,
      sourceAuthorizationRef = initial.request.sourceAuthorizationReference;
    if (
      !sourceReservation ||
      canonicalJsonDigest(sourceReservation) !== candidate.sourceReservationDigest ||
      sha256(readFileSync(path.join(f.root, sourceAuthorizationRef.path))) !==
        candidate.originalSourceAuthorizationDigest ||
      state.host.work?.binding.work_source_revision !== candidate.originalSourceScopeDigest ||
      candidate.nextJournal.source_scope?.digest !== candidate.evolvedJournalSourceScopeDigest ||
      canonicalJsonDigest(
        candidate.nextJournal.items.find((item) => item.request.action_id === candidate.actionId)?.observation,
      ) !== candidate.reportDigest
    )
      throw new Error('fixture endpoint callback: original Source reservation or permission changed');
    const sourceNow = snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), f.documents),
      recordedSource = requireRecord(
        readJsonFixture(path.join(f.root, candidate.sourceSnapshotRef)),
        'recorded source snapshot',
      ),
      actualDiff = [...compareScopedSourceSnapshots(sourceBefore, sourceNow)].sort((left, right) =>
        left.path.localeCompare(right.path),
      ),
      recordedDiff = requireArray(readJsonFixture(path.join(f.root, candidate.sourceDiffRef)), 'recorded source diff'),
      report = parseSessionBridgeObservation(readJsonFixture(reportPath)),
      caller = parseSessionBridgeObservation(
        readJsonFixture(path.join(f.root, candidate.terminalCallerObservationRef)),
      ),
      command = requireRecord(
        readJsonFixture(path.join(f.root, candidate.terminalCommandReceiptRef)),
        'terminal command receipt',
      );
    if (
      sourceNow.digest !== candidate.evolvedJournalSourceScopeDigest ||
      canonicalJsonDigest(recordedSource) !== canonicalJsonDigest(sourceNow) ||
      canonicalJsonDigest(recordedDiff) !== canonicalJsonDigest(actualDiff) ||
      canonicalJsonDigest(actualDiff) !== candidate.sourceDiffDigest ||
      canonicalJsonDigest(report) !== candidate.reportDigest ||
      report.tool_call_ref !== candidate.reportId ||
      report.action_id !== candidate.actionId ||
      report.issue_id !== candidate.issueId ||
      report.host_attempt_id !== candidate.hostAttemptId ||
      canonicalJsonDigest([...(report.changed_paths ?? [])].sort((left, right) => left.localeCompare(right))) !==
        canonicalJsonDigest(candidate.reportSourcePaths) ||
      canonicalJsonDigest(caller) !== canonicalJsonDigest(report) ||
      requireString(command.action_id, 'terminal command action_id') !== candidate.actionId ||
      requireString(command.issue_id, 'terminal command issue_id') !== candidate.issueId ||
      requireString(command.host_attempt_id, 'terminal command host_attempt_id') !== candidate.hostAttemptId ||
      requireString(command.report_id, 'terminal command report_id') !== candidate.reportId ||
      requireString(command.report_digest, 'terminal command report_digest') !== candidate.reportDigest ||
      requireString(command.source_diff_digest, 'terminal command source_diff_digest') !== candidate.sourceDiffDigest
    )
      throw new Error('fixture endpoint callback: exact report, caller or Source bytes changed');

    const currentRuntime = snapshotRuntimePackageSources(
      runtimePackageAccess(),
      f.config.runtime.bundle,
      candidate.currentRuntimeCodePaths,
    );
    if (
      currentRuntime.digest !== candidate.currentRuntimeCodeDigest ||
      candidate.currentManifestDigest !==
        canonicalJsonDigest({
          fixture_only: true,
          not_native_manifest: true,
          code_digest: currentRuntime.digest,
          code_paths: candidate.currentRuntimeCodePaths,
        }) ||
      candidate.nativeSelfAttestationDigest !==
        canonicalJsonDigest({
          fixture_only: true,
          not_native_attestation: true,
          code_digest: currentRuntime.digest,
          systemUpdateOperationId: candidate.systemUpdateOperationId,
        }) ||
      (!frontier &&
        (currentRuntime.digest !== candidate.oldRuntimeCodeDigest ||
          canonicalJsonDigest(candidate.oldRuntimeCodePaths) !==
            canonicalJsonDigest(candidate.currentRuntimeCodePaths) ||
          candidate.oldManifestDigest !==
            canonicalJsonDigest({
              fixture_only: true,
              not_native_manifest: true,
              prior_code_digest: currentRuntime.digest,
              prior_code_paths: candidate.currentRuntimeCodePaths,
            })))
    )
      throw new Error('fixture endpoint callback: current Host-only Source/package bytes changed');

    return {
      schema: 'CompletedSourceReportRecoveryVerifiedCurrent/v1',
      terminal: {
        ownerId: candidate.nativeSessionHandle,
        ownerThreadId: candidate.nativeSessionHandle,
        nativeSessionHandle: candidate.nativeSessionHandle,
        attempt: candidate.attempt,
        actionId: candidate.actionId,
        issueId: candidate.issueId,
        hostAttemptId: candidate.hostAttemptId,
        leaseGeneration: candidate.leaseGeneration,
        quiescent: true,
        outcome: 'reported_complete',
        callerObservationRef: candidate.terminalCallerObservationRef,
        commandReceiptRef: candidate.terminalCommandReceiptRef,
        reportId: candidate.reportId,
        reportDigest: candidate.reportDigest,
        sourceDiffDigest: candidate.sourceDiffDigest,
        reportSourcePaths: candidate.reportSourcePaths,
      },
      source: {
        reservationDigest: candidate.sourceReservationDigest,
        authorizationDigest: candidate.originalSourceAuthorizationDigest,
        originalScopeDigest: candidate.originalSourceScopeDigest,
        evolvedScopeDigest: candidate.evolvedJournalSourceScopeDigest,
        snapshotRef: candidate.sourceSnapshotRef,
        diffRef: candidate.sourceDiffRef,
        changedPaths: candidate.changedPaths,
      },
      oldRuntime: {
        codeDigest: candidate.oldRuntimeCodeDigest,
        codePaths: candidate.oldRuntimeCodePaths,
        manifestRef: candidate.oldManifestRef,
        manifestDigest: candidate.oldManifestDigest,
        installRef: candidate.oldInstallRef,
      },
      currentRuntime: {
        codeDigest: currentRuntime.digest,
        codePaths: candidate.currentRuntimeCodePaths,
        manifestRef: candidate.currentManifestRef,
        manifestDigest: candidate.currentManifestDigest,
        installRef: candidate.currentInstallRef,
      },
      systemUpdate: { ref: candidate.systemUpdateRef, operationId: candidate.systemUpdateOperationId },
      nativeSelfAttestationDigest: candidate.nativeSelfAttestationDigest,
    };
  };
  return { request, reportPath, verifyCurrent };
}
