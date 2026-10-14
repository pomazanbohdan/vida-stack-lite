import { expect, mock, test } from 'bun:test';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { writeDurable } from '../bin/run.ts';
import { readReleaseBytes, releaseJSON, saveReleaseState } from '../bin/local-release-artifacts.ts';

// Bun updates imported module namespaces when a module mock is registered.
const originalFs = Object.freeze({ ...fs });

type FaultCase = {
  readonly name: string;
  readonly bodyCall: 'writeFileSync' | 'fsyncSync';
  readonly bodyError: unknown;
  readonly unlinkError: unknown;
  readonly expectedPending: boolean;
};

function errorCauses(value: unknown, output: unknown[] = []): unknown[] {
  if (value instanceof AggregateError) {
    if (!Array.isArray(value.errors)) throw new Error('aggregate error causes must be an array');
    const nestedErrors: readonly unknown[] = value.errors;
    for (const nested of nestedErrors) errorCauses(nested, output);
  } else {
    output.push(value);
  }
  return output;
}

const faults: readonly FaultCase[] = [
  {
    name: 'preserves undefined write, close, and unlink failures while retaining its pending file',
    bodyCall: 'writeFileSync',
    bodyError: undefined,
    unlinkError: Object.assign(new Error('injected pending unlink failure'), { code: 'EIO' }),
    expectedPending: true,
  },
  {
    name: 'preserves fsync and close failures after successful pending cleanup',
    bodyCall: 'fsyncSync',
    bodyError: Object.assign(new Error('injected controller fsync failure'), { code: 'EIO' }),
    unlinkError: null,
    expectedPending: false,
  },
];

for (const fault of faults) {
  test(`durable controller write ${fault.name}`, async () => {
    const root = originalFs.mkdtempSync(path.join(tmpdir(), 'vida-controller-durable-'));
    console.error(`retained controller durable-write fixture: ${root}`);
    const target = path.join(root, 'controller.json');
    const before = Buffer.from('preexisting controller bytes\n');
    const closeError = Object.assign(new Error('injected controller close failure'), { code: 'EIO' });
    const unlinkError = fault.unlinkError;
    originalFs.writeFileSync(target, before);

    const events: string[] = [];
    let pendingPath: string | undefined;
    let ownedFd: number | undefined;
    let outcome: { readonly threw: false } | { readonly threw: true; readonly error: unknown } = { threw: false };

    try {
      await mock.module('node:fs', () => ({
        ...originalFs,
        openSync(...args: Parameters<typeof originalFs.openSync>): number {
          const file = args[0];
          const fd = originalFs.openSync(...args);
          if (typeof file === 'string' && file.startsWith(`${target}.pending-`)) {
            pendingPath = file;
            ownedFd = fd;
            events.push('open');
          }
          return fd;
        },
        writeFileSync(
          ...args: Parameters<typeof originalFs.writeFileSync>
        ): ReturnType<typeof originalFs.writeFileSync> {
          if (typeof args[0] === 'number' && args[0] === ownedFd) {
            events.push('writeFileSync');
            if (fault.bodyCall === 'writeFileSync') throw fault.bodyError;
          }
          return originalFs.writeFileSync(...args);
        },
        fsyncSync(fd: number): void {
          if (fd === ownedFd) {
            events.push('fsyncSync');
            if (fault.bodyCall === 'fsyncSync') throw fault.bodyError;
          }
          return originalFs.fsyncSync(fd);
        },
        closeSync(fd: number): void {
          if (fd === ownedFd) {
            events.push('closeSync');
            originalFs.closeSync(fd);
            throw closeError;
          }
          return originalFs.closeSync(fd);
        },
        unlinkSync(file: Parameters<typeof originalFs.unlinkSync>[0]): void {
          if (file === pendingPath) {
            events.push('unlinkSync');
            if (unlinkError !== null) throw unlinkError;
          }
          return originalFs.unlinkSync(file);
        },
      }));

      try {
        writeDurable(target, { schema: 'FixtureController/v1' });
      } catch (error) {
        outcome = { threw: true, error };
      }
    } finally {
      await mock.module('node:fs', () => originalFs);
    }

    // Observe and clean only after Bun's live module aliases have been restored.
    expect(events).toEqual(
      fault.bodyCall === 'writeFileSync'
        ? ['open', 'writeFileSync', 'closeSync', 'unlinkSync']
        : ['open', 'writeFileSync', 'fsyncSync', 'closeSync', 'unlinkSync'],
    );
    expect(outcome.threw).toBe(true);
    if (!outcome.threw) throw new Error('public durable writer unexpectedly returned');
    const causes = errorCauses(outcome.error);
    expect(causes.length).toBe(fault.bodyCall === 'writeFileSync' ? 3 : 2);
    expect(causes[0]).toBe(fault.bodyError);
    expect(causes[1]).toBe(closeError);
    if (unlinkError !== null) expect(causes[2]).toBe(unlinkError);
    expect(pendingPath).toBeDefined();
    expect(path.basename(pendingPath ?? '')).toStartWith('controller.json.pending-');
    expect(originalFs.readFileSync(target)).toEqual(before);
    const pending = pendingPath && originalFs.existsSync(pendingPath);
    expect(pending).toBe(fault.expectedPending);
    expect(originalFs.readdirSync(root).sort()).toEqual(
      fault.expectedPending ? ['controller.json', path.basename(pendingPath ?? '')].sort() : ['controller.json'],
    );
  }, 5000);
}

test('restored filesystem aliases support ordinary durable controller publication', () => {
  const root = originalFs.mkdtempSync(path.join(tmpdir(), 'vida-controller-durable-success-'));
  let assertionsPassed = false;
  try {
    const target = path.join(root, 'controller.json');
    const value = { schema: 'FixtureController/v1', revision: 1 };
    writeDurable(target, value);
    expect(originalFs.readFileSync(target, 'utf8')).toBe(`${JSON.stringify(value, null, 2)}\n`);
    expect(originalFs.readdirSync(root)).toEqual(['controller.json']);
    assertionsPassed = true;
  } finally {
    if (assertionsPassed) originalFs.rmSync(root, { recursive: true, force: true });
    else console.error(`retained controller durable-write fixture: ${root}`);
  }
}, 5000);

test('release state save preserves undefined write and close causes and retains its temp file', async () => {
  const root = originalFs.mkdtempSync(path.join(tmpdir(), 'vida-release-state-save-'));
  console.error(`retained release state save fixture: ${root}`);
  const target = path.join(root, 'release.json');
  const before = Buffer.from('preexisting release state\n');
  const closeError = Object.assign(new Error('injected release state close failure'), { code: 'EIO' });
  originalFs.writeFileSync(target, before);

  const events: string[] = [];
  let temporaryPath: string | undefined;
  let ownedFd: number | undefined;
  let outcome: { readonly threw: false } | { readonly threw: true; readonly error: unknown } = { threw: false };

  try {
    await mock.module('node:fs', () => ({
      ...originalFs,
      openSync(...args: Parameters<typeof originalFs.openSync>): number {
        const file = args[0];
        const fd = originalFs.openSync(...args);
        if (typeof file === 'string' && file.startsWith(`${target}.`) && file.endsWith('.tmp')) {
          temporaryPath = file;
          ownedFd = fd;
          events.push('open');
        }
        return fd;
      },
      writeFileSync(...args: Parameters<typeof originalFs.writeFileSync>): ReturnType<typeof originalFs.writeFileSync> {
        if (typeof args[0] === 'number' && args[0] === ownedFd) {
          events.push('write');
          throw undefined;
        }
        return originalFs.writeFileSync(...args);
      },
      fsyncSync(fd: number): void {
        if (fd === ownedFd) events.push('fsync');
        return originalFs.fsyncSync(fd);
      },
      closeSync(fd: number): void {
        if (fd === ownedFd) {
          events.push('close');
          originalFs.closeSync(fd);
          throw closeError;
        }
        return originalFs.closeSync(fd);
      },
      renameSync(...args: Parameters<typeof originalFs.renameSync>): void {
        if (args[0] === temporaryPath) events.push('rename');
        return originalFs.renameSync(...args);
      },
    }));

    try {
      saveReleaseState(target, { schema: 'fixture' });
    } catch (error) {
      outcome = { threw: true, error };
    }
  } finally {
    await mock.module('node:fs', () => originalFs);
  }

  expect(events).toEqual(['open', 'write', 'close']);
  expect(outcome.threw).toBe(true);
  if (!outcome.threw) throw new Error('public release state save unexpectedly returned');
  const causes = errorCauses(outcome.error);
  expect(causes).toHaveLength(2);
  expect(causes[0]).toBeUndefined();
  expect(causes[1]).toBe(closeError);
  expect(temporaryPath).toBeDefined();
  expect(path.basename(temporaryPath ?? '')).toMatch(/^release\.json\..+\.tmp$/);
  expect(originalFs.readFileSync(target)).toEqual(before);
  expect(originalFs.existsSync(temporaryPath ?? '')).toBe(true);
  expect(originalFs.readFileSync(temporaryPath ?? '')).toEqual(Buffer.alloc(0));
  expect(originalFs.readdirSync(root).sort()).toEqual(['release.json', path.basename(temporaryPath ?? '')].sort());
}, 5000);

test('release byte read preserves read and close causes without changing its regular file', async () => {
  const root = originalFs.mkdtempSync(path.join(tmpdir(), 'vida-release-read-'));
  console.error(`retained release byte read fixture: ${root}`);
  const file = path.join(root, 'payload.bin');
  const nativeBytes = Buffer.from([0x00, 0x41, 0x80, 0xff, 0x0a]);
  const readError = Object.assign(new Error('injected release read failure'), { code: 'EIO' });
  const closeError = Object.assign(new Error('injected release read close failure'), { code: 'EBADF' });
  originalFs.writeFileSync(file, nativeBytes);
  const beforeIdentity = originalFs.lstatSync(file);

  const events: string[] = [];
  let ownedFd: number | undefined;
  let outcome: { readonly threw: false } | { readonly threw: true; readonly error: unknown } = { threw: false };

  try {
    await mock.module('node:fs', () => ({
      ...originalFs,
      openSync(...args: Parameters<typeof originalFs.openSync>): number {
        const fd = originalFs.openSync(...args);
        if (args[0] === file) {
          ownedFd = fd;
          events.push('open');
        }
        return fd;
      },
      readSync(...args: Parameters<typeof originalFs.readSync>): number {
        if (args[0] === ownedFd) {
          events.push('read');
          throw readError;
        }
        return originalFs.readSync(...args);
      },
      closeSync(fd: number): void {
        if (fd === ownedFd) {
          events.push('close');
          originalFs.closeSync(fd);
          throw closeError;
        }
        return originalFs.closeSync(fd);
      },
    }));

    try {
      readReleaseBytes(root, 'payload.bin');
    } catch (error) {
      outcome = { threw: true, error };
    }
  } finally {
    await mock.module('node:fs', () => originalFs);
  }

  expect(events).toEqual(['open', 'read', 'close']);
  expect(outcome.threw).toBe(true);
  if (!outcome.threw) throw new Error('public release byte reader unexpectedly returned');
  const causes = errorCauses(outcome.error);
  expect(causes).toHaveLength(2);
  expect(causes[0]).toBe(readError);
  expect(causes[1]).toBe(closeError);
  expect(originalFs.readFileSync(file)).toEqual(nativeBytes);
  const afterIdentity = originalFs.lstatSync(file);
  expect([
    afterIdentity.dev,
    afterIdentity.ino,
    afterIdentity.size,
    afterIdentity.mtimeMs,
    afterIdentity.ctimeMs,
  ]).toEqual([
    beforeIdentity.dev,
    beforeIdentity.ino,
    beforeIdentity.size,
    beforeIdentity.mtimeMs,
    beforeIdentity.ctimeMs,
  ]);
  expect(originalFs.existsSync(file)).toBe(true);
  expect(originalFs.readdirSync(root)).toEqual(['payload.bin']);
}, 5000);

test('restored filesystem aliases support release state save and bounded byte reads', () => {
  const root = originalFs.mkdtempSync(path.join(tmpdir(), 'vida-release-artifact-success-'));
  let assertionsPassed = false;
  try {
    const target = path.join(root, 'release.json');
    const value = { schema: 'VidaLocalReleaseState/v1', operation_id: 'fixture', version: '1.2.3', status: 'running' };
    saveReleaseState(target, value);
    expect(originalFs.readFileSync(target, 'utf8')).toBe(releaseJSON(value));
    expect(readReleaseBytes(root, 'release.json')).toEqual(Buffer.from(releaseJSON(value)));
    expect(originalFs.readdirSync(root)).toEqual(['release.json']);
    assertionsPassed = true;
  } finally {
    if (assertionsPassed) originalFs.rmSync(root, { recursive: true, force: true });
    else console.error(`retained release artifact success fixture: ${root}`);
  }
}, 5000);
