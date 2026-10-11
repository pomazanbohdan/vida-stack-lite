import assert from 'node:assert/strict';
import { afterAll, mock, test } from 'bun:test';
import { lstatSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runBoundedSubprocess,
  subprocessFailure,
  type BoundedSubprocessResult,
} from '../../packages/agent/tests/helpers/bounded-subprocess.ts';

const workerFlag = 'VIDA_FORWARD_INVOCATION_LOCK_ISOLATED';
const runningAsWorker = process.env[workerFlag] === '1';

if (runningAsWorker) {
  type CleanupOperation = 'commit' | 'rollback' | 'close';
  type CleanupFaults = ReadonlyMap<CleanupOperation, unknown>;

  const cleanupFaultsByDatabasePath = new Map<string, CleanupFaults>();

  // These controlled failures exercise the real wrapper's ownership and cleanup
  // contract. They do not qualify native SQLite locking or persistence behavior.
  class ControlledDatabaseSync {
    readonly #cleanupFaults: CleanupFaults;

    constructor(databasePath: string) {
      this.#cleanupFaults = cleanupFaultsByDatabasePath.get(databasePath) ?? new Map();
      cleanupFaultsByDatabasePath.delete(databasePath);
    }

    exec(statement: string): void {
      if (statement === 'COMMIT') this.#throwCleanupFault('commit');
      if (statement === 'ROLLBACK') this.#throwCleanupFault('rollback');
    }

    prepare(statement: string): { get: () => undefined; run: () => undefined } {
      if (statement.startsWith('SELECT ')) return { get: () => undefined, run: () => undefined };
      if (statement.startsWith('INSERT ')) return { get: () => undefined, run: () => undefined };
      throw new Error(`unexpected controlled SQLite statement: ${statement}`);
    }

    close(): void {
      this.#throwCleanupFault('close');
    }

    #throwCleanupFault(operation: CleanupOperation): void {
      if (this.#cleanupFaults.has(operation)) throw this.#cleanupFaults.get(operation);
    }
  }

  void mock.module('node:sqlite', () => ({ DatabaseSync: ControlledDatabaseSync }));

  const { assertForwardInvocationLock, withForwardInvocationLock } =
    await import('../../tooling/agent/controllers/forward-invocation-lock.ts');

  type Fixture = { readonly root: string; readonly operationId: string };

  function makeFixture(): Fixture {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-forward-invocation-lock-'));
    const operationId = 'fixture-custody';
    mkdirSync(path.join(root, '.agent', 'cutover', operationId), { recursive: true });
    return { root, operationId };
  }

  function disposeFixture(fixture: Fixture, passed: boolean): void {
    if (passed) {
      rmSync(fixture.root, { recursive: true, force: false });
      return;
    }
    console.error(`Retained failed forward-invocation-lock fixture: ${fixture.root}`);
  }

  function captureOutcome<T>(
    callback: () => T,
  ): { readonly succeeded: true; readonly value: T } | { readonly succeeded: false; readonly error: unknown } {
    try {
      return { succeeded: true, value: callback() };
    } catch (error) {
      return { succeeded: false, error };
    }
  }

  function assertFixtureWasOwned(fixture: Fixture, token: string): void {
    assert.doesNotThrow(() => assertForwardInvocationLock(fixture.root, fixture.operationId, token));
  }

  function assertFixtureWasReleased(fixture: Fixture, token: string): void {
    assert.throws(
      () => assertForwardInvocationLock(fixture.root, fixture.operationId, token),
      /forward invocation lock is not held by this process/,
    );
  }

  function configureCleanupFaults(fixture: Fixture, faults: CleanupFaults): void {
    cleanupFaultsByDatabasePath.set(
      path.join(fixture.root, '.agent', 'cutover', fixture.operationId, 'forward-invocation.v1.sqlite'),
      faults,
    );
  }

  test('callback and both cleanup failures retain their exact causes', () => {
    const fixture = makeFixture();
    let passed = false;
    const callbackFailure = new Error('callback failed');
    const rollbackFailure = new Error('rollback failed');
    const closeFailure = new Error('close failed');
    configureCleanupFaults(
      fixture,
      new Map([
        ['rollback', rollbackFailure],
        ['close', closeFailure],
      ]),
    );
    let token: string | undefined;

    try {
      const outcome = captureOutcome(() =>
        withForwardInvocationLock(fixture.root, fixture.operationId, (heldToken: string) => {
          token = heldToken;
          assertFixtureWasOwned(fixture, heldToken);
          throw callbackFailure;
        }),
      );

      assert.equal(outcome.succeeded, false);
      if (outcome.succeeded) assert.fail('callback failure was reported as success');
      assert.ok(outcome.error instanceof AggregateError);
      assert.equal(outcome.error.cause, callbackFailure);
      assert.equal(outcome.error.errors.length, 3);
      assert.equal(outcome.error.errors[0], callbackFailure);
      assert.equal(outcome.error.errors[1], rollbackFailure);
      assert.equal(outcome.error.errors[2], closeFailure);
      assert.ok(token);
      assertFixtureWasReleased(fixture, token);
      assert.ok(lstatSync(path.join(fixture.root, '.agent', 'cutover', fixture.operationId)).isDirectory());
      passed = true;
    } finally {
      disposeFixture(fixture, passed);
    }
  });

  const falsyThrownValues: readonly { readonly label: string; readonly value: unknown }[] = [
    { label: 'undefined', value: undefined },
    { label: 'null', value: null },
    { label: 'zero', value: 0 },
    { label: 'false', value: false },
  ];

  for (const { label, value } of falsyThrownValues) {
    test(`a callback throwing ${label} remains a failure and skips completed-cleanup classification`, () => {
      const fixture = makeFixture();
      let passed = false;
      let token: string | undefined;
      let classifierWasInvoked = false;

      try {
        const outcome = captureOutcome(() =>
          withForwardInvocationLock(
            fixture.root,
            fixture.operationId,
            (heldToken: string): string => {
              token = heldToken;
              assertFixtureWasOwned(fixture, heldToken);
              throw value;
            },
            {
              classifyCompletedCleanup() {
                classifierWasInvoked = true;
                return 'misclassified completion';
              },
            },
          ),
        );

        assert.equal(outcome.succeeded, false, 'a falsy thrown value must not turn into a success result');
        if (outcome.succeeded) assert.fail('callback failure was reported as success');
        assert.equal(outcome.error, value);
        assert.equal(classifierWasInvoked, false, 'callback failure is not completed-cleanup failure');
        assert.ok(token);
        assertFixtureWasReleased(fixture, token);
        passed = true;
      } finally {
        disposeFixture(fixture, passed);
      }
    });
  }

  test('a successful undefined result still releases its ownership token', () => {
    const fixture = makeFixture();
    let passed = false;
    let token: string | undefined;

    try {
      const outcome = captureOutcome(() =>
        withForwardInvocationLock(fixture.root, fixture.operationId, (heldToken: string) => {
          token = heldToken;
          assertFixtureWasOwned(fixture, heldToken);
          return undefined;
        }),
      );

      assert.equal(outcome.succeeded, true);
      if (!outcome.succeeded) assert.fail('successful callback was reported as a failure');
      assert.equal(outcome.value, undefined);
      assert.ok(token);
      assertFixtureWasReleased(fixture, token);
      passed = true;
    } finally {
      disposeFixture(fixture, passed);
    }
  });

  test('completed callback cleanup faults reach the classifier once with ordered causes and released ownership', () => {
    const fixture = makeFixture();
    let passed = false;
    const callbackResult = Object.freeze({ status: 'completed' as const });
    const commitFailure = new Error('commit failed');
    const rollbackFailure = new Error('rollback failed after commit failure');
    const closeFailure = new Error('close failed after commit failure');
    configureCleanupFaults(
      fixture,
      new Map([
        ['commit', commitFailure],
        ['rollback', rollbackFailure],
        ['close', closeFailure],
      ]),
    );
    let token: string | undefined;
    let classifierCalls = 0;

    try {
      const outcome = captureOutcome(() =>
        withForwardInvocationLock(
          fixture.root,
          fixture.operationId,
          (heldToken: string) => {
            token = heldToken;
            assertFixtureWasOwned(fixture, heldToken);
            return callbackResult;
          },
          {
            classifyCompletedCleanup(cleanupFailure: unknown, result: typeof callbackResult) {
              classifierCalls += 1;
              assert.ok(token);
              assertFixtureWasReleased(fixture, token);
              assert.ok(cleanupFailure instanceof AggregateError);
              assert.equal(cleanupFailure.cause, commitFailure);
              assert.equal(cleanupFailure.errors.length, 3);
              assert.equal(cleanupFailure.errors[0], commitFailure);
              assert.equal(cleanupFailure.errors[1], rollbackFailure);
              assert.equal(cleanupFailure.errors[2], closeFailure);
              assert.equal(result, callbackResult);
              return callbackResult;
            },
          },
        ),
      );

      assert.equal(outcome.succeeded, true);
      if (!outcome.succeeded) assert.fail('completed cleanup was not classified');
      assert.equal(outcome.value, callbackResult);
      assert.equal(classifierCalls, 1);
      assert.ok(token);
      assertFixtureWasReleased(fixture, token);
      passed = true;
    } finally {
      disposeFixture(fixture, passed);
    }
  });

  test('an undefined callback failure retains falsy rollback and close causes without classification', () => {
    const fixture = makeFixture();
    let passed = false;
    const rollbackFailure = null;
    const closeFailure = false;
    configureCleanupFaults(
      fixture,
      new Map([
        ['rollback', rollbackFailure],
        ['close', closeFailure],
      ]),
    );
    let token: string | undefined;
    let classifierWasInvoked = false;

    try {
      const outcome = captureOutcome(() =>
        withForwardInvocationLock(
          fixture.root,
          fixture.operationId,
          (heldToken: string): string => {
            token = heldToken;
            assertFixtureWasOwned(fixture, heldToken);
            throw undefined;
          },
          {
            classifyCompletedCleanup() {
              classifierWasInvoked = true;
              return 'misclassified completion';
            },
          },
        ),
      );

      assert.equal(outcome.succeeded, false);
      if (outcome.succeeded) assert.fail('callback failure was reported as success');
      assert.ok(outcome.error instanceof AggregateError);
      assert.equal(outcome.error.cause, undefined);
      assert.equal(outcome.error.errors.length, 3);
      assert.equal(outcome.error.errors[0], undefined);
      assert.equal(outcome.error.errors[1], rollbackFailure);
      assert.equal(outcome.error.errors[2], closeFailure);
      assert.equal(classifierWasInvoked, false);
      assert.ok(token);
      assertFixtureWasReleased(fixture, token);
      passed = true;
    } finally {
      disposeFixture(fixture, passed);
    }
  });

  test('a cleanup-only falsy failure without a classifier is rethrown exactly', () => {
    const fixture = makeFixture();
    let passed = false;
    const closeFailure = false;
    configureCleanupFaults(fixture, new Map([['close', closeFailure]]));
    let token: string | undefined;

    try {
      const outcome = captureOutcome(() =>
        withForwardInvocationLock(fixture.root, fixture.operationId, (heldToken: string) => {
          token = heldToken;
          assertFixtureWasOwned(fixture, heldToken);
          return 'completed result';
        }),
      );

      assert.equal(outcome.succeeded, false);
      if (outcome.succeeded) assert.fail('cleanup-only failure was reported as success');
      assert.equal(outcome.error, closeFailure);
      assert.ok(token);
      assertFixtureWasReleased(fixture, token);
      passed = true;
    } finally {
      disposeFixture(fixture, passed);
    }
  });

  afterAll(() => {
    mock.restore();
    console.log('BUN_TEST_SUITE_COMPLETE:forward-invocation-lock');
  });
} else {
  test('runs isolated forward-invocation-lock regressions with complete child evidence', async () => {
    const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    const childEnvironment: NodeJS.ProcessEnv = {
      ...process.env,
      [workerFlag]: '1',
      FORCE_COLOR: '0',
    };
    delete childEnvironment.VIDA_FORWARD_INVOCATION_LOCK_ISOLATED;
    childEnvironment[workerFlag] = '1';

    let childResult: BoundedSubprocessResult | undefined;
    let spawnFailed = false;
    let spawnError: unknown;
    try {
      childResult = await runBoundedSubprocess(process.execPath, ['test', fileURLToPath(import.meta.url)], {
        cwd: repositoryRoot,
        env: childEnvironment,
        timeoutMs: 4_000,
      });
    } catch (error) {
      spawnFailed = true;
      spawnError = error;
    }

    assert.equal(spawnFailed, false, `isolated worker spawn failed: ${String(spawnError)}`);
    assert.ok(childResult, 'isolated worker produced no terminal receipt');
    assert.equal(childResult.timedOut, false, subprocessFailure('isolated worker timed out', childResult));
    assert.equal(childResult.signal, null, subprocessFailure('isolated worker was signaled', childResult));
    assert.equal(childResult.exitCode, 0, subprocessFailure('isolated worker failed', childResult));
    assert.equal(childResult.stdoutTruncated, false, 'isolated worker stdout was truncated');
    assert.equal(childResult.stderrTruncated, false, 'isolated worker stderr was truncated');

    const output = `${childResult.stdout.toString('utf8')}\n${childResult.stderr.toString('utf8')}`;
    assert.match(output, /BUN_TEST_SUITE_COMPLETE:forward-invocation-lock/);
    assert.match(output, /^\s*9 pass\s*$/m, 'isolated worker did not report all nine regression cases');
    assert.match(output, /^\s*0 fail\s*$/m, 'isolated worker reported a failing regression case');
  }, 6_000);
}
