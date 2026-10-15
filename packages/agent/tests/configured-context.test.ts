import { afterAll, describe, expect, spyOn, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as fs from 'node:fs';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  loadRuntimeConfig,
  readRuntimePackageResourceBytes,
  runtimePackageAccess,
} from '../src/config/runtime-config.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { buildConfiguredContext, type ConfiguredContextRequest } from '../src/orchestration/configured-context.ts';
import * as safeRepositoryAccess from '../src/config/safe-repository-access.ts';

const sourceRoot =
  process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT ?? path.resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const root = mkdtempSync(path.join(tmpdir(), 'vida-configured-context-'));
const packageRoot = runtimePackageAccess().repository_root;
mkdirSync(path.join(packageRoot, '.tmp'), { recursive: true });
const packageResourceDirectory = mkdtempSync(path.join(packageRoot, '.tmp/configured-context-'));
const packageResourcePath = path.join(packageResourceDirectory, 'context.txt');
const packageResourceContents = Buffer.from('Package owned context bytes.\nУкраїна.\n');
writeFileSync(packageResourcePath, packageResourceContents);
const packageResourceRelative = path.relative(packageRoot, packageResourcePath).split(path.sep).join('/');
const packageResourceLocation = `packages/agent/${packageResourceRelative}`;
const yaml = readFileSync(path.join(sourceRoot, 'agent-runtime.config.v1.yaml'), 'utf8');
if (
  !yaml.includes('id: runtime-development-lifecycle') ||
  !yaml.includes('location: packages/agent/instructions/development-lifecycle.md')
)
  throw Error('configured context fixture source registration is missing');
writeFileSync(
  path.join(root, 'agent-runtime.config.v1.yaml'),
  yaml
    .replaceAll('runtime-development-lifecycle', 'candidate-testing')
    .replace('location: packages/agent/instructions/development-lifecycle.md', 'location: docs/context.md')
    .replace(
      '      title: Current portable development lifecycle\n',
      `      title: Current portable development lifecycle\n    - id: package-fixture\n      kind: local\n      location: ${packageResourceLocation}\n      title: Package owned test resource\n`,
    ),
);
mkdirSync(path.join(root, 'docs'), { recursive: true });
mkdirSync(path.join(root, '.codex/skills/clio'), { recursive: true });
writeFileSync(path.join(root, 'docs/context.md'), '# Fixture source\nCurrent test context.\n');
writeFileSync(path.join(root, '.codex/skills/clio/SKILL.md'), '# Fixture skill\nUse only the selected test source.\n');
writeFileSync(path.join(root, 'AGENTS.md'), '# Fixture instructions\nRead the fixture sidecar.\n');
writeFileSync(path.join(root, 'AGENT.sidecar.md'), '# Fixture source map\nSelected Source: docs/context.md\n');
afterAll(() => {
  if (!path.resolve(root).startsWith(path.resolve(tmpdir(), 'vida-configured-context-')))
    throw Error('owned context fixture cleanup target differs');
  rmSync(root, { recursive: true, force: true });
  if (!path.resolve(packageResourceDirectory).startsWith(path.resolve(packageRoot, '.tmp/configured-context-')))
    throw Error('owned package context fixture cleanup target differs');
  rmSync(packageResourceDirectory, { recursive: true, force: true });
});
const config = loadRuntimeConfig(root);
const nativePackageTest = test.skipIf(process.platform !== 'linux');
const base: ConfiguredContextRequest = {
  work_id: 'context-test',
  attempt: 1,
  source_ids: ['candidate-testing', 'a2a-1'],
  skill_refs: ['.codex/skills/clio/SKILL.md'],
};

describe('configured local context', () => {
  test('rejects content drift when its reader reuses a mutable buffer', () => {
    const shared = Buffer.from('before');
    let reads = 0;
    const originalRequire = safeRepositoryAccess.requireSafeRepositoryAccess;
    const accessSpy = spyOn(safeRepositoryAccess, 'requireSafeRepositoryAccess').mockImplementation((requestedRoot) => {
      const access = originalRequire(requestedRoot);
      if (path.resolve(requestedRoot) !== path.resolve(root)) return access;
      return {
        ...access,
        readBytes(target: string, label: string): Buffer {
          if (path.resolve(root, target) !== path.join(root, 'docs/context.md')) return access.readBytes(target, label);
          if (++reads === 2) shared.write('after!');
          return shared;
        },
      };
    });
    try {
      expect(() =>
        buildConfiguredContext(root, config, { ...base, source_ids: ['candidate-testing'], skill_refs: [] }),
      ).toThrow('changed during read');
      expect(reads).toBe(2);
    } finally {
      accessSpy.mockRestore();
    }
  });

  test('is stable, sorted and explicit about unfetched official references', () => {
    const first = buildConfiguredContext(root, config, base);
    const second = buildConfiguredContext(root, config, {
      ...base,
      source_ids: [...base.source_ids].reverse(),
    });
    expect(first).toEqual(second);
    expect(first.entries.map((entry) => [entry.kind, entry.id])).toEqual([
      ['local', 'candidate-testing'],
      ['official', 'a2a-1'],
      ['skill', '.codex/skills/clio/SKILL.md'],
    ]);
    const officialEntry = first.entries.find((entry) => entry.id === 'a2a-1');
    if (!officialEntry) throw Error('official context entry is missing');
    expect(officialEntry).toMatchObject({ status: 'unfetched_reference', sha256: null, bytes: null, content: null });
    for (const entry of [first.entries[0], first.entries[2]]) {
      if (!entry) throw Error('expected local context entry is missing');
      expect(entry.status).toBe('local_excerpt');
      expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(entry.bytes).toBeGreaterThan(0);
      if (entry.content === null) throw Error('local context content is missing');
      expect(entry.content.length).toBeLessThanOrEqual(8192);
    }
    const { digest, ...body } = first;
    expect(digest).toBe(canonicalJsonDigest(body));
  });

  nativePackageTest('reads the selected package resource twice and binds exact bytes without sidecar writes', () => {
    const packageAccess = runtimePackageAccess();
    const direct = readRuntimePackageResourceBytes(
      packageAccess,
      packageResourceRelative,
      'configured context direct fixture',
      64 * 1024,
    );
    expect(direct).toEqual(packageResourceContents);
    const beforeEntries = readdirSync(packageResourceDirectory).sort();
    const observations: Array<{
      readonly method: string;
      readonly target: string;
      readonly maxBytes: number | undefined;
    }> = [];
    const originalRequire = safeRepositoryAccess.requireSafeRepositoryAccess;
    const accessSpy = spyOn(safeRepositoryAccess, 'requireSafeRepositoryAccess').mockImplementation((requestedRoot) => {
      const access = originalRequire(requestedRoot);
      if (path.resolve(requestedRoot) !== path.resolve(packageRoot)) return access;
      const readVerifiedCaptureBytes = access.readVerifiedCaptureBytes;
      const readStableBytes = access.readStableBytes;
      return {
        ...access,
        ...(readVerifiedCaptureBytes
          ? {
              readVerifiedCaptureBytes: function (target: string, label: string, maxBytes?: number): Buffer {
                observations.push({ method: 'verified', target, maxBytes });
                return readVerifiedCaptureBytes.call(access, target, label, maxBytes);
              },
            }
          : {}),
        ...(readStableBytes
          ? {
              readStableBytes: function (target: string, label: string): Buffer | null {
                observations.push({ method: 'stable', target, maxBytes: undefined });
                return readStableBytes.call(access, target, label);
              },
            }
          : {}),
        readBytes(target: string, label: string): Buffer {
          observations.push({ method: 'cas', target, maxBytes: undefined });
          return access.readBytes(target, label);
        },
      };
    });
    const writes = spyOn(fs, 'writeSync');
    const syncs = spyOn(fs, 'fsyncSync');
    try {
      const result = buildConfiguredContext(root, config, {
        ...base,
        source_ids: ['package-fixture'],
        skill_refs: [],
      });
      const entry = result.entries.find((candidate) => candidate.id === 'package-fixture');
      expect(entry).toMatchObject({
        location: packageResourceLocation,
        status: 'local_excerpt',
        sha256: createHash('sha256').update(packageResourceContents).digest('hex'),
        bytes: packageResourceContents.length,
        content: packageResourceContents.toString('utf8'),
        truncated: false,
      });
      expect(writes).not.toHaveBeenCalled();
      expect(syncs).not.toHaveBeenCalled();
      expect(observations.map(({ target }) => target)).toEqual([
        'package.json',
        packageResourceRelative,
        packageResourceRelative,
      ]);
      expect(observations.map(({ method }) => method)).toEqual(['verified', 'verified', 'verified']);
      expect(observations[1]?.maxBytes).toBe(64 * 1024);
      expect(observations[2]?.maxBytes).toBe(64 * 1024);
      expect(readdirSync(packageResourceDirectory).sort()).toEqual(beforeEntries);
      expect(existsSync(path.join(packageResourceDirectory, '.context.txt.cas.lock'))).toBe(false);
    } finally {
      writes.mockRestore();
      syncs.mockRestore();
      accessSpy.mockRestore();
    }
  });

  nativePackageTest('package context reads deny active CAS and recovery state without changing the resource', () => {
    const packageAccess = runtimePackageAccess();
    const lockStem = path.join(path.dirname(packageResourceRelative), '.context.txt.cas');
    const lockPath = path.join(packageRoot, `${lockStem}.lock`);
    packageAccess.withExclusiveLock(lockStem, 'configured context active CAS fixture', () => {
      const ownerBytes = readFileSync(lockPath);
      const ownerIdentity = lstatSync(lockPath, { bigint: true });
      expect(() =>
        buildConfiguredContext(root, config, { ...base, source_ids: ['package-fixture'], skill_refs: [] }),
      ).toThrow(/active CAS writer/);
      expect(readFileSync(lockPath)).toEqual(ownerBytes);
      const ownerAfter = lstatSync(lockPath, { bigint: true });
      expect(ownerAfter.dev).toBe(ownerIdentity.dev);
      expect(ownerAfter.ino).toBe(ownerIdentity.ino);
      expect(readFileSync(packageResourcePath)).toEqual(packageResourceContents);
    });

    const reclaimPath = `${lockPath}.reclaim`;
    mkdirSync(reclaimPath);
    const ownerPath = path.join(reclaimPath, 'owner.json');
    writeFileSync(ownerPath, '{"schema":"retained"}');
    const ownerBytes = readFileSync(ownerPath);
    const ownerIdentity = lstatSync(ownerPath, { bigint: true });
    try {
      expect(() =>
        buildConfiguredContext(root, config, { ...base, source_ids: ['package-fixture'], skill_refs: [] }),
      ).toThrow(/CAS reclaim is active/);
      expect(readFileSync(ownerPath)).toEqual(ownerBytes);
      const ownerAfter = lstatSync(ownerPath, { bigint: true });
      expect(ownerAfter.dev).toBe(ownerIdentity.dev);
      expect(ownerAfter.ino).toBe(ownerIdentity.ino);
      expect(readFileSync(packageResourcePath)).toEqual(packageResourceContents);
    } finally {
      rmSync(reclaimPath, { recursive: true, force: true });
    }
  });

  test('rejects missing, duplicate and unsafe references', () => {
    expect(() => buildConfiguredContext(root, config, { ...base, source_ids: ['missing'] })).toThrow(
      /not unique and configured/,
    );
    expect(() => buildConfiguredContext(root, config, { ...base, source_ids: ['a2a-1', 'a2a-1'] })).toThrow(
      /duplicates/,
    );
    expect(() =>
      buildConfiguredContext(root, config, { ...base, skill_refs: ['.codex/skills/does-not-exist/SKILL.md'] }),
    ).toThrow();
    expect(() => buildConfiguredContext(root, config, { ...base, skill_refs: ['.codex/skills/../SKILL.md'] })).toThrow(
      /skill reference/,
    );
  });

  test.skipIf(process.platform !== 'linux')(
    'labels a missing required context file and retains the filesystem cause',
    () => {
      const missingSkill = '.codex/skills/missing-case/SKILL.md';
      let failure: unknown;
      try {
        buildConfiguredContext(root, config, { ...base, skill_refs: [missingSkill] });
      } catch (error) {
        failure = error;
      }
      expect(failure).toBeInstanceOf(Error);
      if (!(failure instanceof Error)) throw Error('Expected a missing configured context error');
      expect(failure.message).toBe(`configured context ${missingSkill} is missing`);
      const cause = failure.cause;
      expect(cause).toBeInstanceOf(Error);
      if (!(cause instanceof Error)) throw Error('Expected the original filesystem cause');
      expect(Reflect.get(cause, 'code')).toBe('ENOENT');
    },
  );

  test.skipIf(process.platform !== 'linux')('preserves non-ENOENT failures from the safe repository reader', () => {
    const invalidSkill = '.codex/skills/nonregular-case/SKILL.md';
    const invalidSkillPath = path.join(root, invalidSkill);
    mkdirSync(invalidSkillPath, { recursive: true });
    try {
      expect(() => buildConfiguredContext(root, config, { ...base, skill_refs: [invalidSkill] })).toThrow(
        /configured context \.codex\/skills\/nonregular-case\/SKILL\.md must be a regular single-link file/,
      );
    } finally {
      rmSync(path.dirname(invalidSkillPath), { recursive: true, force: true });
    }
  });
});
