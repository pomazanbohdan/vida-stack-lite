import { rejectionReason } from './helpers/expect-rejection.ts';
import { describe, expect, spyOn, test } from 'bun:test';
import {
  defaultRuntimeClock,
  defaultRuntimeTimingSink,
  invokeTimed,
  type RuntimeClock,
  type RuntimeTimingEvent,
  type RuntimeTimingOptions,
} from '../src/runtime-timing.ts';

function clock(...values: (bigint | Error)[]): RuntimeClock {
  return {
    monotonicNs: () => {
      const value = values.shift();
      if (value instanceof Error) throw value;
      if (value === undefined) throw new Error('clock fixture is exhausted');
      return value;
    },
  };
}

async function timed<T>(
  action: (options: RuntimeTimingOptions) => Promise<T>,
  options: RuntimeTimingOptions,
): Promise<{ events: RuntimeTimingEvent[]; result: T }> {
  const events: RuntimeTimingEvent[] = [];
  const result = await action({
    ...options,
    sink: {
      record: (event) => {
        events.push(event);
      },
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { events, result };
}

async function timedWithUntrustedClock(values: readonly unknown[]): Promise<{
  events: RuntimeTimingEvent[];
  result: unknown;
}> {
  let index = 0;
  const events: RuntimeTimingEvent[] = [];
  const clockBinding = { monotonicNs: (): unknown => values[index++] };
  const result: unknown = await Reflect.apply(invokeTimed, undefined, [
    'readConfig',
    () => 'untrusted-clock',
    {
      clock: clockBinding,
      sink: {
        record: (event: RuntimeTimingEvent) => {
          events.push(event);
        },
      },
    },
  ]);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { events, result };
}

function eventAt(events: readonly RuntimeTimingEvent[]): RuntimeTimingEvent {
  expect(events).toHaveLength(1);
  return events[0]!;
}

describe('direct maintained-source completeness', () => {
  test('uses default options and emits one valid successful timing event', async () => {
    const messages: unknown[] = [];
    const output = spyOn(console, 'error').mockImplementation((message: unknown) => {
      messages.push(message);
    });
    try {
      await Promise.resolve(expect(invokeTimed('readConfig', () => 7)).resolves.toBe(7));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatch(/^runtime call: /);
      let event: unknown;
      expect(() => {
        event = JSON.parse(String(messages[0]).slice('runtime call: '.length));
      }).not.toThrow();
      expect(event).toMatchObject({
        schema: 'RuntimeTiming/v1',
        operation: 'readConfig',
        threshold_ms: 2_000,
        outcome: 'success',
      });
      expect(event).not.toHaveProperty('error_code');
    } finally {
      output.mockRestore();
    }
  });

  test('timing handles success, threshold, clock failure, regression, sink rejection, and classified errors', async () => {
    expect(defaultRuntimeClock().monotonicNs()).toBeTypeOf('bigint');
    expect(defaultRuntimeTimingSink().record).toBeTypeOf('function');
    const threshold = await timed((options) => invokeTimed('readConfig', () => 'ok', options), {
      clock: clock(0n, 3_000_000n),
      thresholdMs: 2,
      optimizationReason: 'slow path',
    });
    expect(threshold.result).toBe('ok');
    expect(eventAt(threshold.events)).toMatchObject({ optimization_required: true, optimization_reason: 'slow path' });
    const thresholdCallId = eventAt(threshold.events).call_id;
    expect(eventAt(threshold.events)).toMatchObject({
      schema: 'RuntimeTiming/v1',
      operation: 'readConfig',
      started_at_ns: '0',
      elapsed_ns: '3000000',
      elapsed_ms: 3,
      processing_time_ms: 3,
      threshold_ms: 2,
      within_budget: false,
      outcome: 'success',
    });
    expect(thresholdCallId).toMatch(/^runtime-call-[0-9]+$/);
    const exactThreshold = await timed((options) => invokeTimed('readConfig', () => 'exact', options), {
      clock: clock(0n, 2_000_000n),
      thresholdMs: 2,
    });
    const exactCallId = eventAt(exactThreshold.events).call_id;
    expect(eventAt(exactThreshold.events)).toMatchObject({
      elapsed_ns: '2000000',
      elapsed_ms: 2,
      within_budget: false,
      optimization_required: true,
      optimization_reason: 'runtime call exceeded 2ms',
    });
    expect(eventAt(exactThreshold.events)).not.toHaveProperty('clock_error');
    expect(Number(exactCallId.slice('runtime-call-'.length))).toBe(
      Number(thresholdCallId.slice('runtime-call-'.length)) + 1,
    );
    const nonZeroElapsed = await timed((options) => invokeTimed('readConfig', () => 'non-zero', options), {
      clock: clock(10n, 3_000_010n),
      thresholdMs: 2,
    });
    expect(eventAt(nonZeroElapsed.events)).toMatchObject({
      started_at_ns: '10',
      elapsed_ns: '3000000',
      elapsed_ms: 3,
      processing_time_ms: 3,
      optimization_required: true,
    });
    const equalClock = await timed((options) => invokeTimed('readConfig', () => 'equal', options), {
      clock: clock(5n, 5n),
      thresholdMs: 1,
    });
    expect(eventAt(equalClock.events)).toMatchObject({
      started_at_ns: '5',
      elapsed_ns: '0',
      elapsed_ms: 0,
      within_budget: true,
      optimization_required: false,
    });
    expect(eventAt(equalClock.events)).not.toHaveProperty('clock_error');
    const invalidClockType = await timedWithUntrustedClock([0, 1n]);
    expect(eventAt(invalidClockType.events)).toMatchObject({
      clock_error: 'CLOCK_READ_FAILED',
      elapsed_ns: '0',
      within_budget: false,
      optimization_required: false,
    });
    const invalidClockValue = await timed((options) => invokeTimed('readConfig', () => 'invalid-value', options), {
      clock: clock(0n, -1n),
    });
    expect(eventAt(invalidClockValue.events)).toMatchObject({
      clock_error: 'CLOCK_READ_FAILED',
      elapsed_ns: '0',
      within_budget: false,
      optimization_required: false,
    });
    const invalidClockBudget = await timedWithUntrustedClock([0n, 2_000_000_000]);
    expect(eventAt(invalidClockBudget.events)).toMatchObject({
      clock_error: 'CLOCK_READ_FAILED',
      elapsed_ns: '0',
      within_budget: false,
      optimization_required: false,
    });
    const failedClock = await timed((options) => invokeTimed('readConfig', () => 'ok', options), {
      clock: clock(new Error('clock'), -1n),
    });
    expect(eventAt(failedClock.events).clock_error).toBe('CLOCK_READ_FAILED');
    const regressed = await timed((options) => invokeTimed('readConfig', () => 'ok', options), {
      clock: clock(5n, 4n),
    });
    expect(eventAt(regressed.events)).toMatchObject({
      schema: 'RuntimeTiming/v1',
      operation: 'readConfig',
      started_at_ns: '5',
      elapsed_ns: '0',
      elapsed_ms: 0,
      processing_time_ms: 0,
      within_budget: false,
      optimization_required: false,
      optimization_reason: 'monotonic clock error',
      clock_error: 'CLOCK_REGRESSION',
      outcome: 'success',
    });
    const invalidEnd = await timed((options) => invokeTimed('readConfig', () => 'ok', options), {
      clock: clock(0n, new Error('clock')),
    });
    expect(eventAt(invalidEnd.events).clock_error).toBe('CLOCK_READ_FAILED');
    for (const [message, code] of [
      ['authorization denied', 'DENIED'],
      ['topology config changed', 'CONFIG_CHANGED'],
      ['CAS revision mismatch', 'CAS_FAILURE'],
      ['native host capability', 'HOST_GAP'],
      ['required value invalid', 'VALIDATION_ERROR'],
      ['other', 'UNEXPECTED_ERROR'],
      ['approval rejected', 'DENIED'],
      ['AUTHORIZATION DENIED', 'DENIED'],
    ]) {
      const failure = Object.assign(new Error(message), { code: message });
      const events: RuntimeTimingEvent[] = [];
      expect(
        await rejectionReason(
          invokeTimed(
            'runGovernedWrite',
            () => {
              throw failure;
            },
            {
              clock: clock(0n, 1n),
              sink: {
                record: (event) => {
                  events.push(event);
                },
              },
            },
          ),
        ),
      ).toBe(failure);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(eventAt(events)).toMatchObject({
        schema: 'RuntimeTiming/v1',
        operation: 'runGovernedWrite',
        started_at_ns: '0',
        elapsed_ns: '1',
        elapsed_ms: 0.000001,
        processing_time_ms: 0.000001,
        threshold_ms: 2_000,
        within_budget: true,
        optimization_required: false,
        outcome: 'error',
        error_code: code,
      });
      expect(eventAt(events).call_id).toMatch(/^runtime-call-[0-9]+$/);
      expect(eventAt(events)).not.toHaveProperty('optimization_reason');
    }
    const structuredFailure: object = {};
    Object.setPrototypeOf(structuredFailure, null);
    Object.defineProperty(structuredFailure, 'message', { value: 'authorization denied', enumerable: true });
    const structuredEvents: RuntimeTimingEvent[] = [];
    expect(
      await rejectionReason(
        invokeTimed(
          'runGovernedWrite',
          () => {
            throw structuredFailure;
          },
          {
            clock: clock(0n, 1n),
            sink: {
              record: (event) => {
                structuredEvents.push(event);
              },
            },
          },
        ),
      ),
    ).toBe(structuredFailure);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(eventAt(structuredEvents).error_code).toBe('DENIED');
    const functionFailure = Object.assign(() => undefined, { message: 'topology config changed' });
    const functionEvents: RuntimeTimingEvent[] = [];
    expect(
      await rejectionReason(
        invokeTimed(
          'runGovernedWrite',
          () => {
            throw functionFailure;
          },
          {
            clock: clock(0n, 1n),
            sink: {
              record: (event) => {
                functionEvents.push(event);
              },
            },
          },
        ),
      ),
    ).toBe(functionFailure);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(eventAt(functionEvents).error_code).toBe('CONFIG_CHANGED');
    const nonStringMessage: object = {};
    Object.setPrototypeOf(nonStringMessage, null);
    Object.defineProperty(nonStringMessage, 'message', {
      value: { slice: () => 'authorization denied' },
      enumerable: true,
    });
    const nonStringEvents: RuntimeTimingEvent[] = [];
    expect(
      await rejectionReason(
        invokeTimed(
          'runGovernedWrite',
          () => {
            throw nonStringMessage;
          },
          {
            clock: clock(0n, 1n),
            sink: {
              record: (event) => {
                nonStringEvents.push(event);
              },
            },
          },
        ),
      ),
    ).toBe(nonStringMessage);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(eventAt(nonStringEvents).error_code).toBe('UNEXPECTED_ERROR');
    const codeOnlyFailure: object = {};
    Object.setPrototypeOf(codeOnlyFailure, null);
    Object.defineProperty(codeOnlyFailure, 'code', { value: 'authorization denied', enumerable: true });
    const codeOnlyEvents: RuntimeTimingEvent[] = [];
    expect(
      await rejectionReason(
        invokeTimed(
          'runGovernedWrite',
          () => {
            throw codeOnlyFailure;
          },
          {
            clock: clock(0n, 1n),
            sink: {
              record: (event) => {
                codeOnlyEvents.push(event);
              },
            },
          },
        ),
      ),
    ).toBe(codeOnlyFailure);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(eventAt(codeOnlyEvents).error_code).toBe('DENIED');
    const lowercaseStringEvents: RuntimeTimingEvent[] = [];
    expect(
      await rejectionReason(
        invokeTimed(
          'runGovernedWrite',
          () => {
            throw 'authorization denied';
          },
          {
            clock: clock(0n, 1n),
            sink: {
              record: (event) => {
                lowercaseStringEvents.push(event);
              },
            },
          },
        ),
      ),
    ).toBe('authorization denied');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(eventAt(lowercaseStringEvents).error_code).toBe('DENIED');
    const longStringEvents: RuntimeTimingEvent[] = [];
    const longFailure = 'x'.repeat(300) + ' authorization denied';
    expect(
      await rejectionReason(
        invokeTimed(
          'runGovernedWrite',
          () => {
            throw longFailure;
          },
          {
            clock: clock(0n, 1n),
            sink: {
              record: (event) => {
                longStringEvents.push(event);
              },
            },
          },
        ),
      ),
    ).toBe(longFailure);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(eventAt(longStringEvents).error_code).toBe('UNEXPECTED_ERROR');
    {
      const failure = await rejectionReason(invokeTimed('readConfig', () => true, { thresholdMs: 0 }));
      expect(() => {
        throw failure;
      }).toThrow(/positive/);
    }
    {
      const failure = await rejectionReason(invokeTimed('readConfig', () => true, { thresholdMs: Number.NaN }));
      expect(() => {
        throw failure;
      }).toThrow(/positive/);
    }
    expect(
      await invokeTimed('readConfig', () => true, { sink: { record: () => Promise.reject(new Error('sink')) } }),
    ).toBe(true);
    const huge = await timed((options) => invokeTimed('readConfig', () => 'huge', options), {
      clock: clock(0n, 10n ** 400n),
    });
    expect(eventAt(huge.events).elapsed_ms).toBe(Number.MAX_VALUE);
    const hostile = new Proxy(
      {},
      {
        getOwnPropertyDescriptor: () => {
          throw new Error('hostile descriptor');
        },
      },
    );
    expect(
      await rejectionReason(
        invokeTimed(
          'readConfig',
          () => {
            throw hostile;
          },
          { clock: clock(0n, 1n) },
        ),
      ),
    ).toBe(hostile);
    expect(
      await rejectionReason(
        invokeTimed(
          'readConfig',
          () => {
            throw 'plain failure';
          },
          { clock: clock(0n, 1n) },
        ),
      ),
    ).toBe('plain failure');
    const longMessageFailure: object = {};
    Object.setPrototypeOf(longMessageFailure, null);
    Object.defineProperty(longMessageFailure, 'message', {
      value: 'x'.repeat(300) + ' authorization denied',
      enumerable: true,
    });
    const longMessageEvents: RuntimeTimingEvent[] = [];
    expect(
      await rejectionReason(
        invokeTimed(
          'runGovernedWrite',
          () => {
            throw longMessageFailure;
          },
          {
            clock: clock(0n, 1n),
            sink: {
              record: (event) => {
                longMessageEvents.push(event);
              },
            },
          },
        ),
      ),
    ).toBe(longMessageFailure);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(eventAt(longMessageEvents).error_code).toBe('UNEXPECTED_ERROR');
    const defaultClock = defaultRuntimeClock();
    expect(defaultClock).toBe(defaultRuntimeClock());
    expect(Object.isFrozen(defaultClock)).toBe(true);
    expect(defaultClock.monotonicNs()).toBeTypeOf('bigint');
    const defaultThreshold = await timed((options) => invokeTimed('readConfig', () => 'default-threshold', options), {
      clock: clock(0n, 2_000_000_001n),
      thresholdMs: 2_000,
    });
    expect(eventAt(defaultThreshold.events)).toMatchObject({
      threshold_ms: 2_000,
      optimization_required: true,
      optimization_reason: 'runtime call exceeded 2000ms',
    });
    const messages: unknown[] = [];
    const info = spyOn(console, 'error').mockImplementation((message: unknown) => {
      messages.push(message);
    });
    try {
      defaultRuntimeTimingSink().record(eventAt(threshold.events));
      defaultRuntimeTimingSink().record(eventAt(exactThreshold.events));
      defaultRuntimeTimingSink().record({ ...eventAt(exactThreshold.events), optimization_required: false });
      expect(messages).toHaveLength(3);
      expect(messages[0]).toMatch(/^runtime call requires optimization: /);
      expect(messages[1]).toMatch(/^runtime call requires optimization: /);
      expect(messages[2]).toMatch(/^runtime call: /);
    } finally {
      info.mockRestore();
    }
  });
});
