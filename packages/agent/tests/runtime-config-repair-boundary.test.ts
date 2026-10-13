import { describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PROJECT_CONFIGURATION_PATHS } from '../src/config/project-paths.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { configuredTestContext } from './configured-context.ts';
import { expectRejection } from './helpers/expect-rejection.ts';
import {
  assertLoadedRuntimeConfig,
  capturedRuntimeConfigurationBinding,
  loadRuntimeConfig,
  parseRuntimeConfigYaml,
  runtimeConfigDigest,
  validateRuntimeConfigRepairTargetBytes,
} from '../src/config/runtime-config.ts';

const { repositoryRoot } = configuredTestContext();
const sourceBytes = readFileSync(path.join(repositoryRoot, 'agent-runtime.config.v1.yaml'));

import { captureCoverageConsumerBinding, assertCoverageConsumerBinding } from '../tooling/coverage-consumer-binding.ts';

function createLegacyConfigFixture(): { root: string; configFile: string; deadlineAt: number } {
  const deadlineAt = performance.now() + 5000;
  const root = mkdtempSync(path.join(tmpdir(), 'config-repair-cache-'));
  const config = parseRuntimeConfigYaml(sourceBytes.toString('utf8'));
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

describe('current-v1 exact-byte config repair boundary', () => {
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
