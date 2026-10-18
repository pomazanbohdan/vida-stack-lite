import { afterEach, describe, expect, test } from 'bun:test';
import { linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { mutationToolInputs } from '../tooling/mutation-evidence.js';
import { orchestrationDeadline, remainingChildTimeoutMs } from '../tooling/quality-final.js';
import { expectRejection } from './helpers/expect-rejection.ts';
import { expectedJavascriptFiles } from '../tooling/maintained-source-inventory.ts';
import {
  coverageInputs,
  canonicalCapturedModulePath,
  capturedModuleAbsolutePath,
  capturedModuleInputs,
  coverageToolInputs,
  repositoryToolingInputPrefix,
  type CoverageReviewGitChange,
  coverageReviewInputPaths,
  sdkFormationToolInputPaths,
  qualityFingerprint,
  qualityInputProjections,
  readQualityInputs,
  testSelectionFingerprint,
} from '../tooling/bun-coverage-evidence.ts';

const temporaryRoots: string[] = [];

function fixtureRoot(repositoryLayout = false): string {
  const base = mkdtempSync(path.join(os.tmpdir(), 'quality-input-projections-'));
  temporaryRoots.push(base);
  const root = repositoryLayout ? path.join(base, 'packages/agent') : base;
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
  await expectRejection(Promise.resolve().then(action), expected);
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
  const contextFiles = [
    'agent-runtime.config.v1.yaml',
    'AGENTS.md',
    'AGENT.sidecar.md',
    'docs/agent-instructions/documentation-policy.v1.json',
  ];

  test('admits only the four repository context inputs through canonical captured paths', () => {
    const root = path.resolve('/synthetic/repository/packages/agent');
    for (const file of contextFiles) {
      const actual = path.resolve(root, '../..', file);
      const logical = `_repository/test-context/${file}`;
      expect(canonicalCapturedModulePath(root, actual)).toBe(logical);
      expect(capturedModuleAbsolutePath(root, logical)).toBe(actual);
    }
    for (const file of ['.vida/config.json', '.agent/work/history.json', 'package.json', '../AGENTS.md'])
      expect(() => capturedModuleAbsolutePath(root, `_repository/test-context/${file}`)).toThrow();
    expect(canonicalCapturedModulePath(root, path.resolve(root, '../../.agent/work/history.json'))).toBeNull();
    expect(() =>
      capturedModuleAbsolutePath('/synthetic/other-package', '_repository/test-context/AGENTS.md'),
    ).toThrow();
  });

  test('binds configured context bytes into the existing tool projection and rejects missing inputs', async () => {
    const root = fixtureRoot(true);
    const repositoryRoot = path.resolve(root, '../..');
    writeFileSync(path.join(root, 'tests/configured-context.ts'), 'export const context = true;\n');
    writeFileSync(path.join(root, 'tests/fixture.test.mjs'), "import './configured-context.ts';\n");
    for (const file of contextFiles) {
      const absolute = path.join(repositoryRoot, file);
      mkdirSync(path.dirname(absolute), { recursive: true });
      writeFileSync(absolute, `captured ${file}\n`);
    }
    const selection = { coverage: [], mutation: [], guard: [] };
    const before = await qualityInputProjections(root, selection);
    for (const owner of [before.coverage, before.mutation, before.guard]) {
      for (const file of contextFiles) {
        const logical = `_repository/test-context/${file}`;
        expect(owner.tool_inputs).toContainEqual({
          path: logical,
          sha256: createHash('sha256').update(`captured ${file}\n`).digest('hex'),
        });
        expect(owner.input_bytes[logical]?.toString()).toBe(`captured ${file}\n`);
      }
      expect(owner.test_selection.tests).toEqual(['tests/fixture.test.mjs']);
    }
    writeFileSync(path.join(repositoryRoot, 'AGENTS.md'), 'changed context\n');
    const after = await qualityInputProjections(root, selection);
    expect(after.mutation.tool_fingerprint).not.toBe(before.mutation.tool_fingerprint);
    expect(after.mutation.source_fingerprint).toBe(before.mutation.source_fingerprint);
    expect(after.mutation.test_fingerprint).toBe(before.mutation.test_fingerprint);
    expect(before.mutation.input_bytes['_repository/test-context/AGENTS.md']?.toString()).toBe('captured AGENTS.md\n');
    rmSync(path.join(repositoryRoot, 'AGENT.sidecar.md'));
    await expectRejected(() => qualityInputProjections(root, selection), /missing|rejected/u);
  });

  test('reads logical repository inputs from their retained snapshot without live checkout resolution', async () => {
    const root = fixtureRoot(true);
    const snapshot = path.join(root, 'coverage/bun-unified/runs/fixture/snapshot');
    const files = ['_repository/test-context/AGENTS.md', '_repository/tooling/agent/fixture.ts'];
    for (const file of files) {
      const absolute = path.join(snapshot, file);
      mkdirSync(path.dirname(absolute), { recursive: true });
      writeFileSync(absolute, `retained ${file}\n`);
    }
    const captured = await readQualityInputs(snapshot, files, 'snapshot');
    expect([...captured.keys()].sort()).toEqual([...files].sort());
    for (const file of files) expect(captured.get(file)?.toString()).toBe(`retained ${file}\n`);
    await expectRejected(() => readQualityInputs(snapshot, files), /outside admitted roots/u);
    for (const file of ['../escape', '_repository/test-context/.vida/config.json'])
      await expectRejected(() => readQualityInputs(snapshot, [file], 'snapshot'), /malformed|outside admitted roots/u);
    const linked = path.join(snapshot, files[0]!);
    rmSync(linked);
    symlinkSync(path.join(snapshot, files[1]!), linked);
    await expectRejected(() => readQualityInputs(snapshot, files, 'snapshot'), /rejected/u);
  });

  test('review input delta discovers helpers and owned SDK inputs without selecting helper files as tests', () => {
    const anchor = {
      sources: [{ path: 'src/current.ts', sha256: 'a'.repeat(64) }],
      test_inputs: [{ path: 'tests/sdk-package-compatibility.test.ts', sha256: 'b'.repeat(64) }],
      tool_inputs: [{ path: 'tooling/bun-coverage-evidence.ts', sha256: 'c'.repeat(64) }],
      test_selection: { mode: 'full-current-test-set' as const, tests: ['tests/sdk-package-compatibility.test.ts'] },
    };
    const currentSelection = {
      mode: 'full-current-test-set' as const,
      tests: ['tests/sdk-package-compatibility.test.ts', 'tests/new-case.test.ts'],
    };
    const current = {
      sources: anchor.sources,
      test_inputs: [
        ...anchor.test_inputs,
        { path: 'tests/helpers/new-fixture.ts', sha256: 'd'.repeat(64) },
        { path: 'tests/new-case.test.ts', sha256: 'e'.repeat(64) },
      ],
      tool_inputs: [
        ...anchor.tool_inputs,
        ...[...new Set([...coverageToolInputs, ...sdkFormationToolInputPaths('current', currentSelection)])].map(
          (file) => ({ path: file, sha256: 'f'.repeat(64) }),
        ),
      ],
      test_selection: currentSelection,
    };
    const changes: CoverageReviewGitChange[] = [
      { status: 'A', path: 'tests/helpers/new-fixture.ts' },
      { status: 'A', path: 'tests/new-case.test.ts' },
      { status: 'M', path: 'src/current.ts' },
    ];
    const discovered = coverageReviewInputPaths(anchor, changes, current);
    expect(discovered).toMatchObject({
      added_tests: ['tests/helpers/new-fixture.ts', 'tests/new-case.test.ts'],
      selected_tests: ['tests/sdk-package-compatibility.test.ts', 'tests/new-case.test.ts'],
    });
    for (const file of [
      'tooling/coverage-run-outcome.ts',
      'tsconfig.json',
      'dist/sdk-formation.json',
      ...expectedJavascriptFiles.map((file) => 'dist/src/' + file),
    ])
      expect(discovered.added_tools).toContain(file);
    for (const file of [
      'src/current.ts',
      'tests/helpers/new-fixture.ts',
      'tests/new-case.test.ts',
      'dist/sdk-formation.json',
    ])
      expect(discovered.refresh_paths).toContain(file);
  });

  test('review input reconciliation applies typed A/M/D/R changes to every owner inventory', () => {
    const anchor = {
      sources: [
        { path: 'src/modified.ts', sha256: 'a'.repeat(64) },
        { path: 'src/deleted.ts', sha256: 'b'.repeat(64) },
        { path: 'src/renamed-old.ts', sha256: 'c'.repeat(64) },
      ],
      test_inputs: [
        { path: 'tests/modified.test.ts', sha256: 'd'.repeat(64) },
        { path: 'tests/deleted.test.ts', sha256: 'e'.repeat(64) },
        { path: 'tests/renamed-old.test.ts', sha256: 'f'.repeat(64) },
        { path: 'tests/helpers/old-helper.ts', sha256: '1'.repeat(64) },
      ],
      tool_inputs: [
        { path: 'schemas/modified.schema.json', sha256: '2'.repeat(64) },
        { path: 'schemas/deleted.schema.json', sha256: '3'.repeat(64) },
        { path: 'schemas/renamed-old.schema.json', sha256: '4'.repeat(64) },
        { path: 'templates/old-template.yaml', sha256: '5'.repeat(64) },
        { path: 'tooling/modified-runtime.ts', sha256: '6'.repeat(64) },
        { path: 'tooling/deleted-runtime.ts', sha256: '7'.repeat(64) },
        { path: 'tooling/renamed-old-runtime.ts', sha256: '8'.repeat(64) },
      ],
      test_selection: {
        mode: 'full-current-test-set' as const,
        tests: ['tests/deleted.test.ts', 'tests/modified.test.ts', 'tests/renamed-old.test.ts'],
      },
    };
    const current = {
      sources: [
        { path: 'src/added.ts', sha256: '9'.repeat(64) },
        { path: 'src/modified.ts', sha256: 'a'.repeat(64) },
        { path: 'src/renamed-new.ts', sha256: 'b'.repeat(64) },
      ],
      test_inputs: [
        { path: 'tests/added.test.ts', sha256: 'c'.repeat(64) },
        { path: 'tests/helpers/new-helper.ts', sha256: 'd'.repeat(64) },
        { path: 'tests/modified.test.ts', sha256: 'e'.repeat(64) },
        { path: 'tests/renamed-new.test.ts', sha256: 'f'.repeat(64) },
      ],
      tool_inputs: [
        { path: 'schemas/added.schema.json', sha256: '1'.repeat(64) },
        { path: 'schemas/modified.schema.json', sha256: '2'.repeat(64) },
        { path: 'schemas/renamed-new.schema.json', sha256: '3'.repeat(64) },
        { path: 'templates/new-template.yaml', sha256: '4'.repeat(64) },
        { path: 'tooling/added-runtime.ts', sha256: '5'.repeat(64) },
        { path: 'tooling/modified-runtime.ts', sha256: '6'.repeat(64) },
        { path: 'tooling/renamed-new-runtime.ts', sha256: '7'.repeat(64) },
      ],
      test_selection: {
        mode: 'full-current-test-set' as const,
        tests: ['tests/added.test.ts', 'tests/modified.test.ts', 'tests/renamed-new.test.ts'],
      },
    };
    const changes = [
      { status: 'A' as const, path: 'src/added.ts' },
      { status: 'M' as const, path: 'src/modified.ts' },
      { status: 'D' as const, path: 'src/deleted.ts' },
      { status: 'R' as const, old_path: 'src/renamed-old.ts', path: 'src/renamed-new.ts' },
      { status: 'A' as const, path: 'tests/added.test.ts' },
      { status: 'A' as const, path: 'tests/helpers/new-helper.ts' },
      { status: 'M' as const, path: 'tests/modified.test.ts' },
      { status: 'D' as const, path: 'tests/deleted.test.ts' },
      { status: 'D' as const, path: 'tests/helpers/old-helper.ts' },
      {
        status: 'R' as const,
        old_path: 'tests/renamed-old.test.ts',
        path: 'tests/renamed-new.test.ts',
      },
      { status: 'A' as const, path: 'schemas/added.schema.json' },
      { status: 'M' as const, path: 'schemas/modified.schema.json' },
      { status: 'D' as const, path: 'schemas/deleted.schema.json' },
      {
        status: 'R' as const,
        old_path: 'schemas/renamed-old.schema.json',
        path: 'schemas/renamed-new.schema.json',
      },
      { status: 'A' as const, path: 'templates/new-template.yaml' },
      { status: 'D' as const, path: 'templates/old-template.yaml' },
      { status: 'A' as const, path: 'tooling/added-runtime.ts' },
      { status: 'M' as const, path: 'tooling/modified-runtime.ts' },
      { status: 'D' as const, path: 'tooling/deleted-runtime.ts' },
      {
        status: 'R' as const,
        old_path: 'tooling/renamed-old-runtime.ts',
        path: 'tooling/renamed-new-runtime.ts',
      },
    ];

    const reconciled = coverageReviewInputPaths(anchor, changes, current);
    expect(reconciled.sources.map(({ path: file }) => file)).toEqual([
      'src/added.ts',
      'src/modified.ts',
      'src/renamed-new.ts',
    ]);
    expect(reconciled.test_inputs.map(({ path: file }) => file)).toEqual([
      'tests/added.test.ts',
      'tests/helpers/new-helper.ts',
      'tests/modified.test.ts',
      'tests/renamed-new.test.ts',
    ]);
    expect(reconciled.tool_inputs.map(({ path: file }) => file)).toEqual([
      'schemas/added.schema.json',
      'schemas/modified.schema.json',
      'schemas/renamed-new.schema.json',
      'templates/new-template.yaml',
      'tooling/added-runtime.ts',
      'tooling/modified-runtime.ts',
      'tooling/renamed-new-runtime.ts',
    ]);
    expect(reconciled.selected_tests).toEqual([
      'tests/added.test.ts',
      'tests/modified.test.ts',
      'tests/renamed-new.test.ts',
    ]);
    expect(reconciled.refresh_paths).toEqual(
      [
        'schemas/added.schema.json',
        'schemas/modified.schema.json',
        'schemas/renamed-new.schema.json',
        'src/added.ts',
        'src/modified.ts',
        'src/renamed-new.ts',
        'templates/new-template.yaml',
        'tests/added.test.ts',
        'tests/helpers/new-helper.ts',
        'tests/modified.test.ts',
        'tests/renamed-new.test.ts',
        'tooling/added-runtime.ts',
        'tooling/modified-runtime.ts',
        'tooling/renamed-new-runtime.ts',
      ].sort(),
    );
    expect(reconciled.removed_paths).toEqual([
      'schemas/deleted.schema.json',
      'schemas/renamed-old.schema.json',
      'src/deleted.ts',
      'src/renamed-old.ts',
      'templates/old-template.yaml',
      'tests/deleted.test.ts',
      'tests/helpers/old-helper.ts',
      'tests/renamed-old.test.ts',
      'tooling/deleted-runtime.ts',
      'tooling/renamed-old-runtime.ts',
    ]);
    expect(reconciled.renamed_paths).toEqual([
      { old_path: 'schemas/renamed-old.schema.json', new_path: 'schemas/renamed-new.schema.json' },
      { old_path: 'src/renamed-old.ts', new_path: 'src/renamed-new.ts' },
      { old_path: 'tests/renamed-old.test.ts', new_path: 'tests/renamed-new.test.ts' },
      { old_path: 'tooling/renamed-old-runtime.ts', new_path: 'tooling/renamed-new-runtime.ts' },
    ]);
  });

  test('review refreshes captured SDK outputs whose bound digests changed without Git path records', () => {
    const anchor = {
      sources: [],
      test_inputs: [],
      tool_inputs: [
        { path: 'dist/sdk-formation.json', sha256: 'a'.repeat(64) },
        { path: 'dist/src/index.js', sha256: 'b'.repeat(64) },
        { path: 'dist/src/runtime.js', sha256: 'c'.repeat(64) },
      ],
      test_selection: { mode: 'full-current-test-set' as const, tests: ['tests/sdk-package-compatibility.test.ts'] },
    };
    const current = {
      sources: [],
      test_inputs: [],
      tool_inputs: [
        { path: 'dist/sdk-formation.json', sha256: 'd'.repeat(64) },
        { path: 'dist/src/index.js', sha256: 'e'.repeat(64) },
        { path: 'dist/src/runtime.js', sha256: 'c'.repeat(64) },
      ],
      test_selection: { mode: 'full-current-test-set' as const, tests: ['tests/sdk-package-compatibility.test.ts'] },
    };

    const result = coverageReviewInputPaths(anchor, [], current);

    expect(result.refresh_paths).toEqual(['dist/sdk-formation.json', 'dist/src/index.js']);
  });

  test('review input discovery shares the current SDK artifact inventory and excludes inert or historical selections', () => {
    expect(
      sdkFormationToolInputPaths('current', {
        mode: 'full-current-test-set',
        tests: ['tests/sdk-package-compatibility.test.ts'],
      }),
    ).toEqual([
      'tooling/build-package.ts',
      'tsconfig.json',
      'dist/sdk-formation.json',
      ...expectedJavascriptFiles.map((file) => 'dist/src/' + file),
    ]);
    expect(sdkFormationToolInputPaths('current', { mode: 'full-current-test-set', tests: [] })).toEqual([]);
    expect(
      sdkFormationToolInputPaths('current', {
        mode: 'full-current-test-set',
        tests: ['tests/configured-workflow.test.ts'],
      }),
    ).toEqual([]);
    expect(
      sdkFormationToolInputPaths('published-baseline-bun-native', {
        mode: 'published-baseline-bun-native',
        tests: ['tests/sdk-package-compatibility.test.ts'],
      }),
    ).toEqual([]);
  });

  test('review input discovery rejects historical anchors and deduplicates current additions', () => {
    expect(() =>
      coverageReviewInputPaths(
        {
          sources: [],
          test_inputs: [],
          tool_inputs: [],
          test_selection: { mode: 'published-baseline-bun-native', tests: [] },
        },
        [],
        {
          sources: [],
          test_inputs: [],
          tool_inputs: [],
          test_selection: { mode: 'published-baseline-bun-native', tests: [] },
        },
      ),
    ).toThrow('requires a current test selection');
    const anchor = {
      sources: [],
      test_inputs: [{ path: 'tests/old.test.ts', sha256: 'a'.repeat(64) }],
      tool_inputs: coverageToolInputs.map((file) => ({ path: file, sha256: 'b'.repeat(64) })),
      test_selection: { mode: 'full-current-test-set' as const, tests: ['tests/old.test.ts'] },
    };
    const current = {
      ...anchor,
      test_inputs: [...anchor.test_inputs, { path: 'tests/new.test.ts', sha256: 'c'.repeat(64) }],
      test_selection: { mode: 'full-current-test-set' as const, tests: ['tests/new.test.ts', 'tests/old.test.ts'] },
    };
    const changes: CoverageReviewGitChange[] = [
      { status: 'A', path: 'tests/new.test.ts' },
      { status: 'M', path: 'tests/old.test.ts' },
      { status: 'M', path: 'README.md' },
    ];
    const result = coverageReviewInputPaths(anchor, changes, current);
    expect(result.added_tests).toEqual(['tests/new.test.ts']);
    expect(result.added_tools).toEqual([]);
    expect(result.selected_tests).toEqual(['tests/new.test.ts', 'tests/old.test.ts']);
    expect(result.refresh_paths).toEqual(['tests/new.test.ts', 'tests/old.test.ts']);
  });

  test('captures explicit package bytes once per canonical sorted path and retains the snapshot', async () => {
    const root = fixtureRoot();
    const selected = ['tooling/quality-final.ts', 'package.json', 'tooling/quality-final.ts'];
    const bytes = await readQualityInputs(root, selected);
    expect([...bytes.keys()]).toEqual(['package.json', 'tooling/quality-final.ts']);
    expect(bytes.get('tooling/quality-final.ts')).toEqual(Buffer.from('fixture\n'));
    writeFileSync(path.join(root, 'tooling/quality-final.ts'), 'changed live bytes\n');
    expect(bytes.get('tooling/quality-final.ts')).toEqual(Buffer.from('fixture\n'));
  });

  test('rejects all invalid explicit paths before reading valid package paths', async () => {
    await expectRejected(
      () => readQualityInputs('/does-not-exist', ['package.json', '../outside']),
      /malformed|outside admitted roots/u,
    );
  });

  test('fails closed for missing files, links, hardlinks, escapes and bounded input limits', async () => {
    const root = fixtureRoot();
    await expectRejected(() => readQualityInputs(root, ['tooling/missing.ts']), /missing/u);

    writeFileSync(path.join(root, 'tooling/target.ts'), 'target\n');
    symlinkSync(path.join(root, 'tooling/target.ts'), path.join(root, 'tooling/symlink.ts'));
    await expectRejected(() => readQualityInputs(root, ['tooling/symlink.ts']), /rejected/u);

    linkSync(path.join(root, 'tooling/target.ts'), path.join(root, 'tooling/hardlink.ts'));
    await expectRejected(() => readQualityInputs(root, ['tooling/hardlink.ts']), /rejected|limit/u);

    await expectRejected(
      () => readQualityInputs(root, ['../outside-quality-input.ts']),
      /malformed|outside admitted roots/u,
    );

    writeFileSync(path.join(root, 'tooling/oversized.ts'), Buffer.alloc(4 * 1024 * 1024 + 1));
    await expectRejected(() => readQualityInputs(root, ['tooling/oversized.ts']), /limit|rejected/u);
    await expectRejected(
      () =>
        readQualityInputs(
          root,
          Array.from({ length: 20_001 }, () => 'package.json'),
        ),
      /path limit/u,
    );
  });

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

  test('binds scheduler bytes into every quality projection and retains the previous snapshot after drift', async () => {
    const root = fixtureRoot();
    const selection = { coverage: [], mutation: [], guard: [] };
    const before = await qualityInputProjections(root, selection);
    const planner = 'tooling/coverage-shard-plan.ts';
    writeFileSync(path.join(root, planner), 'export const schedulerRevision = 2;\n');
    const after = await qualityInputProjections(root, selection);

    for (const kind of ['coverage', 'mutation', 'guard'] as const) {
      expect(before[kind].tool_inputs.map(({ path: file }) => file)).toContain(planner);
      expect(before[kind].input_bytes[planner]).toEqual(Buffer.from('fixture\n'));
      expect(after[kind].input_bytes[planner]).toEqual(Buffer.from('export const schedulerRevision = 2;\n'));
      expect(after[kind].source_fingerprint).toBe(before[kind].source_fingerprint);
      expect(after[kind].test_fingerprint).toBe(before[kind].test_fingerprint);
      expect(after[kind].tool_fingerprint).not.toBe(before[kind].tool_fingerprint);
      expect(qualityFingerprint(after[kind])).not.toBe(qualityFingerprint(before[kind]));
    }
  });

  test('binds the copied mutation assertion context into the mutation tool fingerprint', async () => {
    const root = fixtureRoot();
    const selection = { coverage: [], mutation: [...mutationToolInputs], guard: [] };
    const before = await qualityInputProjections(root, selection);
    const context = 'tooling/mutation-assertion-context.ts';
    expect(mutationToolInputs).toContain(context);
    expect(before.mutation.tool_inputs.map(({ path: file }) => file)).toContain(context);

    writeFileSync(path.join(root, context), 'export const fixtureRevision = 2;\n');
    const after = await qualityInputProjections(root, selection);

    expect(after.mutation.input_bytes[context]).toEqual(Buffer.from('export const fixtureRevision = 2;\n'));
    expect(after.mutation.source_fingerprint).toBe(before.mutation.source_fingerprint);
    expect(after.mutation.test_fingerprint).toBe(before.mutation.test_fingerprint);
    expect(after.mutation.tool_fingerprint).not.toBe(before.mutation.tool_fingerprint);
    expect(qualityFingerprint(after.mutation)).not.toBe(qualityFingerprint(before.mutation));
  });

  test('admits captured package metadata and a named package-root developer config only', async () => {
    const root = fixtureRoot();
    writeFileSync(
      path.join(root, 'tests/fixture.test.mjs'),
      "import manifest from '../package.json' with { type: 'json' };\nimport config from '../stryker.config.ts';\nvoid manifest; void config;\n",
    );
    writeFileSync(
      path.join(root, 'stryker.config.ts'),
      "import { helper } from './tooling/stryker-helper.ts';\nexport default helper;\n",
    );
    writeFileSync(path.join(root, 'tooling/stryker-helper.ts'), 'export const helper = true;\n');

    const { guard } = await qualityInputProjections(root, { coverage: [], mutation: [], guard: [] });
    expect(guard.tool_inputs.map(({ path: file }) => file)).toContain('package.json');
    expect(guard.tool_inputs.map(({ path: file }) => file)).toContain('stryker.config.ts');
    expect(guard.tool_inputs.map(({ path: file }) => file)).toContain('tooling/stryker-helper.ts');
    expect(guard.sources.map(({ path: file }) => file)).not.toContain('stryker.config.ts');
    expect(guard.input_bytes['package.json']).toBeDefined();

    const unrelatedRootInput = fixtureRoot();
    writeFileSync(path.join(unrelatedRootInput, 'secret.json'), '{"secret": true}\n');
    writeFileSync(path.join(unrelatedRootInput, 'tests/fixture.test.mjs'), "import '../secret.json';\n");
    await expectRejected(
      () => qualityInputProjections(unrelatedRootInput, { coverage: [], mutation: [], guard: [] }),
      /outside admitted package roots/u,
    );
  });

  test.each([
    ['LF', '\n'],
    ['CRLF', '\r\n'],
  ] as const)('scans CLI imports after a hashbang while preserving captured %s bytes', async (_label, lineEnding) => {
    const root = fixtureRoot();
    const cliBytes = Buffer.from(
      `#!/usr/bin/env node${lineEnding}import { leaf } from '../tooling/hashbang-leaf.ts';${lineEnding}export { leaf };${lineEnding}`,
    );
    writeFileSync(path.join(root, 'tests/fixture.test.mjs'), "import '../bin/vida-agent.ts';\n");
    writeFileSync(path.join(root, 'bin/vida-agent.ts'), cliBytes);
    writeFileSync(path.join(root, 'tooling/hashbang-leaf.ts'), 'export const leaf = true;\n');

    const projections = await qualityInputProjections(root, { coverage: [], mutation: [], guard: [] });
    for (const name of ['coverage', 'mutation', 'guard'] as const) {
      const inputs = projections[name];
      const cli = inputs.sources.find(({ path: file }) => file === 'bin/vida-agent.ts');
      const leaf = inputs.tool_inputs.find(({ path: file }) => file === 'tooling/hashbang-leaf.ts');
      expect(cli).toBeDefined();
      expect(leaf).toBeDefined();
      expect(inputs.input_bytes['bin/vida-agent.ts']).toEqual(cliBytes);
      expect(cli?.sha256).toBe(createHash('sha256').update(cliBytes).digest('hex'));
      expect(inputs.module_inputs.map(({ path: file }) => file)).toContain('tooling/hashbang-leaf.ts');
    }
    expect(projections.coverage.input_bytes['bin/vida-agent.ts']).toBe(
      projections.mutation.input_bytes['bin/vida-agent.ts'],
    );
    expect(projections.mutation.input_bytes['bin/vida-agent.ts']).toBe(
      projections.guard.input_bytes['bin/vida-agent.ts'],
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
    const computedPathAdapter = path.join(repository, 'tooling/agent/release-local.ts');
    const computedPathAdapterBytes = Buffer.from('export const releaseLocal = true;\n');
    writeFileSync(computedPathAdapter, computedPathAdapterBytes);

    const projections = await qualityInputProjections(root, { coverage: [], mutation: [], guard: [] });
    for (const name of ['coverage', 'mutation', 'guard'] as const) {
      expect(projections[name].tool_inputs.map(({ path: file }) => file)).toContain(
        '_repository/tooling/agent/release-assurance.ts',
      );
      expect(projections[name].tool_inputs).toContainEqual({
        path: '_repository/tooling/agent/release-local.ts',
        sha256: createHash('sha256').update(computedPathAdapterBytes).digest('hex'),
      });
      expect(projections[name].input_bytes['_repository/tooling/agent/release-local.ts']).toEqual(
        computedPathAdapterBytes,
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

  test('captures an explicitly focused diagnostic selection and fingerprints only its selected inputs', async () => {
    const root = fixtureRoot();
    writeFileSync(
      path.join(root, 'tests/fixture.test.mjs'),
      "import '../src/lifecycle/lifecycle-state.ts';\nimport '../tooling/selected-runtime.ts';\nimport './helpers/selected.ts';\ntest('selected', () => {});\n",
    );
    writeFileSync(
      path.join(root, 'tests/other.test.ts'),
      "import '../tooling/unselected-runtime.ts';\ntest('unselected', () => {});\n",
    );
    writeFileSync(path.join(root, 'tooling/selected-runtime.ts'), 'export const selected = true;\n');
    writeFileSync(path.join(root, 'tooling/unselected-runtime.ts'), 'export const unselected = true;\n');
    mkdirSync(path.join(root, 'tests/helpers'));
    writeFileSync(path.join(root, 'tests/helpers/selected.ts'), 'export const helper = true;\n');

    const selected = await coverageInputs(root, {
      mode: 'focused-diagnostic',
      contour: 'fixture-contour',
      sources: ['src/host-state.ts'],
      tests: ['tests/fixture.test.mjs'],
    });
    const otherTest = await coverageInputs(root, {
      mode: 'focused-diagnostic',
      contour: 'fixture-contour',
      sources: ['src/host-state.ts'],
      tests: ['tests/other.test.ts'],
    });
    const otherSource = await coverageInputs(root, {
      mode: 'focused-diagnostic',
      contour: 'fixture-contour',
      sources: ['src/runtime-kernel.ts'],
      tests: ['tests/fixture.test.mjs'],
    });

    expect(selected.test_selection).toEqual({
      mode: 'focused-diagnostic',
      contour: 'fixture-contour',
      sources: ['src/host-state.ts'],
      tests: ['tests/fixture.test.mjs'],
    });
    expect(selected.sources.map(({ path: file }) => file)).toEqual(['src/host-state.ts']);
    expect(selected.tests).toEqual(['tests/fixture.test.mjs']);
    expect(selected.test_inputs.map(({ path: file }) => file)).toEqual([
      'tests/fixture.test.mjs',
      'tests/helpers/selected.ts',
    ]);
    expect(selected.tool_inputs.map(({ path: file }) => file)).not.toContain('tests/helpers/selected.ts');
    expect(selected.test_fingerprint).toBe(testSelectionFingerprint(selected.test_selection, selected.test_inputs));
    expect(otherTest.test_fingerprint).not.toBe(selected.test_fingerprint);
    expect(otherSource.source_fingerprint).not.toBe(selected.source_fingerprint);
    expect(selected.tool_inputs.map(({ path: file }) => file)).toContain('src/lifecycle/lifecycle-state.ts');
    expect(selected.tool_inputs.map(({ path: file }) => file)).toContain('tooling/selected-runtime.ts');
    expect(selected.tool_inputs.map(({ path: file }) => file)).not.toContain('tooling/unselected-runtime.ts');
    expect(selected.input_bytes['src/lifecycle/lifecycle-state.ts']).toBeDefined();
    expect(selected.input_bytes['tests/other.test.ts']).toBeUndefined();
    expect(selected.input_bytes['src/runtime-kernel.ts']).toBeUndefined();
  });

  test('captures the computed legacy release adapter in the focused module snapshot and freshness fingerprint', async () => {
    const root = fixtureRoot();
    const adapter = 'bin/local-release-artifacts.ts';
    const originalAdapterBytes = Buffer.from('export const releaseAdapter = 1;\n');
    writeFileSync(path.join(root, adapter), originalAdapterBytes);
    writeFileSync(
      path.join(root, 'tests/fixture.test.mjs'),
      "const adapterPath = ['../bin', 'local-release-artifacts.ts'].join('/'); void import(adapterPath);\ntest('computed adapter', () => {});\n",
    );
    const selection = {
      mode: 'focused-diagnostic' as const,
      contour: 'legacy-service-custody',
      sources: ['src/host-state.ts'],
      tests: ['tests/fixture.test.mjs'],
    };

    const before = await coverageInputs(root, selection);
    const beforeInput = before.module_inputs.find(({ path: file }) => file === adapter);
    expect(before.sources.map(({ path: file }) => file)).not.toContain(adapter);
    expect(before.tool_inputs.map(({ path: file }) => file)).toContain(adapter);
    expect(beforeInput).toEqual({
      path: adapter,
      sha256: createHash('sha256').update(originalAdapterBytes).digest('hex'),
    });
    expect(before.input_bytes[adapter]).toEqual(originalAdapterBytes);

    writeFileSync(path.join(root, adapter), 'export const releaseAdapter = 2;\n');
    const after = await coverageInputs(root, selection);
    expect(after.input_bytes[adapter]).toEqual(Buffer.from('export const releaseAdapter = 2;\n'));
    expect(after.tool_fingerprint).not.toBe(before.tool_fingerprint);
    expect(qualityFingerprint(after)).not.toBe(qualityFingerprint(before));
  });

  test('traverses package imports of the repository adapter selected by the service custody test', async () => {
    const root = fixtureRoot(true);
    const repository = path.resolve(root, '../..');
    const testPath = 'tests/bun/service-operation-launch-capability.test.ts';
    const testFile = path.join(root, testPath);
    mkdirSync(path.dirname(testFile), { recursive: true });
    writeFileSync(
      testFile,
      "const target = ['tooling', 'agent', 'release-local.ts'].join('/'); void createRequire(import.meta.url)(target);\ntest('computed repository adapter', () => {});\n",
    );

    const repositoryAdapter = path.join(repository, 'tooling/agent/release-local.ts');
    const adapterBytes = Buffer.from(
      "import { sdkCompatibilityManifest } from '../../packages/agent/tooling/pack-sdk.ts';\nexport const release = sdkCompatibilityManifest;\n",
    );
    mkdirSync(path.dirname(repositoryAdapter), { recursive: true });
    writeFileSync(repositoryAdapter, adapterBytes);
    const packSdk = 'tooling/pack-sdk.ts';
    const packSdkBytes = Buffer.from(
      "import { value } from './pack-sdk-leaf.ts';\nexport const sdkCompatibilityManifest = value;\n",
    );
    writeFileSync(path.join(root, packSdk), packSdkBytes);
    const packSdkLeaf = 'tooling/pack-sdk-leaf.ts';
    writeFileSync(path.join(root, packSdkLeaf), 'export const value = true;\n');

    const selection = {
      mode: 'focused-diagnostic' as const,
      contour: 'bun-service-operation-custody',
      sources: ['src/host-state.ts'],
      tests: [testPath],
    };
    const before = await coverageInputs(root, selection);
    for (const file of [`${repositoryToolingInputPrefix}/release-local.ts`, packSdk, packSdkLeaf])
      expect(before.module_inputs.map(({ path: captured }) => captured)).toContain(file);
    expect(before.input_bytes[packSdk]).toEqual(packSdkBytes);
    expect(before.module_inputs.find(({ path: file }) => file === packSdk)).toEqual({
      path: packSdk,
      sha256: createHash('sha256').update(packSdkBytes).digest('hex'),
    });
    expect(before.tool_inputs.map(({ path: file }) => file)).toContain(packSdk);

    const changedLeaf = Buffer.from('export const value = false;\n');
    writeFileSync(path.join(root, packSdkLeaf), changedLeaf);
    const leafChanged = await coverageInputs(root, selection);
    expect(leafChanged.input_bytes[packSdkLeaf]).toEqual(changedLeaf);
    expect(leafChanged.module_inputs.find(({ path: file }) => file === packSdkLeaf)?.sha256).toBe(
      createHash('sha256').update(changedLeaf).digest('hex'),
    );
    expect(leafChanged.tool_fingerprint).not.toBe(before.tool_fingerprint);
    writeFileSync(path.join(root, packSdkLeaf), 'export const value = true;\n');

    writeFileSync(path.join(root, packSdk), 'export const sdkCompatibilityManifest = null;\n');
    const after = await coverageInputs(root, selection);
    expect(after.input_bytes[packSdk]).toEqual(Buffer.from('export const sdkCompatibilityManifest = null;\n'));
    expect(after.tool_fingerprint).not.toBe(before.tool_fingerprint);
  });

  test.each([
    ['facade', 'src/lifecycle/runtime-facade.ts', 'tests/runtime-facade-boundary.test.ts', 'bun-runtime-facade'],
    ['host capability', 'src/config/host-capability.ts', 'tests/host-capability-boundary.test.ts', 'main-host'],
    [
      'storage image',
      'src/config/project-upgrade-existing-storage.ts',
      'tests/project-upgrade-existing-storage.test.ts',
      'bun-project-upgrade-existing-storage-image',
    ],
    ['envelopes', 'src/contracts/envelopes.ts', 'tests/envelopes-boundary.test.ts', 'main-envelopes'],
    [
      'fs attestation',
      'src/config/fs-safe-attestation.ts',
      'tests/fs-safe-attestation.test.ts',
      'bun-fs-safe-attestation',
    ],
  ] as const)(
    'captures dependencies of %s loaded freshly inside each test body',
    async (_label, source, testPath, contour) => {
      const root = fixtureRoot();
      const dependency = path.posix.join(path.posix.dirname(source), 'fixture-dependency.ts');
      mkdirSync(path.dirname(path.join(root, source)), { recursive: true });
      writeFileSync(
        path.join(root, source),
        "import { value } from './fixture-dependency.ts'; export const fixture = value;\n",
      );
      writeFileSync(path.join(root, dependency), 'export const value = true;\n');
      writeFileSync(
        path.join(root, testPath),
        `import { createRequire } from 'node:module'; const load = createRequire(import.meta.url); test('fresh subject', () => { const file = load.resolve(${JSON.stringify('../' + source)}); delete load.cache[file]; load(file); });\n`,
      );
      const selection = {
        mode: 'focused-diagnostic' as const,
        contour,
        sources: [source],
        tests: [testPath],
      };
      const before = await coverageInputs(root, selection);
      expect(before.module_inputs.map(({ path: file }) => file)).toContain(dependency);
      expect(before.tool_inputs.map(({ path: file }) => file)).toContain(dependency);
      expect(before.sources.map(({ path: file }) => file)).toEqual([source]);
      const changed = Buffer.from('export const value = false;\n');
      writeFileSync(path.join(root, dependency), changed);
      const after = await coverageInputs(root, selection);
      expect(after.input_bytes[dependency]).toEqual(changed);
      expect(after.tool_fingerprint).not.toBe(before.tool_fingerprint);
      expect(qualityFingerprint(after)).not.toBe(qualityFingerprint(before));
    },
  );

  test('rejects empty, duplicate and foreign focused diagnostic selections', async () => {
    const root = fixtureRoot();
    const select = (sources: string[], tests: string[]) =>
      coverageInputs(root, { mode: 'focused-diagnostic', contour: 'fixture-contour', sources, tests });

    await expectRejected(() => select([], ['tests/fixture.test.mjs']), /non-empty/u);
    await expectRejected(() => select(['src/host-state.ts'], []), /non-empty/u);
    await expectRejected(
      () => select(['src/host-state.ts', 'src/host-state.ts'], ['tests/fixture.test.mjs']),
      /duplicate/u,
    );
    await expectRejected(
      () => select(['src/not-maintained.ts'], ['tests/fixture.test.mjs']),
      /maintained source inventory/u,
    );
    await expectRejected(
      () => select(['src/host-state.ts'], ['tests/helpers/fixture.ts']),
      /supported test inventory/u,
    );
    await expectRejected(
      () => select(['src/host-state.ts'], ['tests/fixture.test.mjs', 'tests/fixture.test.mjs']),
      /duplicate/u,
    );
  });

  test('requires the SDK artifacts for a focused SDK compatibility selection', async () => {
    const root = fixtureRoot();
    writeFileSync(path.join(root, 'tests/sdk-package-compatibility.test.ts'), "test('sdk', () => {});\n");
    await expectRejected(
      () =>
        coverageInputs(root, {
          mode: 'focused-diagnostic',
          contour: 'sdk-contour',
          sources: ['src/host-state.ts'],
          tests: ['tests/sdk-package-compatibility.test.ts'],
        }),
      /missing|rejected/u,
    );
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

  test('resolves TypeScript aliases and closes cycles, dynamic imports and lazy literal requires', async () => {
    const root = fixtureRoot();
    writeFileSync(
      path.join(root, 'tests/fixture.test.mjs'),
      "import '../tooling/discovered-runtime.js';\ntest('runtime graph', () => {});\n",
    );
    writeFileSync(
      path.join(root, 'tooling/discovered-runtime.ts'),
      "import './discovered-leaf.ts';\nvoid import('./dynamic-target.ts');\nexport function runtime() { return require('./lazy-target.ts'); }\n",
    );
    writeFileSync(
      path.join(root, 'tooling/discovered-leaf.ts'),
      "import './discovered-runtime.js';\nexport const leaf = true;\n",
    );
    writeFileSync(path.join(root, 'tooling/dynamic-target.ts'), 'export const dynamic = true;\n');
    writeFileSync(path.join(root, 'tooling/lazy-target.ts'), 'export const lazy = true;\n');

    const { guard } = await qualityInputProjections(root, { coverage: [], mutation: [], guard: [] });
    const capturedTools = guard.tool_inputs.map(({ path: file }) => file);
    expect(capturedTools).toContain('tooling/discovered-runtime.ts');
    expect(capturedTools).toContain('tooling/discovered-leaf.ts');
    expect(capturedTools).toContain('tooling/dynamic-target.ts');
    expect(capturedTools).toContain('tooling/lazy-target.ts');
    writeFileSync(path.join(root, 'tooling/lazy-target.ts'), 'export const lazy = false;\n');
    const changed = await qualityInputProjections(root, { coverage: [], mutation: [], guard: [] });
    expect(changed.guard.tool_fingerprint).not.toBe(guard.tool_fingerprint);
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
