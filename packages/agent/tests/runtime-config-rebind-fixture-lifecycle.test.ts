import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { runBoundedSubprocess } from './helpers/bounded-subprocess.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function runActualFixtureChild(label: string, source: string) {
  const root = mkdtempSync(path.join(tmpdir(), `vida-runtime-config-rebind-${label}-`));
  writeFileSync(path.join(root, 'fixture.test.ts'), source);
  const packageRoot = path.resolve(import.meta.dirname, '..');
  const child = await runBoundedSubprocess(
    process.execPath,
    ['test', '--timeout', '5000', '--parallel=1', '--no-isolate', './fixture.test.ts'],
    {
      cwd: root,
      env: { ...process.env, VIDA_CONFIG_REBIND_TEST_BUNDLE: packageRoot },
      timeoutMs: 30_000,
      stdoutLimitBytes: 16 * 1024,
      stderrLimitBytes: 16 * 1024,
    },
  );
  return { root, child };
}

function actualFixturePrelude(resultPath: string): string {
  const helperUrl = pathToFileURL(path.resolve(import.meta.dirname, 'helpers/runtime-config-rebind-fixture.ts')).href;
  return `
    import { afterAll, expect, spyOn, test } from 'bun:test';
    import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
    import { Database } from 'bun:sqlite';
    const fixtureApi = await import(${JSON.stringify(helperUrl)});
    const { cleanupRuntimeConfigFixtureRoots, fixture, fixtureCall, registerRuntimeConfigFixtureCleanup, sourceCorrectionNativeFixture, sourceCorrectionNativeRuntime, sourceCorrectionRebindWithNative, withDatabase } = fixtureApi;
    const { retryPendingWorkspaceDatabaseCloses } = await import(${JSON.stringify(pathToFileURL(path.resolve(import.meta.dirname, '../src/config/workspace-database-raw.ts')).href)});
    registerRuntimeConfigFixtureCleanup();
    const f = fixture();
    const resultPath = ${JSON.stringify(resultPath)};
    const baselinePath = process.env.PATH ?? '';
  `;
}

test('a shared cached fixture registers cleanup for each no-isolate test file', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-runtime-config-rebind-hooks-'));
  const testDir = path.join(root, 'tests');
  const captureDir = path.join(root, 'captures');
  const helper = path.join(root, 'fixture.ts');
  const makeTest = (id: string): string => `
    import { registerCleanup, state } from '../fixture.ts';
    registerCleanup();
    import { afterAll, test } from 'bun:test';
    import { writeFileSync } from 'node:fs';
    afterAll(() => writeFileSync(new URL('../captures/${id}.json', import.meta.url), JSON.stringify(state)));
    test(${JSON.stringify(`fixture ${id}`)}, () => { state.pending.push(${JSON.stringify(id)}); });
  `;
  const helperSource = `
    import { afterEach } from 'bun:test';
    type SharedState = { pending: string[]; cleaned: string[] };
    const key = Symbol.for('vida.runtime-config-rebind.lifecycle-control');
    const host = globalThis as typeof globalThis & { [key]?: SharedState };
    export const state = host[key] ??= { pending: [], cleaned: [] };
    export function registerCleanup(): void {
      afterEach(() => { state.cleaned.push(...state.pending.splice(0)); });
    }
    process.on('beforeExit', () => process.stdout.write(JSON.stringify(state)));
  `;
  mkdirSync(testDir, { recursive: true });
  mkdirSync(captureDir, { recursive: true });
  writeFileSync(helper, helperSource);
  writeFileSync(path.join(testDir, 'a.test.ts'), makeTest('a'));
  writeFileSync(path.join(testDir, 'b.test.ts'), makeTest('b'));

  let retain = true;
  try {
    const child = await runBoundedSubprocess(
      process.execPath,
      ['test', '--timeout', '5000', '--parallel=1', '--no-isolate', './tests/a.test.ts', './tests/b.test.ts'],
      { cwd: root, timeoutMs: 15_000, stdoutLimitBytes: 16 * 1024, stderrLimitBytes: 16 * 1024 },
    );
    expect(child.closeObserved).toBe(true);
    expect(child.timedOut).toBe(false);
    const statePath = path.join(captureDir, 'b.json');
    const stateText = readFileSync(statePath, 'utf8');
    const state: unknown = JSON.parse(stateText);
    expect(isRecord(state)).toBe(true);
    if (!isRecord(state)) throw Error('Lifecycle child produced an invalid state record');
    expect(Array.isArray(state.pending)).toBe(true);
    expect(Array.isArray(state.cleaned)).toBe(true);
    if (!Array.isArray(state.pending) || !Array.isArray(state.cleaned))
      throw Error('Lifecycle child produced invalid pending or cleaned arrays');
    expect(state.pending).toEqual([]);
    expect(state.cleaned.sort((left, right) => String(left).localeCompare(String(right)))).toEqual(['a', 'b']);
    expect(child.exitCode).toBe(0);
    retain = false;
  } finally {
    if (!retain) rmSync(root, { recursive: true, force: true });
  }
});

test('an unresolved fixture call retains its root and shared native state', async () => {
  const controlRoot = mkdtempSync(path.join(tmpdir(), 'vida-runtime-config-rebind-pending-control-'));
  const resultPath = path.join(controlRoot, 'result.json');
  const source = `${actualFixturePrelude(resultPath)}
    let blockedCaseRan = false;
    test('leave one owned fixture call pending', () => {
      sourceCorrectionNativeRuntime.value = { root: 'controlled-root', executable: 'controlled-executable' };
      sourceCorrectionNativeRuntime.previousPath = 'prior-path-value';
      process.env.PATH = 'controlled-path-value';
      void fixtureCall(() => new Promise(() => {}), ['--project-root', f.root]).catch(() => {});
    });
    test('do not begin another fixture case while it is unresolved', () => { blockedCaseRan = true; });
    afterAll(() => writeFileSync(resultPath, JSON.stringify({
      root: f.root,
      rootExists: existsSync(f.root),
      runtimeValue: sourceCorrectionNativeRuntime.value,
      previousPath: sourceCorrectionNativeRuntime.previousPath,
      path: process.env.PATH,
      baselinePath,
      blockedCaseRan,
    })));
  `;
  let retain = true;
  try {
    const { child } = await runActualFixtureChild('pending-control', source);
    expect(child.closeObserved).toBe(true);
    expect(child.timedOut).toBe(false);
    expect(child.exitCode).toBe(1);
    expect(child.stderr.toString('utf8')).toContain('prior fixture call is unresolved');
    const capture: unknown = JSON.parse(readFileSync(resultPath, 'utf8'));
    expect(isRecord(capture)).toBe(true);
    if (!isRecord(capture)) throw Error('Pending-call child produced an invalid capture record');
    expect(capture.rootExists).toBe(true);
    expect(capture.runtimeValue).toEqual({ root: 'controlled-root', executable: 'controlled-executable' });
    expect(capture.previousPath).toBe('prior-path-value');
    expect(capture.path).toBe('controlled-path-value');
    expect(capture.blockedCaseRan).toBe(false);
    retain = false;
  } finally {
    if (!retain) rmSync(controlRoot, { recursive: true, force: true });
  }
});

test.each(['reserved', 'commit_unknown'] as const)(
  'a settled fixture call retains its root when its governance operation remains %s',
  async (status) => {
    const controlRoot = mkdtempSync(path.join(tmpdir(), 'vida-runtime-config-rebind-unknown-control-'));
    const resultPath = path.join(controlRoot, 'result.json');
    const source = `${actualFixturePrelude(resultPath)}
    import { HostStateStore } from ${JSON.stringify(pathToFileURL(path.resolve(import.meta.dirname, '../src/host-state.ts')).href)};
    import path from 'node:path';
    const storeId = 'vida-lifecycle-unknown-control';
    const operationKey = '2'.repeat(64);
    const databasePath = path.join(f.root, '.agent/work/session-handoff.v1.sqlite');
    let expectedOperationBytes;
    const readOperationBytes = () => {
      if (!existsSync(databasePath)) return null;
      const db = new Database(databasePath, { readonly: true, strict: true });
      try {
        const row = db.query('SELECT payload FROM agent_host_governance WHERE workspace_id=? AND store_id=? AND kind=? AND record_key=?')
          .get(f.workspace, storeId, 'operation', operationKey);
        return row && typeof row.payload === 'string' ? row.payload : null;
      } finally { db.close(); }
    };
    test('settle fixture transport with an unresolved governance operation', async () => {
      const args = ['--project-root', f.root, '--mode', 'sentinel'];
      const result = await fixtureCall((observed) => {
        expect(observed).toEqual(args);
        return withDatabase(f, (db) => {
          const store = new HostStateStore(db, f.workspace);
          const operation = store.reserveOperation(storeId, operationKey, '1'.repeat(64));
          if (!operation) throw Error('UNKNOWN control reservation was not created');
          if (${JSON.stringify(status)} === 'commit_unknown') store.transitionOperation(operation, 'commit_unknown');
          const retained = store.inspectOperation(storeId, operationKey);
          if (!retained) throw Error('UNKNOWN control operation is missing');
          return { status: retained.status, bytes: readOperationBytes() };
        });
      }, args);
      expect(result.status).toBe(${JSON.stringify(status)});
      expectedOperationBytes = result.bytes;
      expect(typeof expectedOperationBytes).toBe('string');
    });
    afterAll(() => writeFileSync(resultPath, JSON.stringify({
      root: f.root,
      rootExists: existsSync(f.root),
      expectedOperationBytes,
      actualOperationBytes: readOperationBytes(),
    })));
  `;
    let retain = true;
    let fixtureRoot: string | undefined;
    try {
      const { child } = await runActualFixtureChild('unknown-control', source);
      expect(child.closeObserved).toBe(true);
      expect(child.timedOut).toBe(false);
      expect(child.exitCode, child.stderr.toString()).toBe(0);
      const capture: unknown = JSON.parse(readFileSync(resultPath, 'utf8'));
      expect(isRecord(capture)).toBe(true);
      if (!isRecord(capture)) throw Error('UNKNOWN-operation child produced an invalid capture record');
      fixtureRoot = typeof capture.root === 'string' ? capture.root : undefined;
      expect(capture.rootExists).toBe(true);
      expect(typeof capture.expectedOperationBytes).toBe('string');
      expect(capture.actualOperationBytes).toBe(capture.expectedOperationBytes);
      const operation: unknown = JSON.parse(String(capture.actualOperationBytes));
      expect(isRecord(operation)).toBe(true);
      if (!isRecord(operation)) throw Error('Retained UNKNOWN operation payload is invalid');
      expect(operation.status).toBe(status);
      retain = false;
    } finally {
      if (!retain) {
        if (fixtureRoot) console.warn('Retained UNKNOWN governance control fixture: ' + fixtureRoot);
        rmSync(controlRoot, { recursive: true, force: true });
      }
    }
  },
  45_000,
);

test('a settled fixture call preserves its result and performs normal cleanup', async () => {
  const controlRoot = mkdtempSync(path.join(tmpdir(), 'vida-runtime-config-rebind-settled-control-'));
  const resultPath = path.join(controlRoot, 'result.json');
  const source = `${actualFixturePrelude(resultPath)}
    import { HostStateStore } from ${JSON.stringify(pathToFileURL(path.resolve(import.meta.dirname, '../src/host-state.ts')).href)};
    test('settle one owned fixture call', async () => {
      sourceCorrectionNativeRuntime.value = { root: 'controlled-root', executable: 'controlled-executable' };
      sourceCorrectionNativeRuntime.previousPath = baselinePath;
      process.env.PATH = 'controlled-path-value';
      const args = ['--project-root', f.root, '--mode', 'sentinel'];
      const result = await fixtureCall((observed) => {
        expect(observed).toEqual(args);
        withDatabase(f, (db) => {
          const store = new HostStateStore(db, f.workspace);
          const operation = store.reserveOperation('vida-lifecycle-terminal-control', '4'.repeat(64), '5'.repeat(64));
          if (!operation) throw Error('Terminal control reservation was not created');
          store.transitionOperation(operation, 'commit_unknown');
          store.transitionOperation(operation, 'applied', '6'.repeat(64));
          expect(store.inspectOperation(operation.store_id, operation.operation_key)?.status).toBe('applied');
        });
        return { status: 'settled' };
      }, args);
      expect(result).toEqual({ status: 'settled' });
    });
    afterAll(() => writeFileSync(resultPath, JSON.stringify({
      rootExists: existsSync(f.root),
      runtimeValue: sourceCorrectionNativeRuntime.value,
      previousPath: sourceCorrectionNativeRuntime.previousPath,
      path: process.env.PATH,
      baselinePath,
    })));
  `;
  let retain = true;
  try {
    const { child } = await runActualFixtureChild('settled-control', source);
    expect(child.closeObserved).toBe(true);
    expect(child.timedOut).toBe(false);
    expect(child.exitCode, child.stderr.toString()).toBe(0);
    const capture: unknown = JSON.parse(readFileSync(resultPath, 'utf8'));
    expect(isRecord(capture)).toBe(true);
    if (!isRecord(capture)) throw Error('Settled-call child produced an invalid capture record');
    expect(capture.rootExists).toBe(false);
    expect(capture.runtimeValue).toBeNull();
    expect(capture.previousPath).toBeUndefined();
    expect(capture.path).toBe(capture.baselinePath);
    retain = false;
  } finally {
    if (!retain) rmSync(controlRoot, { recursive: true, force: true });
  }
});

test('native PATH setup restores an originally absent PATH in an isolated fixture child', async () => {
  const controlRoot = mkdtempSync(path.join(tmpdir(), 'vida-runtime-config-rebind-absent-path-control-'));
  const resultPath = path.join(controlRoot, 'result.json');
  const source = `${actualFixturePrelude(resultPath)}
    import path from 'node:path';
    const originalPath = process.env.PATH;
    let captured;
    afterAll(() => {
      writeFileSync(resultPath, JSON.stringify({
        ...captured,
        pathPresentAfterCleanup: Object.hasOwn(process.env, 'PATH'),
        pathAfterCleanup: process.env.PATH ?? null,
      }));
      if (originalPath === undefined) delete process.env.PATH;
      else process.env.PATH = originalPath;
    });
    test('capture and restore the absent PATH state', async () => {
      delete process.env.PATH;
      const native = sourceCorrectionNativeFixture(f, '0.1.3');
      await sourceCorrectionRebindWithNative(native.runtime);
      captured = {
        tempPath: process.env.PATH,
        expectedTempPath: path.dirname(native.runtime.executable),
        capturedPreviousPath: sourceCorrectionNativeRuntime.previousPath,
      };
    });
  `;
  let retain = true;
  try {
    const { child } = await runActualFixtureChild('absent-path', source);
    expect(child.closeObserved).toBe(true);
    expect(child.timedOut).toBe(false);
    expect(child.exitCode, child.stderr.toString()).toBe(0);
    const capture: unknown = JSON.parse(readFileSync(resultPath, 'utf8'));
    expect(isRecord(capture)).toBe(true);
    if (!isRecord(capture)) throw Error('Absent-PATH control produced an invalid capture');
    expect(capture.capturedPreviousPath).toBeNull();
    expect(capture.tempPath).toBe(capture.expectedTempPath);
    expect(capture.pathPresentAfterCleanup).toBe(false);
    expect(capture.pathAfterCleanup).toBeNull();
    retain = false;
  } finally {
    if (!retain) rmSync(controlRoot, { recursive: true, force: true });
  }
});

test('a fixture callback and native close failure preserve both errors and retain its root', async () => {
  const controlRoot = mkdtempSync(path.join(tmpdir(), 'vida-runtime-config-rebind-db-close-control-'));
  const resultPath = path.join(controlRoot, 'result.json');
  const source = `${actualFixturePrelude(resultPath)}
    test('retain failed database fixture custody with both errors', () => {
      const callbackError = new Error('fixture callback failed');
      const closeError = new Error('fixture close interrupted');
      let owned: Database | undefined;
      let closeFaultInjected = false;
      const originalClose = Reflect.get(Database.prototype, 'close');
      const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (force) {
        if (this === owned && !closeFaultInjected) {
          closeFaultInjected = true;
          throw closeError;
        }
        return originalClose.call(this, force);
      });
      let caught: unknown;
      try {
        withDatabase(f, (database) => {
          owned = database;
          throw callbackError;
        });
      } catch (error) {
        caught = error;
      } finally {
        closeSpy.mockRestore();
      }
      expect(caught).toBeInstanceOf(AggregateError);
      if (!(caught instanceof AggregateError)) throw new Error('Expected callback and close failures');
      expect(caught.errors).toEqual([callbackError, closeError]);
      expect(closeFaultInjected).toBe(true);
      retryPendingWorkspaceDatabaseCloses();
      if (!owned) throw new Error('Fixture database was not captured');
      expect(() => owned.query('SELECT 1').get()).toThrow();
    });
    afterAll(() => writeFileSync(resultPath, JSON.stringify({ root: f.root, rootExists: existsSync(f.root) })));
  `;
  let retain = true;
  try {
    const { child } = await runActualFixtureChild('db-close-control', source);
    expect(child.closeObserved).toBe(true);
    expect(child.timedOut).toBe(false);
    expect(child.exitCode, child.stderr.toString()).toBe(0);
    const capture: unknown = JSON.parse(readFileSync(resultPath, 'utf8'));
    expect(isRecord(capture)).toBe(true);
    if (!isRecord(capture)) throw Error('Database-close control produced an invalid capture record');
    expect(capture.rootExists).toBe(true);
    retain = false;
  } finally {
    if (!retain) rmSync(controlRoot, { recursive: true, force: true });
  }
}, 45_000);

test('a missing fixture-call tracker explicitly retains its root', async () => {
  const controlRoot = mkdtempSync(path.join(tmpdir(), 'vida-runtime-config-rebind-missing-tracker-control-'));
  const resultPath = path.join(controlRoot, 'result.json');
  const source = `${actualFixturePrelude(resultPath)}
    test('mark a root retained when its fixture-call tracker disappears', async () => {
      const rootKey = f.root;
      const originalGet = Map.prototype.get;
      const originalSet = Map.prototype.set;
      const originalDelete = Map.prototype.delete;
      let pendingMap: Map<unknown, unknown> | undefined;
      Map.prototype.set = function <K, V>(this: Map<K, V>, key: K, value: V) {
        if (key === rootKey && value === (1 as V)) pendingMap = this as Map<unknown, unknown>;
        return originalSet.call(this, key, value);
      };
      Map.prototype.get = function <K, V>(this: Map<K, V>, key: K): V | undefined {
        const value = originalGet.call(this, key);
        if (this === pendingMap && key === rootKey && value === (1 as V)) {
          originalDelete.call(this, key);
          return undefined;
        }
        return value;
      };
      try {
        await expect(fixtureCall(() => ({ status: 'settled' }), ['--project-root', rootKey]))
          .rejects.toThrow('Fixture call tracking was lost; custody must be retained');
      } finally {
        Map.prototype.get = originalGet;
        Map.prototype.set = originalSet;
      }
    });
    afterAll(() => writeFileSync(resultPath, JSON.stringify({ root: f.root, rootExists: existsSync(f.root) })));
  `;
  let retain = true;
  try {
    const { child } = await runActualFixtureChild('missing-tracker-control', source);
    expect(child.closeObserved).toBe(true);
    expect(child.timedOut).toBe(false);
    expect(child.exitCode, child.stderr.toString()).toBe(0);
    const capture: unknown = JSON.parse(readFileSync(resultPath, 'utf8'));
    expect(isRecord(capture)).toBe(true);
    if (!isRecord(capture)) throw Error('Missing-tracker control produced an invalid capture record');
    expect(capture.rootExists).toBe(true);
    retain = false;
  } finally {
    if (!retain) rmSync(controlRoot, { recursive: true, force: true });
  }
}, 45_000);

for (const failedIndex of [0, 1, 2])
  test(`rebind fixture cleanup keeps custody and reaches roots after close failure at position ${failedIndex}`, async () => {
    const controlRoot = mkdtempSync(path.join(tmpdir(), 'vida-runtime-config-rebind-root-close-control-'));
    const resultPath = path.join(controlRoot, 'result.json');
    const source = `${actualFixturePrelude(resultPath)}
    import path from 'node:path';
    let captured;
    afterAll(() => writeFileSync(resultPath, JSON.stringify(captured ?? { incomplete: true })));
    test('continue cleanup after one owned inspection close fails', () => {
      const fixtures = [fixture(), fixture(), fixture()];
      withDatabase(f, () => {});
      for (const owned of fixtures) withDatabase(owned, () => {});
      const failedRoot = fixtures[${failedIndex}]?.root;
      if (!failedRoot) throw new Error('Failed fixture root is missing');
      const failedDatabasePath = path.join(failedRoot, '.agent/work/session-handoff.v1.sqlite');
      const originalClose = Reflect.get(Database.prototype, 'close');
      let closeFaultInjected = false;
      const closeSpy = spyOn(Database.prototype, 'close').mockImplementation(function (force) {
        if (!closeFaultInjected && path.resolve(String(this.filename)) === failedDatabasePath) {
          closeFaultInjected = true;
          throw new Error('fixture inspection close interrupted');
        }
        return originalClose.call(this, force);
      });
      let caught;
      try { cleanupRuntimeConfigFixtureRoots(); } catch (error) { caught = error; }
      closeSpy.mockRestore();
      retryPendingWorkspaceDatabaseCloses();
      cleanupRuntimeConfigFixtureRoots();
      captured = {
        roots: fixtures.map((owned) => ({ root: owned.root, exists: existsSync(owned.root) })),
        closeFaultInjected,
        aggregate: caught instanceof AggregateError,
      };
    });
  `;
    let retain = true;
    try {
      const { child } = await runActualFixtureChild(`root-close-${failedIndex}`, source);
      expect(child.closeObserved).toBe(true);
      expect(child.timedOut).toBe(false);
      expect(child.exitCode, child.stderr.toString()).toBe(0);
      const capture: unknown = JSON.parse(readFileSync(resultPath, 'utf8'));
      expect(isRecord(capture)).toBe(true);
      if (!isRecord(capture)) throw Error('Fixture-root close control produced an invalid capture');
      expect(capture.closeFaultInjected).toBe(true);
      expect(capture.aggregate).toBe(true);
      expect(Array.isArray(capture.roots)).toBe(true);
      if (!Array.isArray(capture.roots)) throw Error('Fixture-root close control omitted root states');
      for (const [index, state] of capture.roots.entries()) {
        expect(isRecord(state)).toBe(true);
        if (!isRecord(state)) throw Error('Fixture-root state is malformed');
        expect(state.exists).toBe(index === failedIndex);
      }
      retain = false;
    } finally {
      if (!retain) rmSync(controlRoot, { recursive: true, force: true });
    }
  }, 5_000);

for (const failedIndex of [0, 1, 2])
  test(`rebind fixture cleanup retains failed rmSync root and continues at position ${failedIndex}`, async () => {
    const controlRoot = mkdtempSync(path.join(tmpdir(), 'vida-runtime-config-rebind-rm-control-'));
    const resultPath = path.join(controlRoot, 'result.json');
    const source = `${actualFixturePrelude(resultPath)}
    import path from 'node:path';
    let captured;
    afterAll(() => writeFileSync(resultPath, JSON.stringify(captured ?? { incomplete: true })));
    test('retain failed root bytes and continue owned cleanup', () => {
      const fixtures = [fixture(), fixture(), fixture()];
      withDatabase(f, () => {});
      for (const owned of fixtures) withDatabase(owned, () => {});
      const failedRoot = fixtures[${failedIndex}]?.root;
      if (!failedRoot) throw new Error('Failed fixture root is missing');
      const retainedBytes = Buffer.from('retain these bytes after cleanup failure');
      writeFileSync(path.join(failedRoot, 'retained-evidence.bin'), retainedBytes);
      sourceCorrectionNativeRuntime.value = { root: 'controlled-root', executable: 'controlled-executable' };
      sourceCorrectionNativeRuntime.previousPath = baselinePath;
      process.env.PATH = 'controlled-path-value';
      let caught;
      try {
        cleanupRuntimeConfigFixtureRoots((root, options) => {
          if (root === failedRoot) throw new Error('fixture rmSync interrupted');
          return rmSync(root, options);
        });
      } catch (error) { caught = error; }
      cleanupRuntimeConfigFixtureRoots();
      captured = {
        roots: fixtures.map((owned) => ({
          root: owned.root,
          exists: existsSync(owned.root),
          evidence: existsSync(path.join(owned.root, 'retained-evidence.bin'))
            ? readFileSync(path.join(owned.root, 'retained-evidence.bin')).toString('base64')
            : null,
        })),
        aggregate: caught instanceof AggregateError,
        runtimeValue: sourceCorrectionNativeRuntime.value,
        previousPath: sourceCorrectionNativeRuntime.previousPath,
        path: process.env.PATH,
        baselinePath,
      };
    });
  `;
    let retain = true;
    try {
      const { child } = await runActualFixtureChild(`rm-root-${failedIndex}`, source);
      expect(child.closeObserved).toBe(true);
      expect(child.timedOut).toBe(false);
      expect(child.exitCode, child.stderr.toString()).toBe(0);
      const capture: unknown = JSON.parse(readFileSync(resultPath, 'utf8'));
      expect(isRecord(capture)).toBe(true);
      if (!isRecord(capture)) throw Error('Fixture rmSync control produced an invalid capture');
      expect(capture.aggregate).toBe(true);
      expect(capture.runtimeValue).toBeNull();
      expect(capture.previousPath).toBeUndefined();
      expect(capture.path).toBe(capture.baselinePath);
      expect(Array.isArray(capture.roots)).toBe(true);
      if (!Array.isArray(capture.roots)) throw Error('Fixture rmSync control omitted root states');
      for (const [index, state] of capture.roots.entries()) {
        expect(isRecord(state)).toBe(true);
        if (!isRecord(state)) throw Error('Fixture rmSync root state is malformed');
        expect(state.exists).toBe(index === failedIndex);
        expect(state.evidence).toBe(
          index === failedIndex ? Buffer.from('retain these bytes after cleanup failure').toString('base64') : null,
        );
      }
      retain = false;
    } finally {
      if (!retain) rmSync(controlRoot, { recursive: true, force: true });
    }
  }, 5_000);

for (const failedIndex of [0, 1, 2])
  test(`tracked filesystem-root cleanup retains native rm failure at position ${failedIndex}`, async () => {
    const controlRoot = mkdtempSync(path.join(tmpdir(), 'vida-tracked-fixture-root-cleanup-'));
    const resultPath = path.join(controlRoot, 'result.json');
    const helperUrl = pathToFileURL(path.resolve(import.meta.dirname, 'helpers/tracked-fixture-root-cleanup.ts')).href;
    const source = `
      import { afterAll, expect, test } from 'bun:test';
      import { existsSync, mkdtempSync, rmdirSync, writeFileSync } from 'node:fs';
      import { rm } from 'node:fs/promises';
      import path from 'node:path';
      import { tmpdir } from 'node:os';
      const { cleanupTrackedFixtureRoots } = await import(${JSON.stringify(helperUrl)});
      const roots = Array.from({ length: 3 }, () => mkdtempSync(path.join(tmpdir(), 'vida-tracked-root-')));
      const tracked = new Set(roots);
      const retained = new Set();
      const failedRoot = roots[${failedIndex}];
      if (!failedRoot) throw new Error('Native-fault fixture root is missing');
      writeFileSync(path.join(failedRoot, 'retained-evidence.bin'), 'retain native fault evidence');
      const attempts = [];
      let nativeError;
      let caught;
      const removeRoot = async (root, options) => {
        attempts.push(root);
        if (root === failedRoot) {
          try { rmdirSync(root); } catch (error) { nativeError = error; throw error; }
        }
        await rm(root, options);
      };
      test('all native cleanup attempts settle and a retained root is never retried', async () => {
        try { await cleanupTrackedFixtureRoots(tracked, retained, removeRoot); } catch (error) { caught = error; }
        expect(caught).toBeInstanceOf(AggregateError);
        expect(caught.errors).toHaveLength(1);
        expect(caught.errors[0]).toBe(nativeError);
        expect(typeof nativeError?.code).toBe('string');
        expect(new Set(attempts)).toEqual(new Set(roots));
        expect(attempts).toHaveLength(roots.length);
        expect(tracked.size).toBe(0);
        expect(retained.has(failedRoot)).toBe(true);
        await cleanupTrackedFixtureRoots(tracked, retained, removeRoot);
        expect(attempts).toHaveLength(roots.length);
        expect(roots.map((root) => existsSync(root))).toEqual(roots.map((root) => root === failedRoot));
        expect(existsSync(path.join(failedRoot, 'retained-evidence.bin'))).toBe(true);
      });
      afterAll(() => writeFileSync(${JSON.stringify(resultPath)}, JSON.stringify({ roots, failedRoot })));
    `;
    let retain = true;
    try {
      const { child } = await runActualFixtureChild(`tracked-native-rm-${failedIndex}`, source);
      expect(child.closeObserved).toBe(true);
      expect(child.timedOut).toBe(false);
      expect(child.exitCode, child.stderr.toString()).toBe(0);
      const capture: unknown = JSON.parse(readFileSync(resultPath, 'utf8'));
      expect(isRecord(capture)).toBe(true);
      if (!isRecord(capture)) throw Error('Tracked-root native-fault control produced an invalid capture');
      expect(Array.isArray(capture.roots)).toBe(true);
      if (!Array.isArray(capture.roots)) throw Error('Tracked-root native-fault control omitted roots');
      for (const root of capture.roots) {
        if (typeof root !== 'string') throw Error('Tracked-root native-fault control captured a malformed root');
        rmSync(root, { recursive: true, force: true });
      }
      retain = false;
    } finally {
      if (!retain) rmSync(controlRoot, { recursive: true, force: true });
    }
  });

test('tracked filesystem-root cleanup preserves a thrown undefined without retrying', async () => {
  const controlRoot = mkdtempSync(path.join(tmpdir(), 'vida-tracked-fixture-root-undefined-'));
  const resultPath = path.join(controlRoot, 'result.json');
  const helperUrl = pathToFileURL(path.resolve(import.meta.dirname, 'helpers/tracked-fixture-root-cleanup.ts')).href;
  const source = `
    import { afterAll, expect, test } from 'bun:test';
    import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
    import { rm } from 'node:fs/promises';
    import path from 'node:path';
    import { tmpdir } from 'node:os';
    const { cleanupTrackedFixtureRoots } = await import(${JSON.stringify(helperUrl)});
    const roots = [mkdtempSync(path.join(tmpdir(), 'vida-tracked-undefined-')), mkdtempSync(path.join(tmpdir(), 'vida-tracked-undefined-'))];
    const failedRoot = roots[0];
    const initiallyRetainedRoot = roots[1];
    if (!failedRoot || !initiallyRetainedRoot) throw new Error('Thrown-undefined fixture root is missing');
    writeFileSync(path.join(failedRoot, 'retained-evidence.bin'), 'retain thrown undefined evidence');
    writeFileSync(path.join(initiallyRetainedRoot, 'initially-retained.bin'), 'already retained');
    const tracked = new Set(roots);
    const retained = new Set([initiallyRetainedRoot]);
    const attempts = [];
    const aliasAttempts = [];
    let caught;
    const removeRoot = async (root, options) => {
      attempts.push(root);
      if (root === failedRoot) throw undefined;
      await rm(root, options);
    };
    test('aggregate preserves undefined and leaves the original root retained', async () => {
      const aliased = new Set([failedRoot]);
      let aliasError;
      try { await cleanupTrackedFixtureRoots(aliased, aliased, async (root) => aliasAttempts.push(root)); }
      catch (error) { aliasError = error; }
      expect(aliasError).toBeInstanceOf(Error);
      expect(aliasAttempts).toHaveLength(0);
      expect(aliased.has(failedRoot)).toBe(true);
      try { await cleanupTrackedFixtureRoots(tracked, retained, removeRoot); } catch (error) { caught = error; }
      expect(caught).toBeInstanceOf(AggregateError);
      expect(caught.errors).toHaveLength(1);
      expect(caught.errors[0]).toBeUndefined();
      expect(attempts).toEqual([failedRoot]);
      expect(tracked.size).toBe(0);
      expect(retained.has(failedRoot)).toBe(true);
      expect(retained.has(initiallyRetainedRoot)).toBe(true);
      await cleanupTrackedFixtureRoots(tracked, retained, removeRoot);
      expect(attempts).toHaveLength(1);
      expect(roots.map((root) => existsSync(root))).toEqual([true, true]);
      expect(existsSync(path.join(failedRoot, 'retained-evidence.bin'))).toBe(true);
      expect(existsSync(path.join(initiallyRetainedRoot, 'initially-retained.bin'))).toBe(true);
    });
    afterAll(() => writeFileSync(${JSON.stringify(resultPath)}, JSON.stringify({ roots })));
  `;
  let retain = true;
  try {
    const { child } = await runActualFixtureChild('tracked-undefined', source);
    expect(child.closeObserved).toBe(true);
    expect(child.timedOut).toBe(false);
    expect(child.exitCode, child.stderr.toString()).toBe(0);
    const capture: unknown = JSON.parse(readFileSync(resultPath, 'utf8'));
    expect(isRecord(capture)).toBe(true);
    if (!isRecord(capture)) throw Error('Tracked-root undefined-fault control produced an invalid capture');
    expect(Array.isArray(capture.roots)).toBe(true);
    if (!Array.isArray(capture.roots)) throw Error('Tracked-root undefined-fault control omitted roots');
    for (const root of capture.roots) {
      if (typeof root !== 'string') throw Error('Tracked-root undefined-fault control captured a malformed root');
      rmSync(root, { recursive: true, force: true });
    }
    retain = false;
  } finally {
    if (!retain) rmSync(controlRoot, { recursive: true, force: true });
  }
});

test.each([0, 1, 2])(
  'continuation cleanup reaches roots after unsafe root at position %s',
  async (failedIndex) => {
    const controlRoot = mkdtempSync(path.join(tmpdir(), 'vida-continuation-root-cleanup-control-'));
    const resultPath = path.join(controlRoot, 'result.json');
    const helperUrl = pathToFileURL(
      path.resolve(import.meta.dirname, 'helpers/delivered-work-continuation-fixture.ts'),
    ).href;
    const source = `
    import { afterAll, expect, test } from 'bun:test';
    import { existsSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
    import path from 'node:path';
    import { tmpdir } from 'node:os';
    const { cleanupContinuationFixtures, trackContinuationFixtureRoot } = await import(${JSON.stringify(helperUrl)});
    const destination = mkdtempSync(path.join(tmpdir(), 'vida-continuation-root-destination-'));
    const roots = [mkdtempSync(path.join(tmpdir(), 'vida-continuation-root-')), mkdtempSync(path.join(tmpdir(), 'vida-continuation-root-'))];
    const unsafeRoot = path.join(tmpdir(), 'vida-continuation-unsafe-' + process.pid + '-' + ${JSON.stringify(String(failedIndex))});
    rmSync(unsafeRoot, { recursive: true, force: true });
    symlinkSync(destination, unsafeRoot);
    roots.splice(${failedIndex}, 0, unsafeRoot);
    for (const root of roots) trackContinuationFixtureRoot(root);
    let captured;
    afterAll(() => {
      writeFileSync(${JSON.stringify(resultPath)}, JSON.stringify(captured));
      rmSync(unsafeRoot, { recursive: true, force: true });
      rmSync(destination, { recursive: true, force: true });
    });
    test('retain the unsafe root while cleaning every safe root', () => {
      let caught;
      try { cleanupContinuationFixtures(); } catch (error) { caught = error; }
      expect(caught).toBeInstanceOf(AggregateError);
      captured = {
        roots: roots.map((root) => ({ root, exists: existsSync(root) })),
        destinationExists: existsSync(destination),
      };
    });
  `;
    let retain = true;
    try {
      const { child } = await runActualFixtureChild(`continuation-root-${failedIndex}`, source);
      expect(child.closeObserved).toBe(true);
      expect(child.timedOut).toBe(false);
      expect(child.exitCode, child.stderr.toString()).toBe(0);
      const capture: unknown = JSON.parse(readFileSync(resultPath, 'utf8'));
      expect(isRecord(capture)).toBe(true);
      if (!isRecord(capture)) throw Error('Continuation-root cleanup control produced an invalid capture');
      expect(capture.destinationExists).toBe(true);
      expect(Array.isArray(capture.roots)).toBe(true);
      if (!Array.isArray(capture.roots)) throw Error('Continuation-root cleanup control omitted root states');
      for (const [index, state] of capture.roots.entries()) {
        expect(isRecord(state)).toBe(true);
        if (!isRecord(state)) throw Error('Continuation-root state is malformed');
        expect(state.exists).toBe(index === failedIndex);
      }
      retain = false;
    } finally {
      if (!retain) rmSync(controlRoot, { recursive: true, force: true });
    }
  },
  45_000,
);

test('continuation fixture close remains retryable until the native close succeeds', async () => {
  const controlRoot = mkdtempSync(path.join(tmpdir(), 'vida-continuation-db-close-control-'));
  const resultPath = path.join(controlRoot, 'result.json');
  const helperUrl = pathToFileURL(
    path.resolve(import.meta.dirname, 'helpers/delivered-work-continuation-fixture.ts'),
  ).href;
  const source = `
    import { afterAll, expect, spyOn, test } from 'bun:test';
    import { existsSync, writeFileSync } from 'node:fs';
    import path from 'node:path';
    import { continuationFixture, cleanupContinuationFixtures } from ${JSON.stringify(helperUrl)};
    let captured;
    afterAll(() => writeFileSync(${JSON.stringify(resultPath)}, JSON.stringify(captured)));
    test('retry a fixture handle after its first native close fails', async () => {
      const fixture = await continuationFixture();
      const closeError = new Error('continuation native close interrupted');
      const originalClose = Reflect.get(fixture.db.constructor.prototype, 'close');
      let closeFaultInjected = false;
      const closeSpy = spyOn(fixture.db.constructor.prototype, 'close').mockImplementation(function (force) {
        if (this === fixture.db && !closeFaultInjected) {
          closeFaultInjected = true;
          throw closeError;
        }
        return originalClose.call(this, force);
      });
      expect(() => fixture.closeDatabase()).toThrow(closeError);
      closeSpy.mockRestore();
      expect(fixture.db.query('SELECT 1').get()).toBeDefined();
      fixture.closeDatabase();
      expect(() => fixture.db.query('SELECT 1').get()).toThrow();
      cleanupContinuationFixtures();
      captured = { closeFaultInjected, rootExists: existsSync(fixture.root) };
    });
  `;
  let retain = true;
  try {
    const { child } = await runActualFixtureChild('continuation-db-close', source);
    expect(child.closeObserved).toBe(true);
    expect(child.timedOut).toBe(false);
    expect(child.exitCode, child.stderr.toString()).toBe(0);
    const capture: unknown = JSON.parse(readFileSync(resultPath, 'utf8'));
    expect(isRecord(capture)).toBe(true);
    if (!isRecord(capture)) throw Error('Continuation database-close control produced an invalid capture');
    expect(capture.closeFaultInjected).toBe(true);
    expect(capture.rootExists).toBe(false);
    retain = false;
  } finally {
    if (!retain) rmSync(controlRoot, { recursive: true, force: true });
  }
}, 45_000);
