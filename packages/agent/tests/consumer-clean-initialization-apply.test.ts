import { expect, spyOn, test } from 'bun:test';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { canonicalJsonImageWithNodeLimit, MAX_CANONICAL_NODES } from '../src/contracts/canonical-json-core.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { captureConsumerCleanInitializationV2 } from '../bin/consumer-clean-initialization-capture.ts';
import { cleanInitializationResult } from '../bin/clean-init.ts';
import {
  sealCleanInitializationOperationV2,
  type ConsumerCleanInitializationOperationV2,
} from '../bin/consumer-clean-initialization-v2.ts';
import { assertCleanInitializationHostAdmission } from '../src/config/clean-initialization-admission.ts';
import {
  acquireStorageReadAdmission,
  closeWorkspaceDatabaseWithAdmission,
  openExistingWorkspaceDatabaseWithCleanInitializationIntent,
} from '../src/config/storage-read-admission.ts';
import { sessionHandoffDatabaseRelativePath } from '../src/config/project-paths.ts';
import * as safeRepositoryAccess from '../src/config/safe-repository-access.ts';
import {
  HostStateStore,
  initializeHostDatabaseSchema,
  openHostStateDatabase,
  type MaintenanceFenceBinding,
} from '../src/host-state.ts';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { makeFreshRepository } from './helpers/project-upgrade-fixture.ts';

const pendingPath = '.agent/consumer-clean-initialization.pending.v1.json';
const HISTORY_ROOT = '.agent/clean-initialization-history';
const WINDOWS_CLEAN_INIT_CASE_TIMEOUT_MS = 45_000;
const CLEAN_INIT_CASE_TIMEOUT_MS = process.platform === 'win32' ? WINDOWS_CLEAN_INIT_CASE_TIMEOUT_MS : 5_000;

function assertCleanInitCaseWithinBudget(startedAt: number, label: string): void {
  const elapsedMs = performance.now() - startedAt;
  if (elapsedMs > CLEAN_INIT_CASE_TIMEOUT_MS)
    throw new Error(`${label} exceeded ${CLEAN_INIT_CASE_TIMEOUT_MS}ms (${elapsedMs.toFixed(1)}ms)`);
}

function retainCleanInitFixture(root: string): void {
  console.error('Retained clean-init native proof fixture: ' + root);
}

async function loadOperationOwner() {
  try {
    return await import('../bin/consumer-clean-initialization-operation.ts');
  } catch {
    return null;
  }
}

async function makeFixture(prefix = 'clean-init-operation-', onRoot?: (root: string) => void) {
  const startedAt = performance.now();
  const reportPhase = (phase: string) => {
    if (process.env.VIDA_CLEAN_INIT_PHASE_TIMING === '1')
      console.error(
        'C3 clean-init fixture phase',
        JSON.stringify({ phase, elapsed_ms: Number((performance.now() - startedAt).toFixed(2)) }),
      );
  };
  const root = await makeFreshRepository(prefix, {
    includeLocalInstructions: false,
    onRoot: (createdRoot) => {
      console.error('Retained C3 clean-init fixture root at creation: ' + createdRoot);
      onRoot?.(createdRoot);
    },
  });
  reportPhase('repository-template-ready');
  const packageRoot = 'packages/agent';
  for (const directory of [
    `${packageRoot}/src`,
    `${packageRoot}/docs/agent-instructions`,
    `${packageRoot}/docs/requirements`,
    `${packageRoot}/tests`,
    `${packageRoot}/.planning/agent-flow/wiki-output`,
    `${packageRoot}/backlogs`,
  ])
    mkdirSync(path.join(root, directory), { recursive: true });
  copyFileSync(path.join(root, 'AGENT.sidecar.md'), path.join(root, packageRoot, 'AGENT.sidecar.md'));
  copyFileSync(
    path.join(root, 'docs/agent-instructions/documentation-policy.v1.json'),
    path.join(root, packageRoot, 'docs/agent-instructions/documentation-policy.v1.json'),
  );
  reportPhase('project-tree-ready');
  const configPath = path.join(root, 'agent-runtime.config.v1.yaml');
  const config = parse(readFileSync(configPath, 'utf8')) as {
    repository: { code_selectors: string[] };
    paths: { defaults: Record<string, string> };
    projects: Array<Record<string, unknown> & { code_selectors: string[] }>;
  };
  config.repository.code_selectors = [`${packageRoot}/src/**`];
  Object.assign(config.paths.defaults, {
    project_root: packageRoot,
    code_root: `${packageRoot}/src`,
    documentation_root: `${packageRoot}/docs`,
    wiki_root: `${packageRoot}/docs`,
    wiki_path: `${packageRoot}/AGENT.sidecar.md`,
    wiki_output_root: `${packageRoot}/.planning/agent-flow/wiki-output`,
    documentation_policy_path: `${packageRoot}/docs/agent-instructions/documentation-policy.v1.json`,
    documentation_map_path: `${packageRoot}/AGENT.sidecar.md`,
    documentation_index_path: `${packageRoot}/AGENT.sidecar.md`,
    documentation_changelog_root: `${packageRoot}/docs`,
    documentation_evidence_root: '.agent/work',
    internal_root: `${packageRoot}/docs`,
    internal_requirements_root: `${packageRoot}/docs/requirements`,
    tests_root: `${packageRoot}/tests`,
    derived_output_root: `${packageRoot}/.planning/agent-flow`,
    ledger_root: `${packageRoot}/backlogs`,
  });
  Object.assign(config.projects[0]!, {
    project_root: packageRoot,
    wiki_root: `${packageRoot}/docs`,
    wiki_path: `${packageRoot}/AGENT.sidecar.md`,
    wiki_output_root: `${packageRoot}/.planning/agent-flow/wiki-output`,
    internal_root: `${packageRoot}/docs`,
    ledger_root: `${packageRoot}/backlogs`,
    code_selectors: [`${packageRoot}/src/**`],
  });
  writeFileSync(configPath, stringify(config));
  mkdirSync(path.join(root, '.agent'), { recursive: true });
  const current = loadRuntimeConfig(root);
  const workspaceId = deriveWorkspaceId(current.repository.repository_id, root);
  const hostRelative = sessionHandoffDatabaseRelativePath(current);
  mkdirSync(path.dirname(path.join(root, hostRelative)), { recursive: true });
  const host = openHostStateDatabase(root, hostRelative, workspaceId);
  initializeHostDatabaseSchema(host);
  closeWorkspaceDatabaseWithAdmission(host);
  reportPhase('runtime-config-and-host-ready');
  return {
    root,
    configPath,
    workspaceId,
    hostRelative,
    request: {
      projectRoot: root,
      repository: current.repository.repository_id,
      projectMappings: [`fixture=${packageRoot}`],
    },
  };
}

async function assertPublicationRefusesPending(
  makePending: (fixture: Awaited<ReturnType<typeof makeFixture>>) => { relative: string; bytes: Buffer },
): Promise<void> {
  const owner = await loadOperationOwner();
  expect(owner).not.toBeNull();
  if (!owner) return;
  const fixture = await makeFixture();
  let passed = false;
  try {
    const { relative, bytes } = makePending(fixture);
    writeFileSync(path.join(fixture.root, relative), bytes, { flag: 'w' });
    await Promise.resolve(expect(owner.publishConsumerCleanInitializationIntent(fixture.request)).rejects.toThrow());
    expect(readFileSync(path.join(fixture.root, relative)).equals(bytes)).toBe(true);
    passed = true;
  } finally {
    await finishFixture(fixture.root, passed);
  }
}

async function withPendingIntentHostDatabase<T>(
  root: string,
  relative: string,
  workspaceId: string,
  operationId: string,
  pendingBytes: Uint8Array,
  read: (database: ReturnType<typeof openHostStateDatabase>) => T | Promise<T>,
): Promise<T> {
  const expected = Buffer.from(pendingBytes);
  const assertPending = () => {
    const current = readFileSync(path.join(root, pendingPath));
    const operation = JSON.parse(current.toString('utf8')) as Record<string, unknown>;
    if (
      !current.equals(expected) ||
      operation.schema !== 'ConsumerCleanInitializationOperation/v2' ||
      operation.root !== root ||
      operation.workspace_id !== workspaceId ||
      operation.operation_id !== operationId
    )
      throw new Error('clean initialization pending intent changed during fixture Host observation');
  };
  assertPending();
  const admission = acquireStorageReadAdmission(root, workspaceId, relative);
  const database = openExistingWorkspaceDatabaseWithCleanInitializationIntent(
    root,
    relative,
    admission,
    operationId,
    expected,
  );
  let readFailed = false;
  let readError: unknown;
  let result!: T;
  try {
    assertPending();
    result = await read(database);
  } catch (error) {
    readFailed = true;
    readError = error;
  }
  try {
    closeWorkspaceDatabaseWithAdmission(database);
  } catch (closeError) {
    if (readFailed) throw new AggregateError([readError, closeError], 'Host reader and owned close both failed');
    throw closeError;
  }
  if (readFailed) throw readError;
  return result;
}

async function readFence(
  root: string,
  relative: string,
  workspaceId: string,
  operationId: string,
  pendingBytes: Uint8Array,
) {
  return withPendingIntentHostDatabase(root, relative, workspaceId, operationId, pendingBytes, (database) =>
    new HostStateStore(database, workspaceId, undefined, undefined, undefined, undefined, root).readMaintenanceFence(),
  );
}

function recoveryToken(operation: ConsumerCleanInitializationOperationV2): string {
  const domain = 'vida-agent:consumer-clean-initialization-v2:recovery-token:v1';
  const input = canonicalJsonImageWithNodeLimit(
    {
      domain,
      operation_id: operation.operation_id,
      immutable_binding: operation.binding,
      root_identity: operation.root_identity,
      workspace_id: operation.workspace_id,
    },
    0,
    MAX_CANONICAL_NODES,
  ).json;
  const hex = createHash('sha256')
    .update(domain + '\0')
    .update(input, 'utf8')
    .digest('hex')
    .slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function finishFixture(root: string, passed: boolean): Promise<void> {
  console.error(`${passed ? 'Retained completed' : 'Retained failed'} C3 clean-init fixture: ${root}`);
}

test('clean-init applies and retires only verified completed state while preserving protected files', async () => {
  const startedAt = performance.now();
  const budgetMs = 120_000;
  const assertBudget = () => {
    if (performance.now() - startedAt > budgetMs)
      throw new Error('Clean-init apply/retire exceeded full-case 120000ms');
  };
  let fixtureRoot: string | undefined;
  let bodyFailed = false;
  let failure: unknown;
  try {
    const fixture = await makeFixture('clean-init-apply-retire-', (root) => {
      fixtureRoot = root;
      retainCleanInitFixture(root);
      assertBudget();
    });
    assertBudget();
    const protectedFiles = [
      'AGENTS.md',
      'AGENT.sidecar.md',
      'docs/agent-instructions/documentation-policy.v1.json',
      'packages/agent/src/preserved.ts',
      '.agent/work/preserved.json',
    ];
    mkdirSync(path.join(fixture.root, '.agent/work'), { recursive: true });
    for (const relative of protectedFiles.filter(
      (entry) => entry.endsWith('preserved.ts') || entry.endsWith('preserved.json'),
    ))
      writeFileSync(path.join(fixture.root, relative), 'protected fixture bytes\n');
    const protectedBefore = protectedFiles.map(
      (relative) => [relative, readFileSync(path.join(fixture.root, relative))] as const,
    );
    const originalConfig = readFileSync(fixture.configPath);
    const plan = (await cleanInitializationResult([
      'plan',
      '--project-root',
      fixture.root,
      '--repository',
      fixture.request.repository,
      '--project',
      fixture.request.projectMappings[0]!,
    ])) as { operation: ConsumerCleanInitializationOperationV2 };
    if (process.env.VIDA_CLEAN_INIT_PHASE_TIMING === '1')
      console.error(
        'C3 clean-init case phase',
        JSON.stringify({
          phase: 'public-plan-complete',
          elapsed_ms: Number((performance.now() - startedAt).toFixed(2)),
        }),
      );
    assertBudget();
    const applied = (await cleanInitializationResult([
      'apply',
      '--project-root',
      fixture.root,
      '--repository',
      fixture.request.repository,
      '--project',
      fixture.request.projectMappings[0]!,
      '--operation-id',
      plan.operation.operation_id,
      '--approve-plan',
      plan.operation.binding,
    ])) as {
      status: string;
      operation: ConsumerCleanInitializationOperationV2;
      expectedState: { pending_sha256: string | null };
    };
    if (process.env.VIDA_CLEAN_INIT_PHASE_TIMING === '1')
      console.error(
        'C3 clean-init case phase',
        JSON.stringify({
          phase: 'public-apply-complete',
          elapsed_ms: Number((performance.now() - startedAt).toFixed(2)),
        }),
      );
    assertBudget();
    expect(applied.status).toBe('complete');
    expect(applied.operation.phase).toBe('complete');
    expect(applied.operation.initialization).toBe('completed');
    expect(applied.expectedState.pending_sha256).toMatch(/^[a-f0-9]{64}$/u);
    const retired = (await cleanInitializationResult([
      'retire',
      '--project-root',
      fixture.root,
      '--operation-id',
      plan.operation.operation_id,
      '--approve-plan',
      plan.operation.binding,
      '--pending-sha256',
      applied.expectedState.pending_sha256!,
    ])) as { status: string; operation: ConsumerCleanInitializationOperationV2; archive_root: string };
    if (process.env.VIDA_CLEAN_INIT_PHASE_TIMING === '1')
      console.error(
        'C3 clean-init case phase',
        JSON.stringify({
          phase: 'public-retire-complete',
          elapsed_ms: Number((performance.now() - startedAt).toFixed(2)),
        }),
      );
    expect(retired.status).toBe('retired');
    expect(existsSync(path.join(fixture.root, pendingPath))).toBe(false);
    const payloadConfig = path.join(fixture.root, applied.operation.archive_root, 'agent-runtime.config.v1.yaml');
    expect(readFileSync(payloadConfig)).toEqual(originalConfig);
    const metadata = path.join(fixture.root, HISTORY_ROOT, plan.operation.operation_id, 'operation.v2.json');
    expect(JSON.parse(readFileSync(metadata, 'utf8'))).toEqual(retired.operation);
    expect(readFileSync(payloadConfig)).toEqual(originalConfig);
    for (const [relative, bytes] of protectedBefore)
      expect(readFileSync(path.join(fixture.root, relative))).toEqual(bytes);
    expect(
      ((await cleanInitializationResult(['inspect', '--project-root', fixture.root])) as { status: string }).status,
    ).toBe('absent');
    assertBudget();
  } catch (error) {
    bodyFailed = true;
    failure = error;
  } finally {
    if (fixtureRoot) retainCleanInitFixture(fixtureRoot);
  }
  try {
    assertBudget();
  } catch (budgetError) {
    if (bodyFailed) throw new AggregateError([failure, budgetError], 'Clean-init behavior and full-case budget failed');
    throw budgetError;
  }
  if (bodyFailed) throw failure;
}, 120_000);

async function assertInitialIntentDriftDenial(
  collection: 'inventory' | 'preserved',
  mutate: (
    fixture: Awaited<ReturnType<typeof makeFixture>>,
    entry: ConsumerCleanInitializationOperationV2['inventory'][number],
  ) => void,
  holdFence: boolean,
  inspectAfterDrift = false,
): Promise<void> {
  const startedAt = performance.now();
  let fixtureRoot: string | undefined;
  let bodyFailed = false;
  let bodyError: unknown;
  try {
    const owner = await loadOperationOwner();
    assertCleanInitCaseWithinBudget(startedAt, 'Unit01 drift setup');
    expect(owner).not.toBeNull();
    if (!owner) throw new Error('Expected the clean-init operation owner');
    const fixture = await makeFixture(
      `clean-init-initial-drift-${collection}-${holdFence ? 'held' : 'unheld'}-`,
      (root) => {
        fixtureRoot = root;
        retainCleanInitFixture(root);
        assertCleanInitCaseWithinBudget(startedAt, 'Unit01 drift root creation');
      },
    );
    console.error(`Unit01 drift fixture: ${fixture.root}`);
    assertCleanInitCaseWithinBudget(startedAt, 'Unit01 drift fixture');
    const operationId = await owner.publishConsumerCleanInitializationIntent(fixture.request);
    assertCleanInitCaseWithinBudget(startedAt, 'Unit01 drift publication');
    const pendingBefore = readFileSync(path.join(fixture.root, pendingPath));
    const operation = owner.inspectConsumerCleanInitializationIntent(fixture.root);
    assertCleanInitCaseWithinBudget(startedAt, 'Unit01 drift inspection');
    expect(operation).not.toBeNull();
    if (!operation) return;
    const entry = operation[collection][0];
    expect(entry).toBeDefined();
    if (!entry) return;

    if (holdFence) {
      await owner.withAcquiredConsumerCleanInitialization(
        { repositoryRoot: fixture.root, operationId },
        async () => undefined,
      );
      assertCleanInitCaseWithinBudget(startedAt, 'Unit01 drift fence acquisition');
    }
    const fenceBefore = await readFence(
      fixture.root,
      fixture.hostRelative,
      fixture.workspaceId,
      operationId,
      pendingBefore,
    );
    assertCleanInitCaseWithinBudget(startedAt, 'Unit01 drift Host read');
    expect(fenceBefore?.status ?? null).toBe(holdFence ? 'held' : null);
    mutate(fixture, entry);
    assertCleanInitCaseWithinBudget(startedAt, 'Unit01 drift mutation');

    if (inspectAfterDrift) expect(() => owner.inspectConsumerCleanInitializationIntent(fixture.root)).toThrow();
    let callbackEntered = false;
    await Promise.resolve(
      expect(
        owner.withAcquiredConsumerCleanInitialization({ repositoryRoot: fixture.root, operationId }, async () => {
          callbackEntered = true;
        }),
      ).rejects.toThrow(),
    );
    assertCleanInitCaseWithinBudget(startedAt, 'Unit01 drift refusal');
    expect(callbackEntered).toBe(false);
    expect(readFileSync(path.join(fixture.root, pendingPath))).toEqual(pendingBefore);
    expect(
      await readFence(fixture.root, fixture.hostRelative, fixture.workspaceId, operationId, pendingBefore),
    ).toEqual(fenceBefore);
  } catch (error) {
    bodyFailed = true;
    bodyError = error;
  } finally {
    if (fixtureRoot) retainCleanInitFixture(fixtureRoot);
  }
  try {
    assertCleanInitCaseWithinBudget(startedAt, 'Unit01 drift case including fixture retention');
  } catch (timeoutError) {
    if (bodyFailed) throw new AggregateError([bodyError, timeoutError], 'Unit01 drift body and budget both failed');
    throw timeoutError;
  }
  if (bodyFailed) throw bodyError;
}

test('clean-init reviewed publication binds approval and reports pristine intent as planned', async () => {
  const startedAt = performance.now();
  const budgetMs = 120_000;
  const assertBudget = () => {
    if (performance.now() - startedAt > budgetMs) throw new Error('Reviewed publication exceeded full-case 120000ms');
  };
  let fixtureRoot: string | undefined;
  let failed = false;
  let failure: unknown;
  try {
    const owner = await loadOperationOwner();
    assertBudget();
    expect(owner).not.toBeNull();
    if (!owner) throw new Error('Expected clean initialization owner');
    const fixture = await makeFixture('clean-init-reviewed-publication-', (root) => {
      fixtureRoot = root;
      retainCleanInitFixture(root);
      assertBudget();
    });
    assertBudget();
    const sentinels = [
      'packages/agent/src/preserved.ts',
      'packages/agent/docs/preserved.md',
      'packages/agent/backlogs/preserved.md',
      '.agent/work/preserved.json',
    ];
    mkdirSync(path.join(fixture.root, '.agent/work'), { recursive: true });
    for (const relative of sentinels) writeFileSync(path.join(fixture.root, relative), 'protected fixture bytes\n');
    const observedFiles = [
      'agent-runtime.config.v1.yaml',
      'AGENTS.md',
      'AGENT.sidecar.md',
      'docs/agent-instructions/documentation-policy.v1.json',
      ...sentinels,
    ];
    const before = observedFiles.map(
      (relative) => [relative, readFileSync(path.join(fixture.root, relative))] as const,
    );
    expect(owner.inspectConsumerCleanInitialization(fixture.root).status).toBe('absent');
    const plan = owner.planConsumerCleanInitialization(fixture.request);
    assertBudget();
    expect(plan.status).toBe('planned');
    expect(plan.expectedState).toEqual({ pending_sha256: null });
    expect(plan.operation.inventory.map((entry) => entry.path)).toContain('agent-runtime.config.v1.yaml');
    expect(existsSync(path.join(fixture.root, pendingPath))).toBe(false);
    for (const [relative, bytes] of before) expect(readFileSync(path.join(fixture.root, relative))).toEqual(bytes);
    const missingTokenAuthorization = {
      operation_id: plan.operation.operation_id,
      plan_binding: plan.operation.binding,
    };
    const missingTokenRequest = {
      repositoryRoot: fixture.root,
      operationId: plan.operation.operation_id,
      planBinding: plan.operation.binding,
      expectedState: { pending_sha256: null },
    };
    await Promise.resolve(
      expect(
        owner.resumeConsumerCleanInitialization({
          ...missingTokenRequest,
          authorization: { ...missingTokenAuthorization, action: 'resume' },
        }),
      ).rejects.toThrow(),
    );
    await Promise.resolve(
      expect(
        owner.retireConsumerCleanInitialization({
          ...missingTokenRequest,
          authorization: { ...missingTokenAuthorization, action: 'retire' },
        }),
      ).rejects.toThrow(),
    );
    expect(existsSync(path.join(fixture.root, pendingPath))).toBe(false);
    const input = {
      operation: plan.operation,
      expectedState: plan.expectedState,
      authorization: {
        action: 'apply' as const,
        operation_id: plan.operation.operation_id,
        plan_binding: plan.operation.binding,
      },
    };
    const extra = { ...input, unexpected: true };
    const denied: Array<Parameters<typeof owner.publishReviewedConsumerCleanInitialization>[0]> = [
      { ...input, authorization: { ...input.authorization, action: 'resume' } },
      { ...input, authorization: { ...input.authorization, operation_id: randomUUID() } },
      { ...input, authorization: { ...input.authorization, plan_binding: '0'.repeat(64) } },
      { ...input, expectedState: { pending_sha256: 'a'.repeat(64) } },
      extra,
    ];
    for (const request of denied) {
      await Promise.resolve(expect(owner.publishReviewedConsumerCleanInitialization(request)).rejects.toThrow());
      assertBudget();
      expect(existsSync(path.join(fixture.root, pendingPath))).toBe(false);
    }
    const originalConfig = readFileSync(fixture.configPath);
    const driftedConfig = Buffer.concat([originalConfig, Buffer.from('\n# controlled before-image drift\n')]);
    writeFileSync(fixture.configPath, driftedConfig);
    await Promise.resolve(expect(owner.publishReviewedConsumerCleanInitialization(input)).rejects.toThrow());
    assertBudget();
    expect(readFileSync(fixture.configPath)).toEqual(driftedConfig);
    expect(existsSync(path.join(fixture.root, pendingPath))).toBe(false);
    writeFileSync(fixture.configPath, originalConfig);
    const legacyPath = path.join(fixture.root, '.agent/runtime-initialization.pending.v1.json');
    const legacyMarker = Buffer.from('{"schema":"test-owned-pending-marker"}');
    writeFileSync(legacyPath, legacyMarker, { flag: 'wx' });
    expect(() => owner.planConsumerCleanInitialization(fixture.request)).toThrow();
    expect(readFileSync(legacyPath)).toEqual(legacyMarker);
    rmSync(legacyPath);
    const fresh = owner.planConsumerCleanInitialization(fixture.request);
    const acceptedInput = {
      operation: fresh.operation,
      expectedState: fresh.expectedState,
      authorization: {
        action: 'apply' as const,
        operation_id: fresh.operation.operation_id,
        plan_binding: fresh.operation.binding,
      },
    };
    const published = await owner.publishReviewedConsumerCleanInitialization(acceptedInput);
    assertBudget();
    const pending = readFileSync(path.join(fixture.root, pendingPath));
    expect(pending).toEqual(Buffer.from(canonicalJsonImageWithNodeLimit(fresh.operation, 0, MAX_CANONICAL_NODES).json));
    expect(published.operation).toEqual(fresh.operation);
    expect(published.plan_binding).toBe(fresh.operation.binding);
    expect(published.expectedState.pending_sha256).toBe(createHash('sha256').update(pending).digest('hex'));
    expect(() => owner.planConsumerCleanInitialization(fixture.request)).toThrow();
    await Promise.resolve(expect(owner.publishReviewedConsumerCleanInitialization(acceptedInput)).rejects.toThrow());
    assertBudget();
    expect(readFileSync(path.join(fixture.root, pendingPath))).toEqual(pending);
    expect(existsSync(path.join(fixture.root, fresh.operation.archive_root))).toBe(false);
    expect(
      await readFence(fixture.root, fixture.hostRelative, fixture.workspaceId, fresh.operation.operation_id, pending),
    ).toBeNull();
    for (const [relative, bytes] of before) expect(readFileSync(path.join(fixture.root, relative))).toEqual(bytes);
    expect(owner.inspectConsumerCleanInitialization(fixture.root).status).toBe('planned');
    expect(published.status).toBe('planned');
  } catch (error) {
    failed = true;
    failure = error;
  } finally {
    if (fixtureRoot) retainCleanInitFixture(fixtureRoot);
  }
  try {
    assertBudget();
  } catch (budgetError) {
    if (failed) throw new AggregateError([failure, budgetError], 'Publication behavior and full-case budget failed');
    throw budgetError;
  }
  if (failed) throw failure;
}, 120_000);

test('clean-init publication reuses the gate-only admission refusal for constructed .vida data', async () => {
  const startedAt = performance.now();
  const budgetMs = 120_000;
  const assertBudget = () => {
    if (performance.now() - startedAt > budgetMs)
      throw new Error('Constructed .vida refusal exceeded full-case 120000ms');
  };
  let fixtureRoot: string | undefined;
  let failed = false;
  let failure: unknown;
  try {
    const owner = await loadOperationOwner();
    assertBudget();
    expect(owner).not.toBeNull();
    if (!owner) throw new Error('Expected clean initialization owner');
    const fixture = await makeFixture('clean-init-vida-refusal-', (root) => {
      fixtureRoot = root;
      retainCleanInitFixture(root);
      assertBudget();
    });
    assertBudget();
    const plan = owner.planConsumerCleanInitialization(fixture.request);
    expect(plan.operation.inventory.map((entry) => entry.path)).toContain('agent-runtime.config.v1.yaml');
    const activationPath = path.join(fixture.root, '.vida/activation.v1.json');
    mkdirSync(path.dirname(activationPath), { recursive: true });
    const marker = Buffer.from('{"constructed":"active .vida backend marker"}\n');
    writeFileSync(activationPath, marker, { flag: 'wx' });
    const hostBefore = readFileSync(path.join(fixture.root, fixture.hostRelative));
    await Promise.resolve(
      expect(
        owner.publishReviewedConsumerCleanInitialization({
          operation: plan.operation,
          expectedState: plan.expectedState,
          authorization: {
            action: 'apply',
            operation_id: plan.operation.operation_id,
            plan_binding: plan.operation.binding,
          },
        }),
      ).rejects.toThrow('Project storage admission: VIDA product data already exists'),
    );
    assertBudget();
    expect(readFileSync(activationPath)).toEqual(marker);
    expect(readFileSync(path.join(fixture.root, fixture.hostRelative))).toEqual(hostBefore);
    expect(existsSync(path.join(fixture.root, pendingPath))).toBe(false);
    expect(existsSync(path.join(fixture.root, plan.operation.archive_root))).toBe(false);
  } catch (error) {
    failed = true;
    failure = error;
  } finally {
    if (fixtureRoot) retainCleanInitFixture(fixtureRoot);
  }
  try {
    assertBudget();
  } catch (budgetError) {
    if (failed)
      throw new AggregateError([failure, budgetError], 'Constructed .vida refusal and full-case budget failed');
    throw budgetError;
  }
  if (failed) throw failure;
}, 120_000);

test('clean-init recovers real archive, initializer and retirement lost acknowledgements', async () => {
  const startedAt = performance.now();
  const budgetMs = 120_000;
  const assertBudget = (label: string) => {
    if (performance.now() - startedAt > budgetMs)
      throw new Error(`Clean-init injected-fault case exceeded 120000ms during ${label}`);
  };
  let fixtureRoot: string | undefined;
  let failed = false;
  let failure: unknown;
  const injected = new Set<string>();
  let faultStage: 'archive' | 'initializer' | 'retire' | null = null;
  let restore: (() => void) | undefined;
  try {
    const fixture = await makeFixture('clean-init-injected-fault-', (root) => {
      fixtureRoot = root;
      retainCleanInitFixture(root);
      assertBudget('fixture allocation');
    });
    assertBudget('fixture setup');
    const originalRequire = safeRepositoryAccess.requireSafeRepositoryAccess;
    const accessSpy = spyOn(safeRepositoryAccess, 'requireSafeRepositoryAccess').mockImplementation((root) => {
      const nativeAccess = originalRequire(root);
      if (path.resolve(root) !== path.resolve(fixture.root)) return nativeAccess;
      const nativeMove = nativeAccess.moveNoReplaceAsync;
      const nativePrepare = nativeAccess.prepareExclusiveCreation;
      return {
        ...nativeAccess,
        moveNoReplaceAsync: async (source, target, expectedHash, label) => {
          const result = await nativeMove.call(nativeAccess, source, target, expectedHash, label);
          if (
            (faultStage === 'archive' && label === 'clean initialization file archive') ||
            (faultStage === 'retire' && label === 'retire completed clean initialization metadata')
          ) {
            const stage = faultStage;
            faultStage = null;
            injected.add(stage);
            throw new Error(`injected lost acknowledgement after real ${stage} move`);
          }
          return result;
        },
        prepareExclusiveCreation: async () => {
          const creator = await nativePrepare.call(nativeAccess);
          return {
            ...creator,
            writeExclusive: async (target, contents, label) => {
              await creator.writeExclusive(target, contents, label);
              if (faultStage === 'initializer' && target === '.agent/runtime-initialization.pending.v1.json') {
                faultStage = null;
                injected.add('initializer');
                throw new Error('injected lost acknowledgement after real initializer pending write');
              }
            },
          };
        },
      };
    });
    restore = () => accessSpy.mockRestore();

    const plan = (await cleanInitializationResult([
      'plan',
      '--project-root',
      fixture.root,
      '--repository',
      fixture.request.repository,
      '--project',
      fixture.request.projectMappings[0]!,
    ])) as { operation: ConsumerCleanInitializationOperationV2 };
    assertBudget('public plan');
    faultStage = 'archive';
    const applyArgs = [
      'apply',
      '--project-root',
      fixture.root,
      '--repository',
      fixture.request.repository,
      '--project',
      fixture.request.projectMappings[0]!,
      '--operation-id',
      plan.operation.operation_id,
      '--approve-plan',
      plan.operation.binding,
    ];
    await Promise.resolve(expect(cleanInitializationResult(applyArgs)).rejects.toThrow('lost acknowledgement'));
    assertBudget('archive fault');
    expect(injected.has('archive')).toBe(true);
    let pending = readFileSync(path.join(fixture.root, pendingPath));
    let pendingOperation = JSON.parse(pending.toString('utf8')) as ConsumerCleanInitializationOperationV2;
    expect(pendingOperation.phase).toBe('archiving');
    const moved = pendingOperation.moves.find((entry) => entry.state === 'issued');
    expect(moved).toBeDefined();
    if (!moved) throw new Error('lost archive acknowledgement had no issued move');
    expect(existsSync(path.join(fixture.root, moved.source))).toBe(false);
    expect(existsSync(path.join(fixture.root, moved.target))).toBe(true);
    const exactFence = await readFence(
      fixture.root,
      fixture.hostRelative,
      fixture.workspaceId,
      plan.operation.operation_id,
      pending,
    );
    expect(exactFence?.status).toBe('held');
    const hash = createHash('sha256').update(pending).digest('hex');
    await Promise.resolve(
      expect(
        cleanInitializationResult([
          'retire',
          '--project-root',
          fixture.root,
          '--operation-id',
          plan.operation.operation_id,
          '--approve-plan',
          plan.operation.binding,
          '--pending-sha256',
          hash,
        ]),
      ).rejects.toThrow(),
    );
    await Promise.resolve(
      expect(
        cleanInitializationResult([
          'resume',
          '--project-root',
          fixture.root,
          '--operation-id',
          plan.operation.operation_id,
          '--approve-plan',
          plan.operation.binding,
          '--pending-sha256',
          '0'.repeat(64),
        ]),
      ).rejects.toThrow(),
    );
    await Promise.resolve(
      expect(
        cleanInitializationResult([
          'resume',
          '--project-root',
          fixture.root,
          '--operation-id',
          plan.operation.operation_id,
          '--approve-plan',
          'f'.repeat(64),
          '--pending-sha256',
          hash,
        ]),
      ).rejects.toThrow(),
    );
    expect(readFileSync(path.join(fixture.root, pendingPath))).toEqual(pending);
    expect(
      await readFence(fixture.root, fixture.hostRelative, fixture.workspaceId, plan.operation.operation_id, pending),
    ).toEqual(exactFence);
    assertBudget('stale and nonterminal refusals');

    faultStage = 'initializer';
    await Promise.resolve(
      expect(
        cleanInitializationResult([
          'resume',
          '--project-root',
          fixture.root,
          '--operation-id',
          plan.operation.operation_id,
          '--approve-plan',
          plan.operation.binding,
          '--pending-sha256',
          hash,
        ]),
      ).rejects.toThrow('lost acknowledgement'),
    );
    assertBudget('initializer fault');
    expect(injected.has('initializer')).toBe(true);
    expect(existsSync(path.join(fixture.root, '.agent/runtime-initialization.pending.v1.json'))).toBe(true);
    pending = readFileSync(path.join(fixture.root, pendingPath));
    pendingOperation = JSON.parse(pending.toString('utf8')) as ConsumerCleanInitializationOperationV2;
    expect(pendingOperation.phase).toBe('initializing');
    expect(pendingOperation.prepared).not.toBeNull();
    expect(
      await readFence(fixture.root, fixture.hostRelative, fixture.workspaceId, plan.operation.operation_id, pending),
    ).toMatchObject({ status: 'held' });

    const resumed = (await cleanInitializationResult([
      'resume',
      '--project-root',
      fixture.root,
      '--operation-id',
      plan.operation.operation_id,
      '--approve-plan',
      plan.operation.binding,
      '--pending-sha256',
      createHash('sha256').update(pending).digest('hex'),
    ])) as {
      status: string;
      operation: ConsumerCleanInitializationOperationV2;
      expectedState: { pending_sha256: string };
    };
    assertBudget('witnessed resume and terminal release');
    expect(resumed.status).toBe('complete');
    expect(resumed.operation.phase).toBe('complete');
    expect(
      await readFence(
        fixture.root,
        fixture.hostRelative,
        fixture.workspaceId,
        plan.operation.operation_id,
        readFileSync(path.join(fixture.root, pendingPath)),
      ),
    ).toMatchObject({ status: 'released' });

    faultStage = 'retire';
    await Promise.resolve(
      expect(
        cleanInitializationResult([
          'retire',
          '--project-root',
          fixture.root,
          '--operation-id',
          plan.operation.operation_id,
          '--approve-plan',
          plan.operation.binding,
          '--pending-sha256',
          resumed.expectedState.pending_sha256,
        ]),
      ).rejects.toThrow('lost acknowledgement'),
    );
    assertBudget('retirement fault');
    expect(injected.has('retire')).toBe(true);
    expect(existsSync(path.join(fixture.root, pendingPath))).toBe(false);
    const metadata = path.join(fixture.root, HISTORY_ROOT, plan.operation.operation_id, 'operation.v2.json');
    expect(existsSync(metadata)).toBe(true);
    const retired = (await cleanInitializationResult([
      'retire',
      '--project-root',
      fixture.root,
      '--operation-id',
      plan.operation.operation_id,
      '--approve-plan',
      plan.operation.binding,
      '--pending-sha256',
      resumed.expectedState.pending_sha256,
    ])) as { status: string; operation: ConsumerCleanInitializationOperationV2 };
    expect(retired.status).toBe('retired');
    expect(JSON.parse(readFileSync(metadata, 'utf8'))).toEqual(retired.operation);
    const exactRetry = await cleanInitializationResult([
      'retire',
      '--project-root',
      fixture.root,
      '--operation-id',
      plan.operation.operation_id,
      '--approve-plan',
      plan.operation.binding,
      '--pending-sha256',
      resumed.expectedState.pending_sha256,
    ]);
    expect(exactRetry).toEqual(retired);
    assertBudget('exact retired metadata retry');
  } catch (error) {
    failed = true;
    failure = error;
  } finally {
    restore?.();
    if (fixtureRoot) retainCleanInitFixture(fixtureRoot);
  }
  try {
    assertBudget('owned wrapper restoration and retained-root recording');
  } catch (budgetError) {
    if (failed) throw new AggregateError([failure, budgetError], 'C3 fault body and full-case budget failed');
    throw budgetError;
  }
  if (failed) throw failure;
}, 120_000);

test(
  'initial intent refuses captured inventory byte drift before callback or fence creation',
  async () =>
    assertInitialIntentDriftDenial(
      'inventory',
      (fixture, entry) => {
        const file = path.join(fixture.root, entry.path);
        const bytes = readFileSync(file);
        expect(bytes.byteLength).toBeGreaterThan(0);
        bytes[0] = bytes[0]! ^ 1;
        writeFileSync(file, bytes);
      },
      false,
      true,
    ),
  CLEAN_INIT_CASE_TIMEOUT_MS,
);

test(
  'initial intent refuses preserved byte drift before callback or fence creation',
  async () =>
    assertInitialIntentDriftDenial(
      'preserved',
      (fixture, entry) => {
        const file = path.join(fixture.root, entry.path);
        const bytes = readFileSync(file);
        expect(bytes.byteLength).toBeGreaterThan(0);
        bytes[0] = bytes[0]! ^ 1;
        writeFileSync(file, bytes);
      },
      false,
    ),
  CLEAN_INIT_CASE_TIMEOUT_MS,
);

test(
  'initial intent refuses same-byte preserved identity drift on held-fence reattach',
  async () =>
    assertInitialIntentDriftDenial(
      'preserved',
      (fixture, entry) => {
        const file = path.join(fixture.root, entry.path);
        const temporary = file + '.replacement-' + randomUUID();
        const bytes = readFileSync(file);
        const before = lstatSync(file, { bigint: true });
        writeFileSync(temporary, bytes, { flag: 'wx' });
        rmSync(file);
        renameSync(temporary, file);
        const after = lstatSync(file, { bigint: true });
        expect(readFileSync(file)).toEqual(bytes);
        expect(after.dev === before.dev && after.ino === before.ino).toBe(false);
      },
      true,
    ),
  CLEAN_INIT_CASE_TIMEOUT_MS,
);

test('publishes exact v2 bytes and reattaches the same real Host fence without effects', async () => {
  const owner = await loadOperationOwner();
  expect(owner).not.toBeNull();
  if (!owner) return;
  const fixture = await makeFixture();
  let passed = false;
  try {
    const sourceBefore = readFileSync(path.join(fixture.root, 'AGENT.sidecar.md'));
    const docsBefore = readFileSync(path.join(fixture.root, 'AGENTS.md'));
    const operationId = await owner.publishConsumerCleanInitializationIntent(fixture.request);
    const pendingBefore = readFileSync(path.join(fixture.root, pendingPath));
    const operation = owner.inspectConsumerCleanInitializationIntent(fixture.root);
    if (!operation) throw new Error('Expected the published pending operation');
    expect(operation?.operation_id).toBe(operationId);
    expect(operation?.schema).toBe('ConsumerCleanInitializationOperation/v2');
    expect(
      await readFence(fixture.root, fixture.hostRelative, fixture.workspaceId, operationId, pendingBefore),
    ).toBeNull();
    expect(existsSync(path.join(fixture.root, operation!.archive_root))).toBe(false);

    const run = () =>
      owner.withAcquiredConsumerCleanInitialization(
        { repositoryRoot: fixture.root, operationId },
        async (current, capability) => {
          assertCleanInitializationHostAdmission(capability, fixture.root, fixture.workspaceId, operationId);
          return current.binding;
        },
      );
    expect(await run()).toBe(operation?.binding);
    const firstFence = await readFence(
      fixture.root,
      fixture.hostRelative,
      fixture.workspaceId,
      operationId,
      pendingBefore,
    );
    expect(firstFence).toMatchObject({ status: 'held', generation: 1, revision: 1 });
    expect(await run()).toBe(operation?.binding);
    expect(
      await readFence(fixture.root, fixture.hostRelative, fixture.workspaceId, operationId, pendingBefore),
    ).toEqual(firstFence);
    expect(readFileSync(path.join(fixture.root, pendingPath))).toEqual(pendingBefore);
    expect(readFileSync(path.join(fixture.root, 'AGENT.sidecar.md'))).toEqual(sourceBefore);
    expect(readFileSync(path.join(fixture.root, 'AGENTS.md'))).toEqual(docsBefore);
    expect(existsSync(path.join(fixture.root, '.agent/runtime-initialization.pending.v1.json'))).toBe(false);
    expect(operation?.phase).toBe('intent');
    expect(operation?.initialization).toBe('not-started');
    passed = true;
  } finally {
    await finishFixture(fixture.root, passed);
  }
});

test('publication refuses a v1 pending owner unchanged', async () =>
  assertPublicationRefusesPending(() => ({
    relative: pendingPath,
    bytes: Buffer.from(JSON.stringify({ schema: 'ConsumerCleanInitializationOperation/v1' })),
  })));

test('publication refuses a v2 pending owner unchanged', async () =>
  assertPublicationRefusesPending((fixture) => ({
    relative: pendingPath,
    bytes: Buffer.from(JSON.stringify(captureConsumerCleanInitializationV2(fixture.request))),
  })));

test('publication refuses a legacy runtime-initialization owner unchanged', async () =>
  assertPublicationRefusesPending(() => ({
    relative: '.agent/runtime-initialization.pending.v1.json',
    bytes: Buffer.from('{"schema":"RuntimeInitialization/v1"}'),
  })));

test('publication refuses an unknown pending owner unchanged', async () =>
  assertPublicationRefusesPending(() => ({ relative: pendingPath, bytes: Buffer.from('unknown pending owner\n') })));

test('acquisition refuses a real foreign held Host fence and preserves the pending image', async () => {
  const owner = await loadOperationOwner();
  expect(owner).not.toBeNull();
  if (!owner) return;
  const fixture = await makeFixture();
  let passed = false;
  try {
    const operationId = await owner.publishConsumerCleanInitializationIntent(fixture.request);
    const pendingBefore = readFileSync(path.join(fixture.root, pendingPath));
    const projectIds = ['fixture'];
    const foreignBinding: MaintenanceFenceBinding = {
      schema: 'MaintenanceFenceBinding/v1',
      project_ids: projectIds,
      operation_id: 'foreign-clean-init-operation',
      manifest_digest: 'a'.repeat(64),
      request_digest: 'b'.repeat(64),
      bindings_digest: 'c'.repeat(64),
      closure_digest: 'd'.repeat(64),
      bundle_digest: 'e'.repeat(64),
    };
    await withPendingIntentHostDatabase(
      fixture.root,
      fixture.hostRelative,
      fixture.workspaceId,
      operationId,
      pendingBefore,
      (database) => {
        const store = new HostStateStore(
          database,
          fixture.workspaceId,
          undefined,
          undefined,
          undefined,
          { principal: 'fixture:foreign-fence', projectIds, verify: () => null },
          fixture.root,
        );
        store.acquireMaintenanceFence(foreignBinding);
      },
    );
    const heldBefore = await readFence(
      fixture.root,
      fixture.hostRelative,
      fixture.workspaceId,
      operationId,
      pendingBefore,
    );
    await Promise.resolve(
      expect(
        owner.withAcquiredConsumerCleanInitialization(
          { repositoryRoot: fixture.root, operationId },
          async () => 'must not enter',
        ),
      ).rejects.toThrow(),
    );
    expect(
      await readFence(fixture.root, fixture.hostRelative, fixture.workspaceId, operationId, pendingBefore),
    ).toEqual(heldBefore);
    expect(readFileSync(path.join(fixture.root, pendingPath))).toEqual(pendingBefore);
    passed = true;
  } finally {
    await finishFixture(fixture.root, passed);
  }
});

test('a changed valid pending binding cannot reattach the held generation', async () => {
  const owner = await loadOperationOwner();
  expect(owner).not.toBeNull();
  if (!owner) return;
  const fixture = await makeFixture();
  let passed = false;
  try {
    const operationId = await owner.publishConsumerCleanInitializationIntent(fixture.request);
    const operation = owner.inspectConsumerCleanInitializationIntent(fixture.root);
    await owner.withAcquiredConsumerCleanInitialization(
      { repositoryRoot: fixture.root, operationId },
      async () => 'held',
    );
    const { binding: _binding, ...draft } = operation!;
    const changed = sealCleanInitializationOperationV2({
      ...draft,
      protected_paths: [...draft.protected_paths, 'packages/agent/foreign-protected-root'].sort(),
    });
    const changedBytes = Buffer.from(JSON.stringify(changed));
    writeFileSync(path.join(fixture.root, pendingPath), changedBytes);
    await Promise.resolve(
      expect(
        owner.withAcquiredConsumerCleanInitialization(
          { repositoryRoot: fixture.root, operationId },
          async () => 'must not enter',
        ),
      ).rejects.toThrow(),
    );
    expect(readFileSync(path.join(fixture.root, pendingPath))).toEqual(changedBytes);
    expect(
      await readFence(fixture.root, fixture.hostRelative, fixture.workspaceId, operationId, changedBytes),
    ).toMatchObject({
      status: 'held',
      generation: 1,
      revision: 1,
    });
    passed = true;
  } finally {
    await finishFixture(fixture.root, passed);
  }
});

test('a remapped configured project refuses acquisition before a Host fence exists', async () => {
  const owner = await loadOperationOwner();
  expect(owner).not.toBeNull();
  if (!owner) return;
  const fixture = await makeFixture();
  let passed = false;
  try {
    const operationId = await owner.publishConsumerCleanInitializationIntent(fixture.request);
    const pendingBefore = readFileSync(path.join(fixture.root, pendingPath));
    const config = parse(readFileSync(fixture.configPath, 'utf8')) as {
      projects: Array<Record<string, unknown>>;
    };
    config.projects[0]!.project_root = 'packages/agent/foreign';
    writeFileSync(fixture.configPath, stringify(config));
    await Promise.resolve(
      expect(
        owner.withAcquiredConsumerCleanInitialization(
          { repositoryRoot: fixture.root, operationId },
          async () => 'must not enter',
        ),
      ).rejects.toThrow(),
    );
    expect(
      await readFence(fixture.root, fixture.hostRelative, fixture.workspaceId, operationId, pendingBefore),
    ).toBeNull();
    expect(readFileSync(path.join(fixture.root, pendingPath))).toEqual(pendingBefore);
    passed = true;
  } finally {
    await finishFixture(fixture.root, passed);
  }
});

test('strict v2 revalidation refuses a pending image bound to another runtime', async () => {
  const owner = await loadOperationOwner();
  expect(owner).not.toBeNull();
  if (!owner) return;
  const fixture = await makeFixture();
  let passed = false;
  try {
    const operationId = await owner.publishConsumerCleanInitializationIntent(fixture.request);
    const operation = owner.inspectConsumerCleanInitializationIntent(fixture.root);
    const { binding: _binding, ...draft } = operation!;
    const changed = sealCleanInitializationOperationV2({
      ...draft,
      runtime: { ...draft.runtime, version: '0.0.0-foreign-runtime' },
    });
    const changedBytes = Buffer.from(JSON.stringify(changed));
    writeFileSync(path.join(fixture.root, pendingPath), changedBytes);
    await Promise.resolve(
      expect(
        owner.withAcquiredConsumerCleanInitialization(
          { repositoryRoot: fixture.root, operationId },
          async () => 'must not enter',
        ),
      ).rejects.toThrow(),
    );
    expect(
      await readFence(fixture.root, fixture.hostRelative, fixture.workspaceId, operationId, changedBytes),
    ).toBeNull();
    expect(readFileSync(path.join(fixture.root, pendingPath))).toEqual(changedBytes);
    passed = true;
  } finally {
    await finishFixture(fixture.root, passed);
  }
});

test('inspect is read-only and rejects a plan copied under another physical root', async () => {
  const owner = await loadOperationOwner();
  expect(owner).not.toBeNull();
  if (!owner) return;
  const fixture = await makeFixture();
  let passed = false;
  let otherRoot = '';
  try {
    const operationId = await owner.publishConsumerCleanInitializationIntent(fixture.request);
    const bytes = readFileSync(path.join(fixture.root, pendingPath));
    otherRoot = mkdtempSync(path.join(os.tmpdir(), 'clean-init-operation-other-root-'));
    mkdirSync(path.join(otherRoot, '.git'));
    mkdirSync(path.join(otherRoot, '.agent'), { recursive: true });
    writeFileSync(path.join(otherRoot, pendingPath), bytes);
    expect(() => owner.inspectConsumerCleanInitializationIntent(otherRoot)).toThrow();
    expect(() => owner.inspectConsumerCleanInitializationIntent(fixture.root)).not.toThrow();
    expect(readFileSync(path.join(fixture.root, pendingPath))).toEqual(bytes);
    expect(readFileSync(path.join(otherRoot, pendingPath))).toEqual(bytes);
    expect(owner.inspectConsumerCleanInitializationIntent(fixture.root)?.operation_id).toBe(operationId);
    passed = true;
  } finally {
    await finishFixture(fixture.root, passed);
    if (otherRoot) rmSync(otherRoot, { recursive: true, force: true });
  }
});

test('a valid completed operation for the same ID cannot reacquire a fence', async () => {
  const owner = await loadOperationOwner();
  expect(owner).not.toBeNull();
  if (!owner) return;
  const fixture = await makeFixture();
  let passed = false;
  try {
    const operationId = await owner.publishConsumerCleanInitializationIntent(fixture.request);
    const operation = owner.inspectConsumerCleanInitializationIntent(fixture.root);
    expect(operation).not.toBeNull();
    if (!operation) return;
    const { binding: _binding, ...draft } = operation;
    const completed = sealCleanInitializationOperationV2({
      ...draft,
      moves: draft.moves.map((move) => ({ ...move, state: 'completed' })),
      containers: draft.containers.map((container) => ({
        ...container,
        state: 'completed',
        identity: operation.root_identity,
      })),
      phase: 'complete',
      prepared: {
        intent: operation.binding,
        rootIdentity: operation.root_identity,
        bundleIdentity: operation.runtime.bundle_identity,
        projectIdentities: operation.request.projectMappings.map(() => operation.root_identity),
        resourceDigest: operation.runtime.resource_digest,
      },
      initialization: 'completed',
    });
    const completedBytes = Buffer.from(JSON.stringify(completed));
    writeFileSync(path.join(fixture.root, pendingPath), completedBytes);
    const hostBefore = readFileSync(path.join(fixture.root, fixture.hostRelative));
    await Promise.resolve(
      expect(
        owner.withAcquiredConsumerCleanInitialization(
          { repositoryRoot: fixture.root, operationId },
          async () => 'must not enter',
        ),
      ).rejects.toThrow(),
    );
    expect(readFileSync(path.join(fixture.root, pendingPath))).toEqual(completedBytes);
    expect(readFileSync(path.join(fixture.root, fixture.hostRelative))).toEqual(hostBefore);
    expect(existsSync(path.join(fixture.root, completed.archive_root))).toBe(false);
    passed = true;
  } finally {
    await finishFixture(fixture.root, passed);
  }
});

test('a released same-operation Host fence refuses reacquisition through the native owner', async () => {
  const owner = await loadOperationOwner();
  expect(owner).not.toBeNull();
  if (!owner) return;
  const fixture = await makeFixture();
  let passed = false;
  try {
    const operationId = await owner.publishConsumerCleanInitializationIntent(fixture.request);
    const pendingBefore = readFileSync(path.join(fixture.root, pendingPath));
    const operation = owner.inspectConsumerCleanInitializationIntent(fixture.root);
    expect(operation).not.toBeNull();
    if (!operation) return;
    await owner.withAcquiredConsumerCleanInitialization(
      { repositoryRoot: fixture.root, operationId },
      async () => 'held',
    );
    const held = await readFence(fixture.root, fixture.hostRelative, fixture.workspaceId, operationId, pendingBefore);
    expect(held?.status).toBe('held');
    if (!held) return;
    const principal = 'vida-agent:consumer-clean-initialization-v2' as const;
    const verifier = {
      principal,
      projectIds: held.binding.project_ids,
      verify: (fence: typeof held) => ({
        schema: 'MaintenanceReleaseAuthorization/v1' as const,
        principal,
        fence_digest: canonicalJsonDigest(fence),
        closure_digest: fence.binding.closure_digest,
        bundle_digest: fence.binding.bundle_digest,
      }),
    };
    const token = recoveryToken(operation);
    const released = await withPendingIntentHostDatabase(
      fixture.root,
      fixture.hostRelative,
      fixture.workspaceId,
      operationId,
      pendingBefore,
      async (database) => {
        const store = new HostStateStore(
          database,
          fixture.workspaceId,
          undefined,
          undefined,
          undefined,
          verifier,
          fixture.root,
        );
        const receipt = store.acquireMaintenanceFenceWithRecordedToken(held.binding, token);
        return store.releaseMaintenanceFence(receipt);
      },
    );
    expect(released).toMatchObject({ status: 'released', generation: 1, revision: 2 });
    await Promise.resolve(
      expect(
        owner.withAcquiredConsumerCleanInitialization(
          { repositoryRoot: fixture.root, operationId },
          async () => 'must not enter',
        ),
      ).rejects.toThrow(),
    );
    expect(
      await readFence(fixture.root, fixture.hostRelative, fixture.workspaceId, operationId, pendingBefore),
    ).toEqual(released);
    expect(readFileSync(path.join(fixture.root, pendingPath))).toEqual(pendingBefore);
    passed = true;
  } finally {
    await finishFixture(fixture.root, passed);
  }
});

test(
  'a real Host reader blocks callback admission and leaves the exact fence and intent held',
  async () => {
    const startedAt = performance.now();
    let fixtureRoot: string | undefined;
    let bodyFailed = false;
    let bodyError: unknown;
    let callbackEntered = false;
    try {
      const owner = await loadOperationOwner();
      assertCleanInitCaseWithinBudget(startedAt, 'Unit04 owner load');
      expect(owner).not.toBeNull();
      if (!owner) throw new Error('Expected the clean-init operation owner');
      const fixture = await makeFixture('clean-init-real-host-reader-', (root) => {
        fixtureRoot = root;
        retainCleanInitFixture(root);
        assertCleanInitCaseWithinBudget(startedAt, 'Unit04 root creation');
      });
      console.error(`Unit04 Host-reader fixture: ${fixture.root}`);
      assertCleanInitCaseWithinBudget(startedAt, 'Unit04 fixture setup');
      const sourceBefore = readFileSync(path.join(fixture.root, 'AGENT.sidecar.md'));
      const docsBefore = readFileSync(path.join(fixture.root, 'AGENTS.md'));
      const operationId = await owner.publishConsumerCleanInitializationIntent(fixture.request);
      assertCleanInitCaseWithinBudget(startedAt, 'Unit04 intent publication');
      const pendingBefore = readFileSync(path.join(fixture.root, pendingPath));
      await owner.withAcquiredConsumerCleanInitialization(
        { repositoryRoot: fixture.root, operationId },
        async () => 'held before Host reader',
      );
      assertCleanInitCaseWithinBudget(startedAt, 'Unit04 genuine fence acquisition');
      const fenceBefore = await readFence(
        fixture.root,
        fixture.hostRelative,
        fixture.workspaceId,
        operationId,
        pendingBefore,
      );
      expect(fenceBefore).toMatchObject({ status: 'held', generation: 1, revision: 1 });
      assertCleanInitCaseWithinBudget(startedAt, 'Unit04 initial fence read');
      let readerDatabase: ReturnType<typeof openHostStateDatabase> | undefined;
      try {
        await withPendingIntentHostDatabase(
          fixture.root,
          fixture.hostRelative,
          fixture.workspaceId,
          operationId,
          pendingBefore,
          async (database) => {
            readerDatabase = database;
            expect(database.query('PRAGMA database_list').get()).toMatchObject({
              name: 'main',
              file: path.resolve(fixture.root, fixture.hostRelative),
            });
            assertCleanInitCaseWithinBudget(startedAt, 'Unit04 Host connection observation');
            let readerFailed = false;
            let readerError: unknown;
            try {
              database.exec('BEGIN DEFERRED');
              expect(database.inTransaction).toBe(true);
              expect(
                database.query<{ count: number }, []>('SELECT COUNT(*) AS count FROM sqlite_schema').get()?.count,
              ).toBeGreaterThanOrEqual(0);
              assertCleanInitCaseWithinBudget(startedAt, 'Unit04 active Host read transaction');
              await Promise.resolve(
                expect(
                  owner.withAcquiredConsumerCleanInitialization(
                    { repositoryRoot: fixture.root, operationId },
                    async () => {
                      callbackEntered = true;
                      return 'must not enter';
                    },
                  ),
                ).rejects.toThrow(),
              );
              assertCleanInitCaseWithinBudget(startedAt, 'Unit04 callback refusal');
              expect(callbackEntered).toBe(false);
              expect(database.inTransaction).toBe(true);
            } catch (error) {
              readerFailed = true;
              readerError = error;
            }
            try {
              if (database.inTransaction) database.exec('ROLLBACK');
              expect(database.inTransaction).toBe(false);
            } catch (rollbackError) {
              if (readerFailed)
                throw new AggregateError(
                  [readerError, rollbackError],
                  'Host reader assertion and owned rollback both failed',
                );
              throw rollbackError;
            }
            if (readerFailed) throw readerError;
          },
        );
        assertCleanInitCaseWithinBudget(startedAt, 'Unit04 pending-aware Host database close');
        expect(readerDatabase).toBeDefined();
        const observedDatabase = readerDatabase;
        if (!observedDatabase) throw new Error('Expected the pending-aware Host database connection to be observed');
        expect(() => observedDatabase.query('SELECT 1').get()).toThrow();
        assertCleanInitCaseWithinBudget(startedAt, 'Unit04 closed Host connection observation');
        expect(readFileSync(path.join(fixture.root, pendingPath))).toEqual(pendingBefore);
        expect(
          await readFence(fixture.root, fixture.hostRelative, fixture.workspaceId, operationId, pendingBefore),
        ).toEqual(fenceBefore);
        assertCleanInitCaseWithinBudget(startedAt, 'Unit04 pending and fence preservation');
        expect(readFileSync(path.join(fixture.root, 'AGENT.sidecar.md'))).toEqual(sourceBefore);
        expect(readFileSync(path.join(fixture.root, 'AGENTS.md'))).toEqual(docsBefore);
        expect(existsSync(path.join(fixture.root, '.agent/runtime-initialization.pending.v1.json'))).toBe(false);
        expect(
          existsSync(
            path.join(fixture.root, owner.inspectConsumerCleanInitializationIntent(fixture.root)!.archive_root),
          ),
        ).toBe(false);
      } catch (error) {
        bodyFailed = true;
        bodyError = error;
      }
    } catch (error) {
      bodyFailed = true;
      bodyError = error;
    } finally {
      if (fixtureRoot) retainCleanInitFixture(fixtureRoot);
    }
    try {
      assertCleanInitCaseWithinBudget(startedAt, 'Unit04 case including rollback and close');
    } catch (timeoutError) {
      if (bodyFailed) throw new AggregateError([bodyError, timeoutError], 'Unit04 body and budget both failed');
      throw timeoutError;
    }
    if (bodyFailed) throw bodyError;
  },
  CLEAN_INIT_CASE_TIMEOUT_MS,
);
