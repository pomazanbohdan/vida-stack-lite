import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import assert from 'node:assert/strict';
import { Database } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { execFile, type ChildProcess } from 'node:child_process';
import type { Writable } from 'node:stream';
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
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
import { bindRuntimeInitialization, RuntimeInitializationBindingError } from '../../src/runtime-initialization.ts';
import { HostStateStore, openHostStateDatabase } from '../../src/host-state.ts';
import { closeWorkspaceDatabaseWithAdmission } from '../../src/config/storage-read-admission.ts';
import { deriveWorkspaceId } from '../../src/workspace-identity.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../../src/config/runtime-config.ts';
import { canonicalJsonDigest } from '../../src/contracts/public-ingress.ts';
import { SafeRepositoryLockContentionError } from '../../src/config/safe-repository-access.ts';
import type { RuntimeInitializationReceipt } from '../../src/config/initialization-record.ts';
import { fixtureInitializationTemplates } from '../helpers/runtime-initialization-fixture.ts';
import { expectReturned } from '../helpers/expect-rejection.ts';

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

async function expectInitializationResult<T>(action: () => Promise<T>): Promise<T> {
  let result!: T;
  await assert.doesNotReject(async () => {
    result = await action();
  });
  return result;
}

beforeEach(() => {
  caseCompleted = false;
  root = '';
  database = undefined;
  racers = [];
  root = mkdtempSync(path.join(tmpdir(), 'vida-init-binding-'));
  const { repositoryRoot } = configuredTestContext();
  for (const file of ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml'])
    copyFileSync(path.join(repositoryRoot, file), path.join(root, file));
  mkdirSync(path.join(root, 'docs', 'agent-instructions'), { recursive: true });
  copyFileSync(
    path.join(repositoryRoot, 'docs/agent-instructions/documentation-policy.v1.json'),
    path.join(root, 'docs/agent-instructions/documentation-policy.v1.json'),
  );
  mkdirSync(path.join(root, '.agent'));
  const config = loadRuntimeConfig(root);
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  const bundleRoot = path.join(repositoryRoot, config.runtime.bundle);
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
    schema_sha256: createHash('sha256')
      .update(readFileSync(path.join(bundleRoot, 'schemas/runtime-initialization.v1.schema.json')))
      .digest('hex'),
    templates: fixtureInitializationTemplates(root, bundleRoot),
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
  let closeError: unknown;
  if (database) {
    try {
      closeWorkspaceDatabaseWithAdmission(database);
    } catch (error) {
      closeError = error;
    }
    if (closeError === undefined) database = undefined;
  }
  if (root.length === 0) {
    console.error('INIT_FIXTURE_ROOT_NOT_CREATED', { caseCompleted, closeError });
    if (closeError !== undefined) throw closeError;
    return;
  }
  if (!caseCompleted || closeError !== undefined) {
    console.error('INIT_FIXTURE_ROOT_RETAINED', { root, caseCompleted, closeError });
    if (closeError !== undefined) throw closeError;
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
  caseCompleted = true;
});

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
  let caught: unknown;
  try {
    await bindRuntimeInitialization(root, store);
  } catch (error) {
    caught = error;
  }
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
}, 6000);

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
  const originalSetTimeout = globalThis.setTimeout;
  let retryTimers = 0;
  globalThis.setTimeout = ((...args: Parameters<typeof setTimeout>) => {
    retryTimers += 1;
    return originalSetTimeout(...args);
  }) as typeof setTimeout;
  let caught: unknown;
  try {
    try {
      await bindRuntimeInitialization(root, store);
    } catch (error) {
      caught = error;
    }
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
  expect(caught).toBeInstanceOf(RuntimeInitializationBindingError);
  if (caught instanceof RuntimeInitializationBindingError) {
    expect(caught.cause).toBeInstanceOf(Error);
    expect(caught.cause).not.toBeInstanceOf(SafeRepositoryLockContentionError);
  }
  expect(retryTimers).toBe(0);
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
  let caught: unknown;
  try {
    await bindRuntimeInitialization(root, store);
  } catch (error) {
    caught = error;
  }
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
}, 6000);

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
    for (const racer of racers) {
      if (!racer.stdin) throw new Error('Initialization racer stdin is unavailable');
      racer.stdin.end('go\n');
    }
    const outputs = await Promise.all(racers.map((racer) => racer.done));
    for (const output of outputs)
      expect(JSON.parse(output.slice(output.indexOf('\n') + 1))).toEqual({
        ...receipt,
        workspace_binding_status: 'bound',
      });
    expect(JSON.parse(readFileSync(receiptPath, 'utf8'))).toEqual({ ...receipt, workspace_binding_status: 'bound' });
    caseCompleted = true;
  });
});
