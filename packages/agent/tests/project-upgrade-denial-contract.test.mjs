import { afterAll, afterEach, expect, mock, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as actualAccess from '../src/config/safe-repository-access.ts';
import { SafeRepositoryMoveError } from '../src/config/safe-repository-access.ts';
import { PROJECT_WORKSPACE_DATABASE_PATH } from '../src/config/project-paths.ts';

// Bun's mock.module() updates already-imported module namespaces in place.
// Keep the original callable before registering the override so this seam
// delegates to the real repository access implementation instead of itself.
const originalAccessModule = Object.freeze({ ...actualAccess });
const originalRequireSafeRepositoryAccess = originalAccessModule.requireSafeRepositoryAccess;
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const accessModule = pathToFileURL(path.join(packageRoot, 'src/config/safe-repository-access.ts')).href;
/** @type {Map<string, {target: string, code?: 'SAFE_REPOSITORY_MOVE_NOT_APPLIED' | 'SAFE_REPOSITORY_MOVE_OUTCOME_UNKNOWN', calls: number}>} */
const faults = new Map();
void mock.module(accessModule, () => ({
  ...actualAccess,
  /** @param {string} repositoryRoot */
  requireSafeRepositoryAccess(repositoryRoot) {
    const access = originalRequireSafeRepositoryAccess(repositoryRoot);
    if (!faults.has(repositoryRoot)) return access;
    return {
      ...access,
      /** @param {string} source @param {string} target @param {string} expectedHash @param {string} label */
      async moveNoReplaceAsync(source, target, expectedHash, label) {
        const fault = faults.get(repositoryRoot);
        if (fault?.target !== target) return access.moveNoReplaceAsync(source, target, expectedHash, label);
        fault.calls += 1;
        faults.delete(repositoryRoot);
        expect(access.fileExists(source, label)).toBe(true);
        expect(access.fileExists(target, label)).toBe(false);
        expect(createHash('sha256').update(access.readBytes(source, label)).digest('hex')).toBe(expectedHash);
        // Model only the provider's typed no-effect result after checking real fixture bytes and paths.
        throw new SafeRepositoryMoveError(
          fault.code ?? 'SAFE_REPOSITORY_MOVE_NOT_APPLIED',
          'fixture provider denial after exact no-effect beforeimage verification',
          { cause: new Error('fixture native no-replace denial') },
        );
      },
    };
  },
}));
/** @type {typeof import('../src/config/project-upgrade.ts')} */
const upgrade = /** @type {typeof import('../src/config/project-upgrade.ts')} */ (
  await import('../src/config/project-upgrade.ts')
);
/** @param {string} operationId */
const stagingFor = (operationId) => `.vida/.upgrade-intent-${operationId}.json`;
/** @type {Set<string>} */
const roots = new Set();

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'project-upgrade-denial-'));
  roots.add(root);
  await mkdir(path.join(root, '.git'));
  await mkdir(path.join(root, 'docs/agent-instructions'), { recursive: true });
  await cp(path.join(packageRoot, 'instructions'), path.join(root, 'docs/agent-instructions'), { recursive: true });
  /** @param {string} value @returns {string} */
  const replaceTemplate = (value) =>
    value
      .replaceAll('{{REPOSITORY}}', 'denial-fixture')
      .replaceAll('{{PROJECT}}', 'fixture')
      .replaceAll('{{PROJECTS}}', 'fixture')
      .replaceAll('{{BUNDLE}}', 'vida-agent')
      .replaceAll('{{CREATED_AT}}', '2026-10-10T00:00:00.000Z');
  /** @type {Array<[string, string]>} */
  const templates = [
    ['templates/AGENTS.template.md', 'AGENTS.md'],
    ['templates/AGENT.sidecar.template.md', 'AGENT.sidecar.md'],
    ['templates/agent-runtime.config.template.v1.yaml', 'agent-runtime.config.v1.yaml'],
  ];
  for (const [source, target] of templates)
    await writeFile(path.join(root, target), replaceTemplate(await readFile(path.join(packageRoot, source), 'utf8')));
  await mkdir(path.join(root, 'docs/agent-instructions'), { recursive: true });
  await writeFile(
    path.join(root, 'docs/agent-instructions/documentation-policy.v1.json'),
    replaceTemplate(await readFile(path.join(packageRoot, 'templates/documentation-policy.template.v1.json'), 'utf8')),
  );
  return root;
}

/** @param {string} root @param {string} operationId */
async function plannedFreshOperation(root, operationId) {
  return upgrade.planProjectUpgradeRepair(root, {
    operation_id: operationId,
    actor: 'test-owner',
    instruction_ref: 'project-upgrade-denial-contract.test.mjs',
  });
}

/** @param {string} root @param {import('../src/config/project-upgrade.ts').ProjectUpgradeOperation} operation */
async function installLegacyPreparedIntent(root, operation) {
  const prepared = upgrade.validateProjectUpgradeOperation({
    ...operation,
    revision: operation.revision + 1,
    phase: 'intent_prepared',
  });
  const staging = stagingFor(operation.plan.operation_id);
  await unlink(path.join(root, upgrade.PROJECT_UPGRADE_OPERATION_PATH));
  await writeFile(path.join(root, staging), JSON.stringify(prepared, null, 2) + '\n');
  return staging;
}

afterEach(async () => {
  faults.clear();
  for (const root of roots) await rm(root, { recursive: true, force: true });
  roots.clear();
});

afterAll(() => {
  void mock.module(accessModule, () => originalAccessModule);
  mock.restore();
});

test('known no-effect initial-intent denial restores the exact prepared operation, then resumes its same ID', async () => {
  const root = await fixture();
  const operationId = 'denial-intent-001';
  const operation = await plannedFreshOperation(root, operationId);
  const staging = await installLegacyPreparedIntent(root, operation);
  const before = await readFile(path.join(root, staging), 'utf8');
  faults.set(root, { target: upgrade.PROJECT_UPGRADE_OPERATION_PATH, calls: 0 });

  const intentError = await upgrade.recoverProjectUpgradeIntent(root, operationId).then(
    () => null,
    (error) => /** @type {unknown} */ (error),
  );
  expect(intentError).toBeInstanceOf(SafeRepositoryMoveError);
  expect(intentError).toMatchObject({ code: 'SAFE_REPOSITORY_MOVE_NOT_APPLIED' });
  const restored = upgrade.validateProjectUpgradeOperation(
    JSON.parse(await readFile(path.join(root, staging), 'utf8')),
  );
  expect(restored.plan.operation_id).toBe(operationId);
  expect(restored.plan.token).toBe(operation.plan.token);
  expect(restored.phase).toBe('intent_prepared');
  expect(restored.revision).toBe(/** @type {{revision: number}} */ (JSON.parse(before)).revision + 2);
  expect(await readFile(path.join(root, upgrade.PROJECT_UPGRADE_OPERATION_PATH), 'utf8').catch(() => null)).toBeNull();

  const resumed = await upgrade.recoverProjectUpgradeIntent(root, operationId);
  expect(resumed.phase).toBe('planned');
  expect(resumed.plan.operation_id).toBe(operationId);
  expect(resumed.plan.token).toBe(operation.plan.token);
});

test('known no-effect bootstrap denial returns to staged and same-operation resume publishes the retained image', async () => {
  const root = await fixture();
  const operationId = 'denial-bootstrap-001';
  const operation = await plannedFreshOperation(root, operationId);
  const target = PROJECT_WORKSPACE_DATABASE_PATH;
  faults.set(root, { target, calls: 0 });

  const bootstrapError = await upgrade.resumeFreshProjectUpgradeDatabase(root, operationId).then(
    () => null,
    (error) => /** @type {unknown} */ (error),
  );
  expect(bootstrapError).toBeInstanceOf(SafeRepositoryMoveError);
  expect(bootstrapError).toMatchObject({ code: 'SAFE_REPOSITORY_MOVE_NOT_APPLIED' });
  const staged = upgrade.inspectPlannedProjectUpgrade(root, operationId);
  expect(staged.phase).toBe('planned');
  expect(staged.storage_phase).toBe('staged');
  expect(staged.plan.operation_id).toBe(operationId);
  expect(staged.plan.token).toBe(operation.plan.token);
  expect(await readFile(path.join(root, target)).catch(() => null)).toBeNull();
  for (const suffix of ['-wal', '-shm', '-journal'])
    expect(await readFile(path.join(root, target + suffix)).catch(() => null)).toBeNull();

  const published = await upgrade.resumeFreshProjectUpgradeDatabase(root, operationId);
  expect(published.storage_phase).toBe('published');
  expect(published.plan.operation_id).toBe(operationId);
  expect(published.plan.token).toBe(operation.plan.token);
});

test('retained intent and bootstrap UNKNOWN states never retry a move from beforeimages alone', async () => {
  const intentRoot = await fixture();
  const intentOperationId = 'unknown-intent-001';
  const intentOperation = await plannedFreshOperation(intentRoot, intentOperationId);
  const intentStaging = await installLegacyPreparedIntent(intentRoot, intentOperation);
  const intentFault = /** @type {NonNullable<Parameters<typeof faults.set>[1]>} */ ({
    target: upgrade.PROJECT_UPGRADE_OPERATION_PATH,
    code: 'SAFE_REPOSITORY_MOVE_OUTCOME_UNKNOWN',
    calls: 0,
  });
  faults.set(intentRoot, intentFault);
  const intentFirstError = await upgrade.recoverProjectUpgradeIntent(intentRoot, intentOperationId).then(
    () => null,
    (error) => /** @type {unknown} */ (error),
  );
  expect(intentFirstError).toBeInstanceOf(SafeRepositoryMoveError);
  expect(intentFault.calls).toBe(1);
  const intentSecondError = await upgrade.recoverProjectUpgradeIntent(intentRoot, intentOperationId).then(
    () => null,
    (error) => /** @type {unknown} */ (error),
  );
  expect(intentSecondError).toBeInstanceOf(Error);
  const intentRetained = upgrade.validateProjectUpgradeOperation(
    JSON.parse(await readFile(path.join(intentRoot, intentStaging), 'utf8')),
  );
  expect(intentRetained.phase).toBe('unknown_intent_move');
  expect(intentRetained.plan.operation_id).toBe(intentOperationId);
  await awaitNoMoveFromRetainedIntent(intentRoot, intentOperationId, intentFault);

  const storageRoot = await fixture();
  const storageOperationId = 'unknown-storage-001';
  const storageOperation = await plannedFreshOperation(storageRoot, storageOperationId);
  const storageFault = /** @type {NonNullable<Parameters<typeof faults.set>[1]>} */ ({
    target: PROJECT_WORKSPACE_DATABASE_PATH,
    code: 'SAFE_REPOSITORY_MOVE_OUTCOME_UNKNOWN',
    calls: 0,
  });
  faults.set(storageRoot, storageFault);
  const storageFirstError = await upgrade.resumeFreshProjectUpgradeDatabase(storageRoot, storageOperationId).then(
    () => null,
    (error) => /** @type {unknown} */ (error),
  );
  expect(storageFirstError).toBeInstanceOf(SafeRepositoryMoveError);
  expect(storageFault.calls).toBe(1);
  const storageRetained = upgrade.inspectPlannedProjectUpgrade(storageRoot, storageOperationId);
  expect(storageRetained.storage_phase).toBe('unknown_move');
  expect(storageRetained.plan.operation_id).toBe(storageOperationId);
  expect(storageRetained.plan.token).toBe(storageOperation.plan.token);
  const storageSecondError = await upgrade.resumeFreshProjectUpgradeDatabase(storageRoot, storageOperationId).then(
    () => null,
    (error) => /** @type {unknown} */ (error),
  );
  expect(storageSecondError).toBeInstanceOf(Error);
  expect(storageFault.calls).toBe(1);
});

/** @param {string} root @param {string} operationId @param {{calls: number}} fault */
async function awaitNoMoveFromRetainedIntent(root, operationId, fault) {
  const error = await upgrade.recoverProjectUpgradeIntent(root, operationId).then(
    () => null,
    (cause) => /** @type {unknown} */ (cause),
  );
  expect(error).toBeInstanceOf(Error);
  expect(fault.calls).toBe(1);
}
