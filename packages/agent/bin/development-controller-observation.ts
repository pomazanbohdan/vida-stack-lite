import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import path from 'node:path';
import { spawnSync, type SpawnSyncOptionsWithBufferEncoding } from 'node:child_process';
import { Buffer } from 'node:buffer';

const OBSERVATION_SCHEMA = 'DevelopmentControllerChildObservation/v1';
const RESERVATION_SCHEMA = 'DevelopmentControllerObservationReservation/v1';
const INTERNAL_PREFIX = 'VIDA_CONTROLLER_OBSERVATION_';
type NestedRole = 'qualifier-repair-inspect' | 'qualifier-repair-plan' | 'qualifier-repair-apply';
const NESTED_ROLES = new Set<string>(['qualifier-repair-inspect', 'qualifier-repair-plan', 'qualifier-repair-apply']);
const packageRoot = path.resolve(import.meta.dirname, '..');

export interface ObservationReservation {
  readonly schema: typeof RESERVATION_SCHEMA;
  readonly status: 'active';
  readonly run_id: string;
  readonly token: string;
  readonly observations_root: string;
  readonly expected_nested: string[];
  readonly created_at: string;
}

export interface NestedObservationSummary {
  readonly role: string;
  readonly capture_status: string;
}

interface ChildError extends Error {
  readonly code?: string;
  readonly errno?: number | string;
  readonly syscall?: string;
  readonly path?: string;
}

export interface ChildResult {
  readonly status: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stdout: Buffer | Uint8Array | string | null;
  readonly stderr: Buffer | Uint8Array | string | null;
  readonly error?: unknown;
}

export interface ChildInvocation {
  readonly executable: string;
  readonly args: string[];
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly timeout?: number | undefined;
  readonly maxBuffer?: number | undefined;
}

export interface ChildObservation {
  readonly schema: typeof OBSERVATION_SCHEMA;
  readonly observation_id: string;
  readonly parent_id: string | null;
  readonly role: string;
  readonly executable: string;
  readonly args: string[];
  readonly parent_cwd: string;
  readonly child_cwd: string;
  readonly runtime: RuntimeContext;
  readonly started_at: string;
  readonly ended_at: string;
  readonly elapsed_ms: number;
  readonly timeout_ms: number | null;
  readonly max_buffer_bytes: number | null;
  readonly exit_code: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly spawn_error: SerializedChildError | null;
  readonly timed_out: boolean;
  readonly stdout_bytes: number;
  readonly stderr_bytes: number;
  readonly stdout_base64: string;
  readonly stderr_base64: string;
  readonly capture_status: 'complete' | 'UNKNOWN';
}

export interface ObservedChildResult extends ChildResult {
  readonly observation_complete: boolean;
}

interface RuntimeContext {
  readonly executable: string;
  readonly runtime: string | null;
  readonly node_version: string;
  readonly bun_version: string | null;
  readonly pinned_bun_version: string;
}

interface SerializedChildError {
  readonly name: string | null;
  readonly message: string;
  readonly code: string | null;
  readonly errno: number | string | null;
  readonly syscall: string | null;
  readonly path: string | null;
}

interface ChildReceiptInput {
  readonly runtime: RuntimeContext;
  readonly observationId: string;
  readonly parentId?: string | null | undefined;
  readonly role: string;
  readonly executable: string;
  readonly args: string[];
  readonly cwd: string;
  readonly timeout?: number | undefined;
  readonly maxBuffer?: number | undefined;
  readonly startedAt: string;
  readonly startedClock: number;
  readonly result: ChildResult;
}

interface ChildExecution {
  readonly result: ChildResult;
  readonly receipt: ChildObservation;
}

export interface ObservedControllerChildInvocation extends ChildInvocation {
  readonly controllerRoot: string;
  readonly nestedChildren?: readonly unknown[];
}

export interface NestedObservedControllerChildInvocation {
  readonly role: string;
  readonly executable: string;
  readonly args: string[];
  readonly cwd: string;
  readonly timeout?: number | undefined;
  readonly maxBuffer?: number | undefined;
}

/** @param {unknown} value */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** @param {unknown} value */
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry: unknown) => typeof entry === 'string');
}

/** @param {unknown} value */
function isObservationReservation(value: unknown): value is ObservationReservation {
  return (
    isRecord(value) &&
    value.schema === RESERVATION_SCHEMA &&
    value.status === 'active' &&
    typeof value.run_id === 'string' &&
    typeof value.token === 'string' &&
    typeof value.observations_root === 'string' &&
    isStringArray(value.expected_nested) &&
    typeof value.created_at === 'string'
  );
}

/** @param {unknown} error */
function isChildError(error: unknown): error is ChildError {
  return error instanceof Error && validErrorCodeFields(error) && validErrorLocationFields(error);
}

function validErrorCodeFields(error: Error): boolean {
  return (
    (!('code' in error) || error.code === undefined || typeof error.code === 'string') &&
    (!('errno' in error) ||
      error.errno === undefined ||
      typeof error.errno === 'number' ||
      typeof error.errno === 'string')
  );
}

function validErrorLocationFields(error: Error): boolean {
  return (
    (!('syscall' in error) || error.syscall === undefined || typeof error.syscall === 'string') &&
    (!('path' in error) || error.path === undefined || typeof error.path === 'string')
  );
}

function hasErrorCode(error: unknown, code: string): boolean {
  return isRecord(error) && error.code === code;
}

/** @param {unknown} value */
function isNestedRole(value: unknown): value is NestedRole {
  return (
    value === 'qualifier-repair-inspect' || value === 'qualifier-repair-plan' || value === 'qualifier-repair-apply'
  );
}

/** @param {unknown} value */
function isNestedReceipt(value: unknown): value is { readonly capture_status: string; readonly role: string } {
  return isRecord(value) && typeof value.capture_status === 'string' && typeof value.role === 'string';
}

function fail(message: string): never {
  throw new Error(`Development controller observation blocked: ${message}`);
}

function physicalDirectory(value: string): string {
  if (!path.isAbsolute(value) || path.resolve(value) !== value || realpathSync(value) !== value)
    fail('path is not a canonical physical directory');
  let current = value;
  for (;;) {
    const info = lstatSync(current);
    if (!info.isDirectory() || info.isSymbolicLink()) fail('path contains a linked directory');
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return value;
}

function observationRoot(controllerRoot: string): string {
  physicalDirectory(controllerRoot);
  const root = path.join(controllerRoot, 'observations');
  if (!existsSync(root)) mkdirSync(root, { mode: 0o700 });
  physicalDirectory(root);
  return root;
}

function durableExclusive(file: string, value: unknown): void {
  const descriptor = openSync(file, 'wx', 0o600);
  try {
    writeFileSync(descriptor, JSON.stringify(value) + '\n');
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function readReservation(
  observations: string,
  runId: string,
  token: string,
): { readonly active: string; readonly reservation: ObservationReservation } {
  physicalDirectory(observations);
  const active = path.join(observations, 'active');
  physicalDirectory(active);
  const file = path.join(active, 'reservation.json');
  const info = lstatSync(file);
  if (!info.isFile() || info.isSymbolicLink()) fail('active reservation is not a regular file');
  const parsedReservation: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (
    !isObservationReservation(parsedReservation) ||
    parsedReservation.run_id !== runId ||
    parsedReservation.token !== token ||
    parsedReservation.observations_root !== observations
  )
    fail('active reservation identity differs');
  return { active, reservation: parsedReservation };
}

function runtimeContext(): RuntimeContext {
  return {
    executable: process.execPath,
    runtime: process.release?.name ?? null,
    node_version: process.version,
    bun_version: process.versions.bun ?? null,
    pinned_bun_version: readFileSync(path.join(packageRoot, '.bun-version'), 'utf8').trim(),
  };
}

function errorRecord(error: unknown): SerializedChildError | null {
  if (!error) return null;
  return normalizedErrorRecord(error);
}

function normalizedErrorRecord(error: unknown): SerializedChildError {
  if (!isChildError(error)) return unrecognizedErrorRecord(error);
  return {
    name: error.name ?? null,
    message: error.message ?? String(error),
    code: error.code ?? null,
    errno: error.errno ?? null,
    syscall: error.syscall ?? null,
    path: error.path ?? null,
  };
}

function unrecognizedErrorRecord(error: unknown): SerializedChildError {
  let message = 'Unrecognized child error';
  try {
    message = typeof error === 'string' ? error : (JSON.stringify(error) ?? message);
  } catch {
    // Preserve a bounded fallback if an unknown error value cannot be serialized.
  }
  return { name: 'Error', message, code: null, errno: null, syscall: null, path: null };
}

function capturedBytes(value: Buffer | Uint8Array | string | null | undefined): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === 'string') return Buffer.from(value);
  return Buffer.alloc(0);
}

function childReceipt({
  runtime,
  observationId,
  parentId = null,
  role,
  executable,
  args,
  cwd,
  timeout,
  maxBuffer,
  startedAt,
  startedClock,
  result,
}: ChildReceiptInput): ChildObservation {
  const endedClock = performance.now();
  const stdout = capturedBytes(result.stdout),
    stderr = capturedBytes(result.stderr);
  const terminal = Number.isInteger(result.status) && result.signal == null && result.error == null;
  return {
    schema: OBSERVATION_SCHEMA,
    observation_id: observationId,
    parent_id: parentId,
    role,
    executable,
    args,
    parent_cwd: process.cwd(),
    child_cwd: cwd,
    runtime,
    started_at: startedAt,
    ended_at: new Date().toISOString(),
    elapsed_ms: Math.max(0, Math.round((endedClock - startedClock) * 1000) / 1000),
    timeout_ms: timeout ?? null,
    max_buffer_bytes: maxBuffer ?? null,
    exit_code: result.status ?? null,
    signal: result.signal ?? null,
    spawn_error: errorRecord(result.error),
    timed_out: hasErrorCode(result.error, 'ETIMEDOUT'),
    stdout_bytes: stdout.length,
    stderr_bytes: stderr.length,
    stdout_base64: stdout.toString('base64'),
    stderr_base64: stderr.toString('base64'),
    capture_status: terminal ? 'complete' : 'UNKNOWN',
  };
}

function runChild({ executable, args, cwd, env, timeout, maxBuffer }: ChildInvocation): ChildExecution {
  const runtime = Object.freeze(runtimeContext());
  const startedClock = performance.now(),
    startedAt = new Date().toISOString();
  let result: ChildResult;
  try {
    const options: SpawnSyncOptionsWithBufferEncoding = { cwd, env, encoding: null, windowsHide: true };
    if (timeout !== undefined) options.timeout = timeout;
    if (maxBuffer !== undefined) options.maxBuffer = maxBuffer;
    result = spawnSync(executable, args, options);
  } catch (error: unknown) {
    result = { error, status: null, signal: null, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
  }
  return {
    result,
    receipt: childReceipt({
      runtime,
      observationId: randomUUID(),
      role: 'child',
      executable,
      args,
      cwd,
      timeout,
      maxBuffer,
      startedAt,
      startedClock,
      result,
    }),
  };
}

function validateNestedChildren(nestedChildren: unknown): NestedRole[] {
  if (!isStringArray(nestedChildren)) fail('nested child declaration is malformed');
  const sorted = [...nestedChildren].sort();
  if (
    new Set(sorted).size !== sorted.length ||
    sorted.some((role) => !isNestedRole(role)) ||
    (sorted.length !== 0 && sorted.join('|') !== [...NESTED_ROLES].sort().join('|'))
  )
    fail('nested child declaration differs');
  return sorted.filter(isNestedRole);
}

function removeReservation(active: string, expectedBytes: Buffer): void {
  physicalDirectory(active);
  const file = path.join(active, 'reservation.json');
  if (!readFileSync(file).equals(expectedBytes)) fail('active reservation changed');
  unlinkSync(file);
  rmdirSync(active);
}

/** Run one independent controller child under a durable reservation for sensitive operator evidence. */
export function invokeObservedControllerChild({
  controllerRoot,
  executable,
  args,
  cwd,
  env,
  timeout,
  maxBuffer,
  nestedChildren = [],
}: ObservedControllerChildInvocation): ObservedChildResult {
  const expectedNested = validateNestedChildren(nestedChildren),
    observations = observationRoot(controllerRoot),
    active = path.join(observations, 'active'),
    runId = randomUUID(),
    token = randomBytes(32).toString('hex');
  try {
    mkdirSync(active, { mode: 0o700 });
  } catch (error: unknown) {
    if (hasErrorCode(error, 'EEXIST'))
      fail('another or unresolved compound invocation owns the observation reservation');
    throw error;
  }
  const runRoot = path.join(observations, runId);
  const reservation: ObservationReservation = {
    schema: RESERVATION_SCHEMA,
    run_id: runId,
    token,
    observations_root: observations,
    status: 'active',
    expected_nested: expectedNested,
    created_at: new Date().toISOString(),
  };
  const reservationBytes = Buffer.from(JSON.stringify(reservation) + '\n');
  durableExclusive(path.join(active, 'reservation.json'), reservation);
  mkdirSync(runRoot, { mode: 0o700 });
  mkdirSync(path.join(runRoot, 'nested'), { mode: 0o700 });
  durableExclusive(path.join(runRoot, 'invocation.json'), {
    schema: 'DevelopmentControllerObservationInvocation/v1',
    run_id: runId,
    expected_nested: expectedNested,
    created_at: reservation.created_at,
  });

  const childEnv: NodeJS.ProcessEnv = { ...env };
  for (const key of Object.keys(childEnv)) if (key.startsWith(INTERNAL_PREFIX)) delete childEnv[key];
  if (expectedNested.length) {
    childEnv[`${INTERNAL_PREFIX}ROOT`] = observations;
    childEnv[`${INTERNAL_PREFIX}RUN_ID`] = runId;
    childEnv[`${INTERNAL_PREFIX}TOKEN`] = token;
    childEnv[`${INTERNAL_PREFIX}RUN_ROOT`] = runRoot;
  }
  const { result, receipt } = runChild({ executable, args, cwd, env: childEnv, timeout, maxBuffer });
  const rootReceipt: ChildObservation = { ...receipt, role: 'controller-child' };
  durableExclusive(path.join(runRoot, 'controller-child.json'), rootReceipt);

  let nestedComplete = true;
  const nestedSummary: NestedObservationSummary[] = [];
  for (const role of expectedNested) {
    const file = path.join(runRoot, 'nested', `${role}.json`);
    if (!existsSync(file)) {
      nestedComplete = false;
      nestedSummary.push({ role, capture_status: 'UNKNOWN' });
      continue;
    }
    const parsedNested: unknown = JSON.parse(readFileSync(file, 'utf8'));
    if (!isNestedReceipt(parsedNested)) fail('nested observation receipt is malformed');
    if (parsedNested.role !== role || parsedNested.capture_status !== 'complete') nestedComplete = false;
    nestedSummary.push({ role, capture_status: parsedNested.capture_status ?? 'UNKNOWN' });
  }
  const complete = receipt.capture_status === 'complete' && nestedComplete;
  if (complete) {
    durableExclusive(path.join(runRoot, 'parent-complete.json'), {
      schema: 'DevelopmentControllerObservationCompletion/v1',
      run_id: runId,
      status: 'complete',
      controller_child: 'complete',
      nested: nestedSummary,
      completed_at: new Date().toISOString(),
    });
    removeReservation(active, reservationBytes);
  } else {
    durableExclusive(path.join(runRoot, 'parent-unknown.json'), {
      schema: 'DevelopmentControllerObservationCompletion/v1',
      run_id: runId,
      status: 'UNKNOWN',
      controller_child: receipt.capture_status,
      nested: nestedSummary,
      observed_at: new Date().toISOString(),
    });
    // Keep the active reservation. No implicit resume or reissue is allowed.
  }
  return { ...result, observation_complete: complete };
}

interface InternalContext {
  readonly observations: string;
  readonly runId: string;
  readonly token: string;
  readonly runRoot: string;
  readonly active: string;
  readonly reservation: ObservationReservation;
}

function internalContext(): InternalContext {
  const observations = process.env[`${INTERNAL_PREFIX}ROOT`],
    runId = process.env[`${INTERNAL_PREFIX}RUN_ID`],
    token = process.env[`${INTERNAL_PREFIX}TOKEN`],
    runRoot = process.env[`${INTERNAL_PREFIX}RUN_ROOT`];
  if (!observations || !runId || !token || !runRoot) fail('nested invocation lacks its active compound context');
  physicalDirectory(observations);
  if (
    path.basename(observations) !== 'observations' ||
    path.dirname(runRoot) !== observations ||
    path.basename(runRoot) !== runId
  )
    fail('nested observation location differs');
  physicalDirectory(runRoot);
  const { active, reservation } = readReservation(observations, runId, token);
  if (reservation.expected_nested.length !== NESTED_ROLES.size) fail('nested reservation is incomplete');
  return { observations, runId, token, runRoot, active, reservation };
}

/** Capture one fixed qualification child under its active parent reservation. */
export function invokeNestedObservedControllerChild({
  role,
  executable,
  args,
  cwd,
  timeout,
  maxBuffer,
}: NestedObservedControllerChildInvocation): ChildResult {
  if (!isNestedRole(role)) fail('nested role is undeclared');
  const context = internalContext();
  if (!context.reservation.expected_nested.includes(role)) fail('nested role is not declared by the active parent');
  const nestedRoot = path.join(context.runRoot, 'nested'),
    pending = path.join(nestedRoot, `${role}.pending.json`),
    receiptFile = path.join(nestedRoot, `${role}.json`);
  if (existsSync(pending) || existsSync(receiptFile)) fail('nested child was already issued');
  durableExclusive(pending, {
    schema: 'DevelopmentControllerObservationNestedPending/v1',
    run_id: context.runId,
    role,
    started_at: new Date().toISOString(),
  });
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith(INTERNAL_PREFIX)) delete env[key];
  const { result, receipt } = runChild({ executable, args, cwd, env, timeout, maxBuffer });
  const nestedReceipt: ChildObservation = { ...receipt, role, parent_id: context.runId };
  durableExclusive(receiptFile, nestedReceipt);
  if (receipt.capture_status === 'complete') unlinkSync(pending);
  return result;
}
