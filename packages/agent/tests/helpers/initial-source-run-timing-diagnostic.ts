import { appendFileSync, lstatSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const maxCalls = 32;
const maxBytes = 16 * 1024;
let capture:
  | { file: string; calls: number; bytes: number; phases: number; started: number; previous: number }
  | undefined;

function operationFor(args: readonly string[]): string {
  if (args.includes('--continue-initial-source')) {
    const mode = args[args.indexOf('--mode') + 1];
    return mode === 'inspect' || mode === 'apply' ? `initial-source.${mode}` : 'initial-source.other';
  }
  if (args.includes('--recover-expired-lease')) return 'run.recover-expired-lease';
  if (args.includes('--issue-wave')) return 'run.issue-wave';
  if (args.includes('--report')) return 'run.report';
  return 'run.prepare-or-resume';
}

function checkedCapture(file: string): NonNullable<typeof capture> {
  if (capture) {
    if (capture.file !== file) throw new Error('Initial Source timing output changed during the case');
    return capture;
  }
  const roots = ['../../.tmp', '../../../../.tmp'].map((relative) => path.resolve(import.meta.dir, relative));
  const root = roots.find((candidate) => {
    const relative = path.relative(candidate, file);
    return path.isAbsolute(file) && relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
  });
  if (!root) throw new Error('Initial Source timing output must be an absolute file below an owned .tmp');
  const rootInfo = lstatSync(root);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink())
    throw new Error('Initial Source timing root must be an owned ordinary directory');
  const realRoot = realpathSync(root);
  const realParent = realpathSync(path.dirname(file));
  const relativeParent = path.relative(realRoot, realParent);
  if (relativeParent.startsWith('..') || path.isAbsolute(relativeParent))
    throw new Error('Initial Source timing output parent escapes owned .tmp');
  writeFileSync(file, '', { flag: 'wx', mode: 0o600 });
  const started = performance.now();
  capture = { file, calls: 0, bytes: 0, phases: 0, started, previous: started };
  return capture;
}

function record(state: NonNullable<typeof capture>, value: Record<string, string | number>): void {
  const bytes = Buffer.from(JSON.stringify(value) + '\n');
  if (state.bytes + bytes.length > maxBytes) throw new Error('Initial Source timing output exceeded its byte bound');
  appendFileSync(state.file, bytes);
  state.bytes += bytes.length;
}

/** Phase-start observations only; an unfinished final phase never implies completion. */
export function markInitialSourceTimingPhase(phase: string): void {
  const file = process.env.VIDA_INITIAL_SOURCE_RUN_TIMING_FILE;
  if (!file) return;
  if (!/^[a-z][a-z0-9.-]{0,63}$/.test(phase)) throw new Error('Initial Source timing phase is invalid');
  const state = checkedCapture(file);
  if (state.phases >= 16) throw new Error('Initial Source timing exceeded its phase bound');
  const now = performance.now();
  record(state, {
    schema: 'PrivateInitialSourcePhaseTiming/v1',
    phase,
    elapsed_ms: now - state.started,
    since_previous_ms: now - state.previous,
  });
  state.phases++;
  state.previous = now;
}

/** Bounded opt-in timing of the real in-process CLI; no raw arguments or command output. */
export async function runWithInitialSourceTiming<T>(args: readonly string[], action: () => Promise<T>): Promise<T> {
  const file = process.env.VIDA_INITIAL_SOURCE_RUN_TIMING_FILE;
  if (!file) return action();
  const state = checkedCapture(file);
  if (state.calls >= maxCalls) throw new Error('Initial Source timing exceeded its call bound');
  const index = ++state.calls;
  const started = performance.now();
  record(state, { index, operation: operationFor(args), status: 'started', at: new Date().toISOString() });
  let result: T;
  try {
    result = await action();
  } catch (error) {
    try {
      record(state, { index, status: 'rejected', elapsed_ms: performance.now() - started });
    } catch (diagnosticError) {
      throw new AggregateError([error, diagnosticError], 'Initial Source command and timing capture failed', {
        cause: error,
      });
    }
    throw error;
  }
  try {
    record(state, { index, status: 'resolved', elapsed_ms: performance.now() - started });
  } catch (diagnosticError) {
    throw new Error('Initial Source command resolved but timing capture failed', { cause: diagnosticError });
  }
  return result;
}
