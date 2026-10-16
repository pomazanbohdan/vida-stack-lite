import { afterEach, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { qualityFingerprint, sha256, testSelectionFingerprint } from '../tooling/bun-coverage-evidence.ts';
import { selectMutationPartitions } from '../tooling/mutation-gate.ts';
import {
  mutationPartitionSourceBinding,
  verifyInputDescriptor,
  mutationTestContextBinding,
  materializeMutationTestContext,
  assertMutationTestContext,
} from '../tooling/mutation-command-runner.ts';
import { expectRejection } from './helpers/expect-rejection.ts';

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
    bindTools: () => {
      descriptor.tool_inputs.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
      descriptor.tool_fingerprint = sha256(JSON.stringify(descriptor.tool_inputs));
      descriptor.input_fingerprint = sha256(
        JSON.stringify({
          sources: descriptor.source_fingerprint,
          tests: descriptor.test_fingerprint,
          tooling: descriptor.tool_fingerprint,
        }),
      );
      process.env.AGENT_RUNTIME_TOOL_FINGERPRINT = descriptor.tool_fingerprint;
      process.env.AGENT_RUNTIME_INPUT_FINGERPRINT = descriptor.input_fingerprint;
    },
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

test('mutation input verification rejects drift beyond the first read batch and permits only restored bytes', async () => {
  const input = fixture();
  const { descriptor } = input;
  for (let index = 0; index < 12; index++)
    descriptor.test_inputs.push(
      input.write(`tests/helpers/batch-${String(index).padStart(2, '0')}.ts`, `// fixture ${index}\n`),
    );
  descriptor.test_inputs.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  descriptor.test_fingerprint = testSelectionFingerprint(descriptor.test_selection, descriptor.test_inputs);
  process.env.AGENT_RUNTIME_TEST_FINGERPRINT = descriptor.test_fingerprint;
  input.bindTools();
  expect((await input.verify()).rejection).toBeNull();
  input.write('tests/helpers/batch-11.ts', '// drifted last input\n');
  expect((await input.verify()).rejection).toBe('test-inputs');
  input.write('tests/helpers/batch-11.ts', '// fixture 11\n');
  expect((await input.verify()).rejection).toBeNull();
});

test('quality fingerprint preserves the ordinary preimage and separately binds explicit capture mode', () => {
  const inputs = { source_fingerprint: 'source', test_fingerprint: 'tests', tool_fingerprint: 'tools' };
  const ordinary = sha256('{"sources":"source","tests":"tests","tooling":"tools"}');
  const capture = sha256('{"sources":"source","tests":"tests","tooling":"tools","per_test_capture":"diagnostic-v2"}');
  expect(qualityFingerprint(inputs)).toBe(ordinary);
  expect(qualityFingerprint(inputs, 'diagnostic-v2')).toBe(capture);
  expect(capture).not.toBe(ordinary);
});

test('per-test capture pilot is explicit and retains the complete declared partition selection', () => {
  const partitions = [
    {
      name: 'main-runtime-core',
      environment: 'bun',
      sources: ['src/runtime-kernel.ts'],
      tests: ['tests/a.test.ts', 'tests/b.test.ts'],
      report: 'main-runtime-core.json',
    },
    {
      name: 'main-config',
      environment: 'bun',
      sources: ['src/config/runtime-config.ts'],
      tests: ['tests/config.test.ts'],
      report: 'main-config.json',
    },
  ];
  const ordinary = selectMutationPartitions([], partitions);
  expect(ordinary).toEqual({ scope: 'full', inventory: false, partitions });
  const capture = selectMutationPartitions(['--pilot-per-test-capture', 'main-runtime-core'], partitions);
  expect(capture).toEqual({
    scope: 'partition-pilot',
    inventory: false,
    partitions: [partitions[0]!],
    perTestCapture: 'diagnostic-v2',
  });
  expect(() => selectMutationPartitions(['--pilot-per-test-capture'], partitions)).toThrow(/Expected no arguments/);
  expect(() => selectMutationPartitions(['--pilot-per-test-capture', 'main-config', 'extra'], partitions)).toThrow(
    /Expected no arguments/,
  );
  expect(() => selectMutationPartitions(['--pilot-per-test-capture', 'unknown'], partitions)).toThrow(
    /exactly one declared runnable partition/,
  );
});

test('per-test capture descriptor requires the explicit parent mode and mode-bound fingerprint', async () => {
  const input = fixture();
  input.bindTools();
  const descriptor = {
    ...input.descriptor,
    per_test_capture: 'diagnostic-v2',
    input_fingerprint: qualityFingerprint(
      {
        source_fingerprint: input.descriptor.source_fingerprint,
        test_fingerprint: input.descriptor.test_fingerprint,
        tool_fingerprint: input.descriptor.tool_fingerprint,
      },
      'diagnostic-v2',
    ),
  };
  const parentMode = 'AGENT_MUTATION_PARENT_PER_TEST_CAPTURE';
  savedEnvironment.set(parentMode, process.env[parentMode]);
  process.env[parentMode] = 'diagnostic-v2';
  process.env.AGENT_RUNTIME_INPUT_FINGERPRINT = descriptor.input_fingerprint;
  const accepted = await input.verify(descriptor);
  expect(accepted.rejection).toBeNull();
  expect(accepted.descriptor?.per_test_capture).toBe('diagnostic-v2');

  const mismatchedFingerprint = { ...descriptor, input_fingerprint: input.descriptor.input_fingerprint };
  expect(await input.verify(mismatchedFingerprint)).toEqual({ descriptor: null, rejection: 'parent-binding' });
  delete process.env[parentMode];
  expect(await input.verify(descriptor)).toEqual({ descriptor: null, rejection: 'parent-binding' });
  process.env[parentMode] = 'diagnostic-v2';
  expect(await input.verify({ ...descriptor, per_test_capture: 'other' })).toEqual({
    descriptor: null,
    rejection: 'descriptor-shape',
  });
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
  input.bindTools();
  const repositoryVariable = 'AGENT_RUNTIME_TEST_REPOSITORY_ROOT';
  savedEnvironment.set(repositoryVariable, process.env[repositoryVariable]);
  process.env[repositoryVariable] = repository;
  expect((await input.verify()).rejection).toBeNull();
  input.write(relative, '// captured repository input\n');
  writeFileSync(actual, '// changed repository input\n');
  expect(await input.verify()).toEqual({ descriptor: null, rejection: 'tool-inputs' });
  delete process.env[repositoryVariable];
  expect(await input.verify()).toEqual({ descriptor: null, rejection: 'tool-inputs' });
});

test('mutation context copies verified bytes into exclusive per-invocation roots and detects drift', async () => {
  const input = fixture();
  const repository = path.join(input.root, 'parent-repository');
  const contextFiles = [
    'AGENTS.md',
    'AGENT.sidecar.md',
    'agent-runtime.config.v1.yaml',
    'docs/agent-instructions/documentation-policy.v1.json',
  ];
  const captured: Record<string, Buffer> = {};
  for (const file of contextFiles) {
    const absolute = path.join(repository, file);
    mkdirSync(path.dirname(absolute), { recursive: true });
    const bytes = Buffer.from(`captured ${file}\n`);
    writeFileSync(absolute, bytes);
    const logical = `_repository/test-context/${file}`;
    captured[logical] = bytes;
    input.descriptor.tool_inputs.push({ path: logical, sha256: sha256(bytes) });
  }
  input.bindTools();
  const variable = 'AGENT_RUNTIME_TEST_REPOSITORY_ROOT';
  savedEnvironment.set(variable, process.env[variable]);
  process.env[variable] = repository;
  const verified = await input.verify();
  expect(verified.rejection).toBeNull();
  expect(verified.contextInputs?.size).toBe(4);
  const contextInputs = verified.contextInputs ?? new Map<string, Buffer>();
  writeFileSync(path.join(repository, 'AGENTS.md'), 'changed after verification\n');
  const bindings = ['first', 'second'].map((name) =>
    mutationTestContextBinding(path.join(input.root, `${name}.xml`), input.descriptor.tool_inputs),
  );
  for (const binding of bindings) {
    expect(binding).not.toBeNull();
    if (!binding) throw new Error('Missing test context binding');
    mkdirSync(path.dirname(binding.root));
    await materializeMutationTestContext(binding, contextInputs);
    await assertMutationTestContext(binding, captured);
    expect(readFileSync(path.join(binding.root, 'AGENTS.md'), 'utf8')).toBe('captured AGENTS.md\n');
    await expectRejection(materializeMutationTestContext(binding, contextInputs), /EEXIST/);
  }
  expect(bindings[0]?.root).not.toBe(bindings[1]?.root);
  expect(await input.verify()).toEqual({ descriptor: null, rejection: 'tool-inputs' });
  const first = bindings[0]!;
  if (!first) throw new Error('Missing test context binding');
  writeFileSync(path.join(first.root, 'AGENTS.md'), 'drift\n');
  await expectRejection(assertMutationTestContext(first, captured), /bytes changed/);
  writeFileSync(path.join(first.root, '.unexpected-state'), 'must not be admitted');
  await expectRejection(assertMutationTestContext(first, captured), /layout changed/);
  expect(() =>
    mutationTestContextBinding(path.join(input.root, 'partial.xml'), input.descriptor.tool_inputs.slice(1)),
  ).toThrow(/incomplete/);
});

test('mutation descriptor rejects missing configured context before launching its helper', async () => {
  const input = fixture();
  input.descriptor.test_inputs.push(input.write('tests/configured-context.ts', 'export const context = true;\n'));
  input.descriptor.test_inputs.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  input.descriptor.test_fingerprint = testSelectionFingerprint(
    input.descriptor.test_selection,
    input.descriptor.test_inputs,
  );
  process.env.AGENT_RUNTIME_TEST_FINGERPRINT = input.descriptor.test_fingerprint;
  input.bindTools();
  expect(await input.verify()).toEqual({ descriptor: null, rejection: 'tool-inputs' });
});

test('context-free partitions have no extra fixture and incomplete materialization cannot reuse a root', async () => {
  const input = fixture();
  expect(mutationTestContextBinding(path.join(input.root, 'none.xml'), input.descriptor.tool_inputs)).toBeNull();
  await materializeMutationTestContext(null, new Map());
  await assertMutationTestContext(null, {});
  const binding = { root: path.join(input.root, 'missing'), inputs: [] };
  await expectRejection(materializeMutationTestContext(binding, new Map()), /incomplete/);
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
