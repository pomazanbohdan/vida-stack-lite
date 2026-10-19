import { afterEach, describe, expect, test } from 'bun:test';
import { linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { captureSdkFormationInputs, projectSdkFormationInputBytes } from '../tooling/build-package.ts';
import { readPin } from '../bin/bun.ts';
import { expectRejection } from './helpers/expect-rejection.ts';
import {
  coverageToolInputs,
  qualityInputs,
  sdkFormationInputsFromQualityCapture,
  sha256,
} from '../tooling/bun-coverage-evidence.ts';
import { expectedJavascriptFiles } from '../tooling/maintained-source-inventory.ts';
import { assertCurrentCoverageSdkFreshness } from '../tooling/run-bun-coverage.ts';

const ownedRoots: string[] = [];

function fixtureRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'sdk-formation-capture-'));
  ownedRoots.push(root);
  const write = (relative: string, contents = 'fixture\n'): void => {
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, contents);
  };
  write('src/index.ts', "export { value } from './value.js';\n");
  write('src/value.ts', 'export const value = 1;\n');
  write('schemas/example.schema.json', '{}\n');
  write('package.json', '{"name":"fixture","files":[]}\n');
  write('bun.lock', 'lock fixture\n');
  write('.bun-version', readPin() + '\n');
  write('bunfig.toml', '[install]\n');
  write('tsconfig.json', '{}\n');
  write('tooling/build-package.ts', 'export const inert = true;\n');
  return root;
}

afterEach(() => {
  for (const root of ownedRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

async function expectRejected(action: () => Promise<unknown>, expected: RegExp): Promise<void> {
  await expectRejection(Promise.resolve().then(action), expected);
}

describe('SDK formation capture projection', () => {
  test.each([
    ['full', 'tests/sdk-package-compatibility.test.ts'],
    ['focused', 'tests/sdk-package-compatibility.test.ts'],
    ['focused-bin', 'tests/sdk-package-compatibility.test.ts'],
    ['focused-launcher', 'tests/paused-replacement-entrypoint.test.ts'],
    ['focused-retirement', 'tests/interrupted-source-retirement.test.ts'],
    ['focused-stopped-source', 'tests/stopped-source-capture.test.ts'],
    ['focused-controller', 'tests/development-controller.test.ts'],
    ['focused-final-assurance', 'tests/final-assurance-public.test.ts'],
    ['focused-absorption', 'tests/automatic-work-absorption.test.ts'],
    ['focused-source-continuation', 'tests/initial-source-continuation.test.ts'],
    ['focused-initialization', 'tests/initialization.test.ts'],
    ['focused-task-binding', 'tests/task-source-binding-operations.test.ts'],
    ['focused-run', 'tests/run-entrypoint.test.ts'],
    ['focused-config-rebind', 'tests/runtime-config-rebind.test.ts'],
    ['focused-source-config-rebind', 'tests/runtime-config-rebind-source.test.ts'],
    ['focused-scoped-source', 'tests/scoped-source-snapshot.test.ts'],
  ] as const)(
    'joins %s quality capture to SDK formation without another input read and rejects stale artifacts',
    async (mode, sdkTest) => {
      const root = fixtureRoot();
      const write = (relative: string, bytes: string | Buffer): void => {
        const target = path.join(root, relative);
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, bytes);
      };
      for (const file of coverageToolInputs) {
        if (['package.json', 'bun.lock', '.bun-version', 'bunfig.toml'].includes(file)) continue;
        write(file, 'export const inert = true;\n');
      }
      write(
        'package.json',
        JSON.stringify({ version: '1.2.3', files: ['src/**', 'bin/**'], engines: { node: '24.x' }, scripts: {} }),
      );
      write('bin/cli-metadata.ts', 'export const inert = true;\n');
      write('tests/sdk-package-compatibility.test.ts', "import '../bin/cli-metadata.ts';\n");
      write('tests/paused-replacement-entrypoint.test.ts', "import '../bin/cli-metadata.ts';\n");
      write(sdkTest, "import '../bin/cli-metadata.ts';\n");
      write('TESTING.md', '# Captured launcher fixture contract\n');
      write('templates/inert.yaml', 'inert: true\n');
      write('instructions/inert.md', 'inert\n');
      write('tooling/build-package.ts', "import './sdk-leaf.ts';\n");
      write('tooling/sdk-leaf.ts', "import './build-package.ts';\n");
      const sdkInputs = await captureSdkFormationInputs(root);
      const outputs = expectedJavascriptFiles.map((member) => {
        const file = 'dist/src/' + member;
        const bytes = Buffer.from('export const inert = true;\n');
        write(file, bytes);
        return { path: file, bytes: bytes.length, sha256: sha256(bytes) };
      });
      const receipt = {
        schema: 'CandidatePackageBuild/v1',
        version: '1.2.3',
        declared_node_engine: '24.x',
        declaration_runtime: 'bun',
        bun_version: Bun.version,
        production_entrypoints: ['dist/src/index.js', 'dist/src/trusted-host.js'],
        test_issuers_shipped: false,
        schemas: 1,
        inputs: [...sdkInputs].map(([file, bytes]) => ({ path: file, bytes: bytes.length, sha256: sha256(bytes) })),
        outputs,
        virtual_runtime_entry: { path: 'src/runtime.ts', sha256: 'a'.repeat(64) },
        dependency_custody:
          'External node_modules is linked; selected manifest and frozen lock are captured, dependency bytes are outside snapshot custody.',
      };
      write('dist/sdk-formation.json', JSON.stringify(receipt));
      const selectedSource = mode === 'focused-bin' ? 'bin/cli-metadata.ts' : 'src/index.ts';
      const selection =
        mode === 'full'
          ? 'current'
          : {
              mode: 'focused-diagnostic' as const,
              contour: 'sdk-fixture',
              sources: [selectedSource],
              tests: [sdkTest],
            };
      const inputs = await qualityInputs(root, [], selection);
      if (mode === 'focused-launcher') {
        expect(inputs.input_bytes['TESTING.md']?.toString()).toBe('# Captured launcher fixture contract\n');
        expect(inputs.tool_inputs.filter((entry) => entry.path === 'TESTING.md')).toHaveLength(1);
        write('TESTING.md', '# Changed launcher fixture contract\n');
        const changed = await qualityInputs(root, [], selection);
        expect(changed.source_fingerprint).toBe(inputs.source_fingerprint);
        expect(changed.test_fingerprint).toBe(inputs.test_fingerprint);
        expect(changed.tool_fingerprint).not.toBe(inputs.tool_fingerprint);
        rmSync(path.join(root, 'TESTING.md'));
        await expectRejected(() => qualityInputs(root, [], selection), /TESTING\.md/u);
        write('TESTING.md', '# Captured launcher fixture contract\n');
      }
      const projected = sdkFormationInputsFromQualityCapture(inputs);
      expect([...projected.selectedInputs.keys()]).toEqual([...sdkInputs.keys()]);
      for (const [file, bytes] of sdkInputs) expect(projected.selectedInputs.get(file)).toEqual(bytes);
      if (mode === 'full') expect(inputs.sources.map((entry) => entry.path)).toContain('bin/cli-metadata.ts');
      if (mode !== 'full' && mode !== 'focused-bin')
        expect(inputs.tool_inputs.map((entry) => entry.path)).toContain('bin/cli-metadata.ts');
      else expect(inputs.tool_inputs.map((entry) => entry.path)).not.toContain('bin/cli-metadata.ts');
      if (mode !== 'full') {
        expect(inputs.sources.map((entry) => entry.path)).toEqual([selectedSource]);
        expect(inputs.tool_inputs.find((entry) => entry.path === 'src/value.ts')?.sha256).toBe(
          sha256(inputs.input_bytes['src/value.ts']!),
        );
        expect(inputs.source_fingerprint).toBe(
          sha256(JSON.stringify([{ path: selectedSource, sha256: sha256(inputs.input_bytes[selectedSource]!) }])),
        );
      }
      const receiptBytes = inputs.input_bytes['dist/sdk-formation.json']!;
      inputs.input_bytes['dist/sdk-formation.json'] = Buffer.from(
        JSON.stringify({ ...receipt, inputs: receipt.inputs.filter((entry) => entry.path !== 'src/value.ts') }),
      );
      expect(() => assertCurrentCoverageSdkFreshness(root, inputs)).toThrow(/formation receipt|input/u);
      inputs.input_bytes['dist/sdk-formation.json'] = receiptBytes;
      expect(() =>
        assertCurrentCoverageSdkFreshness(root, {
          ...inputs,
          test_selection: { mode: 'published-baseline-bun-native', tests: inputs.tests },
        }),
      ).not.toThrow();
      write('src/value.ts', 'changed live Source bytes\n');
      expect(() => assertCurrentCoverageSdkFreshness(root, inputs)).not.toThrow();
      const member = inputs.input_bytes['dist/src/index.js'];
      if (!member) throw new Error('SDK output fixture was not captured.');
      const first = member[0];
      member[0] = 0;
      expect(() => assertCurrentCoverageSdkFreshness(root, inputs)).toThrow(/differs from its formation receipt/u);
      member[0] = first!;
      const capturedSource = inputs.input_bytes['src/value.ts'];
      if (!capturedSource) throw new Error('SDK Source fixture was not captured.');
      capturedSource[0] = 0;
      expect(() => sdkFormationInputsFromQualityCapture(inputs)).toThrow(/capture bytes changed/u);
      expect(() => sdkFormationInputsFromQualityCapture({ ...inputs })).toThrow(/unavailable/u);
      rmSync(path.join(root, 'dist/sdk-formation.json'));
      await expectRejected(() => qualityInputs(root), /missing|rejected/u);
    },
  );
  test('projects the formation inventory from already captured bytes', async () => {
    const root = fixtureRoot();
    writeFileSync(
      path.join(root, 'tooling/build-package.ts'),
      "import './leaf.js';\nimport 'fixture-external-package';\n",
    );
    writeFileSync(path.join(root, 'tooling/leaf.ts'), "import './cycle.mjs';\n");
    writeFileSync(path.join(root, 'tooling/cycle.ts'), "import './leaf.js';\n");
    const captured = await captureSdkFormationInputs(root);
    const projected = projectSdkFormationInputBytes({
      inputBytes: new Map([...captured.keys()].map((file) => [file, readFileSync(path.join(root, file))])),
      sourcePaths: ['src/index.ts', 'src/value.ts'],
      schemaPaths: ['schemas/example.schema.json'],
      buildToolPaths: ['tooling/leaf.ts', 'tooling/cycle.ts'],
    });
    expect([...projected.keys()]).toEqual([...captured.keys()]);
    for (const [file, bytes] of captured) expect(projected.get(file)).toEqual(bytes);
  });

  test('rejects missing bytes and additional captured source or schema drift', () => {
    const base = {
      inputBytes: new Map<string, Buffer>([
        ['src/index.ts', Buffer.from('index')],
        ['schemas/example.schema.json', Buffer.from('{}')],
        ['package.json', Buffer.from('{}')],
        ['bun.lock', Buffer.from('lock')],
        ['.bun-version', Buffer.from('1.4.2')],
        ['bunfig.toml', Buffer.from('')],
        ['tsconfig.json', Buffer.from('{}')],
        ['tooling/build-package.ts', Buffer.from('')],
      ]),
      sourcePaths: ['src/index.ts'],
      schemaPaths: ['schemas/example.schema.json'],
      buildToolPaths: [],
    };
    expect(() => projectSdkFormationInputBytes(base)).not.toThrow();
    const missing = new Map(base.inputBytes);
    missing.delete('bun.lock');
    expect(() => projectSdkFormationInputBytes({ ...base, inputBytes: missing })).toThrow(/missing input bytes/u);
    const drift = new Map(base.inputBytes);
    drift.set('schemas/new.schema.json', Buffer.from('{}'));
    expect(() => projectSdkFormationInputBytes({ ...base, inputBytes: drift })).toThrow(/schema drift/u);
  });

  test('retains the finite selected bytes after live files change', async () => {
    const root = fixtureRoot();
    const captured = await captureSdkFormationInputs(root);
    expect([...captured.keys()]).toEqual([
      '.bun-version',
      'bun.lock',
      'bunfig.toml',
      'package.json',
      'schemas/example.schema.json',
      'src/index.ts',
      'src/value.ts',
      'tooling/build-package.ts',
      'tsconfig.json',
    ]);
    expect(captured.get('src/value.ts')).toEqual(Buffer.from('export const value = 1;\n'));
    writeFileSync(path.join(root, 'src/value.ts'), 'changed live bytes\n');
    expect(captured.get('src/value.ts')).toEqual(Buffer.from('export const value = 1;\n'));
  });

  test('follows transitive local tooling imports, extension aliases and cycles, excluding bare imports', async () => {
    const root = fixtureRoot();
    writeFileSync(
      path.join(root, 'tooling/build-package.ts'),
      "import './leaf.js';\nimport 'fixture-external-package';\n",
    );
    writeFileSync(path.join(root, 'tooling/leaf.ts'), "import './cycle.mjs';\n");
    writeFileSync(path.join(root, 'tooling/cycle.ts'), "import './leaf.js';\n");
    const captured = await captureSdkFormationInputs(root);
    expect(captured.has('tooling/leaf.ts')).toBe(true);
    expect(captured.has('tooling/cycle.ts')).toBe(true);
    expect(captured.has('fixture-external-package')).toBe(false);
  });

  test('does not inspect tests or generated dist paths', async () => {
    const root = fixtureRoot();
    writeFileSync(path.join(root, 'src/.fixture.cas.lock'), 'retained control custody\n');
    mkdirSync(path.join(root, 'tests'), { recursive: true });
    mkdirSync(path.join(root, 'dist'), { recursive: true });
    // These links would fail capture if the projection walked either tree.
    symlinkSync(path.join(root, 'missing-test-target'), path.join(root, 'tests', 'unselected.test.ts'));
    symlinkSync(path.join(root, 'missing-dist-target'), path.join(root, 'dist', 'generated.js'));
    const captured = await captureSdkFormationInputs(root);
    expect([...captured.keys()].some((file) => file.startsWith('tests/') || file.startsWith('dist/'))).toBe(false);
    expect(captured.has('src/.fixture.cas.lock')).toBe(false);
  });

  test('rejects missing selected files and unsafe input links or hardlinks', async () => {
    const root = fixtureRoot();
    rmSync(path.join(root, 'bun.lock'));
    await expectRejected(() => captureSdkFormationInputs(root), /missing|rejected/u);

    writeFileSync(path.join(root, 'bun.lock'), 'lock fixture\n');
    writeFileSync(path.join(root, 'tooling/target.ts'), 'target\n');
    symlinkSync(path.join(root, 'tooling/target.ts'), path.join(root, 'tooling/link.ts'));
    writeFileSync(path.join(root, 'tooling/build-package.ts'), "import './link.js';\n");
    await expectRejected(() => captureSdkFormationInputs(root), /rejected/u);

    writeFileSync(path.join(root, 'tooling/build-package.ts'), "import './hardlink.js';\n");
    linkSync(path.join(root, 'tooling/target.ts'), path.join(root, 'tooling/hardlink.ts'));
    await expectRejected(() => captureSdkFormationInputs(root), /rejected|limit/u);
  });

  test('rejects literal local misses, paths outside admitted roots and bounded oversized inputs', async () => {
    const root = fixtureRoot();
    writeFileSync(path.join(root, 'tooling/build-package.ts'), "import './missing.js';\n");
    await expectRejected(() => captureSdkFormationInputs(root), /Unresolved package-local/u);

    writeFileSync(path.join(root, 'tooling/build-package.ts'), "import '../../outside-capture-fixture.js';\n");
    await expectRejected(() => captureSdkFormationInputs(root), /outside admitted package roots/u);

    writeFileSync(path.join(root, 'tooling/build-package.ts'), 'export const inert = true;\n');
    writeFileSync(path.join(root, 'src/value.ts'), Buffer.alloc(4 * 1024 * 1024 + 1));
    await expectRejected(() => captureSdkFormationInputs(root), /limit|rejected/u);
  });

  test('rejects a relative root', async () => {
    await expectRejected(() => captureSdkFormationInputs('relative-fixture-root'), /root must be absolute/u);
  });

  test('refuses a linked or non-directory selected tree root before enumeration', async () => {
    for (const selected of ['src', 'schemas']) {
      const root = fixtureRoot();
      rmSync(path.join(root, selected), { recursive: true });
      const foreignRoot = fixtureRoot();
      symlinkSync(
        path.join(foreignRoot, selected),
        path.join(root, selected),
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      await expectRejected(() => captureSdkFormationInputs(root), /tree root must be a real directory/u);
      rmSync(path.join(root, selected));
      writeFileSync(path.join(root, selected), 'wrong tree type\n');
      await expectRejected(() => captureSdkFormationInputs(root), /tree root must be a real directory/u);
    }
  });
});
