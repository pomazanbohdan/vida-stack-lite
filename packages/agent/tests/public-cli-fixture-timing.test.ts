import { expect, spyOn, test } from 'bun:test';
import { existsSync, lstatSync, mkdtempSync, readFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as fixtureTiming from './helpers/public-cli-fixture-runner.ts';

function profileFixture(): { readonly root: string; readonly profileRoot: string } {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-public-cli-cpu-profile-'));
  const profileRoot = path.join(root, '.tmp', 'release-runtime-diagnostic');
  mkdirSync(profileRoot, { recursive: true });
  return { root, profileRoot };
}

test('CPU profile opt-out adds no argv and performs no profile-root IO', () => {
  const absentRoot = path.join(tmpdir(), 'vida-public-cli-profile-absent-' + randomUUID());
  expect(fixtureTiming.bunCpuProfileArgs(absentRoot)).toEqual([]);
  expect(existsSync(absentRoot)).toBe(false);
});

test('CPU profile allocation validates its root, skips retained children and stops at 64', () => {
  const { root, profileRoot } = profileFixture();
  const outside = path.join(root, 'outside');
  const file = path.join(profileRoot, 'profile-file');
  try {
    mkdirSync(outside);
    writeFileSync(file, 'retained', { flag: 'wx' });
    expect(() => fixtureTiming.bunCpuProfileArgs(root, 'relative-profile-root')).toThrow(/absolute and normalized/u);
    expect(() => fixtureTiming.bunCpuProfileArgs(root, outside)).toThrow(/under the release diagnostic root/u);
    expect(() => fixtureTiming.bunCpuProfileArgs(root, path.join(profileRoot, 'missing'))).toThrow(/ENOENT/u);
    expect(() => fixtureTiming.bunCpuProfileArgs(root, file)).toThrow(/non-directory/u);

    const childPath = (index: number) => path.join(profileRoot, 'child-' + String(index).padStart(2, '0'));
    const retainedChild = childPath(2);
    mkdirSync(retainedChild);
    const retainedFile = path.join(retainedChild, 'retained.txt');
    writeFileSync(retainedFile, 'preserve', { flag: 'wx' });

    for (const index of [1, ...Array.from({ length: 62 }, (_, i) => i + 3)]) {
      const child = childPath(index);
      expect(fixtureTiming.bunCpuProfileArgs(root, profileRoot)).toEqual(['--cpu-prof', '--cpu-prof-dir=' + child]);
      expect(lstatSync(child).isDirectory()).toBe(true);
    }
    expect(readFileSync(retainedFile, 'utf8')).toBe('preserve');
    expect(() => fixtureTiming.bunCpuProfileArgs(root, profileRoot)).toThrow(/bound exceeded/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('parent phase receipts distinguish completed intervals from the last started phase', () => {
  expect(fixtureTiming).toHaveProperty('createPublicCliFixturePhaseMarker');
  const root = mkdtempSync(path.join(tmpdir(), 'vida-parent-timing-'));
  const clock = spyOn(process.hrtime, 'bigint');
  try {
    clock
      .mockReturnValueOnce(1_000_000_000n)
      .mockReturnValueOnce(1_000_000_000n)
      .mockReturnValueOnce(1_012_500_000n)
      .mockReturnValueOnce(1_018_000_000n);
    const receipt = path.join(root, 'private', 'timing.ndjson');
    const mark = fixtureTiming.createPublicCliFixturePhaseMarker(receipt);
    mark('fixture_setup');
    mark('workflow_setup');
    mark('public_issue_wave');
    const records: unknown = readFileSync(receipt, 'utf8')
      .trim()
      .split('\n')
      .map((line): unknown => {
        const record: unknown = JSON.parse(line);
        return record;
      });
    expect(records).toEqual([
      { schema: 'PrivatePublicCliFixturePhaseTiming/v1', phase: 'fixture_setup', elapsed_ms: 0, since_previous_ms: 0 },
      {
        schema: 'PrivatePublicCliFixturePhaseTiming/v1',
        phase: 'workflow_setup',
        elapsed_ms: 12.5,
        since_previous_ms: 12.5,
      },
      {
        schema: 'PrivatePublicCliFixturePhaseTiming/v1',
        phase: 'public_issue_wave',
        elapsed_ms: 18,
        since_previous_ms: 5.5,
      },
    ]);
  } finally {
    clock.mockRestore();
    rmSync(root, { recursive: true, force: true });
  }
});

test('parent phase receipt write failure is visible without a fabricated completion', () => {
  expect(fixtureTiming).toHaveProperty('createPublicCliFixturePhaseMarker');
  const root = mkdtempSync(path.join(tmpdir(), 'vida-parent-timing-'));
  try {
    const receipt = path.join(root, 'timing.ndjson');
    const mark = fixtureTiming.createPublicCliFixturePhaseMarker(receipt);
    mkdirSync(receipt);
    expect(() => mark('fixture_setup')).toThrow();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fixture-owned receipts retain the observed setup origin before their path exists', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-parent-setup-timing-'));
  const clock = spyOn(process.hrtime, 'bigint').mockReturnValue(1_025_000_000n);
  try {
    const setupStartedNs = 1_000_000_000n;
    for (const owner of ['first', 'second']) {
      const receipt = path.join(root, owner, 'timing.ndjson');
      const mark = fixtureTiming.createPublicCliFixturePhaseMarker(receipt, setupStartedNs);
      mark('fixture_setup', setupStartedNs);
      mark('workflow_setup');
      const records: unknown = readFileSync(receipt, 'utf8')
        .trim()
        .split('\n')
        .map((line): unknown => JSON.parse(line));
      expect(records).toEqual([
        {
          schema: 'PrivatePublicCliFixturePhaseTiming/v1',
          phase: 'fixture_setup',
          elapsed_ms: 0,
          since_previous_ms: 0,
        },
        {
          schema: 'PrivatePublicCliFixturePhaseTiming/v1',
          phase: 'workflow_setup',
          elapsed_ms: 25,
          since_previous_ms: 25,
        },
      ]);
    }
  } finally {
    clock.mockRestore();
    rmSync(root, { recursive: true, force: true });
  }
});

test('public CLI custody fences a second fixture during a child and after UNKNOWN', async () => {
  const custody = fixtureTiming.createPublicCliFixtureCustody();
  let complete: () => void = () => {};
  const child = new Promise<void>((resolve) => {
    complete = resolve;
  });
  const current = (async () => {
    using active = custody.enter();
    await child;
    active.retainUnknown();
  })();
  try {
    expect(() => custody.enter()).toThrow('public CLI fixture is still active');
  } finally {
    complete();
    await current;
  }
  expect(() => custody.enter()).toThrow('public CLI effect is UNKNOWN');
});

test('bounded real CLI captures a terminal child and allows a clean successor', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-public-cli-bounded-'));
  const receipt = path.join(root, 'timing.ndjson');
  let unknown = false;
  const custody = fixtureTiming.createPublicCliFixtureCustody();
  try {
    {
      using active = custody.enter();
      const runner = fixtureTiming.createNativeTsPublicCliFixtureRunner({
        bundleRoot: path.resolve(import.meta.dir, '..'),
        diagnosticReceiptPath: receipt,
        fixtureRoot: root,
        onUnknown: () => {
          unknown = true;
          active.retainUnknown();
        },
      });
      const result = await runner.spawnBounded(['--help'], performance.now() + 4000);
      expect(result.status).toBe(0);
      expect(result.signal).toBeNull();
    }
    expect(unknown).toBe(false);
    const terminal: unknown = JSON.parse(readFileSync(receipt, 'utf8'));
    expect(terminal).toMatchObject({ status: 0, close_observed: true, timed_out: false });
    using next = custody.enter();
    expect(next).toHaveProperty('retainUnknown');
  } finally {
    if (!unknown) rmSync(root, { recursive: true, force: true });
  }
});
