import { afterEach, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sha256, testSelectionFingerprint } from '../tooling/bun-coverage-evidence.ts';
import { mutationPartitionSourceBinding, verifyInputDescriptor } from '../tooling/mutation-command-runner.ts';

const roots: string[] = [];
const savedEnvironment = new Map<string, string | undefined>();
afterEach(() => {
  for (const [name, value] of savedEnvironment) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  savedEnvironment.clear();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'mutation-input-descriptor-'));
  roots.push(root);
  const write = (file: string, contents: string) => {
    const absolute = path.join(root, file);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents);
    return { path: file, sha256: sha256(contents) };
  };
  const tests = ['tests/a.test.ts', 'tests/b.test.ts'];
  const testInputs = [...tests, 'tests/helpers/fixture.ts'].map((file) => write(file, `// ${file}\n`));
  const toolInputs = [write('tooling/runner.ts', '// runner\n')];
  const sourceInputs = [{ path: 'src/a.ts', sha256: sha256('original source') }];
  const binding = mutationPartitionSourceBinding('one', ['src/a.ts'], sourceInputs);
  if (!binding) throw new Error('Fixture source binding is invalid.');
  const selection = { mode: 'full-current-test-set' as const, tests };
  const fingerprints = {
    source_fingerprint: sha256(JSON.stringify(sourceInputs)),
    test_fingerprint: testSelectionFingerprint(selection, testInputs),
    tool_fingerprint: sha256(JSON.stringify(toolInputs)),
  };
  const descriptor = {
    schema: 'MutationInputDescriptor/v3',
    partition: 'one',
    partition_sources: binding.sources,
    partition_source_inputs: binding.sourceInputs,
    partition_source_fingerprint: binding.fingerprint,
    ...fingerprints,
    tests: [tests[0] as string],
    test_selection: selection,
    test_inputs: testInputs,
    tool_inputs: toolInputs,
    input_fingerprint: sha256(
      JSON.stringify({
        sources: fingerprints.source_fingerprint,
        tests: fingerprints.test_fingerprint,
        tooling: fingerprints.tool_fingerprint,
      }),
    ),
  };
  for (const [name, value] of Object.entries({
    AGENT_RUNTIME_TEST_FINGERPRINT: descriptor.test_fingerprint,
    AGENT_RUNTIME_TOOL_FINGERPRINT: descriptor.tool_fingerprint,
    AGENT_RUNTIME_INPUT_FINGERPRINT: descriptor.input_fingerprint,
  })) {
    savedEnvironment.set(name, process.env[name]);
    process.env[name] = value;
  }
  return {
    root,
    descriptor,
    write,
    verify: async (value: unknown = descriptor) => {
      write('one.inputs.json', JSON.stringify(value));
      return verifyInputDescriptor(
        root,
        root,
        'one',
        ['tests/a.test.ts'],
        binding.sources,
        binding.fingerprint,
        fingerprints.source_fingerprint,
      );
    },
  };
}

test('mutation runner accepts a partition subset bound to the full captured test identity', async () => {
  const input = fixture();
  const { descriptor } = input;
  // Independent preimage protects the existing coverage identity across the shared-owner extraction.
  expect(descriptor.test_fingerprint).toBe(
    sha256(JSON.stringify({ selection: descriptor.test_selection, files: descriptor.test_inputs })),
  );
  expect(descriptor.test_fingerprint).not.toBe(
    sha256(JSON.stringify({ selection: descriptor.tests, files: descriptor.test_inputs })),
  );
  const result = await input.verify();
  expect(result.rejection).toBeNull();
  expect(result.descriptor?.tests).toEqual(['tests/a.test.ts']);
  expect(result.descriptor?.test_selection.tests).toEqual(['tests/a.test.ts', 'tests/b.test.ts']);
  // The original source digest remains valid while Stryker changes the active subject.
  input.write('src/a.ts', 'mutated source');
  expect((await input.verify()).rejection).toBeNull();
});

test('mutation tool identity resolves repository inputs at the parent-bound repository without sandbox fallback', async () => {
  const input = fixture();
  const repository = path.join(input.root, 'parent-repository');
  const packageRoot = path.join(repository, 'packages/agent');
  const relative = '_repository/tooling/agent/release-local.ts';
  const actual = path.join(repository, 'tooling/agent/release-local.ts');
  mkdirSync(packageRoot, { recursive: true });
  mkdirSync(path.dirname(actual), { recursive: true });
  writeFileSync(actual, '// captured repository input\n');
  input.descriptor.tool_inputs.unshift({ path: relative, sha256: sha256('// captured repository input\n') });
  input.descriptor.tool_fingerprint = sha256(JSON.stringify(input.descriptor.tool_inputs));
  input.descriptor.input_fingerprint = sha256(
    JSON.stringify({
      sources: input.descriptor.source_fingerprint,
      tests: input.descriptor.test_fingerprint,
      tooling: input.descriptor.tool_fingerprint,
    }),
  );
  const repositoryVariable = 'AGENT_RUNTIME_TEST_REPOSITORY_ROOT';
  savedEnvironment.set(repositoryVariable, process.env[repositoryVariable]);
  process.env[repositoryVariable] = repository;
  process.env.AGENT_RUNTIME_TOOL_FINGERPRINT = input.descriptor.tool_fingerprint;
  process.env.AGENT_RUNTIME_INPUT_FINGERPRINT = input.descriptor.input_fingerprint;
  expect((await input.verify()).rejection).toBeNull();
  input.write(relative, '// captured repository input\n');
  writeFileSync(actual, '// changed repository input\n');
  expect(await input.verify()).toEqual({ descriptor: null, rejection: 'tool-inputs' });
  delete process.env[repositoryVariable];
  expect(await input.verify()).toEqual({ descriptor: null, rejection: 'tool-inputs' });
});

test.each([
  ['missing', undefined],
  ['partition array', ['tests/a.test.ts']],
  ['extra key', { mode: 'full-current-test-set', tests: ['tests/a.test.ts'], extra: true }],
  ['wrong mode', { mode: 'published-baseline-bun-native', tests: ['tests/a.test.ts'] }],
  ['empty', { mode: 'full-current-test-set', tests: [] }],
  ['duplicate', { mode: 'full-current-test-set', tests: ['tests/a.test.ts', 'tests/a.test.ts'] }],
  ['unordered', { mode: 'full-current-test-set', tests: ['tests/b.test.ts', 'tests/a.test.ts'] }],
  ['unbound', { mode: 'full-current-test-set', tests: ['tests/a.test.ts', 'tests/c.test.ts'] }],
  ['traversal', { mode: 'full-current-test-set', tests: ['tests/../a.test.ts'] }],
  ['non-string', { mode: 'full-current-test-set', tests: [1] }],
])('mutation descriptor rejects %s full selection before execution', async (_label, selection) => {
  const input = fixture();
  expect(await input.verify({ ...input.descriptor, test_selection: selection })).toEqual({
    descriptor: null,
    rejection: 'descriptor-shape',
  });
});

test('mutation descriptor rejects legacy schema and partition tests outside the full selection', async () => {
  const input = fixture();
  for (const value of [
    { ...input.descriptor, schema: 'MutationInputDescriptor/v2' },
    { ...input.descriptor, tests: ['tests/c.test.ts'] },
    { ...input.descriptor, tests: ['tests/a.test.ts', 'tests/a.test.ts'] },
  ])
    expect(await input.verify(value)).toEqual({ descriptor: null, rejection: 'descriptor-shape' });
});

test('mutation descriptor distinguishes parent identity drift from a changed full selection', async () => {
  const input = fixture();
  expect(await input.verify({ ...input.descriptor, test_fingerprint: 'f'.repeat(64) })).toEqual({
    descriptor: null,
    rejection: 'parent-binding',
  });
  expect(
    await input.verify({
      ...input.descriptor,
      test_selection: { mode: 'full-current-test-set', tests: ['tests/a.test.ts'] },
    }),
  ).toEqual({ descriptor: null, rejection: 'fingerprint' });
});

test.each([
  ['tests/a.test.ts', 'test-inputs'],
  ['tests/helpers/fixture.ts', 'test-inputs'],
  ['tooling/runner.ts', 'tool-inputs'],
] as const)('mutation descriptor rejects changed captured file %s', async (file, rejection) => {
  const input = fixture();
  expect((await input.verify()).rejection).toBeNull();
  input.write(file, 'changed');
  expect(await input.verify()).toEqual({ descriptor: null, rejection });
});
