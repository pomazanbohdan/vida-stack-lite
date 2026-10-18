import { describe, expect, spyOn, test } from 'bun:test';
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import * as nodeFs from 'node:fs';
import * as safeRepositoryAccess from '../src/config/safe-repository-access.ts';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  INITIALIZED_PROJECT_PATHS,
  PROJECT_ACTIVATION_PATH,
  PROJECT_INITIALIZATION_PATH,
  PROJECT_CONFIGURATION_PATHS,
  PROJECT_UPGRADE_OPERATION_PATH,
  STORAGE_ADMISSION_GATE_FILE,
} from '../src/config/project-paths.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { validateProjectInitializationReceipt } from '../src/config/project-initialization-record.ts';
import { configuredTestRepositoryRoot } from './configured-context.ts';
import { expectRejection, expectReturned } from './helpers/expect-rejection.ts';
import { makeFreshRepository } from './helpers/project-upgrade-fixture.js';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import {
  activeRuntimeConfigurationSource,
  assertLoadedRuntimeConfig,
  capturedRuntimeConfigurationBinding,
  loadRuntimeConfig,
  parseRuntimeConfigYaml,
  runtimeConfigDigest,
  validateRuntimeConfigRepairTargetBytes,
} from '../src/config/runtime-config.ts';

const repositoryRoot = process.env.AGENT_RUNTIME_TEST_CONTEXT_ROOT ?? configuredTestRepositoryRoot();
const sourceBytes = readFileSync(path.join(repositoryRoot, 'agent-runtime.config.v1.yaml'));

import { captureCoverageConsumerBinding, assertCoverageConsumerBinding } from '../tooling/coverage-consumer-binding.ts';

async function completeFreshUpgrade(
  root: string,
  operationId: string,
  onPhase?: (phase: string) => void,
): Promise<void> {
  onPhase?.('upgrade module import');
  const upgrade = await import('../src/config/project-upgrade.ts');
  onPhase?.('upgrade planning');
  const planned = await upgrade.planProjectUpgradeRepair(root, {
    operation_id: operationId,
    actor: 'test-owner: activated runtime config reader',
    instruction_ref: 'tests/runtime-config-repair-boundary.test.ts',
  });
  expect(planned.plan.operation_id).toBe(operationId);
  expect(planned.plan.database_mode).toBe('fresh');
  onPhase?.('upgrade resume');
  const completed = await upgrade.resumeProjectUpgrade(root, operationId);
  expect(completed.phase).toBe('completed');
}

function finishActivatedConfigFixture(root: string, passed: boolean, deadlineAt: number): void {
  if (passed && performance.now() < deadlineAt) rmSync(root, { recursive: true, force: true });
  else process.stderr.write(`Retained failed, expired, or pending activated config fixture: ${root}\n`);
}

function createLegacyConfigFixture(): { root: string; configFile: string; deadlineAt: number } {
  const deadlineAt = performance.now() + 5000;
  const root = mkdtempSync(path.join(tmpdir(), 'config-repair-cache-'));
  const config = expectReturned(() => parseRuntimeConfigYaml(sourceBytes.toString('utf8')));
  for (const marker of config.repository.root_markers) {
    const target = path.join(root, marker);
    mkdirSync(path.dirname(target), { recursive: true });
    if (marker === '.git') mkdirSync(target);
    else writeFileSync(target, 'fixture marker\n');
  }
  for (const source of config.knowledge.sources.filter((item) => item.kind === 'local')) {
    const target = path.join(root, source.location);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, 'fixture source\n');
  }
  const configFile = path.join(root, 'agent-runtime.config.v1.yaml');
  writeFileSync(configFile, sourceBytes);
  return { root, configFile, deadlineAt };
}

function closeLegacyConfigFixture(
  fixture: ReturnType<typeof createLegacyConfigFixture>,
  passed: boolean,
  ...otherFixtures: ReturnType<typeof createLegacyConfigFixture>[]
): void {
  const errors: unknown[] = [];
  for (const owned of [fixture, ...otherFixtures]) {
    try {
      if (passed && performance.now() < owned.deadlineAt) rmSync(owned.root, { recursive: true, force: true });
      else console.error('Retained failed or expired configuration fixture: ' + owned.root);
    } catch (error) {
      console.error('Retained configuration fixture after cleanup failure: ' + owned.root);
      errors.push(error);
    }
  }
  if (errors.length) throw new AggregateError(errors, 'Configuration fixture cleanup failed.');
}

function observeLiveLayoutCasLock(root: string): { name: string; bytes: Buffer<ArrayBuffer> } {
  const vida = path.join(root, '.vida');
  const access = requireSafeRepositoryAccess(root);
  const originalFsync = nodeFs.fsyncSync;
  const observation: { lock?: { name: string; bytes: Buffer<ArrayBuffer> } } = {};
  const fsync = spyOn(nodeFs, 'fsyncSync').mockImplementation((fd) => {
    originalFsync(fd);
    if (observation.lock) return;
    const names = readdirSync(vida).filter((entry) => entry.endsWith('.cas.lock'));
    if (names.length !== 1) return;
    const name = names[0]!;
    const bytes = readFileSync(path.join(vida, name));
    const owner: unknown = JSON.parse(bytes.toString('utf8'));
    expect(owner).toMatchObject({ schema: 'SafeRepositoryAccessLock/v1', owner_pid: process.pid });
    observation.lock = { name, bytes };
  });
  try {
    expect(access.fileExists('.vida/layout.v1.json', 'observe actual layout CAS lock')).toBe(false);
  } finally {
    fsync.mockRestore();
  }
  if (!observation.lock) throw new Error('Real layout read did not expose its live CAS lock.');
  return observation.lock;
}

describe('current-v1 exact-byte config repair boundary', () => {
  test.each([
    ['prepared upgrade intent staging', '.vida/.upgrade-intent-reader-barrier.json'],
    ['activation staging', '.vida/.activation-reader-barrier.json'],
    ['workspace database staging', INITIALIZED_PROJECT_PATHS.work + '/.upgrade-reader-barrier.sqlite'],
    ['fixed sidecar output', INITIALIZED_PROJECT_PATHS.sidecar],
    ['published instruction output', INITIALIZED_PROJECT_PATHS.instructions + '/reader-barrier.md'],
  ])('keeps legacy configuration blocked while %s remains without activation', (_label, relativePath) => {
    const fixture = createLegacyConfigFixture();
    const { root, configFile } = fixture;
    try {
      if (performance.now() >= fixture.deadlineAt) throw new Error('Configuration reader fixture deadline expired.');
      const legacy = loadRuntimeConfig(root);
      const access = requireSafeRepositoryAccess(root);
      expect(capturedRuntimeConfigurationBinding(legacy).source).toBe('agent-runtime.config.v1.yaml');
      expect(activeRuntimeConfigurationSource(access)).toBe('agent-runtime.config.v1.yaml');
      expect(readFileSync(configFile)).toEqual(sourceBytes);

      const outputPath = path.join(root, relativePath);
      const outputBytes = Buffer.from('retained reader barrier evidence\n');
      mkdirSync(path.dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, outputBytes);
      mkdirSync(path.join(root, '.vida'), { recursive: true });
      writeFileSync(path.join(root, '.vida', STORAGE_ADMISSION_GATE_FILE), 'unvalidated gate fixture bytes\n');
      expect(existsSync(path.join(root, PROJECT_ACTIVATION_PATH))).toBe(false);
      if (performance.now() >= fixture.deadlineAt) throw new Error('Configuration reader fixture deadline expired.');

      expect(() => loadRuntimeConfig(root)).toThrow(
        'Project activation is missing while current .vida outputs remain; recover the existing upgrade before configuration access.',
      );
      expect(() => activeRuntimeConfigurationSource(access)).toThrow(
        'Project activation is missing while current .vida outputs remain; recover the existing upgrade before configuration access.',
      );
      expect(readFileSync(outputPath)).toEqual(outputBytes);
      expect(readFileSync(configFile)).toEqual(sourceBytes);
      expect(existsSync(path.join(root, PROJECT_ACTIVATION_PATH))).toBe(false);
    } finally {
      // The missing-activation barrier remains unresolved even when denial assertions pass.
      // No other cleanup owner tracks this independently created root.
      process.stderr.write(`Retained blocked configuration reader fixture: ${root}\n`);
    }
  });

  test('uses legacy config with only the gate and keeps the root and both fresh barriers', () => {
    const fixture = createLegacyConfigFixture();
    const { root, configFile } = fixture;
    const vida = path.join(root, '.vida');
    const gate = path.join(vida, STORAGE_ADMISSION_GATE_FILE);
    const gateBytes = Buffer.from('intentionally unvalidated gate bytes\n');
    mkdirSync(vida);
    writeFileSync(gate, gateBytes);
    let vidaExistenceChecks = 0;
    let vidaListings = 0;
    const originalRequire = safeRepositoryAccess.requireSafeRepositoryAccess;
    const accessSpy = spyOn(safeRepositoryAccess, 'requireSafeRepositoryAccess').mockImplementation((requestedRoot) => {
      const access = originalRequire(requestedRoot);
      if (path.resolve(requestedRoot) !== path.resolve(root)) return access;
      return {
        ...access,
        fileExists(target: string, label: string): boolean {
          if (target === '.vida') vidaExistenceChecks++;
          return access.fileExists(target, label);
        },
        listFiles(target: string, label: string): readonly string[] {
          if (target === '.vida') vidaListings++;
          return access.listFiles(target, label);
        },
      };
    });
    let retain = true;
    try {
      const loaded = loadRuntimeConfig(root);
      expect(capturedRuntimeConfigurationBinding(loaded).source).toBe('agent-runtime.config.v1.yaml');
      expect(readFileSync(configFile)).toEqual(sourceBytes);
      expect(readFileSync(gate)).toEqual(gateBytes);
      expect(readdirSync(vida)).toEqual([STORAGE_ADMISSION_GATE_FILE]);
      expect(vidaExistenceChecks).toBeGreaterThanOrEqual(2);
      expect(vidaListings).toBeGreaterThanOrEqual(2);
      retain = false;
    } finally {
      accessSpy.mockRestore();
      closeLegacyConfigFixture(fixture, !retain);
    }
  });

  test('uses old guarded probes when the gate has any additional unknown entry', () => {
    const fixture = createLegacyConfigFixture();
    const { root, configFile } = fixture;
    const vida = path.join(root, '.vida');
    const extra = path.join(vida, 'owner-data.bin');
    const extraBytes = Buffer.from('preserve unknown owner data\n');
    mkdirSync(vida);
    writeFileSync(path.join(vida, STORAGE_ADMISSION_GATE_FILE), 'unvalidated gate fixture bytes\n');
    writeFileSync(extra, extraBytes);
    let sawGuardedLayoutProbe = false;
    let vidaExistenceChecks = 0;
    const originalRequire = safeRepositoryAccess.requireSafeRepositoryAccess;
    const accessSpy = spyOn(safeRepositoryAccess, 'requireSafeRepositoryAccess').mockImplementation((requestedRoot) => {
      const access = originalRequire(requestedRoot);
      if (path.resolve(requestedRoot) !== path.resolve(root)) return access;
      return {
        ...access,
        fileExists(target: string, label: string): boolean {
          if (target === '.vida') vidaExistenceChecks++;
          if (target === '.vida/layout.v1.json' && label === 'project upgrade output evidence')
            sawGuardedLayoutProbe = true;
          return access.fileExists(target, label);
        },
      };
    });
    let retain = true;
    try {
      expect(capturedRuntimeConfigurationBinding(loadRuntimeConfig(root)).source).toBe('agent-runtime.config.v1.yaml');
      expect(sawGuardedLayoutProbe).toBe(true);
      expect(vidaExistenceChecks).toBeGreaterThanOrEqual(2);
      expect(readFileSync(configFile)).toEqual(sourceBytes);
      expect(readFileSync(extra)).toEqual(extraBytes);
      retain = false;
    } finally {
      accessSpy.mockRestore();
      closeLegacyConfigFixture(fixture, !retain);
    }
  });

  test.each([
    ['recognized output', '.vida/layout.v1.json'],
    ['upgrade staging', '.vida/.upgrade-intent-fastpath-race.json'],
    ['activation', PROJECT_ACTIVATION_PATH],
    ['upgrade intent', PROJECT_UPGRADE_OPERATION_PATH],
  ])('final barrier catches %s published after initial listing', (_label, relativePath) => {
    const fixture = createLegacyConfigFixture();
    const { root } = fixture;
    const vida = path.join(root, '.vida');
    const injected = path.join(root, relativePath);
    const injectedBytes = Buffer.from('reader barrier published between listings\n');
    mkdirSync(vida, { recursive: true });
    writeFileSync(path.join(vida, STORAGE_ADMISSION_GATE_FILE), 'unvalidated gate fixture bytes\n');
    let vidaListings = 0;
    const originalRequire = safeRepositoryAccess.requireSafeRepositoryAccess;
    const accessSpy = spyOn(safeRepositoryAccess, 'requireSafeRepositoryAccess').mockImplementation((requestedRoot) => {
      const access = originalRequire(requestedRoot);
      if (path.resolve(requestedRoot) !== path.resolve(root)) return access;
      return {
        ...access,
        listFiles(target: string, label: string): readonly string[] {
          const entries = access.listFiles(target, label);
          if (target === '.vida' && ++vidaListings === 1) {
            mkdirSync(path.dirname(injected), { recursive: true });
            writeFileSync(injected, injectedBytes);
          }
          return entries;
        },
      };
    });
    try {
      expect(() => loadRuntimeConfig(root)).toThrow(
        relativePath === PROJECT_UPGRADE_OPERATION_PATH
          ? 'Project upgrade is in progress. Inspect or resume the same operation before ordinary configuration access.'
          : 'runtime configuration source changed during its read.',
      );
      if (relativePath === PROJECT_ACTIVATION_PATH || relativePath === PROJECT_UPGRADE_OPERATION_PATH)
        expect(vidaListings).toBe(1);
      else expect(vidaListings).toBeGreaterThanOrEqual(2);
      expect(readFileSync(injected)).toEqual(injectedBytes);
    } finally {
      accessSpy.mockRestore();
      process.stderr.write(`Retained raced configuration reader fixture: ${root}\n`);
    }
  });

  test('blocks and preserves a persistent upgrade intent', () => {
    const fixture = createLegacyConfigFixture();
    const { root } = fixture;
    mkdirSync(path.join(root, '.vida'), { recursive: true });
    writeFileSync(path.join(root, '.vida', STORAGE_ADMISSION_GATE_FILE), 'unvalidated gate fixture bytes\n');
    const intent = path.join(root, '.vida/project-upgrade.v1.json');
    const intentBytes = Buffer.from('retained unresolved upgrade intent\n');
    mkdirSync(path.dirname(intent), { recursive: true });
    writeFileSync(intent, intentBytes);
    try {
      expect(() => loadRuntimeConfig(root)).toThrow(
        'Project upgrade is in progress. Inspect or resume the same operation before ordinary configuration access.',
      );
      expect(readFileSync(intent)).toEqual(intentBytes);
    } finally {
      process.stderr.write(`Retained unresolved upgrade-intent fixture: ${root}\n`);
    }
  });

  test.skipIf(process.platform !== 'linux')(
    'rejects and preserves an orphan own-PID layout CAS lock observed in .vida',
    () => {
      const fixture = createLegacyConfigFixture();
      const { root } = fixture;
      const vida = path.join(root, '.vida');
      mkdirSync(vida, { recursive: true });
      writeFileSync(path.join(vida, STORAGE_ADMISSION_GATE_FILE), 'unvalidated gate fixture bytes\n');
      const { name: lockName, bytes: lockBytes } = observeLiveLayoutCasLock(root);
      const lockPath = path.join(vida, lockName);
      writeFileSync(lockPath, lockBytes, { flag: 'wx' });
      const identity = lstatSync(lockPath, { bigint: true });
      try {
        expect(() => loadRuntimeConfig(root)).toThrow(/lock/i);
        expect(readFileSync(lockPath)).toEqual(lockBytes);
        const after = lstatSync(lockPath, { bigint: true });
        expect(after.dev).toBe(identity.dev);
        expect(after.ino).toBe(identity.ino);
      } finally {
        process.stderr.write(`Retained orphan-lock configuration reader fixture: ${root}\n`);
      }
    },
  );

  test.skipIf(process.platform !== 'linux')(
    'rejects a UUID retained layout-lock quarantine without changing its custody',
    () => {
      const fixture = createLegacyConfigFixture();
      const { root } = fixture;
      const vida = path.join(root, '.vida');
      mkdirSync(vida, { recursive: true });
      writeFileSync(path.join(vida, STORAGE_ADMISSION_GATE_FILE), 'unvalidated gate fixture bytes\n');
      const { name: lockName } = observeLiveLayoutCasLock(root);
      const quarantineName = '.' + lockName + '.' + randomUUID() + '.reclaimed';
      const quarantinePath = path.join(vida, quarantineName);
      const quarantineBytes = Buffer.from('retained lock quarantine custody\n');
      writeFileSync(quarantinePath, quarantineBytes, { flag: 'wx' });
      const identity = lstatSync(quarantinePath, { bigint: true });
      try {
        expect(() => loadRuntimeConfig(root)).toThrow(/quarantine .* pending|lock/i);
        expect(readFileSync(quarantinePath)).toEqual(quarantineBytes);
        const after = lstatSync(quarantinePath, { bigint: true });
        expect(after.dev).toBe(identity.dev);
        expect(after.ino).toBe(identity.ino);
      } finally {
        process.stderr.write(`Retained quarantine configuration reader fixture: ${root}\n`);
      }
    },
  );

  test('rejects the previous physical identity after replacing a consumer directory at the same path', async () => {
    const original = createLegacyConfigFixture();
    const replacement = createLegacyConfigFixture();
    const movedRoot = original.root + '.retained-original';
    let originalMoved = false;
    let replacementMoved = false;
    let passed = false;
    try {
      const packageRoot = path.join(original.root, 'packages/agent');
      const environment = { AGENT_RUNTIME_TEST_REPOSITORY_ROOT: original.root };
      const before = await captureCoverageConsumerBinding(packageRoot, environment);
      if (existsSync(movedRoot)) throw new Error('Owned configuration move destination already exists.');
      renameSync(original.root, movedRoot);
      originalMoved = true;
      renameSync(replacement.root, original.root);
      replacementMoved = true;
      const after = await captureCoverageConsumerBinding(packageRoot, environment);
      expect(after.repository_root).toBe(before.repository_root);
      expect(after.source_digest).toBe(before.source_digest);
      expect(after.root_identity_sha256).not.toBe(before.root_identity_sha256);
      await expectRejection(
        assertCoverageConsumerBinding(before, packageRoot, environment),
        /changed since collection: root_identity_sha256/,
      );
      expect(readFileSync(path.join(original.root, 'agent-runtime.config.v1.yaml'))).toEqual(sourceBytes);
      passed = true;
    } finally {
      closeLegacyConfigFixture({ ...original, root: originalMoved ? movedRoot : original.root }, passed, {
        ...replacement,
        root: replacementMoved ? original.root : replacement.root,
      });
    }
  });

  test('coverage consumer binding distinguishes physical roots and rejects source-byte drift', async () => {
    const first = createLegacyConfigFixture();
    const second = createLegacyConfigFixture();
    let passed = false;
    try {
      const packageRoot = path.join(first.root, 'packages/agent');
      const env = { AGENT_RUNTIME_TEST_REPOSITORY_ROOT: first.root };
      const binding = await captureCoverageConsumerBinding(packageRoot, env);
      const another = await captureCoverageConsumerBinding(packageRoot, {
        AGENT_RUNTIME_TEST_REPOSITORY_ROOT: second.root,
      });
      expect(binding).toMatchObject({ repository_root: first.root, source: 'agent-runtime.config.v1.yaml' });
      expect(another).toMatchObject({ repository_root: second.root, source: 'agent-runtime.config.v1.yaml' });
      expect(Object.isFrozen(binding)).toBe(true);
      expect(binding.root_identity_sha256).toMatch(/^[0-9a-f]{64}$/u);
      expect(binding.root_identity_sha256).not.toBe(another.root_identity_sha256);
      expect(binding).not.toEqual(another);
      await assertCoverageConsumerBinding(binding, packageRoot, env);
      await expectRejection(
        assertCoverageConsumerBinding(
          { ...binding, root_identity_sha256: another.root_identity_sha256 },
          packageRoot,
          env,
        ),
        /changed since collection: root_identity_sha256/,
      );
      const missingRoot = { AGENT_RUNTIME_TEST_REPOSITORY_ROOT: path.join(first.root, 'missing-consumer') };
      for (const malformed of [null, [], { ...binding, extra: true }, { ...binding, source_digest: null }])
        await expectRejection(assertCoverageConsumerBinding(malformed, packageRoot, missingRoot), /malformed/);
      const changed = Buffer.concat([sourceBytes, Buffer.from('# changed coverage consumer input\n')]);
      writeFileSync(first.configFile, changed);
      await expectRejection(
        assertCoverageConsumerBinding(binding, packageRoot, env),
        /changed since collection: source_digest/,
      );
      expect(readFileSync(first.configFile)).toEqual(changed);
      await expectRejection(
        assertCoverageConsumerBinding(binding, packageRoot, { AGENT_RUNTIME_TEST_REPOSITORY_ROOT: second.root }),
        /changed since collection: repository_root/,
      );
      passed = true;
    } finally {
      closeLegacyConfigFixture(first, passed, second);
    }
  });

  test('accepts current YAML and BOM bytes without granting runtime authority', () => {
    const loaded = loadRuntimeConfig(repositoryRoot);
    const target = validateRuntimeConfigRepairTargetBytes(sourceBytes, repositoryRoot);
    const bomTarget = validateRuntimeConfigRepairTargetBytes(
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), sourceBytes]),
      repositoryRoot,
    );
    expect(runtimeConfigDigest(target)).toBe(runtimeConfigDigest(loaded));
    expect(runtimeConfigDigest(bomTarget)).toBe(runtimeConfigDigest(loaded));
    expect(target).not.toBe(loaded);
    expect(() => assertLoadedRuntimeConfig(target, repositoryRoot)).toThrow(/must come from loadRuntimeConfig/);
  });

  test('binds repair target instructions to the declared configuration source without granting authority', () => {
    const loaded = loadRuntimeConfig(repositoryRoot);
    const source = PROJECT_CONFIGURATION_PATHS.project;
    const { digest: _digest, ...registry } = loaded.research_decision.registry;
    const projectRegistry = {
      ...registry,
      instructions: registry.instructions.map((instruction, index) => ({
        ...instruction,
        source_path: source + '#research_decision.registry.instructions.' + index,
      })),
    };
    const projectTarget = {
      ...loaded,
      research_decision: {
        ...loaded.research_decision,
        registry: {
          ...projectRegistry,
          digest: canonicalJsonDigest(projectRegistry),
        },
      },
    };
    const bytes = Buffer.from(JSON.stringify(projectTarget));
    const target = validateRuntimeConfigRepairTargetBytes(bytes, repositoryRoot, source);
    expect(runtimeConfigDigest(target)).toBe(runtimeConfigDigest(projectTarget));
    expect(() => assertLoadedRuntimeConfig(target, repositoryRoot)).toThrow(/must come from loadRuntimeConfig/);
    expect(() => validateRuntimeConfigRepairTargetBytes(bytes, repositoryRoot)).toThrow(/source binding is invalid/);
    expect(() => validateRuntimeConfigRepairTargetBytes(sourceBytes, repositoryRoot, source)).toThrow(
      /source binding is invalid/,
    );
  });

  test('rejects malformed bytes, oversized input, a relative root and another schema', () => {
    const malformedComment = Buffer.concat([sourceBytes, Buffer.from([0x23, 0x20, 0xc3, 0x28, 0x0a])]);
    expect(() => validateRuntimeConfigRepairTargetBytes(malformedComment, repositoryRoot)).toThrow();
    expect(() => validateRuntimeConfigRepairTargetBytes(Buffer.alloc(4 * 1024 * 1024 + 1), repositoryRoot)).toThrow(
      /too large/,
    );
    const oversizedMalformed = Buffer.alloc(4 * 1024 * 1024 + 1, 0x20);
    oversizedMalformed[0] = 0xc3;
    oversizedMalformed[1] = 0x28;
    expect(() => validateRuntimeConfigRepairTargetBytes(oversizedMalformed, repositoryRoot)).toThrow(/too large/);
    expect(() => validateRuntimeConfigRepairTargetBytes(sourceBytes, '.')).toThrow(/absolute/);
    expect(() =>
      validateRuntimeConfigRepairTargetBytes(
        Buffer.from(sourceBytes.toString('utf8').replace('AgentRuntimeConfig/v1', 'AgentRuntimeConfig/v2')),
        repositoryRoot,
      ),
    ).toThrow();
  });

  test('accepts the exact four-megabyte byte boundary', () => {
    const padded = Buffer.concat([sourceBytes, Buffer.alloc(4 * 1024 * 1024 - sourceBytes.byteLength, 0x20)]);
    expect(padded.byteLength).toBe(4 * 1024 * 1024);
    expect(validateRuntimeConfigRepairTargetBytes(padded, repositoryRoot).schema).toBe('AgentRuntimeConfig/v1');
  }, 20_000);

  test('reloads changed root bytes and binds the new authorized object to that repository', () => {
    const fixture = createLegacyConfigFixture();
    const { root, configFile } = fixture;
    const yaml = sourceBytes.toString('utf8');
    let retain = true;
    try {
      const first = loadRuntimeConfig(root);
      const changed = yaml.replace(
        /^config_revision: (\d+)$/m,
        (_match: string, revision: string): string => `config_revision: ${Number(revision) + 1}`,
      );
      expect(changed).not.toBe(yaml);
      writeFileSync(configFile, changed);
      const next = loadRuntimeConfig(root);
      expect(next).not.toBe(first);
      expect(next.config_revision).toBe(first.config_revision + 1);
      expect(runtimeConfigDigest(next)).not.toBe(runtimeConfigDigest(first));
      expect(loadRuntimeConfig(root)).toBe(next);
      expect(Object.isFrozen(next)).toBe(true);
      expect(() => assertLoadedRuntimeConfig(next, root)).not.toThrow();
      retain = false;
    } finally {
      closeLegacyConfigFixture(fixture, !retain);
    }
  });

  test('captures an immutable origin binding from successful legacy loads', () => {
    const fixture = createLegacyConfigFixture();
    const { root } = fixture;
    let retain = true;
    try {
      const loaded = loadRuntimeConfig(root);
      const binding = capturedRuntimeConfigurationBinding(loaded);
      const sha256 = new Bun.CryptoHasher('sha256').update(sourceBytes).digest('hex');
      expect(binding).toEqual({
        repository_root: root,
        source: 'agent-runtime.config.v1.yaml',
        source_digest: `agent-runtime.config.v1.yaml:${sha256}`,
      });
      expect(Object.isFrozen(binding)).toBe(true);
      retain = false;
    } finally {
      closeLegacyConfigFixture(fixture, !retain);
    }
  });

  test('does not bind repair targets or forged config objects as loaded origins', () => {
    const fixture = createLegacyConfigFixture();
    const { root } = fixture;
    let retain = true;
    try {
      const loaded = loadRuntimeConfig(root);
      expect(capturedRuntimeConfigurationBinding(loaded).repository_root).toBe(root);
      const repairTarget = validateRuntimeConfigRepairTargetBytes(sourceBytes, root);
      const forged = { ...loaded };
      expect(() => capturedRuntimeConfigurationBinding(repairTarget)).toThrow(/successful loadRuntimeConfig/);
      expect(() => capturedRuntimeConfigurationBinding(forged)).toThrow(/successful loadRuntimeConfig/);
      retain = false;
    } finally {
      closeLegacyConfigFixture(fixture, !retain);
    }
  });

  test('captures comment-only source byte drift and keeps the previous binding immutable', () => {
    const fixture = createLegacyConfigFixture();
    const { root, configFile } = fixture;
    let retain = true;
    try {
      const first = loadRuntimeConfig(root);
      const firstBinding = capturedRuntimeConfigurationBinding(first);
      const changedBytes = Buffer.concat([sourceBytes, Buffer.from('# origin-only comment drift\n')]);
      writeFileSync(configFile, changedBytes);
      const next = loadRuntimeConfig(root);
      const nextBinding = capturedRuntimeConfigurationBinding(next);

      expect(next).not.toBe(first);
      expect(runtimeConfigDigest(next)).toBe(runtimeConfigDigest(first));
      expect(nextBinding).not.toBe(firstBinding);
      expect(firstBinding.source_digest).toBe(
        `agent-runtime.config.v1.yaml:${new Bun.CryptoHasher('sha256').update(sourceBytes).digest('hex')}`,
      );
      expect(nextBinding.source_digest).toBe(
        `agent-runtime.config.v1.yaml:${new Bun.CryptoHasher('sha256').update(changedBytes).digest('hex')}`,
      );
      expect(Object.isFrozen(firstBinding)).toBe(true);
      expect(Object.isFrozen(nextBinding)).toBe(true);
      expect(capturedRuntimeConfigurationBinding(first)).toBe(firstBinding);
      retain = false;
    } finally {
      closeLegacyConfigFixture(fixture, !retain);
    }
  });
});

describe('activated project config reader closure', () => {
  test('loads completed project config and rejects changed receipt identity after warming its cache', async () => {
    const deadlineAt = performance.now() + 10_000;
    const diagnosticEnabled = process.env.VIDA_ACTIVATED_CONFIG_PHASE_DIAGNOSTIC === '1';
    const diagnosticStartedAt = performance.now();
    const phases: { phase: string; elapsed_ms: number }[] = [];
    let currentPhase = 'fixture construction';
    let phaseStartedAt = diagnosticStartedAt;
    let cleanupRoot: string | undefined;
    let passed = false;
    const markPhase = (nextPhase?: string): void => {
      if (!diagnosticEnabled) return;
      const now = performance.now();
      const elapsed_ms = now - phaseStartedAt;
      phases.push({ phase: currentPhase, elapsed_ms });
      process.stderr.write(
        `${JSON.stringify({
          diagnostic: 'activated-config-phase-v1',
          phase: currentPhase,
          elapsed_ms,
        })}\n`,
      );
      currentPhase = nextPhase ?? '';
      phaseStartedAt = performance.now();
    };
    try {
      const root = await makeFreshRepository('config-repair-activated-shared-');
      cleanupRoot = root;
      await completeFreshUpgrade(root, 'config-reader-activated-shared-001', markPhase);
      markPhase('activated config reader success');
      const loaded = expectReturned(() => loadRuntimeConfig(root));
      markPhase('active config capability probe');
      expect(activeRuntimeConfigurationSource(requireSafeRepositoryAccess(root))).toBe(
        PROJECT_CONFIGURATION_PATHS.project,
      );
      markPhase('captured config binding probe');
      const binding = expectReturned(() => capturedRuntimeConfigurationBinding(loaded));
      expect(binding.repository_root).toBe(root);
      expect(binding.source).toBe(PROJECT_CONFIGURATION_PATHS.project);
      expect(binding.source_digest).toMatch(/^[0-9a-f]{64}$/u);
      expect(Object.isFrozen(binding)).toBe(true);

      markPhase('output drift preparation');
      const outputPath = path.join(root, INITIALIZED_PROJECT_PATHS.sidecar);
      const originalOutputBytes = readFileSync(outputPath);
      const changedOutputBytes = Buffer.concat([
        originalOutputBytes,
        Buffer.from('\n# output drift after activation\n'),
      ]);
      writeFileSync(outputPath, changedOutputBytes);
      expect(readFileSync(outputPath)).toEqual(changedOutputBytes);
      markPhase('output drift reader denial');
      expect(() => loadRuntimeConfig(root)).toThrow(
        `activated project output changed: ${INITIALIZED_PROJECT_PATHS.sidecar}`,
      );
      expect(readFileSync(outputPath)).toEqual(changedOutputBytes);
      markPhase('output restoration');
      writeFileSync(outputPath, originalOutputBytes);
      expect(readFileSync(outputPath)).toEqual(originalOutputBytes);
      markPhase('cached config reader probe');
      expect(expectReturned(() => loadRuntimeConfig(root))).toBe(loaded);

      const receiptPath = path.join(root, PROJECT_INITIALIZATION_PATH);
      markPhase('initialization receipt validation');
      const receiptValue: unknown = JSON.parse(readFileSync(receiptPath, 'utf8'));
      const receipt = validateProjectInitializationReceipt(receiptValue);
      expect(receipt.current_input_digest).toMatch(/^[0-9a-f]{64}$/u);
      expect(receipt.current_input_digest).not.toBe('0'.repeat(64));
      markPhase('initialization receipt mutation');
      writeFileSync(receiptPath, JSON.stringify({ ...receipt, current_input_digest: '0'.repeat(64) }) + '\n');
      const changedReceiptBytes = readFileSync(receiptPath);
      markPhase('receipt identity reader denial');
      expect(() => loadRuntimeConfig(root)).toThrow(
        'activated project configuration differs from its exact initialization closure',
      );
      expect(readFileSync(receiptPath)).toEqual(changedReceiptBytes);
      if (performance.now() >= deadlineAt) throw new Error('Activated config fixture deadline expired.');
      passed = true;
    } finally {
      try {
        markPhase('cleanup');
        if (cleanupRoot !== undefined) finishActivatedConfigFixture(cleanupRoot, passed, deadlineAt);
      } finally {
        markPhase();
        if (diagnosticEnabled) {
          process.stderr.write(
            `${JSON.stringify({
              diagnostic: 'activated-config-phase-v1',
              passed,
              case_deadline_ms: 10_000,
              elapsed_ms: performance.now() - diagnosticStartedAt,
              phases,
            })}\n`,
          );
        }
      }
    }
  }, 10_000);
});
