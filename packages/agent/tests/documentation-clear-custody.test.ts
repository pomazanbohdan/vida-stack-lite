import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runBoundedSubprocess, subprocessFailure } from './helpers/bounded-subprocess.ts';

test.each(['timeout', 'signal', 'missing-status', 'denial'] as const)(
  'CLEAR fixture cleanup preserves uncertain child custody: %s',
  async (outcome) => {
    const root = mkdtempSync(path.join(tmpdir(), 'clear-custody-regression-'));
    let terminalKnown = false;
    try {
      const program = `
import { mock, expect as originalExpect } from 'bun:test';
import * as fs from 'node:fs';
import * as cp from 'node:child_process';
import path from 'node:path';
const createTemp = fs.mkdtempSync;
const exists = fs.existsSync;
const cases = new Map();
let fixtureRoot;
let launches = 0;
let timeout;
mock.module('bun:test', () => ({ expect: originalExpect, test(name, body) { cases.set(name, body); } }));
mock.module('node:fs', () => ({ ...fs, mkdtempSync() {
  fixtureRoot = createTemp(path.join(${JSON.stringify(root)}, 'fixture-'));
  return fixtureRoot;
} }));
mock.module('node:child_process', () => ({ ...cp, spawnSync(command, args, options) {
  launches++;
  timeout = options.timeout;
  if (command !== process.execPath || !args[0].endsWith('/bin/documentation-clear.ts'))
    throw new Error('Wrong CLI boundary');
  const outcome = ${JSON.stringify(outcome)};
  return { pid: 123, output: [], stdout: '', stderr: 'controlled child outcome',
    status: outcome === 'missing-status' ? null : 1,
    signal: outcome === 'signal' ? 'SIGTERM' : null,
    ...(outcome === 'timeout' ? { error: Object.assign(new Error('controlled timeout'), { code: 'ETIMEDOUT' }) } : {}) };
} }));
await import(${JSON.stringify(new URL('./documentation-clear.test.ts', import.meta.url).href)});
const body = cases.get('public CLEAR uses package policy schema without local assets and rejects consumer schema overrides');
if (typeof body !== 'function') throw new Error('Actual CLEAR fixture case missing');
let failure;
try { await body(); } catch (error) { failure = error; }
if (!fixtureRoot || !failure) throw new Error('Controlled child did not reject the actual case');
process.stdout.write(JSON.stringify({ retained: exists(fixtureRoot), message: String(failure), launches, timeout }));
`;
      const result = await runBoundedSubprocess(process.execPath, ['--no-env-file', '--no-install', '-e', program], {
        timeoutMs: 5000,
      });
      terminalKnown = result.closeObserved && !result.timedOut && result.childError === null && result.signal === null;
      expect(terminalKnown, subprocessFailure('CLEAR custody regression child', result)).toBe(true);
      expect(result.exitCode, subprocessFailure('CLEAR custody regression child', result)).toBe(0);
      expect(result.stdoutTruncated).toBe(false);
      expect(result.stderrTruncated).toBe(false);
      const observed: unknown = JSON.parse(result.stdout.toString());
      expect(observed).toHaveProperty('launches', 1);
      expect(observed).toHaveProperty('timeout', 30_000);
      expect(observed).toHaveProperty('retained', outcome !== 'denial');
      if (outcome !== 'denial') expect(observed).toHaveProperty('message', expect.stringContaining('UNKNOWN'));
      else expect(observed).toHaveProperty('message', expect.not.stringContaining('UNKNOWN'));
    } finally {
      // Only simulated subject outcomes are retained here; the outer child must close before cleanup.
      if (terminalKnown) rmSync(root, { recursive: true, force: true });
      else console.error(`Preserved uncertain CLEAR custody regression at ${root}`);
    }
  },
);

test('shared public CLI runner retains abnormal receipts and keeps ordinary denials terminal', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'public-cli-custody-regression-'));
  let terminalKnown = false;
  try {
    const program = `
import { mock } from 'bun:test';
import * as cp from 'node:child_process';
import { readFileSync } from 'node:fs';
let outcome;
mock.module('node:child_process', () => ({ ...cp, spawnSync() { return outcome; } }));
const { createNativeTsPublicCliFixtureRunner } = await import(${JSON.stringify(new URL('./helpers/public-cli-fixture-runner.ts', import.meta.url).href)});
const receiptPath = ${JSON.stringify(path.join(root, 'timing.jsonl'))};
let unknowns = 0;
const runner = createNativeTsPublicCliFixtureRunner({
  bundleRoot: ${JSON.stringify(path.resolve(import.meta.dir, '..'))}, fixtureRoot: ${JSON.stringify(root)},
  diagnosticReceiptPath: receiptPath, onUnknown() { unknowns++; }
});
const events = [];
for (const result of [
  { status: 1, signal: null },
  { status: 1, signal: null, error: Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }) },
  { status: 1, signal: 'SIGTERM' },
  { status: null, signal: null }
]) {
  outcome = { ...result, stdout: '', stderr: 'controlled outcome' };
  const returned = runner.spawn(['--inspect']);
  events.push({ identical: returned === outcome, unknowns });
}
const receipts = readFileSync(receiptPath, 'utf8').trim().split('\\n').map((line) => JSON.parse(line));
process.stdout.write(JSON.stringify({ events, retained: receipts.map((entry) => entry.retained_fixture_root ?? null),
  timedOut: receipts.map((entry) => entry.timed_out), statuses: receipts.map((entry) => entry.status) }));
`;
    const result = await runBoundedSubprocess(process.execPath, ['--no-env-file', '--no-install', '-e', program], {
      timeoutMs: 5000,
    });
    terminalKnown = result.closeObserved && !result.timedOut && result.childError === null && result.signal === null;
    expect(terminalKnown, subprocessFailure('shared CLI custody regression', result)).toBe(true);
    expect(result.exitCode, subprocessFailure('shared CLI custody regression', result)).toBe(0);
    expect(result.stdoutTruncated).toBe(false);
    expect(result.stderrTruncated).toBe(false);
    const observed: unknown = JSON.parse(result.stdout.toString());
    expect(observed).toEqual({
      events: [0, 1, 2, 3].map((unknowns) => ({ identical: true, unknowns })),
      retained: [null, root, root, root],
      timedOut: [false, true, false, false],
      statuses: [1, 1, 1, null],
    });
  } finally {
    if (terminalKnown) rmSync(root, { recursive: true, force: true });
    else console.error(`Preserved uncertain public CLI custody regression at ${root}`);
  }
});
