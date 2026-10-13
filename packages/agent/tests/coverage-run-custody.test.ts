import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { executionBudget } from '../bin/bun.ts';
import { expectRejection } from './helpers/expect-rejection.ts';
import { acquireCoverageRunLock, releaseCoverageRunLock } from '../tooling/coverage-run-lock.ts';
import { superviseCoverageProducers } from '../tooling/run-bun-coverage.ts';
import {
  coverageProducerReservationSafeToRelease,
  coverageProducerTerminalKnown,
} from '../tooling/run-bun-coverage.ts';

function fixture(): string {
  return mkdtempSync(path.join(tmpdir(), 'vida-coverage-custody-'));
}

function cleanupAfterPass(root: string, check: () => void): void {
  try {
    check();
  } catch (error) {
    console.warn(`Retained failed coverage custody fixture: ${root}`);
    throw error;
  }
  rmSync(root, { recursive: true, force: true });
}

function producer(shard_id: string, root: string, source: string, maximum_duration_ms?: number) {
  return {
    shard_id,
    args: ['-e', source],
    cwd: root,
    env: { ...process.env, BUN_OPTIONS: '' },
    ...(maximum_duration_ms === undefined ? {} : { maximum_duration_ms }),
  };
}

async function waitFor(check: () => boolean, timeoutMs = 1_500): Promise<void> {
  const deadline = performance.now() + timeoutMs;
  while (!check()) {
    if (performance.now() >= deadline) throw new Error('Timed out waiting for native producer handshake.');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function readMarker(root: string, name: string): string {
  return readFileSync(path.join(root, name), 'utf8');
}

test('supervisor accounts for every prepared native producer', async () => {
  const root = fixture();
  let passed = false;
  try {
    // This count assertion is intentionally first: the public stub returns no outcomes.
    const group = await superviseCoverageProducers(
      [producer('one', root, 'process.exit(0);'), producer('two', root, 'process.exit(0);')],
      executionBudget(4_000, 250),
    );
    expect(group.outcomes).toHaveLength(2);
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.warn(`Retained failed coverage custody fixture: ${root}`);
  }
});

test('supervisor rejects invalid group descriptors before any native launch', async () => {
  const root = fixture();
  let passed = false;
  try {
    const launch = producer('one', root, "require('node:fs').writeFileSync('unexpected.marker', 'launched')");
    let logFdReads = 0;
    const changingLogFd = {
      ...launch,
      shard_id: 'changing-log-fd',
      get log_fd() {
        return ++logFdReads <= 3 ? 0 : -1;
      },
    };
    for (const launches of [
      [],
      [launch, launch],
      [launch, { ...launch, shard_id: 'two' }, { ...launch, shard_id: 'three' }],
      [launch, { ...launch, shard_id: 'bad-limit', maximum_duration_ms: 0 }],
      [launch, { ...launch, shard_id: 'negative-log-fd', log_fd: -1 }],
      [launch, { ...launch, shard_id: 'fractional-log-fd', log_fd: 0.5 }],
      [launch, { ...launch, shard_id: 'unsafe-log-fd', log_fd: Number.MAX_SAFE_INTEGER + 1 }],
      [launch, changingLogFd],
    ]) {
      await expectRejection(
        superviseCoverageProducers(launches, executionBudget(1_000, 100)),
        /Invalid coverage producer/,
      );
      expect(existsSync(path.join(root, 'unexpected.marker'))).toBe(false);
    }
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.warn(`Retained failed coverage custody fixture: ${root}`);
  }
});

test('native producers overlap after a parent handshake and report exact terminal outcomes', async () => {
  const root = fixture();
  let passed = false;
  try {
    const gate = path.join(root, 'release');
    const source = (id: string, status: number) => `
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const root = ${JSON.stringify(root)};
writeFileSync(path.join(root, '${id}.ready'), String(process.pid));
while (!existsSync(path.join(root, 'release'))) await Bun.sleep(5);
writeFileSync(path.join(root, '${id}.done'), String(process.pid));
process.exit(${status});
`;
    const launches = [producer('pass', root, source('pass', 0)), producer('fail', root, source('fail', 7))];
    const pending = superviseCoverageProducers(launches, executionBudget(4_500, 300));
    await waitFor(() => existsSync(path.join(root, 'pass.ready')) && existsSync(path.join(root, 'fail.ready')));
    const passPid = Number(readMarker(root, 'pass.ready'));
    const failPid = Number(readMarker(root, 'fail.ready'));
    expect(passPid).toBeGreaterThan(0);
    expect(failPid).toBeGreaterThan(0);
    expect(passPid).not.toBe(failPid);
    writeFileSync(gate, 'go');
    const group = await pending;
    expect(existsSync(path.join(root, 'pass.done'))).toBe(true);
    expect(existsSync(path.join(root, 'fail.done'))).toBe(true);
    expect(group.outcomes).toEqual([
      expect.objectContaining({
        shard_id: 'pass',
        status: 0,
        signal: null,
        error: null,
        unknown: false,
        producer_pid: passPid,
        producerTerminalKnown: true,
        directProducerAccounted: true,
        resourceSafeToAdvance: false,
      }),
      expect.objectContaining({
        shard_id: 'fail',
        status: 7,
        signal: null,
        error: null,
        unknown: false,
        producer_pid: failPid,
        producerTerminalKnown: true,
        directProducerAccounted: true,
        resourceSafeToAdvance: false,
      }),
    ]);
    expect(group.reservationSafeToRelease).toBe(true);
    expect(group.resourceSafeToAdvance).toBe(false);
    passed = true;
  } finally {
    if (passed) rmSync(root, { recursive: true, force: true });
    else console.warn(`Retained failed coverage custody fixture: ${root}`);
  }
});

test('a timed out producer stays accounted alongside a held sibling', async () => {
  const root = fixture();
  let passed = false;
  try {
    const gate = path.join(root, 'release-sibling');
    const held = `import { existsSync, writeFileSync } from 'node:fs'; import path from 'node:path'; const root=${JSON.stringify(root)}; writeFileSync(path.join(root,'held.ready'),String(process.pid)); while(!existsSync(path.join(root,'release-sibling'))) await Bun.sleep(5); writeFileSync(path.join(root,'held.done'),'done');`;
    const timeout = `import { writeFileSync } from 'node:fs'; import path from 'node:path'; writeFileSync(path.join(${JSON.stringify(root)},'timeout.ready'),String(process.pid)); await Bun.sleep(1000);`;
    const pending = superviseCoverageProducers(
      [producer('timeout', root, timeout, 100), producer('held', root, held)],
      executionBudget(4_500, 300),
    );
    await waitFor(() => existsSync(path.join(root, 'timeout.ready')) && existsSync(path.join(root, 'held.ready')));
    await new Promise((resolve) => setTimeout(resolve, 250));
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(settled).toBe(false);
    expect(existsSync(path.join(root, 'held.done'))).toBe(false);
    writeFileSync(gate, 'go');
    const group = await pending;
    expect(group.outcomes).toHaveLength(2);
    expect(group.outcomes.find(({ shard_id }) => shard_id === 'timeout')).toMatchObject({
      shard_id: 'timeout',
      status: null,
      signal: 'SIGKILL',
      unknown: true,
      producer_pid: Number(readMarker(root, 'timeout.ready')),
      producerTerminalKnown: true,
      directProducerAccounted: true,
      resourceSafeToAdvance: false,
    });
    expect(group.outcomes.find(({ shard_id }) => shard_id === 'held')).toMatchObject({
      status: 0,
      unknown: false,
      producerTerminalKnown: true,
      directProducerAccounted: true,
    });
    expect(existsSync(path.join(root, 'held.done'))).toBe(true);
    expect(group.reservationSafeToRelease).toBe(true);
    expect(group.resourceSafeToAdvance).toBe(false);
    passed = true;
  } finally {
    if (!passed) console.warn(`Retained failed coverage custody fixture: ${root}`);
  }
});

test('a real signal termination is terminal but never proves resource safety', async () => {
  const root = fixture();
  let passed = false;
  try {
    const script = `import { writeFileSync } from 'node:fs'; import path from 'node:path'; writeFileSync(path.join(${JSON.stringify(root)},'signal.pid'),String(process.pid)); process.kill(process.pid,'SIGTERM');`;
    const group = await superviseCoverageProducers([producer('signaled', root, script)], executionBudget(4_000, 250));
    const pid = Number(readMarker(root, 'signal.pid'));
    expect(pid).toBeGreaterThan(0);
    expect(group.outcomes).toHaveLength(1);
    expect(group.outcomes[0]).toMatchObject({
      status: null,
      signal: 'SIGTERM',
      unknown: true,
      producer_pid: pid,
      producerTerminalKnown: true,
      directProducerAccounted: true,
      resourceSafeToAdvance: false,
    });
    expect(group.reservationSafeToRelease).toBe(true);
    expect(group.resourceSafeToAdvance).toBe(false);
    passed = true;
  } finally {
    if (!passed) console.warn(`Retained failed coverage custody fixture: ${root}`);
  }
});

test('live bounded grandchild keeps resource disposition unknown after its producer exits', async () => {
  const root = fixture();
  let passed = false;
  try {
    const child = `import { spawn } from 'node:child_process'; import { existsSync, writeFileSync } from 'node:fs'; import path from 'node:path'; const root=${JSON.stringify(root)}; const ready=path.join(root,'grandchild.ready'); const gate=path.join(root,'grandchild.release'); const done=path.join(root,'grandchild.done'); const code=\`const fs=require('node:fs'); const path=require('node:path'); const ready=\${JSON.stringify(path.join(root,'grandchild.ready'))}; const gate=\${JSON.stringify(path.join(root,'grandchild.release'))}; const done=\${JSON.stringify(path.join(root,'grandchild.done'))}; fs.writeFileSync(ready,'ready'); const deadline=Date.now()+1200; const tick=()=>{if(fs.existsSync(gate)||Date.now()>=deadline){fs.writeFileSync(done,'done');return;} setTimeout(tick,5);}; tick();\`; const grandchild=spawn(process.execPath,['-e',code],{stdio:'ignore',env:{...process.env,BUN_OPTIONS:''}}); grandchild.unref(); writeFileSync(path.join(root,'grandchild.pid'),String(grandchild.pid)); while(!existsSync(ready)) await Bun.sleep(5);`;
    const group = await superviseCoverageProducers([producer('parent', root, child)], executionBudget(4_000, 250));
    expect(group.outcomes).toHaveLength(1);
    expect(group.outcomes[0]).toMatchObject({
      status: 0,
      producerTerminalKnown: true,
      directProducerAccounted: true,
      resourceSafeToAdvance: false,
    });
    expect(group.resourceSafeToAdvance).toBe(false);
    expect(existsSync(path.join(root, 'grandchild.ready'))).toBe(true);
    expect(existsSync(path.join(root, 'grandchild.done'))).toBe(false);
    writeFileSync(path.join(root, 'grandchild.release'), 'go');
    await waitFor(() => existsSync(path.join(root, 'grandchild.done')), 1_500);
    passed = true;
  } finally {
    if (!passed) console.warn(`Retained failed coverage custody fixture: ${root}`);
  }
});

test('an exhausted shared budget records unattempted launches without creating markers', async () => {
  const root = fixture();
  let passed = false;
  try {
    const launches = [
      producer(
        'never-one',
        root,
        `import { writeFileSync } from 'node:fs'; writeFileSync('never-one.marker','launched')`,
      ),
      producer(
        'never-two',
        root,
        `import { writeFileSync } from 'node:fs'; writeFileSync('never-two.marker','launched')`,
      ),
    ];
    const group = await superviseCoverageProducers(launches, executionBudget(1_000, 0, performance.now() - 1));
    expect(group.outcomes).toHaveLength(2);
    expect(
      group.outcomes.every(
        (outcome) =>
          outcome.unknown &&
          !outcome.producerTerminalKnown &&
          !outcome.directProducerAccounted &&
          !outcome.launch_attempted &&
          outcome.producer_pid === null,
      ),
    ).toBe(true);
    expect(existsSync(path.join(root, 'never-one.marker'))).toBe(false);
    expect(existsSync(path.join(root, 'never-two.marker'))).toBe(false);
    expect(group.reservationSafeToRelease).toBe(true);
    expect(group.resourceSafeToAdvance).toBe(false);
    passed = true;
  } finally {
    if (!passed) console.warn(`Retained failed coverage custody fixture: ${root}`);
  }
});

test('an async missing cwd remains UNKNOWN and a held sibling must terminate before disposition', async () => {
  const root = fixture();
  let passed = false;
  try {
    const gate = path.join(root, 'release-sibling');
    const held = `import { existsSync, writeFileSync } from 'node:fs'; import path from 'node:path'; const root=${JSON.stringify(root)}; writeFileSync(path.join(root,'sibling.ready'),String(process.pid)); while(!existsSync(path.join(root,'release-sibling'))) await Bun.sleep(5); writeFileSync(path.join(root,'sibling.done'),'done');`;
    const missing = { ...producer('missing', root, 'process.exit(0);'), cwd: path.join(root, 'absent-cwd') };
    const pending = superviseCoverageProducers([missing, producer('sibling', root, held)], executionBudget(4_500, 300));
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    await waitFor(() => existsSync(path.join(root, 'sibling.ready')));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(settled).toBe(false);
    expect(existsSync(path.join(root, 'sibling.done'))).toBe(false);
    writeFileSync(gate, 'go');
    const group = await pending;
    expect(group.outcomes).toHaveLength(2);
    expect(group.outcomes.find(({ shard_id }) => shard_id === 'missing')).toMatchObject({
      status: -2,
      signal: null,
      unknown: true,
      producer_pid: null,
      launch_attempted: true,
      producerTerminalKnown: false,
      directProducerAccounted: false,
      resourceSafeToAdvance: false,
    });
    expect(group.outcomes.find(({ shard_id }) => shard_id === 'missing')?.error).toContain('ENOENT');
    expect(group.outcomes.find(({ shard_id }) => shard_id === 'sibling')).toMatchObject({
      status: 0,
      unknown: false,
      producerTerminalKnown: true,
      directProducerAccounted: true,
    });
    expect(existsSync(path.join(root, 'sibling.done'))).toBe(true);
    expect(group.reservationSafeToRelease).toBe(false);
    expect(group.resourceSafeToAdvance).toBe(false);
    passed = true;
  } finally {
    if (!passed) console.warn(`Retained failed coverage custody fixture: ${root}`);
  }
});

test('coverage producer termination stays separate from result success and unobserved children', () => {
  expect(coverageProducerTerminalKnown({ pid: 1, status: 0, signal: null })).toBe(true);
  expect(coverageProducerTerminalKnown({ pid: 1, status: 1, signal: null })).toBe(true);
  expect(coverageProducerTerminalKnown({ pid: 1, status: null, signal: 'SIGTERM' })).toBe(true);
  expect(coverageProducerTerminalKnown({ pid: 1, status: null, signal: 'SIGKILL' })).toBe(true);
  expect(coverageProducerTerminalKnown({ pid: 1, status: null, signal: null })).toBe(false);
  expect(coverageProducerTerminalKnown({ pid: 0, status: null, signal: null })).toBe(false);
  expect(coverageProducerTerminalKnown({ pid: -1, status: 0, signal: null })).toBe(false);
  expect(coverageProducerTerminalKnown({ pid: NaN, status: 0, signal: null })).toBe(false);
});

test('only a qualified explicit not-started spawn failure may release producer reservation', () => {
  const missing = spawnSync(path.join(tmpdir(), 'vida-coverage-custody-missing-executable-v937'), [], {
    encoding: 'utf8',
  });
  expect(missing.pid).toBe(0);
  expect(missing.status).toBeNull();
  expect(missing.signal).toBeNull();
  expect(missing.error && 'code' in missing.error ? missing.error.code : undefined).toBe('ENOENT');
  expect(coverageProducerTerminalKnown(missing)).toBe(false);
  expect(coverageProducerReservationSafeToRelease(missing)).toBe(true);

  expect(coverageProducerReservationSafeToRelease({ pid: 0, status: null, signal: null })).toBe(false);
  expect(
    coverageProducerReservationSafeToRelease({
      pid: 0,
      status: null,
      signal: null,
      error: Object.assign(new Error('permission denied'), { code: 'EACCES' }),
    }),
  ).toBe(false);
  expect(
    coverageProducerReservationSafeToRelease({
      pid: 0,
      status: null,
      signal: null,
      error: Object.assign(new Error('buffer limit'), { code: 'ENOBUFS' }),
    }),
  ).toBe(false);
  expect(
    coverageProducerReservationSafeToRelease({
      pid: 0,
      status: null,
      signal: null,
      error: Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }),
    }),
  ).toBe(false);
  expect(
    coverageProducerReservationSafeToRelease({
      pid: -1,
      status: null,
      signal: null,
      error: Object.assign(new Error('missing executable'), { code: 'ENOENT' }),
    }),
  ).toBe(false);
  expect(
    coverageProducerReservationSafeToRelease({
      pid: 0,
      status: 1,
      signal: null,
      error: Object.assign(new Error('missing executable'), { code: 'ENOENT' }),
    }),
  ).toBe(false);
});

test('a qualified not-started result releases only its exact owned coverage reservation', () => {
  const outputRoot = fixture();
  cleanupAfterPass(outputRoot, () => {
    const owned = acquireCoverageRunLock(outputRoot);
    const missing = spawnSync(path.join(outputRoot, 'missing-executable'), [], { encoding: 'utf8' });
    expect(coverageProducerReservationSafeToRelease(missing)).toBe(true);
    expect(releaseCoverageRunLock(owned)).toBe(true);

    const replacementOwner = acquireCoverageRunLock(outputRoot);
    const foreignBytes = Buffer.from('replacement owner custody\n');
    const lockPath = path.join(outputRoot, 'coverage-run.lock');
    const replacedPath = path.join(outputRoot, 'replacement-lock');
    renameSync(lockPath, replacedPath);
    writeFileSync(lockPath, foreignBytes);
    expect(() => releaseCoverageRunLock(replacementOwner)).toThrow(/no longer identifies the owned lock/);
    expect(readFileSync(lockPath)).toEqual(foreignBytes);
  });
});

test('a foreign coverage lock denies acquisition without changing report, staging bytes, or lock custody', () => {
  const outputRoot = fixture();
  cleanupAfterPass(outputRoot, () => {
    const report = path.join(outputRoot, 'coverage-final.json');
    const staging = path.join(outputRoot, '.coverage-final-foreign.staging.json');
    const lockPath = path.join(outputRoot, 'coverage-run.lock');
    const reportBytes = Buffer.from('trusted report bytes\n');
    const stagingBytes = Buffer.from('foreign staging bytes\n');
    const lockBytes = Buffer.from('{"run_id":"foreign"}\n');
    writeFileSync(report, reportBytes);
    writeFileSync(staging, stagingBytes);
    writeFileSync(lockPath, lockBytes);

    expect(() => acquireCoverageRunLock(outputRoot)).toThrow(/already locked/);

    expect(readFileSync(report)).toEqual(reportBytes);
    expect(readFileSync(staging)).toEqual(stagingBytes);
    expect(readFileSync(lockPath)).toEqual(lockBytes);
    expect(existsSync(path.join(outputRoot, 'runs'))).toBe(false);
  });
});

test('coverage lock acquisition owns a private lock file that its exact handle can release', () => {
  const outputRoot = fixture();
  cleanupAfterPass(outputRoot, () => {
    const lock = acquireCoverageRunLock(outputRoot);
    const lockPath = path.join(outputRoot, 'coverage-run.lock');
    const bytes = readFileSync(lockPath, 'utf8');
    const record: unknown = JSON.parse(bytes);
    expect(record).toMatchObject({ schema: 'VidaBunCoverageLock/v1', pid: process.pid });
    expect(bytes.endsWith('\n')).toBe(true);
    if (process.platform !== 'win32') expect(lstatSync(lockPath).mode & 0o777).toBe(0o600);
    expect(releaseCoverageRunLock(lock)).toBe(true);
    expect(existsSync(lockPath)).toBe(false);
    expect(releaseCoverageRunLock(lock)).toBe(false);
  });
});

test.each(['file', 'directory', 'symlink'] as const)('release preserves a replaced %s lock path', (replacement) => {
  const outputRoot = fixture();
  cleanupAfterPass(outputRoot, () => {
    const lock = acquireCoverageRunLock(outputRoot);
    const lockPath = path.join(outputRoot, 'coverage-run.lock');
    const originalPath = path.join(outputRoot, 'original-owned-lock');
    renameSync(lockPath, originalPath);
    const replacementBytes = Buffer.from('replacement custody\n');
    const targetPath = path.join(outputRoot, 'replacement-target');
    if (replacement === 'file') writeFileSync(lockPath, replacementBytes);
    else if (replacement === 'directory') mkdirSync(lockPath);
    else {
      writeFileSync(targetPath, replacementBytes);
      // A relative target keeps the fixture portable across temporary root locations.
      symlinkSync(path.basename(targetPath), lockPath);
    }

    expect(() => releaseCoverageRunLock(lock)).toThrow(/no longer identifies the owned lock/);
    expect(readFileSync(originalPath, 'utf8')).toContain('VidaBunCoverageLock/v1');
    if (replacement === 'file') expect(readFileSync(lockPath)).toEqual(replacementBytes);
    else if (replacement === 'directory') expect(lstatSync(lockPath).isDirectory()).toBe(true);
    else {
      expect(lstatSync(lockPath).isSymbolicLink()).toBe(true);
      expect(readFileSync(targetPath)).toEqual(replacementBytes);
    }
  });
});
