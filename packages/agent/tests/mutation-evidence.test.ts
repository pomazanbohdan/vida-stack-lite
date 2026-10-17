import { describe, expect, spyOn, test } from 'bun:test';
import strykerConfig from '../stryker.config.ts';
import { mkdtemp, writeFile, rm, rename, open as openFile } from 'node:fs/promises';
import { readlinkSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  buildMutationTestCommand,
  confirmedRunnerOutcome,
  executionIdentityDigest,
  collectExecutionIdentity,
  executionIdentityForInvocation,
  executeMutationCommand,
  junitOutcome,
  mutationReceiptMatches,
  nativeMutationActivationHitCount,
  parseMutationBodyEvents,
  settleTimedOutChild,
  testFilesWithLifecycleHooks,
  type MutationBodyEvent,
} from '../tooling/mutation-evidence.ts';

test('parent invocation projection matches a fresh identity and isolates command/test/file metadata aliases', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mutation-parent-identity-'));
  let passed = false;
  try {
    const executable = path.join(root, 'fixture-executable');
    await writeFile(executable, 'controlled byte identity fixture');
    const input = {
      executable,
      cwd: root,
      packageRoot: root,
      sandboxRoot: root,
      command: [],
      tests: [],
      sourceFingerprint: 'a'.repeat(64),
      testFingerprint: 'b'.repeat(64),
      toolFingerprint: 'c'.repeat(64),
      bunVersion: process.versions.bun!,
      platform: process.platform,
      arch: process.arch,
    };
    const observation = await collectExecutionIdentity(input);
    const command = ['bun', 'test', './tests/one.test.ts'];
    const tests = ['tests/one.test.ts'];
    const projected = executionIdentityForInvocation(observation, command, tests);
    const fresh = await collectExecutionIdentity({ ...input, command, tests });
    expect(projected).toEqual(fresh);
    expect(executionIdentityDigest(projected)).toBe(executionIdentityDigest(fresh));
    command.push('changed');
    tests.push('tests/foreign.test.ts');
    expect(projected.command).toEqual(['bun', 'test', './tests/one.test.ts']);
    expect(projected.test_files).toEqual(['tests/one.test.ts']);
    projected.bun_executable_file.inode = 'changed';
    expect(observation.bun_executable_file.inode).not.toBe('changed');
    expect(observation.test_files).toEqual([]);
    passed = true;
  } finally {
    if (passed) await rm(root, { recursive: true, force: true });
    else console.error('Retained parent identity projection fixture: ' + root);
  }
});

test('fresh validation boundary detects both byte drift and same-byte inode replacement', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'mutation-parent-identity-drift-'));
  let passed = false;
  try {
    const executable = path.join(root, 'fixture-executable');
    await writeFile(executable, 'original controlled image');
    const input = {
      executable,
      cwd: root,
      packageRoot: root,
      sandboxRoot: root,
      command: [],
      tests: [],
      sourceFingerprint: 'a'.repeat(64),
      testFingerprint: 'b'.repeat(64),
      toolFingerprint: 'c'.repeat(64),
      bunVersion: process.versions.bun!,
      platform: process.platform,
      arch: process.arch,
    };
    const original = await collectExecutionIdentity(input);
    await writeFile(executable, 'modified controlled image');
    const modified = await collectExecutionIdentity(input);
    expect(modified.bun_executable_sha256).not.toBe(original.bun_executable_sha256);
    expect(executionIdentityDigest(modified)).not.toBe(executionIdentityDigest(original));
    const replacement = path.join(root, 'replacement');
    await writeFile(replacement, 'modified controlled image');
    await rename(replacement, executable);
    const replaced = await collectExecutionIdentity(input);
    expect(replaced.bun_executable_sha256).toBe(modified.bun_executable_sha256);
    expect(executionIdentityDigest(replaced)).not.toBe(executionIdentityDigest(modified));
    passed = true;
  } finally {
    if (passed) await rm(root, { recursive: true, force: true });
    else console.error('Retained parent identity drift fixture: ' + root);
  }
});

const report = ({
  tests = 1,
  assertions = 1,
  failures = 0,
  errors = 0,
  skipped = 0,
  testcase = '<testcase name="ok" classname="" file="tests/one.test.mjs" assertions="1" />',
} = {}) => {
  const errorCounter = errors ? ` errors="${errors}"` : '';
  return `<testsuites name="bun test" tests="${tests}" assertions="${assertions}" failures="${failures}" skipped="${skipped}"${errorCounter}><testsuite name="tests/one.test.mjs" file="tests/one.test.mjs" tests="${tests}" assertions="${assertions}" failures="${failures}" skipped="${skipped}"${errorCounter}>${testcase}</testsuite></testsuites>`;
};

describe('mutation JUnit attribution', () => {
  test('routes each Stryker baseline and mutant command through the receipt writer', () => {
    expect(strykerConfig.commandRunner.command).toBe('bun tooling/mutation-command-runner.ts');
  });

  test('binds serial fail-fast flags into the exact baseline and mutant command', () => {
    expect(buildMutationTestCommand('/pinned/bun', ['tests/a.test.ts', 'tests/b.test.ts'], '/reports/run.xml')).toEqual(
      [
        '/pinned/bun',
        'test',
        'tests/a.test.ts',
        'tests/b.test.ts',
        '--max-concurrency=1',
        '--bail=1',
        '--timeout',
        '5000',
        '--preload=./tooling/mutation-test-preload.ts',
        '--reporter=junit',
        '--reporter-outfile=/reports/run.xml',
      ],
    );
  });

  test('accepts a nonempty passing report with reconciled suite counters', () => {
    expect(junitOutcome(report(), ['tests/one.test.mjs']).outcome).toBe('passed');
  });

  test('permits selected-suite subsets only for causally confirmed assertion kills', () => {
    const selected = ['tests/a.test.ts', 'tests/b.test.ts'];
    const failing = (file: string, id: number) =>
      `<testsuites name="bun test" tests="1" assertions="1" failures="1" skipped="0"><testsuite file="${file}" tests="1" assertions="1" failures="1" skipped="0"><testcase name="[mutation-body:${id}] assert" file="${file}" assertions="1"><failure type="AssertionError">expected value</failure></testcase></testsuite></testsuites>`;
    const passing = (file: string) =>
      `<testsuites name="bun test" tests="1" assertions="1" failures="0" skipped="0"><testsuite file="${file}" tests="1" assertions="1" failures="0" skipped="0"><testcase name="ok" file="${file}" assertions="1"/></testsuite></testsuites>`;
    const matchingBody = [
      {
        schema: 'MutationBodyEvent/v1' as const,
        test_file: 'tests/a.test.ts',
        kind: 'body' as const,
        body_id: 7,
        assertion_cause: true,
        assertion_source: 'bun-expect' as const,
      },
    ];

    expect(() => junitOutcome(failing('tests/a.test.ts', 7), selected, [], matchingBody)).toThrow(
      /selected test files/u,
    );
    const killed = junitOutcome(failing('tests/a.test.ts', 7), selected, [], matchingBody, undefined, true);
    expect(killed.outcome).toBe('killed');
    expect(confirmedRunnerOutcome(1, killed.outcome)).toBe('killed');

    const partialPass = junitOutcome(passing('tests/a.test.ts'), selected, [], [], undefined, true);
    expect(partialPass.outcome).toBe('unproven');
    expect(confirmedRunnerOutcome(0, partialPass.outcome)).toBe('unknown');
  });

  test('subset mode retains foreign, duplicate, counter, body, hook, runtime and XML denials', () => {
    const selected = ['tests/a.test.ts', 'tests/b.test.ts'];
    const body = {
      schema: 'MutationBodyEvent/v1' as const,
      test_file: 'tests/a.test.ts',
      kind: 'body' as const,
      body_id: 7,
      assertion_cause: true,
      assertion_source: 'bun-expect' as const,
    };
    const singleFailure = (file: string, id: number, rootTests = 1, suiteTests = 1) =>
      `<testsuites name="bun test" tests="${rootTests}" assertions="1" failures="1" skipped="0"><testsuite file="${file}" tests="${suiteTests}" assertions="1" failures="1" skipped="0"><testcase name="[mutation-body:${id}] assert" file="${file}" assertions="1"><failure type="AssertionError">expected value</failure></testcase></testsuite></testsuites>`;

    expect(() =>
      junitOutcome(singleFailure('tests/foreign.test.ts', 7), selected, [], [body], undefined, true),
    ).toThrow(/selected test files/u);
    const duplicateSuite = `<testsuites name="bun test" tests="2" assertions="2" failures="0" skipped="0"><testsuite file="tests/a.test.ts" tests="1" assertions="1" failures="0" skipped="0"><testcase name="one" file="tests/a.test.ts" assertions="1"/></testsuite><testsuite file="tests/a.test.ts" tests="1" assertions="1" failures="0" skipped="0"><testcase name="two" file="tests/a.test.ts" assertions="1"/></testsuite></testsuites>`;
    expect(() => junitOutcome(duplicateSuite, selected, [], [], undefined, true)).toThrow(/selected test files/u);
    expect(() => junitOutcome(singleFailure('tests/a.test.ts', 7, 2), selected, [], [body], undefined, true)).toThrow(
      /counter/u,
    );

    const unmatched = { ...body, body_id: 8 };
    const unmatchedResult = junitOutcome(
      singleFailure('tests/a.test.ts', 7),
      selected,
      [],
      [unmatched],
      undefined,
      true,
    );
    expect(unmatchedResult.outcome).toBe('unproven');
    expect(confirmedRunnerOutcome(1, unmatchedResult.outcome)).toBe('unknown');

    const hookResult = junitOutcome(
      singleFailure('tests/a.test.ts', 7),
      selected,
      [],
      [
        body,
        {
          schema: 'MutationBodyEvent/v1',
          test_file: 'tests/a.test.ts',
          kind: 'hook',
          hook: 'afterEach',
          error_observed: true,
        },
      ],
      undefined,
      true,
    );
    expect(hookResult.outcome).toBe('unproven');
    const runtimeError = `<testsuites name="bun test" tests="1" assertions="0" failures="0" errors="1" skipped="0"><testsuite file="tests/a.test.ts" tests="1" assertions="0" failures="0" errors="1" skipped="0"><testcase name="runtime error" file="tests/a.test.ts" assertions="0"><error type="Error">runtime failed</error></testcase></testsuite></testsuites>`;
    const errorResult = junitOutcome(runtimeError, selected, [], [], undefined, true);
    expect(errorResult.outcome).toBe('unproven');
    expect(confirmedRunnerOutcome(1, errorResult.outcome)).toBe('unknown');
    expect(() => junitOutcome('<testsuites><', selected, [], [], undefined, true)).toThrow(/malformed/u);
  });

  test('accepts a passing baseline with uninstrumented lifecycle hooks', () => {
    const outcome = junitOutcome(report(), ['tests/one.test.mjs'], ['tests/one.test.mjs']);
    expect(confirmedRunnerOutcome(0, outcome.outcome)).toBe('passed');
    expect(confirmedRunnerOutcome(1, outcome.outcome)).toBe('unknown');
  });

  test('keeps failed reports with uninstrumented lifecycle hooks unproven', () => {
    const xml = report({
      failures: 1,
      testcase:
        '<testcase name="[mutation-body:1] assert" classname="" file="tests/one.test.mjs" assertions="1"><failure type="AssertionError">expected 2</failure></testcase>',
    });
    const outcome = junitOutcome(
      xml,
      ['tests/one.test.mjs'],
      ['tests/one.test.mjs'],
      [
        {
          schema: 'MutationBodyEvent/v1',
          test_file: 'tests/one.test.mjs',
          kind: 'body',
          body_id: 1,
          assertion_cause: true,
          assertion_source: 'bun-expect',
        },
      ],
    );
    expect(outcome.outcome).toBe('unproven');
    expect(confirmedRunnerOutcome(1, outcome.outcome)).toBe('unknown');
  });

  test('rejects an observed hook error even when JUnit reports passing cases', () => {
    const outcome = junitOutcome(
      report(),
      ['tests/one.test.mjs'],
      [],
      [
        {
          schema: 'MutationBodyEvent/v1',
          test_file: 'tests/one.test.mjs',
          kind: 'hook',
          hook: 'afterAll',
          error_observed: true,
        },
      ],
    );
    expect(outcome.outcome).toBe('unproven');
    expect(confirmedRunnerOutcome(0, outcome.outcome)).toBe('unknown');
  });

  test('accepts only explicit Bun AssertionError failures as assertion evidence', () => {
    const xml = report({
      failures: 1,
      testcase:
        '<testcase name="[mutation-body:1] assert" classname="" file="tests/one.test.mjs" assertions="1"><failure type="AssertionError">expected 2</failure></testcase>',
    });
    expect(junitOutcome(xml, ['tests/one.test.mjs']).outcome).toBe('unproven');
    expect(
      junitOutcome(
        xml,
        ['tests/one.test.mjs'],
        [],
        [
          {
            schema: 'MutationBodyEvent/v1',
            test_file: 'tests/one.test.mjs',
            kind: 'body',
            body_id: 1,
            assertion_cause: true,
            assertion_source: 'bun-expect',
          },
        ],
      ).outcome,
    ).toBe('killed');
    const nodeAssertionXml = report({
      assertions: 0,
      failures: 1,
      testcase:
        '<testcase name="[mutation-body:1] node assertion" classname="" file="tests/one.test.mjs" assertions="0"><failure type="AssertionError">node assertion failed</failure></testcase>',
    });
    expect(
      junitOutcome(
        nodeAssertionXml,
        ['tests/one.test.mjs'],
        [],
        [
          {
            schema: 'MutationBodyEvent/v1',
            test_file: 'tests/one.test.mjs',
            kind: 'body',
            body_id: 1,
            assertion_cause: true,
            assertion_source: 'node-assert',
          },
        ],
      ).outcome,
    ).toBe('killed');
  });

  test('keeps hook AssertionError outcomes unproven despite positive assertion counters', () => {
    const xml = report({
      failures: 1,
      testcase:
        '<testcase name="[mutation-body:1] body passes" classname="" file="tests/one.test.mjs" assertions="1"><failure type="AssertionError">hook expect failed</failure></testcase>',
    });
    expect(
      junitOutcome(
        xml,
        ['tests/one.test.mjs'],
        [],
        [
          {
            schema: 'MutationBodyEvent/v1',
            test_file: 'tests/one.test.mjs',
            kind: 'body',
            body_id: 1,
            assertion_cause: true,
            assertion_source: 'bun-expect',
          },
          {
            schema: 'MutationBodyEvent/v1',
            test_file: 'tests/one.test.mjs',
            kind: 'hook',
            hook: 'afterEach',
            error_observed: true,
          },
        ],
      ).outcome,
    ).toBe('unproven');
  });

  test('admits only exact bounded body and hook events', () => {
    const bytes = Buffer.from(
      '{"schema":"MutationBodyEvent/v1","test_file":"tests/one.test.mjs","kind":"body","body_id":1,"assertion_cause":true,"assertion_source":"bun-expect"}\n',
    );
    expect(parseMutationBodyEvents(bytes, ['tests/one.test.mjs'])).toHaveLength(1);
    expect(() => parseMutationBodyEvents(Buffer.from('{"kind":"body"}\n'), ['tests/one.test.mjs'])).toThrow(/invalid/u);
    expect(() => parseMutationBodyEvents(bytes, ['tests/other.test.mjs'])).toThrow(/binding/u);
  });

  test('parses strict activation observations and binds native activation to the selected ID', () => {
    const event = {
      schema: 'MutationBodyEvent/v1',
      test_file: 'tests/one.test.mjs',
      kind: 'body',
      body_id: 1,
      assertion_cause: true,
      assertion_source: 'bun-expect',
      activation: { mutant_id: 'mutant-7', hit_count: 2 },
    } satisfies MutationBodyEvent;
    const parsed = parseMutationBodyEvents(Buffer.from(`${JSON.stringify(event)}\n`), ['tests/one.test.mjs']);
    expect(parsed).toEqual([event]);
    expect(nativeMutationActivationHitCount(parsed, 'mutant-7')).toBe(2);
    expect(nativeMutationActivationHitCount([], 'mutant-7')).toBeUndefined();
    expect(nativeMutationActivationHitCount([], null)).toBeUndefined();
    const inactive = parseMutationBodyEvents(
      Buffer.from(`${JSON.stringify({ ...event, activation: { mutant_id: 'mutant-7', hit_count: 0 } })}\n`),
      ['tests/one.test.mjs'],
    );
    expect(nativeMutationActivationHitCount(inactive, 'mutant-7')).toBe(0);
    const foreign = parseMutationBodyEvents(
      Buffer.from(`${JSON.stringify({ ...event, activation: { mutant_id: 'mutant-8', hit_count: 2 } })}\n`),
      ['tests/one.test.mjs'],
    );
    expect(nativeMutationActivationHitCount(foreign, 'mutant-7', false)).toBeUndefined();
    expect(() => nativeMutationActivationHitCount(foreign, 'mutant-7')).toThrow(/foreign mutant activation/u);
    expect(() => nativeMutationActivationHitCount(foreign, null)).toThrow(/Baseline receipt/u);
    expect(() => nativeMutationActivationHitCount([...parsed, ...foreign], 'mutant-7')).toThrow(
      /foreign mutant activation/u,
    );
    for (const invalid of [
      { ...event, activation: { mutant_id: 'mutant-7', hit_count: -1 } },
      { ...event, activation: { mutant_id: 'mutant-7', hit_count: 1.5 } },
      { ...event, activation: { mutant_id: '', hit_count: 1 } },
      { ...event, activation: { mutant_id: 'mutant-7' } },
      { ...event, activation: { mutant_id: 'mutant-7', hit_count: 1, extra: true } },
      { ...event, extra: true },
    ])
      expect(() =>
        parseMutationBodyEvents(Buffer.from(`${JSON.stringify(invalid)}\n`), ['tests/one.test.mjs']),
      ).toThrow(/invalid body event/u);
  });

  test('follows relative test helpers when locating lifecycle hooks', () => {
    const testInputs = {
      'tests/one.test.mjs': Buffer.from("import './helpers/hooks.mjs'; test('body', () => {});"),
      'tests/helpers/hooks.mjs': Buffer.from("import { beforeEach } from 'bun:test'; beforeEach(() => {});"),
      'tests/helpers/plain.mjs': Buffer.from('export const value = 1;'),
    };
    expect(testFilesWithLifecycleHooks(['tests/one.test.mjs'], testInputs)).toEqual([]);
    const uninstrumentedInputs = {
      'tests/one.test.mjs': Buffer.from("import '../src/hooks.mjs'; test('body', () => {});"),
      'src/hooks.mjs': Buffer.from("import { beforeEach } from 'bun:test'; beforeEach(() => {});"),
    };
    expect(testFilesWithLifecycleHooks(['tests/one.test.mjs'], uninstrumentedInputs)).toEqual(['tests/one.test.mjs']);
    expect(testFilesWithLifecycleHooks(['tests/helpers/plain.mjs'], testInputs)).toEqual([]);
  });

  test('treats valid imported JSON as data and keeps malformed JSON fail-closed', () => {
    const entry = 'tests/cedar.test.ts';
    const runtimeConfig = 'src/config/runtime-config.ts';
    const schema = 'schemas/runtime-config.schema.json';
    const testInputs = {
      [entry]: Buffer.from("import '../src/config/runtime-config.ts';"),
      [runtimeConfig]: Buffer.from("import schema from '../../schemas/runtime-config.schema.json'; export { schema };"),
      [schema]: Buffer.from('{"description":"The word beforeEach here is data."}'),
    };

    expect(testFilesWithLifecycleHooks([entry], testInputs)).toEqual([]);
    expect(
      testFilesWithLifecycleHooks([entry], {
        ...testInputs,
        [schema]: Buffer.from('{"description":"beforeEach"'),
      }),
    ).toEqual([entry]);
  });

  test('distinguishes TypeScript generics from JSX while retaining hook and parse denials', () => {
    const entry = 'tests/typescript-owner.test.ts';
    const dependency = 'src/generic-owner.ts';
    const generic = 'export const choose = <T>(value: T): T => value;';
    const inputs = {
      [entry]: Buffer.from(`import '../${dependency}';`),
      [dependency]: Buffer.from(generic),
    };
    expect(testFilesWithLifecycleHooks([entry], inputs)).toEqual([]);
    expect(
      testFilesWithLifecycleHooks([entry], {
        ...inputs,
        [dependency]: Buffer.from(`${generic}\nimport { afterEach } from 'bun:test'; afterEach(() => {});`),
      }),
    ).toEqual([entry]);
    expect(testFilesWithLifecycleHooks([entry], { ...inputs, [dependency]: Buffer.from('export const = ;') })).toEqual([
      entry,
    ]);
    expect(
      testFilesWithLifecycleHooks(['tests/jsx-owner.test.tsx'], {
        'tests/jsx-owner.test.tsx': Buffer.from('const element = <section />;'),
      }),
    ).toEqual([]);
  });

  test('keeps runtime, loader, setup, and worker Error failures unproven', () => {
    const xml = report({
      assertions: 0,
      failures: 1,
      testcase:
        '<testcase name="(worker crashed)" classname="" file="tests/one.test.mjs" assertions="0"><failure type="Error">worker process crashed before reporting results</failure></testcase>',
    });
    expect(() => junitOutcome(xml, ['tests/one.test.mjs'])).toThrow(/not proven/u);
  });

  test('rejects duplicate selected suites that conceal a missing file', () => {
    const expected = ['tests/a.test.ts', 'tests/b.test.ts', 'tests/c.test.ts', 'tests/d.test.ts'];
    const suites = [expected[0], expected[0], expected[1], expected[2]]
      .map(
        (file) =>
          `<testsuite file="${file}" tests="1" assertions="1" failures="0" skipped="0"><testcase file="${file}" name="ok" assertions="1" /></testsuite>`,
      )
      .join('');
    const xml = `<testsuites name="bun test" tests="4" assertions="4" failures="0" skipped="0">${suites}</testsuites>`;
    expect(() => junitOutcome(xml, expected)).toThrow(/selected test files/u);
  });

  test('rejects a malformed suite even when counters match the remaining valid suite', () => {
    const xml = report().replace('</testsuites>', '<testsuite>discarded malformed suite</testsuite></testsuites>');
    expect(() => junitOutcome(xml, ['tests/one.test.mjs'])).toThrow(/malformed/u);
  });

  test('rejects suite counters that disagree with testcase evidence', () => {
    expect(() => junitOutcome(report({ tests: 2 }), ['tests/one.test.mjs'])).toThrow(/counter/u);
  });

  test('rejects empty, all-skipped, malformed, and mixed assertion/error reports', () => {
    expect(() => junitOutcome(report({ tests: 0, assertions: 0, testcase: '' }), ['tests/one.test.mjs'])).toThrow(
      /no test cases/u,
    );
    expect(
      junitOutcome(
        report({
          assertions: 0,
          skipped: 1,
          testcase:
            '<testcase name="skip" classname="" file="tests/one.test.mjs" assertions="0"><skipped /></testcase>',
        }),
        ['tests/one.test.mjs'],
      ).outcome,
    ).toBe('unproven');
    expect(() => junitOutcome('<testsuites><', ['tests/one.test.mjs'])).toThrow(/malformed/u);
    expect(() =>
      junitOutcome(
        report({
          failures: 1,
          errors: 1,
          assertions: 1,
          testcase:
            '<testcase name="mixed" classname="" file="tests/one.test.mjs" assertions="1"><failure type="AssertionError"/><error type="Error"/></testcase>',
        }),
        ['tests/one.test.mjs'],
      ),
    ).toThrow(/conflicting/u);
    expect(() => junitOutcome(report(), ['tests/other.test.mjs'])).toThrow(/selected test files/u);
  });
});

describe('mutation execution receipts', () => {
  const sandboxRoot = '/tmp/mutation-evidence/stryker-tmp';
  const cwd = `${sandboxRoot}/sandbox-123abc`;
  const command = buildMutationTestCommand('/opt/bun', ['tests/one.test.mjs'], '/tmp/mutation-evidence/one.xml');
  const identity = {
    schema: 'MutationExecutionIdentity/v2',
    bun_executable: '/opt/bun',
    bun_executable_file: { device: '1', inode: '2', size: '3', modified_ns: '4' },
    bun_version: '1.4.2',
    platform: 'linux',
    arch: 'x64',
    cwd,
    package_root: cwd,
    sandbox_root: sandboxRoot,
    command,
    test_files: ['tests/one.test.mjs'],
    source_fingerprint: 'a'.repeat(64),
    test_fingerprint: 'b'.repeat(64),
    tool_fingerprint: 'c'.repeat(64),
  };
  const inputs = {
    source_fingerprint: identity.source_fingerprint,
    test_fingerprint: identity.test_fingerprint,
    tool_fingerprint: identity.tool_fingerprint,
  };
  const receipt = () => ({
    schema: 'MutationRunnerReceipt/v3',
    run_id: '123e4567-e89b-12d3-a456-426614174000',
    partition: 'sample',
    active_mutant_id: null,
    test_files: ['tests/one.test.mjs'],
    input_fingerprint: 'd'.repeat(64),
    ...inputs,
    command: [...command.slice(0, -1), '--reporter-outfile=<one.xml>'],
    execution_identity: identity,
    execution_identity_digest: executionIdentityDigest(identity),
    execution_identity_after_digest: executionIdentityDigest(identity),
    spawn_error: null,
    timed_out: false,
    signal: null,
    exit_code: 0,
    process_custody: {
      pid: 54321,
      terminationObserved: true,
      unrefCalled: false,
      attempts: [],
    },
    junit_file: 'sample-dry-run.xml',
    junit_sha256: 'e'.repeat(64),
    junit_bytes: 10,
    body_events_file: 'sample-dry-run.body.jsonl',
    body_events_sha256: 'a'.repeat(64),
    body_events_bytes: 0,
    stdout_file: 'sample-dry-run.stdout.log',
    stderr_file: 'sample-dry-run.stderr.log',
    stdout_capture: { bytes: 0, sha256: 'f'.repeat(64), retained_bytes: 0, truncated: false },
    stderr_capture: { bytes: 0, sha256: 'f'.repeat(64), retained_bytes: 0, truncated: false },
  });
  const expected = {
    runId: '123e4567-e89b-12d3-a456-426614174000',
    partition: 'sample',
    mutantId: null,
    tests: ['tests/one.test.mjs'],
    inputs,
    fingerprint: 'd'.repeat(64),
    junitFile: 'sample-dry-run.xml',
    bodyEventsFile: 'sample-dry-run.body.jsonl',
    stdoutFile: 'sample-dry-run.stdout.log',
    stderrFile: 'sample-dry-run.stderr.log',
    command,
    sandboxRoot,
    executionIdentity: { ...identity, cwd: sandboxRoot, package_root: sandboxRoot },
  };

  test('binds baseline receipt to the exact test, command, runtime, cwd and sandbox', () => {
    expect(mutationReceiptMatches(receipt(), expected)).toBe(true);
  });

  test('per-test capture receipt is parent-opt-in, fixed-name and byte-digest bound', () => {
    const capture = {
      mode: 'diagnostic-v2' as const,
      file: 'per-test-coverage.json' as const,
      bytes: 123,
      sha256: '9'.repeat(64),
    };
    const captureReceipt = { ...receipt(), per_test_capture: capture };
    expect(mutationReceiptMatches(captureReceipt, expected)).toBe(false);
    expect(mutationReceiptMatches(receipt(), { ...expected, perTestCapture: capture })).toBe(false);
    expect(mutationReceiptMatches(captureReceipt, { ...expected, perTestCapture: capture })).toBe(true);

    for (const malformed of [
      undefined,
      null,
      { ...capture, mode: 'other' },
      { ...capture, file: 'foreign.json' },
      { ...capture, bytes: 0 },
      { ...capture, bytes: 4 * 1024 * 1024 + 1 },
      { ...capture, bytes: 1.5 },
      { ...capture, sha256: 'A'.repeat(64) },
      { ...capture, sha256: 'f'.repeat(63) },
      { ...capture, extra: true },
    ])
      expect(
        mutationReceiptMatches({ ...receipt(), per_test_capture: malformed }, { ...expected, perTestCapture: capture }),
      ).toBe(false);

    expect(
      mutationReceiptMatches(
        { ...receipt(), per_test_capture: { ...capture, sha256: '8'.repeat(64) } },
        { ...expected, perTestCapture: capture },
      ),
    ).toBe(false);
  });

  test('rejects a changed after-execution identity digest with the original identity otherwise intact', () => {
    expect(mutationReceiptMatches({ ...receipt(), execution_identity_after_digest: '0'.repeat(64) }, expected)).toBe(
      false,
    );
  });

  test('binds a configured context receipt to its private root and exact captured inputs', () => {
    const testContext = {
      root: '/tmp/mutation-evidence/sample-dry-run.adapters/configured-test-context',
      inputs: [{ path: '_repository/test-context/AGENTS.md', sha256: '1'.repeat(64) }],
    };
    const bound = { ...expected, testContext };
    expect(mutationReceiptMatches({ ...receipt(), test_context: testContext }, bound)).toBe(true);
    for (const changed of [
      undefined,
      null,
      { ...testContext, root: '/tmp/shared-context' },
      { ...testContext, inputs: [] },
      { ...testContext, inputs: [{ ...testContext.inputs[0], sha256: '2'.repeat(64) }] },
    ])
      expect(mutationReceiptMatches({ ...receipt(), test_context: changed }, bound)).toBe(false);
  });

  test('requires a passing baseline and pinned Bun assertion exit result', () => {
    expect(confirmedRunnerOutcome(0, 'passed')).toBe('passed');
    expect(confirmedRunnerOutcome(1, 'killed')).toBe('killed');
    expect(confirmedRunnerOutcome(2, 'killed')).toBe('unknown');
    expect(confirmedRunnerOutcome(1, 'assertion-failure')).toBe('unknown');
    expect(confirmedRunnerOutcome(2, 'assertion-failure')).toBe('unknown');
    expect(confirmedRunnerOutcome(137, 'assertion-failure')).toBe('unknown');
    expect(confirmedRunnerOutcome(1, 'passed')).toBe('unknown');
    expect(confirmedRunnerOutcome(0, 'assertion-failure')).toBe('unknown');
    expect(confirmedRunnerOutcome(null, 'assertion-failure')).toBe('unknown');
    expect(confirmedRunnerOutcome(1, 'unproven')).toBe('unknown');
  });

  test('rejects stale IDs, changed selection, runtime/cwd drift, command and fingerprints', () => {
    for (const change of [
      { run_id: 'stale' },
      { partition: 'other' },
      { active_mutant_id: 'mutant-1' },
      { test_files: ['tests/other.test.mjs'] },
      { input_fingerprint: 'f'.repeat(64) },
      { command: ['bun', 'test', 'tests/other.test.mjs'] },
      { execution_identity: { ...identity, platform: 'darwin' } },
      {
        execution_identity: { ...identity, cwd: '/tmp/foreign/sandbox-abc', package_root: '/tmp/foreign/sandbox-abc' },
      },
      { timed_out: true },
      { spawn_error: 'ENOENT' },
      { process_custody: { pid: 54321, terminationObserved: false, unrefCalled: true, attempts: [] } },
    ]) {
      expect(mutationReceiptMatches({ ...receipt(), ...change }, expected)).toBe(false);
    }
  });

  test('records inert child success, nonzero exit, spawn error, and timeout separately', async () => {
    const passed = await executeMutationCommand([process.execPath, '-e', 'process.exit(0)'], process.cwd(), 1000);
    const failed = await executeMutationCommand([process.execPath, '-e', 'process.exit(7)'], process.cwd(), 1000);
    const missing = await executeMutationCommand(['/missing-mutation-child'], process.cwd(), 1000);
    const timeout = await executeMutationCommand(
      [process.execPath, '-e', 'setTimeout(() => {}, 5000)'],
      process.cwd(),
      30,
    );
    expect(passed).toMatchObject({ exitCode: 0, signal: null, spawnError: null, timedOut: false });
    expect(failed).toMatchObject({ exitCode: 7, signal: null, spawnError: null, timedOut: false });
    expect(missing).toMatchObject({ exitCode: null, spawnError: 'ENOENT', timedOut: false });
    expect(timeout).toMatchObject({ spawnError: null, timedOut: true });
  });

  test('cancels a failed log stream before a writing child blocks on its unread pipe', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'mutation-output-open-failure-'));
    let completed = false;
    try {
      const result = await executeMutationCommand(
        [
          process.execPath,
          '-e',
          `process.stdout.on('error', () => process.exit(23));
          const bytes = Buffer.alloc(65536);
          function pump() {
            process.stdout.write(bytes, error => { if (error) process.exit(23); else pump(); });
          }
          pump();`,
        ],
        process.cwd(),
        1000,
        { stdoutFile: path.join(root, 'missing-parent', 'stdout.log'), stderrFile: path.join(root, 'stderr.log') },
      );
      expect(result).toMatchObject({
        exitCode: 23,
        signal: null,
        timedOut: false,
        spawnError: 'output-capture-failed',
        processCustody: { terminationObserved: true },
        output_capture: { complete: false, errors: [{ stream: 'stdout', codes: ['ENOENT'] }] },
      });
      completed = true;
    } finally {
      if (completed) await rm(root, { recursive: true, force: true });
    }
  });

  test.skipIf(process.platform !== 'linux')(
    'returns incomplete capture with ordered write, sync and close failures while closing the real log handle',
    async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), 'mutation-output-failure-'));
      let completed = false;
      let writeAttempts = 0;
      let syncAttempts = 0;
      let closeAttempts = 0;
      let writeSpy: { mockRestore: () => void } | undefined;
      let syncSpy: { mockRestore: () => void } | undefined;
      let closeSpy: { mockRestore: () => void } | undefined;
      try {
        const stdoutFile = path.join(root, 'stdout.log');
        const stderrFile = path.join(root, 'stderr.log');
        const probe = await openFile(path.join(root, 'handle-probe'), 'wx');
        const handlePrototype = Object.getPrototypeOf(probe) as Pick<typeof probe, 'writeFile' | 'sync' | 'close'>;
        await probe.close();
        const handlePath = (handle: typeof probe): string => path.resolve(readlinkSync(`/proc/self/fd/${handle.fd}`));
        const writeFailure = Object.assign(new Error('controlled capture write failure'), { code: 'EWRITE' });
        const syncFailure = Object.assign(new Error('controlled capture sync failure'), { code: 'ESYNC' });
        const closeFailure = Object.assign(new Error('controlled capture close failure'), { code: 'ECLOSE' });
        const originalWriteFile = handlePrototype.writeFile;
        const originalSync = handlePrototype.sync;
        const originalClose = handlePrototype.close;
        writeSpy = spyOn(handlePrototype, 'writeFile').mockImplementation(async function (
          this: typeof probe,
          ...args: Parameters<typeof originalWriteFile>
        ) {
          if (handlePath(this) === stdoutFile) {
            writeAttempts++;
            throw writeFailure;
          }
          return Reflect.apply(originalWriteFile, this, args) as ReturnType<typeof originalWriteFile>;
        });
        syncSpy = spyOn(handlePrototype, 'sync').mockImplementation(async function (this: typeof probe) {
          if (handlePath(this) === stdoutFile) {
            syncAttempts++;
            throw syncFailure;
          }
          return originalSync.call(this);
        });
        closeSpy = spyOn(handlePrototype, 'close').mockImplementation(async function (this: typeof probe) {
          if (handlePath(this) === stdoutFile) {
            closeAttempts++;
            await originalClose.call(this);
            throw closeFailure;
          }
          return originalClose.call(this);
        });

        const observed = await executeMutationCommand(
          [process.execPath, '-e', "process.stdout.write('captured bytes', () => process.exit(7))"],
          process.cwd(),
          1000,
          { stdoutFile, stderrFile },
        ).then(
          (value) => ({ value }),
          (reason: unknown) => ({ reason }),
        );
        expect('value' in observed).toBe(true);
        if (!('value' in observed))
          throw new Error('Capture failure rejected instead of returning bounded evidence.', {
            cause: observed.reason,
          });
        expect(observed.value).toMatchObject({
          exitCode: 7,
          signal: null,
          spawnError: 'output-capture-failed',
          timedOut: false,
          processCustody: { terminationObserved: true },
          output_capture: {
            complete: false,
            errors: [{ stream: 'stdout', codes: ['EWRITE', 'ESYNC', 'ECLOSE'] }],
          },
        });
        expect(writeAttempts).toBe(1);
        expect(syncAttempts).toBe(1);
        expect(closeAttempts).toBe(1);
        completed = true;
      } finally {
        writeSpy?.mockRestore();
        syncSpy?.mockRestore();
        closeSpy?.mockRestore();
        if (completed) await rm(root, { recursive: true, force: true });
      }
    },
  );

  test.skipIf(process.platform !== 'linux')(
    'keeps capture incomplete when EOF completes but durable sync is held',
    async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), 'mutation-output-sync-gate-'));
      let completed = false;
      let syncStarted = 0;
      let closeAttempts = 0;
      let signalSyncStarted!: () => void;
      let signalCleanupFinished!: () => void;
      let releaseSync!: () => void;
      const bothSyncsStarted = new Promise<void>((resolve) => {
        signalSyncStarted = resolve;
      });
      const cleanupFinished = new Promise<void>((resolve) => {
        signalCleanupFinished = resolve;
      });
      const syncGate = new Promise<void>((resolve) => {
        releaseSync = resolve;
      });
      let syncSpy: { mockRestore: () => void } | undefined;
      let closeSpy: { mockRestore: () => void } | undefined;
      try {
        const stdoutFile = path.join(root, 'stdout.log');
        const stderrFile = path.join(root, 'stderr.log');
        const probe = await openFile(path.join(root, 'handle-probe'), 'wx');
        const handlePrototype = Object.getPrototypeOf(probe) as Pick<typeof probe, 'sync' | 'close'>;
        await probe.close();
        const handlePath = (handle: typeof probe): string => path.resolve(readlinkSync(`/proc/self/fd/${handle.fd}`));
        const originalSync = handlePrototype.sync;
        const originalClose = handlePrototype.close;
        syncSpy = spyOn(handlePrototype, 'sync').mockImplementation(async function (this: typeof probe) {
          const target = handlePath(this);
          if (target === stdoutFile || target === stderrFile) {
            syncStarted++;
            if (syncStarted === 2) signalSyncStarted();
            await syncGate;
          }
          return originalSync.call(this);
        });
        closeSpy = spyOn(handlePrototype, 'close').mockImplementation(async function (this: typeof probe) {
          const target = handlePath(this);
          await originalClose.call(this);
          if (target === stdoutFile || target === stderrFile) {
            closeAttempts++;
            if (closeAttempts === 2) signalCleanupFinished();
          }
        });

        const resultPromise = executeMutationCommand([process.execPath, '-e', 'process.exit(0)'], process.cwd(), 1000, {
          stdoutFile,
          stderrFile,
        });
        await bothSyncsStarted;
        const result = await resultPromise;
        expect(result).toMatchObject({
          exitCode: 0,
          signal: null,
          timedOut: false,
          output_capture: { complete: false },
        });
        expect(syncStarted).toBe(2);
        expect(closeAttempts).toBe(0);

        releaseSync();
        await cleanupFinished;
        expect(closeAttempts).toBe(2);
        completed = true;
      } finally {
        releaseSync?.();
        if (syncStarted === 2) await cleanupFinished;
        syncSpy?.mockRestore();
        closeSpy?.mockRestore();
        if (completed) await rm(root, { recursive: true, force: true });
      }
    },
  );

  test('uses an explicit child environment without restoring omitted parent variables', async () => {
    const name = 'VIDA_MUTATION_ENV_BOUNDARY_TEST';
    const prior = process.env[name];
    process.env[name] = 'parent-only';
    const command = [process.execPath, '--no-env-file', '-e', `process.exit(process.env.${name} ? 12 : 0)`];
    try {
      expect((await executeMutationCommand(command, process.cwd(), 1000, { env: {} })).exitCode).toBe(0);
      expect((await executeMutationCommand(command, process.cwd(), 1000)).exitCode).toBe(12);
    } finally {
      if (prior === undefined) delete process.env[name];
      else process.env[name] = prior;
    }
  });

  test('releases observation timers when child output completes before its deadline', async () => {
    const timers = new Set<unknown>();
    const originalSet = globalThis.setTimeout;
    const originalClear = globalThis.clearTimeout;
    const set = spyOn(globalThis, 'setTimeout').mockImplementation(
      Object.assign(
        (...args: Parameters<typeof setTimeout>) => {
          const timer = originalSet(...args);
          timers.add(timer);
          return timer;
        },
        { __promisify__: originalSet.__promisify__ },
      ),
    );
    const clear = spyOn(globalThis, 'clearTimeout').mockImplementation((timer) => {
      timers.delete(timer);
      Reflect.apply(originalClear, globalThis, [timer]);
    });
    try {
      const result = await executeMutationCommand([process.execPath, '-e', 'process.exit(0)'], process.cwd(), 1000);
      expect(result).toMatchObject({ exitCode: 0, output_capture: { complete: true } });
      expect(timers.size).toBe(0);
    } finally {
      set.mockRestore();
      clear.mockRestore();
      for (const timer of timers) Reflect.apply(originalClear, globalThis, [timer]);
    }
  });

  test.skipIf(process.platform === 'win32')(
    'keeps normal direct exit UNKNOWN when its owned process-group probe fails',
    async () => {
      const originalKill = process.kill.bind(process);
      let groupProbeObserved = false;
      const kill = spyOn(process, 'kill').mockImplementation((...args: Parameters<typeof process.kill>) => {
        if (args[0] < 0 && args[1] === 0) {
          groupProbeObserved = true;
          throw Object.assign(new Error('owned process-group probe denied'), { code: 'EPERM' });
        }
        return originalKill(...args);
      });
      try {
        const result = await executeMutationCommand(
          [process.execPath, '-e', "process.stdout.write('parent-ready\\n'); process.exit(0)"],
          process.cwd(),
          1000,
          { ownedProcessGroup: true },
        );

        expect(groupProbeObserved).toBe(true);
        expect(result).toMatchObject({
          exitCode: 0,
          signal: null,
          spawnError: 'process-group-termination-unobserved',
          timedOut: false,
          processCustody: {
            scope: 'owned-process-group',
            terminationObserved: true,
            processGroupTerminationObserved: false,
          },
        });
      } finally {
        kill.mockRestore();
      }
    },
  );

  test.skipIf(process.platform === 'win32')(
    'attempts bounded cleanup for a surviving owned group but keeps normal leader exit non-successful',
    async () => {
      const originalKill = process.kill.bind(process);
      let simulatedSurvivor = true;
      const attempts: NodeJS.Signals[] = [];
      const kill = spyOn(process, 'kill').mockImplementation((...args: Parameters<typeof process.kill>) => {
        const [pid, signal] = args;
        if (typeof pid === 'number' && pid < 0) {
          if (signal === 0) {
            if (simulatedSurvivor) return true;
            throw Object.assign(new Error('simulated group is gone'), { code: 'ESRCH' });
          }
          if (signal === 'SIGTERM' || signal === 'SIGKILL') {
            attempts.push(signal);
            simulatedSurvivor = false;
            return true;
          }
        }
        return originalKill(...args);
      });
      try {
        const result = await executeMutationCommand([process.execPath, '-e', 'process.exit(0)'], process.cwd(), 1000, {
          ownedProcessGroup: true,
        });

        expect(attempts).toContain('SIGTERM');
        expect(simulatedSurvivor).toBe(false);
        expect(result).toMatchObject({
          exitCode: 0,
          signal: null,
          timedOut: false,
          spawnError: 'process-group-termination-unobserved',
          processCustody: {
            scope: 'owned-process-group',
            terminationObserved: true,
            processGroupTerminationObserved: true,
          },
        });
      } finally {
        kill.mockRestore();
      }
    },
  );

  test.skipIf(process.platform === 'win32')('observes an empty owned process group after normal exit', async () => {
    const result = await executeMutationCommand([process.execPath, '-e', 'process.exit(0)'], process.cwd(), 1000, {
      ownedProcessGroup: true,
    });

    expect(result).toMatchObject({
      exitCode: 0,
      signal: null,
      spawnError: null,
      timedOut: false,
      processCustody: {
        scope: 'owned-process-group',
        terminationObserved: true,
        processGroupTerminationObserved: true,
      },
    });
  });

  test('escalates a timed-out inert child and records observed termination', async () => {
    const command = [process.execPath, '-e', 'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000)'];
    const result = await executeMutationCommand(command, process.cwd(), 20, {
      terminationGraceMs: 20,
      forceWaitMs: 500,
    });
    expect(result.timedOut).toBe(true);
    expect(result.processCustody).toMatchObject({
      terminationObserved: true,
      attempts: [{ signal: 'SIGTERM' }, { signal: 'SIGKILL' }],
    });
    expect(typeof result.processCustody?.pid).toBe('number');
    expect(result.exitCode).not.toBeNull();
    expect(result.spawnError).toBeNull();
  });

  test('returns bounded unknown custody and unreferences an unobserved child', async () => {
    const attempts: (NodeJS.Signals | 'unref')[] = [];
    const child = {
      pid: 32123,
      exited: new Promise<number>(() => {}),
      exitCode: null,
      signalCode: null,
      kill(signal: NodeJS.Signals) {
        attempts.push(signal);
      },
      unref() {
        attempts.push('unref');
      },
    };
    const result = await settleTimedOutChild(child, 5, 5);
    expect(attempts).toEqual(['SIGTERM', 'SIGKILL', 'unref']);
    expect(result).toMatchObject({
      exitCode: null,
      signal: null,
      spawnError: 'termination-unobserved',
      timedOut: true,
      processCustody: {
        pid: 32123,
        terminationObserved: false,
        unrefCalled: true,
        attempts: [{ signal: 'SIGTERM' }, { signal: 'SIGKILL' }],
      },
    });
  });
});
