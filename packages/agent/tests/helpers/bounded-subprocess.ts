import { spawn, type ChildProcess } from 'node:child_process';
import { write } from 'node:fs';

export interface RunBoundedSubprocessOptions {
  timeoutMs?: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  stdoutLimitBytes?: number;
  stderrLimitBytes?: number;
  terminateOnOutputLimit?: boolean;
  /** Diagnostic-only tee of captured stderr, using the same byte budget. */
  forwardStderrProgress?: boolean;
}

interface OutputState {
  bytes: number;
  truncated: boolean;
}
interface SubprocessCompletion {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
}
export interface BoundedSubprocessResult extends SubprocessCompletion {
  /** Only the direct child's close event establishes a terminal observation. */
  closeObserved: boolean;
  childError: string | null;
  stdout: Buffer;
  stderr: Buffer;
  stdoutTruncated: boolean;
  stderrTruncated: boolean;
  pid: number | undefined;
  timedOut: boolean;
  diagnostic: string;
  /** Confirms only the termination request, not that every group member is gone. */
  terminationRequestConfirmed: boolean | null;
  terminationError: string | null;
  stderrForwardingError: string | null;
}

interface TerminationRequest {
  confirmed: boolean;
  error: string | null;
}

const OUTPUT_LIMIT = 64 * 1024;

function append(chunks: Buffer[], chunk: Uint8Array, state: OutputState, limit: number): Buffer | null {
  if (chunk.byteLength > limit - state.bytes) state.truncated = true;
  if (state.bytes >= limit) return null;
  const value = Buffer.from(chunk);
  const remaining = limit - state.bytes;
  const accepted = value.subarray(0, remaining);
  chunks.push(accepted);
  state.bytes += Math.min(value.byteLength, remaining);
  return accepted;
}

async function forwardStderr(chunk: Buffer): Promise<void> {
  // Finish partial writes asynchronously so a stalled sink cannot block the
  // subprocess deadline. The queued bytes share the capture budget.
  let offset = 0;
  while (offset < chunk.byteLength) {
    const written = await new Promise<number>((resolve, reject) => {
      write(2, chunk, offset, chunk.byteLength - offset, (error, bytes) => {
        if (error) reject(error);
        else resolve(bytes);
      });
    });
    if (!Number.isSafeInteger(written) || written <= 0 || written > chunk.byteLength - offset)
      throw new Error('Invalid stderr forwarding write result');
    offset += written;
  }
}

function waitForClose(child: ChildProcess, recordError: (error: Error) => void): Promise<SubprocessCompletion> {
  return new Promise<SubprocessCompletion>((resolve, reject) => {
    child.on('error', (error) => {
      // A live child's error may describe a denied signal or IPC request.
      // Continue observing its close rather than silently releasing custody.
      if (child.pid === undefined) reject(error);
      else recordError(error);
    });
    child.once('close', (exitCode, signal) => resolve({ exitCode, signal }));
  });
}

async function terminateTree(child: ChildProcess, deadlineAt: number): Promise<TerminationRequest> {
  // Descendants may still own the pipes after the direct child has exited.
  if (!child.pid) return { confirmed: false, error: 'Child PID unavailable for termination' };
  if (process.platform === 'win32') {
    return new Promise<TerminationRequest>((resolve) => {
      let killer: ChildProcess;
      try {
        killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
          windowsHide: true,
          stdio: 'ignore',
        });
      } catch (error) {
        resolve({ confirmed: false, error: String(error) });
        return;
      }
      const finish = (result: TerminationRequest): void => {
        clearTimeout(bound);
        killer.unref();
        resolve(result);
      };
      const bound = setTimeout(
        () => {
          let error = 'taskkill result not observed before subprocess deadline';
          try {
            killer.kill('SIGKILL');
          } catch (failure) {
            error += `; taskkill stop request failed: ${String(failure)}`;
          }
          finish({ confirmed: false, error });
        },
        Math.max(0, deadlineAt - performance.now()),
      );
      killer.once('error', (error) => finish({ confirmed: false, error: error.message }));
      killer.once('close', (status, signal) =>
        finish({
          confirmed: status === 0 && signal === null,
          error: status === 0 && signal === null ? null : `taskkill exit=${status} signal=${signal}`,
        }),
      );
    });
  }
  try {
    process.kill(-child.pid, 'SIGKILL');
    return { confirmed: true, error: null };
  } catch (error) {
    let detail = String(error);
    try {
      child.kill('SIGKILL');
    } catch (fallbackError) {
      detail += `; direct-child fallback failed: ${String(fallbackError)}`;
    }
    return { confirmed: false, error: detail };
  }
}

function terminationDiagnostic(request: TerminationRequest | null): string {
  if (request === null) return '';
  return request.confirmed ? 'termination request sent' : `termination request unconfirmed: ${request.error}`;
}

export async function runBoundedSubprocess(
  command: string,
  args: readonly string[],
  options: RunBoundedSubprocessOptions = {},
): Promise<BoundedSubprocessResult> {
  const timeoutMs = options.timeoutMs ?? 120_000;
  const deadlineAt = performance.now() + timeoutMs;
  const stdoutLimit = options.stdoutLimitBytes ?? OUTPUT_LIMIT;
  const stderrLimit = options.stderrLimitBytes ?? OUTPUT_LIMIT;
  for (const limit of [stdoutLimit, stderrLimit])
    if (!Number.isSafeInteger(limit) || limit < 0) throw new RangeError('Invalid subprocess output byte limit');
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    windowsHide: true,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  const stdoutState = { bytes: 0, truncated: false };
  const stderrState = { bytes: 0, truncated: false };
  const terminal: {
    timedOut: boolean;
    termination: Promise<TerminationRequest> | null;
    stderrForwardingError: string | null;
    stderrDrain: Promise<void>;
    forwardedBytes: number;
    settled: boolean;
    childError: string | null;
  } = {
    timedOut: false,
    termination: null,
    stderrForwardingError: null,
    stderrDrain: Promise.resolve(),
    forwardedBytes: 0,
    settled: false,
    childError: null,
  };
  const capture = (chunks: Buffer[], chunk: Uint8Array, state: OutputState, limit: number): Buffer | null => {
    if (terminal.settled) return null;
    const accepted = append(chunks, chunk, state, limit);
    if (options.terminateOnOutputLimit && state.truncated && terminal.termination === null)
      terminal.termination = terminateTree(child, deadlineAt);
    return accepted;
  };
  child.stdout.on('data', (chunk: Uint8Array) => capture(stdout, chunk, stdoutState, stdoutLimit));
  child.stderr.on('data', (chunk: Uint8Array) => {
    const accepted = capture(stderr, chunk, stderrState, stderrLimit);
    if (!options.forwardStderrProgress || accepted === null || terminal.stderrForwardingError !== null) return;
    terminal.stderrDrain = terminal.stderrDrain
      .then(async () => {
        if (terminal.stderrForwardingError !== null || terminal.timedOut || terminal.settled) return;
        await forwardStderr(accepted);
        terminal.forwardedBytes += accepted.byteLength;
      })
      .catch((error: unknown) => {
        if (terminal.settled) return;
        terminal.stderrForwardingError ??= String(error);
        terminal.termination ??= terminateTree(child, deadlineAt);
      });
  });
  const close = waitForClose(child, (error) => {
    if (!terminal.settled) terminal.childError ??= error.message;
  });
  let deadlineReached: () => void = () => {};
  const deadline = new Promise<void>((resolve) => {
    deadlineReached = resolve;
  });
  const timeout = setTimeout(
    () => {
      terminal.timedOut = true;
      if (options.forwardStderrProgress && terminal.forwardedBytes !== stderrState.bytes)
        terminal.stderrForwardingError ??= `stderr forwarding did not drain before ${timeoutMs} ms deadline`;
      terminal.termination ??= terminateTree(child, deadlineAt);
      deadlineReached();
    },
    Math.max(0, deadlineAt - performance.now()),
  );
  let completion;
  let termination: TerminationRequest | null = null;
  try {
    completion = await Promise.race([
      close.then((observed) => ({ ...observed, closeObserved: true })),
      deadline.then(() => ({ exitCode: null, signal: null, closeObserved: false })),
    ]);
    await Promise.race([terminal.stderrDrain, deadline]);
    if (terminal.termination !== null)
      termination = await Promise.race([
        terminal.termination,
        deadline.then(() => ({
          confirmed: false,
          error: 'Termination result not observed before subprocess deadline',
        })),
      ]);
  } finally {
    terminal.settled = true;
    clearTimeout(timeout);
  }
  if (!completion.closeObserved) {
    // Release only our observation handles. This does not establish child or
    // descendant termination; the returned terminal state remains unobserved.
    child.unref();
    child.stdout.destroy();
    child.stderr.destroy();
  }
  const output = {
    stdout: Buffer.concat(stdout),
    stderr: Buffer.concat(stderr),
    stdoutTruncated: stdoutState.truncated,
    stderrTruncated: stderrState.truncated,
  };
  return {
    ...completion,
    ...output,
    pid: child.pid,
    timedOut: terminal.timedOut,
    childError: terminal.childError,
    terminationRequestConfirmed: termination?.confirmed ?? null,
    terminationError: termination?.error ?? null,
    stderrForwardingError: terminal.stderrForwardingError,
    diagnostic: terminal.timedOut
      ? `timed out after ${timeoutMs} ms; ${terminationDiagnostic(termination)}`
      : terminationDiagnostic(termination),
  };
}

export function subprocessFailure(label: string, result: BoundedSubprocessResult): string {
  const output = `${result.stderr.toString()}\n${result.stdout.toString()}`.trim();
  const truncation = result.stdoutTruncated || result.stderrTruncated ? '\noutput truncated' : '';
  const forwarding =
    result.stderrForwardingError === null ? '' : `\nstderr forwarding failed: ${result.stderrForwardingError}`;
  const childError = result.childError === null ? '' : `\nchild error: ${result.childError}`;
  return `${label}: exit=${result.exitCode ?? 'null'} signal=${result.signal ?? 'none'} closeObserved=${result.closeObserved}${
    result.timedOut ? ` ${result.diagnostic}` : ''
  }${truncation}${forwarding}${childError}${output ? `\n${output}` : ''}`;
}
