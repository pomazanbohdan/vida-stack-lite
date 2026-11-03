import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from 'bun:test';
import { createLocalWorkItemFixture, withLocalWorkItemFixtureCase } from './helpers/local-work-item-fixture.js';

interface MarkedFixture {
  readonly root: string;
  readonly markerPath: string;
  readonly marker: Buffer;
}

// Filesystem backing: UNKNOWN; these checks establish current OS-temp bytes only.
const markerBytes = Buffer.from('task2-fixture-custody/v1 owned marker');

async function createMarkedFixture(): Promise<MarkedFixture> {
  const { root } = await createLocalWorkItemFixture();
  const markerPath = path.join(root, 'task2-custody.marker');
  await writeFile(markerPath, markerBytes, { flag: 'wx' });
  return { root, markerPath, marker: markerBytes };
}

async function assertRetained(fixture: MarkedFixture): Promise<void> {
  expect((await stat(fixture.root)).isDirectory()).toBe(true);
  expect((await readFile(fixture.markerPath)).toString('hex')).toBe(fixture.marker.toString('hex'));
}

async function runWithOutcome<TResult>(outcome: TResult): Promise<TResult> {
  let fixture!: MarkedFixture;
  const actual = await withLocalWorkItemFixtureCase(async () => {
    fixture = await createMarkedFixture();
    return outcome;
  });
  await assertRetained(fixture);
  return actual;
}

async function captureThrown<T>(
  operation: () => Promise<T>,
): Promise<{ readonly didThrow: boolean; readonly error: unknown }> {
  try {
    await operation();
    return { didThrow: false, error: undefined };
  } catch (error) {
    return { didThrow: true, error };
  }
}

function controlledClock(values: readonly number[]): { readonly now: () => number; readonly calls: () => number } {
  let index = 0;
  return {
    now: () => {
      const value = values[Math.min(index, values.length - 1)]!;
      index += 1;
      return value;
    },
    calls: () => index,
  };
}

test('retains the actual root after a successful body', async () => {
  expect(await runWithOutcome({ status: 'success' })).toEqual({ status: 'success' });
});

test('retains false and expected non-applied body outcomes', async () => {
  const outcomes = [
    false,
    { status: 'rejected', reason: 'expected' },
    { status: 'busy' },
    { status: 'needs_reconciliation' },
  ] as const;

  for (const outcome of outcomes) expect(await runWithOutcome(outcome)).toEqual(outcome);
});

test('preserves thrown error identity and thrown undefined while retaining roots', async () => {
  const sentinel = new Error('owned body failure');
  let errorFixture!: MarkedFixture;
  const errorResult = await captureThrown(() =>
    withLocalWorkItemFixtureCase(async () => {
      errorFixture = await createMarkedFixture();
      throw sentinel;
    }),
  );
  expect(errorResult.didThrow).toBe(true);
  expect(errorResult.error).toBe(sentinel);
  await assertRetained(errorFixture);

  let undefinedFixture!: MarkedFixture;
  const undefinedResult = await captureThrown(() =>
    withLocalWorkItemFixtureCase(async () => {
      undefinedFixture = await createMarkedFixture();
      throw undefined;
    }),
  );
  expect(undefinedResult.didThrow).toBe(true);
  expect(undefinedResult.error).toBeUndefined();
  await assertRetained(undefinedFixture);
});

test('a body at its deadline cannot qualify success', async () => {
  const clock = controlledClock([0, 5_000, 5_000]);
  let fixture!: MarkedFixture;
  const result = await captureThrown(() =>
    withLocalWorkItemFixtureCase(
      async () => {
        fixture = await createMarkedFixture();
        return 'late body result';
      },
      { monotonic_now: clock.now },
    ),
  );

  expect(result.didThrow).toBe(true);
  expect(result.error).toBeInstanceOf(Error);
  expect((result.error as Error).message).toContain('exceeded its monotonic deadline');
  expect(clock.calls()).toBe(3);
  await assertRetained(fixture);
});

test('checks the same deadline after owned cleanup completes', async () => {
  const clock = controlledClock([0, 4_999, 5_000]);
  let fixture!: MarkedFixture;
  const result = await captureThrown(() =>
    withLocalWorkItemFixtureCase(
      async () => {
        fixture = await createMarkedFixture();
        return 'body completed before deadline';
      },
      { monotonic_now: clock.now },
    ),
  );

  expect(result.didThrow).toBe(true);
  expect(result.error).toBeInstanceOf(Error);
  expect((result.error as Error).message).toContain('exceeded its monotonic deadline');
  expect(clock.calls()).toBe(3);
  await assertRetained(fixture);
});

test('keeps an unsettled case active until its body settles', async () => {
  let releaseBody!: () => void;
  const bodyGate = new Promise<void>((resolve) => {
    releaseBody = resolve;
  });
  let signalReady!: () => void;
  const ready = new Promise<void>((resolve) => {
    signalReady = resolve;
  });
  let fixture: MarkedFixture | undefined;
  const first = withLocalWorkItemFixtureCase(async () => {
    try {
      fixture = await createMarkedFixture();
    } finally {
      signalReady();
    }
    await bodyGate;
    return 'settled';
  });
  const firstOutcome = first.then(
    (value) => ({ status: 'fulfilled' as const, value }),
    (error: unknown) => ({ status: 'rejected' as const, error }),
  );

  await ready;
  const overlap = await captureThrown(() => withLocalWorkItemFixtureCase(async () => 'overlap must not run'));
  releaseBody();

  expect(overlap.didThrow).toBe(true);
  expect(overlap.error).toBeInstanceOf(Error);
  expect((overlap.error as Error).message).toContain('cannot overlap');
  expect(await firstOutcome).toEqual({ status: 'fulfilled', value: 'settled' });
  expect(fixture).toBeDefined();
  await assertRetained(fixture!);
});
