import { spawn } from 'node:child_process';

const OUTPUT_LIMIT = 64 * 1024;

function append(chunks, chunk, state) {
  if (state.bytes >= OUTPUT_LIMIT) return;
  const value = Buffer.from(chunk);
  const remaining = OUTPUT_LIMIT - state.bytes;
  chunks.push(value.subarray(0, remaining));
  state.bytes += Math.min(value.byteLength, remaining);
  if (value.byteLength > remaining) state.truncated = true;
}

function waitForClose(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (exitCode, signal) => resolve({ exitCode, signal }));
  });
}

async function terminateTree(child) {
  if (!child.pid || child.exitCode !== null) return false;
  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
      });
      killer.once('error', resolve);
      killer.once('close', resolve);
    });
    return true;
  }
  try {
    process.kill(-child.pid, 'SIGKILL');
    return true;
  } catch {
    child.kill('SIGKILL');
    return true;
  }
}

export async function runBoundedSubprocess(command, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 120_000;
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    windowsHide: true,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stdout = [];
  const stderr = [];
  const stdoutState = { bytes: 0, truncated: false };
  const stderrState = { bytes: 0, truncated: false };
  child.stdout.on('data', (chunk) => append(stdout, chunk, stdoutState));
  child.stderr.on('data', (chunk) => append(stderr, chunk, stderrState));
  const close = waitForClose(child);
  let timedOut = false;
  let termination = null;
  const timeout = setTimeout(() => {
    timedOut = true;
    termination = terminateTree(child);
  }, timeoutMs);
  let completion;
  try {
    completion = await close;
  } finally {
    clearTimeout(timeout);
  }
  if (termination) await termination;
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
    timedOut,
    diagnostic: timedOut ? `timed out after ${timeoutMs} ms; terminated the child process tree` : '',
  };
}

export function subprocessFailure(label, result) {
  const output = `${result.stderr}\n${result.stdout}`.trim();
  const truncation = result.stdoutTruncated || result.stderrTruncated ? '\noutput truncated at 64 KiB' : '';
  return `${label}: exit=${result.exitCode ?? 'null'} signal=${result.signal ?? 'none'}${
    result.timedOut ? ` ${result.diagnostic}` : ''
  }${truncation}${output ? `\n${output}` : ''}`;
}
