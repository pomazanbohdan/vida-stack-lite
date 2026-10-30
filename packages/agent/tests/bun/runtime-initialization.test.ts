import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import assert from 'node:assert/strict';
import { Database } from 'bun:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { isSeq, parseDocument } from 'yaml';
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
import {
  PROJECT_UPGRADE_OPERATION_PATH,
  PROJECT_WORKSPACE_DATABASE_PATH,
  sessionHandoffDatabaseRelativePath,
} from '../../src/config/project-paths.js';
import { deriveWorkspaceId, WorkspaceIdentityError } from '../../src/workspace-identity.ts';
import { loadRuntimeConfig, RuntimeConfigError, runtimeConfigDigest } from '../../src/config/runtime-config.ts';
import { canonicalJsonDigest } from '../../src/contracts/public-ingress.ts';
import {
  requireSafeRepositoryAccess,
  SafeRepositoryLockContentionError,
  type SafeRepositoryAccess,
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
  receiptLockAttempt: Promise<void>;
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
  // Preserve a primary assertion, but always reject an attempted forbidden retry.
  if (!failure || retrySleeps !== 0) expect(retrySleeps).toBe(0);
  if (failure) throw failure.error;
  return result;
}

async function expectAdmissionExpiry(
  action: () => Promise<unknown>,
  assertRetainedState: () => void,
  label: string,
): Promise<unknown> {
  const originalNow = Date.now;
  const startedWallTime = originalNow();
  const deadline = startedWallTime + 5_000;
  let caught: unknown;
  let bindingSettled = false;
  let clockAdvanced = false;
  Date.now = () => startedWallTime;
  let binding: Promise<unknown>;
  try {
    binding = action();
  } catch (error) {
    Date.now = originalNow;
    throw error;
  }
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
      observedBinding.then(({ status }) => status),
      new Promise<'pending'>((resolve) => setTimeout(() => resolve('pending'), 25)),
    ]);
    expect(firstAttempt).toBe('pending');
    expect(originalNow()).toBeLessThan(deadline);
    assertRetainedState();

    Date.now = () => deadline;
    clockAdvanced = true;
    expect(Date.now()).toBe(deadline);
    try {
      await expectNoRetryDelay(() => binding);
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
        Date.now = () => deadline;
        clockAdvanced = true;
        const drained = await expectNoRetryDelay(() => observedBinding);
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
  const loadedConfig = loadRuntimeConfig(root);
  const other = mkdtempSync(path.join(tmpdir(), 'vida-other-workspace-'));
  try {
    expect(expectReturned(() => deriveWorkspaceId(receipt.repository_id, other))).not.toBe(receipt.workspace_id);
    expect(() => readRuntimeInitializationAuthority(other, loadedConfig)).toThrow(
      'runtime config is not bound to the repository root',
    );
  } finally {
    rmSync(other, { recursive: true, force: true });
  }
  let invalidIdentity: unknown;
  try {
    deriveWorkspaceId('Invalid Repository ID', root);
  } catch (error) {
    invalidIdentity = error;
  }
  expect(invalidIdentity).toBeInstanceOf(WorkspaceIdentityError);
  expect(invalidIdentity).toMatchObject({
    name: 'WorkspaceIdentityError',
    code: 'GAP-WORKSPACE-IDENTITY-001',
    message: 'repository identity is invalid',
  });
  let numericIdentityFailure: unknown;
  try {
    deriveWorkspaceId(123 as unknown as string, root);
  } catch (error) {
    numericIdentityFailure = error;
  }
  expect(numericIdentityFailure).toBeInstanceOf(WorkspaceIdentityError);
  expect(numericIdentityFailure).toMatchObject({
    name: 'WorkspaceIdentityError',
    code: 'GAP-WORKSPACE-IDENTITY-001',
    message: 'repository identity is invalid',
  });

  let identityCoercions = 0;
  const observableIdentity = {
    toString: () => {
      identityCoercions++;
      return 'valid-repository';
    },
  } as unknown as string;
  let observableIdentityFailure: unknown;
  try {
    deriveWorkspaceId(observableIdentity, root);
  } catch (error) {
    observableIdentityFailure = error;
  }
  expect(observableIdentityFailure).toBeInstanceOf(WorkspaceIdentityError);
  expect(observableIdentityFailure).toMatchObject({
    name: 'WorkspaceIdentityError',
    code: 'GAP-WORKSPACE-IDENTITY-001',
    message: 'repository identity is invalid',
  });
  expect(identityCoercions).toBe(0);

  for (const validIdentity of ['a', '0'])
    expect(expectReturned(() => deriveWorkspaceId(validIdentity, root))).toMatch(/^[a-f0-9]{64}$/u);
  for (const invalidId of ['A', '', '-a', 'a_'])
    expect(() => deriveWorkspaceId(invalidId, root)).toThrow('repository identity is invalid');
  expect(expectReturned(() => deriveWorkspaceId('another-repository', root))).not.toBe(receipt.workspace_id);
  expect(expectReturned(() => deriveWorkspaceId('a'.repeat(64), root))).toMatch(/^[a-f0-9]{64}$/u);
  expect(() => deriveWorkspaceId('a'.repeat(65), root)).toThrow('repository identity is invalid');
  let relativeRootError: unknown;
  try {
    deriveWorkspaceId(receipt.repository_id, 'relative/root');
  } catch (error) {
    relativeRootError = error;
  }
  expect(relativeRootError).toBeInstanceOf(WorkspaceIdentityError);
  expect(relativeRootError).toMatchObject({
    name: 'WorkspaceIdentityError',
    code: 'GAP-WORKSPACE-IDENTITY-001',
    message: 'repository root must be absolute',
  });
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
  const authority = expectReturned(() => readRuntimeInitializationAuthority(root, loadedConfig));
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
  let legacyConfigFailure: unknown;
  try {
    readRuntimeInitializationAuthority(projectRoot, legacyConfig);
  } catch (error) {
    legacyConfigFailure = error;
  }
  expect(legacyConfigFailure).toBeInstanceOf(RuntimeInitializationBindingError);
  expect(legacyConfigFailure).toMatchObject({
    name: 'RuntimeInitializationBindingError',
    code: 'GAP-RUNTIME-INIT-BIND-001',
    message: 'runtime configuration selection changed',
  });
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
  const configPath = path.join(root, 'agent-runtime.config.v1.yaml');
  const originalConfig = loadRuntimeConfig(root);
  const originalProjectIds = originalConfig.projects.map(({ project_id }) => project_id);
  expect([...originalProjectIds].sort()).toEqual([...receipt.project_ids]);
  const originalConfigDigest = receipt.config_digest;
  const sourceDocument = parseDocument(readFileSync(configPath, 'utf8'));
  const projectsNode = sourceDocument.get('projects', true);
  if (!isSeq(projectsNode) || projectsNode.items.length < 2)
    throw new Error('Runtime configuration needs at least two projects for order coverage.');
  projectsNode.items.reverse();
  const reversedProjectIds = [...originalProjectIds].reverse();
  writeFileSync(configPath, sourceDocument.toString());

  // The per-root config cache reloads when its source digest changes.
  const reorderedConfig = loadRuntimeConfig(root);
  expect(reorderedConfig.projects.map(({ project_id }) => project_id)).toEqual(reversedProjectIds);
  const reorderedConfigDigest = runtimeConfigDigest(reorderedConfig);
  expect(reorderedConfigDigest).not.toBe(originalConfigDigest);
  receipt = { ...receipt, config_digest: reorderedConfigDigest };
  writeFileSync(receiptPath, JSON.stringify(receipt) + '\n');

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
        () => 'fulfilled',
        () => 'rejected',
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
  const caught = await expectAdmissionExpiry(
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

test('workspace binding retains receipt and lock reclaim guard when contention expires at the deadline', async () => {
  if (process.platform !== 'linux') {
    caseCompleted = true;
    return;
  }
  const guardPath = path.join(path.dirname(receiptPath), path.basename(receiptPath) + '.lock.reclaim');
  mkdirSync(guardPath);
  const guardIdentity = lstatSync(guardPath);
  const receiptBytes = readFileSync(receiptPath);
  const receiptIdentity = lstatSync(receiptPath);
  const databasePath = path.join(root, '.agent/host.sqlite');
  const hostSnapshot = readFileSync(databasePath);
  const caught = await expectAdmissionExpiry(
    () => bindRuntimeInitialization(root, store),
    () => {
      expect(readFileSync(receiptPath)).toEqual(receiptBytes);
      const retainedReceipt = lstatSync(receiptPath);
      expect(retainedReceipt.dev).toBe(receiptIdentity.dev);
      expect(retainedReceipt.ino).toBe(receiptIdentity.ino);
      expect(readFileSync(databasePath)).toEqual(hostSnapshot);
      const retainedGuard = lstatSync(guardPath);
      expect(retainedGuard.dev).toBe(guardIdentity.dev);
      expect(retainedGuard.ino).toBe(guardIdentity.ino);
    },
    'receipt lock admission',
  );
  expect(caught).toBeInstanceOf(RuntimeInitializationBindingError);
  if (caught instanceof RuntimeInitializationBindingError)
    expect(caught.cause).toBeInstanceOf(SafeRepositoryLockContentionError);
  expect(readFileSync(receiptPath)).toEqual(receiptBytes);
  const retainedReceipt = lstatSync(receiptPath);
  expect(retainedReceipt.dev).toBe(receiptIdentity.dev);
  expect(retainedReceipt.ino).toBe(receiptIdentity.ino);
  expect(readFileSync(databasePath)).toEqual(hostSnapshot);
  const retainedGuard = lstatSync(guardPath);
  expect(retainedGuard.dev).toBe(guardIdentity.dev);
  expect(retainedGuard.ino).toBe(guardIdentity.ino);
  const currentGuard = lstatSync(guardPath);
  if (currentGuard.dev === guardIdentity.dev && currentGuard.ino === guardIdentity.ino) rmdirSync(guardPath);
  caseCompleted = true;
});

type ReplacementFailureResult = {
  readonly caught: RuntimeInitializationBindingError;
  readonly injectedContention: SafeRepositoryLockContentionError | undefined;
  readonly injectedCause: Error | undefined;
  readonly receiptBytes: Buffer<ArrayBuffer>;
  readonly guardIdentity: { readonly dev: number; readonly ino: number } | undefined;
};

async function captureReplacementFailure(
  failureMode: 'undefined' | 'typed-contention' | 'real-guard-contention',
): Promise<ReplacementFailureResult> {
  const receiptBytes = readFileSync(receiptPath);
  const guardPath = path.join(path.dirname(receiptPath), '.' + path.basename(receiptPath) + '.cas.lock.reclaim');
  expect(existsSync(guardPath)).toBe(false);
  const safeModuleUrl = new URL('../../src/config/safe-repository-access.ts', import.meta.url).href;
  const initModuleUrl = new URL('../../src/runtime-initialization.ts', import.meta.url).href;
  await import('../../src/runtime-initialization.ts');
  const originalSafeExports = Object.freeze({ ...(await import('../../src/config/safe-repository-access.ts')) });
  const injectedCause =
    failureMode === 'typed-contention' ? new Error('replacement owner still holds the receipt lock') : undefined;
  const injectedContention =
    injectedCause !== undefined
      ? new originalSafeExports.SafeRepositoryLockContentionError('bind runtime initialization', injectedCause)
      : undefined;
  let isolatedBindingError: typeof RuntimeInitializationBindingError | undefined;
  let replaceAttempts = 0;
  let guardIdentity: { readonly dev: number; readonly ino: number } | undefined;
  let caught: unknown;
  try {
    await mock.module(safeModuleUrl, () => ({
      ...originalSafeExports,
      requireSafeRepositoryAccess: (requestedRoot: string) => {
        const access = originalSafeExports.requireSafeRepositoryAccess(requestedRoot);
        if (path.resolve(requestedRoot) !== path.resolve(root)) return access;
        const replaceAtomic = access.replaceAtomicAsync;
        return {
          ...access,
          replaceAtomicAsync: async (...args: Parameters<typeof replaceAtomic>) => {
            replaceAttempts += 1;
            if (injectedContention !== undefined) throw injectedContention;
            if (failureMode === 'real-guard-contention') {
              mkdirSync(guardPath);
              const stats = lstatSync(guardPath);
              guardIdentity = { dev: stats.dev, ino: stats.ino };
              return replaceAtomic(...args);
            }
            throw undefined;
          },
        };
      },
    }));
    const isolatedInitialization = (await import(
      `${initModuleUrl}?replacement-fault=${randomUUID()}`
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
  if (!(caught instanceof isolatedBindingError))
    throw new Error('Replacement failure was not wrapped as a runtime initialization binding error.', {
      cause: caught,
    });
  expect(caught).toMatchObject({ name: 'RuntimeInitializationBindingError', code: 'GAP-RUNTIME-INIT-BIND-001' });
  expect(replaceAttempts).toBe(1);
  expect(readFileSync(receiptPath)).toEqual(receiptBytes);
  return { caught, injectedContention, injectedCause, receiptBytes, guardIdentity };
}

test('workspace binding does not retry typed contention from the receipt replacement effect', async () => {
  if (process.platform !== 'linux') {
    caseCompleted = true;
    return;
  }
  const { caught, injectedContention, injectedCause } = await captureReplacementFailure('typed-contention');
  expect(injectedContention).toBeInstanceOf(SafeRepositoryLockContentionError);
  expect(injectedCause).toBeInstanceOf(Error);
  if (injectedContention === undefined || injectedCause === undefined)
    throw new Error('Typed replacement contention fixture was not created.');
  expect(injectedContention.cause).toBe(injectedCause);
  expect(injectedCause.message).toBe('replacement owner still holds the receipt lock');
  expect(caught.cause).toBe(injectedContention);
  const realContention = await captureReplacementFailure('real-guard-contention');
  expect(realContention.caught.cause).toBeInstanceOf(SafeRepositoryLockContentionError);
  expect(readFileSync(receiptPath)).toEqual(realContention.receiptBytes);
  const guardIdentity = realContention.guardIdentity;
  if (guardIdentity === undefined) throw new Error('real replacement contention did not create a reclaim guard');
  const guardPath = path.join(path.dirname(receiptPath), '.' + path.basename(receiptPath) + '.cas.lock.reclaim');
  const retainedGuard = lstatSync(guardPath);
  expect(retainedGuard.dev).toBe(guardIdentity.dev);
  expect(retainedGuard.ino).toBe(guardIdentity.ino);
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
      () => 'fulfilled',
      () => 'rejected',
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
  const caught = await expectAdmissionExpiry(
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
    await expectNoRetryDelay(() =>
      Promise.resolve(expect(bindRuntimeInitialization(root, store)).rejects.toThrow(expectedError)),
    );
    expect(readFileSync(receiptPath, 'utf8')).toBe(bytes);
  }
  caseCompleted = true;
});

test('binding errors retain typed cause evidence', async () => {
  const bytes = '{ invalid receipt json\n';
  writeFileSync(receiptPath, bytes);
  let caught: unknown;
  try {
    await expectNoRetryDelay(() => bindRuntimeInitialization(root, store));
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(RuntimeInitializationBindingError);
  expect(caught).toMatchObject({ name: 'RuntimeInitializationBindingError', code: 'GAP-RUNTIME-INIT-BIND-001' });
  if (caught instanceof RuntimeInitializationBindingError) expect(caught.cause).toBeInstanceOf(Error);
  expect(readFileSync(receiptPath, 'utf8')).toBe(bytes);
  caseCompleted = true;
});

test('binding preserves a non-Error replacement failure and retries only after restoring the owner', async () => {
  const { caught, receiptBytes } = await captureReplacementFailure('undefined');
  expect(caught.message).toBe('runtime initialization binding failed: undefined');
  expect(Object.hasOwn(caught, 'cause')).toBe(true);
  expect(caught.cause).toBeUndefined();
  expect(readFileSync(receiptPath)).toEqual(receiptBytes);

  const bound = await expectAsyncReturned(() => bindRuntimeInitialization(root, store));
  expect(bound).toEqual({ ...receipt, workspace_binding_status: 'bound' });
  const boundBytes = readFileSync(receiptPath);
  expect(JSON.parse(boundBytes.toString('utf8'))).toEqual(bound);
  expect(await expectAsyncReturned(() => bindRuntimeInitialization(root, store))).toEqual(bound);
  expect(readFileSync(receiptPath)).toEqual(boundBytes);
  caseCompleted = true;
});

async function expectPreEntryLockRetry(code: 'EEXIST' | 'file_lock_timeout'): Promise<unknown> {
  const safeModuleUrl = new URL('../../src/config/safe-repository-access.ts', import.meta.url).href;
  const initModuleUrl = new URL('../../src/runtime-initialization.ts', import.meta.url).href;
  const originalSafeExports = Object.freeze({ ...(await import('../../src/config/safe-repository-access.ts')) });
  const receiptRelative = path.relative(root, receiptPath).replaceAll('\\', '/');
  const receiptBytes = readFileSync(receiptPath);
  const hostBefore = database!.query('SELECT * FROM agent_host_state').all();
  let lockAttempts = 0;
  let callbackEntries = 0;
  let replacements = 0;
  const receiptLockCalls: Array<{ readonly target: string; readonly label: string }> = [];
  const fileExistsCalls: Array<{ readonly target: string; readonly label: string }> = [];
  const replacementCalls: Array<Parameters<SafeRepositoryAccess['replaceAtomicAsync']>> = [];
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
            receiptLockCalls.push({ target, label });
            lockAttempts++;
            if (lockAttempts === 1) throw Object.assign(new Error('pre-entry lock collision'), { code });
            return access.withExclusiveLockAsync(target, label, async () => {
              callbackEntries++;
              return operation();
            });
          },
          fileExists: (target: string, label: string) => {
            if (target === receiptRelative) fileExistsCalls.push({ target, label });
            return access.fileExists(target, label);
          },
          replaceAtomicAsync: async (...args: Parameters<typeof access.replaceAtomicAsync>) => {
            replacements++;
            replacementCalls.push(args);
            return access.replaceAtomicAsync(...args);
          },
        };
      },
    }));
    const isolated = (await import(
      `${initModuleUrl}?pre-entry-retry=${randomUUID()}`
    )) as typeof import('../../src/runtime-initialization.ts');
    const upgradeMarkerPath = path.join(root, PROJECT_UPGRADE_OPERATION_PATH);
    mkdirSync(path.dirname(upgradeMarkerPath), { recursive: true });
    const upgradeMarkerBytes = Buffer.from('controlled incomplete project-upgrade barrier fixture\n');
    writeFileSync(upgradeMarkerPath, upgradeMarkerBytes, { flag: 'wx' });
    const upgradeMarkerIdentity = lstatSync(upgradeMarkerPath);
    let upgradeDenied: unknown;
    try {
      await expectNoRetryDelay(() => isolated.bindRuntimeInitialization(root, store));
    } catch (error) {
      upgradeDenied = error;
    }
    expect(upgradeDenied).toBeInstanceOf(isolated.RuntimeInitializationBindingError);
    expect(upgradeDenied).toMatchObject({
      name: 'RuntimeInitializationBindingError',
      code: 'GAP-RUNTIME-INIT-BIND-001',
      message:
        'runtime initialization binding failed: Project upgrade is in progress. Inspect or resume the same operation before ordinary configuration access.',
    });
    if (upgradeDenied instanceof isolated.RuntimeInitializationBindingError) {
      expect(upgradeDenied.cause).toBeInstanceOf(RuntimeConfigError);
      expect(upgradeDenied.cause).toMatchObject({
        code: 'GAP-RUNTIME-CONFIG-001',
        message:
          'Project upgrade is in progress. Inspect or resume the same operation before ordinary configuration access.',
      });
    }
    expect({ lockAttempts, callbackEntries, replacements }).toEqual({
      lockAttempts: 0,
      callbackEntries: 0,
      replacements: 0,
    });
    expect(receiptLockCalls).toEqual([]);
    expect(fileExistsCalls).toEqual([]);
    expect(replacementCalls).toEqual([]);
    expect(readFileSync(receiptPath)).toEqual(receiptBytes);
    expect(database!.query('SELECT * FROM agent_host_state').all()).toEqual(hostBefore);
    expect(readFileSync(upgradeMarkerPath)).toEqual(upgradeMarkerBytes);
    const retainedUpgradeMarker = lstatSync(upgradeMarkerPath);
    expect(retainedUpgradeMarker.dev).toBe(upgradeMarkerIdentity.dev);
    expect(retainedUpgradeMarker.ino).toBe(upgradeMarkerIdentity.ino);
    unlinkSync(upgradeMarkerPath);

    const bound = await expectAsyncReturned(() => isolated.bindRuntimeInitialization(root, store));
    expect(readFileSync(receiptPath, 'utf8')).toBe(JSON.stringify(bound, null, 2) + '\n');
    expect(receiptLockCalls).toEqual([
      { target: receiptRelative, label: 'bind runtime initialization' },
      { target: receiptRelative, label: 'bind runtime initialization' },
    ]);
    expect(fileExistsCalls).toEqual([{ target: receiptRelative, label: 'runtime initialization receipt' }]);
    expect(replacementCalls).toEqual([
      [
        receiptRelative,
        createHash('sha256').update(receiptBytes).digest('hex'),
        JSON.stringify(bound, null, 2) + '\n',
        'bind runtime initialization',
      ],
    ]);
    expect({ lockAttempts, callbackEntries, replacements }).toEqual({
      lockAttempts: 2,
      callbackEntries: 1,
      replacements: 1,
    });
    const boundBytes = readFileSync(receiptPath);
    expect(await expectAsyncReturned(() => isolated.bindRuntimeInitialization(root, store))).toEqual(bound);
    expect(readFileSync(receiptPath)).toEqual(boundBytes);
    expect(receiptLockCalls).toEqual([
      { target: receiptRelative, label: 'bind runtime initialization' },
      { target: receiptRelative, label: 'bind runtime initialization' },
      { target: receiptRelative, label: 'bind runtime initialization' },
    ]);
    expect(fileExistsCalls).toEqual([
      { target: receiptRelative, label: 'runtime initialization receipt' },
      { target: receiptRelative, label: 'runtime initialization receipt' },
    ]);
    expect(replacementCalls).toHaveLength(1);
    expect({ lockAttempts, callbackEntries, replacements }).toEqual({
      lockAttempts: 3,
      callbackEntries: 2,
      replacements: 1,
    });
    expect(database!.query('SELECT * FROM agent_host_state').all()).toEqual(hostBefore);
    return bound;
  } finally {
    await mock.module(safeModuleUrl, () => originalSafeExports);
  }
}

test('binding retries one pre-entry EEXIST collision and performs exactly one real receipt replacement', async () => {
  expect(await expectAsyncReturned(() => expectPreEntryLockRetry('EEXIST'))).toEqual({
    ...receipt,
    workspace_binding_status: 'bound',
  });
  caseCompleted = true;
});

test('binding retries one pre-entry file_lock_timeout collision and performs exactly one real receipt replacement', async () => {
  expect(await expectAsyncReturned(() => expectPreEntryLockRetry('file_lock_timeout'))).toEqual({
    ...receipt,
    workspace_binding_status: 'bound',
  });
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
  await expectNoRetryDelay(() =>
    Promise.resolve(
      expect(bindRuntimeInitialization(root, new HostStateStore(database!, 'f'.repeat(64)))).rejects.toThrow(
        'trusted host workspace differs',
      ),
    ),
  );
  expect(readFileSync(receiptPath)).toEqual(bytes);
  rmSync(receiptPath);
  let missingReceiptFailure: unknown;
  try {
    await expectNoRetryDelay(() => bindRuntimeInitialization(root, store));
  } catch (error) {
    missingReceiptFailure = error;
  }
  expect(missingReceiptFailure).toBeInstanceOf(RuntimeInitializationBindingError);
  expect(missingReceiptFailure).toMatchObject({
    name: 'RuntimeInitializationBindingError',
    code: 'GAP-RUNTIME-INIT-BIND-001',
    message: 'runtime initialization receipt is unavailable',
  });
  expect(existsSync(receiptPath)).toBe(false);
  caseCompleted = true;
});

test('competing workspace is denied after the first bind', async () => {
  await expectInitializationResult(() => bindRuntimeInitialization(root, store));
  const bytes = readFileSync(receiptPath);
  await expectNoRetryDelay(() =>
    Promise.resolve(
      expect(bindRuntimeInitialization(root, new HostStateStore(database!, 'f'.repeat(64)))).rejects.toThrow(
        'trusted host workspace differs from repository identity',
      ),
    ),
  );
  expect(readFileSync(receiptPath)).toEqual(bytes);
  caseCompleted = true;
});

describe('separate process initialization', () => {
  beforeEach(async () => {
    const hostModule = new URL('../../src/host-state.ts', import.meta.url).href;
    const admissionModule = new URL('../../src/config/storage-read-admission.ts', import.meta.url).href;
    const safeModule = new URL('../../src/config/safe-repository-access.ts', import.meta.url).href;
    const initModule = new URL('../../src/runtime-initialization.ts', import.meta.url).href;
    const receiptRelative = path.relative(root, receiptPath).replaceAll('\\', '/');
    const program = `
      import { mock } from 'bun:test';
      import path from 'node:path';
      const mark = (stage) => console.error('INIT_RACER_' + stage, process.hrtime.bigint().toString());
      mark('START');
      let receiptLockMarkerSent = false;
      const safeModule = ${JSON.stringify(safeModule)};
      const originalSafe = Object.freeze({ ...await import(safeModule) });
      await mock.module(safeModule, () => ({
        ...originalSafe,
        requireSafeRepositoryAccess: (requestedRoot) => {
          const access = originalSafe.requireSafeRepositoryAccess(requestedRoot);
          if (path.resolve(requestedRoot) !== ${JSON.stringify(root)}) return access;
          return {
            ...access,
            withExclusiveLockAsync: async (target, label, operation) => {
              const pending = access.withExclusiveLockAsync(target, label, operation);
              if (target.split(path.sep).join('/') === ${JSON.stringify(receiptRelative)} && !receiptLockMarkerSent) {
                receiptLockMarkerSent = true;
                process.stdout.write('RECEIPT_LOCK_ATTEMPT\\n');
              }
              return pending;
            },
          };
        },
      }));
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
      let resolveReceiptLockAttempt!: () => void;
      let rejectReceiptLockAttempt!: (error: Error) => void;
      const receiptLockAttempt = new Promise<void>((resolve, reject) => {
        resolveReceiptLockAttempt = resolve;
        rejectReceiptLockAttempt = reject;
      });
      void receiptLockAttempt.catch(() => undefined);
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
      const racer: Racer = { child, stdin: child.stdin, ready, receiptLockAttempt, done };
      racers.push(racer);
      done.then(() => rejectReady(new Error('race process exited before release')), rejectReady);
      done.then(
        () => rejectReceiptLockAttempt(new Error('race process exited before its receipt lock attempt')),
        rejectReceiptLockAttempt,
      );
      if (!child.stdout || !child.stdin) {
        const error = new Error('Initialization racer pipes are unavailable');
        rejectReady(error);
        throw error;
      }
      let output = '';
      child.stdout.on('data', (chunk: Buffer) => {
        output += chunk.toString();
        if (output.includes('RECEIPT_LOCK_ATTEMPT\n')) resolveReceiptLockAttempt();
        if (output.includes('READY\n')) resolveReady();
      });
      await racer.ready;
    }
  }, 10_000);

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
    const safeModuleUrl = new URL('../../src/config/safe-repository-access.ts', import.meta.url).href;
    const initModuleUrl = new URL('../../src/runtime-initialization.ts', import.meta.url).href;
    const originalSafeExports = Object.freeze({ ...(await import('../../src/config/safe-repository-access.ts')) });
    const receiptRelative = path.relative(root, receiptPath).replaceAll('\\', '/');
    let parentReceiptLockAttempts = 0;
    let resolveParentReceiptLockAttempt!: () => void;
    const parentReceiptLockAttempt = new Promise<void>((resolve) => {
      resolveParentReceiptLockAttempt = resolve;
    });
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
      await mock.module(safeModuleUrl, () => ({
        ...originalSafeExports,
        requireSafeRepositoryAccess: (requestedRoot: string) => {
          const originalAccess = originalSafeExports.requireSafeRepositoryAccess(requestedRoot);
          if (path.resolve(requestedRoot) !== path.resolve(root)) return originalAccess;
          return {
            ...originalAccess,
            withExclusiveLockAsync: async <T>(target: string, label: string, operation: () => Promise<T>) => {
              const pending = originalAccess.withExclusiveLockAsync(target, label, operation);
              if (target.split(path.sep).join('/') === receiptRelative) {
                parentReceiptLockAttempts += 1;
                resolveParentReceiptLockAttempt();
              }
              return pending;
            },
          };
        },
      }));
      const isolated = (await import(
        `${initModuleUrl}?receipt-race=${randomUUID()}`
      )) as typeof import('../../src/runtime-initialization.ts');
      binding = isolated.bindRuntimeInitialization(root, store);
      const bindingObservation = binding.then(
        () => 'settled',
        () => 'settled',
      );
      observedBinding = bindingObservation;
      await expectAsyncReturned(() =>
        Promise.race([
          parentReceiptLockAttempt,
          bindingObservation.then(() => {
            throw new Error('Parent binding settled before entering the real receipt lock.');
          }),
        ]),
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
        await expectAsyncReturned(() => racer.receiptLockAttempt);
      }
      expect(parentReceiptLockAttempts).toBeGreaterThanOrEqual(1);
      expect(readFileSync(receiptPath)).toEqual(receiptBytes);
    } catch (error) {
      failure = { error };
    } finally {
      release();
      const drained = await Promise.allSettled([lock, ...(observedBinding ? [observedBinding] : [])]);
      drainErrors = drained.flatMap((outcome) => (outcome.status === 'rejected' ? [outcome.reason as unknown] : []));
      try {
        await mock.module(safeModuleUrl, () => originalSafeExports);
      } catch (error) {
        drainErrors.push(error);
      }
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
    for (const output of outputs) {
      expect(output.match(/RECEIPT_LOCK_ATTEMPT\n/g)).toHaveLength(1);
      expect(JSON.parse(output.trim().split('\n').at(-1)!)).toEqual({
        ...receipt,
        workspace_binding_status: 'bound',
      });
    }
    expect(JSON.parse(readFileSync(receiptPath, 'utf8'))).toEqual({ ...receipt, workspace_binding_status: 'bound' });
    caseCompleted = true;
  });
});
