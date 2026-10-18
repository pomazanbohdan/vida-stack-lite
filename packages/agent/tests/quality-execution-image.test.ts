import { afterEach, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  loadQualityExecutionImageInputs,
  prepareQualityExecutionImage,
  qualitySourceStatusAdmitted,
  readQualityExecutionImageDescriptor,
  readQualityExecutionImageInputs,
  verifyQualityExecutionImage,
} from '../tooling/quality-execution-image.ts';
import { coverageToolInputs } from '../tooling/bun-coverage-evidence.ts';
import { expectRejection } from './helpers/expect-rejection.ts';

const originalManifest = process.env.VIDA_QUALITY_IMAGE_MANIFEST;
const originalDigest = process.env.VIDA_QUALITY_IMAGE_SHA256;
const fixtureRoots: string[] = [];

function nativeGit(root: string, args: string[]): void {
  const child = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  if (child.error || child.status !== 0)
    throw new Error(`Git fixture command failed: ${child.stderr || child.error?.message}`);
}

async function commitAll(root: string, message: string): Promise<void> {
  nativeGit(root, ['add', '-A']);
  nativeGit(root, ['commit', '-m', message]);
}

async function fixture(): Promise<{ root: string; packageRoot: string; sourcePackageRoot: string; storeRoot: string }> {
  const base = await mkdtemp(path.join(os.tmpdir(), 'quality-execution-image-'));
  fixtureRoots.push(base);
  const root = path.join(base, 'source');
  const packageRoot = path.join(root, 'packages', 'agent');
  const storeRoot = path.join(base, 'images');
  const write = async (relative: string, contents = 'fixture\n'): Promise<void> => {
    const file = path.join(packageRoot, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, contents);
  };
  await mkdir(packageRoot, { recursive: true });
  await mkdir(path.join(packageRoot, 'node_modules'), { recursive: true });
  await write('package.json', JSON.stringify({ files: ['src/**', 'bin/**'], scripts: {} }));
  await write('.bun-version', `${Bun.version}\n`);
  await write('bun.lock', '{}\n');
  for (const source of [
    'src/host-state.ts',
    'src/lifecycle/lifecycle-state.ts',
    'src/orchestration/persistent-session-handoff.ts',
    'src/orchestration/session-handoff.ts',
    'src/runtime-kernel.ts',
  ])
    await write(source, 'export const fixture = true;\n');
  await write('bin/cli-metadata.ts', 'export const fixture = true;\n');
  await write('tests/fixture.test.mjs', "test('fixture input', () => {});\n");
  for (const file of coverageToolInputs) if (file !== 'package.json') await write(file);
  for (const file of [
    'tsconfig.json',
    'tsconfig.checked-js.json',
    'bin/tsconfig.json',
    'tooling/quality-current.ts',
    'tooling/ts-only-source-gate.ts',
    'bin/bun.ts',
  ])
    await write(file, file.endsWith('.json') ? '{}' : 'export const fixture = true;\n');
  await write('schemas/fixture.schema.json', '{}\n');
  await write('templates/fixture.template.yaml', 'fixture: true\n');
  await write('instructions/fixture.md');
  for (const file of [
    'agent-runtime.config.v1.yaml',
    'AGENTS.md',
    'AGENT.sidecar.md',
    'docs/agent-instructions/documentation-policy.v1.json',
  ]) {
    const target = path.join(root, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, `captured ${file}\n`);
  }
  await mkdir(path.join(root, 'tests/agent'), { recursive: true });
  await writeFile(path.join(root, 'package.json'), '{"type":"module"}\n');
  await mkdir(path.join(root, '.agent/work/core-runtime-reactivation'), { recursive: true });
  await writeFile(path.join(root, '.agent/work/core-runtime-reactivation/CONTOUR-STATUS.json'), '{}\n');
  await writeFile(path.join(root, 'tests/agent/compiler-only.ts'), 'export const compilerOnly = true;\n');
  nativeGit(root, ['init', '--quiet']);
  nativeGit(root, ['config', 'user.name', 'Quality image test']);
  nativeGit(root, ['config', 'user.email', 'quality-image@example.invalid']);
  await commitAll(root, 'fixture base');
  return { root, packageRoot, sourcePackageRoot: packageRoot, storeRoot };
}

const selection = {
  mode: 'focused-diagnostic' as const,
  contour: 'image-fixture',
  sources: ['src/host-state.ts'],
  tests: ['tests/fixture.test.mjs'],
};

afterEach(async () => {
  if (originalManifest === undefined) delete process.env.VIDA_QUALITY_IMAGE_MANIFEST;
  else process.env.VIDA_QUALITY_IMAGE_MANIFEST = originalManifest;
  if (originalDigest === undefined) delete process.env.VIDA_QUALITY_IMAGE_SHA256;
  else process.env.VIDA_QUALITY_IMAGE_SHA256 = originalDigest;
  for (const root of fixtureRoots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe('quality execution images', () => {
  test('only unstaged owned derived projections may differ from the Source commit', () => {
    expect(qualitySourceStatusAdmitted('')).toBe(true);
    const output = '.agent/work/core-runtime-reactivation/CONTOUR-STATUS.json';
    expect(qualitySourceStatusAdmitted(` M ${output}\n`)).toBe(true);
    expect(qualitySourceStatusAdmitted(`M ${output}`)).toBe(true);
    for (const status of [
      `M  ${output}\n`,
      `?? ${output}\n`,
      ` M src/changed.ts\n`,
      ` D ${output}\n`,
      ` M ${output}\n M AGENTS.md\n`,
      ` M ${output}.old\n`,
    ])
      expect(qualitySourceStatusAdmitted(status)).toBe(false);
  });
  test('materializes one native-Git capture, reuses it, and keeps it stable after Source advances', async () => {
    const source = await fixture();
    const first = await prepareQualityExecutionImage({ ...source, selection, additionalToolInputs: [] });
    expect(first.source_commit).toMatch(/^[a-f0-9]{40,64}$/u);
    expect(await readQualityExecutionImageDescriptor(first.manifest_file, first.manifest_sha256)).toEqual(first);
    const captured = await readQualityExecutionImageInputs(first);
    expect(captured.input_bytes['src/host-state.ts']?.toString()).toBe('export const fixture = true;\n');
    expect(captured.tool_inputs.map((row) => row.path)).toContain('_repository/compiler/tests/agent/compiler-only.ts');
    expect(captured.tests).toEqual(selection.tests);
    expect(captured.input_bytes['_repository/compiler/package.json']?.toString()).toBe('{"type":"module"}\n');
    const reused = await prepareQualityExecutionImage({ ...source, selection, additionalToolInputs: [] });
    expect(reused).toEqual(first);
    await writeFile(
      path.join(source.root, '.agent/work/core-runtime-reactivation/CONTOUR-STATUS.json'),
      '{"attempts":1}\n',
    );
    expect(await prepareQualityExecutionImage({ ...source, selection, additionalToolInputs: [] })).toEqual(first);

    const changedSource = path.join(source.packageRoot, 'src/host-state.ts');
    await writeFile(changedSource, 'export const fixture = false;\n');
    await commitAll(source.root, 'advance fixture source');
    await verifyQualityExecutionImage(first);
    expect((await readQualityExecutionImageInputs(first)).input_bytes['src/host-state.ts']?.toString()).toBe(
      'export const fixture = true;\n',
    );
    const advanced = await prepareQualityExecutionImage({ ...source, selection, additionalToolInputs: [] });
    expect(advanced.source_commit).not.toBe(first.source_commit);
    expect(advanced.repository).not.toBe(first.repository);
  });

  test('rejects immutable byte and mode drift and retains partial image roots', async () => {
    const source = await fixture();
    const image = await prepareQualityExecutionImage({ ...source, selection, additionalToolInputs: [] });
    const file = path.join(image.packageRoot, 'src/host-state.ts');
    const originalBytes = await readFile(file);
    await writeFile(file, 'tampered\n');
    await expectRejection(verifyQualityExecutionImage(image), /bytes changed/u);
    await writeFile(file, originalBytes);
    await chmod(file, 0o755);
    await expectRejection(verifyQualityExecutionImage(image), /mode changed/u);
    await chmod(file, 0o644);

    const savedManifest = path.join(source.storeRoot, 'manifest.saved');
    await rename(image.manifest_file, savedManifest);
    await expectRejection(prepareQualityExecutionImage({ ...source, selection, additionalToolInputs: [] }), /partial/u);
    await rename(savedManifest, image.manifest_file);
  });

  test('rejects dirty captured Source and does not turn an untracked import into image input', async () => {
    const source = await fixture();
    const image = await prepareQualityExecutionImage({ ...source, selection, additionalToolInputs: [] });
    const testFile = path.join(source.packageRoot, 'tests/fixture.test.mjs');
    await writeFile(testFile, "import './loose.test-helper.ts';\ntest('fixture input', () => {});\n");
    await commitAll(source.root, 'select a test helper');
    await writeFile(path.join(source.packageRoot, 'tests/loose.test-helper.ts'), 'export const loose = true;\n');
    await expectRejection(
      prepareQualityExecutionImage({ ...source, selection, additionalToolInputs: [] }),
      /clean published Git/u,
    );
    await writeFile(path.join(source.root, '.gitignore'), 'packages/agent/tests/loose.test-helper.ts\n');
    await commitAll(source.root, 'ignore a loose helper');
    await expectRejection(
      prepareQualityExecutionImage({ ...source, selection, additionalToolInputs: [] }),
      /not a published Git blob/u,
    );
    expect(await readFile(path.join(image.packageRoot, 'tests/fixture.test.mjs'), 'utf8')).toBe(
      "test('fixture input', () => {});\n",
    );
  });

  test('uses no Source fallback and rejects incomplete image environment bindings', async () => {
    delete process.env.VIDA_QUALITY_IMAGE_MANIFEST;
    delete process.env.VIDA_QUALITY_IMAGE_SHA256;
    expect(await loadQualityExecutionImageInputs('/unused/package')).toBeNull();
    process.env.VIDA_QUALITY_IMAGE_MANIFEST = '/unused/.quality-image.json';
    delete process.env.VIDA_QUALITY_IMAGE_SHA256;
    await expectRejection(
      loadQualityExecutionImageInputs('/unused/package'),
      /Both quality image manifest environment values/u,
    );
    process.env.VIDA_QUALITY_IMAGE_SHA256 = 'not-a-sha256';
    await expectRejection(
      loadQualityExecutionImageInputs('/unused/package'),
      /Both quality image manifest environment values/u,
    );
  });
});
