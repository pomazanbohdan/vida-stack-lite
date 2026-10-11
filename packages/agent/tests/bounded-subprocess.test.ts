import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, spyOn, test } from 'bun:test';
import { runBoundedSubprocess, subprocessFailure } from './helpers/bounded-subprocess.ts';

test('bounded subprocess forwards only the accepted stderr prefix when explicitly enabled', async () => {
  const helper = new URL('./helpers/bounded-subprocess.ts', import.meta.url).href;
  for (const [enabled, limit] of [
    [true, 8],
    [false, 8],
    [true, 0],
  ] as const) {
    const program = `
      import { runBoundedSubprocess } from ${JSON.stringify(helper)};
      const result = await runBoundedSubprocess('node', ['-e', "process.stderr.write('0123456789');"], {
        timeoutMs: 1500, stderrLimitBytes: ${limit}, forwardStderrProgress: ${enabled},
      });
      process.stdout.write(JSON.stringify({
        status: result.exitCode, captured: result.stderr.toString(), truncated: result.stderrTruncated,
        error: result.stderrForwardingError, termination: result.terminationRequestConfirmed,
      }));
    `;
    const result = await runBoundedSubprocess(process.execPath, ['--no-env-file', '--no-install', '-e', program], {
      timeoutMs: 2500,
    });
    assert.equal(result.exitCode, 0, subprocessFailure('stderr forwarding fixture', result));
    assert.equal(result.timedOut, false);
    assert.equal(result.stderr.toString(), enabled ? '0123456789'.slice(0, limit) : '');
    const observed: unknown = JSON.parse(result.stdout.toString());
    assert.deepEqual(observed, {
      status: 0,
      captured: '0123456789'.slice(0, limit),
      truncated: true,
      error: null,
      termination: null,
    });
  }
});

test('bounded subprocess preserves forwarding failure and requests termination of its owned child', async () => {
  const helper = new URL('./helpers/bounded-subprocess.ts', import.meta.url).href;
  const program = `
    import { closeSync } from 'node:fs';
    import { runBoundedSubprocess } from ${JSON.stringify(helper)};
    const pending = runBoundedSubprocess('node', ['-e', "process.stderr.write('progress'); setInterval(() => {}, 1000);"], {
      timeoutMs: 1000, forwardStderrProgress: true,
    });
    closeSync(2);
    const result = await pending;
    process.stdout.write(JSON.stringify({
      timedOut: result.timedOut, captured: result.stderr.toString(), signal: result.signal,
      failed: result.stderrForwardingError?.includes('EBADF') === true,
      termination: result.terminationRequestConfirmed, terminationError: result.terminationError,
    }));
  `;
  const result = await runBoundedSubprocess(process.execPath, ['--no-env-file', '--no-install', '-e', program], {
    timeoutMs: 2500,
  });
  assert.equal(result.exitCode, 0, subprocessFailure('failed stderr forwarding fixture', result));
  assert.equal(result.timedOut, false);
  const observed: unknown = JSON.parse(result.stdout.toString());
  assert.deepEqual(observed, {
    timedOut: false,
    captured: 'progress',
    signal: 'SIGKILL',
    failed: true,
    termination: true,
    terminationError: null,
  });
});

test('bounded subprocess retains its deadline when the diagnostic stderr sink stops draining', async () => {
  const helper = new URL('./helpers/bounded-subprocess.ts', import.meta.url).href;
  const blockedSink = `
    import { runBoundedSubprocess } from ${JSON.stringify(helper)};
    const result = await runBoundedSubprocess('node', ['-e', "process.stderr.write(Buffer.alloc(2 * 1024 * 1024, 'p'));"], {
      timeoutMs: 250, stderrLimitBytes: 2 * 1024 * 1024, forwardStderrProgress: true,
    });
    process.stdout.write(JSON.stringify({
      timedOut: result.timedOut, failed: result.stderrForwardingError?.includes('did not drain') === true,
      captured: result.stderr.byteLength > 8192,
    }));
  `;
  const program = `
    import { spawn } from 'node:child_process';
    const child = spawn(process.execPath, ['--no-env-file', '--no-install', '-e', ${JSON.stringify(blockedSink)}], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    // Deliberately leave only this fresh child's stderr pipe unread.
    let output = '';
    let timedOut = false;
    const bound = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, 1500);
    child.stdout.on('data', (bytes) => {
      output += bytes.toString();
      if (output.endsWith('}')) child.kill('SIGKILL');
    });
    await new Promise((resolve, reject) => { child.once('close', resolve); child.once('error', reject); });
    clearTimeout(bound);
    process.stdout.write(JSON.stringify({ returned: !timedOut, result: output ? JSON.parse(output) : null }));
  `;
  const result = await runBoundedSubprocess(process.execPath, ['--no-env-file', '--no-install', '-e', program], {
    timeoutMs: 2500,
  });
  assert.equal(result.exitCode, 0, subprocessFailure('stalled stderr sink fixture', result));
  assert.equal(result.timedOut, false);
  const observed: unknown = JSON.parse(result.stdout.toString());
  assert.deepEqual(observed, { returned: true, result: { timedOut: true, failed: true, captured: true } });
});

test('bounded subprocess distinguishes unobserved child close from simulated Windows taskkill results at its deadline', async () => {
  const helper = new URL('./helpers/bounded-subprocess.ts', import.meta.url).href;
  for (const confirmed of [false, true]) {
    const program = `
      import { mock } from 'bun:test';
      import * as actualProcess from 'node:child_process';
      import { EventEmitter } from 'node:events';
      const actualSpawn = actualProcess.spawn;
      let ownedChild;
      let requests = 0;
      await mock.module('node:child_process', () => ({
        ...actualProcess,
        spawn(command, args, options) {
          if (command === 'taskkill') {
            requests++;
            const request = new EventEmitter();
            request.kill = () => true;
            request.unref = () => request;
            if (${confirmed}) setImmediate(() => request.emit('close', 0, null));
            return request;
          }
          ownedChild = actualSpawn(command, args, options);
          // Emit a controlled stream event in this platform double. Real
          // stderr capture has separate native controls; Node startup latency
          // must not decide whether this request was issued before deadline.
          setImmediate(() => ownedChild.stderr.emit('data', Buffer.from('overflow')));
          return ownedChild;
        },
      }));
      // This is a platform control in one owned process, not Windows evidence.
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
      const { runBoundedSubprocess } = await import(${JSON.stringify(helper)});
      const result = await runBoundedSubprocess('node', ['-e', "setInterval(() => {}, 1000);"], {
        timeoutMs: 150, stderrLimitBytes: 1, terminateOnOutputLimit: ${confirmed},
      });
      const closed = new Promise((resolve) => ownedChild.once('close', resolve));
      ownedChild.kill('SIGKILL');
      await closed;
      process.stdout.write(JSON.stringify({
        timedOut: result.timedOut, closeObserved: result.closeObserved,
        status: result.exitCode, signal: result.signal, requests,
        confirmed: result.terminationRequestConfirmed, bytes: result.stderr.toString(),
        unobservedRequest: result.terminationError?.includes('not observed') === true,
      }));
    `;
    const result = await runBoundedSubprocess(process.execPath, ['--no-env-file', '--no-install', '-e', program], {
      timeoutMs: 1500,
    });
    assert.equal(result.timedOut, false, subprocessFailure('simulated Windows terminal deadline', result));
    assert.equal(result.exitCode, 0);
    const observed: unknown = JSON.parse(result.stdout.toString());
    assert.deepEqual(observed, {
      timedOut: true,
      closeObserved: false,
      status: null,
      signal: null,
      requests: 1,
      confirmed,
      bytes: 'o',
      unobservedRequest: !confirmed,
    });
  }
});

const roots: string[] = [];
test('bounded subprocess retains a live-child error until its bounded terminal observation', async () => {
  const helper = new URL('./helpers/bounded-subprocess.ts', import.meta.url).href;
  const program = `
    import { mock } from 'bun:test';
    import * as actualProcess from 'node:child_process';
    const actualSpawn = actualProcess.spawn;
    mock.module('node:child_process', () => ({ ...actualProcess, spawn(command, args, options) {
      const child = actualSpawn(command, args, options);
      process.stderr.write('owned live-child PID=' + child.pid + '\\n');
      setTimeout(() => child.emit('error', new Error('owned live-child termination denied')), 20);
      return child;
    }}));
    const { runBoundedSubprocess } = await import(${JSON.stringify(helper)});
    const result = await runBoundedSubprocess('node', ['-e', 'setInterval(() => {}, 1000)'], { timeoutMs: 100 });
    process.stdout.write(JSON.stringify({ timedOut: result.timedOut, closeObserved: result.closeObserved,
      status: result.exitCode, error: result.childError, requested: result.terminationRequestConfirmed }));
  `;
  const result = await runBoundedSubprocess(process.execPath, ['--no-env-file', '--no-install', '-e', program], {
    timeoutMs: 1500,
  });
  assert.equal(result.exitCode, 0, subprocessFailure('live-child error fixture', result));
  assert.equal(result.timedOut, false);
  const observed: unknown = JSON.parse(result.stdout.toString());
  assert.deepEqual(observed, {
    timedOut: true,
    closeObserved: false,
    status: null,
    error: 'owned live-child termination denied',
    requested: true,
  });
});
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test.each([0, 1, 64 * 1024])('bounded subprocess preserves complete %i-byte output', async (size) => {
  const program = `
    const value = Buffer.alloc(${size}, 'a');
    process.stdout.write(value);
    process.stderr.write(value);
  `;
  const result = await runBoundedSubprocess('node', ['-e', program], { timeoutMs: 5000 });
  assert.equal(result.exitCode, 0);
  assert.equal(result.closeObserved, true);
  assert.equal(result.signal, null);
  assert.equal(result.timedOut, false);
  assert.deepEqual(result.stdout, Buffer.alloc(size, 'a'));
  assert.deepEqual(result.stderr, Buffer.alloc(size, 'a'));
  assert.equal(result.stdoutTruncated, false);
  assert.equal(result.stderrTruncated, false);
});

test('bounded subprocess records bytes discarded after an exact output-limit boundary', async () => {
  const program = `
    const boundary = Buffer.alloc(64 * 1024, 'a');
    process.stdout.write(boundary);
    process.stderr.write(boundary);
    setTimeout(() => {
      process.stdout.write('discarded');
      process.stderr.write('discarded');
    }, 100);
  `;
  const result = await runBoundedSubprocess('node', ['-e', program], { timeoutMs: 5000 });
  assert.equal(result.exitCode, 0);
  assert.equal(result.signal, null);
  assert.equal(result.timedOut, false);
  assert.deepEqual(result.stdout, Buffer.alloc(64 * 1024, 'a'));
  assert.deepEqual(result.stderr, Buffer.alloc(64 * 1024, 'a'));
  assert.equal(result.stdoutTruncated, true);
  assert.equal(result.stderrTruncated, true);
});

test('bounded subprocess terminates the full child tree and returns actionable timeout diagnostics', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'vida-subprocess-'));
  roots.push(root);
  const marker = path.join(root, 'grandchild-survived.txt');
  const grandchild = `setTimeout(() => require('node:fs').writeFileSync(process.argv[1], 'survived'), 3000)`;
  const parent = `require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(
    grandchild,
  )}, ${JSON.stringify(marker)}], { stdio: 'ignore' }); setInterval(() => {}, 1000);`;
  const result = await runBoundedSubprocess('node', ['-e', parent], { timeoutMs: 750 });
  assert.equal(result.timedOut, true);
  assert.equal(result.terminationRequestConfirmed, true);
  assert.equal(result.terminationError, null);
  assert.match(result.diagnostic, /termination request sent/);
  await new Promise((resolve) => setTimeout(resolve, 3500));
  assert.equal(existsSync(marker), false, subprocessFailure('child-tree cleanup', result));
});

test.skipIf(process.platform === 'win32')(
  'bounded subprocess kills the detached process group after its direct child exits',
  async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'vida-subprocess-exited-parent-'));
    roots.push(root);
    const marker = path.join(root, 'grandchild-finished.txt');
    const naturalExitMs = 1200;
    const grandchild = `
      const fs = require('node:fs');
      process.stdout.write('grandchild-started\\n');
      setTimeout(() => {
        fs.writeFileSync(process.argv[1], 'finished');
        process.stdout.write('grandchild-finished\\n');
      }, ${naturalExitMs});
    `;
    const parent = `
      const child = require('node:child_process').spawn(
        process.execPath,
        ['-e', ${JSON.stringify(grandchild)}, ${JSON.stringify(marker)}],
        { stdio: 'inherit' },
      );
      child.unref();
      process.exit(0);
    `;
    const timeoutMs = 300;
    const startedAt = Date.now();
    const result = await runBoundedSubprocess('node', ['-e', parent], { timeoutMs });
    const elapsedMs = Date.now() - startedAt;

    assert.equal(result.timedOut, true, subprocessFailure('exited-parent process-group timeout', result));
    assert.equal(result.terminationRequestConfirmed, true);
    assert.match(result.diagnostic, /termination request sent/);
    assert.match(result.stdout.toString(), /grandchild-started/);
    assert.ok(elapsedMs < 900, `process-group timeout took ${elapsedMs} ms`);
    await new Promise((resolve) => setTimeout(resolve, naturalExitMs + 100));
    assert.equal(existsSync(marker), false, subprocessFailure('exited-parent descendant cleanup', result));
    assert.doesNotMatch(result.stdout.toString(), /grandchild-finished/);
  },
);

test('bounded subprocess preserves configured large stdout and independently caps stderr', async () => {
  const stdoutBytes = 8 * 1024 * 1024;
  const stdoutLimitBytes = stdoutBytes + 1;
  const stderrBytes = 257;
  const stderrLimitBytes = 19;
  const program = `
    process.stdout.write(Buffer.alloc(${stdoutBytes}, 'o'));
    process.stdout.write('\\n');
    process.stderr.write(Buffer.alloc(${stderrBytes}, 'e'));
  `;
  const result = await runBoundedSubprocess('node', ['-e', program], {
    timeoutMs: 5000,
    stdoutLimitBytes,
    stderrLimitBytes,
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.signal, null);
  assert.equal(result.timedOut, false);
  assert.deepEqual(result.stdout, Buffer.concat([Buffer.alloc(stdoutBytes, 'o'), Buffer.from('\n')]));
  assert.deepEqual(result.stderr, Buffer.alloc(stderrLimitBytes, 'e'));
  assert.equal(result.stdoutTruncated, false);
  assert.equal(result.stderrTruncated, true);
});

test.skipIf(process.platform === 'win32')(
  'bounded subprocess output overflow kills a detached descendant after the direct child exits',
  async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), 'vida-subprocess-output-limit-'));
    roots.push(root);
    const marker = path.join(root, 'descendant-finished.txt');
    const naturalExitMs = 1000;
    const grandchild = `
      setTimeout(() => process.stdout.write('overflow beyond eight bytes'), 100);
      setTimeout(() => require('node:fs').writeFileSync(process.argv[1], 'finished'), ${naturalExitMs});
    `;
    const parent = `
      const child = require('node:child_process').spawn(
        process.execPath,
        ['-e', ${JSON.stringify(grandchild)}, ${JSON.stringify(marker)}],
        { stdio: 'inherit' },
      );
      child.unref();
      process.exit(0);
    `;
    const result = await runBoundedSubprocess('node', ['-e', parent], {
      timeoutMs: 1800,
      stdoutLimitBytes: 8,
      stderrLimitBytes: 32,
      terminateOnOutputLimit: true,
    });

    assert.equal(result.timedOut, false);
    assert.equal(result.stdoutTruncated, true);
    assert.equal(result.exitCode, 0);
    await new Promise((resolve) => setTimeout(resolve, naturalExitMs + 100));
    assert.equal(existsSync(marker), false, subprocessFailure('output-limit descendant cleanup', result));
  },
);

test('bounded subprocess rejects invalid per-stream limits before any spawn', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'vida-subprocess-invalid-limit-'));
  roots.push(root);
  const invalidLimits = [
    ['stdoutLimitBytes', -1],
    ['stdoutLimitBytes', 1.5],
    ['stdoutLimitBytes', Number.NaN],
    ['stdoutLimitBytes', Number.POSITIVE_INFINITY],
    ['stdoutLimitBytes', Number.MAX_SAFE_INTEGER + 1],
    ['stderrLimitBytes', -1],
    ['stderrLimitBytes', 1.5],
    ['stderrLimitBytes', Number.NaN],
    ['stderrLimitBytes', Number.POSITIVE_INFINITY],
    ['stderrLimitBytes', Number.MAX_SAFE_INTEGER + 1],
  ] as const;
  for (const [index, [option, value]] of invalidLimits.entries()) {
    const marker = path.join(root, `spawned-${index}.txt`);
    const program = `require('node:fs').writeFileSync(process.argv[1], 'spawned')`;
    await assert.rejects(runBoundedSubprocess('node', ['-e', program, marker], { timeoutMs: 5000, [option]: value }), {
      name: 'RangeError',
      message: 'Invalid subprocess output byte limit',
    });
    assert.equal(existsSync(marker), false, `${option}=${String(value)} must be rejected before spawn`);
  }
});

test('bounded subprocess retains no output under explicit zero-byte budgets', async () => {
  const result = await runBoundedSubprocess('node', ['-e', "process.stdout.write('x'); process.stderr.write('y');"], {
    timeoutMs: 5000,
    stdoutLimitBytes: 0,
    stderrLimitBytes: 0,
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.timedOut, false);
  assert.equal(result.stdout.byteLength, 0);
  assert.equal(result.stderr.byteLength, 0);
  assert.equal(result.stdoutTruncated, true);
  assert.equal(result.stderrTruncated, true);
});

test.skipIf(process.platform === 'win32')(
  'bounded subprocess reports an unconfirmed group termination request without claiming tree cleanup',
  async () => {
    const grandchild = "setTimeout(() => process.stdout.write('descendant-finished'), 600)";
    const parent = `
      const child = require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(grandchild)}], { stdio: 'inherit' });
      child.unref();
      process.exit(0);
    `;
    const originalKill = process.kill.bind(process);
    const kill = spyOn(process, 'kill').mockImplementation((...args: Parameters<typeof process.kill>) => {
      if (args[0] < 0 && args[1] === 'SIGKILL')
        throw Object.assign(new Error('group signal denied'), { code: 'EPERM' });
      return originalKill(...args);
    });
    try {
      const result = await runBoundedSubprocess('node', ['-e', parent], { timeoutMs: 150 });
      assert.equal(result.timedOut, true);
      assert.equal(result.terminationRequestConfirmed, false);
      assert.match(result.terminationError ?? '', /group signal denied/);
      assert.equal(result.closeObserved, false);
      assert.equal(result.exitCode, null);
      assert.equal(result.signal, null);
      assert.doesNotMatch(result.stdout.toString(), /descendant-finished/);
      assert.match(result.diagnostic, /termination request unconfirmed/);
      assert.doesNotMatch(result.diagnostic, /terminated the child process tree/);
      // The denied group request leaves this owned descendant running. Wait
      // for its bounded natural exit without accepting late bytes as proof.
      await new Promise((resolve) => setTimeout(resolve, 700));
      assert.doesNotMatch(result.stdout.toString(), /descendant-finished/);
    } finally {
      kill.mockRestore();
    }
  },
);
