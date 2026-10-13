import { test, expect, spyOn } from 'bun:test';
import { expectRejection } from './helpers/expect-rejection.ts';
import { Database } from 'bun:sqlite';
import { randomUUID } from 'node:crypto';
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
  renameSync,
  symlinkSync,
  copyFileSync,
  linkSync,
  unlinkSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync, type SpawnSyncOptionsWithStringEncoding } from 'node:child_process';
import {
  cooperativeReadonlyAssignments,
  currentState,
  inspectHistoricalOwnerContext,
} from '../bin/runtime-config-rebind.ts';
import { readAppliedRuntimeConfigRebind } from '../bin/runtime-config-rebind.ts';
import { inspectHistoricalOwnerWork, suspendHistoricalOwnerWork } from '../src/orchestration/suspend-local-work.ts';
import * as runtimeConfig from '../src/config/runtime-config.ts';
import { loadRuntimeConfig, parseRuntimeConfigYaml, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { validateCoordinationLedgerV1, type CoordinationLedger } from '../src/contracts/envelopes.ts';
import {
  HostStateStore,
  type HistoricalTerminalSynthesisCaptureReceipt,
  type WorkIdentity,
  type WorkState,
} from '../src/host-state.ts';
import {
  admittedResearchResultsForSynthesis,
  synthesisSourceCatalog,
} from '../src/orchestration/observed-synthesis-result.ts';
import { mastraLedgerStatus, type MastraSessionLedgerState } from '../src/orchestration/persistent-session-handoff.ts';
import {
  sessionActionsForWave,
  type SessionAgentAction,
  type SessionHandoffContext,
} from '../src/orchestration/session-handoff.ts';
import {
  sessionBridgeRunId,
  buildSessionBridgeRequest,
  configuredContextForStage,
} from '../src/orchestration/mastra-session-bridge.ts';
import { snapshotDeclaredSources } from '../src/orchestration/scoped-source-snapshot.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { compileDevelopmentWorkflow } from '../src/orchestration/workflow-plan.ts';
import { runtimeExecutableInventory } from '../tooling/maintained-source-inventory.ts';
import type { AgentRuntimeConfig, WorkItemSelection } from '../src/config/runtime-config.ts';
import type { SessionBridgeRequest } from '../src/orchestration/mastra-session-bridge-contract.ts';
import {
  advanceFixtureHostSnapshot,
  applySourceCorrectionBatch,
  checkedBoolean,
  checkedCliObject,
  checkedFixtureInitializationReceipt,
  checkedFixtureLedger,
  checkedFixtureWork,
  checkedMutableFixtureLedger,
  checkedRecord,
  checkedResearchChangelogEvent,
  checkedSourceCorrectionReportRequest,
  checkedSqliteInteger,
  checkedString,
  checkedStringArray,
  cliChildDiagnostic,
  databaseState,
  deliveryFixture,
  expectMissingFixtureContextRead,
  fence,
  firstConfiguredContext,
  firstJournalItem,
  firstOriginalContext,
  fixture,
  fixtureCall,
  fixtureContextPath,
  fixtureOriginalContexts,
  historicalFixture,
  invokeConfiguredContextFixture,
  json,
  originalContextTamperCases,
  parseFixtureJson,
  parseSessionJournalPayload,
  persistedEffectDenialCases,
  prepareSourceCorrectionRepair,
  querySqliteRow,
  readSessionLedgerSqlRow,
  readonlyJournalMutations,
  withHistoricalInspectionFixtureCustody,
  readonlySnapshotMutations,
  recoveryFixture,
  requiredCliObject,
  requiredCliString,
  requiredElement,
  requiredHostStatePayload,
  requiredJournalObservation,
  requiredProfile,
  requiredResearchNormalizationItem,
  requiredResearchOperationReference,
  requiredRuntimeAgentProfile,
  requiredRuntimeWorkflow,
  requiredSessionLedgerPayload,
  requiredSourceScope,
  requiredSqliteRow,
  requiredStateVersion,
  requiredWorkLease,
  requiredWorkflow,
  resignFixtureContext,
  run,
  runReconcileArtifacts,
  seedHistoricalResearchLineage,
  seedKnownTerminalSynthesisCustody,
  seedReadonlyUnknown,
  seedState,
  sha,
  source,
  sourceCorrectionExternalReport,
  sourceCorrectionFixture,
  sourceCorrectionNativeFixture,
  sourceCorrectionNativeRuntime,
  sourceCorrectionPriorVersion,
  sourceCorrectionRebindWithNative,
  withAgentProfileChange,
  withDatabase,
  withProjectTitle,
  withWorkflowStageAssignments,
  withoutLastProject,
  withoutPrewriterTemplateDelta,
  withoutProducedSchema,
} from './helpers/runtime-config-rebind-fixture.ts';
import { registerRuntimeConfigFixtureCleanup } from './helpers/runtime-config-rebind-fixture.ts';
import type {
  CliObject,
  FixtureDatabaseState,
  FixtureJournal,
  FixtureOriginalContext,
  HostStatePayloadRow,
  HostStateRowId,
  HostStateRowIdPayload,
  MaintenanceFenceAcquisition,
  MutableFixture,
  ReconcileOptions,
  RuntimeWorkflowAssignments,
  SessionLedgerPayloadRow,
} from './helpers/runtime-config-rebind-fixture.ts';

registerRuntimeConfigFixtureCleanup();

test.each(['PASS', 'FAIL'])(
  'internal recovery %s settles only its review and preserves original rights',
  async (status: 'PASS' | 'FAIL') => {
    const { f, input, call, observation } = recoveryFixture(),
      before = databaseState(f);
    const prepared = await call('prepare');
    expect(prepared.status).toBe('reserved');
    expect(prepared.request.historicalOwner).not.toBe(input.callerSession);
    const resumed = { ...input, request: prepared.request };
    expect((await call('inspect', resumed)).status).toBe('reserved');
    expect((await call('begin', resumed)).status).toBe('commit_unknown');
    const observed = observation(prepared.operation, status);
    const settled = await call('complete', { ...resumed, observation: observed });
    expect(settled.status).toBe('applied');
    expect(settled.rights_granted).toBe(false);
    expect(settled.runtime_acceptance).toBe(false);
    expect(settled.native_dispatch_performed).toBe(false);
    expect((await call('complete', { ...resumed, observation: observed })).operation).toEqual(settled.operation);
    const changed = structuredClone(observed);
    changed.observation.result = { findings: ['Different retained body'] };
    await Promise.resolve(
      expect(call('complete', { ...resumed, observation: changed })).rejects.toThrow(/result conflict/),
    );
    const after = databaseState(f);
    expect(after.agent_host_state).toEqual(before.agent_host_state);
    expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  },
  30000,
);

test('internal recovery UNKNOWN survives reopen and cannot reissue or reconstruct custody', async () => {
  const { f, input, call, observation } = recoveryFixture();
  const prepared = await call('prepare'),
    resumed = { ...input, request: prepared.request };
  await Promise.resolve(
    expect(call('complete', { ...resumed, observation: observation(prepared.operation) })).rejects.toThrow(
      /reissue forbidden/,
    ),
  );
  await call('begin', resumed);
  const before = databaseState(f);
  expect((await call('inspect', resumed)).status).toBe('commit_unknown');
  await Promise.resolve(expect(call('begin', resumed)).rejects.toThrow(/reissue forbidden/));
  await Promise.resolve(expect(call('prepare')).rejects.toThrow(/reservation exists/));
  await Promise.resolve(expect(call('inspect', input)).rejects.toThrow(/shape/));
  const foreign = { ...resumed, callerSession: 'fixture-foreign' };
  await Promise.resolve(expect(call('inspect', foreign)).rejects.toThrow(/request changed/));
  const mismatchedObservation = observation(prepared.operation);
  mismatchedObservation.caller_session = 'fixture-foreign';
  await Promise.resolve(
    expect(call('complete', { ...resumed, observation: mismatchedObservation })).rejects.toThrow(/observation differs/),
  );
  const altered = observation(prepared.operation);
  altered.controller_id = 'foreign';
  await Promise.resolve(
    expect(call('complete', { ...resumed, observation: altered })).rejects.toThrow(/observation differs/),
  );
  expect(databaseState(f)).toEqual(before);
}, 60000);

test('internal recovery stale Source denies settlement while retaining UNKNOWN', async () => {
  const { f, input, call, observation } = recoveryFixture();
  const prepared = await call('prepare'),
    resumed = { ...input, request: prepared.request };
  await call('begin', resumed);
  const before = databaseState(f);
  f.put('.githooks/pre-commit', 'Concurrent scoped edit');
  await Promise.resolve(
    expect(call('complete', { ...resumed, observation: observation(prepared.operation) })).rejects.toThrow(),
  );
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('internal recovery controller drift outside original Work scope denies begin', async () => {
  const { f, input, call } = recoveryFixture();
  const prepared = await call('prepare'),
    resumed = { ...input, request: prepared.request };
  const before = databaseState(f);
  f.put(
    'packages/agent/src/runtime-kernel.ts',
    readFileSync(path.join(f.root, 'packages/agent/src/runtime-kernel.ts'), 'utf8') +
      '\n// Injected controller drift\n',
  );
  await Promise.resolve(expect(call('begin', resumed)).rejects.toThrow(/request changed/));
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('internal recovery reviews current declared Source while preserving historical preimages', async () => {
  const { f, input, call, observation } = recoveryFixture();
  f.put('.githooks/pre-commit', 'Authorized Source correction before recovery prepare');
  const before = databaseState(f);
  const prepared = await call('prepare'),
    resumed = { ...input, request: prepared.request };
  expect(prepared.request.source.digest).not.toBe(prepared.request.context.original_source);
  await call('begin', resumed);
  expect((await call('complete', { ...resumed, observation: observation(prepared.operation) })).status).toBe('applied');
  const after = databaseState(f);
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
}, 30000);

test('internal recovery denies mixed execution flags and missing original context without effects', async () => {
  const { f, input, call } = recoveryFixture(),
    before = databaseState(f);
  await Promise.resolve(expect(call('prepare', input, ['--issue-wave', 'true'])).rejects.toThrow(/exact mode/));
  await Promise.resolve(expect(call('prepare', { ...input, baselinePath: 'missing.yaml' })).rejects.toThrow());
  await Promise.resolve(
    expect(call('prepare', { ...input, userInstructionRef: '' })).rejects.toThrow(/binding missing/),
  );
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('source correction native mock falls back to the original runtime declaration after override closes', async () => {
  const previousPath = process.env.PATH ?? '';
  await sourceCorrectionRebindWithNative({ root: tmpdir(), executable: process.execPath });
  sourceCorrectionNativeRuntime.value = null;
  process.env.PATH = previousPath;
  sourceCorrectionNativeRuntime.previousPath = undefined;

  const bunModule = await import('../bin/bun.ts');
  expect(bunModule.standaloneRuntime({})).toBeNull();
});

test('public source repair freezes original beforeimages, prior update and held-fence scope without Host writes', async () => {
  const { f, deliveryArgs, repairArgs, changedPath, sourceManifestPath, authorizedPaths } = sourceCorrectionFixture();
  const originalPlan = await runReconcileArtifacts(deliveryArgs('plan')),
    packageRoot = path.join(f.root, 'packages/agent'),
    inventory = runtimeExecutableInventory(packageRoot, 'source', requireSafeRepositoryAccess(packageRoot)),
    access = requireSafeRepositoryAccess(f.root),
    source = snapshotDeclaredSources(
      access,
      inventory.map((file) => `packages/agent/${file}`),
    ),
    priorUpdate = {
      status: 'CURRENT_SYSTEM_BOOKKEEPING_UNKNOWN_UPDATED',
      operation_id: 'local-46c2f01d-8541-46ce-8e31-30e467799538',
      version: sourceCorrectionPriorVersion,
      entry: path.join(tmpdir(), 'vida-agent.exe'),
      run_id: '37579199535',
      artifact_id: '11463399267',
      installed_bytes: 133342720,
      prior_bytes: 133338624,
      delta_bytes: 4096,
      configuration_inspection: 'inspect_ready_unauthorized',
      tests_invoked: false,
      reinstallation: false,
      runtime_accepted: false,
      developer_unblocked: false,
    };
  f.put('.tmp/prior-system-update.json', json(priorUpdate));
  expect((await runReconcileArtifacts(deliveryArgs('apply'))).status).toBe('receipt_rebind_ready');
  const operationPath = requiredCliString(originalPlan, 'operation_path', 'planned operation path'),
    operationBytes = readFileSync(path.join(f.root, operationPath)),
    beforeimage = {
      purpose: 'inactive custody only; not an active repair artifact or admission',
      operation_id: 'fixture-rebind',
      operation_ref: operationPath,
      operation_bytes_base64: operationBytes.toString('base64'),
      source,
      beforeimages: source.entries.map((entry) => ({
        path: entry.path,
        bytes_base64: access.readBytes(entry.path, 'test beforeimage').toString('base64'),
      })),
      recorded_at: '2026-10-07T00:00:00.000Z',
      effects_issued: false,
    };
  f.put('.tmp/original-source-beforeimages.json', json(beforeimage));
  applySourceCorrectionBatch(f, changedPath, sourceManifestPath, priorUpdate.version);

  const sourceManifest = checkedRecord(
    parseFixtureJson(readFileSync(path.join(f.root, sourceManifestPath), 'utf8')),
    'source package manifest',
  );
  f.put(sourceManifestPath, json({ ...sourceManifest, version: '0.0.0' }));
  const beforeStaleVersionInspect = databaseState(f);
  await Promise.resolve(
    expect(runReconcileArtifacts(repairArgs('repair-inspect'))).rejects.toThrow(
      /at or after the prior installed version/,
    ),
  );
  expect(databaseState(f)).toEqual(beforeStaleVersionInspect);
  f.put(sourceManifestPath, json(sourceManifest));

  const custodyParent = path.join(f.root, '.tmp');
  const outside = mkdtempSync(path.join(tmpdir(), 'vida-source-admission-outside-'));
  const relocated = path.join(outside, 'retained');
  const beforeAdmission = databaseState(f);
  const custodyBytes = readFileSync(path.join(custodyParent, 'original-source-beforeimages.json'));
  renameSync(custodyParent, relocated);
  try {
    symlinkSync(relocated, custodyParent, process.platform === 'win32' ? 'junction' : 'dir');
    await expectRejection(runReconcileArtifacts(repairArgs('repair-inspect')), /ENOTDIR|ELOOP|unsafe|link|reparse/i);
    expect(databaseState(f)).toEqual(beforeAdmission);
    expect(readFileSync(path.join(relocated, 'original-source-beforeimages.json'))).toEqual(custodyBytes);
    expect(
      existsSync(path.join(f.root, '.agent/work/fixture-rebind/runtime-config-source-correction-repair.v1.json')),
    ).toBe(false);
  } finally {
    if (existsSync(custodyParent)) unlinkSync(custodyParent);
    renameSync(relocated, custodyParent);
    rmSync(outside, { recursive: true });
  }

  const beforeRepair = databaseState(f),
    inspected = await runReconcileArtifacts(repairArgs('repair-inspect'));
  expect(inspected.status).toBe('inspect_ready_unauthorized');
  expect(inspected.authorized_changed_paths).toEqual(authorizedPaths);
  expect(databaseState(f)).toEqual(beforeRepair);

  const publishedOperation = priorUpdate.operation_id;
  const planned = await runReconcileArtifacts([
      ...repairArgs('repair-plan'),
      '--publish-operation',
      publishedOperation,
    ]),
    sidecar = checkedCliObject(
      parseFixtureJson(
        readFileSync(path.join(f.root, requiredCliString(planned, 'sidecar_path', 'planned sidecar path')), 'utf8'),
      ),
      'source correction sidecar',
    ),
    repairRequest = requiredCliObject(sidecar, 'request', 'source correction request');
  expect(planned.status).toBe('planned');
  expect(sidecar.status).toBe('requested');
  expect(requiredCliObject(repairRequest, 'source_beforeimages', 'source beforeimages').path).toBe(
    '.tmp/original-source-beforeimages.json',
  );
  expect(requiredCliObject(repairRequest, 'source_beforeimages', 'source beforeimages').sha256).toBe(
    sha(Buffer.from(json(beforeimage))),
  );
  expect(requiredCliObject(repairRequest, 'source_beforeimages', 'source beforeimages').snapshot_digest).toBe(
    requiredCliObject(repairRequest, 'old_source', 'old source').digest,
  );
  expect(requiredCliObject(repairRequest, 'prior_system_update', 'prior system update').run_id).toBe(
    priorUpdate.run_id,
  );
  expect(requiredCliObject(repairRequest, 'prior_system_update', 'prior system update').artifact_id).toBe(
    priorUpdate.artifact_id,
  );
  expect(repairRequest.authorized_changed_paths).toEqual(authorizedPaths);
  const sourceChanges = repairRequest.source_changes;
  if (!Array.isArray(sourceChanges)) throw Error('source correction changes are malformed');
  expect(
    sourceChanges.map((change: unknown) =>
      checkedString(checkedRecord(change, 'source change').path, 'source change path'),
    ),
  ).toEqual(authorizedPaths);
  expect(requiredCliObject(repairRequest, 'new_source_manifest', 'new source manifest').version).toBe(
    priorUpdate.version,
  );
  const publicationOperationId = requiredCliString(repairRequest, 'publish_operation_id', 'publication operation id');
  expect(publicationOperationId).not.toBe(repairRequest.operation_id);
  expect(publicationOperationId).toBe(
    requiredCliString(
      requiredCliObject(repairRequest, 'prior_system_update', 'prior system update'),
      'operation_id',
      'prior system update operation id',
    ),
  );
  expect(publicationOperationId).toBe(publishedOperation);
  const plannedRequestId = requiredCliString(planned, 'request_id', 'planned request id'),
    plannedSidecarPath = requiredCliString(planned, 'sidecar_path', 'planned sidecar path'),
    frozenSidecarBytes = readFileSync(path.join(f.root, plannedSidecarPath));
  expect(
    requiredCliString(await runReconcileArtifacts(repairArgs('repair-plan')), 'request_id', 'replayed request id'),
  ).toBe(plannedRequestId);
  expect(
    requiredCliString(
      await runReconcileArtifacts([...repairArgs('repair-plan'), '--publish-operation', publishedOperation]),
      'request_id',
      'published request id',
    ),
  ).toBe(plannedRequestId);
  await Promise.resolve(
    expect(
      runReconcileArtifacts([...repairArgs('repair-plan'), '--publish-operation', 'local-different-publication']),
    ).rejects.toThrow(/repair inputs differ/),
  );
  await Promise.resolve(
    expect(
      runReconcileArtifacts([...repairArgs('repair-inspect'), '--publish-operation', '../invalid-operation']),
    ).rejects.toThrow(/published operation identity is invalid/),
  );
  expect(readFileSync(path.join(f.root, plannedSidecarPath))).toEqual(frozenSidecarBytes);
  const newSource = requiredCliObject(repairRequest, 'new_source', 'new source snapshot');
  const oldSource = requiredCliObject(repairRequest, 'old_source', 'old source snapshot');
  expect(requiredCliString(newSource, 'digest', 'new source digest')).not.toBe(
    requiredCliString(oldSource, 'digest', 'old source digest'),
  );
  expect(databaseState(f)).toEqual(beforeRepair);

  expect((await runReconcileArtifacts(repairArgs('repair-resume'))).status).toBe('repair_apply_required');
  await Promise.resolve(
    expect(runReconcileArtifacts(deliveryArgs('resume'))).rejects.toThrow('source correction is not applied'),
  );
  expect(databaseState(f)).toEqual(beforeRepair);
}, 30000);

test('source correction withdrawal archives the exact request, accepts Source drift and confirms exact retry', async () => {
  const fixtureContext = sourceCorrectionFixture(),
    prepared = await prepareSourceCorrectionRepair({ runRuntimeConfigRebind: runReconcileArtifacts }, fixtureContext),
    { f, repairArgs, changedPath, sidecarPath } = prepared,
    sidecarBytes = readFileSync(sidecarPath),
    request = requiredCliObject(
      checkedRecord(
        parseFixtureJson(new TextDecoder('utf-8', { fatal: true }).decode(sidecarBytes)),
        'source correction sidecar',
      ),
      'request',
      'source correction request',
    ),
    requestId = requiredCliString(request, 'request_id', 'source correction request id'),
    operationPath = path.join(f.root, '.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json'),
    historyPath = path.join(f.root, `.agent/work/fixture-rebind/source-correction-request-history/${requestId}.json`),
    baseline = {
      host: databaseState(f),
      operation: readFileSync(operationPath),
      receipt: readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json')),
      yaml: readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml')),
      beforeimages: readFileSync(fixtureContext.sourceBeforeimagesPath),
      priorUpdate: readFileSync(fixtureContext.priorSystemUpdatePath),
      fence: fence(f),
    },
    withdrawArgs = (expectedRequest: string) => [
      ...repairArgs('repair-withdraw'),
      '--expected-request',
      expectedRequest,
    ];
  await Promise.resolve(
    expect(runReconcileArtifacts(withdrawArgs(randomUUID()))).rejects.toThrow(
      'source correction request does not bind the original fenced delivery operation',
    ),
  );
  expect(readFileSync(sidecarPath)).toEqual(sidecarBytes);
  expect(databaseState(f)).toEqual(baseline.host);
  expect(existsSync(historyPath)).toBe(false);

  f.put(
    changedPath,
    readFileSync(path.join(f.root, changedPath), 'utf8') + '\n// Source changed after the request was frozen.\n',
  );
  const driftedSource = readFileSync(path.join(f.root, changedPath)),
    withdrawn = await runReconcileArtifacts(withdrawArgs(requestId));
  expect(withdrawn).toMatchObject({
    status: 'withdrawn',
    operation_id: 'fixture-rebind',
    request_id: requestId,
    history_path: `.agent/work/fixture-rebind/source-correction-request-history/${requestId}.json`,
    writes_host_state: false,
  });
  expect(existsSync(sidecarPath)).toBe(false);
  expect(readFileSync(historyPath)).toEqual(sidecarBytes);
  expect(databaseState(f)).toEqual(baseline.host);
  expect(readFileSync(operationPath)).toEqual(baseline.operation);
  expect(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'))).toEqual(baseline.receipt);
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'))).toEqual(baseline.yaml);
  expect(readFileSync(fixtureContext.sourceBeforeimagesPath)).toEqual(baseline.beforeimages);
  expect(readFileSync(fixtureContext.priorSystemUpdatePath)).toEqual(baseline.priorUpdate);
  expect(fence(f)).toEqual(baseline.fence);
  expect(readFileSync(path.join(f.root, changedPath))).toEqual(driftedSource);

  expect(await runReconcileArtifacts(withdrawArgs(requestId))).toEqual(withdrawn);
  expect(readFileSync(historyPath)).toEqual(sidecarBytes);
  expect(databaseState(f)).toEqual(baseline.host);
  expect(readFileSync(operationPath)).toEqual(baseline.operation);
  expect(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'))).toEqual(baseline.receipt);
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'))).toEqual(baseline.yaml);
  expect(readFileSync(path.join(f.root, changedPath))).toEqual(driftedSource);
}, 30000);

test('source correction streams inert native assets above the generic read cap and rejects size, digest and hardlink changes', async () => {
  const fixtureContext = sourceCorrectionFixture(),
    largeAsset = Buffer.alloc(64 * 1024 * 1024 + 1, 0x5a),
    native = sourceCorrectionNativeFixture(fixtureContext.f, fixtureContext.targetVersion, largeAsset),
    rebind = await sourceCorrectionRebindWithNative(native.runtime),
    prepared = await prepareSourceCorrectionRepair(rebind, fixtureContext),
    { f, repairArgs, sidecarPath } = prepared,
    sidecar = checkedRecord(parseFixtureJson(readFileSync(sidecarPath, 'utf8')), 'Source correction sidecar'),
    report = sourceCorrectionExternalReport(
      f,
      checkedSourceCorrectionReportRequest(requiredCliObject(sidecar, 'request', 'source correction request')),
      native,
    ),
    sourcePath = checkedString(report.installation_receipt.source_path, 'native source path'),
    sourceAbsolute = path.join(f.root, sourcePath),
    sourceDirectory = path.dirname(sourceAbsolute),
    copiedPath = path.relative(f.root, path.join(sourceDirectory, 'asset-copy.exe')).split(path.sep).join('/'),
    mismatchedPath = path.relative(f.root, path.join(sourceDirectory, 'asset-mismatch.exe')).split(path.sep).join('/'),
    linkedPath = path.relative(f.root, path.join(sourceDirectory, 'asset-hardlink.exe')).split(path.sep).join('/'),
    shortPath = path.relative(f.root, path.join(sourceDirectory, 'asset-short.exe')).split(path.sep).join('/'),
    reportPath = path.join(f.root, '.tmp/source-correction-report.json'),
    applyArgs = [...repairArgs('repair-apply'), '--report', reportPath];
  copyFileSync(sourceAbsolute, path.join(f.root, copiedPath));
  copyFileSync(sourceAbsolute, path.join(f.root, mismatchedPath));
  const firstLargeAssetByte = largeAsset.at(0);
  if (firstLargeAssetByte === undefined) throw Error('Large native asset fixture is empty');
  writeFileSync(path.join(f.root, mismatchedPath), Buffer.from([firstLargeAssetByte ^ 0xff]), { flag: 'r+' });
  linkSync(path.join(f.root, copiedPath), path.join(f.root, linkedPath));
  f.put(shortPath, Buffer.from([1, 2, 3]));
  const before = databaseState(f),
    denyAssetPath = async (pathValue: string) => {
      const candidate = structuredClone(report);
      candidate.installation_receipt.source_path = pathValue;
      f.put('.tmp/source-correction-report.json', json(candidate));
      await Promise.resolve(expect(runReconcileArtifacts(applyArgs)).rejects.toThrow());
      expect(databaseState(f)).toEqual(before);
      expect(
        checkedString(
          checkedRecord(parseFixtureJson(readFileSync(sidecarPath, 'utf8')), 'source correction sidecar').status,
          'sidecar status',
        ),
      ).toBe('requested');
    };
  await denyAssetPath(linkedPath);
  await denyAssetPath(shortPath);
  await denyAssetPath(mismatchedPath);
  const custodyParent = path.dirname(fixtureContext.sourceBeforeimagesPath);
  const outside = mkdtempSync(path.join(tmpdir(), 'vida-source-custody-outside-'));
  const relocated = path.join(outside, 'retained');
  const custodyBytes = readFileSync(fixtureContext.sourceBeforeimagesPath);
  expect(custodyBytes.length).toBeGreaterThan(8 * 1024 * 1024);
  f.put('.tmp/source-correction-report.json', json(report));
  renameSync(custodyParent, relocated);
  try {
    symlinkSync(relocated, custodyParent, process.platform === 'win32' ? 'junction' : 'dir');
    await expectRejection(runReconcileArtifacts(applyArgs), /ENOTDIR|unsafe|link|symlink/i);
    expect(databaseState(f)).toEqual(before);
    expect(readFileSync(path.join(relocated, path.basename(fixtureContext.sourceBeforeimagesPath)))).toEqual(
      custodyBytes,
    );
  } finally {
    if (existsSync(custodyParent)) unlinkSync(custodyParent);
    renameSync(relocated, custodyParent);
    rmSync(outside, { recursive: true });
  }
  f.put('.tmp/source-correction-report.json', json(report));
  expect((await runReconcileArtifacts(applyArgs)).status).toBe('applied');
  expect(databaseState(f)).toEqual(before);
}, 60000);

test('source repair captures a closed config transition and reads it after later owner CAS progress', async () => {
  const fixtureContext = Object.assign(sourceCorrectionFixture(), {
      targetVersion: sourceCorrectionPriorVersion,
      publicationOperationId: 'local-46c2f01d-8541-46ce-8e31-30e467799538',
    }),
    native = sourceCorrectionNativeFixture(fixtureContext.f, fixtureContext.targetVersion),
    rebind = await sourceCorrectionRebindWithNative(native.runtime),
    { f, deliveryArgs, repairArgs, changedPath, sidecarPath } = await prepareSourceCorrectionRepair(
      rebind,
      fixtureContext,
    ),
    run = async (args: string[], options?: ReconcileOptions): Promise<CliObject> =>
      checkedCliObject(
        await fixtureCall(
          (entryArgs, entryOptions) => rebind.runRuntimeConfigRebind(entryArgs, entryOptions),
          args,
          options,
        ),
        'runtime config rebind fixture',
      ),
    sidecar = checkedRecord(parseFixtureJson(readFileSync(sidecarPath, 'utf8')), 'Source correction sidecar'),
    reportPath = path.join(f.root, '.tmp/source-correction-report.json');
  const sidecarRequest = requiredCliObject(sidecar, 'request', 'source correction request');
  const report = sourceCorrectionExternalReport(f, checkedSourceCorrectionReportRequest(sidecarRequest), native),
    staleVersionReport = structuredClone(report);
  staleVersionReport.build_manifest.version = '0.0.0';
  f.put('.tmp/source-correction-report.json', json(staleVersionReport));
  const applyArgs = [...repairArgs('repair-apply'), '--report', reportPath],
    beforeApply = databaseState(f),
    reusedOperationIdReport = structuredClone(report);
  reusedOperationIdReport.publish_operation_id = requiredCliString(
    sidecarRequest,
    'operation_id',
    'source correction operation id',
  );
  f.put('.tmp/source-correction-report.json', json(reusedOperationIdReport));
  await Promise.resolve(
    expect(run(applyArgs)).rejects.toThrow(
      'source correction report does not bind the current package-native build and CI result',
    ),
  );
  expect(databaseState(f)).toEqual(beforeApply);
  expect(
    checkedString(
      checkedRecord(parseFixtureJson(readFileSync(sidecarPath, 'utf8')), 'source correction sidecar').status,
      'sidecar status',
    ),
  ).toBe('requested');
  f.put('.tmp/source-correction-report.json', json(staleVersionReport));
  await Promise.resolve(
    expect(run(applyArgs)).rejects.toThrow(
      'source correction report does not bind the current package-native build and CI result',
    ),
  );
  expect(databaseState(f)).toEqual(beforeApply);
  expect(
    checkedString(
      checkedRecord(parseFixtureJson(readFileSync(sidecarPath, 'utf8')), 'source correction sidecar').status,
      'sidecar status',
    ),
  ).toBe('requested');
  for (const field of ['run_id', 'artifact_id'] as const) {
    const staleCIReport = structuredClone(report);
    staleCIReport.ci_delivery[field] = requiredCliString(
      requiredCliObject(sidecarRequest, 'prior_system_update', 'prior system update'),
      field,
      `prior system update ${field}`,
    );
    if (field === 'run_id') staleCIReport.ci_delivery.result.run_id = staleCIReport.ci_delivery.run_id;
    f.put('.tmp/source-correction-report.json', json(staleCIReport));
    await Promise.resolve(
      expect(run(applyArgs)).rejects.toThrow(
        'source correction report does not bind the current package-native build and CI result',
      ),
    );
    expect(databaseState(f)).toEqual(beforeApply);
  }
  f.put('.tmp/source-correction-report.json', json(report));
  await Promise.resolve(
    expect(
      run(applyArgs, {
        onPhase: (phase) => {
          if (phase === 'applied') throw new Error('lost repair apply acknowledgement');
        },
      }),
    ).rejects.toThrow('lost repair apply acknowledgement'),
  );
  expect(databaseState(f)).toEqual(beforeApply);
  expect(
    checkedString(
      checkedRecord(parseFixtureJson(readFileSync(sidecarPath, 'utf8')), 'source correction sidecar').status,
      'sidecar status',
    ),
  ).toBe('applied');
  expect((await run(applyArgs)).status).toBe('applied');
  expect((await run(repairArgs('repair-resume'))).status).toBe('applied');
  expect(
    checkedRecord(
      parseFixtureJson(
        readFileSync(path.join(f.root, '.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json'), 'utf8'),
      ),
      'fenced delivery operation',
    ),
  ).toMatchObject({ revision: 2, phase: 'fenced', maintenance_released: false });
  const heldFence = fence(f),
    fencedOperation = checkedRecord(
      parseFixtureJson(
        readFileSync(path.join(f.root, '.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json'), 'utf8'),
      ),
      'fenced delivery operation',
    ),
    plan = requiredCliObject(fencedOperation, 'plan', 'fenced delivery plan');
  expect(heldFence?.status).toBe('held');
  const projectIds = checkedStringArray(plan.project_ids, 'fenced delivery project ids'),
    planOperationId = requiredCliString(plan, 'operation_id', 'fenced operation id'),
    planDigest = requiredCliString(fencedOperation, 'plan_digest', 'fenced operation plan digest'),
    selectorDigest = requiredCliString(plan, 'selector_digest', 'fenced selector digest'),
    stateDigest = requiredCliString(plan, 'state_digest', 'fenced state digest'),
    baselineReceipt = requiredCliString(plan, 'baseline_receipt', 'fenced baseline receipt'),
    targetConfigDigest = requiredCliString(plan, 'target_config_digest', 'fenced target config digest'),
    bundleDigest = requiredCliString(plan, 'bundle_digest', 'fenced bundle digest');
  expect(heldFence?.binding).toEqual({
    schema: 'MaintenanceFenceBinding/v1',
    project_ids: projectIds,
    operation_id: planOperationId,
    manifest_digest: planDigest,
    request_digest: planDigest,
    bindings_digest: canonicalJsonDigest({ selector: selectorDigest, state: stateDigest }),
    closure_digest: canonicalJsonDigest({ old_receipt: baselineReceipt, target: targetConfigDigest }),
    bundle_digest: bundleDigest,
  });

  await Promise.resolve(
    expect(
      run(deliveryArgs('resume'), {
        onPhase: (phase: string) => {
          if (phase === 'transition_captured') throw new Error('lost transition acknowledgement');
        },
      }),
    ).rejects.toThrow('lost transition acknowledgement'),
  );
  const completedOperation = checkedRecord(
      parseFixtureJson(
        readFileSync(path.join(f.root, '.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json'), 'utf8'),
      ),
      'completed delivery operation',
    ),
    completedSidecar = checkedRecord(
      parseFixtureJson(readFileSync(sidecarPath, 'utf8')),
      'completed source correction sidecar',
    ),
    completedReceiptBytes = readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'));
  expect(completedOperation).toMatchObject({ revision: 4, phase: 'applied', maintenance_released: true });
  expect(completedSidecar).toMatchObject({ status: 'applied', revision: 3 });
  expect(checkedRecord(completedSidecar.completion, 'completed sidecar transition')).toMatchObject({
    schema: 'RuntimeConfigDeliveryTransition/v1',
    operation_sha256: sha(
      readFileSync(path.join(f.root, '.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json')),
    ),
    receipt_sha256: sha(completedReceiptBytes),
    runtime_accepted: false,
  });
  const appliedSidecarBytes = readFileSync(sidecarPath),
    beforeAppliedWithdrawal = databaseState(f),
    appliedHistoryPath = path.join(
      f.root,
      `.agent/work/fixture-rebind/source-correction-request-history/${requiredCliString(requiredCliObject(completedSidecar, 'request', 'completed source correction request'), 'request_id', 'completed request id')}.json`,
    );
  await Promise.resolve(
    expect(
      run([
        ...repairArgs('repair-withdraw'),
        '--expected-request',
        requiredCliString(
          requiredCliObject(completedSidecar, 'request', 'completed source correction request'),
          'request_id',
          'completed request id',
        ),
      ]),
    ).rejects.toThrow('only an unapplied source correction request can be withdrawn'),
  );
  expect(readFileSync(sidecarPath)).toEqual(appliedSidecarBytes);
  expect(existsSync(appliedHistoryPath)).toBe(false);
  expect(databaseState(f)).toEqual(beforeAppliedWithdrawal);
  const initialProof = await run(repairArgs('repair-transition'));
  expect(requiredCliString(initialProof, 'status', 'transition status')).toBe('closed_config_transition_proven');
  expect(requiredCliString(initialProof, 'baseline_config_digest', 'transition baseline digest')).toBe(
    requiredCliString(plan, 'old_config_digest', 'baseline config digest'),
  );
  expect(checkedBoolean(initialProof.caller_owner_cas_required, 'caller owner CAS required')).toBe(true);
  expect(checkedBoolean(initialProof.runtime_accepted, 'transition runtime acceptance')).toBe(false);
  expect(checkedBoolean(initialProof.writes_host_state, 'transition Host write flag')).toBe(false);

  withDatabase(f, (db) => {
    const store = new HostStateStore(db, f.workspace),
      before = store.readHostStateSnapshot(fixtureContext.request.identity);
    store.compareAndSwapHostState(advanceFixtureHostSnapshot(before));
  });
  const afterFreshOwnerCas = await run(repairArgs('repair-transition'));
  expect(requiredCliString(afterFreshOwnerCas, 'transition_digest', 'fresh transition digest')).toBe(
    requiredCliString(initialProof, 'transition_digest', 'initial transition digest'),
  );

  f.put(
    '.agent/runtime-initialization.v1.json',
    json({
      ...checkedFixtureInitializationReceipt(
        f,
        new TextDecoder('utf-8', { fatal: true }).decode(completedReceiptBytes),
      ),
      config_digest: sha(Buffer.from('foreign postimage')),
    }),
  );
  await Promise.resolve(
    expect(run(repairArgs('repair-transition'))).rejects.toThrow('closed source delivery configuration'),
  );
  f.put('.agent/runtime-initialization.v1.json', completedReceiptBytes);
  f.put(changedPath, readFileSync(path.join(f.root, changedPath), 'utf8') + '\n// post-delivery Source drift\n');
  await Promise.resolve(
    expect(run(repairArgs('repair-transition'))).rejects.toThrow('closed source delivery current Source differs'),
  );
}, 60000);

test('inspect/plan are read-only for YAML/receipt/database; fenced apply precedes authored edit and resume preserves provenance', async () => {
  const f = fixture();
  const before = readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'));
  seedState(f, { native: true });
  const persisted = databaseState(f);
  const cliOptions: SpawnSyncOptionsWithStringEncoding = {
    cwd: f.root,
    encoding: 'utf8',
    timeout: 30000,
    windowsHide: true,
  };
  const cli = spawnSync(
    process.execPath,
    [path.join(source, 'bin/reconcile-artifacts.ts'), ...f.args('inspect')],
    cliOptions,
  );
  expect(cli.status, cliChildDiagnostic('reconcile-artifacts inspect child', cli)).toBe(0);
  expect(
    requiredCliString(checkedCliObject(parseFixtureJson(cli.stdout), 'reconcile CLI result'), 'status', 'CLI status'),
  ).toBe('inspect_ready_unauthorized');
  expect((await runReconcileArtifacts(f.args('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f)).toEqual(persisted);
  expect(existsSync(path.join(f.root, '.agent/work/fixture-rebind'))).toBe(false);
  expect((await runReconcileArtifacts(f.args('plan'))).status).toBe('planned');
  expect(databaseState(f)).toEqual(persisted);
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(f.oldYaml);
  expect((await runReconcileArtifacts(f.args('apply'))).status).toBe('author_config_required');
  expect(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json')).equals(before)).toBe(true);
  f.put('agent-runtime.config.v1.yaml', f.target);
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  const after = parseFixtureJson(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'));
  expect(after).toEqual({ ...f.receipt, config_digest: runtimeConfigDigest(loadRuntimeConfig(f.root)) });
  const appliedState = databaseState(f);
  expect(appliedState.agent_host_state).toEqual(persisted.agent_host_state);
  expect(appliedState.agent_host_mastra_session_ledger).toEqual(persisted.agent_host_mastra_session_ledger);
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
}, 30_000);

test('Source without selector rebinds Luna under the same fence and preserves work state', async () => {
  const f = fixture({ sourceMode: true });
  const before = databaseState(f);
  expect((await runReconcileArtifacts(f.args('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f)).toEqual(before);
  await runReconcileArtifacts(f.args('plan'));
  expect((await runReconcileArtifacts(f.args('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', f.target);
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  const adoptedConfig = loadRuntimeConfig(f.root),
    executor = requiredRuntimeAgentProfile(adoptedConfig, 'executor');
  expect(executor.model).toBe('gpt-6-luna');
  expect(executor.reasoning).toBe('max');
  expect(databaseState(f).agent_host_state).toEqual(before.agent_host_state);
  expect(existsSync(path.join(f.root, '.agent/active-runtime-selector.v1.json'))).toBe(false);
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual({
    ...f.receipt,
    config_digest: runtimeConfigDigest(loadRuntimeConfig(f.root)),
  });
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
}, 30_000);

test('Source inventory rejects linked directories before traversal and bounds enumeration', async () => {
  const f = fixture({ sourceMode: true });
  const directory = path.join(f.root, f.bundle, 'src');
  renameSync(directory, directory + '-original');
  f.put('external/file.ts', '// outside Source');
  symlinkSync(path.join(f.root, 'external'), directory, process.platform === 'win32' ? 'junction' : 'dir');
  const before = databaseState(f);
  await Promise.resolve(
    expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/symlink|reparse|boundary|link/),
  );
  expect(databaseState(f)).toEqual(before);
  const g = fixture({ sourceMode: true });
  for (let i = 0; i < 513; i++) g.put(g.bundle + '/src/config/entry-' + i + '.ts', '// bounded fixture');
  const otherBefore = databaseState(g);
  await Promise.resolve(
    expect(runReconcileArtifacts(g.args('inspect'))).rejects.toThrow(/inventory exceeds the path bound/),
  );
  expect(databaseState(g)).toEqual(otherBefore);
}, 30_000);

test('reasoning-only targets are accepted while invalid reasoning and unrelated profiles are denied', async () => {
  const f = fixture();
  f.put('proposed.yaml', f.oldYaml.replace(/(model: gpt-6-sol\r?\n      reasoning:) high/, '$1 max'));
  const before = databaseState(f);
  expect((await runReconcileArtifacts(f.args('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f)).toEqual(before);
  const invalidReasoning = f.target.replace(
    /(    executor:\r?\n      model: [^\r\n]+\r?\n      reasoning:) medium/,
    '$1 123',
  );
  expect(invalidReasoning).not.toBe(f.target);
  f.put('proposed.yaml', invalidReasoning);
  await Promise.resolve(expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/validation failed/));
  const invalidModel = f.target.replace(/(    executor:\r?\n      model:) [^\r\n]+/, '$1 123');
  expect(invalidModel).not.toBe(f.target);
  f.put('proposed.yaml', invalidModel);
  await Promise.resolve(expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/validation failed/));
  f.put('proposed.yaml', f.target.replace(/(architect:\r?\n      model:) [^\r\n]+/, '$1 another-model'));
  await Promise.resolve(expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/only requested executor/));
  expect(databaseState(f)).toEqual(before);
});

test('prewriter template adoption preserves a multi-project registry and rejects unrelated changes', async () => {
  const f = fixture({ sourceMode: true, extraProject: true });
  const target = parseRuntimeConfigYaml(f.oldYaml);
  const baseline = withoutPrewriterTemplateDelta(target);
  f.put('agent-runtime.config.v1.yaml', json(baseline));
  f.put('.agent/runtime-initialization.v1.json', json({ ...f.receipt, config_digest: runtimeConfigDigest(baseline) }));
  f.put('proposed.yaml', json(target));
  const before = databaseState(f);
  expect((await runReconcileArtifacts(f.args('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f)).toEqual(before);
  const mutateCandidates: readonly ((value: AgentRuntimeConfig) => AgentRuntimeConfig)[] = [
    (value) => withProjectTitle(value, 1, 'foreign project change'),
    withoutLastProject,
    (value) => withAgentProfileChange(value, 'architect', { reasoning: 'low' }),
  ];
  for (const mutate of mutateCandidates) {
    const changed = mutate(target);
    f.put('proposed.yaml', json(changed));
    await Promise.resolve(expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow());
    expect(databaseState(f)).toEqual(before);
  }
  f.put('proposed.yaml', json(target));
  const nativeAccess = runtimeConfig.runtimePackageAccess(),
    nativeVerifiedRead = nativeAccess.readVerifiedCaptureBytes;
  if (nativeAccess.provider === 'linux-proc-fd') {
    if (!nativeVerifiedRead) throw new Error('Native package reader has no verified capture method');
    const observed: { target: string; label: string; bytes: Buffer }[] = [],
      rawReads: string[] = [],
      accessSpy = spyOn(runtimeConfig, 'runtimePackageAccess').mockImplementation(() => ({
        ...nativeAccess,
        readBytes(target: string, label: string): Buffer {
          if (
            target === 'templates/agent-runtime.config.template.v1.yaml' ||
            target === 'schemas/runtime-initialization.v1.schema.json'
          )
            rawReads.push(`${target}:${label}`);
          return nativeAccess.readBytes.call(nativeAccess, target, label);
        },
        readVerifiedCaptureBytes(target: string, label: string, maxBytes?: number): Buffer {
          const bytes = nativeVerifiedRead.call(nativeAccess, target, label, maxBytes);
          observed.push({ target, label, bytes: Buffer.from(bytes) });
          return bytes;
        },
      }));
    try {
      expect((await runReconcileArtifacts(f.args('plan'))).status).toBe('planned');
    } finally {
      accessSpy.mockRestore();
    }
    expect(
      observed.filter(
        ({ target, label }) =>
          target === 'templates/agent-runtime.config.template.v1.yaml' &&
          label === 'maintained prewriter workflow template',
      ),
    ).toHaveLength(1);
    const schemaReads = observed.filter(
      ({ target, label }) =>
        target === 'schemas/runtime-initialization.v1.schema.json' && label === 'initialization schema',
    );
    expect(schemaReads).toHaveLength(2);
    const schemaRead = requiredElement(schemaReads, 0, 'verified initialization schema');
    expect(requiredElement(schemaReads, 1, 'verified plan initialization schema').bytes).toEqual(schemaRead.bytes);
    expect(rawReads).toEqual([]);
    const operationPath = path.join(f.root, '.agent/work/fixture-rebind/runtime-config-rebind-operation.v1.json'),
      operation = checkedRecord(parseFixtureJson(readFileSync(operationPath, 'utf8')), 'planned prewriter operation'),
      plan = requiredCliObject(operation, 'plan', 'planned prewriter operation plan');
    expect(plan.initialization_schema_digest).toBe(sha(schemaRead.bytes));
  } else {
    console.warn(
      'Native verified package-resource caller qualification unavailable; retaining semantic case assertions',
    );
    expect((await runReconcileArtifacts(f.args('plan'))).status).toBe('planned');
  }
  expect((await runReconcileArtifacts(f.args('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', json(target));
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  const adopted = loadRuntimeConfig(f.root);
  expect(adopted.projects).toEqual(baseline.projects);
  expect(adopted.integrations).toEqual(baseline.integrations);
  for (const id of ['implementation_new', 'implementation_change', 'bug_fix', 'task_execution'])
    expect(requiredRuntimeWorkflow(adopted, id).stages.some((stage) => stage.id === 'review_source_prewrite')).toBe(
      true,
    );
}, 120_000);

test('a new normal config operation adopts only the approved prewriter delta after delivery closes', async () => {
  const f = deliveryFixture(),
    baseline = withoutPrewriterTemplateDelta(parseRuntimeConfigYaml(f.oldYaml)),
    deliveryTarget = withoutPrewriterTemplateDelta(parseRuntimeConfigYaml(f.target)),
    prewriterTarget = parseRuntimeConfigYaml(f.target),
    receipt = checkedFixtureInitializationReceipt(
      f,
      readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'),
    ),
    deliveryOperationPath = path.join(f.root, '.agent/work/fixture-rebind/runtime-config-delivery-operation.v1.json');
  f.put('accepted-baseline.yaml', json(baseline));
  f.put('agent-runtime.config.v1.yaml', json(deliveryTarget));
  f.put('.agent/runtime-initialization.v1.json', json({ ...receipt, config_digest: runtimeConfigDigest(baseline) }));

  expect((await runReconcileArtifacts(f.deliveryArgs('plan'))).status).toBe('planned');
  expect((await runReconcileArtifacts(f.deliveryArgs('apply'))).status).toBe('receipt_rebind_ready');
  expect((await runReconcileArtifacts(f.deliveryArgs('resume'))).status).toBe('applied');
  const frozenDeliveryOperation = readFileSync(deliveryOperationPath),
    frozenDeliveryValue = checkedRecord(
      parseFixtureJson(new TextDecoder('utf-8', { fatal: true }).decode(frozenDeliveryOperation)),
      'completed delivery operation',
    ),
    normalOperationPath = path.join(f.root, '.agent/work/fixture-rebind/runtime-config-rebind-operation.v1.json'),
    normalArgs = (mode: string) => {
      const args = f.args(mode);
      const instructionRefIndex = args.indexOf('--instruction-ref');
      if (instructionRefIndex >= 0)
        args[instructionRefIndex + 1] =
          'TEST SETUP: adopt approved prewriter workflow template after prior delivery closure';
      return args;
    },
    beforeRejectedTarget = databaseState(f),
    authoredBaseline = readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'));
  expect(frozenDeliveryValue.phase).toBe('applied');
  expect(frozenDeliveryValue.maintenance_released).toBe(true);

  const unrelatedTarget = withAgentProfileChange(prewriterTarget, 'architect', { reasoning: 'high' });
  f.put('proposed.yaml', json(unrelatedTarget));
  await Promise.resolve(
    expect(runReconcileArtifacts(normalArgs('inspect'))).rejects.toThrow(/approved prewriter workflow template delta/),
  );
  expect(databaseState(f)).toEqual(beforeRejectedTarget);
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'))).toEqual(authoredBaseline);
  expect(readFileSync(deliveryOperationPath)).toEqual(frozenDeliveryOperation);
  expect(existsSync(normalOperationPath)).toBe(false);

  f.put('proposed.yaml', json(prewriterTarget));
  expect((await runReconcileArtifacts(normalArgs('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect((await runReconcileArtifacts(normalArgs('plan'))).status).toBe('planned');
  expect((await runReconcileArtifacts(normalArgs('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', json(prewriterTarget));
  expect((await runReconcileArtifacts(normalArgs('resume'))).status).toBe('applied');

  const adopted = loadRuntimeConfig(f.root),
    completedNormalOperation = checkedRecord(
      parseFixtureJson(readFileSync(normalOperationPath, 'utf8')),
      'completed normal operation',
    );
  for (const role of ['source-planner', 'security-prewriter']) {
    const adoptedInstruction = adopted.agents.role_instructions[role],
      expectedInstruction = prewriterTarget.agents.role_instructions[role],
      adoptedTeam = adopted.teams['default-development'],
      expectedTeam = prewriterTarget.teams['default-development'];
    if (
      adoptedInstruction === undefined ||
      expectedInstruction === undefined ||
      adoptedTeam === undefined ||
      expectedTeam === undefined
    )
      throw Error(`Fixture config is missing role ${role}`);
    const adoptedRole = adoptedTeam.roles[role],
      expectedRole = expectedTeam.roles[role];
    if (adoptedRole === undefined || expectedRole === undefined) throw Error(`Fixture team is missing role ${role}`);
    expect(adoptedInstruction).toEqual(expectedInstruction);
    expect(adoptedRole).toBe(expectedRole);
  }
  const lifecycleContract = adopted.artifact_contracts['LifecyclePreparationObservation/v1'];
  if (lifecycleContract === undefined) throw Error('Fixture lifecycle preparation contract is missing');
  expect(lifecycleContract.required_fields).toEqual([
    'schema',
    'record_id',
    'kind',
    'work_id',
    'attempt',
    'source_revision',
    'scope_id',
    'config_digest',
    'ac_ids',
    'observed_at',
    'observer_id',
    'status',
    'evidence_refs',
    'observations',
    'gaps',
  ]);
  const requiredStageIds: readonly [string, string][] = [
    ['implementation_new', 'develop_change'],
    ['implementation_change', 'develop_change'],
    ['bug_fix', 'develop_fix'],
    ['task_execution', 'develop_task'],
  ];
  for (const [workflowId, developerId] of requiredStageIds) {
    const workflow = requiredWorkflow(adopted, workflowId),
      expectedWorkflow = requiredWorkflow(prewriterTarget, workflowId),
      review = workflow.stages.find((stage) => stage.id === 'review_source_prewrite');
    expect(review).toEqual(expectedWorkflow.stages.find((stage) => stage.id === 'review_source_prewrite'));
    if (!review) throw Error(`Fixture workflow ${workflowId} has no source review stage`);
    expect(review.required_after).toEqual(['synthesize_task']);
    const developerStage = workflow.stages.find((stage) => stage.id === developerId);
    if (!developerStage) throw Error(`Fixture workflow ${workflowId} has no developer stage`);
    expect(developerStage.required_after).toEqual(['review_source_prewrite']);
  }
  expect(completedNormalOperation.schema).toBe('ConfigRebindOperation/v1');
  expect(completedNormalOperation.phase).toBe('applied');
  expect(completedNormalOperation.maintenance_released).toBe(true);
  const normalOperationPlan = requiredCliObject(completedNormalOperation, 'plan', 'completed normal operation plan'),
    normalOperationId = requiredCliString(normalOperationPlan, 'operation_id', 'normal operation id'),
    normalEdge = readAppliedRuntimeConfigRebind(f.root, adopted, normalOperationId);
  expect(canonicalJson(normalEdge.value)).toBe(canonicalJson(completedNormalOperation));
  expect(normalEdge.receipt.value.config_digest).toBe(runtimeConfigDigest(adopted));
  const savedNormal = readFileSync(normalOperationPath);
  for (const patch of [{ maintenance_released: false }, { phase: 'fenced' }, { plan_digest: '0'.repeat(64) }]) {
    writeFileSync(normalOperationPath, json({ ...completedNormalOperation, ...patch }));
    expect(() => readAppliedRuntimeConfigRebind(f.root, adopted, normalOperationId)).toThrow();
  }
  writeFileSync(normalOperationPath, savedNormal);
  expect(readAppliedRuntimeConfigRebind(f.root, adopted, normalOperationId).bytes).toEqual(savedNormal);
  const forgedPlan = { ...normalOperationPlan, actor: 'forged-controller' };
  writeFileSync(
    normalOperationPath,
    json({ ...completedNormalOperation, plan: forgedPlan, plan_digest: canonicalJsonDigest(forgedPlan) }),
  );
  expect(() => readAppliedRuntimeConfigRebind(f.root, adopted, normalOperationId)).toThrow(
    /typed Host maintenance release/,
  );
  writeFileSync(normalOperationPath, savedNormal);
  expect(readFileSync(deliveryOperationPath)).toEqual(frozenDeliveryOperation);
  expect(JSON.parse(readFileSync(deliveryOperationPath, 'utf8'))).toEqual(frozenDeliveryValue);
}, 120_000);

test.each(['source bytes', 'selector appearance'])(
  'Source rebind preserves its fence after post-authoring %s drift',
  async (change) => {
    const f = fixture({ sourceMode: true });
    await runReconcileArtifacts(f.args('plan'));
    await runReconcileArtifacts(f.args('apply'));
    const held = fence(f);
    f.put('agent-runtime.config.v1.yaml', f.target);
    if (change === 'source bytes') f.put(f.bundle + '/bin/run.ts', '// changed Source');
    else f.put('.agent/active-runtime-selector.v1.json', json({ schema: 'ActiveRuntimeSelector/v1' }));
    const expectedDenial =
      change === 'source bytes'
        ? 'vida runtime-config rebind: Source drift requires the applied same-operation source correction under its original fence'
        : /differs|differ|rejects an active selector/;
    await Promise.resolve(expect(runReconcileArtifacts(f.args('resume'))).rejects.toThrow(expectedDenial));
    expect(fence(f)).toEqual(held);
    expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual(
      f.receipt,
    );
  },
  30_000,
);

test('no-effect abandonment releases its own fence; receipt-applied rollback is always denied', async () => {
  const f = fixture();
  await runReconcileArtifacts(f.args('plan'));
  await runReconcileArtifacts(f.args('apply'));
  const held = fence(f);
  if (held === null) throw Error('Applied fixture operation did not retain its maintenance fence');
  expect(held.status).toBe('held');
  expect(held.binding.operation_id).toBe('fixture-rebind');
  const result = await runReconcileArtifacts(f.args('restore'));
  expect(result.status).toBe('abandoned_no_effect');
  expect(result.rollback_performed).toBe(false);
  expect(readFileSync(path.join(f.root, 'agent-runtime.config.v1.yaml'), 'utf8')).toBe(f.oldYaml);
  expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual(
    f.receipt,
  );
  const released = fence(f);
  expect(released).toEqual({ ...held, revision: held.revision + 1, status: 'released' });
  expect((await runReconcileArtifacts(f.args('restore'))).status).toBe('abandoned_no_effect');
  expect(fence(f)).toEqual(released);
  const g = fixture();
  await runReconcileArtifacts(g.args('plan'));
  await runReconcileArtifacts(g.args('apply'));
  g.put('agent-runtime.config.v1.yaml', g.target);
  await runReconcileArtifacts(g.args('resume'));
  await Promise.resolve(expect(runReconcileArtifacts(g.args('restore'))).rejects.toThrow(/rollback/));
}, 30_000);

test.each(persistedEffectDenialCases)(
  '%s denies inspect and plan without changing persisted state',
  async (_name, setup, message) => {
    const f = fixture();
    seedState(f, setup);
    const persisted = databaseState(f);
    for (const mode of ['inspect', 'plan'])
      await Promise.resolve(expect(runReconcileArtifacts(f.args(mode))).rejects.toThrow(message));
    expect(databaseState(f)).toEqual(persisted);
    expect(existsSync(path.join(f.root, '.agent/work/fixture-rebind'))).toBe(false);
  },
);

test('target cannot move operational/path fields or edit YAML before held fence', async () => {
  const f = fixture();
  f.put(
    'proposed.yaml',
    f.target.replace(/^config_revision: (\d+)$/m, (_, n) => `config_revision: ${Number(n) + 1}`),
  );
  await Promise.resolve(expect(runReconcileArtifacts(f.args('plan'))).rejects.toThrow(/only requested/));
  const g = fixture();
  await runReconcileArtifacts(g.args('plan'));
  g.put('agent-runtime.config.v1.yaml', g.target);
  await Promise.resolve(expect(runReconcileArtifacts(g.args('apply'))).rejects.toThrow(/wait for held/));
});

test.each(['queued ownership', 'work', 'journal', 'governance'])(
  '%s arriving after preflight aborts acquisition without a new maintenance fence',
  async (change) => {
    const f = fixture();
    await runReconcileArtifacts(f.args('plan'));
    const original: MaintenanceFenceAcquisition = HostStateStore.prototype['acquireMaintenanceFenceWithRecordedToken'];
    let injected: FixtureDatabaseState | undefined;
    HostStateStore.prototype.acquireMaintenanceFenceWithRecordedToken = function (
      this: HostStateStore,
      binding: Parameters<MaintenanceFenceAcquisition>[0],
      token: Parameters<MaintenanceFenceAcquisition>[1],
    ) {
      if (change === 'governance')
        withDatabase(f, (db) =>
          new HostStateStore(db, f.workspace).reserveOperation(
            'race',
            canonicalJsonDigest('operation'),
            canonicalJsonDigest('request'),
          ),
        );
      else seedState(f, change === 'queued ownership' ? { ticketStatus: 'queued' } : { native: change === 'journal' });
      injected = databaseState(f);
      return Reflect.apply(original, this, [binding, token]);
    };
    try {
      await Promise.resolve(
        expect(runReconcileArtifacts(f.args('apply'))).rejects.toThrow(
          /ownership|global state differs|governance effect pending\/unknown/,
        ),
      );
      expect(fence(f)).toBeNull();
      if (injected === undefined) throw Error('Fixture state injection was not recorded');
      expect(databaseState(f)).toEqual(injected);
      expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual(
        f.receipt,
      );
    } finally {
      HostStateStore.prototype.acquireMaintenanceFenceWithRecordedToken = original;
    }
  },
);

test('rebind preserves settled governance envelopes and refuses pending effects by outcome', async () => {
  const f = fixture();
  withDatabase(f, (db) => {
    const store = new HostStateStore(db, f.workspace);
    const operation = store.reserveOperation(
      'settled',
      canonicalJsonDigest('operation'),
      canonicalJsonDigest('request'),
    );
    if (operation === null) throw Error('Settled governance fixture reservation was denied');
    store.transitionOperation(operation, 'commit_unknown');
    store.transitionOperation(operation, 'applied', canonicalJsonDigest('result'));
  });
  const before = databaseState(f);
  expect((await runReconcileArtifacts(f.args('plan'))).status).toBe('planned');
  expect((await runReconcileArtifacts(f.args('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', f.target);
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  expect(databaseState(f).agent_host_governance).toEqual(before.agent_host_governance);
});

test('a foreign maintenance fence acquired after preflight is preserved without conversion or phase effects', async () => {
  const f = fixture();
  await runReconcileArtifacts(f.args('plan'));
  const original: MaintenanceFenceAcquisition = HostStateStore.prototype['acquireMaintenanceFenceWithRecordedToken'];
  let foreign: ReturnType<MaintenanceFenceAcquisition>['fence'] | undefined, before: FixtureDatabaseState | undefined;
  HostStateStore.prototype.acquireMaintenanceFenceWithRecordedToken = function (
    this: HostStateStore,
    binding: Parameters<MaintenanceFenceAcquisition>[0],
    token: Parameters<MaintenanceFenceAcquisition>[1],
  ) {
    withDatabase(f, (db) => {
      const owner = new HostStateStore(db, f.workspace, undefined, undefined, undefined, {
        principal: 'fixture:foreign-maintenance',
        projectIds: f.receipt.project_ids,
        verify: () => null,
      });
      foreign = owner.acquireMaintenanceFence({ ...binding, operation_id: 'foreign-operation' }).fence;
    });
    before = databaseState(f);
    return Reflect.apply(original, this, [binding, token]);
  };
  try {
    await Promise.resolve(
      expect(runReconcileArtifacts(f.args('apply'))).rejects.toThrow(/maintenance\/global state differs/),
    );
    if (foreign === undefined || before === undefined) throw Error('Foreign maintenance fixture was not recorded');
    expect(fence(f)).toEqual(foreign);
    expect(databaseState(f)).toEqual(before);
  } finally {
    HostStateStore.prototype.acquireMaintenanceFenceWithRecordedToken = original;
  }
});

test.each(['fence_acquired', 'fenced', 'receipt_rebound', 'applied', 'released'])(
  'interrupted %s resumes one current operation without duplicate receipt effects',
  async (phase: string) => {
    const f = fixture();
    await runReconcileArtifacts(f.args('plan'));
    const interrupt = (_phase: string) => {
      if (_phase === phase) throw Error('injected interruption');
    };
    if (['fence_acquired', 'fenced'].includes(phase)) {
      await Promise.resolve(
        expect(runReconcileArtifacts(f.args('apply'), { onPhase: interrupt })).rejects.toThrow(/injected/),
      );
      expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('author_config_required');
    } else await runReconcileArtifacts(f.args('apply'));
    f.put('agent-runtime.config.v1.yaml', f.target);
    if (!['fence_acquired', 'fenced'].includes(phase))
      await Promise.resolve(
        expect(runReconcileArtifacts(f.args('resume'), { onPhase: interrupt })).rejects.toThrow(/injected/),
      );
    expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  },
  // The serial lifecycle wrapper must settle before fixture teardown.
  0,
);

test('historical owner inspection preserves the default when context history is omitted and denies an empty export', () =>
  withHistoricalInspectionFixtureCustody(() => {
    const { f, request } = historicalFixture('unknown_readonly'),
      before = databaseState(f),
      engineBefore = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite')),
      nativeAccess = runtimeConfig.runtimePackageAccess(),
      originalReadBytes = nativeAccess.readBytes,
      originalVerifiedRead = nativeAccess.readVerifiedCaptureBytes,
      verifiedSchemaReads: Buffer[] = [];
    let rawSchemaReads = 0;
    if (!originalVerifiedRead)
      throw new Error('Historical inspection requires the native verified package-byte reader');
    const accessSpy = spyOn(runtimeConfig, 'runtimePackageAccess').mockImplementation(() => ({
      ...nativeAccess,
      readBytes(target: string, label: string): Buffer {
        if (target === 'schemas/runtime-initialization.v1.schema.json') rawSchemaReads += 1;
        return originalReadBytes.call(nativeAccess, target, label);
      },
      readVerifiedCaptureBytes(target: string, label: string, maxBytes?: number): Buffer {
        const bytes = originalVerifiedRead.call(nativeAccess, target, label, maxBytes);
        if (target === 'schemas/runtime-initialization.v1.schema.json') verifiedSchemaReads.push(Buffer.from(bytes));
        return bytes;
      },
    }));
    try {
      expect(() =>
        inspectHistoricalOwnerContext(f.root, 'baseline.yaml', request.identity, request.attempt, undefined),
      ).not.toThrow();
    } finally {
      accessSpy.mockRestore();
    }
    expect(verifiedSchemaReads).toHaveLength(2);
    expect(rawSchemaReads).toBe(0);
    const retainedReceipt = checkedFixtureInitializationReceipt(
      f,
      readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'),
    );
    for (const [index, schemaBytes] of verifiedSchemaReads.entries()) {
      expect(sha(schemaBytes), `verified historical schema read ${index + 1}`).toBe(retainedReceipt.schema_sha256);
    }
    expect(() => inspectHistoricalOwnerContext(f.root, 'baseline.yaml', request.identity, request.attempt, [])).toThrow(
      /original context collection must be a nonempty array/,
    );
    expect(databaseState(f)).toEqual(before);
    expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engineBefore);
  }));

test.each(['completed_readonly', 'unknown_readonly', 'settled_writer_failed_validators'])(
  'historical %s releases only its original owner after config delivery and preserves all original evidence',
  async (predicate) => {
    const { f, args, state } = historicalFixture(predicate),
      before = databaseState(f),
      engineBefore = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
    const inspected = await run(args('inspect'));
    expect(inspected.caller_identity_authenticated).toBe(false);
    expect(databaseState(f)).toEqual(before);
    f.put('release.json', json(inspected.request));
    const result = await run(args('apply'));
    expect(result.status).toBe('historical_owner_released');
    const after = databaseState(f);
    expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
    const workBefore = checkedFixtureWork(parseFixtureJson(requiredHostStatePayload(before, 'work')), f),
      workAfter = checkedFixtureWork(parseFixtureJson(requiredHostStatePayload(after, 'work')), f);
    expect(workAfter.lease).toBeNull();
    expect(workAfter.binding).toEqual(workBefore.binding);
    expect(workAfter.execution.assignment_attempts).toEqual(workBefore.execution.assignment_attempts);
    expect(workAfter.lifecycle.phase).toBe(workBefore.lifecycle.phase);
    expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite')).equals(engineBefore)).toBe(true);
    expect(JSON.parse(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'), 'utf8'))).toEqual(
      f.receipt,
    );
    expect((await run(args('apply'))).work_version).toEqual(result.work_version);
    expect(requiredSourceScope(state).digest).toBeTruthy();
  },
  30000,
);

test('public historical inspect runs from unrelated cwd while the ordinary receipt is stale', () => {
  const { f, args } = historicalFixture('completed_readonly'),
    before = databaseState(f);
  const actual = spawnSync(process.execPath, [path.join(source, 'bin/run.ts'), ...args('inspect')], {
    cwd: tmpdir(),
    encoding: 'utf8',
    windowsHide: true,
    timeout: 30000,
  });
  expect(actual.status, cliChildDiagnostic('historical inspect child', actual)).toBe(0);
  expect(actual.error, cliChildDiagnostic('historical inspect child', actual)).toBeUndefined();
  expect(checkedCliObject(parseFixtureJson(actual.stdout), 'historical CLI result').status).toBe(
    'historical_owner_release_inspected',
  );
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('public unissued owner release preserves its inert frontier and denies completed-readonly fiction', async () => {
  const { f, args, state, request } = historicalFixture('unissued_prepared'),
    before = databaseState(f),
    engine = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const legacy = { ...request, schema: 'HistoricalOwnerReleaseRequest/v1', predicate: 'completed_readonly' };
  f.put('release.json', json(legacy));
  const oldArgs = args('inspect');
  oldArgs[0] = '--release-historical-owner';
  await Promise.resolve(expect(run(oldArgs)).rejects.toThrow('completed readonly'));
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(request));
  const wrongOwner = args('inspect');
  wrongOwner[7] = 'foreign-owner';
  await Promise.resolve(expect(run(wrongOwner)).rejects.toThrow('original owner differs'));
  const inspected = await run(args('inspect'));
  expect(inspected.status).toBe('historical_owner_release_inspected');
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  const result = await run(args('apply'));
  expect(result.rights_granted).toBe(false);
  const after = databaseState(f),
    work = checkedFixtureWork(parseFixtureJson(requiredHostStatePayload(after, 'work')), f);
  expect(work.lease).toBeNull();
  expect(work.execution.status).toBe('suspended');
  expect(work.lifecycle.next_action).toContain('unissued frontier remains inert');
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite')).equals(engine)).toBe(true);
  expect(state.items.every((item) => item.issue_id === null && item.observation === null)).toBe(true);
  expect((await run(args('apply'))).work_version).toEqual(result.work_version);
}, 30000);

test('public historical context history uses retained context after mutable documentation changes', async () => {
  const { f, args, configuredContexts } = historicalFixture('completed_readonly', { configuredContext: true });
  f.put(
    'retained-run.json',
    json({
      schema: 'VidaAgentRunResult/v1',
      next_actions: configuredContexts.map((context) => ({ configured_context: context })),
    }),
  );
  f.put(fixtureContextPath, 'Current changed documentation');
  const before = databaseState(f);
  await Promise.resolve(expect(run(args('inspect'))).rejects.toThrow('original configured requests differ'));
  const withHistory = (mode: string) => [...args(mode), '--context-history', 'retained-run.json'];
  const foreign = structuredClone(firstConfiguredContext(configuredContexts));
  foreign.work_id = 'foreign-work';
  f.put(
    'retained-run.json',
    json({ schema: 'VidaAgentRunResult/v1', next_actions: [{ configured_context: foreign }] }),
  );
  await Promise.resolve(expect(run(withHistory('inspect'))).rejects.toThrow('identity invalid'));
  expect(databaseState(f)).toEqual(before);
  f.put(
    'retained-run.json',
    json({
      schema: 'VidaAgentRunResult/v1',
      next_actions: configuredContexts.map((context) => ({ configured_context: context })),
    }),
  );
  const inspected = await run(withHistory('inspect'));
  expect(inspected.status).toBe('historical_owner_release_inspected');
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  expect((await run(withHistory('apply'))).status).toBe('historical_owner_released');
  expect((await run(withHistory('apply'))).rights_granted).toBe(false);
}, 30000);

test('public unissued owner release rejects an issued frontier without disposing its lease', async () => {
  const { f, args, request } = historicalFixture('unknown_readonly'),
    before = databaseState(f);
  f.put('release.json', json({ ...request, schema: 'UnissuedOwnerReleaseRequest/v1', predicate: 'unissued_prepared' }));
  const signal = args('inspect');
  signal[0] = '--release-unissued-owner';
  await Promise.resolve(expect(run(signal)).rejects.toThrow('issued or reserved activity'));
  expect(databaseState(f)).toEqual(before);
});

test('historical owner release rejects maintenance drift between predicate and write preparation', () => {
  const { f, request } = historicalFixture('unissued_prepared'),
    before = databaseState(f),
    original = inspectHistoricalOwnerContext(f.root, 'baseline.yaml', request.identity, 1),
    expectedWork = original.owner.version,
    expectedLedger = original.workspace.ledger_version,
    projectId = requiredElement(request.identity.project_ids, 0, 'historical owner project id');
  if (expectedWork === null || expectedLedger === null)
    throw Error('Historical owner fixture lacks current Work or Coordination versions');
  withDatabase(f, (db) => {
    const actual = new HostStateStore(db, f.workspace);
    let reads = 0;
    const readSnapshot = actual.readHostStateSnapshot.bind(actual);
    actual.readHostStateSnapshot = (identity: WorkIdentity) => {
      const snapshot = readSnapshot(identity);
      return ++reads === 2 ? { ...snapshot, maintenanceGeneration: snapshot.maintenanceGeneration + 1 } : snapshot;
    };
    try {
      expect(() =>
        suspendHistoricalOwnerWork({
          store: actual,
          identity: request.identity,
          journal: { state: original.journal.state, version: original.journal.version, resume_status: 'ready' },
          expectedWork,
          expectedLedger,
          expectedMaintenanceGeneration: original.maintenanceGeneration,
          nativeSessionHandle: 'fixture-thread',
          userRequestPointer: request.userRequestPointer,
          requestIntent: request.requestIntent,
          config: original.config,
          predicate: 'unissued_prepared',
          documentationContext: {
            repository_root: f.root,
            repository_id: request.identity.repository_id,
            project_id: projectId,
            work_id: request.identity.work_id,
          },
        }),
      ).toThrow('maintenance generation changed after inspection');
    } finally {
      actual.readHostStateSnapshot = readSnapshot;
    }
  });
  expect(databaseState(f)).toEqual(before);
});

test('known terminal synthesis custody is accepted by read-only config rebind with the original Journal still pending', async () => {
  const { f, request, state } = historicalFixture('terminal_synthesis_unaccepted'),
    completedResearch = state.completed.flatMap((wave) => wave.items),
    pendingSynthesisIndex = completedResearch.length;
  expect(completedResearch).toHaveLength(2);
  seedHistoricalResearchLineage(f, request, state, {
    includeCompleted: true,
    pendingIndex: pendingSynthesisIndex,
    activationOnlyIndex: pendingSynthesisIndex,
  });
  const before = databaseState(f),
    capture = seedKnownTerminalSynthesisCustody(f, request, state);
  expect(capture.receipt.terminal_status).toBe('known_terminal_unaccepted');
  expect(capture.receipt.accepted_result).toBe(false);
  expect(requiredSessionLedgerPayload(databaseState(f))).toBe(requiredSessionLedgerPayload(before));
  const captured = databaseState(f);
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  const inspected = await runReconcileArtifacts(f.args('inspect'));
  expect(inspected.status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f)).toEqual(captured);
  const planned = await runReconcileArtifacts(f.args('plan'));
  expect(planned.status).toBe('planned');
  const journal = parseSessionJournalPayload(
    checkedString(
      requiredElement(captured.agent_host_mastra_session_ledger, 0, 'captured session ledger').payload,
      'ledger payload',
    ),
  );
  expect(requiredElement(journal.items, 0, 'captured journal item').observation).toBeNull();
  const work = checkedFixtureWork(parseFixtureJson(requiredHostStatePayload(captured, 'work')), f);
  expect(work.lifecycle.next_action).toContain('known terminal but unaccepted');
  expect(work.artifacts.some((artifact) => artifact.schema === 'ResearchSynthesis/v1')).toBe(false);
}, 30000);

test('terminal synthesis custody survives unrelated ledger progress and subsequent config repairs', async () => {
  const { f, request, state } = historicalFixture('terminal_synthesis_unaccepted');
  seedHistoricalResearchLineage(f, request, state, {
    includeCompleted: true,
    pendingIndex: state.completed.flatMap((wave) => wave.items).length,
    activationOnlyIndex: state.completed.flatMap((wave) => wave.items).length,
  });
  seedKnownTerminalSynthesisCustody(f, request, state);
  withDatabase(f, (db) => {
    const row = querySqliteRow<HostStateRowIdPayload>(
        db,
        "SELECT rowid,payload FROM agent_host_state WHERE workspace_id=? AND kind='ledger'",
        'terminal custody ledger',
        f.workspace,
      ),
      ledger = checkedMutableFixtureLedger(parseFixtureJson(row.payload));
    ledger.revision += 1;
    db.query('UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE rowid=?').run(
      ledger.revision,
      json(ledger),
      canonicalJsonDigest(ledger),
      row.rowid,
    );
  });
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  const before = databaseState(f);
  await runReconcileArtifacts(f.args('plan'));
  expect((await runReconcileArtifacts(f.args('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', f.target);
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  const next = withAgentProfileChange(parseRuntimeConfigYaml(f.target), 'executor', { reasoning: 'high' });
  f.put('proposed.yaml', json(next));
  const nextArgs = (mode: string) => {
    const values = f.args(mode);
    values[values.indexOf('--repair-id') + 1] = 'fixture-terminal-next';
    return values;
  };
  expect((await runReconcileArtifacts(nextArgs('plan'))).status).toBe('planned');
  expect((await runReconcileArtifacts(nextArgs('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', json(next));
  expect((await runReconcileArtifacts(nextArgs('resume'))).status).toBe('applied');
  const after = databaseState(f);
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(after.agent_host_historical_terminal_synthesis_capture).toEqual(
    before.agent_host_historical_terminal_synthesis_capture,
  );
}, 90_000);

test('public capture CLI exact resume reuses the Host poststate fence without writes', async () => {
  const { f, request, state } = historicalFixture('terminal_synthesis_unaccepted'),
    pendingSynthesisIndex = state.completed.flatMap((wave) => wave.items).length;
  seedHistoricalResearchLineage(f, request, state, {
    includeCompleted: true,
    pendingIndex: pendingSynthesisIndex,
    activationOnlyIndex: pendingSynthesisIndex,
  });
  const original = inspectHistoricalOwnerContext(f.root, 'baseline.yaml', request.identity, request.attempt),
    item = firstJournalItem(original.journal.state),
    predecessors = admittedResearchResultsForSynthesis({
      repositoryRoot: f.root,
      config: original.config,
      journal: { ...original.journal, resume_status: mastraLedgerStatus(original.journal.state) },
      work: original.owner.state,
      workflowId: item.request.workflow_id,
    }),
    source = requiredElement(synthesisSourceCatalog(predecessors).sources, 0, 'synthesis source'),
    sourceRef = source.key,
    summary = json({
      schema: 'VidaSynthesisObservationOutput/v1',
      topic: 'Bounded terminal synthesis evidence',
      findings: [
        {
          finding_id: 'synthesis-finding',
          statement: 'The admitted sources support the scoped conclusion.',
          source_refs: [sourceRef],
          evidence_class: 'Static',
          status: 'confirmed',
        },
      ],
      uncertainties: [],
      conflicts: [],
      br_ids: ['BR-1'],
      sr_ids: ['SR-1'],
      ac_ids: ['AC-1'],
      gap_ids: [],
      options: [
        {
          option_id: 'option-evidence',
          label: 'Use admitted evidence',
          description: 'Keep the conclusion within the accepted sources.',
          evidence_refs: [sourceRef],
        },
      ],
      recommendation: {
        option_id: 'option-evidence',
        rationale: 'The admitted evidence supports the scoped conclusion.',
        evidence_refs: [sourceRef],
      },
      completeness: {
        status: 'blocked',
        required_questions: [],
        answered_questions: [],
        missing_questions: [],
        material_gaps: ['GAP-VIDA-RUN-EXECUTION-001'],
        external_validation: {
          required: true,
          source_count: 2,
          minimum_sources: 2,
          status: 'blocked',
          live_check: false,
        },
      },
      readiness: 'blocked',
    }),
    body = {
      schema: 'VidaSessionObservation/v1',
      action_id: item.request.action_id,
      issue_id: item.issue_id,
      agent_id: 'fixture:research-synthesizer',
      tool_call_ref: 'fixture:terminal-followup',
      status: 'reported_complete',
      summary,
      output_digest: canonicalJsonDigest(summary),
      evidence_refs: [sourceRef],
    },
    bodyRef = '.tmp/synthesis-body.json',
    inputRef = '.tmp/synthesis-input.json',
    reportRef = '.tmp/synthesis-report.json',
    reportBodyRef = '.tmp/synthesis-report-body.json',
    requestRef = '.tmp/terminal-synthesis-capture.json',
    denial = {
      schema: 'VidaAgentRunResult/v1',
      status: 'blocked',
      code: 'GAP-VIDA-RUN-EXECUTION-001',
      message: 'The requested run was blocked by runtime validation.',
    },
    input = { status: body.status, agent_id: body.agent_id, tool_call_ref: body.tool_call_ref },
    report = {
      exit_code: 1,
      input_path: path.resolve(f.root, inputRef),
      command: ['vida-agent', '--report', path.resolve(f.root, reportBodyRef)],
      stderr: json(denial).trim(),
    },
    base = {
      schema: 'HistoricalTerminalSynthesisCaptureRequest/v1',
      identity: request.identity,
      attempt: request.attempt,
      action_id: item.request.action_id,
      issue_id: item.issue_id,
      body_ref: bodyRef,
      input_ref: inputRef,
      report_ref: reportRef,
      followup_ref: body.tool_call_ref,
      userRequestPointer: request.userRequestPointer,
      requestIntent: request.requestIntent,
    };
  f.put(bodyRef, json(body));
  f.put(inputRef, json(input));
  f.put(reportRef, json(report));
  f.put(reportBodyRef, json(body));
  f.put(requestRef, json(base));
  const args = (mode: string): string[] => [
    '--capture-historical-terminal-synthesis',
    'true',
    '--mode',
    mode,
    '--project-root',
    f.root,
    '--native-session-handle',
    'fixture-thread',
    '--baseline-config',
    'baseline.yaml',
    '--request',
    requestRef,
  ];
  const inspected = await run(args('inspect'));
  expect(inspected.status).toBe('historical_terminal_synthesis_capture_inspected');
  f.put(requestRef, json(inspected.request));
  const applied = await run(args('apply'));
  expect(applied.status).toBe('historical_terminal_synthesis_captured');
  expect(applied.rights_granted).toBe(false);
  expect(applied.accepted_result).toBe(false);
  const beforeResume = databaseState(f),
    engineBeforeResume = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  f.put(requestRef, json(base));
  const reinspected = await run(args('inspect'));
  expect(reinspected.status).toBe('historical_terminal_synthesis_capture_inspected');
  expect(reinspected.custody_receipt_present).toBe(true);
  expect(reinspected.request_digest).toBe(applied.request_digest);
  expect(databaseState(f)).toEqual(beforeResume);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engineBeforeResume);
  f.put(requestRef, json(reinspected.request));
  const resumed = await run(args('resume'));
  expect(resumed.status).toBe('historical_terminal_synthesis_captured');
  expect(resumed.receipt).toEqual(applied.receipt);
  expect(resumed.rights_granted).toBe(false);
  expect(resumed.caller_authorization_required).toBe(true);
  expect(databaseState(f)).toEqual(beforeResume);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engineBeforeResume);
}, 30000);

test('terminal synthesis predicate accepts only its exact known target with official-docs egress', () => {
  const terminal = historicalFixture('terminal_synthesis_unaccepted');
  const completedResearch = terminal.state.completed.flatMap((wave) => wave.items),
    pendingSynthesisIndex = completedResearch.length;
  expect(completedResearch).toHaveLength(2);
  seedHistoricalResearchLineage(terminal.f, terminal.request, terminal.state, {
    includeCompleted: true,
    pendingIndex: pendingSynthesisIndex,
    activationOnlyIndex: pendingSynthesisIndex,
  });
  const original = inspectHistoricalOwnerContext(
    terminal.f.root,
    'baseline.yaml',
    terminal.request.identity,
    terminal.request.attempt,
  );
  const target = original.journal.state.items.find((item) => item.issue_id !== null && item.observation === null);
  if (!target || target.issue_id === null) throw Error('Terminal synthesis fixture action is missing');
  const workflow = requiredWorkflow(original.config, target.request.workflow_id),
    stage = workflow.stages.find((entry) => entry.id === target.request.stage_id);
  if (!stage) throw Error('Terminal synthesis fixture stage is missing');
  const assignment = requiredElement(stage.assignments, target.request.assignment_index, 'terminal fixture assignment'),
    profile = requiredProfile(original.config, assignment.profile);
  expect(stage.id).toBe('synthesize_task');
  const egressPolicy = original.config.agents.egress_policies[profile.egress_policy];
  if (!egressPolicy) throw Error('Terminal synthesis fixture egress policy is missing');
  expect(egressPolicy.allowed_hosts.length).toBeGreaterThan(0);
  const capture = {
    actionId: target.request.action_id,
    issueId: target.issue_id,
    bodyBytes: Buffer.from(
      json({
        schema: 'VidaSessionObservation/v1',
        action_id: target.request.action_id,
        issue_id: target.issue_id,
        status: 'reported_complete',
        agent_id: 'fixture:research-synthesizer',
        tool_call_ref: 'fixture:terminal-body',
        summary: 'Known terminal synthesis fixture',
        output_digest: '0'.repeat(64),
        evidence_refs: [],
      }),
    ),
    provenance: {
      schema: 'HistoricalTerminalSynthesisProvenance/v1',
      body_ref: '.tmp/synthesis-body.json',
      input_ref: '.tmp/synthesis-input.json',
      report_ref: '.tmp/synthesis-report.json',
      followup_ref: 'fixture:terminal-body',
      original_actor_id: 'fixture:research-synthesizer',
      denial_status: 'blocked',
      denial_code: 'GAP-VIDA-RUN-EXECUTION-001',
      denial_message: 'The requested run was blocked by runtime validation.',
      denial_reason_gap: 'GAP-VIDA-RUN-EXECUTION-001',
      input_bytes_base64: '',
      report_bytes_base64: '',
      predecessor_refs: [
        { result_id: 'result-one', digest: 'a'.repeat(64) },
        { result_id: 'result-two', digest: 'b'.repeat(64) },
      ],
    },
  } satisfies NonNullable<Parameters<typeof inspectHistoricalOwnerWork>[0]['capture']>;
  const terminalInput: Omit<Parameters<typeof inspectHistoricalOwnerWork>[0], 'store'> = {
    identity: terminal.request.identity,
    journal: {
      state: original.journal.state,
      version: original.journal.version,
      resume_status: 'issued_outcome_uncertain',
    },
    expectedWork: requiredStateVersion(original.owner.version, 'terminal Work version'),
    expectedLedger: requiredStateVersion(original.workspace.ledger_version, 'terminal Coordination version'),
    expectedMaintenanceGeneration: original.maintenanceGeneration,
    nativeSessionHandle: 'fixture-thread',
    userRequestPointer: terminal.request.userRequestPointer,
    requestIntent: terminal.request.requestIntent,
    config: original.config,
    predicate: 'terminal_synthesis_unaccepted',
    capture,
    documentationContext: {
      repository_root: terminal.f.root,
      repository_id: terminal.request.identity.repository_id,
      project_id: requiredElement(terminal.request.identity.project_ids, 0, 'terminal project id'),
      work_id: terminal.request.identity.work_id,
    },
  };
  const terminalBefore = databaseState(terminal.f),
    terminalEngine = readFileSync(path.join(terminal.f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  withDatabase(terminal.f, (db) =>
    expect(() =>
      inspectHistoricalOwnerWork({ store: new HostStateStore(db, terminal.f.workspace), ...terminalInput }),
    ).not.toThrow(),
  );
  expect(databaseState(terminal.f)).toEqual(terminalBefore);
  expect(readFileSync(path.join(terminal.f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(terminalEngine);

  const wrongStage: MastraSessionLedgerState = {
    ...terminalInput.journal.state,
    items: terminalInput.journal.state.items.map((item, index) =>
      index === 0 ? { ...item, request: { ...item.request, stage_id: 'develop_change' } } : item,
    ),
  };
  const wrongStageInput = {
    ...terminalInput,
    journal: {
      ...terminalInput.journal,
      state: wrongStage,
      version: { ...terminalInput.journal.version, digest: canonicalJsonDigest(wrongStage) },
    },
  };
  withDatabase(terminal.f, (db) =>
    expect(() =>
      inspectHistoricalOwnerWork({ store: new HostStateStore(db, terminal.f.workspace), ...wrongStageInput }),
    ).toThrow(/historical synthesis candidate is not one known-terminal/),
  );
  expect(databaseState(terminal.f)).toEqual(terminalBefore);

  const unknown = historicalFixture('unknown_readonly', { officialDocs: true }),
    unknownOriginal = inspectHistoricalOwnerContext(
      unknown.f.root,
      'baseline.yaml',
      unknown.request.identity,
      unknown.request.attempt,
    ),
    unknownTarget = firstJournalItem(unknownOriginal.journal.state),
    unknownWorkflow = requiredWorkflow(unknownOriginal.config, unknownTarget.request.workflow_id),
    unknownStage = unknownWorkflow.stages.find((entry) => entry.id === unknownTarget.request.stage_id);
  if (!unknownStage) throw Error('Unknown readonly fixture stage is missing');
  const unknownAssignment = requiredElement(
    unknownStage.assignments,
    unknownTarget.request.assignment_index,
    'unknown readonly fixture assignment',
  );
  const unknownProfile = requiredProfile(unknownOriginal.config, unknownAssignment.profile);
  const unknownEgressPolicy = unknownOriginal.config.agents.egress_policies[unknownProfile.egress_policy];
  if (!unknownEgressPolicy) throw Error('Unknown readonly fixture egress policy is missing');
  expect(unknownEgressPolicy.allowed_hosts.length).toBeGreaterThan(0);
  const unknownBefore = databaseState(unknown.f),
    unknownEngine = readFileSync(path.join(unknown.f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  withDatabase(unknown.f, (db) =>
    expect(() =>
      inspectHistoricalOwnerWork({
        store: new HostStateStore(db, unknown.f.workspace),
        identity: unknown.request.identity,
        journal: {
          state: unknownOriginal.journal.state,
          version: unknownOriginal.journal.version,
          resume_status: 'issued_outcome_uncertain',
        },
        expectedWork: requiredStateVersion(unknownOriginal.owner.version, 'unknown Work version'),
        expectedLedger: requiredStateVersion(unknownOriginal.workspace.ledger_version, 'unknown Coordination version'),
        expectedMaintenanceGeneration: unknownOriginal.maintenanceGeneration,
        nativeSessionHandle: 'fixture-thread',
        userRequestPointer: unknown.request.userRequestPointer,
        requestIntent: unknown.request.requestIntent,
        config: unknownOriginal.config,
        predicate: 'unknown_readonly',
        documentationContext: {
          repository_root: unknown.f.root,
          repository_id: unknown.request.identity.repository_id,
          project_id: requiredElement(unknown.request.identity.project_ids, 0, 'unknown readonly project id'),
          work_id: unknown.request.identity.work_id,
        },
      }),
    ).toThrow(/native action or host assignment is still active or uncertain/),
  );
  expect(databaseState(unknown.f)).toEqual(unknownBefore);
  expect(readFileSync(path.join(unknown.f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(unknownEngine);
}, 60_000);

test.each(['missing receipt', 'tampered receipt', 'denial provenance', 'invalid UTF-8 body', 'predecessor references'])(
  'known terminal synthesis config rebind denies %s without effects',
  async (change) => {
    const { f, request, state } = historicalFixture('terminal_synthesis_unaccepted'),
      completedResearch = state.completed.flatMap((wave) => wave.items),
      pendingSynthesisIndex = completedResearch.length;
    expect(completedResearch).toHaveLength(2);
    seedHistoricalResearchLineage(f, request, state, {
      includeCompleted: true,
      pendingIndex: pendingSynthesisIndex,
      activationOnlyIndex: pendingSynthesisIndex,
    });
    seedKnownTerminalSynthesisCustody(f, request, state, ({ db, capture: _capture, before, journal, candidate }) => {
      const receipt = new HostStateStore(db, f.workspace).readHistoricalTerminalSynthesisCapture(
        request.identity,
        request.attempt,
        candidate.request.action_id,
      );
      if (!receipt) throw Error('Fixture terminal synthesis receipt is missing');
      if (change === 'missing receipt') {
        db.query(
          'DELETE FROM agent_host_historical_terminal_synthesis_capture WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
        ).run(f.workspace, request.identity.work_id, request.attempt, candidate.request.action_id);
      } else {
        let altered: HistoricalTerminalSynthesisCaptureReceipt = receipt;
        if (change === 'tampered receipt')
          altered = { ...receipt, body_base64: Buffer.from('tampered').toString('base64') };
        else if (change === 'denial provenance') {
          const provenance = { ...receipt.provenance, denial_message: 'foreign denial' },
            changedRequest = { ...receipt.request, provenance };
          altered = {
            ...receipt,
            provenance,
            request: changedRequest,
            request_digest: canonicalJsonDigest(changedRequest),
          };
        } else if (change === 'predecessor references') {
          const provenance = {
              ...receipt.provenance,
              predecessor_refs: receipt.provenance.predecessor_refs.map((entry, index) =>
                index === 0 ? { ...entry, digest: 'f'.repeat(64) } : entry,
              ),
            },
            changedRequest = { ...receipt.request, provenance };
          altered = {
            ...receipt,
            provenance,
            request: changedRequest,
            request_digest: canonicalJsonDigest(changedRequest),
          };
        } else {
          const body = Buffer.from([0xff]),
            bodyBase64 = body.toString('base64'),
            changedRequest = { ...receipt.request, body_base64: bodyBase64 };
          altered = {
            ...receipt,
            body_base64: bodyBase64,
            body_byte_length: body.byteLength,
            body_sha256: sha(body),
            request: changedRequest,
            request_digest: canonicalJsonDigest(changedRequest),
          };
        }
        db.query(
          'UPDATE agent_host_historical_terminal_synthesis_capture SET payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND action_id=?',
        ).run(
          json(altered),
          canonicalJsonDigest(altered),
          f.workspace,
          request.identity.work_id,
          request.attempt,
          candidate.request.action_id,
        );
      }
      return { before, journal };
    });
    f.put('agent-runtime.config.v1.yaml', f.oldYaml);
    f.put('proposed.yaml', f.target);
    const beforeInspect = databaseState(f);
    await Promise.resolve(
      expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/pending\/unknown|custody|denial|UTF-8|digest/i),
    );
    expect(databaseState(f)).toEqual(beforeInspect);
  },
  30000,
);

test('known terminal reader denies unjournaled configuration drift before resolving capture-time authority', () => {
  const { f, request, state } = historicalFixture('terminal_synthesis_unaccepted'),
    completedResearch = state.completed.flatMap((wave) => wave.items),
    pendingSynthesisIndex = completedResearch.length;
  seedHistoricalResearchLineage(f, request, state, {
    includeCompleted: true,
    pendingIndex: pendingSynthesisIndex,
    activationOnlyIndex: pendingSynthesisIndex,
  });
  seedKnownTerminalSynthesisCustody(f, request, state);
  const before = databaseState(f),
    config = withoutProducedSchema(
      loadRuntimeConfig(f.root),
      'implementation_new',
      'synthesize_task',
      'ResearchSynthesis/v1',
    );
  withDatabase(f, (db) =>
    expect(() => currentState(db, f.workspace, f.root, config)).toThrow(
      'vida runtime-config rebind: issued native outcome is pending/unknown: vida runtime-config rebind: bound original configuration is unavailable',
    ),
  );
  expect(databaseState(f)).toEqual(before);
});

test('public settled research releases admitted lineage and preserves observations on exact retry', async () => {
  const { f, request, args, state } = historicalFixture('settled_research'),
    { work } = seedHistoricalResearchLineage(f, request, state);
  const before = databaseState(f),
    engine = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const inspected = await run(args('inspect'));
  expect(inspected.rights_granted).toBe(false);
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  const result = await run(args('apply'));
  expect(result.rights_granted).toBe(false);
  expect(result.runtime_acceptance).toBe(false);
  const after = databaseState(f),
    released = checkedFixtureWork(parseFixtureJson(requiredHostStatePayload(after, 'work')), f);
  expect(released.lease).toBeNull();
  expect(released.artifacts).toEqual(work.artifacts);
  expect(released.lifecycle.phase).toBe(work.lifecycle.phase);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engine);
  expect((await run(args('apply'))).work_version).toEqual(result.work_version);
}, 30000);

test('public historical normalization resumes the original record-first request and exact replay under Host CAS', async () => {
  const { f, request, state } = historicalFixture('settled_research'),
    { materials } = seedHistoricalResearchLineage(f, request, state),
    { item, plan } = requiredResearchNormalizationItem(state.items);
  const recordBefore = readFileSync(path.join(f.root, plan.record_path), 'utf8'),
    changelogBefore = readFileSync(path.join(f.root, plan.changelog_path), 'utf8'),
    priorEvents = changelogBefore
      .split('\n')
      .filter(Boolean)
      .filter(
        (line) =>
          checkedString(checkedResearchChangelogEvent(line).path_after, 'changelog event path') !== plan.record_path,
      ),
    partialChangelog = priorEvents.length ? priorEvents.join('\n') + '\n' : '';
  expect(changelogBefore.split('\n').filter(Boolean).length).toBeGreaterThan(priorEvents.length);
  f.put(plan.changelog_path, partialChangelog);
  f.put('.githooks/pre-commit', 'Current source changed after the original reservation.\n');
  const resumeRequest = {
      schema: 'HistoricalNormalizationResumeRequest/v1',
      identity: request.identity,
      attempt: 1,
      action_id: item.request.action_id,
    },
    requestPath = '.tmp/historical-normalization-resume.json';
  f.put(requestPath, json(resumeRequest));
  const resumeArgs = (mode: string) => [
    '--resume-historical-normalization',
    'true',
    '--mode',
    mode,
    '--project-root',
    f.root,
    '--native-session-handle',
    'fixture-thread',
    '--baseline-config',
    'baseline.yaml',
    '--request',
    requestPath,
  ];
  const beforeInspect = databaseState(f),
    inspected = await run(resumeArgs('inspect'));
  const originalOperationReference = requiredResearchOperationReference(
    requiredElement(materials, 0, 'research fixture material').scopeBytes,
  );
  expect(inspected.status).toBe('historical_normalization_resume_inspected');
  expect(inspected.record_missing).toBe(false);
  expect(inspected.caller_identity_authenticated).toBe(false);
  expect(inspected.caller_authorization_required).toBe(true);
  expect(
    checkedString(
      requiredCliObject(
        requiredCliObject(inspected, 'request', 'resume inspection request'),
        'inspection',
        'resume inspection',
      ).original_operation_reference,
      'inspected original operation reference',
    ),
  ).toBe(originalOperationReference);
  expect(inspected.rights_granted).toBe(false);
  expect(inspected.runtime_acceptance).toBe(false);
  expect(databaseState(f)).toEqual(beforeInspect);
  f.put(requestPath, json(inspected.request));
  const frozenRequest = readFileSync(path.join(f.root, requestPath), 'utf8'),
    applied = await run(resumeArgs('apply'));
  expect(applied.status).toBe('historical_normalization_resumed');
  expect(applied.replay).toBe(false);
  expect(applied.caller_identity_authenticated).toBe(false);
  expect(applied.caller_authorization_required).toBe(true);
  expect(checkedString(applied.original_operation_reference, 'applied original operation reference')).toBe(
    originalOperationReference,
  );
  expect(applied.rights_granted).toBe(false);
  expect(applied.runtime_acceptance).toBe(false);
  expect(readFileSync(path.join(f.root, plan.record_path), 'utf8')).toBe(recordBefore);
  expect(readFileSync(path.join(f.root, plan.changelog_path), 'utf8')).toBe(changelogBefore);
  expect(databaseState(f)).toEqual(beforeInspect);
  f.put(requestPath, frozenRequest);
  const replayed = await run(resumeArgs('resume'));
  expect(replayed.status).toBe('historical_normalization_resumed');
  expect(replayed.replay).toBe(true);
  expect(databaseState(f)).toEqual(beforeInspect);

  const maintenanceBinding = {
      schema: 'MaintenanceFenceBinding/v1',
      project_ids: request.identity.project_ids,
      operation_id: 'historical-resume-fixture',
      manifest_digest: 'a'.repeat(64),
      request_digest: 'b'.repeat(64),
      bindings_digest: 'c'.repeat(64),
      closure_digest: 'd'.repeat(64),
      bundle_digest: 'e'.repeat(64),
    },
    maintenanceFence = {
      schema: 'MaintenanceFence/v1',
      workspace_id: f.workspace,
      revision: 1,
      generation: 1,
      status: 'released',
      binding: maintenanceBinding,
      token_digest: 'f'.repeat(64),
    };
  withDatabase(f, (db) =>
    db
      .query('INSERT INTO agent_host_maintenance VALUES(?,?,?,?)')
      .run(f.workspace, 1, json(maintenanceFence), canonicalJsonDigest(maintenanceFence)),
  );
  const afterMaintenance = databaseState(f);
  await Promise.resolve(expect(run(resumeArgs('resume'))).rejects.toThrow(/maintenance|original|reserved/));
  expect(databaseState(f)).toEqual(afterMaintenance);
}, 30000);

test('public historical normalization rejects foreign requests and stale Host CAS before file effects', async () => {
  const { f, request, state } = historicalFixture('settled_research');
  seedHistoricalResearchLineage(f, request, state);
  const { item, plan } = requiredResearchNormalizationItem(state.items),
    recordPath = path.join(f.root, plan.record_path),
    changelogPath = path.join(f.root, plan.changelog_path),
    changelog = readFileSync(changelogPath, 'utf8'),
    priorEvents = changelog
      .split('\n')
      .filter(Boolean)
      .filter(
        (line) =>
          checkedString(checkedResearchChangelogEvent(line).path_after, 'changelog event path') !== plan.record_path,
      );
  f.put(plan.changelog_path, priorEvents.length ? priorEvents.join('\n') + '\n' : '');
  const requestPath = '.tmp/historical-normalization-stale.json',
    requestBody = {
      schema: 'HistoricalNormalizationResumeRequest/v1',
      identity: request.identity,
      attempt: 1,
      action_id: item.request.action_id,
    };
  f.put(requestPath, json(requestBody));
  const resumeArgs = (mode: string) => [
    '--resume-historical-normalization',
    'true',
    '--mode',
    mode,
    '--project-root',
    f.root,
    '--native-session-handle',
    'fixture-thread',
    '--baseline-config',
    'baseline.yaml',
    '--request',
    requestPath,
  ];
  const inspected = await run(resumeArgs('inspect'));
  f.put(requestPath, json(inspected.request));
  const beforeForeign = {
    database: databaseState(f),
    record: readFileSync(recordPath, 'utf8'),
    changelog: readFileSync(changelogPath, 'utf8'),
  };
  f.put(requestPath, json({ ...inspected.request, action_id: 'foreign-action' }));
  await Promise.resolve(expect(run(resumeArgs('apply'))).rejects.toThrow(/original|inspection|action/i));
  expect(readFileSync(recordPath, 'utf8')).toBe(beforeForeign.record);
  expect(readFileSync(changelogPath, 'utf8')).toBe(beforeForeign.changelog);
  expect(databaseState(f)).toEqual(beforeForeign.database);

  f.put(requestPath, json(inspected.request));
  const staleDatabase = databaseState(f);
  withDatabase(f, (db) => {
    const store = new HostStateStore(db, f.workspace),
      before = store.readHostStateSnapshot(request.identity);
    store.compareAndSwapHostState(advanceFixtureHostSnapshot(before));
  });
  const changedHost = databaseState(f),
    beforeStale = { record: readFileSync(recordPath, 'utf8'), changelog: readFileSync(changelogPath, 'utf8') };
  await Promise.resolve(expect(run(resumeArgs('apply'))).rejects.toThrow(/changed|CAS|state|maintenance/i));
  expect(readFileSync(recordPath, 'utf8')).toBe(beforeStale.record);
  expect(readFileSync(changelogPath, 'utf8')).toBe(beforeStale.changelog);
  expect(databaseState(f)).toEqual(changedHost);
  expect(changedHost).not.toEqual(staleDatabase);
}, 30000);

test('public readonly bookkeeping releases a completed observation without normalization', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping'),
    unnormalizedIndex = 1,
    { work } = seedHistoricalResearchLineage(f, request, state, { unnormalizedIndex }),
    unnormalized = requiredElement(state.items, unnormalizedIndex, 'unnormalized journal item');
  expect(requiredJournalObservation(unnormalized).status).toBe('reported_complete');
  expect(unnormalized.research_activation).toBeTruthy();
  expect(unnormalized.research_normalization).toBeUndefined();
  expect(work.artifacts.some((artifact) => artifact.artifact_id === 'research-' + unnormalizedIndex)).toBe(false);
  const before = databaseState(f),
    engine = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const inspected = await run(args('inspect'));
  expect(inspected.rights_granted).toBe(false);
  expect(inspected.runtime_acceptance).toBe(false);
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  const result = await run(args('apply'));
  expect(result.rights_granted).toBe(false);
  expect(result.runtime_acceptance).toBe(false);
  const after = databaseState(f),
    released = checkedFixtureWork(parseFixtureJson(requiredHostStatePayload(after, 'work')), f);
  expect(released.lease).toBeNull();
  expect(released.artifacts).toEqual(work.artifacts);
  expect(released.lifecycle.phase).toBe(work.lifecycle.phase);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engine);
  expect((await run(args('apply'))).work_version).toEqual(result.work_version);
}, 30000);

test('public readonly bookkeeping keeps committed normalized lineage without adding missing Work admission', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping'),
    { work } = seedHistoricalResearchLineage(f, request, state),
    normalized = firstJournalItem(state),
    plan = normalized.research_normalization;
  if (!plan) throw Error('Readonly normalization fixture has no retained plan');
  expect(existsSync(path.join(f.root, plan.record_path))).toBe(true);
  const workWithoutNormalizedArtifact: WorkState = {
    ...work,
    artifacts: work.artifacts.filter((artifact) => artifact.path !== plan.record_path),
  };
  expect(workWithoutNormalizedArtifact.artifacts.some((artifact) => artifact.path === plan.record_path)).toBe(false);
  withDatabase(f, (db) =>
    db
      .query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='work'")
      .run(json(workWithoutNormalizedArtifact), canonicalJsonDigest(workWithoutNormalizedArtifact)),
  );
  const before = databaseState(f),
    engine = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const inspected = await run(args('inspect'));
  expect(inspected.rights_granted).toBe(false);
  expect(inspected.runtime_acceptance).toBe(false);
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  const result = await run(args('apply'));
  expect(result.rights_granted).toBe(false);
  expect(result.runtime_acceptance).toBe(false);
  const after = databaseState(f),
    released = checkedFixtureWork(parseFixtureJson(requiredHostStatePayload(after, 'work')), f);
  expect(released.lease).toBeNull();
  expect(released.artifacts).toEqual(workWithoutNormalizedArtifact.artifacts);
  expect(released.artifacts.some((artifact) => artifact.path === plan.record_path)).toBe(false);
  expect(released.lifecycle.next_action).toMatch(/canonical artifact GAPs/);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engine);
  expect((await run(args('apply'))).work_version).toEqual(result.work_version);
}, 30000);

test('public readonly bookkeeping preserves a pending no-egress code-researcher issue as UNKNOWN', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping'),
    pendingIndex = 1,
    { work } = seedHistoricalResearchLineage(f, request, state, { pendingIndex }),
    pending = requiredElement(state.items, pendingIndex, 'pending journal item'),
    config = loadRuntimeConfig(f.root),
    workflow = requiredWorkflow(config, pending.request.workflow_id),
    stage = workflow.stages.find((entry) => entry.id === pending.request.stage_id);
  if (!stage) throw Error('Pending fixture stage is missing from current config');
  const assignment = requiredElement(stage.assignments, pending.request.assignment_index, 'pending fixture assignment'),
    profile = requiredRuntimeAgentProfile(config, assignment.profile),
    egressPolicy = config.agents.egress_policies[profile.egress_policy];
  if (!egressPolicy) throw Error('Pending fixture egress policy is missing from current config');
  expect(pending.request.role).toBe('code-researcher');
  expect(egressPolicy.allowed_hosts).toHaveLength(0);
  expect(pending.issue_id).toBeTruthy();
  expect(pending.observation).toBeNull();
  expect(pending.research_activation).toBeTruthy();
  expect(pending.research_normalization).toBeUndefined();
  const before = databaseState(f),
    engine = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const inspected = await run(args('inspect'));
  expect(inspected.rights_granted).toBe(false);
  expect(inspected.runtime_acceptance).toBe(false);
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  const result = await run(args('apply'));
  expect(result.rights_granted).toBe(false);
  expect(result.runtime_acceptance).toBe(false);
  const after = databaseState(f),
    released = checkedFixtureWork(parseFixtureJson(requiredHostStatePayload(after, 'work')), f);
  expect(released.lease).toBeNull();
  expect(released.artifacts).toEqual(work.artifacts);
  expect(released.execution.assignment_attempts).toEqual(work.execution.assignment_attempts);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engine);
  expect((await run(args('apply'))).work_version).toEqual(result.work_version);
}, 30000);

test('released readonly bookkeeping UNKNOWN remains frozen through config rebind', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping'),
    pendingIndex = 1,
    { work } = seedHistoricalResearchLineage(f, request, state, { pendingIndex }),
    pending = requiredElement(state.items, pendingIndex, 'pending journal item'),
    engineBefore = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const releaseInspection = await run(args('inspect'));
  f.put('release.json', json(releaseInspection.request));
  const release = await run(args('apply'));
  expect(release.rights_granted).toBe(false);
  expect(release.runtime_acceptance).toBe(false);
  const releasedState = databaseState(f),
    releasedWork = checkedFixtureWork(parseFixtureJson(requiredHostStatePayload(releasedState, 'work')), f),
    retainedJournal = parseSessionJournalPayload(
      checkedString(
        requiredElement(releasedState.agent_host_mastra_session_ledger, 0, 'released session ledger').payload,
        'ledger payload',
      ),
    );
  expect(releasedWork.lease).toBeNull();
  expect(releasedWork.artifacts).toEqual(work.artifacts);
  expect(releasedWork.artifacts.some((artifact) => artifact.artifact_id === 'research-' + pendingIndex)).toBe(false);
  const retainedPending = requiredElement(retainedJournal.items, pendingIndex, 'retained pending journal item');
  expect(retainedPending.issue_id).toBe(pending.issue_id);
  expect(retainedPending.observation).toBeNull();
  expect(retainedPending.research_activation).toEqual(pending.research_activation);
  expect(retainedPending.research_normalization).toBeUndefined();
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engineBefore);

  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  const inspected = await runReconcileArtifacts(f.args('inspect'));
  expect(inspected.status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f).agent_host_mastra_session_ledger).toEqual(releasedState.agent_host_mastra_session_ledger);
  const planned = await runReconcileArtifacts(f.args('plan'));
  expect(planned.status).toBe('planned');
  expect(databaseState(f).agent_host_mastra_session_ledger).toEqual(releasedState.agent_host_mastra_session_ledger);
  expect((await runReconcileArtifacts(f.args('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', f.target);
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  const after = databaseState(f),
    afterJournal = parseSessionJournalPayload(
      checkedString(
        requiredElement(after.agent_host_mastra_session_ledger, 0, 'after session ledger').payload,
        'ledger payload',
      ),
    );
  expect(after.agent_host_state).toEqual(releasedState.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(releasedState.agent_host_mastra_session_ledger);
  const afterPending = requiredElement(afterJournal.items, pendingIndex, 'after pending journal item');
  expect(afterPending.observation).toBeNull();
  expect(afterPending.research_activation).toEqual(pending.research_activation);
  expect(afterPending.research_normalization).toBeUndefined();
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engineBefore);
}, 30000);

test('released UNKNOWN uses its bound historical config through a second repair without replay', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping');
  seedHistoricalResearchLineage(f, request, state, { pendingIndex: 1 });
  const inspected = await run(args('inspect'));
  f.put('release.json', json(inspected.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  await runReconcileArtifacts(f.args('plan'));
  await runReconcileArtifacts(f.args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.target);
  await runReconcileArtifacts(f.args('resume'));
  const before = databaseState(f);
  const target = withAgentProfileChange(parseRuntimeConfigYaml(f.target), 'executor', { reasoning: 'high' });
  f.put('proposed.yaml', json(target));
  const nextArgs = (mode: string) => {
    const values = f.args(mode);
    values[values.indexOf('--repair-id') + 1] = 'fixture-rebind-next';
    return values;
  };
  const priorPath = '.agent/work/fixture-rebind/runtime-config-rebind-operation.v1.json';
  const priorBytes = readFileSync(path.join(f.root, priorPath));
  const unclosed = checkedRecord(
    parseFixtureJson(new TextDecoder('utf-8', { fatal: true }).decode(priorBytes)),
    'prior rebind operation',
  );
  unclosed.phase = 'planned';
  unclosed.maintenance_released = false;
  f.put(priorPath, json(unclosed));
  await Promise.resolve(
    expect(runReconcileArtifacts(nextArgs('inspect'))).rejects.toThrow(/original configuration is unavailable/),
  );
  expect(databaseState(f)).toEqual(before);
  f.put(priorPath, priorBytes);
  const tampered = checkedRecord(
      parseFixtureJson(new TextDecoder('utf-8', { fatal: true }).decode(priorBytes)),
      'prior rebind operation',
    ),
    tamperedPlan = requiredCliObject(tampered, 'plan', 'prior rebind plan');
  const wrongConfig = withAgentProfileChange(
    parseRuntimeConfigYaml(requiredCliString(tamperedPlan, 'baseline_yaml', 'prior baseline YAML')),
    'executor',
    { reasoning: 'max' },
  );
  tamperedPlan.baseline_yaml = json(wrongConfig);
  tampered.plan = tamperedPlan;
  tampered.plan_digest = canonicalJsonDigest(tamperedPlan);
  f.put(priorPath, json(tampered));
  await Promise.resolve(
    expect(runReconcileArtifacts(nextArgs('inspect'))).rejects.toThrow(/historical config bytes differ/),
  );
  expect(databaseState(f)).toEqual(before);
  f.put(priorPath, priorBytes);
  expect((await runReconcileArtifacts(nextArgs('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect((await runReconcileArtifacts(nextArgs('plan'))).status).toBe('planned');
  expect((await runReconcileArtifacts(nextArgs('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', json(target));
  expect((await runReconcileArtifacts(nextArgs('resume'))).status).toBe('applied');
  const after = databaseState(f);
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(
    requiredElement(
      parseSessionJournalPayload(
        checkedString(
          requiredElement(after.agent_host_mastra_session_ledger, 0, 'after session ledger').payload,
          'ledger payload',
        ),
      ).items,
      1,
      'second session item',
    ).observation,
  ).toBeNull();
}, 60_000);

test('readonly bookkeeping config rebind rejects a changed retained release operation', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping');
  seedHistoricalResearchLineage(f, request, state, { pendingIndex: 1 });
  const inspection = await run(args('inspect'));
  f.put('release.json', json(inspection.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  withDatabase(f, (db) => {
    const row = querySqliteRow<HostStateRowIdPayload>(
        db,
        "SELECT rowid,payload FROM agent_host_state WHERE kind='ledger'",
        'fixture ledger',
      ),
      ledger = checkedMutableFixtureLedger(parseFixtureJson(row.payload)),
      release = ledger.operations.find((operation) => operation.work_id === request.identity.work_id);
    if (!release) throw Error('Fixture release operation is missing');
    release.decision_pointer = 'fixture:foreign-release';
    db.query('UPDATE agent_host_state SET payload=?,digest=? WHERE rowid=?').run(
      json(ledger),
      canonicalJsonDigest(ledger),
      row.rowid,
    );
  });
  const before = databaseState(f);
  await Promise.resolve(expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/pending\/unknown/));
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('readonly bookkeeping config rebind rejects retained release source revision drift', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping');
  seedHistoricalResearchLineage(f, request, state, { pendingIndex: 1 });
  const inspection = await run(args('inspect'));
  f.put('release.json', json(inspection.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  withDatabase(f, (db) => {
    const row = querySqliteRow<HostStateRowIdPayload>(
        db,
        "SELECT rowid,payload FROM agent_host_state WHERE kind='ledger'",
        'fixture ledger',
      ),
      ledger = checkedMutableFixtureLedger(parseFixtureJson(row.payload)),
      release = ledger.operations.find((operation) => operation.work_id === request.identity.work_id);
    if (!release) throw Error('Fixture release operation is missing');
    release.source_revision = 'fixture:foreign-source-revision';
    const payload = json(ledger);
    db.query('UPDATE agent_host_state SET payload=?,digest=? WHERE rowid=?').run(
      payload,
      canonicalJsonDigest(ledger),
      row.rowid,
    );
    expect(canonicalJsonDigest(parseFixtureJson(payload))).toBe(canonicalJsonDigest(ledger));
  });
  const before = databaseState(f);
  await Promise.resolve(expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(/pending\/unknown/));
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('readonly bookkeeping config rebind rejects a coherent distinct released ticket', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping');
  seedHistoricalResearchLineage(f, request, state, { pendingIndex: 1 });
  const inspection = await run(args('inspect'));
  f.put('release.json', json(inspection.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  withDatabase(f, (db) => {
    const row = querySqliteRow<HostStateRowIdPayload>(
        db,
        "SELECT rowid,payload FROM agent_host_state WHERE kind='ledger'",
        'fixture ledger',
      ),
      ledger = checkedMutableFixtureLedger(parseFixtureJson(row.payload)),
      activation = requiredElement(state.items, 1, 'second research item').research_activation;
    if (!activation) throw Error('Fixture activation is missing');
    const activationBinding = activation.plan.binding,
      ticket = ledger.tickets.find((entry) => entry.ticket_id === activationBinding.lease_ticket_id),
      release = ledger.operations.find(
        (entry) => entry.kind === 'release' && entry.work_id === request.identity.work_id,
      ),
      distinctTicketId = randomUUID(),
      distinctClaimId = randomUUID();
    if (!ticket) throw Error('Fixture released ticket is missing');
    const claim = ledger.claims.find((entry) => entry.ticket_id === ticket.ticket_id);
    if (!claim || !release) throw Error('Fixture release custody is incomplete');
    const distinctTicket = { ...structuredClone(ticket), ticket_id: distinctTicketId, claim_ids: [distinctClaimId] },
      distinctClaim = { ...structuredClone(claim), claim_id: distinctClaimId, ticket_id: distinctTicketId };
    distinctTicket.sequence = ledger.next_sequence;
    ledger.next_sequence += 1;
    expect(ticket.status).toBe('released');
    expect(claim.status).toBe('released');
    expect(distinctTicketId).not.toBe(activationBinding.lease_ticket_id);
    ledger.tickets.push(distinctTicket);
    ledger.claims.push(distinctClaim);
    release.ticket_id = distinctTicketId;
    expect(validateCoordinationLedgerV1(ledger).ok).toBe(true);
    const payload = json(ledger),
      digest = canonicalJsonDigest(ledger);
    db.query('UPDATE agent_host_state SET payload=?,digest=? WHERE rowid=?').run(payload, digest, row.rowid);
    expect(
      querySqliteRow<{ digest: string }>(
        db,
        'SELECT digest FROM agent_host_state WHERE rowid=?',
        'fixture ledger digest',
        row.rowid,
      ).digest,
    ).toBe(digest);
  });
  const config = loadRuntimeConfig(f.root),
    before = databaseState(f);
  withDatabase(f, (db) => expect(() => currentState(db, f.workspace, f.root, config)).toThrow(/pending\/unknown/));
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('readonly bookkeeping config rebind selects the current release with coherent older release history', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping'),
    priorJournal = structuredClone(state);
  const priorJournalDigest = withDatabase(
    f,
    (db) =>
      querySqliteRow<{ digest: string }>(
        db,
        'SELECT digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        'fixture session ledger digest',
        f.workspace,
        request.identity.work_id,
        request.attempt,
      ).digest,
  );
  expect(priorJournalDigest).toBe(canonicalJsonDigest(priorJournal));
  seedHistoricalResearchLineage(f, request, state, { pendingIndex: 1 });
  withDatabase(f, (db) => {
    const ledgerRow = querySqliteRow<HostStateRowIdPayload & { revision: number }>(
        db,
        "SELECT rowid,revision,payload FROM agent_host_state WHERE kind='ledger'",
        'fixture ledger',
      ),
      ledger = checkedMutableFixtureLedger(parseFixtureJson(ledgerRow.payload)),
      activation = requiredElement(state.items, 1, 'second research item').research_activation;
    if (!activation) throw Error('Fixture activation is missing');
    const activationBinding = activation.plan.binding,
      ticket = ledger.tickets.find((entry) => entry.ticket_id === activationBinding.lease_ticket_id);
    if (!ticket) throw Error('Fixture active ticket is missing');
    const claim = ledger.claims.find((entry) => entry.ticket_id === ticket.ticket_id);
    if (!claim) throw Error('Fixture active claim is missing');
    const oldTicketId = randomUUID(),
      oldClaimId = randomUUID(),
      oldPointer = 'fixture:older-release',
      oldCreatedAt = new Date(Date.parse(ticket.created_at) - 1000).toISOString(),
      oldTicket: MutableFixture<CoordinationLedger>['tickets'][number] = {
        ...structuredClone(ticket),
        ticket_id: oldTicketId,
        sequence: ticket.sequence,
        claim_ids: [oldClaimId],
        status: 'released',
        expires_at: null,
        active_resources: [],
        blocked_resources: [],
        created_at: oldCreatedAt,
      },
      oldClaim: MutableFixture<CoordinationLedger>['claims'][number] = {
        ...structuredClone(claim),
        claim_id: oldClaimId,
        ticket_id: oldTicketId,
        status: 'released',
        created_at: oldCreatedAt,
        renewed_at: oldCreatedAt,
      },
      oldRelease: MutableFixture<CoordinationLedger>['operations'][number] = {
        schema: 'CoordinationOperation/v1',
        kind: 'release',
        ticket_id: oldTicketId,
        work_id: request.identity.work_id,
        thread_id: ticket.thread_id,
        source_revision: ticket.source_revision,
        resources: [...ticket.exclusive_resources],
        operation_id:
          'readonly-bookkeeping-release-' +
          canonicalJsonDigest({
            work_id: request.identity.work_id,
            nativeSessionHandle: ticket.thread_id,
            userRequestPointer: oldPointer,
            requestIntent: 'next_work',
            journal: priorJournalDigest,
          }).slice(0, 40),
        from_ledger_revision: 1,
        to_ledger_revision: 2,
        decided_by: ticket.thread_id,
        decision_pointer: oldPointer,
        created_at: oldCreatedAt,
      };
    expect(ledgerRow.revision).toBe(1);
    expect(ledger.revision).toBe(1);
    expect(ticket.sequence).toBe(1);
    expect(ticket.status).toBe('active');
    expect(claim.status).toBe('active');
    ticket.sequence = 2;
    ledger.tickets.unshift(oldTicket);
    ledger.claims.unshift(oldClaim);
    ledger.next_sequence = 3;
    ledger.revision = 2;
    ledger.operations.push(oldRelease);
    const payload = json(ledger),
      digest = canonicalJsonDigest(ledger);
    db.query('UPDATE agent_host_state SET revision=?,payload=?,digest=? WHERE rowid=?').run(
      ledger.revision,
      payload,
      digest,
      ledgerRow.rowid,
    );
    const snapshot = new HostStateStore(db, f.workspace).readHostStateSnapshot(request.identity);
    if (!snapshot.ledgerVersion || !snapshot.ledger) throw Error('Reordered fixture ledger snapshot is incomplete');
    expect(snapshot.ledgerVersion.revision).toBe(2);
    expect(snapshot.ledger).toEqual(ledger);
    expect(snapshot.ledger.tickets.map((entry) => [entry.ticket_id, entry.sequence, entry.status])).toEqual([
      [oldTicketId, 1, 'released'],
      [activationBinding.lease_ticket_id, 2, 'active'],
    ]);
    expect(snapshot.ledger.operations).toEqual([oldRelease]);
  });
  const inspection = await run(args('inspect'));
  f.put('release.json', json(inspection.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  withDatabase(f, (db) => {
    const ledgerRow = querySqliteRow<HostStatePayloadRow>(
        db,
        "SELECT revision,payload FROM agent_host_state WHERE kind='ledger'",
        'fixture ledger',
      ),
      journalRow = querySqliteRow<SessionLedgerPayloadRow>(
        db,

        'SELECT payload,digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        'fixture session ledger',
        f.workspace,
        request.identity.work_id,
        request.attempt,
      ),
      ledger = checkedFixtureLedger(parseFixtureJson(ledgerRow.payload)),
      current = ledger.operations.find(
        (entry) =>
          entry.kind === 'release' && entry.work_id === request.identity.work_id && entry.to_ledger_revision === 3,
      );
    expect(ledgerRow.revision).toBe(3);
    expect(ledger.revision).toBe(3);
    if (!current) throw Error('Fixture current release operation is missing');
    expect(current.from_ledger_revision).toBe(2);
    expect(current.to_ledger_revision).toBe(3);
    expect(
      requiredElement(parseSessionJournalPayload(journalRow.payload).items, 1, 'second session item')
        .research_activation,
    ).toBeTruthy();
  });
  const config = loadRuntimeConfig(f.root),
    before = databaseState(f);
  const digest = withDatabase(f, (db) => currentState(db, f.workspace, f.root, config));
  expect(digest).toMatch(/^[a-f0-9]{64}$/);
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('readonly bookkeeping config rebind rejects two current release candidates', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping');
  seedHistoricalResearchLineage(f, request, state, { pendingIndex: 1 });
  const inspection = await run(args('inspect'));
  f.put('release.json', json(inspection.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  withDatabase(f, (db) => {
    const ledgerRow = querySqliteRow<HostStateRowIdPayload>(
        db,
        "SELECT rowid,payload FROM agent_host_state WHERE kind='ledger'",
        'fixture ledger',
      ),
      journalRow = db
        .query<{ digest: string }, [string, string, number]>(
          'SELECT digest FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        )
        .get(f.workspace, request.identity.work_id, request.attempt),
      journalDigest = requiredSqliteRow(journalRow, 'fixture session journal').digest,
      ledger = checkedMutableFixtureLedger(parseFixtureJson(ledgerRow.payload)),
      current = ledger.operations.find(
        (entry) => entry.kind === 'release' && entry.work_id === request.identity.work_id,
      ),
      secondPointer = 'fixture:second-current-release',
      release = current;
    if (!release) throw Error('Fixture release operation is missing');
    const second = {
      ...structuredClone(release),
      operation_id:
        'readonly-bookkeeping-release-' +
        canonicalJsonDigest({
          work_id: request.identity.work_id,
          nativeSessionHandle: release.thread_id,
          userRequestPointer: secondPointer,
          requestIntent: 'linked_correction',
          journal: journalDigest,
        }).slice(0, 40),
      decision_pointer: secondPointer,
    };
    ledger.operations.push(second);
    db.query('UPDATE agent_host_state SET payload=?,digest=? WHERE rowid=?').run(
      json(ledger),
      canonicalJsonDigest(ledger),
      ledgerRow.rowid,
    );
  });
  const config = loadRuntimeConfig(f.root),
    before = databaseState(f);
  withDatabase(f, (db) => expect(() => currentState(db, f.workspace, f.root, config)).toThrow(/pending\/unknown/));
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('generic readonly UNKNOWN rejects an unactivated pending item when Journal history has activation', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping'),
    pendingIndex = 1;
  seedHistoricalResearchLineage(f, request, state, { pendingIndex });
  const releaseInspection = await run(args('inspect'));
  f.put('release.json', json(releaseInspection.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  f.put('proposed.yaml', f.target);
  withDatabase(f, (db) => {
    const row = querySqliteRow<SessionLedgerPayloadRow & HostStateRowId>(
        db,
        'SELECT rowid,payload FROM agent_host_mastra_session_ledger WHERE workspace_id=? AND work_id=? AND attempt=?',
        'fixture session ledger',
        f.workspace,
        request.identity.work_id,
        request.attempt,
      ),
      journal = structuredClone(parseSessionJournalPayload(row.payload));
    expect(requiredElement(journal.items, 0, 'first journal item').research_activation).toBeTruthy();
    expect(requiredElement(journal.items, pendingIndex, 'pending journal item').research_activation).toBeTruthy();
    Reflect.deleteProperty(requiredElement(journal.items, pendingIndex, 'pending journal item'), 'research_activation');
    Reflect.deleteProperty(
      requiredElement(journal.items, pendingIndex, 'pending journal item'),
      'research_normalization',
    );
    const payload = json(journal);
    db.query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=? WHERE rowid=?').run(
      payload,
      canonicalJsonDigest(journal),
      row.rowid,
    );
  });
  const config = loadRuntimeConfig(f.root),
    before = databaseState(f);
  withDatabase(f, (db) => expect(() => currentState(db, f.workspace, f.root, config)).toThrow(/pending\/unknown/));
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('readonly bookkeeping proof drift after config plan denies apply without changing Host state', async () => {
  const { f, request, args, state } = historicalFixture('readonly_bookkeeping'),
    pendingIndex = 1;
  seedHistoricalResearchLineage(f, request, state, { pendingIndex });
  const pending = requiredElement(state.items, pendingIndex, 'pending journal item'),
    inspection = await run(args('inspect'));
  f.put('release.json', json(inspection.request));
  await run(args('apply'));
  f.put('agent-runtime.config.v1.yaml', f.oldYaml);
  const planned = await runReconcileArtifacts(f.args('plan'));
  expect(planned.status).toBe('planned');
  const activation = pending.research_activation;
  if (!activation) throw Error('Fixture pending item has no activation');
  const activationPath = activation.plan.history_path,
    activationBytes = readFileSync(path.join(f.root, activationPath), 'utf8');
  f.put(activationPath, activationBytes + '{}\n');
  const beforeDeniedApply = databaseState(f);
  await Promise.resolve(
    expect(runReconcileArtifacts(f.args('apply'))).rejects.toThrow(/pending\/unknown|activation|history/i),
  );
  expect(databaseState(f)).toEqual(beforeDeniedApply);
  expect(readFileSync(path.join(f.root, activationPath), 'utf8')).toBe(activationBytes + '{}\n');
}, 30000);

test('public readonly bookkeeping denies pending official-docs egress without changing state', async () => {
  const { f, args, request, state } = historicalFixture('readonly_bookkeeping'),
    pendingIndex = 0;
  seedHistoricalResearchLineage(f, request, state, { pendingIndex });
  const pending = requiredElement(state.items, pendingIndex, 'pending journal item'),
    config = loadRuntimeConfig(f.root),
    workflow = requiredRuntimeWorkflow(config, pending.request.workflow_id);
  const stage = workflow.stages.find((entry) => entry.id === pending.request.stage_id);
  if (!stage) throw Error('Fixture stage is missing');
  const assignment = requiredElement(stage.assignments, pending.request.assignment_index, 'fixture assignment');
  const profile = requiredRuntimeAgentProfile(config, assignment.profile),
    egress = config.agents.egress_policies[profile.egress_policy];
  if (!egress) throw Error('Fixture egress policy is missing');
  expect(pending.request.role).toBe('documentation-researcher');
  expect(egress.allowed_hosts.length).toBeGreaterThan(0);
  const before = databaseState(f);
  await Promise.resolve(expect(run(args('inspect'))).rejects.toThrow(/egress/));
  expect(databaseState(f)).toEqual(before);
});

test.each(['altered', 'missing'])(
  'public readonly bookkeeping denies %s committed activation history without changing state',
  async (change) => {
    const { f, args, request, state } = historicalFixture('readonly_bookkeeping');
    seedHistoricalResearchLineage(f, request, state);
    const activation = firstJournalItem(state).research_activation;
    if (!activation) throw Error('Fixture journal item has no committed activation');
    const historyPath = activation.plan.history_path,
      fullPath = path.join(f.root, historyPath);
    if (change === 'altered') f.put(historyPath, readFileSync(fullPath, 'utf8') + '{}\n');
    else rmSync(fullPath, { force: true });
    const before = databaseState(f);
    await Promise.resolve(expect(run(args('inspect'))).rejects.toThrow(/activation|history/i));
    expect(databaseState(f)).toEqual(before);
  },
  30000,
);

test.each(['tampered', 'missing'])(
  'public readonly bookkeeping denies a %s physical record with normalization without changing state',
  async (change) => {
    const { f, args, request, state } = historicalFixture('readonly_bookkeeping');
    seedHistoricalResearchLineage(f, request, state);
    const normalization = firstJournalItem(state).research_normalization;
    if (!normalization) throw Error('Fixture journal item has no normalization record');
    const recordPath = normalization.record_path,
      fullPath = path.join(f.root, recordPath);
    if (change === 'tampered') f.put(recordPath, '{}\n');
    else rmSync(fullPath, { force: true });
    const before = databaseState(f);
    await Promise.resolve(expect(run(args('inspect'))).rejects.toThrow(/record|research|digest/i));
    expect(databaseState(f)).toEqual(before);
  },
  30000,
);

test('public readonly bookkeeping denies an existing mismatched artifact at a normalized record path', async () => {
  const { f, args, request, state } = historicalFixture('readonly_bookkeeping'),
    { work } = seedHistoricalResearchLineage(f, request, state),
    plan = firstJournalItem(state).research_normalization;
  if (!plan) throw Error('Fixture journal item has no normalization record');
  let foundNormalizedArtifact = false;
  const mismatchedWork: WorkState = {
    ...work,
    artifacts: work.artifacts.map((entry) => {
      if (entry.path !== plan.record_path) return entry;
      foundNormalizedArtifact = true;
      return { ...entry, sha256: '0'.repeat(64) };
    }),
  };
  if (!foundNormalizedArtifact) throw Error('Fixture normalized artifact is missing');
  withDatabase(f, (db) =>
    db
      .query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='work'")
      .run(json(mismatchedWork), canonicalJsonDigest(mismatchedWork)),
  );
  const before = databaseState(f);
  await Promise.resolve(expect(run(args('inspect'))).rejects.toThrow(/artifact|lineage/i));
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('public readonly bookkeeping releases an exact expired owner once without renewing or granting rights', async () => {
  const { f, args, request, state } = historicalFixture('readonly_bookkeeping'),
    { work } = seedHistoricalResearchLineage(f, request, state),
    expiry = '2026-10-01T00:00:00.000Z';
  const original = withDatabase(f, (db) => {
    const row = querySqliteRow<HostStateRowIdPayload>(
        db,
        "SELECT rowid,payload FROM agent_host_state WHERE kind='ledger'",
        'fixture ledger',
      ),
      ledger = checkedMutableFixtureLedger(parseFixtureJson(row.payload)),
      ticket = ledger.tickets.find((entry) => entry.ticket_id === requiredWorkLease(work).ticket_id),
      claim = ledger.claims.find((entry) => entry.ticket_id === requiredWorkLease(work).ticket_id);
    if (!ticket || !claim) throw Error('Fixture coordination ticket or claim is missing');
    expect(ticket.status).toBe('active');
    expect(claim.status).toBe('active');
    ticket.expires_at = expiry;
    claim.lease_expires_at = expiry;
    db.query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='ledger'").run(
      json(ledger),
      canonicalJsonDigest(ledger),
    );
    return { ticket: structuredClone(ticket), claim: structuredClone(claim) };
  });
  expect(original.ticket.expires_at).toBe(original.claim.lease_expires_at);
  const before = databaseState(f),
    engine = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  const inspected = await run(args('inspect'));
  expect(inspected.rights_granted).toBe(false);
  expect(inspected.runtime_acceptance).toBe(false);
  expect(databaseState(f)).toEqual(before);
  f.put('release.json', json(inspected.request));
  const result = await run(args('apply'));
  expect(result.status).toBe('historical_owner_released');
  expect(result.rights_granted).toBe(false);
  expect(result.runtime_acceptance).toBe(false);
  const after = databaseState(f),
    releasedWork = checkedFixtureWork(parseFixtureJson(requiredHostStatePayload(after, 'work')), f),
    releasedLedger = checkedFixtureLedger(parseFixtureJson(requiredHostStatePayload(after, 'ledger'))),
    releasedTicket = releasedLedger.tickets.find((entry) => entry.ticket_id === original.ticket.ticket_id),
    releasedClaim = releasedLedger.claims.find((entry) => entry.ticket_id === original.claim.ticket_id);
  if (!releasedTicket || !releasedClaim) throw Error('Released fixture coordination ticket or claim is missing');
  expect(releasedWork.lease).toBeNull();
  expect(releasedWork.lifecycle.phase).toBe(work.lifecycle.phase);
  expect(releasedWork.execution.assignment_attempts).toEqual(work.execution.assignment_attempts);
  expect(releasedWork.artifacts).toEqual(work.artifacts);
  expect(releasedTicket.status).toBe('released');
  expect(releasedTicket.sequence).toBe(original.ticket.sequence);
  expect(releasedTicket.generation).toBe(original.ticket.generation);
  expect(releasedTicket.exclusive_resources).toEqual(original.ticket.exclusive_resources);
  expect(releasedTicket.active_resources).toEqual([]);
  expect(releasedTicket.blocked_resources).toEqual([]);
  expect(releasedTicket.expires_at).toBeNull();
  expect(releasedClaim.status).toBe('released');
  expect(releasedClaim.generation).toBe(original.claim.generation);
  expect(releasedClaim.resources).toEqual(original.claim.resources);
  expect(releasedClaim.lease_expires_at).toBe(expiry);
  expect(
    releasedLedger.operations.filter((operation) => operation.ticket_id === original.ticket.ticket_id),
  ).toHaveLength(1);
  const releasedOperation = releasedLedger.operations.find(
    (operation) => operation.ticket_id === original.ticket.ticket_id,
  );
  if (!releasedOperation) throw Error('Released fixture coordination operation is missing');
  expect(releasedOperation.resources).toEqual(original.ticket.exclusive_resources);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'))).toEqual(engine);
  expect((await run(args('apply'))).work_version).toEqual(result.work_version);
  const retried = checkedFixtureLedger(parseFixtureJson(requiredHostStatePayload(databaseState(f), 'ledger')));
  expect(retried.operations.filter((operation) => operation.ticket_id === original.ticket.ticket_id)).toHaveLength(1);
}, 30000);

test('public readonly bookkeeping denies an earlier overlapping queued ticket without changing state', async () => {
  const { f, args, request, state } = historicalFixture('readonly_bookkeeping'),
    { work } = seedHistoricalResearchLineage(f, request, state);
  const queued = withDatabase(f, (db) => {
    const row = querySqliteRow<HostStateRowIdPayload>(
        db,
        "SELECT rowid,payload FROM agent_host_state WHERE kind='ledger'",
        'fixture ledger',
      ),
      ledger = checkedMutableFixtureLedger(parseFixtureJson(row.payload)),
      ownerTicket = ledger.tickets.find((entry) => entry.ticket_id === requiredWorkLease(work).ticket_id);
    if (!ownerTicket) throw Error('Fixture owner ticket is missing');
    const earlier: MutableFixture<CoordinationLedger>['tickets'][number] = {
      ...structuredClone(ownerTicket),
      ticket_id: 'earlier-fifo-ticket',
      work_id: 'earlier-fifo-work',
      thread_id: 'earlier-fifo-thread',
      sequence: ownerTicket.sequence,
      status: 'queued',
      claim_ids: [],
      active_resources: [],
      blocked_resources: [...ownerTicket.exclusive_resources],
      expires_at: null,
    };
    ownerTicket.sequence++;
    ledger.tickets.unshift(earlier);
    ledger.next_sequence = Math.max(ledger.next_sequence, ownerTicket.sequence + 1);
    db.query("UPDATE agent_host_state SET payload=?,digest=? WHERE kind='ledger'").run(
      json(ledger),
      canonicalJsonDigest(ledger),
    );
    return { owner: structuredClone(ownerTicket), ticket: structuredClone(earlier) };
  });
  expect(queued.ticket.status).toBe('queued');
  expect(queued.ticket.sequence).toBeLessThan(queued.owner.sequence);
  expect(queued.ticket.blocked_resources.some((resource) => queued.owner.exclusive_resources.includes(resource))).toBe(
    true,
  );
  const before = databaseState(f);
  await Promise.resolve(expect(run(args('inspect'))).rejects.toThrow(/FIFO|resource activation/i));
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('public readonly bookkeeping rejects a foreign owner and stale inspection CAS', async () => {
  const { f, args, request, state } = historicalFixture('readonly_bookkeeping');
  seedHistoricalResearchLineage(f, request, state);
  const before = databaseState(f),
    foreignOwner = args('inspect');
  foreignOwner[7] = 'foreign-owner';
  await Promise.resolve(expect(run(foreignOwner)).rejects.toThrow(/original owner differs/));
  expect(databaseState(f)).toEqual(before);
  const inspected = await run(args('inspect')),
    inspectedRequest = requiredCliObject(inspected, 'request', 'inspection request'),
    inspection = requiredCliObject(inspectedRequest, 'inspection', 'release inspection'),
    expectedMaintenanceGeneration = checkedSqliteInteger(
      inspection.expectedMaintenanceGeneration,
      'expected maintenance generation',
    );
  f.put(
    'release.json',
    json({
      ...inspectedRequest,
      inspection: {
        ...inspection,
        expectedMaintenanceGeneration: expectedMaintenanceGeneration + 1,
      },
    }),
  );
  await Promise.resolve(expect(run(args('apply'))).rejects.toThrow(/CAS changed/));
  expect(databaseState(f)).toEqual(before);
}, 30000);

test.each(['completed_readonly', 'unknown_readonly', 'unissued_prepared'])(
  'settled research owner denies %s without admitted normalized research',
  async (predicate) => {
    const { f, request, args } = historicalFixture(predicate),
      before = databaseState(f);
    f.put(
      'release.json',
      json({ ...request, schema: 'SettledResearchOwnerReleaseRequest/v1', predicate: 'settled_research' }),
    );
    const control = args('inspect');
    control[0] = '--release-settled-research-owner';
    await Promise.resolve(
      expect(run(control)).rejects.toThrow(
        predicate === 'unknown_readonly' ? /unfinished issued effects/ : /settled research/,
      ),
    );
    expect(databaseState(f)).toEqual(before);
  },
  30000,
);

test('public historical inspect rebuilds populated local source and repository skill context read-only', async () => {
  const { f, args, state, configuredContexts } = historicalFixture('completed_readonly', { configuredContext: true });
  expect(configuredContexts).toHaveLength(1);
  const configuredContext = firstConfiguredContext(configuredContexts);
  expect(configuredContext.entries.map((entry) => entry.kind)).toEqual(['local', 'local', 'skill']);
  expect(configuredContext.entries.find((entry) => entry.id === 'fixture-context')?.location).toBe(fixtureContextPath);
  expect(
    configuredContext.entries.every((entry) => typeof entry.content === 'string' && entry.content.trim().length > 0),
  ).toBe(true);
  const before = databaseState(f),
    enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
    engineBefore = readFileSync(enginePath),
    protectedPaths = [
      'agent-runtime.config.v1.yaml',
      'baseline.yaml',
      '.agent/runtime-initialization.v1.json',
      'AGENT.sidecar.md',
      fixtureContextPath,
      '.codex/skills/historical-review/SKILL.md',
      ...requiredSourceScope(state).entries.map((entry) => entry.path),
    ],
    fileSnapshots = new Map(
      [...new Set(protectedPaths)].map((relative) => [
        relative,
        existsSync(path.join(f.root, relative)) ? readFileSync(path.join(f.root, relative)) : null,
      ]),
    );
  const result = await run(args('inspect'));
  expect(result.status).toBe('historical_owner_release_inspected');
  expect(result.caller_identity_authenticated).toBe(false);
  expect(databaseState(f)).toEqual(before);
  expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
  for (const [relative, bytes] of fileSnapshots) {
    const currentPath = path.join(f.root, relative);
    expect(existsSync(currentPath)).toBe(bytes !== null);
    if (bytes !== null) expect(readFileSync(currentPath).equals(bytes)).toBe(true);
  }
});

test('public recovery-review prepare reserves only review for populated historical context', async () => {
  const { f, call, state, configuredContexts } = recoveryFixture({ configuredContext: true });
  expect(configuredContexts).toHaveLength(1);
  const configuredContext = firstConfiguredContext(configuredContexts);
  expect(configuredContext.entries.map((entry) => entry.kind)).toEqual(['local', 'local', 'skill']);
  expect(configuredContext.entries.find((entry) => entry.id === 'fixture-context')?.location).toBe(fixtureContextPath);
  expect(
    configuredContext.entries.every((entry) => typeof entry.content === 'string' && entry.content.trim().length > 0),
  ).toBe(true);
  const before = databaseState(f),
    enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
    engineBefore = readFileSync(enginePath),
    protectedPaths = [
      'agent-runtime.config.v1.yaml',
      'baseline.yaml',
      '.agent/runtime-initialization.v1.json',
      'AGENT.sidecar.md',
      fixtureContextPath,
      '.codex/skills/historical-review/SKILL.md',
      ...requiredSourceScope(state).entries.map((entry) => entry.path),
    ],
    fileSnapshots = new Map(
      [...new Set(protectedPaths)].map((relative) => [
        relative,
        existsSync(path.join(f.root, relative)) ? readFileSync(path.join(f.root, relative)) : null,
      ]),
    );
  const prepared = await call('prepare');
  expect(prepared.status).toBe('reserved');
  expect(prepared.operation.status).toBe('reserved');
  expect(prepared.native_dispatch_performed).toBe(false);
  expect(prepared.rights_granted).toBe(false);
  expect(prepared.runtime_acceptance).toBe(false);
  const after = databaseState(f),
    reviewRows = after.agent_host_governance.filter(
      (row) => row.store_id === 'vida-recovery-reviews' && row.kind === 'operation',
    );
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(after.agent_host_governance.filter((row) => row.store_id !== 'vida-recovery-reviews')).toEqual(
    before.agent_host_governance.filter((row) => row.store_id !== 'vida-recovery-reviews'),
  );
  expect(reviewRows).toHaveLength(1);
  const reviewRow = requiredElement(reviewRows, 0, 'reserved recovery review operation');
  expect(parseFixtureJson(checkedString(reviewRow.payload, 'reserved review operation payload'))).toMatchObject({
    schema: 'OperationReservation/v1',
    store_id: 'vida-recovery-reviews',
    status: 'reserved',
    operation_key: prepared.operation.operation_key,
  });
  expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
  for (const [relative, bytes] of fileSnapshots) {
    const currentPath = path.join(f.root, relative);
    expect(existsSync(currentPath)).toBe(bytes !== null);
    if (bytes !== null) expect(readFileSync(currentPath).equals(bytes)).toBe(true);
  }
});

test('public recovery review keeps original configured context in caller history and rechecks current Source', async () => {
  const { f, input, call, observation, state, configuredContexts } = recoveryFixture({ configuredContext: true }),
    originalContexts = fixtureOriginalContexts(state, configuredContexts);
  expect(originalContexts).toHaveLength(1);
  const originalBody = structuredClone(firstOriginalContext(originalContexts).context),
    originalLocalEntry = originalBody.entries.find((entry) => entry.kind === 'local');
  if (!originalLocalEntry || typeof originalLocalEntry.content !== 'string')
    throw Error('Original local context fixture has no retained text');
  const originalText = originalLocalEntry.content,
    localPath = path.join(f.root, fixtureContextPath),
    skillPath = path.join(f.root, '.codex/skills/historical-review/SKILL.md');
  f.put(fixtureContextPath, readFileSync(localPath, 'utf8') + '\nCurrent Source edit before review preparation.\n');
  f.put(
    '.codex/skills/historical-review/SKILL.md',
    readFileSync(skillPath, 'utf8') + '\nCurrent skill edit before review preparation.\n',
  );
  const currentSource = snapshotDeclaredSources(
      requireSafeRepositoryAccess(f.root),
      requiredSourceScope(state).entries.map((entry) => entry.path),
    ),
    before = databaseState(f),
    enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
    engineBefore = readFileSync(enginePath),
    prepared = await call('prepare', { ...input, originalContexts });
  expect(prepared.status).toBe('reserved');
  expect(prepared.native_dispatch_performed).toBe(false);
  expect(prepared.rights_granted).toBe(false);
  expect(prepared.runtime_acceptance).toBe(false);
  expect(prepared.request.source).toEqual(currentSource);
  expect(prepared.request).not.toHaveProperty('originalContexts');
  expect(JSON.stringify(prepared.request)).not.toContain(originalText);
  const resumed = { ...input, originalContexts, request: prepared.request };
  expect((await call('begin', resumed)).status).toBe('commit_unknown');
  const observed = observation(prepared.operation),
    completed = await call('complete', { ...resumed, observation: observed });
  expect(completed.status).toBe('applied');
  expect(completed.native_dispatch_performed).toBe(false);
  expect(completed.rights_granted).toBe(false);
  expect(completed.runtime_acceptance).toBe(false);
  expect((await call('complete', { ...resumed, observation: observed })).operation).toEqual(completed.operation);
  const after = databaseState(f),
    operations = after.agent_host_governance.filter(
      (row) => row.store_id === 'vida-recovery-reviews' && row.kind === 'operation',
    );
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(after.agent_host_governance.filter((row) => row.store_id !== 'vida-recovery-reviews')).toEqual(
    before.agent_host_governance.filter((row) => row.store_id !== 'vida-recovery-reviews'),
  );
  expect(operations).toHaveLength(1);
  expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
  expect(JSON.stringify(after)).not.toContain(originalText);
}, 30000);

test('public recovery review accepts a canonical markerless original excerpt and denies a substituted body', async () => {
  const { f, input, call, state, configuredContexts } = recoveryFixture({
      configuredContext: true,
      markerlessExcerpt: true,
    }),
    originalContexts = fixtureOriginalContexts(state, configuredContexts),
    entry = firstOriginalContext(originalContexts).context.entries.find(
      (candidate) => candidate.id === 'fixture-context',
    );
  if (entry === undefined) throw Error('Fixture context entry is missing');
  expect(entry.truncated).toBe(true);
  expect(entry.content).toHaveLength(8192);
  expect(entry.content).not.toContain('[middle omitted; read source for complete content]');
  f.put(fixtureContextPath, 'Current project context after the original request.\n');
  const before = databaseState(f),
    enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
    engineBefore = readFileSync(enginePath),
    substituted = structuredClone(originalContexts);
  const substitutedFirst = firstOriginalContext(substituted),
    substitutedEntry = substitutedFirst.context.entries.find((candidate) => candidate.id === 'fixture-context');
  if (substitutedEntry === undefined) throw Error('Substitution context entry is missing');
  substitutedEntry.content = 'Substituted excerpt';
  substitutedFirst.context = resignFixtureContext(substitutedFirst.context);
  await Promise.resolve(
    expect(call('prepare', { ...input, originalContexts: substituted })).rejects.toThrow(
      'historical original configured requests differ',
    ),
  );
  expect(databaseState(f)).toEqual(before);
  const prepared = await call('prepare', { ...input, originalContexts });
  expect(prepared.status).toBe('reserved');
  expect(prepared.rights_granted).toBe(false);
  expect(prepared.request).not.toHaveProperty('originalContexts');
  const after = databaseState(f);
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
  const changedRequest = {
    ...structuredClone(prepared.request),
    expectedWork: {
      ...prepared.request.expectedWork,
      revision: prepared.request.expectedWork.revision + 1,
    },
  };
  await Promise.resolve(
    expect(call('inspect', { ...input, originalContexts, request: changedRequest })).rejects.toThrow(
      /retained recovery request changed/,
    ),
  );
  expect(databaseState(f)).toEqual(after);
  expect((await call('inspect', { ...input, originalContexts, request: prepared.request })).status).toBe('reserved');
}, 30000);

test('public recovery review retains UNKNOWN when original-context custody is lost or current Source goes stale', async () => {
  const { f, input, call, observation, state, configuredContexts } = recoveryFixture({ configuredContext: true }),
    originalContexts = fixtureOriginalContexts(state, configuredContexts),
    localPath = path.join(f.root, fixtureContextPath);
  f.put(fixtureContextPath, readFileSync(localPath, 'utf8') + '\nCurrent Source edit before prepare.\n');
  const prepared = await call('prepare', { ...input, originalContexts }),
    resumed = { ...input, originalContexts, request: prepared.request };
  expect((await call('begin', resumed)).status).toBe('commit_unknown');
  const afterBegin = databaseState(f);
  await Promise.resolve(expect(call('inspect', { ...input, request: prepared.request })).rejects.toThrow());
  expect(databaseState(f)).toEqual(afterBegin);
  await Promise.resolve(expect(call('begin', resumed)).rejects.toThrow(/reissue forbidden/));
  expect(databaseState(f)).toEqual(afterBegin);
  f.put(fixtureContextPath, readFileSync(localPath, 'utf8') + '\nConcurrent Source edit after prepare.\n');
  const inspected = await call('inspect', resumed);
  expect(inspected.status).toBe('commit_unknown');
  expect(inspected.request).toEqual(prepared.request);
  expect(inspected.rights_granted).toBe(false);
  expect(inspected.runtime_acceptance).toBe(false);
  expect(databaseState(f)).toEqual(afterBegin);
  await Promise.resolve(
    expect(call('complete', { ...resumed, observation: observation(prepared.operation) })).rejects.toThrow(
      /retained recovery request changed|source scope changed/,
    ),
  );
  expect(databaseState(f)).toEqual(afterBegin);
}, 30000);

test('public recovery review rejects current Source drift before begin after body-backed preparation', async () => {
  const { f, input, call, state, configuredContexts } = recoveryFixture({ configuredContext: true }),
    originalContexts = fixtureOriginalContexts(state, configuredContexts),
    localPath = path.join(f.root, fixtureContextPath);
  f.put(fixtureContextPath, readFileSync(localPath, 'utf8') + '\nCurrent Source edit before prepare.\n');
  const prepared = await call('prepare', { ...input, originalContexts }),
    resumed = { ...input, originalContexts, request: prepared.request },
    afterPrepare = databaseState(f);
  f.put(fixtureContextPath, readFileSync(localPath, 'utf8') + '\nConcurrent Source edit after prepare.\n');
  await Promise.resolve(
    expect(call('begin', resumed)).rejects.toThrow(/retained recovery request changed|source scope changed/),
  );
  expect(databaseState(f)).toEqual(afterPrepare);
}, 30000);

test.each(originalContextTamperCases)(
  'public recovery review rejects original-context %s before reserving an operation',
  async (_name: string, mutate: (contexts: FixtureOriginalContext[]) => void, expectedReason: string | null) => {
    const { f, input, call, state, configuredContexts } = recoveryFixture({ configuredContext: true }),
      originalContexts = fixtureOriginalContexts(state, configuredContexts);
    mutate(originalContexts);
    const before = databaseState(f),
      enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
      engineBefore = readFileSync(enginePath);
    const denied = expect(call('prepare', { ...input, originalContexts })).rejects;
    if (expectedReason) await Promise.resolve(denied.toThrow(expectedReason));
    else await Promise.resolve(denied.toThrow());
    expect(databaseState(f)).toEqual(before);
    expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
  },
  30000,
);

test('public recovery review rejects aggregate original-context bytes before reserving an operation', async () => {
  const { f, input, call, state, configuredContexts } = recoveryFixture({
      configuredContext: true,
      aggregateContext: true,
    }),
    originalContexts = fixtureOriginalContexts(state, configuredContexts),
    first = firstOriginalContext(originalContexts),
    context = first.context;
  expect(context.entries).toHaveLength(5);
  for (const entry of context.entries) {
    expect(['local', 'skill']).toContain(entry.kind);
    entry.bytes = 65536;
    entry.truncated = true;
  }
  first.context = resignFixtureContext(context);
  const before = databaseState(f),
    enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
    engineBefore = readFileSync(enginePath);
  await Promise.resolve(
    expect(call('prepare', { ...input, originalContexts })).rejects.toThrow(
      'original configured context exceeds aggregate limit',
    ),
  );
  expect(databaseState(f)).toEqual(before);
  expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
});

test('public recovery review rejects original-context export over the caller-history byte limit', async () => {
  const { f, input, call, state, configuredContexts } = recoveryFixture({ configuredContext: true }),
    originalContexts = fixtureOriginalContexts(state, configuredContexts),
    oversized = { ...input, originalContexts, padding: 'x'.repeat(262145) },
    before = databaseState(f);
  await Promise.resolve(expect(call('prepare', oversized)).rejects.toThrow(/caller-history export exceeds bound/));
  expect(databaseState(f)).toEqual(before);
});

test('original context body cannot authorize current topology drift or rewrite the retained request', async () => {
  const { f, input, call, state, configuredContexts } = recoveryFixture({ configuredContext: true }),
    originalContexts = fixtureOriginalContexts(state, configuredContexts);
  f.put(
    'agent-runtime.config.v1.yaml',
    f.target.replace(
      /(^        context_source_ids:\r?\n          - project-context\r?\n)          - fixture-context\r?\n/m,
      '$1',
    ),
  );
  const before = databaseState(f);
  await Promise.resolve(
    expect(call('prepare', { ...input, originalContexts })).rejects.toThrow(
      'vida runtime-config rebind: only requested executor model/reasoning or the approved prewriter workflow template delta may change',
    ),
  );
  expect(databaseState(f)).toEqual(before);
});

test('configured context reader rejects a missing declared local source after historical request construction', () => {
  const { f, state, configuredContexts } = historicalFixture('completed_readonly', { configuredContext: true });
  const request = firstJournalItem(state).request,
    context = { work_id: state.work_id, attempt: state.attempt, scope_digest: request.scope_digest },
    current = loadRuntimeConfig(f.root),
    enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
    engineBefore = readFileSync(enginePath),
    contextPath = path.join(f.root, fixtureContextPath),
    originalContextBytes = readFileSync(contextPath),
    before = databaseState(f),
    receiptBefore = readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json')),
    protectedPaths = [
      'agent-runtime.config.v1.yaml',
      'baseline.yaml',
      'AGENT.sidecar.md',
      '.codex/skills/historical-review/SKILL.md',
      'release.json',
      ...requiredSourceScope(state)
        .entries.map((entry) => entry.path)
        .filter((relative) => relative !== fixtureContextPath),
    ],
    fileSnapshots = new Map(
      [...new Set(protectedPaths)].map((relative) => [
        relative,
        existsSync(path.join(f.root, relative)) ? readFileSync(path.join(f.root, relative)) : null,
      ]),
    );
  const configuredContext = configuredContexts[0];
  if (configuredContext === undefined) throw Error('Configured context fixture is missing');
  expect(configuredContext.entries.find((entry) => entry.id === 'fixture-context')?.sha256).toBe(
    sha(originalContextBytes),
  );
  expect(runtimeConfigDigest(current)).not.toBe(request.config_digest);
  rmSync(contextPath);
  let contextReadFailure;
  try {
    configuredContextForStage(f.root, current, request.workflow_id, request.stage_id, context);
  } catch (error) {
    contextReadFailure = error;
  }
  expectMissingFixtureContextRead(contextReadFailure, `configured context ${fixtureContextPath}`);
  expect(databaseState(f)).toEqual(before);
  expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
  expect(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json')).equals(receiptBefore)).toBe(true);
  expect(existsSync(contextPath)).toBe(false);
  for (const [relative, bytes] of fileSnapshots) {
    const currentPath = path.join(f.root, relative);
    expect(existsSync(currentPath)).toBe(bytes !== null);
    if (bytes !== null) expect(readFileSync(currentPath).equals(bytes)).toBe(true);
  }
});

test.each([
  ['owner inspect', 'local source', 'changed'],
  ['owner inspect', 'local source', 'missing'],
  ['owner inspect', 'repository skill', 'changed'],
  ['owner inspect', 'repository skill', 'missing'],
  ['review prepare', 'local source', 'changed'],
  ['review prepare', 'local source', 'missing'],
  ['review prepare', 'repository skill', 'changed'],
  ['review prepare', 'repository skill', 'missing'],
])(
  'historical configured context denies %s after %s is %s without changing authoritative state',
  async (route: string, kind: string, drift: string) => {
    const historical =
      route === 'owner inspect'
        ? historicalFixture('completed_readonly', { configuredContext: true })
        : recoveryFixture({ configuredContext: true });
    const { f, state } = historical,
      configuredContexts = historical.configuredContexts;
    if (!configuredContexts) throw Error('Configured context fixture data is missing');
    expect(configuredContexts).toHaveLength(1);
    const configuredContext = firstConfiguredContext(configuredContexts);
    expect(configuredContext.entries.map((entry) => entry.kind)).toEqual(['local', 'local', 'skill']);
    expect(
      configuredContext.entries.every((entry) => typeof entry.content === 'string' && entry.content.trim().length > 0),
    ).toBe(true);
    const relative = kind === 'local source' ? fixtureContextPath : '.codex/skills/historical-review/SKILL.md';
    const absolute = path.join(f.root, relative);
    if (drift === 'changed')
      f.put(relative, readFileSync(absolute, 'utf8') + '\nChanged after original request construction.\n');
    else rmSync(absolute);
    const before = databaseState(f),
      enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
      engineBefore = readFileSync(enginePath),
      protectedPaths = [
        'agent-runtime.config.v1.yaml',
        'baseline.yaml',
        '.agent/runtime-initialization.v1.json',
        'AGENT.sidecar.md',
        fixtureContextPath,
        '.codex/skills/historical-review/SKILL.md',
        ...requiredSourceScope(state).entries.map((entry) => entry.path),
      ],
      fileSnapshots = new Map(
        [...new Set(protectedPaths)].map((sourcePath) => [
          sourcePath,
          existsSync(path.join(f.root, sourcePath)) ? readFileSync(path.join(f.root, sourcePath)) : null,
        ]),
      );
    const invoke = () => invokeConfiguredContextFixture(historical);
    if (drift === 'missing' && kind === 'local source') {
      let missingReferenceFailure;
      try {
        await invoke();
      } catch (error) {
        missingReferenceFailure = error;
      }
      expectMissingFixtureContextRead(missingReferenceFailure, `required reference ${fixtureContextPath}`);
    } else {
      const expected =
        drift === 'changed'
          ? /historical original configured requests differ/
          : /configured context \.codex\/skills\/historical-review\/SKILL\.md/;
      await Promise.resolve(expect(invoke()).rejects.toThrow(expected));
    }
    expect(databaseState(f)).toEqual(before);
    expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
    for (const [sourcePath, bytes] of fileSnapshots) {
      const currentPath = path.join(f.root, sourcePath);
      expect(existsSync(currentPath)).toBe(bytes !== null);
      if (bytes !== null) expect(readFileSync(currentPath).equals(bytes)).toBe(true);
    }
  },
  30000,
);

test.each([
  ['owner inspect', 'context-source selection'],
  ['review prepare', 'context-source selection'],
  ['owner inspect', 'executor execution_mode'],
  ['review prepare', 'executor execution_mode'],
])(
  'public historical %s rejects %s drift beyond executor-only delta without effects',
  async (route, drift) => {
    const subject =
      route === 'owner inspect'
        ? historicalFixture('completed_readonly', { configuredContext: true })
        : recoveryFixture({ configuredContext: true });
    const { f, state } = subject;
    if ('input' in subject) f.put('.tmp/recovery-input.json', json(subject.input));
    const changedConfig =
      drift === 'context-source selection'
        ? f.target.replace(
            /(^        context_source_ids:\r?\n          - project-context\r?\n)          - fixture-context\r?\n/m,
            '$1',
          )
        : f.target.replace(
            /(^    executor:\r?\n      model: gpt-6-luna\r?\n      reasoning: max\r?\n      execution_mode: )standard/m,
            '$1fast',
          );
    expect(changedConfig).not.toBe(f.target);
    f.put('agent-runtime.config.v1.yaml', changedConfig);
    const current = loadRuntimeConfig(f.root);
    if (drift === 'context-source selection')
      expect(
        requiredRuntimeWorkflow(current, 'task_execution').stages.find((stage) => stage.id === 'synthesize_task')
          ?.context_source_ids,
      ).toEqual(['project-context']);
    else expect(requiredRuntimeAgentProfile(current, 'executor').execution_mode).toBe('fast');
    const intakePath = `.agent/work/${state.work_id}/intake.json`,
      enginePath = path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'),
      engineBefore = readFileSync(enginePath),
      before = databaseState(f),
      reviewReservations = (snapshot: FixtureDatabaseState) =>
        snapshot.agent_host_governance.filter(
          (row) => row.store_id === 'vida-recovery-reviews' && row.kind === 'operation',
        ),
      protectedPaths = [
        'agent-runtime.config.v1.yaml',
        'baseline.yaml',
        '.agent/runtime-initialization.v1.json',
        'AGENT.sidecar.md',
        fixtureContextPath,
        '.codex/skills/historical-review/SKILL.md',
        'release.json',
        intakePath,
        ...(route === 'review prepare' ? ['.tmp/recovery-input.json'] : []),
        ...requiredSourceScope(state).entries.map((entry) => entry.path),
      ],
      fileSnapshots = new Map(
        [...new Set(protectedPaths)].map((relative) => [
          relative,
          existsSync(path.join(f.root, relative)) ? readFileSync(path.join(f.root, relative)) : null,
        ]),
      );
    expect(reviewReservations(before)).toHaveLength(0);
    const invoke = () => invokeConfiguredContextFixture(subject);
    await Promise.resolve(
      expect(invoke()).rejects.toThrow(
        'vida runtime-config rebind: only requested executor model/reasoning or the approved prewriter workflow template delta may change',
      ),
    );
    const after = databaseState(f);
    expect(after).toEqual(before);
    expect(reviewReservations(after)).toHaveLength(0);
    expect(readFileSync(enginePath).equals(engineBefore)).toBe(true);
    for (const [relative, bytes] of fileSnapshots) {
      const currentPath = path.join(f.root, relative);
      expect(existsSync(currentPath)).toBe(bytes !== null);
      if (bytes !== null) expect(readFileSync(currentPath).equals(bytes)).toBe(true);
    }
  },
  30000,
);

test.each([
  'wrong owner',
  'wrong baseline',
  'changed rights',
  'missing engine',
  'extra action',
  'missing preimage',
  'envelope preimage',
  'foreign preimage',
  'source drift',
])(
  'historical settled writer denies %s without state or receipt effects',
  async (change) => {
    const { f, args, state } = historicalFixture('settled_writer_failed_validators');
    const values = args('inspect');
    if (change === 'wrong owner') values[values.indexOf('--native-session-handle') + 1] = 'foreign';
    if (change === 'wrong baseline') f.put('baseline.yaml', f.target);
    if (change === 'changed rights')
      f.put('agent-runtime.config.v1.yaml', f.target.replace('tools_policy: validator', 'tools_policy: developer'));
    if (change === 'missing engine')
      withDatabase(f, () => {
        const engine = new Database(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'), { strict: true });
        try {
          engine.exec('DELETE FROM mastra_workflow_snapshot');
        } finally {
          engine.close();
        }
      });
    if (change === 'extra action')
      withDatabase(f, (db) => {
        const row = readSessionLedgerSqlRow(db, 'SELECT * FROM agent_host_mastra_session_ledger'),
          persisted = parseFixtureJson(checkedString(row.payload, 'persisted session ledger payload')),
          changed: FixtureJournal = {
            ...state,
            items: [...state.items, structuredClone(firstJournalItem(state))],
          };
        expect(persisted).toEqual(state);
        db.query('UPDATE agent_host_mastra_session_ledger SET payload=?,digest=?').run(
          json(changed),
          canonicalJsonDigest(changed),
        );
      });
    if (change === 'missing preimage')
      renameSync(path.join(f.root, 'original-scope.json'), path.join(f.root, 'retained.json'));
    if (change === 'envelope preimage')
      f.put(
        'original-scope.json',
        json({ stdout: readFileSync(path.join(f.root, 'original-scope.json'), 'utf8'), exit_code: 0 }),
      );
    if (change === 'foreign preimage')
      f.put(
        'original-scope.json',
        json(snapshotDeclaredSources(requireSafeRepositoryAccess(f.root), ['AGENT.sidecar.md'])),
      );
    if (change === 'source drift') f.put('.githooks/pre-commit', 'Concurrent source drift');
    const before = databaseState(f),
      receipt = readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json'));
    await Promise.resolve(expect(run(values)).rejects.toThrow());
    expect(databaseState(f)).toEqual(before);
    expect(readFileSync(path.join(f.root, '.agent/runtime-initialization.v1.json')).equals(receipt)).toBe(true);
  },
  30000,
);

test.each(['journal', 'preimage', 'maintenance'])(
  'historical apply denies changed %s after inspect without releasing ownership',
  async (change) => {
    const { f, args, state } = historicalFixture('settled_writer_failed_validators');
    const inspected = await run(args('inspect'));
    f.put('release.json', json(inspected.request));
    if (change === 'preimage')
      f.put('original-scope.json', readFileSync(path.join(f.root, 'original-scope.json'), 'utf8') + '\n');
    else if (change === 'journal')
      withDatabase(f, (db) => {
        const row = readSessionLedgerSqlRow(db, 'SELECT * FROM agent_host_mastra_session_ledger'),
          persisted = parseFixtureJson(checkedString(row.payload, 'persisted session ledger payload')),
          first = firstJournalItem(state),
          observation = first.observation;
        expect(persisted).toEqual(state);
        if (!observation) throw Error('Fixture journal action has no observation to mutate');
        const changed: FixtureJournal = {
          ...state,
          items: state.items.map((item) =>
            item.request.action_id === first.request.action_id
              ? {
                  ...item,
                  observation: {
                    ...observation,
                    evidence_refs: [...observation.evidence_refs, 'fixture:later-evidence'],
                  },
                }
              : item,
          ),
        };
        db.query('UPDATE agent_host_mastra_session_ledger SET revision=revision+1,payload=?,digest=?').run(
          json(changed),
          canonicalJsonDigest(changed),
        );
      });
    else {
      // Host fixture state cannot acquire maintenance while the historical owner is active.
      const changed = structuredClone(requiredCliObject(inspected, 'request', 'historical owner request'));
      const inspection = requiredCliObject(changed, 'inspection', 'historical owner inspection'),
        generation = checkedSqliteInteger(
          inspection.expectedMaintenanceGeneration,
          'historical expected maintenance generation',
        );
      inspection.expectedMaintenanceGeneration = generation + 1;
      changed.inspection = inspection;
      f.put('release.json', json(changed));
    }
    const before = databaseState(f);
    await Promise.resolve(expect(run(args('apply'))).rejects.toThrow(/changed/));
    expect(databaseState(f)).toEqual(before);
  },
  30000,
);

test('historical inert preparation remains blocked and mixed execution flags cannot dispatch', async () => {
  const f = fixture({ sourceMode: true });
  f.put('baseline.yaml', f.oldYaml);
  const { identity } = seedState(f, { lease: true });
  f.put('agent-runtime.config.v1.yaml', f.target);
  f.put(
    'release.json',
    json({
      schema: 'HistoricalOwnerReleaseRequest/v1',
      identity,
      attempt: 1,
      userRequestPointer: 'fixture:inert',
      requestIntent: 'next_work',
      predicate: 'completed_readonly',
    }),
  );
  const args = [
    '--release-historical-owner',
    'true',
    '--mode',
    'inspect',
    '--project-root',
    f.root,
    '--native-session-handle',
    'fixture-thread',
    '--baseline-config',
    'baseline.yaml',
    '--request',
    'release.json',
  ];
  const before = databaseState(f);
  await Promise.resolve(expect(run(args)).rejects.toThrow(/inert release is unsupported/));
  for (const flag of [
    '--issue-wave',
    '--report',
    '--capture-stopped-source',
    '--retire-interrupted-source-owner',
    '--release-completed-readonly',
  ])
    await Promise.resolve(expect(run([...args, flag, 'true'])).rejects.toThrow());
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('three original readonly unknowns remain unchanged across config rebind with a different quiescent current run', async () => {
  const f = fixture();
  seedReadonlyUnknown(f);
  const before = databaseState(f),
    nativeBefore = readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite'));
  expect((await runReconcileArtifacts(f.args('inspect'))).status).toBe('inspect_ready_unauthorized');
  expect(databaseState(f)).toEqual(before);
  await runReconcileArtifacts(f.args('plan'));
  expect((await runReconcileArtifacts(f.args('apply'))).status).toBe('author_config_required');
  f.put('agent-runtime.config.v1.yaml', f.target);
  expect((await runReconcileArtifacts(f.args('resume'))).status).toBe('applied');
  const after = databaseState(f);
  expect(after.agent_host_state).toEqual(before.agent_host_state);
  expect(after.agent_host_mastra_session_ledger).toEqual(before.agent_host_mastra_session_ledger);
  expect(readFileSync(path.join(f.root, '.agent/work/mastra-workflows.v1.sqlite')).equals(nativeBefore)).toBe(true);
}, 30000);

test('readonly unknown denies a genuine owner project integration binding mismatch without changing rows', async () => {
  const f = fixture();
  seedReadonlyUnknown(f);
  withDatabase(f, (db) => {
    const row = querySqliteRow<HostStateRowIdPayload>(
        db,
        "SELECT rowid,payload FROM agent_host_state WHERE kind='work'",
        'fixture work',
      ),
      work = checkedFixtureWork(parseFixtureJson(row.payload), f),
      changedWork: WorkState = {
        ...work,
        binding: {
          ...work.binding,
          integrations_digest: canonicalJsonDigest({ fixture: 'foreign project integrations' }),
        },
      };
    db.query('UPDATE agent_host_state SET payload=?,digest=? WHERE rowid=?').run(
      json(changedWork),
      canonicalJsonDigest(changedWork),
      row.rowid,
    );
  });
  const before = databaseState(f);
  await Promise.resolve(
    expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(
      'readonly owner project integration binding differs',
    ),
  );
  expect(databaseState(f)).toEqual(before);
}, 30000);

for (const [name, mutation] of readonlySnapshotMutations) {
  test(`readonly unknown denies ${name} and preserves all rows`, async () => {
    const f = fixture();
    seedReadonlyUnknown(f, mutation);
    const before = databaseState(f);
    await Promise.resolve(
      expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow('issued native outcome is pending/unknown'),
    );
    expect(databaseState(f)).toEqual(before);
  }, 30000);
}

for (const [name, mutation, validateFixture, hostReservation, expectedError] of readonlyJournalMutations) {
  test(`readonly unknown denies ${name} without changing records`, async () => {
    const f = fixture();
    seedReadonlyUnknown(f, mutation, { validateFixture, hostReservation });
    const before = databaseState(f);
    await Promise.resolve(expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow(expectedError));
    expect(databaseState(f)).toEqual(before);
  }, 5000);
}

test('readonly unknown denies original configured source writer despite lease-null owner', async () => {
  const f = fixture();
  seedReadonlyUnknown(f, null, { writer: true });
  const before = databaseState(f);
  await Promise.resolve(
    expect(runReconcileArtifacts(f.args('inspect'))).rejects.toThrow('capability is not cooperative readonly'),
  );
  expect(databaseState(f)).toEqual(before);
}, 30000);

test('readonly risk-filter ambiguity denies any possible writer profile and accepts only unanimous readonly candidates', () => {
  const f = fixture();
  const loaded = loadRuntimeConfig(f.root);
  const readonly = Object.entries(loaded.agents.profiles).find(
    ([, profile]) => profile.mutation_scope === 'none' && profile.tools_policy === 'read_only',
  )?.[0];
  const writer = Object.entries(loaded.agents.profiles).find(
    ([, profile]) => profile.mutation_scope === 'repository_source',
  )?.[0];
  if (readonly === undefined || writer === undefined) throw Error('Fixture needs both readonly and writer profiles');
  const selection: WorkItemSelection = {
    team: 'default-development',
    kind: 'task',
    intent: 'implementation_change',
    project: 'agent',
    risk_flags: [],
    labels: [],
  };
  const workflowId = 'implementation_change';
  const plan = compileDevelopmentWorkflow(loaded, selection.team, workflowId, selection.risk_flags);
  const targetStage = loaded.workflows[workflowId]?.stages.find((stage) => stage.assignments.length >= 2);
  if (targetStage === undefined) throw Error('Fixture workflow needs a stage with two assignments');
  const waveIndex = plan.waves.findIndex((wave) => wave.some((stage) => stage.id === targetStage.id));
  if (waveIndex < 0) throw Error('Fixture stage is absent from its compiled workflow');
  const context: SessionHandoffContext = {
    work_id: 'readonly-risk-fixture',
    attempt: 1,
    scope_digest: 'a'.repeat(64),
  };
  const actions = sessionActionsForWave(loaded, selection, context, workflowId, waveIndex, []).filter(
    (action) => action.stage_id === targetStage.id,
  );
  const firstAction = actions.find((action) => action.assignment_index === 0);
  const secondAction = actions.find((action) => action.assignment_index === 1);
  if (firstAction === undefined || secondAction === undefined)
    throw Error('Fixture stage assignments are absent from its action projection');
  const requestFor = (action: SessionAgentAction): SessionBridgeRequest =>
    buildSessionBridgeRequest({
      runId: sessionBridgeRunId(f.workspace, context, workflowId),
      workflowId,
      configDigest: runtimeConfigDigest(loaded),
      context,
      waveIndex,
      action,
      configuredContext: null,
      priorResults: [],
    });
  const firstRequest = requestFor(firstAction);
  const firstAssignments: RuntimeWorkflowAssignments = [
    { role: firstRequest.role, profile: readonly, risk_flags: ['read-risk'] },
    { role: firstRequest.role, profile: writer, risk_flags: ['write-risk'] },
  ];
  const firstConfig = withWorkflowStageAssignments(loaded, workflowId, targetStage.id, firstAssignments);
  expect(cooperativeReadonlyAssignments(firstConfig, firstRequest)).toBe(false);
  const firstSecondAssignment = firstAssignments[1];
  if (firstSecondAssignment === undefined) throw Error('Fixture lost its second assignment');
  const firstReadOnlyAssignments: RuntimeWorkflowAssignments = [
    requiredElement(firstAssignments, 0, 'first assignment'),
    { ...firstSecondAssignment, profile: readonly },
  ];
  expect(
    cooperativeReadonlyAssignments(
      withWorkflowStageAssignments(loaded, workflowId, targetStage.id, firstReadOnlyAssignments),
      firstRequest,
    ),
  ).toBe(true);

  const secondRequest = requestFor(secondAction);
  const secondAssignments: RuntimeWorkflowAssignments = [
    { role: 'preceding', profile: readonly },
    { role: secondRequest.role, profile: writer },
  ];
  const secondConfig = withWorkflowStageAssignments(loaded, workflowId, targetStage.id, secondAssignments);
  expect(cooperativeReadonlyAssignments(secondConfig, secondRequest)).toBe(false);
  const secondAssignment = secondAssignments[1];
  if (secondAssignment === undefined) throw Error('Fixture lost its second assignment');
  const secondReadOnlyAssignments: RuntimeWorkflowAssignments = [
    requiredElement(secondAssignments, 0, 'preceding assignment'),
    { ...secondAssignment, profile: readonly },
  ];
  expect(
    cooperativeReadonlyAssignments(
      withWorkflowStageAssignments(loaded, workflowId, targetStage.id, secondReadOnlyAssignments),
      secondRequest,
    ),
  ).toBe(true);
});
