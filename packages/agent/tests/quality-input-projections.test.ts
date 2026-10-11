import { afterEach, describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
