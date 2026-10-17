import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import assert from 'node:assert/strict';
import { Database } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { execFile, type ChildProcess } from 'node:child_process';
import type { Writable } from 'node:stream';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  unlinkSync,
  rmdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { __setFsSafeTestHooksForTest } from '@openclaw/fs-safe/test-hooks';
import { configuredTestContext } from '../configured-context.ts';
import {
  bindRuntimeInitialization,
  readRuntimeInitializationAuthority,
  RuntimeInitializationBindingError,
} from '../../src/runtime-initialization.ts';
import { HostStateStore, openHostStateDatabase } from '../../src/host-state.ts';
import { closeWorkspaceDatabaseWithAdmission } from '../../src/config/storage-read-admission.ts';
import { PROJECT_WORKSPACE_DATABASE_PATH, sessionHandoffDatabaseRelativePath } from '../../src/config/project-paths.js';
import { deriveWorkspaceId, WorkspaceIdentityError } from '../../src/workspace-identity.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../../src/config/runtime-config.ts';
import { canonicalJsonDigest } from '../../src/contracts/public-ingress.ts';
import {
  requireSafeRepositoryAccess,
  SafeRepositoryLockContentionError,
} from '../../src/config/safe-repository-access.ts';
import type { RuntimeInitializationReceipt } from '../../src/config/initialization-record.ts';
import { fixtureInitializationTemplates } from '../helpers/runtime-initialization-fixture.ts';
import { makeFreshRepository } from '../helpers/project-upgrade-fixture.js';
import { expectAsyncReturned, expectReturned } from '../helpers/expect-rejection.ts';
import { completeOwnedCleanup } from '../../tooling/owned-cleanup-completion.ts';

type Racer = {
  child: ChildProcess;
  stdin: Writable | null;
  ready: Promise<void>;
  done: Promise<string>;
};

let root = '';
let receiptPath: string;
let receipt: RuntimeInitializationReceipt;
let database: Database | undefined;
let store: HostStateStore;
let racers: Racer[] = [];
let caseCompleted = false;
let projectAuthorityFixtureRoot: string | undefined;
const { repositoryRoot } = configuredTestContext();
const bundleRoot = path.resolve(import.meta.dirname, '../..');
const fixtureFiles = ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml'].map(
  (file) => [file, readFileSync(path.join(repositoryRoot, file))] as const,
);
const documentationPolicy = readFileSync(
  path.join(repositoryRoot, 'docs/agent-instructions/documentation-policy.v1.json'),
);
const initializationSchemaSha256 = createHash('sha256')
  .update(readFileSync(path.join(bundleRoot, 'schemas/runtime-initialization.v1.schema.json')))
  .digest('hex');
const initializationTemplates = fixtureInitializationTemplates(repositoryRoot, bundleRoot);

async function expectInitializationResult<T>(action: () => Promise<T>): Promise<T> {
  let result!: T;
  await assert.doesNotReject(async () => {
    result = await action();
  });
  return result;
}

async function expectNoRetryDelay<T>(action: () => Promise<T>): Promise<T> {
  const originalSleep = Bun.sleep;
  let retrySleeps = 0;
  let result!: T;
  let failure: { readonly error: unknown } | undefined;
  Bun.sleep = (() => {
    retrySleeps += 1;
    throw new Error('Initialization scheduled a forbidden retry delay');
  }) as typeof Bun.sleep;
  try {
    try {
      result = await action();
    } catch (error) {
      failure = { error };
    }
  } finally {
    Bun.sleep = originalSleep;
  }
  expect(retrySleeps).toBe(0);
  if (failure) throw failure.error;
  return result;
}

async function expectReadAdmissionExpiry(
  action: () => Promise<unknown>,
  assertRetainedState: () => void,
  label: string,
): Promise<unknown> {
  const originalNow = Date.now;
  const startedWallTime = originalNow();
  let caught: unknown;
  let bindingSettled = false;
  let clockAdvanced = false;
  const binding = action();
  const observedBinding = binding.then(
    () => {
      bindingSettled = true;
      return { status: 'fulfilled' as const };
    },
    (error: unknown) => {
      bindingSettled = true;
      return { status: 'rejected' as const, error };
    },
  );
  let bodyFailure: { readonly error: unknown } | undefined;
  let drainFailure: { readonly error: unknown } | undefined;
  try {
    const firstAttempt = await Promise.race([
      observedBinding.then(() => 'settled'),
      new Promise<'pending'>((resolve) => setTimeout(() => resolve('pending'), 25)),
    ]);
    expect(firstAttempt).toBe('pending');
    expect(originalNow()).toBeLessThan(startedWallTime + 5_000);
    assertRetainedState();

    Date.now = () => originalNow() + 6_000;
    clockAdvanced = true;
    try {
      await binding;
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(RuntimeInitializationBindingError);
    if (caught instanceof RuntimeInitializationBindingError)
      expect(caught.cause).toBeInstanceOf(SafeRepositoryLockContentionError);
  } catch (error) {
    bodyFailure = { error };
  } finally {
    try {
      if (!bindingSettled) {
        Date.now = () => originalNow() + 6_000;
        clockAdvanced = true;
        const drained = await observedBinding;
        if (
          drained.status === 'fulfilled' ||
          !(drained.error instanceof RuntimeInitializationBindingError) ||
          !(drained.error.cause instanceof SafeRepositoryLockContentionError)
        )
          drainFailure = {
            error:
              drained.status === 'fulfilled'
                ? new Error(`${label} binding unexpectedly completed while draining`)
                : drained.error,
          };
      } else if (!clockAdvanced && bodyFailure !== undefined) {
        const settled = await observedBinding;
        drainFailure = {
          error:
            settled.status === 'fulfilled'
              ? new Error(`${label} binding unexpectedly completed before expiry`)
              : settled.error,
        };
      }
    } catch (error) {
      drainFailure = { error };
    } finally {
      Date.now = originalNow;
    }
  }
  if (bodyFailure !== undefined && drainFailure !== undefined)
    throw new AggregateError([bodyFailure.error, drainFailure.error], `${label} assertion and binding drain failed`, {
      cause: bodyFailure.error,
    });
  if (bodyFailure !== undefined) throw bodyFailure.error;
  if (drainFailure !== undefined) throw drainFailure.error;
  return caught;
}

beforeEach(() => {
  caseCompleted = false;
  root = '';
  database = undefined;
  racers = [];
  root = mkdtempSync(path.join(tmpdir(), 'vida-init-binding-'));
  for (const [file, bytes] of fixtureFiles) writeFileSync(path.join(root, file), bytes);
  mkdirSync(path.join(root, 'docs', 'agent-instructions'), { recursive: true });
  writeFileSync(path.join(root, 'docs/agent-instructions/documentation-policy.v1.json'), documentationPolicy);
  mkdirSync(path.join(root, '.agent'));
  const config = loadRuntimeConfig(root);
  const workspaceId = canonicalJsonDigest({
    schema: 'WorkspaceIdentity/v1',
    repository_id: config.repository.repository_id,
    repository_root: realpathSync.native(root),
  });
  receiptPath = path.join(root, '.agent', 'runtime-initialization.v1.json');
  receipt = {
    schema: 'RuntimeInitialization/v1',
    version: 1,
    repository_id: config.repository.repository_id,
    project_ids: config.projects.map((project) => project.project_id).sort(),
    integrations_digest: canonicalJsonDigest(config.integrations),
    workspace_id: workspaceId,
    workspace_binding_status: 'pending',
    bundle: config.runtime.bundle,
    config_digest: runtimeConfigDigest(config),
    schema_sha256: initializationSchemaSha256,
    templates: structuredClone(initializationTemplates),
    created_at: new Date().toISOString(),
  };
  writeFileSync(receiptPath, JSON.stringify(receipt) + '\n');
  database = openHostStateDatabase(root, '.agent/host.sqlite', workspaceId);
  store = new HostStateStore(database, workspaceId);
});

afterEach(async () => {
  __setFsSafeTestHooksForTest(undefined);
  for (const racer of racers)
    if (racer.child.exitCode === null && racer.child.signalCode === null) racer.child.kill('SIGKILL');
  const racerOutcomes = await Promise.allSettled(racers.map((racer) => racer.done));
  for (let index = 0; index < racers.length; index += 1) {
    const racer = racers[index]!;
    const outcome = racerOutcomes[index]!;
    console.error('INIT_RACER_DRAIN', {
      index,
      outcome: outcome.status,
      exitCode: racer.child.exitCode,
      signalCode: racer.child.signalCode,
    });
  }
  racers = [];
  if (projectAuthorityFixtureRoot !== undefined) {
    if (!caseCompleted) {
      console.error('INIT_V2_AUTHORITY_FIXTURE_RETAINED', { root: projectAuthorityFixtureRoot, caseCompleted });
    } else {
      rmSync(projectAuthorityFixtureRoot, { recursive: true, force: true });
    }
    projectAuthorityFixtureRoot = undefined;
  }
  let closeFailure: { readonly error: unknown } | undefined;
  if (database) {
    try {
      closeWorkspaceDatabaseWithAdmission(database);
    } catch (error) {
      closeFailure = { error };
    }
    if (closeFailure === undefined) database = undefined;
  }
  if (root.length === 0) {
    console.error('INIT_FIXTURE_ROOT_NOT_CREATED', { caseCompleted, closeFailure });
    if (closeFailure !== undefined) throw closeFailure.error;
    return;
  }
  if (!caseCompleted || closeFailure !== undefined) {
    console.error('INIT_FIXTURE_ROOT_RETAINED', { root, caseCompleted, closeFailure });
    if (closeFailure !== undefined) throw closeFailure.error;
    return;
  }
  console.error('INIT_FIXTURE_ROOT_REMOVE_START', { root });
  try {
    rmSync(root, { recursive: true, force: true });
  } catch (error) {
    console.error('INIT_FIXTURE_ROOT_REMOVE_FAILED', { root, error });
    throw error;
  }
  console.error('INIT_FIXTURE_ROOT_REMOVED', { root });
});

test('derives one stable workspace ID for normalized spelling and different IDs for another checkout', () => {
  expect(expectReturned(() => deriveWorkspaceId(receipt.repository_id, path.join(root, '.')))).toBe(
    receipt.workspace_id,
  );
  const other = mkdtempSync(path.join(tmpdir(), 'vida-other-workspace-'));
  try {
    expect(expectReturned(() => deriveWorkspaceId(receipt.repository_id, other))).not.toBe(receipt.workspace_id);
  } finally {
    rmSync(other, { recursive: true, force: true });
  }
  expect(() => deriveWorkspaceId('Invalid Repository ID', root)).toThrow('repository identity is invalid');
  expect(expectReturned(() => deriveWorkspaceId('another-repository', root))).not.toBe(receipt.workspace_id);
  expect(expectReturned(() => deriveWorkspaceId('a'.repeat(64), root))).toMatch(/^[a-f0-9]{64}$/u);
  expect(() => deriveWorkspaceId('a'.repeat(65), root)).toThrow('repository identity is invalid');
  expect(() => deriveWorkspaceId(receipt.repository_id, 'relative/root')).toThrow(WorkspaceIdentityError);
  expect(() => deriveWorkspaceId(receipt.repository_id, null as unknown as string)).toThrow(WorkspaceIdentityError);
  const missingRoot = path.join(root, 'missing-repository-root');
  expect(existsSync(missingRoot)).toBe(false);
  expect(() => deriveWorkspaceId(receipt.repository_id, missingRoot)).toThrow('repository root is unavailable');
  expect(() => deriveWorkspaceId(receipt.repository_id, receiptPath)).toThrow(
    'repository root must be a non-link directory',
  );
  if (process.platform === 'linux') {
    const linkedRoot = path.join(root, 'linked-checkout');
    symlinkSync(root, linkedRoot, 'dir');
    expect(() => deriveWorkspaceId(receipt.repository_id, linkedRoot)).toThrow(
      'repository root must be a non-link directory',
    );
    unlinkSync(linkedRoot);
  }
  const authority = readRuntimeInitializationAuthority(root, loadRuntimeConfig(root));
  expect(authority).toEqual({
    format: 'RuntimeInitialization/v1',
    receipt,
    binding: {
      repository_id: receipt.repository_id,
      project_ids: receipt.project_ids,
      workspace_id: receipt.workspace_id,
      config_digest: receipt.config_digest,
      integrations_digest: receipt.integrations_digest,
    },
  });
  caseCompleted = true;
});

test('reads v2 initialization authority from a completed real project upgrade', async () => {
  const projectRoot = await makeFreshRepository('vida-init-authority-v2-');
  projectAuthorityFixtureRoot = projectRoot;
  const legacyConfig = loadRuntimeConfig(projectRoot);
  const upgrade = await import('../../src/config/project-upgrade.ts');
  const operationId = 'runtime-init-authority-v2-001';
  const planned = await expectInitializationResult(() =>
    upgrade.planProjectUpgradeRepair(projectRoot, {
      operation_id: operationId,
      actor: 'test-owner: runtime initialization authority',
      instruction_ref: 'tests/bun/runtime-initialization.test.ts',
    }),
  );
  assert.equal(planned?.plan?.operation_id, operationId);
  assert.equal(planned?.plan?.database_mode, 'fresh');
  const completed = await expectInitializationResult(() => upgrade.resumeProjectUpgrade(projectRoot, operationId));
  assert.equal(completed?.phase, 'completed');

  const projectReceiptPath = path.join(projectRoot, '.vida/runtime-initialization.v2.json');
  const projectReceiptBytes = readFileSync(projectReceiptPath);
  expect(() => readRuntimeInitializationAuthority(projectRoot, legacyConfig)).toThrow(
    RuntimeInitializationBindingError,
  );
  expect(readFileSync(projectReceiptPath)).toEqual(projectReceiptBytes);

  const projectConfig = loadRuntimeConfig(projectRoot);
  const authority = expectReturned(() => readRuntimeInitializationAuthority(projectRoot, projectConfig));
  assert.equal(authority?.format, 'RuntimeInitialization/v2');
  expect(authority.binding).toEqual({
    repository_id: projectConfig.repository.repository_id,
    project_ids: projectConfig.projects.map(({ project_id }) => project_id).sort(),
    workspace_id: canonicalJsonDigest({
      schema: 'WorkspaceIdentity/v1',
      repository_id: projectConfig.repository.repository_id,
      repository_root: realpathSync.native(projectRoot),
    }),
    config_digest: runtimeConfigDigest(projectConfig),
  });
  expect(authority.receipt).toMatchObject({
    schema: 'RuntimeInitialization/v2',
    version: 2,
    provenance: 'project-upgrade',
    workspace_binding_status: 'pending',
    operation_id: operationId,
    repository_id: authority.binding.repository_id,
    project_ids: authority.binding.project_ids,
    workspace_id: authority.binding.workspace_id,
    current_config_digest: authority.binding.config_digest,
  });
  const databaseRelativePath = sessionHandoffDatabaseRelativePath(projectConfig);
  expect(databaseRelativePath).toBe(PROJECT_WORKSPACE_DATABASE_PATH);
  const bindingDatabase = openHostStateDatabase(projectRoot, databaseRelativePath, authority.binding.workspace_id);
  let bindingFailure: { error: unknown } | undefined;
  try {
    const bindingStore = new HostStateStore(
      bindingDatabase,
      authority.binding.workspace_id,
      undefined,
      undefined,
      undefined,
      {
        principal: 'test-owner: runtime initialization binding',
        projectIds: projectConfig.projects.map(({ project_id }) => project_id).sort(),
        verify: () => null,
      },
      projectRoot,
    );
    const bound = await expectAsyncReturned(() => bindRuntimeInitialization(projectRoot, bindingStore));
    expect(bound).toEqual({ ...authority.receipt, workspace_binding_status: 'bound' });
    const boundBytes = readFileSync(projectReceiptPath);
    expect(boundBytes).toEqual(Buffer.from(JSON.stringify(bound, null, 2) + '\n'));
    expect(await expectAsyncReturned(() => bindRuntimeInitialization(projectRoot, bindingStore))).toEqual(bound);
    expect(readFileSync(projectReceiptPath)).toEqual(boundBytes);
  } catch (error) {
    bindingFailure = { error };
  }
  completeOwnedCleanup(
    [
      () => {
        closeWorkspaceDatabaseWithAdmission(bindingDatabase);
        return undefined;
      },
    ],
    bindingFailure,
  );
  if (bindingFailure) throw bindingFailure.error;
  caseCompleted = true;
}, 10_000);

test('same workspace binding is idempotent under concurrent callers', async () => {
  const results = await Promise.all([
    expectInitializationResult(() => bindRuntimeInitialization(root, store)),
    expectInitializationResult(() => bindRuntimeInitialization(root, store)),
  ]);
  expect(results[0]).toEqual({ ...receipt, workspace_binding_status: 'bound' });
  expect(results[1]).toEqual(results[0]);
  const boundBytes = readFileSync(receiptPath);
  expect(await expectInitializationResult(() => bindRuntimeInitialization(root, store))).toEqual(results[0]);
  expect(readFileSync(receiptPath)).toEqual(boundBytes);
  caseCompleted = true;
});

test('workspace binding retries a read-only activation preflight while its owned reclaim guard remains', async () => {
  if (process.platform !== 'linux') {
    caseCompleted = true;
    return;
  }
  const vida = path.join(root, '.vida');
  mkdirSync(vida, { recursive: true });
  expect(existsSync(path.join(vida, 'activation.v1.json'))).toBe(false);
  const guardPath = path.join(vida, '.activation.v1.json.cas.lock.reclaim');
  mkdirSync(guardPath);
  const guardIdentity = lstatSync(guardPath);
  const receiptBytes = readFileSync(receiptPath);
  const binding = bindRuntimeInitialization(root, store);
  try {
    const firstAttempt = await Promise.race([
      binding.then(
        () => 'settled',
        () => 'settled',
      ),
      new Promise<'pending'>((resolve) => setTimeout(() => resolve('pending'), 25)),
    ]);
    expect(firstAttempt).toBe('pending');
    expect(readFileSync(receiptPath)).toEqual(receiptBytes);
    const retainedGuard = lstatSync(guardPath);
    expect(retainedGuard.dev).toBe(guardIdentity.dev);
    expect(retainedGuard.ino).toBe(guardIdentity.ino);
  } finally {
    const currentGuard = lstatSync(guardPath);
    if (currentGuard.dev === guardIdentity.dev && currentGuard.ino === guardIdentity.ino) rmdirSync(guardPath);
  }
  expect(await expectInitializationResult(() => binding)).toEqual({ ...receipt, workspace_binding_status: 'bound' });
  caseCompleted = true;
});

test('workspace binding retains receipt and exact reclaim guard after read-only preflight contention expires', async () => {
  if (process.platform !== 'linux') {
    caseCompleted = true;
    return;
  }
  const vida = path.join(root, '.vida');
  mkdirSync(vida, { recursive: true });
  expect(existsSync(path.join(vida, 'activation.v1.json'))).toBe(false);
  const guardPath = path.join(vida, '.activation.v1.json.cas.lock.reclaim');
  mkdirSync(guardPath);
  const guardIdentity = lstatSync(guardPath);
  const receiptBytes = readFileSync(receiptPath);
  const caught = await expectReadAdmissionExpiry(
    () => bindRuntimeInitialization(root, store),
    () => {
      expect(readFileSync(receiptPath)).toEqual(receiptBytes);
      const retainedGuard = lstatSync(guardPath);
      expect(retainedGuard.dev).toBe(guardIdentity.dev);
      expect(retainedGuard.ino).toBe(guardIdentity.ino);
    },
    'read-only preflight',
  );
  expect(caught).toBeInstanceOf(RuntimeInitializationBindingError);
  if (caught instanceof RuntimeInitializationBindingError)
    expect(caught.cause).toBeInstanceOf(SafeRepositoryLockContentionError);
  expect(readFileSync(receiptPath)).toEqual(receiptBytes);
  const retainedGuard = lstatSync(guardPath);
  expect(retainedGuard.dev).toBe(guardIdentity.dev);
  expect(retainedGuard.ino).toBe(guardIdentity.ino);
  const currentGuard = lstatSync(guardPath);
  if (currentGuard.dev === guardIdentity.dev && currentGuard.ino === guardIdentity.ino) rmdirSync(guardPath);
  caseCompleted = true;
});

test('workspace binding does not retry typed contention from the receipt replacement effect', async () => {
  if (process.platform !== 'linux') {
    caseCompleted = true;
    return;
  }
  const guardPath = path.join(path.dirname(receiptPath), '.' + path.basename(receiptPath) + '.cas.lock.reclaim');
  const receiptBytes = readFileSync(receiptPath);
  const safeAccessModule = new URL('../../src/config/safe-repository-access.js', import.meta.url).href;
  const hostModule = new URL('../../src/host-state.ts', import.meta.url).href;
  const admissionModule = new URL('../../src/config/storage-read-admission.ts', import.meta.url).href;
  const initModule = new URL('../../src/runtime-initialization.ts', import.meta.url).href;
  const program = `
    import { mock } from 'bun:test';
    import { lstatSync, mkdirSync } from 'node:fs';
    import path from 'node:path';
    const safeModuleUrl = ${JSON.stringify(safeAccessModule)};
    const actualSafe = Object.freeze({ ...await import(safeModuleUrl) });
    const access = actualSafe.requireSafeRepositoryAccess(${JSON.stringify(root)});
    const replaceAtomic = access.replaceAtomicAsync;
    let replaceAttempts = 0;
    let guardIdentity;
    access.replaceAtomicAsync = async (...args) => {
      replaceAttempts += 1;
      mkdirSync(${JSON.stringify(guardPath)});
      const guardStats = lstatSync(${JSON.stringify(guardPath)});
      guardIdentity = { dev: guardStats.dev, ino: guardStats.ino };
      return replaceAtomic(...args);
    };
    await mock.module(safeModuleUrl, () => ({
      ...actualSafe,
      requireSafeRepositoryAccess: (requestedRoot) =>
        path.resolve(requestedRoot) === ${JSON.stringify(root)}
          ? access
          : actualSafe.requireSafeRepositoryAccess(requestedRoot),
    }));
    const { HostStateStore, openHostStateDatabase } = await import(${JSON.stringify(hostModule)});
    const { closeWorkspaceDatabaseWithAdmission } = await import(${JSON.stringify(admissionModule)});
    const { bindRuntimeInitialization } = await import(${JSON.stringify(initModule)});
    const db = openHostStateDatabase(${JSON.stringify(root)}, '.agent/host.sqlite', ${JSON.stringify(receipt.workspace_id)});
    try {
      const store = new HostStateStore(db, ${JSON.stringify(receipt.workspace_id)});
      let caught;
      try {
        await bindRuntimeInitialization(${JSON.stringify(root)}, store);
      } catch (error) {
        caught = error;
      }
      console.log(JSON.stringify({
        replaceAttempts,
        typedCause: caught?.cause instanceof actualSafe.SafeRepositoryLockContentionError,
        wrapped: caught?.name === 'RuntimeInitializationBindingError',
        guardIdentity,
      }));
    } finally {
      closeWorkspaceDatabaseWithAdmission(db);
    }
  `;
  let stdout = '';
  let stderr = '';
  await new Promise<void>((resolve, reject) => {
    const child = execFile(
      process.execPath,
      ['-e', program],
      {
        cwd: tmpdir(),
        timeout: 4500,
        windowsHide: true,
      },
      (error, output, errors) => {
        stdout = output;
        stderr = errors;
        if (error) reject(new Error(`isolated replacement contention child failed: ${stderr || error.message}`));
        else resolve();
      },
    );
    child.on('error', reject);
  });
  const observed: unknown = JSON.parse(stdout.trim().split('\n').at(-1)!);
  expect(observed).toMatchObject({ replaceAttempts: 1, typedCause: true, wrapped: true });
  expect(readFileSync(receiptPath)).toEqual(receiptBytes);
  if (
    typeof observed !== 'object' ||
    observed === null ||
    !('guardIdentity' in observed) ||
    typeof observed.guardIdentity !== 'object' ||
    observed.guardIdentity === null ||
    !('dev' in observed.guardIdentity) ||
    typeof observed.guardIdentity.dev !== 'number' ||
    !('ino' in observed.guardIdentity) ||
    typeof observed.guardIdentity.ino !== 'number'
  )
    throw new Error('isolated replacement contention child did not report guard identity');
  const retainedGuard = lstatSync(guardPath);
  expect(retainedGuard.dev).toBe(observed.guardIdentity.dev);
  expect(retainedGuard.ino).toBe(observed.guardIdentity.ino);
  const currentGuard = lstatSync(guardPath);
  if (currentGuard.dev === retainedGuard.dev && currentGuard.ino === retainedGuard.ino) rmdirSync(guardPath);
  caseCompleted = true;
});

test('workspace binding denies an unsafe activation reclaim guard without retrying', async () => {
  if (process.platform !== 'linux') {
    caseCompleted = true;
    return;
  }
  const vida = path.join(root, '.vida');
  mkdirSync(vida, { recursive: true });
  expect(existsSync(path.join(vida, 'activation.v1.json'))).toBe(false);
  const guardPath = path.join(vida, '.activation.v1.json.cas.lock.reclaim');
  const target = mkdtempSync(path.join(tmpdir(), 'vida-init-unsafe-guard-'));
  symlinkSync(target, guardPath, 'dir');
  const guardIdentity = lstatSync(guardPath);
  const receiptBytes = readFileSync(receiptPath);
  let caught: unknown;
  try {
    await expectNoRetryDelay(() => bindRuntimeInitialization(root, store));
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(RuntimeInitializationBindingError);
  if (caught instanceof RuntimeInitializationBindingError) {
    expect(caught.cause).toBeInstanceOf(Error);
    expect(caught.cause).not.toBeInstanceOf(SafeRepositoryLockContentionError);
  }
  expect(readFileSync(receiptPath)).toEqual(receiptBytes);
  const retainedGuard = lstatSync(guardPath);
  expect(retainedGuard.dev).toBe(guardIdentity.dev);
  expect(retainedGuard.ino).toBe(guardIdentity.ino);
  unlinkSync(guardPath);
  rmSync(target, { recursive: true, force: true });
  caseCompleted = true;
});

test('workspace binding waits for an owned activation lock quarantine to clear before binding once', async () => {
  if (process.platform !== 'linux') {
    caseCompleted = true;
    return;
  }
  const vida = path.join(root, '.vida');
  mkdirSync(vida, { recursive: true });
  const lockName = '.activation.v1.json.cas.lock';
  const quarantinePath = path.join(vida, `.${lockName}.${randomUUID()}.reclaimed`);
  const quarantineBytes = Buffer.from('owned activation lock quarantine fixture\n');
  writeFileSync(quarantinePath, quarantineBytes, { flag: 'wx' });
  const quarantineIdentity = lstatSync(quarantinePath);
  const receiptBytes = readFileSync(receiptPath);
  const receiptIdentity = lstatSync(receiptPath);
  const databasePath = path.join(root, '.agent/host.sqlite');
  const hostSnapshot = readFileSync(databasePath);
  const binding = bindRuntimeInitialization(root, store);
  const firstAttempt = await Promise.race([
    binding.then(
      () => 'settled',
      () => 'settled',
    ),
    new Promise<'pending'>((resolve) => setTimeout(() => resolve('pending'), 25)),
  ]);
  expect(firstAttempt).toBe('pending');
  expect(readFileSync(receiptPath)).toEqual(receiptBytes);
  const retainedReceipt = lstatSync(receiptPath);
  expect(retainedReceipt.dev).toBe(receiptIdentity.dev);
  expect(retainedReceipt.ino).toBe(receiptIdentity.ino);
  expect(readFileSync(quarantinePath)).toEqual(quarantineBytes);
  const retainedQuarantine = lstatSync(quarantinePath);
  expect(retainedQuarantine.dev).toBe(quarantineIdentity.dev);
  expect(retainedQuarantine.ino).toBe(quarantineIdentity.ino);
  if (retainedQuarantine.dev === quarantineIdentity.dev && retainedQuarantine.ino === quarantineIdentity.ino)
    unlinkSync(quarantinePath);
  const bound = await expectInitializationResult(() => binding);
  expect(bound).toEqual({ ...receipt, workspace_binding_status: 'bound' });
  const boundBytes = readFileSync(receiptPath);
  expect(boundBytes).not.toEqual(receiptBytes);
  expect(await expectInitializationResult(() => bindRuntimeInitialization(root, store))).toEqual(bound);
  expect(readFileSync(receiptPath)).toEqual(boundBytes);
  expect(readFileSync(databasePath)).toEqual(hostSnapshot);
  caseCompleted = true;
}, 6000);

test('workspace binding retains an orphan activation lock quarantine after read admission expires', async () => {
  if (process.platform !== 'linux') {
    caseCompleted = true;
    return;
  }
  const vida = path.join(root, '.vida');
  mkdirSync(vida, { recursive: true });
  const lockName = '.activation.v1.json.cas.lock';
  const quarantinePath = path.join(vida, `.${lockName}.${randomUUID()}.reclaimed`);
  const quarantineBytes = Buffer.from('orphan activation lock quarantine fixture\n');
  writeFileSync(quarantinePath, quarantineBytes, { flag: 'wx' });
  const quarantineIdentity = lstatSync(quarantinePath);
  const receiptBytes = readFileSync(receiptPath);
  const receiptIdentity = lstatSync(receiptPath);
  const databasePath = path.join(root, '.agent/host.sqlite');
  const hostSnapshot = readFileSync(databasePath);
  const caught = await expectReadAdmissionExpiry(
    () => bindRuntimeInitialization(root, store),
    () => {
      expect(readFileSync(receiptPath)).toEqual(receiptBytes);
      const retainedReceipt = lstatSync(receiptPath);
      expect(retainedReceipt.dev).toBe(receiptIdentity.dev);
      expect(retainedReceipt.ino).toBe(receiptIdentity.ino);
      expect(readFileSync(databasePath)).toEqual(hostSnapshot);
      expect(readFileSync(quarantinePath)).toEqual(quarantineBytes);
      const retainedQuarantine = lstatSync(quarantinePath);
      expect(retainedQuarantine.dev).toBe(quarantineIdentity.dev);
      expect(retainedQuarantine.ino).toBe(quarantineIdentity.ino);
    },
    'orphan lock quarantine',
  );
  expect(caught).toBeInstanceOf(RuntimeInitializationBindingError);
  if (caught instanceof RuntimeInitializationBindingError)
    expect(caught.cause).toBeInstanceOf(SafeRepositoryLockContentionError);
  expect(readFileSync(receiptPath)).toEqual(receiptBytes);
  const retainedReceipt = lstatSync(receiptPath);
  expect(retainedReceipt.dev).toBe(receiptIdentity.dev);
  expect(retainedReceipt.ino).toBe(receiptIdentity.ino);
  expect(readFileSync(databasePath)).toEqual(hostSnapshot);
  expect(readFileSync(quarantinePath)).toEqual(quarantineBytes);
  const retainedQuarantine = lstatSync(quarantinePath);
  expect(retainedQuarantine.dev).toBe(quarantineIdentity.dev);
  expect(retainedQuarantine.ino).toBe(quarantineIdentity.ino);
  caseCompleted = true;
});

test('workspace binding retries a disappeared Windows lock before the receipt transition', async () => {
  if (process.platform !== 'win32') {
    caseCompleted = true;
    return;
  }
  const lockPath = receiptPath + '.lock';
  writeFileSync(lockPath, '{}');
  let injected = false;
  __setFsSafeTestHooksForTest({
    afterOpen: (file: string) => {
      if (injected || path.resolve(file) !== lockPath) return;
      injected = true;
      unlinkSync(lockPath);
      const persistedReceipt: unknown = JSON.parse(readFileSync(receiptPath, 'utf8'));
      if (
        typeof persistedReceipt !== 'object' ||
        persistedReceipt === null ||
        !('workspace_binding_status' in persistedReceipt) ||
        typeof persistedReceipt.workspace_binding_status !== 'string'
      )
        throw new Error('Persisted initialization receipt has no string binding status.');
      expect(persistedReceipt.workspace_binding_status).toBe('pending');
      throw Object.assign(new Error('deleted opened lock'), {
        code: 'EPERM',
        syscall: 'stat',
        path: path.join(path.parse(root).root, '$Extend', '$Deleted', 'fixture'),
      });
    },
  });
  const bound = await expectInitializationResult(() => bindRuntimeInitialization(root, store));
  expect(injected).toBe(true);
  expect(bound).toEqual({ ...receipt, workspace_binding_status: 'bound' });
  const boundBytes = readFileSync(receiptPath);
  expect(await expectInitializationResult(() => bindRuntimeInitialization(root, store))).toEqual(bound);
  expect(readFileSync(receiptPath)).toEqual(boundBytes);
  caseCompleted = true;
});

test('foreign or stale receipt is rejected without replacing the pending bytes', async () => {
  for (const [field, value] of [
    ['workspace_id', 'f'.repeat(64)],
    ['repository_id', 'foreign'],
    ['project_ids', ['foreign']],
    ['integrations_digest', 'f'.repeat(64)],
    ['config_digest', 'f'.repeat(64)],
    ['schema_sha256', 'f'.repeat(64)],
    ['workspace_binding_status', 'foreign'],
  ] as const) {
    const bytes = JSON.stringify({ ...receipt, [field]: value }) + '\n';
    writeFileSync(receiptPath, bytes);
    const expectedError = {
      workspace_id: 'initialization workspace identity differs',
      repository_id: 'initialization repository identity differs',
      project_ids: 'initialization project set differs',
      integrations_digest: 'initialization integrations are stale',
      config_digest: 'initialization config digest is stale',
      schema_sha256: 'Initialization receipt schema digest is stale.',
      workspace_binding_status: 'Initialization receipt does not satisfy current v1 schema.',
    }[field];
    await Promise.resolve(expect(bindRuntimeInitialization(root, store)).rejects.toThrow(expectedError));
    expect(readFileSync(receiptPath, 'utf8')).toBe(bytes);
  }
  caseCompleted = true;
});

test('binding errors retain typed cause evidence', async () => {
  const bytes = '{ invalid receipt json\n';
  writeFileSync(receiptPath, bytes);
  let caught: unknown;
  try {
    await bindRuntimeInitialization(root, store);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(RuntimeInitializationBindingError);
  expect(caught).toMatchObject({ code: 'GAP-RUNTIME-INIT-BIND-001' });
  if (caught instanceof RuntimeInitializationBindingError) expect(caught.cause).toBeInstanceOf(Error);
  expect(readFileSync(receiptPath, 'utf8')).toBe(bytes);
  caseCompleted = true;
});

test('binding preserves a non-Error replacement failure and retries only after restoring the owner', async () => {
  const receiptBytes = readFileSync(receiptPath);
  const safeModuleUrl = new URL('../../src/config/safe-repository-access.ts', import.meta.url).href;
  const initModuleUrl = new URL('../../src/runtime-initialization.ts', import.meta.url).href;
  await import('../../src/runtime-initialization.ts');
  const originalSafeExports = Object.freeze({ ...(await import('../../src/config/safe-repository-access.ts')) });
  type IsolatedBindingError =
    (typeof import('../../src/runtime-initialization.ts'))['RuntimeInitializationBindingError'];
  let isolatedBindingError: IsolatedBindingError | undefined;
  let replaceAttempts = 0;
  let caught: unknown;
  try {
    await mock.module(safeModuleUrl, () => ({
      ...originalSafeExports,
      requireSafeRepositoryAccess: (requestedRoot: string) => {
        const access = originalSafeExports.requireSafeRepositoryAccess(requestedRoot);
        if (path.resolve(requestedRoot) !== path.resolve(root)) return access;
        return {
          ...access,
          replaceAtomicAsync: async () => {
            replaceAttempts += 1;
            throw undefined;
          },
        };
      },
    }));
    const isolatedInitialization = (await import(
      `${initModuleUrl}?undefined-fault=${randomUUID()}`
    )) as typeof import('../../src/runtime-initialization.ts');
    isolatedBindingError = isolatedInitialization.RuntimeInitializationBindingError;
    await expectNoRetryDelay(() => isolatedInitialization.bindRuntimeInitialization(root, store));
  } catch (error) {
    caught = error;
  } finally {
    await mock.module(safeModuleUrl, () => originalSafeExports);
  }

  if (isolatedBindingError === undefined)
    throw new Error('Fresh initialization module was not imported.', { cause: caught });
  expect(caught).toBeInstanceOf(isolatedBindingError);
  expect(replaceAttempts).toBe(1);
  if (caught instanceof isolatedBindingError) {
    expect(caught.message).toBe('runtime initialization binding failed: undefined');
    expect(Object.hasOwn(caught, 'cause')).toBe(true);
    expect(caught.cause).toBeUndefined();
  }
  expect(readFileSync(receiptPath)).toEqual(receiptBytes);

  const bound = await expectAsyncReturned(() => bindRuntimeInitialization(root, store));
  expect(bound).toEqual({ ...receipt, workspace_binding_status: 'bound' });
  const boundBytes = readFileSync(receiptPath);
  expect(JSON.parse(boundBytes.toString('utf8'))).toEqual(bound);
  expect(await expectAsyncReturned(() => bindRuntimeInitialization(root, store))).toEqual(bound);
  expect(readFileSync(receiptPath)).toEqual(boundBytes);
  caseCompleted = true;
});

test('binding retries one pre-entry lock collision and performs exactly one real receipt replacement', async () => {
  const safeModuleUrl = new URL('../../src/config/safe-repository-access.ts', import.meta.url).href;
  const initModuleUrl = new URL('../../src/runtime-initialization.ts', import.meta.url).href;
  const originalSafeExports = Object.freeze({ ...(await import('../../src/config/safe-repository-access.ts')) });
  const receiptRelative = path.relative(root, receiptPath).replaceAll('\\', '/');
  const hostBefore = database!.query('SELECT * FROM agent_host_state').all();
  let lockAttempts = 0;
  let callbackEntries = 0;
  let replacements = 0;
  try {
    await mock.module(safeModuleUrl, () => ({
      ...originalSafeExports,
      requireSafeRepositoryAccess: (requestedRoot: string) => {
        const access = originalSafeExports.requireSafeRepositoryAccess(requestedRoot);
        if (path.resolve(requestedRoot) !== path.resolve(root)) return access;
        return {
          ...access,
          withExclusiveLockAsync: async <T>(target: string, label: string, operation: () => Promise<T>) => {
            if (target !== receiptRelative) return access.withExclusiveLockAsync(target, label, operation);
            lockAttempts++;
            if (lockAttempts === 1) throw Object.assign(new Error('pre-entry lock collision'), { code: 'EEXIST' });
            return access.withExclusiveLockAsync(target, label, async () => {
              callbackEntries++;
              return operation();
            });
          },
          replaceAtomicAsync: async (...args: Parameters<typeof access.replaceAtomicAsync>) => {
            replacements++;
            return access.replaceAtomicAsync(...args);
          },
        };
      },
    }));
    const isolated = (await import(
      `${initModuleUrl}?pre-entry-retry=${randomUUID()}`
    )) as typeof import('../../src/runtime-initialization.ts');
    const bound = await expectAsyncReturned(() => isolated.bindRuntimeInitialization(root, store));
    expect(bound).toEqual({ ...receipt, workspace_binding_status: 'bound' });
    expect(readFileSync(receiptPath, 'utf8')).toBe(JSON.stringify(bound, null, 2) + '\n');
    expect({ lockAttempts, callbackEntries, replacements }).toEqual({
      lockAttempts: 2,
      callbackEntries: 1,
      replacements: 1,
    });
    expect(database!.query('SELECT * FROM agent_host_state').all()).toEqual(hostBefore);
  } finally {
    await mock.module(safeModuleUrl, () => originalSafeExports);
  }
  caseCompleted = true;
});

test('binding denies a disagreeing configuration-source observation before replacing the real receipt', async () => {
  const pathsModuleUrl = new URL('../../src/config/project-paths.ts', import.meta.url).href;
  const safeModuleUrl = new URL('../../src/config/safe-repository-access.ts', import.meta.url).href;
  const initModuleUrl = new URL('../../src/runtime-initialization.ts', import.meta.url).href;
  const originalPaths = Object.freeze({ ...(await import('../../src/config/project-paths.ts')) });
  const originalSafe = Object.freeze({ ...(await import('../../src/config/safe-repository-access.ts')) });
  const receiptBytes = readFileSync(receiptPath);
  const hostRows = database!.query('SELECT * FROM agent_host_state').all();
  let injected = 0;
  let replacements = 0;
  try {
    await mock.module(pathsModuleUrl, () => ({
      ...originalPaths,
      runtimeConfigurationSourceFor: (config: Parameters<typeof originalPaths.runtimeConfigurationSourceFor>[0]) => {
        const source = originalPaths.runtimeConfigurationSourceFor(config);
        if (source === originalPaths.LEGACY_RUNTIME_CONFIGURATION_PATH && injected === 0) {
          injected++;
          return originalPaths.PROJECT_CONFIGURATION_PATHS.project;
        }
        return source;
      },
    }));
    await mock.module(safeModuleUrl, () => ({
      ...originalSafe,
      requireSafeRepositoryAccess: (requestedRoot: string) => {
        const access = originalSafe.requireSafeRepositoryAccess(requestedRoot);
        if (path.resolve(requestedRoot) !== path.resolve(root)) return access;
        return {
          ...access,
          replaceAtomicAsync: async (...args: Parameters<typeof access.replaceAtomicAsync>) => {
            replacements++;
            return access.replaceAtomicAsync(...args);
          },
        };
      },
    }));
    const isolated = (await import(
      `${initModuleUrl}?selection-fault=${randomUUID()}`
    )) as typeof import('../../src/runtime-initialization.ts');
    let failure: unknown;
    try {
      await isolated.bindRuntimeInitialization(root, store);
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(isolated.RuntimeInitializationBindingError);
    expect(failure).toHaveProperty('message', 'runtime configuration selection changed');
    expect({ injected, replacements }).toEqual({ injected: 1, replacements: 0 });
    expect(readFileSync(receiptPath)).toEqual(receiptBytes);
    expect(database!.query('SELECT * FROM agent_host_state').all()).toEqual(hostRows);
  } finally {
    await mock.module(safeModuleUrl, () => originalSafe);
    await mock.module(pathsModuleUrl, () => originalPaths);
  }
  const bound = await expectAsyncReturned(() => bindRuntimeInitialization(root, store));
  expect(bound).toEqual({ ...receipt, workspace_binding_status: 'bound' });
  expect(readFileSync(receiptPath, 'utf8')).toBe(JSON.stringify(bound, null, 2) + '\n');
  caseCompleted = true;
});

test('binding propagates a generic pre-entry lock error without retrying or changing receipt bytes', async () => {
  const receiptBytes = readFileSync(receiptPath);
  const safeModuleUrl = new URL('../../src/config/safe-repository-access.ts', import.meta.url).href;
  const initModuleUrl = new URL('../../src/runtime-initialization.ts', import.meta.url).href;
  await import('../../src/runtime-initialization.ts');
  const originalSafeExports = Object.freeze({ ...(await import('../../src/config/safe-repository-access.ts')) });
  type IsolatedBindingError =
    (typeof import('../../src/runtime-initialization.ts'))['RuntimeInitializationBindingError'];
  const lockFailure = new Error('generic pre-entry lock failure');
  let isolatedBindingError: IsolatedBindingError | undefined;
  let lockAttempts = 0;
  let caught: unknown;
  try {
    await mock.module(safeModuleUrl, () => ({
      ...originalSafeExports,
      requireSafeRepositoryAccess: (requestedRoot: string) => {
        const access = originalSafeExports.requireSafeRepositoryAccess(requestedRoot);
        if (path.resolve(requestedRoot) !== path.resolve(root)) return access;
        return {
          ...access,
          withExclusiveLockAsync: async () => {
            lockAttempts += 1;
            throw lockFailure;
          },
        };
      },
    }));
    const isolatedInitialization = (await import(
      `${initModuleUrl}?pre-entry-lock=${randomUUID()}`
    )) as typeof import('../../src/runtime-initialization.ts');
    isolatedBindingError = isolatedInitialization.RuntimeInitializationBindingError;
    await expectNoRetryDelay(() => isolatedInitialization.bindRuntimeInitialization(root, store));
  } catch (error) {
    caught = error;
  } finally {
    await mock.module(safeModuleUrl, () => originalSafeExports);
  }

  if (isolatedBindingError === undefined)
    throw new Error('Fresh initialization module was not imported.', { cause: caught });
  expect(caught).toBeInstanceOf(isolatedBindingError);
  expect(lockAttempts).toBe(1);
  if (caught instanceof isolatedBindingError) expect(caught.cause).toBe(lockFailure);
  expect(readFileSync(receiptPath)).toEqual(receiptBytes);

  const bound = await expectAsyncReturned(() => bindRuntimeInitialization(root, store));
  expect(bound).toEqual({ ...receipt, workspace_binding_status: 'bound' });
  expect(readFileSync(receiptPath, 'utf8')).toEqual(JSON.stringify(bound, null, 2) + '\n');
  caseCompleted = true;
});

test('fails closed when the host store or persisted receipt does not match deterministic workspace identity', async () => {
  const bytes = readFileSync(receiptPath);
  await Promise.resolve(
    expect(bindRuntimeInitialization(root, new Proxy(store, {}))).rejects.toThrow('trusted HostStateStore'),
  );
  await Promise.resolve(
    expect(bindRuntimeInitialization(root, new HostStateStore(database!, 'f'.repeat(64)))).rejects.toThrow(
      'trusted host workspace differs',
    ),
  );
  expect(readFileSync(receiptPath)).toEqual(bytes);
  rmSync(receiptPath);
  await Promise.resolve(
    expect(bindRuntimeInitialization(root, store)).rejects.toThrow('runtime initialization receipt is unavailable'),
  );
  caseCompleted = true;
});

test('competing workspace is denied after the first bind', async () => {
  await expectInitializationResult(() => bindRuntimeInitialization(root, store));
  const bytes = readFileSync(receiptPath);
  await Promise.resolve(
    expect(bindRuntimeInitialization(root, new HostStateStore(database!, 'f'.repeat(64)))).rejects.toThrow(
      'trusted host workspace differs from repository identity',
    ),
  );
  expect(readFileSync(receiptPath)).toEqual(bytes);
  caseCompleted = true;
});

describe('separate process initialization', () => {
  beforeEach(async () => {
    const hostModule = new URL('../../src/host-state.ts', import.meta.url).href;
    const admissionModule = new URL('../../src/config/storage-read-admission.ts', import.meta.url).href;
    const initModule = new URL('../../src/runtime-initialization.ts', import.meta.url).href;
    const program = `
      const mark = (stage) => console.error('INIT_RACER_' + stage, process.hrtime.bigint().toString());
      mark('START');
      const { HostStateStore, openHostStateDatabase } = await import(${JSON.stringify(hostModule)});
      mark('HOST_IMPORT_DONE');
      const { closeWorkspaceDatabaseWithAdmission } = await import(${JSON.stringify(admissionModule)});
      mark('ADMISSION_IMPORT_DONE');
      const { bindRuntimeInitialization } = await import(${JSON.stringify(initModule)});
      mark('INIT_IMPORT_DONE');
      mark('DB_OPEN_START');
      const db = openHostStateDatabase(${JSON.stringify(root)}, '.agent/host.sqlite', ${JSON.stringify(receipt.workspace_id)});
      mark('DB_OPEN_DONE');
      try {
        const store = new HostStateStore(db, ${JSON.stringify(receipt.workspace_id)});
        mark('READY');
        console.log('READY');
        await new Promise(resolve => process.stdin.once('data', resolve));
        mark('BIND_START');
        console.log(JSON.stringify(await bindRuntimeInitialization(${JSON.stringify(root)}, store)));
        mark('BIND_DONE');
      } finally { closeWorkspaceDatabaseWithAdmission(db); }
    `;
    for (let index = 0; index < 2; index += 1) {
      let resolveDone!: (stdout: string) => void;
      let rejectDone!: (error: Error) => void;
      const done = new Promise<string>((resolve, reject) => {
        resolveDone = resolve;
        rejectDone = reject;
      });
      let resolveReady!: () => void;
      let rejectReady!: (error: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      void ready.catch(() => undefined);
      const child = execFile(
        process.execPath,
        ['-e', program],
        { cwd: tmpdir(), timeout: 15000, windowsHide: true },
        (error, stdout, stderr) => {
          if (error) {
            rejectDone(
              new Error(`Initialization racer failed: ${error.message}\n${stdout}\n${stderr}`, { cause: error }),
            );
            return;
          }
          if (stderr.length > 0) console.error(stderr);
          resolveDone(stdout);
        },
      );
      const racer: Racer = { child, stdin: child.stdin, ready, done };
      racers.push(racer);
      done.then(() => rejectReady(new Error('race process exited before release')), rejectReady);
      if (!child.stdout || !child.stdin) {
        const error = new Error('Initialization racer pipes are unavailable');
        rejectReady(error);
        throw error;
      }
      let output = '';
      child.stdout.on('data', (chunk: Buffer) => {
        output += chunk.toString();
        if (output.includes('READY\n')) resolveReady();
      });
      await racer.ready;
    }
  });

  test('separate processes bind one pending receipt without changing its identity', async () => {
    let release!: () => void;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    let markLocked!: () => void;
    const locked = new Promise<void>((resolve) => {
      markLocked = resolve;
    });
    const access = requireSafeRepositoryAccess(root);
    const lock = access.withExclusiveLockAsync(
      path.relative(root, receiptPath),
      'initialization concurrency fixture',
      async () => {
        markLocked();
        await released;
      },
    );
    let observedBinding: Promise<unknown> | undefined;
    let binding: Promise<unknown> | undefined;
    let failure: { error: unknown } | undefined;
    let drainErrors: unknown[] = [];
    try {
      await expectAsyncReturned(() =>
        Promise.race([
          locked,
          lock.then(() => {
            throw new Error('Receipt lock finished before its release handshake.');
          }),
        ]),
      );
      const receiptBytes = readFileSync(receiptPath);
      binding = bindRuntimeInitialization(root, store);
      observedBinding = binding.then(
        () => 'settled',
        () => 'settled',
      );
      expect(
        await Promise.race([
          observedBinding,
          new Promise<'pending'>((resolve) => setTimeout(() => resolve('pending'), 25)),
        ]),
      ).toBe('pending');
      expect(readFileSync(receiptPath)).toEqual(receiptBytes);
      for (const racer of racers) {
        if (!racer.stdin) throw new Error('Initialization racer stdin is unavailable');
        racer.stdin.end('go\n');
      }
    } catch (error) {
      failure = { error };
    } finally {
      release();
      const drained = await Promise.allSettled([lock, ...(observedBinding ? [observedBinding] : [])]);
      drainErrors = drained.flatMap((outcome) => (outcome.status === 'rejected' ? [outcome.reason as unknown] : []));
    }
    if (drainErrors.length)
      throw new AggregateError(
        [...(failure ? [failure.error] : []), ...drainErrors],
        'Initialization concurrency fixture did not settle cleanly',
        failure ? { cause: failure.error } : undefined,
      );
    if (failure) throw failure.error;
    expect(await expectAsyncReturned(() => binding!)).toEqual({ ...receipt, workspace_binding_status: 'bound' });
    const outputs = await expectAsyncReturned(() => Promise.all(racers.map((racer) => racer.done)));
    for (const output of outputs)
      expect(JSON.parse(output.slice(output.indexOf('\n') + 1))).toEqual({
        ...receipt,
        workspace_binding_status: 'bound',
      });
    expect(JSON.parse(readFileSync(receiptPath, 'utf8'))).toEqual({ ...receipt, workspace_binding_status: 'bound' });
    caseCompleted = true;
  });
});
