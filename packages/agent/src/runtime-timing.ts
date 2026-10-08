export const RUNTIME_TIMING_THRESHOLD_MS = 2_000;
export const RUNTIME_TIMING_OPERATIONS = [
  'createRuntimeKernel',
  'readConfig',
  'readProjectContext',
  'evaluateGovernance',
  'runGovernedWrite',
] as const;
export type RuntimeTimingOperation = (typeof RUNTIME_TIMING_OPERATIONS)[number];
export interface RuntimeClock {
  readonly monotonicNs: () => bigint;
}
export interface RuntimeTimingEvent {
  readonly schema: 'RuntimeTiming/v1';
  readonly operation: RuntimeTimingOperation;
  readonly call_id: string;
  readonly started_at_ns: string;
  readonly elapsed_ns: string;
  readonly elapsed_ms: number;
  readonly processing_time_ms: number;
  readonly threshold_ms: number;
  readonly within_budget: boolean;
  readonly optimization_required: boolean;
  readonly optimization_reason?: string;
  readonly outcome: 'success' | 'error';
  readonly error_code?: RuntimeErrorCode;
  readonly clock_error?: 'CLOCK_READ_FAILED' | 'CLOCK_REGRESSION';
}
type RuntimeErrorCode =
  | 'VALIDATION_ERROR'
  | 'DENIED'
  | 'HOST_GAP'
  | 'CONFIG_CHANGED'
  | 'CAS_FAILURE'
  | 'UNEXPECTED_ERROR';
export interface RuntimeTimingSink {
  readonly record: (event: RuntimeTimingEvent) => void | PromiseLike<void>;
}
export interface RuntimeTimingOptions {
  readonly clock?: RuntimeClock;
  readonly sink?: RuntimeTimingSink;
  readonly thresholdMs?: number;
  readonly optimizationReason?: string;
}
class SystemClock implements RuntimeClock {
  readonly monotonicNs = process.hrtime.bigint.bind(process.hrtime);
}
const systemClock: RuntimeClock = Object.freeze(new SystemClock());
const emptyText = Array.prototype.toString.bind([]) as () => string;
let callSequence = 0n;
function isObjectLike(error: unknown): boolean {
  return ['object', 'function'].includes(typeof error);
}
function defined<T>(values: readonly (T | undefined)[]): T {
  return values.find((value): value is T => value !== undefined) as T;
}
function reject(conditions: readonly boolean[], message: string): void {
  conditions.filter(Boolean).forEach(() => {
    throw new Error(message);
  });
}
function nextCallId(): string {
  callSequence += 1n;
  return `runtime-call-${callSequence.toString()}`;
}
async function readClock(clock: RuntimeClock): Promise<{ value: bigint; error?: 'CLOCK_READ_FAILED' }> {
  return Promise.resolve()
    .then(() => clock.monotonicNs())
    .then((value) => {
      const valid = [typeof value === 'bigint', value >= 0n].every(Boolean);
      return [{ value: 0n, error: 'CLOCK_READ_FAILED' as const }, { value }][Number(valid)]!;
    })
    .catch(() => ({ value: 0n, error: 'CLOCK_READ_FAILED' as const }));
}
async function safeStringProperty(error: unknown, property: 'message' | 'code'): Promise<string> {
  const objectLike = isObjectLike(error);
  const read = (): string => {
    const descriptor = Object.getOwnPropertyDescriptor(error as object, property);
    const emptyDescriptor = Object.create(null) as object;
    const descriptorObject = defined<object>([descriptor, emptyDescriptor]);
    const valid = [
      Object.hasOwn(descriptorObject, 'value'),
      typeof (descriptorObject as { value?: unknown }).value === 'string',
    ].every(Boolean);
    return [emptyText(), (descriptorObject as { value: string }).value.slice(0, 256).toLowerCase()][Number(valid)]!;
  };
  return Promise.resolve().then([emptyText, read][Number(objectLike)]!).catch(emptyText);
}
async function errorCode(error: unknown): Promise<RuntimeErrorCode> {
  const text = (): Promise<string> => Promise.resolve((error as string).slice(0, 256).toLowerCase());
  const message = await [() => safeStringProperty(error, 'message'), text][Number(typeof error === 'string')]!();
  const code = await safeStringProperty(error, 'code');
  const details = `${code} ${message}`;
  const rules: readonly [RuntimeErrorCode, readonly string[]][] = [
    ['DENIED', ['denied', 'authorization', 'approval']],
    ['CONFIG_CHANGED', ['config', 'topology']],
    ['CAS_FAILURE', ['cas', 'revision', 'fencing']],
    ['HOST_GAP', ['host', 'capability', 'native']],
    ['VALIDATION_ERROR', ['invalid', 'required', 'rejected']],
  ];
  const match = rules.find(([, terms]) => terms.some((term) => details.includes(term)));
  return defined([match?.[0], 'UNEXPECTED_ERROR' as const]);
}
function elapsedMilliseconds(elapsedNs: bigint): number {
  const elapsedNumber = Number(elapsedNs);
  return [() => Number.MAX_VALUE, () => elapsedNumber / 1_000_000][Number(Number.isFinite(elapsedNumber))]!();
}
function defaultSink(): RuntimeTimingSink {
  return Object.freeze({
    record: (event: RuntimeTimingEvent) => {
      const prefix = ['runtime call', 'runtime call requires optimization'][Number(event.optimization_required)];
      console.error(`${prefix}: ${JSON.stringify(event)}`);
    },
  });
}
function emit(sink: RuntimeTimingSink, event: RuntimeTimingEvent): void {
  void Promise.resolve()
    .then(() => sink.record(event))
    .catch(() => undefined);
}
async function finish(
  operation: RuntimeTimingOperation,
  callId: string,
  started: { value: bigint; error?: 'CLOCK_READ_FAILED' },
  sink: RuntimeTimingSink,
  thresholdMs: number,
  optimizationReason: string,
  outcome: RuntimeTimingEvent['outcome'],
  failure: unknown,
  clock: RuntimeClock,
): Promise<void> {
  const ended = await readClock(clock);
  const clockError = defined([started.error, ended.error]);
  const regressed = ended.value < started.value;
  const invalidElapsed = [clockError !== undefined, regressed].some(Boolean);
  const elapsedNs = [() => ended.value - started.value, () => 0n][Number(invalidElapsed)]!();
  const elapsedMs = elapsedMilliseconds(elapsedNs);
  const optimizationRequired = [!regressed, elapsedMs >= thresholdMs].every(Boolean);
  const errorClock = defined([clockError, 'CLOCK_REGRESSION' as const]);
  const event: RuntimeTimingEvent = {
    schema: 'RuntimeTiming/v1',
    operation,
    call_id: callId,
    started_at_ns: started.value.toString(),
    elapsed_ns: elapsedNs.toString(),
    elapsed_ms: elapsedMs,
    processing_time_ms: elapsedMs,
    threshold_ms: thresholdMs,
    within_budget: [!optimizationRequired, clockError === undefined, !regressed].every(Boolean),
    optimization_required: optimizationRequired,
    ...Object.fromEntries([['optimization_reason', optimizationReason]].filter(() => optimizationRequired)),
    ...Object.fromEntries(
      [
        ['optimization_reason', 'monotonic clock error'],
        ['clock_error', errorClock],
      ].filter(() => [clockError !== undefined, regressed].some(Boolean)),
    ),
    outcome,
    ...Object.fromEntries([['error_code', await errorCode(failure)]].filter(() => outcome === 'error')),
  } as RuntimeTimingEvent;
  emit(sink, event);
}
export function defaultRuntimeClock(): RuntimeClock {
  return systemClock;
}
export function defaultRuntimeTimingSink(): RuntimeTimingSink {
  return defaultSink();
}
export async function invokeTimed<T>(
  operation: RuntimeTimingOperation,
  action: () => T | Promise<T>,
  options: RuntimeTimingOptions = {},
): Promise<T> {
  const clock = defined([options.clock, systemClock]);
  const sink = defined([options.sink, defaultSink()]);
  const thresholdMs = defined([options.thresholdMs, RUNTIME_TIMING_THRESHOLD_MS]);
  reject([!Number.isFinite(thresholdMs), thresholdMs <= 0], 'runtime timing threshold must be positive');
  const optimizationReason = defined([options.optimizationReason, `runtime call exceeded ${thresholdMs}ms`]);
  const callId = nextCallId();
  const started = await readClock(clock);
  return Promise.resolve()
    .then(action)
    .then(
      async (value) => {
        await finish(operation, callId, started, sink, thresholdMs, optimizationReason, 'success', undefined, clock);
        return value;
      },
      async (error) => {
        await finish(operation, callId, started, sink, thresholdMs, optimizationReason, 'error', error, clock);
        throw error;
      },
    );
}
