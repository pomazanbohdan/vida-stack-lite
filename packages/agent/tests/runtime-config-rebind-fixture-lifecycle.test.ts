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
    import { afterAll, expect, test } from 'bun:test';
    import { existsSync, writeFileSync } from 'node:fs';
    const fixtureApi = await import(${JSON.stringify(helperUrl)});
    const { fixture, fixtureCall, registerRuntimeConfigFixtureCleanup, sourceCorrectionNativeRuntime } = fixtureApi;
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
}, 45_000);

test('a settled fixture call preserves its result and performs normal cleanup', async () => {
  const controlRoot = mkdtempSync(path.join(tmpdir(), 'vida-runtime-config-rebind-settled-control-'));
  const resultPath = path.join(controlRoot, 'result.json');
  const source = `${actualFixturePrelude(resultPath)}
    test('settle one owned fixture call', async () => {
      sourceCorrectionNativeRuntime.value = { root: 'controlled-root', executable: 'controlled-executable' };
      sourceCorrectionNativeRuntime.previousPath = baselinePath;
      process.env.PATH = 'controlled-path-value';
      const args = ['--project-root', f.root, '--mode', 'sentinel'];
      const result = await fixtureCall((observed) => {
        expect(observed).toEqual(args);
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
    expect(child.exitCode).toBe(0);
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
}, 45_000);
