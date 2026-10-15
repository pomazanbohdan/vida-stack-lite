import { describe, expect, spyOn, test } from 'bun:test';
import strykerConfig from '../stryker.config.ts';
import {
  buildMutationTestCommand,
  confirmedRunnerOutcome,
  executionIdentityDigest,
  executeMutationCommand,
  junitOutcome,
  mutationReceiptMatches,
  parseMutationBodyEvents,
  settleTimedOutChild,
  testFilesWithLifecycleHooks,
} from '../tooling/mutation-evidence.ts';

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

  test('accepts a nonempty passing report with reconciled suite counters', () => {
    expect(junitOutcome(report(), ['tests/one.test.mjs']).outcome).toBe('passed');
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
