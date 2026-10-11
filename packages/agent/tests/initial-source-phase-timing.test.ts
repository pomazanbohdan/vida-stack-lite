import { expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isPromise } from 'node:util/types';
import { prepareWorkflowExecution, reserveWorkflowAssignmentForSession } from '../src/runtime-kernel.js';
import {
  createInitialSourcePhaseTiming,
  initialSourcePhases,
  type PhaseFixture,
} from './helpers/initial-source-phase-timing.js';

const captureTest = test.skipIf(process.platform !== 'linux');

function withFixture<T>(operation: (file: string, fixture: PhaseFixture) => T): T {
  const traceRoot = mkdtempSync(path.resolve(import.meta.dir, '../../../.tmp/initial-phase-unit-'));
  const repositoryRoot = mkdtempSync(path.join(tmpdir(), 'vida-initial-source-phase-'));
  try {
    return operation(path.join(traceRoot, 'phases.jsonl'), {
      repositoryRoot,
      workId: 'initial-' + randomUUID(),
      actionId: 'a'.repeat(64),
      stageId: 'develop_task',
    });
  } finally {
    rmSync(traceRoot, { recursive: true, force: true });
    rmSync(repositoryRoot, { recursive: true, force: true });
  }
}
function events(file: string): Record<string, unknown>[] {
  return readFileSync(file, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const value: unknown = JSON.parse(line);
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid phase record');
      return Object.fromEntries(Object.entries(value));
    });
}

test('phase measurement has no default IO and delegates once with exact return identity', () => {
  withFixture((file, fixture) => {
    const phases = createInitialSourcePhaseTiming();
    phases.installDelegates();
    expect(phases.arm(fixture)).toBe(false);
    let calls = 0;
    const value = {};
    expect(
      phases.measure('lease', fixture.repositoryRoot, fixture.workId, 'develop_task', () => {
        calls++;
        return value;
      }),
    ).toBe(value);
    expect(calls).toBe(1);
    expect(existsSync(file)).toBe(false);
  });
});

captureTest('phase capture requires installed delegates before arming a fixture', () => {
  withFixture((file, fixture) => {
    const phases = createInitialSourcePhaseTiming(file);
    expect(phases.arm(fixture)).toBe(false);
    expect(phases.status().state).toBe('not_installed');
    expect(existsSync(file)).toBe(false);
  });
});

captureTest('phase capture records the exact writer scope and ignores root work and stage mismatches', () => {
  withFixture((file, fixture) => {
    const phases = createInitialSourcePhaseTiming(file);
    phases.installDelegates();
    expect(phases.arm(fixture)).toBe(true);
    const value = {};
    const mismatches: readonly (readonly [string, string, string])[] = [
      [fixture.repositoryRoot + '/other', fixture.workId, 'develop_task'],
      [fixture.repositoryRoot, 'other', 'develop_task'],
      [fixture.repositoryRoot, fixture.workId, 'review_source_prewrite'],
    ];
    for (const [root, workId, stage] of mismatches) {
      expect(phases.measure('lease', root, workId, stage, () => value)).toBe(value);
    }
    expect(phases.measure('lease', fixture.repositoryRoot, fixture.workId, null, () => value)).toBe(value);
    expect(phases.measure('lease', fixture.repositoryRoot, fixture.workId, 'develop_task', () => value)).toBe(value);
    phases.disarm();
    const rows = events(file);
    expect(rows.filter((row) => row.phase === 'lease').map((row) => row.edge)).toEqual(['start', 'end']);
    expect(rows.filter((row) => row.phase === 'lease').every((row) => row.action_id === fixture.actionId)).toBe(true);
    expect(phases.status().state).toBe('complete');
    expect(phases.arm(fixture)).toBe(false);
  });
});

captureTest('phase capture preserves sync thrown objects and emits a rejected edge', () => {
  withFixture((file, fixture) => {
    const phases = createInitialSourcePhaseTiming(file);
    phases.installDelegates();
    expect(phases.arm(fixture)).toBe(true);
    const error = new Error('DUT');
    let failure: unknown;
    try {
      phases.measure('lease', fixture.repositoryRoot, fixture.workId, 'develop_task', () => {
        throw error;
      });
    } catch (caught) {
      failure = caught;
    }
    phases.disarm();
    expect(failure).toBe(error);
    expect(events(file).find((row) => row.phase === 'lease' && row.edge === 'end')?.outcome).toBe('rejected');
  });
});

captureTest('phase capture preserves original Promise identity and measures its actual settlement', async () => {
  const traceRoot = mkdtempSync(path.resolve(import.meta.dir, '../../../.tmp/initial-phase-unit-'));
  const repositoryRoot = mkdtempSync(path.join(tmpdir(), 'vida-initial-source-phase-'));
  const file = path.join(traceRoot, 'phases.jsonl');
  const fixture: PhaseFixture = {
    repositoryRoot,
    workId: 'initial-' + randomUUID(),
    actionId: 'b'.repeat(64),
    stageId: 'develop_task',
  };
  const phases = createInitialSourcePhaseTiming(file);
  try {
    phases.installDelegates();
    expect(phases.arm(fixture)).toBe(true);
    const value = {};
    const pending = Promise.resolve(value);
    expect(phases.measure('workflow_prepare', repositoryRoot, fixture.workId, null, () => pending)).toBe(pending);
    expect(
      events(file)
        .filter((row) => row.phase === 'workflow_prepare')
        .map((row) => row.edge),
    ).toEqual(['start']);
    expect(await pending).toBe(value);
    const rejection = new Error('original rejected operation');
    const rejected = Promise.reject(rejection);
    expect(phases.measure('workflow_prepare', repositoryRoot, fixture.workId, null, () => rejected)).toBe(rejected);
    let observed: unknown;
    try {
      await rejected;
    } catch (error) {
      observed = error;
    }
    expect(observed).toBe(rejection);
    let overriddenThenCalls = 0;
    const overridden = Promise.resolve(value);
    void Object.defineProperty(overridden, 'then', {
      value() {
        overriddenThenCalls++;
        throw new Error('custom then must not run');
      },
    });
    expect(phases.measure('composition', repositoryRoot, fixture.workId, null, () => overridden)).toBe(overridden);
    expect(await overridden).toBe(value);
    expect(overriddenThenCalls).toBe(0);
    phases.disarm();
    expect(
      events(file)
        .filter((row) => row.phase === 'workflow_prepare')
        .map((row) => row.edge),
    ).toEqual(['start', 'end', 'start', 'end']);
    expect(events(file).find((row) => row.phase === 'workflow_prepare' && row.outcome === 'rejected')).toBeDefined();
  } finally {
    phases.disarm();
    rmSync(traceRoot, { recursive: true, force: true });
    rmSync(repositoryRoot, { recursive: true, force: true });
  }
});

captureTest('phase capture marks disarmed pending operations incomplete without inventing settlement', () => {
  withFixture((file, fixture) => {
    const phases = createInitialSourcePhaseTiming(file);
    phases.installDelegates();
    expect(phases.arm(fixture)).toBe(true);
    let settle: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      settle = resolve;
    });
    expect(phases.measure('workflow_prepare', fixture.repositoryRoot, fixture.workId, null, () => pending)).toBe(
      pending,
    );
    phases.disarm();
    expect(phases.status().state).toBe('incomplete');
    expect(events(file).at(-1)).toMatchObject({ phase: 'capture', state: 'incomplete', pending: 1 });
    expect(
      events(file)
        .filter((row) => row.phase === 'workflow_prepare')
        .map((row) => row.edge),
    ).toEqual(['start']);
    if (!settle) throw new Error('pending operation resolver is unavailable');
    settle();
  });
});

captureTest('phase capture detects a replaced output owner while preserving operation identity', () => {
  withFixture((file, fixture) => {
    const phases = createInitialSourcePhaseTiming(file);
    phases.installDelegates();
    expect(phases.arm(fixture)).toBe(true);
    rmSync(file);
    writeFileSync(file, 'replacement owner');
    const value = {};
    expect(phases.measure('lease', fixture.repositoryRoot, fixture.workId, 'develop_task', () => value)).toBe(value);
    expect(phases.status().state).toBe('sink_error');
    phases.disarm();
    expect(readFileSync(file, 'utf8')).toBe('replacement owner');
  });
});

captureTest('phase capture stops with explicit truncation within the record and byte budgets', () => {
  withFixture((file, fixture) => {
    const phases = createInitialSourcePhaseTiming(file);
    phases.installDelegates();
    expect(phases.arm(fixture)).toBe(true);
    for (let index = 0; index < 100; index++)
      phases.measure('lease', fixture.repositoryRoot, fixture.workId, 'develop_task', () => index);
    phases.disarm();
    expect(phases.status().state).toBe('truncated');
    expect(events(file).length).toBeLessThanOrEqual(128);
    expect(readFileSync(file).byteLength).toBeLessThanOrEqual(16 * 1024);
    expect(events(file).at(-1)?.state).toBe('truncated');
  });
});

captureTest('phase capture refuses an existing destination without replacing its owner', () => {
  withFixture((file, fixture) => {
    writeFileSync(file, 'foreign');
    const phases = createInitialSourcePhaseTiming(file);
    phases.installDelegates();
    expect(phases.arm(fixture)).toBe(false);
    expect(phases.status().state).toBe('sink_error');
    const error = new Error('DUT');
    expect(() =>
      phases.measure('lease', fixture.repositoryRoot, fixture.workId, 'develop_task', () => {
        throw error;
      }),
    ).toThrow(error);
    expect(readFileSync(file, 'utf8')).toBe('foreign');
  });
});

captureTest('phase capture denies a linked output parent and leaves its external owner untouched', () => {
  withFixture((file, fixture) => {
    const external = path.join(fixture.repositoryRoot, 'external');
    mkdirSync(external);
    const linked = path.join(path.dirname(file), 'linked');
    symlinkSync(external, linked);
    const phases = createInitialSourcePhaseTiming(path.join(linked, 'phases.jsonl'));
    phases.installDelegates();
    expect(phases.arm(fixture)).toBe(false);
    expect(existsSync(path.join(external, 'phases.jsonl'))).toBe(false);
  });
});

captureTest('phase preload observes real capability denial without granting rights', async () => {
  const name = 'phase preload observes real capability denial without granting rights';
  if (process.env.VIDA_INITIAL_SOURCE_PHASE_PROBE === '1') {
    const repositoryRoot = mkdtempSync(path.join(tmpdir(), 'vida-initial-source-phase-'));
    const workId = 'initial-' + randomUUID();
    try {
      expect(initialSourcePhases.status().installed).toBe(true);
      expect(
        initialSourcePhases.arm({ repositoryRoot, workId, actionId: 'c'.repeat(64), stageId: 'develop_task' }),
      ).toBe(true);
      const request = { repositoryRoot, workItemId: workId, stageId: 'develop_task' };
      for (const [operation, message] of [
        [prepareWorkflowExecution, 'workflow execution requires an opaque host capability'],
        [reserveWorkflowAssignmentForSession, 'workflow session reservation requires an opaque host capability'],
      ] as const) {
        const result: unknown = Reflect.apply(operation, undefined, [null, request]);
        expect(isPromise(result)).toBe(true);
        if (!isPromise(result)) throw new Error('actual async capability boundary did not return a Promise');
        let failure: unknown;
        try {
          await result;
        } catch (error) {
          failure = error;
        }
        expect(failure).toBeInstanceOf(Error);
        if (!(failure instanceof Error)) throw new Error('actual capability boundary did not reject');
        expect(failure.message).toBe(message);
      }
      initialSourcePhases.disarm();
      expect(initialSourcePhases.status().state).toBe('complete');
    } finally {
      initialSourcePhases.disarm();
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
    return;
  }
  const traceRoot = mkdtempSync(path.resolve(import.meta.dir, '../../../.tmp/initial-phase-probe-'));
  const file = path.join(traceRoot, 'phases.jsonl');
  try {
    const child = spawnSync(
      process.execPath,
      [
        'test',
        '--preload',
        fileURLToPath(new URL('./helpers/initial-source-phase-preload.ts', import.meta.url)),
        '--test-name-pattern',
        '^' + name + '$',
        fileURLToPath(import.meta.url),
      ],
      {
        cwd: path.resolve(import.meta.dir, '..'),
        env: {
          ...process.env,
          VIDA_INITIAL_SOURCE_PHASE_TIMING_FILE: file,
          VIDA_INITIAL_SOURCE_PHASE_PROBE: '1',
          VIDA_INITIAL_SOURCE_FIXTURE_CHILD: '1',
        },
        timeout: 10_000,
        maxBuffer: 64 * 1024,
      },
    );
    expect(child.error).toBeUndefined();
    expect(child.signal).toBeNull();
    expect(child.status, child.stderr.toString()).toBe(0);
    const rows = events(file);
    expect(rows.filter((row) => row.phase === 'workflow_prepare').map((row) => [row.edge, row.outcome])).toEqual([
      ['start', undefined],
      ['end', 'rejected'],
    ]);
    expect(rows.filter((row) => row.phase === 'workflow_reserve').map((row) => [row.edge, row.outcome])).toEqual([
      ['start', undefined],
      ['end', 'rejected'],
    ]);
    expect(rows.at(-1)).toMatchObject({ state: 'complete', pending: 0 });
  } finally {
    rmSync(traceRoot, { recursive: true, force: true });
  }
});
