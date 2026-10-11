import { expect, test } from 'bun:test';
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
import { acquireCoverageRunLock, releaseCoverageRunLock } from '../tooling/coverage-run-lock.ts';
import { coverageProducerTerminalKnown } from '../tooling/run-bun-coverage.ts';

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
