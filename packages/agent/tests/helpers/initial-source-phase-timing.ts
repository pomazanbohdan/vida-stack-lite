import { closeSync, constants, fstatSync, lstatSync, openSync, realpathSync, writeSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { isPromise } from 'node:util/types';

export type InitialSourcePhase =
  | 'lease'
  | 'execution_open'
  | 'workflow_prepare'
  | 'workflow_reserve'
  | 'composition'
  | 'runtime_current'
  | 'runtime_snapshot';
export interface PhaseFixture {
  readonly repositoryRoot: string;
  readonly workId: string;
  readonly actionId: string;
  readonly stageId: 'develop_task';
}
type CaptureState = 'disabled' | 'not_installed' | 'armed' | 'complete' | 'incomplete' | 'truncated' | 'sink_error';
const traceRoot = path.resolve(import.meta.dir, '../../../../.tmp');
const maxEvents = 128;
const maxBytes = 16 * 1024;
const terminalReserve = 256;

/** Test-only observers preserve original return values, errors and Promise identity. */
export function createInitialSourcePhaseTiming(file?: string) {
  let installed = false;
  let used = false;
  let state: CaptureState = 'disabled';
  let fixture: PhaseFixture | undefined;
  let descriptor: number | undefined;
  let fileIdentity: { dev: number; ino: number } | undefined;
  let events = 0;
  let bytes = 0;
  let nextInvocation = 0;
  let pending = 0;

  function append(value: Record<string, string | number>): boolean {
    if (descriptor === undefined || file === undefined || state === 'sink_error') return false;
    try {
      const current = lstatSync(file);
      if (current.isSymbolicLink() || current.dev !== fileIdentity?.dev || current.ino !== fileIdentity.ino)
        throw new Error('phase output identity changed');
      const line = Buffer.from(JSON.stringify({ schema: 'InitialSourceWriterPhase/v1', ...value }) + '\n');
      if (bytes + line.length > maxBytes || events >= maxEvents) throw new Error('phase terminal bound exceeded');
      const written = writeSync(descriptor, line);
      bytes += written;
      events++;
      if (written !== line.length) throw new Error('phase output write was incomplete');
      return true;
    } catch {
      state = 'sink_error';
      return false;
    }
  }

  function record(value: Record<string, string | number>): void {
    if (state !== 'armed') return;
    const lineBytes = Buffer.byteLength(JSON.stringify({ schema: 'InitialSourceWriterPhase/v1', ...value }) + '\n');
    if (events >= maxEvents - 1 || bytes + lineBytes > maxBytes - terminalReserve) {
      if (append({ phase: 'capture', state: 'truncated', monotonic_ns: process.hrtime.bigint().toString() }))
        state = 'truncated';
      return;
    }
    append(value);
  }

  function arm(input: PhaseFixture): boolean {
    if (!file || used) return false;
    if (!installed) {
      state = 'not_installed';
      return false;
    }
    used = true;
    try {
      const relative = path.relative(traceRoot, file);
      if (
        !path.isAbsolute(file) ||
        !relative ||
        relative === '..' ||
        relative.startsWith('..' + path.sep) ||
        path.isAbsolute(relative)
      )
        throw new Error('phase output escapes repository scratch root');
      const parent = path.dirname(file);
      const parentStats = lstatSync(parent);
      if (!parentStats.isDirectory() || parentStats.isSymbolicLink()) throw new Error('phase output parent is unsafe');
      const realRelative = path.relative(realpathSync(traceRoot), realpathSync(parent));
      if (realRelative === '..' || realRelative.startsWith('..' + path.sep) || path.isAbsolute(realRelative))
        throw new Error('phase output parent escapes scratch root');
      const root = realpathSync(input.repositoryRoot);
      const owner = path.dirname(root);
      const directFixture = owner === realpathSync(tmpdir()) && path.basename(root).startsWith('vida-initial-source-');
      const childFixture =
        path.dirname(owner) === realpathSync(tmpdir()) &&
        path.basename(owner).startsWith('vida-initial-source-owned-') &&
        path.basename(root).startsWith('case-');
      if (
        root !== path.resolve(input.repositoryRoot) ||
        !lstatSync(root).isDirectory() ||
        (!directFixture && !childFixture) ||
        !/^initial-[0-9a-f-]{36}$/u.test(input.workId) ||
        !/^[a-f0-9]{64}$/u.test(input.actionId) ||
        input.stageId !== 'develop_task'
      )
        throw new Error('phase fixture identity is not a fresh owned Initial Source fixture');
      // Opt-in Cloud diagnostic: pin the checked directory instead of reopening its name.
      if (process.platform !== 'linux') throw new Error('phase directory pin requires Linux');
      const parentDescriptor = openSync(parent, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      try {
        const pinned = fstatSync(parentDescriptor);
        if (pinned.dev !== parentStats.dev || pinned.ino !== parentStats.ino)
          throw new Error('phase output parent identity changed');
        descriptor = openSync('/proc/self/fd/' + parentDescriptor + '/' + path.basename(file), 'wx', 0o600);
      } finally {
        closeSync(parentDescriptor);
      }
      fileIdentity = fstatSync(descriptor);
      fixture = { ...input, repositoryRoot: root };
      state = 'armed';
      record({
        phase: 'capture',
        state: 'armed',
        work_id: input.workId,
        action_id: input.actionId,
        monotonic_ns: process.hrtime.bigint().toString(),
      });
      return state === 'armed';
    } catch {
      state = 'sink_error';
      disarm();
      return false;
    }
  }

  function disarm(): void {
    fixture = undefined;
    if (state === 'armed') {
      const terminal = pending === 0 ? 'complete' : 'incomplete';
      record({ phase: 'capture', state: terminal, pending, monotonic_ns: process.hrtime.bigint().toString() });
      if (state === 'armed') state = terminal;
    }
    if (descriptor !== undefined) {
      const owned = descriptor;
      descriptor = undefined;
      try {
        closeSync(owned);
      } catch {
        state = 'sink_error';
      }
    }
  }

  function measure<T>(
    phase: InitialSourcePhase,
    root: string,
    workId: string | null,
    stage: string | null,
    operation: () => T,
  ): T {
    const scope = fixture;
    if (
      state !== 'armed' ||
      scope === undefined ||
      root !== scope.repositoryRoot ||
      workId !== scope.workId ||
      (stage !== null && stage !== scope.stageId) ||
      ((phase === 'lease' || phase === 'workflow_reserve') && stage !== scope.stageId)
    )
      return operation();
    const invocation = ++nextInvocation;
    pending++;
    record({
      phase,
      edge: 'start',
      invocation,
      work_id: scope.workId,
      action_id: scope.actionId,
      monotonic_ns: process.hrtime.bigint().toString(),
    });
    const end = (outcome: string) => {
      pending--;
      record({
        phase,
        edge: 'end',
        invocation,
        outcome,
        work_id: scope.workId,
        action_id: scope.actionId,
        monotonic_ns: process.hrtime.bigint().toString(),
      });
    };
    let result: T;
    try {
      result = operation();
    } catch (error) {
      end('rejected');
      throw error;
    }
    if (isPromise(result)) {
      // Observe without replacing the Promise returned by the actual operation.
      try {
        void Promise.prototype.then.call(
          result,
          () => end('resolved'),
          () => end('rejected'),
        );
      } catch {
        state = 'sink_error';
      }
    } else end('returned');
    return result;
  }

  return {
    enabled: Boolean(file),
    arm,
    disarm,
    measure,
    installDelegates(): void {
      installed = true;
    },
    status() {
      return { state, installed, events, bytes };
    },
  };
}
export const initialSourcePhases = createInitialSourcePhaseTiming(process.env.VIDA_INITIAL_SOURCE_PHASE_TIMING_FILE);
