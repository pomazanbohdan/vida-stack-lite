import { afterEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mutationToolInputs } from '../tooling/mutation-evidence.js';
import { orchestrationDeadline, remainingChildTimeoutMs } from '../tooling/quality-final.js';
import {
  capturedModuleInputs,
  coverageToolInputs,
  qualityFingerprint,
  qualityInputProjections,
} from '../tooling/bun-coverage-evidence.ts';

const temporaryRoots: string[] = [];

function fixtureRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'quality-input-projections-'));
  temporaryRoots.push(root);
  const write = (relative: string, contents = 'fixture\n'): void => {
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, contents);
  };
  write('package.json', JSON.stringify({ files: ['src/**', 'bin/**'], scripts: {} }));
  for (const source of [
    'src/host-state.ts',
    'src/lifecycle/lifecycle-state.ts',
    'src/orchestration/persistent-session-handoff.ts',
    'src/orchestration/session-handoff.ts',
    'src/runtime-kernel.ts',
  ])
    write(source, 'export const fixture = true;\n');
  write('bin/cli-metadata.ts', 'export const fixture = true;\n');
  write('tests/fixture.test.mjs', "test('inert fixture', () => {});\n");
  for (const file of [...coverageToolInputs, ...mutationToolInputs, 'tooling/quality-final.ts'])
    if (file !== 'package.json') write(file);
  write('schemas/fixture.schema.json', '{}\n');
  write('templates/fixture.template.yaml', 'fixture: true\n');
  write('instructions/fixture.md', 'fixture\n');
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});
async function expectRejected(action: () => Promise<unknown>, expected: RegExp): Promise<void> {
  let error: unknown;
  try {
    await action();
  } catch (caught) {
    error = caught;
  }
  if (!(error instanceof Error) || !expected.test(error.message))
    throw new Error(`Expected rejection matching ${expected}; received ${String(error)}.`);
}

describe('final quality deadlines', () => {
  test('carries one absolute deadline forward while reserving child cleanup', () => {
    const deadlineAt = orchestrationDeadline(100, 10_000);
    expect(deadlineAt).toBe(10_100);
    expect(remainingChildTimeoutMs(deadlineAt, 2_500, 5_000)).toBe(2_600);
    expect(remainingChildTimeoutMs(deadlineAt, 2_500, 9_000)).toBe(0);
    expect(remainingChildTimeoutMs(deadlineAt, 2_500, 10_100)).toBe(0);
  });

  test('rejects invalid deadline durations and cleanup reservations', () => {
    expect(() => orchestrationDeadline(10, 0)).toThrow(/deadline inputs/u);
    expect(() => remainingChildTimeoutMs(100, -1, 10)).toThrow(/deadline inputs/u);
    expect(() => remainingChildTimeoutMs(Number.POSITIVE_INFINITY, 0, 10)).toThrow(/deadline inputs/u);
  });
});

describe('final quality input projections', () => {
  test('excludes declaration suffixes from runtime modules regardless of basename', () => {
    const declarationPaths = ['word', 'edge-name', 'nested.name', 'їм’я'].flatMap((name) =>
      ['ts', 'mts', 'cts'].map((extension) => `tooling/${name}.d.${extension}`),
    );
    const runtimePaths = [
      'src/run.ts',
      'tests/edge-name.test.ts',
      'tooling/helper.mts',
      'schemas/input.json',
      'assets/probe.svg',
    ];
    const entries = (paths: string[]) => paths.map((file) => ({ path: file, sha256: '0'.repeat(64) }));
    const inputs = {
      sources: entries(runtimePaths.slice(0, 1)),
      test_inputs: entries(runtimePaths.slice(1, 2)),
      tool_inputs: entries([...declarationPaths, ...runtimePaths.slice(2), 'tooling/no-extension']),
    };
    expect(capturedModuleInputs(inputs)).toEqual(
      entries(runtimePaths).sort((left, right) => left.path.localeCompare(right.path)),
    );
    expect(inputs.tool_inputs.map(({ path: file }) => file)).toEqual([
      ...declarationPaths,
      ...runtimePaths.slice(2),
      'tooling/no-extension',
    ]);
  });

  test('projects the exact existing fingerprints and tool bytes from one shared guard capture', async () => {
    const root = fixtureRoot();
    const projections = await qualityInputProjections(root, {
      coverage: ['tooling/coverage-gate.ts'],
      mutation: [...mutationToolInputs, ...coverageToolInputs, ...mutationToolInputs],
      guard: [...mutationToolInputs, 'tooling/quality-final.ts'],
    });
    for (const name of ['coverage', 'mutation', 'guard'] as const)
      expect(projections[name].sources.map(({ path: file }) => file)).toContain('bin/cli-metadata.ts');
    const contractPaths = ['schemas/fixture.schema.json', 'templates/fixture.template.yaml', 'instructions/fixture.md'];
    const expectedPaths = {
      coverage: [...new Set([...coverageToolInputs, 'tooling/coverage-gate.ts', ...contractPaths])].sort(),
      mutation: [...new Set([...coverageToolInputs, ...mutationToolInputs, ...contractPaths])].sort(),
      guard: [
        ...new Set([...coverageToolInputs, ...mutationToolInputs, 'tooling/quality-final.ts', ...contractPaths]),
      ].sort(),
    };
    for (const name of ['coverage', 'mutation', 'guard'] as const) {
      expect(qualityFingerprint(projections[name])).toMatch(/^[0-9a-f]{64}$/u);
      expect(projections[name].source_fingerprint).toMatch(/^[0-9a-f]{64}$/u);
      expect(projections[name].test_fingerprint).toMatch(/^[0-9a-f]{64}$/u);
      expect(projections[name].tool_inputs.map(({ path: file }) => file)).toEqual(expectedPaths[name]);
      expect(projections[name].tool_inputs.map(({ path: file }) => file)).toContain('tooling/bun-coverage-evidence.ts');
      expect(projections[name].module_inputs.some(({ path: file }) => /\.d\.(?:ts|mts|cts)$/u.test(file))).toBe(false);
      expect(new Set(projections[name].tool_inputs.map(({ path: file }) => file)).size).toBe(
        projections[name].tool_inputs.length,
      );
      for (const directory of ['schemas/', 'templates/', 'instructions/'])
        expect(projections[name].tool_inputs.some(({ path: file }) => file.startsWith(directory))).toBe(true);
    }
    expect(Object.isFrozen(projections)).toBe(true);
    expect(Object.isFrozen(projections.guard)).toBe(true);
    expect(Object.isFrozen(projections.guard.tool_inputs)).toBe(true);
    expect(Object.isFrozen(projections.guard.tool_inputs[0])).toBe(true);
    expect(projections.coverage.input_bytes['tooling/coverage-gate.ts']).toBe(
      projections.guard.input_bytes['tooling/coverage-gate.ts'],
    );
    const sharedPaths = Object.keys(projections.coverage.input_bytes).filter(
      (file) => file in projections.mutation.input_bytes && file in projections.guard.input_bytes,
    );
    expect(sharedPaths.length).toBeGreaterThan(0);
    for (const file of sharedPaths) {
      expect(projections.coverage.input_bytes[file]).toBe(projections.mutation.input_bytes[file]);
      expect(projections.mutation.input_bytes[file]).toBe(projections.guard.input_bytes[file]);
    }
    expect(projections.guard).not.toHaveProperty('status');
    expect(projections.guard).not.toHaveProperty('qualification');
  });

  test('captures selected tests’ transitive maintained tooling imports from one byte snapshot', async () => {
    const root = fixtureRoot();
    writeFileSync(
      path.join(root, 'tests/fixture.test.mjs'),
      "import { first } from '../tooling/discovered-runtime.ts';\ntest('captured dependency', () => expect(first).toBe(true));\n",
    );
    writeFileSync(
      path.join(root, 'tooling/discovered-runtime.ts'),
      "import { second } from './discovered-leaf.ts';\nexport const first = second;\n",
    );
    writeFileSync(path.join(root, 'tooling/discovered-leaf.ts'), 'export const second = true;\n');

    const projections = await qualityInputProjections(root, {
      coverage: [],
      mutation: [],
      guard: [],
    });
    for (const name of ['coverage', 'mutation', 'guard'] as const) {
      expect(projections[name].tool_inputs.map(({ path: file }) => file)).toContain('tooling/discovered-runtime.ts');
      expect(projections[name].tool_inputs.map(({ path: file }) => file)).toContain('tooling/discovered-leaf.ts');
      expect(projections[name].module_inputs.map(({ path: file }) => file)).toContain('tooling/discovered-leaf.ts');
    }
    expect(projections.coverage.input_bytes['tooling/discovered-leaf.ts']).toBe(
      projections.mutation.input_bytes['tooling/discovered-leaf.ts'],
    );
    expect(projections.mutation.input_bytes['tooling/discovered-leaf.ts']).toBe(
      projections.guard.input_bytes['tooling/discovered-leaf.ts'],
    );
  });

  test('captures the exact repository tooling subtree and canonicalizes imports back into the package', async () => {
    const repository = mkdtempSync(path.join(os.tmpdir(), 'quality-repository-tooling-'));
    temporaryRoots.push(repository);
    const root = path.join(repository, 'packages/agent');
    const write = (relative: string, contents = 'fixture\n'): void => {
      const file = path.join(root, relative);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, contents);
    };
    write('package.json', JSON.stringify({ files: ['src/**', 'bin/**'], scripts: {} }));
    for (const source of [
      'src/host-state.ts',
      'src/lifecycle/lifecycle-state.ts',
      'src/orchestration/persistent-session-handoff.ts',
      'src/orchestration/session-handoff.ts',
      'src/runtime-kernel.ts',
    ])
      write(source, 'export const fixture = true;\n');
    write('bin/cli-metadata.ts', 'export const fixture = true;\n');
    write(
      'tests/fixture.test.mjs',
      "import { assurance } from '../../../tooling/agent/release-assurance.ts';\ntest('repository tool', () => expect(assurance).toBe(true));\n",
    );
    for (const file of [...coverageToolInputs, ...mutationToolInputs, 'tooling/quality-final.ts'])
      if (file !== 'package.json') write(file);
    write('schemas/fixture.schema.json', '{}\n');
    write('templates/fixture.template.yaml', 'fixture: true\n');
    write('instructions/fixture.md', 'fixture\n');
    const repositoryTool = path.join(repository, 'tooling/agent/release-assurance.ts');
    mkdirSync(path.dirname(repositoryTool), { recursive: true });
    writeFileSync(
      repositoryTool,
      "import { fixture } from '../../packages/agent/src/host-state.ts';\nexport const assurance = fixture;\n",
    );

    const projections = await qualityInputProjections(root, { coverage: [], mutation: [], guard: [] });
    for (const name of ['coverage', 'mutation', 'guard'] as const) {
      expect(projections[name].tool_inputs.map(({ path: file }) => file)).toContain(
        '_repository/tooling/agent/release-assurance.ts',
      );
      expect(projections[name].sources.map(({ path: file }) => file)).toContain('src/host-state.ts');
      expect(projections[name].sources.filter(({ path: file }) => file === 'src/host-state.ts')).toHaveLength(1);
      expect(projections[name].tool_inputs.map(({ path: file }) => file)).not.toContain('src/host-state.ts');
      expect(projections[name].input_bytes['src/host-state.ts']).toBe(
        projections.coverage.input_bytes['src/host-state.ts'],
      );
    }
  });

  test('rejects a sibling repository subtree import outside captured repository tooling', async () => {
    const repository = mkdtempSync(path.join(os.tmpdir(), 'quality-repository-sibling-'));
    temporaryRoots.push(repository);
    const root = path.join(repository, 'packages/agent');
    const packageFixture = fixtureRoot();
    for (const source of [
      'package.json',
      'src/host-state.ts',
      'src/lifecycle/lifecycle-state.ts',
      'src/orchestration/persistent-session-handoff.ts',
      'src/orchestration/session-handoff.ts',
      'src/runtime-kernel.ts',
      'bin/cli-metadata.ts',
      'tests/fixture.test.mjs',
      ...coverageToolInputs,
      ...mutationToolInputs,
      'tooling/quality-final.ts',
      'schemas/fixture.schema.json',
      'templates/fixture.template.yaml',
      'instructions/fixture.md',
    ]) {
      const target = path.join(root, source);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(
        target,
        source === 'tests/fixture.test.mjs'
          ? "import '../../../tooling/sibling/escape.ts';\n"
          : readFileSync(path.join(packageFixture, source)),
      );
    }
    await expectRejected(
      () => qualityInputProjections(root, { coverage: [], mutation: [], guard: [] }),
      /outside admitted package roots|unadmitted repository/u,
    );
  });

  test('binds transitive tooling bytes into tool and quality fingerprints', async () => {
    const root = fixtureRoot();
    writeFileSync(
      path.join(root, 'tests/fixture.test.mjs'),
      "import { dependency } from '../tooling/discovered-runtime.ts';\ntest('captured dependency', () => expect(dependency).toBe(true));\n",
    );
    writeFileSync(path.join(root, 'tooling/discovered-runtime.ts'), 'export const dependency = true;\n');
    const projection = { coverage: [], mutation: [], guard: [] };
    const before = await qualityInputProjections(root, projection);
    writeFileSync(path.join(root, 'tooling/discovered-runtime.ts'), 'export const dependency = false;\n');
    const after = await qualityInputProjections(root, projection);

    expect(after.guard.tool_fingerprint).not.toBe(before.guard.tool_fingerprint);
    expect(qualityFingerprint(after.guard)).not.toBe(qualityFingerprint(before.guard));
  });

  test('keeps imported maintained Source bound through source fingerprints', async () => {
    const root = fixtureRoot();
    writeFileSync(
      path.join(root, 'tests/fixture.test.mjs'),
      "import '../src/host-state.ts';\ntest('source dependency', () => {});\n",
    );
    const before = await qualityInputProjections(root, { coverage: [], mutation: [], guard: [] });
    writeFileSync(path.join(root, 'src/host-state.ts'), 'export const fixture = false;\n');
    const after = await qualityInputProjections(root, { coverage: [], mutation: [], guard: [] });

    expect(after.guard.source_fingerprint).not.toBe(before.guard.source_fingerprint);
    expect(after.guard.tool_inputs.map(({ path: file }) => file)).not.toContain('src/host-state.ts');
  });

  test('resolves TypeScript extension aliases and closes cycles plus literal dynamic imports', async () => {
    const root = fixtureRoot();
    writeFileSync(
      path.join(root, 'tests/fixture.test.mjs'),
      "import '../tooling/discovered-runtime.js';\ntest('runtime graph', () => {});\n",
    );
    writeFileSync(
      path.join(root, 'tooling/discovered-runtime.ts'),
      "import './discovered-leaf.ts';\nvoid import('./dynamic-target.ts');\nexport const runtime = true;\n",
    );
    writeFileSync(
      path.join(root, 'tooling/discovered-leaf.ts'),
      "import './discovered-runtime.js';\nexport const leaf = true;\n",
    );
    writeFileSync(path.join(root, 'tooling/dynamic-target.ts'), 'export const dynamic = true;\n');

    const { guard } = await qualityInputProjections(root, { coverage: [], mutation: [], guard: [] });
    const capturedTools = guard.tool_inputs.map(({ path: file }) => file);
    expect(capturedTools).toContain('tooling/discovered-runtime.ts');
    expect(capturedTools).toContain('tooling/discovered-leaf.ts');
    expect(capturedTools).toContain('tooling/dynamic-target.ts');
  });

  test('rejects unresolved and escaping relative runtime imports during capture', async () => {
    const unresolved = fixtureRoot();
    writeFileSync(path.join(unresolved, 'tests/fixture.test.mjs'), "import './missing.ts';\n");
    await expectRejected(
      () => qualityInputProjections(unresolved, { coverage: [], mutation: [], guard: [] }),
      /Unresolved package-local runtime import/u,
    );

    const escaping = fixtureRoot();
    writeFileSync(path.join(escaping, 'tests/fixture.test.mjs'), "import '../../outside.ts';\n");
    await expectRejected(
      () => qualityInputProjections(escaping, { coverage: [], mutation: [], guard: [] }),
      /escapes the package|outside admitted package roots/u,
    );
  });

  test('rejects missing, malformed and escaping projection declarations before any filesystem read', async () => {
    await expectRejected(
      () => qualityInputProjections('/does-not-exist', { coverage: [], mutation: [] }),
      /exactly coverage, mutation and guard/u,
    );
    await expectRejected(
      () =>
        qualityInputProjections('/does-not-exist', {
          coverage: [],
          mutation: [],
          guard: ['../outside.mjs'],
        }),
      /malformed/u,
    );
    await expectRejected(
      () =>
        qualityInputProjections('/does-not-exist', {
          coverage: [],
          mutation: [],
          guard: 'not-a-path-list' as unknown,
        }),
      /malformed/u,
    );
  });
});
