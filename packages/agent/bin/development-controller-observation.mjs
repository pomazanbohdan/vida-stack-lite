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
import { spawnSync } from 'node:child_process';

const OBSERVATION_SCHEMA = 'DevelopmentControllerChildObservation/v1';
const RESERVATION_SCHEMA = 'DevelopmentControllerObservationReservation/v1';
const INTERNAL_PREFIX = 'VIDA_CONTROLLER_OBSERVATION_';
const NESTED_ROLES = new Set(['qualifier-repair-inspect', 'qualifier-repair-plan', 'qualifier-repair-apply']);
const packageRoot = path.resolve(import.meta.dirname, '..');

function fail(message) {
  throw new Error(`Development controller observation blocked: ${message}`);
}

function physicalDirectory(value) {
  if (!path.isAbsolute(value ?? '') || path.resolve(value) !== value || realpathSync(value) !== value)
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

function observationRoot(controllerRoot) {
  physicalDirectory(controllerRoot);
  const root = path.join(controllerRoot, 'observations');
  if (!existsSync(root)) mkdirSync(root, { mode: 0o700 });
  physicalDirectory(root);
  return root;
}

function durableExclusive(file, value) {
  const descriptor = openSync(file, 'wx', 0o600);
  try {
    writeFileSync(descriptor, JSON.stringify(value) + '\n');
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

function readReservation(observations, runId, token) {
  physicalDirectory(observations);
  const active = path.join(observations, 'active');
  physicalDirectory(active);
  const file = path.join(active, 'reservation.json');
  const info = lstatSync(file);
  if (!info.isFile() || info.isSymbolicLink()) fail('active reservation is not a regular file');
  const reservation = JSON.parse(readFileSync(file, 'utf8'));
  if (
    reservation.schema !== RESERVATION_SCHEMA ||
    reservation.status !== 'active' ||
    reservation.run_id !== runId ||
    reservation.token !== token ||
    reservation.observations_root !== observations ||
    !Array.isArray(reservation.expected_nested)
  )
    fail('active reservation identity differs');
  return { active, reservation };
}

function runtimeContext() {
  return {
    executable: process.execPath,
    runtime: process.release?.name ?? null,
    node_version: process.version,
    bun_version: process.versions.bun ?? null,
    pinned_bun_version: readFileSync(path.join(packageRoot, '.bun-version'), 'utf8').trim(),
  };
}

function errorRecord(error) {
  if (!error) return null;
  return {
    name: error.name ?? null,
    message: error.message ?? String(error),
    code: error.code ?? null,
    errno: error.errno ?? null,
    syscall: error.syscall ?? null,
    path: error.path ?? null,
  };
}

function capturedBytes(value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  return Buffer.from(value ?? '');
}

function childReceipt({
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
}) {
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
    runtime: runtimeContext(),
    started_at: startedAt,
    ended_at: new Date().toISOString(),
    elapsed_ms: Math.max(0, Math.round((endedClock - startedClock) * 1000) / 1000),
    timeout_ms: timeout ?? null,
    max_buffer_bytes: maxBuffer ?? null,
    exit_code: result.status ?? null,
    signal: result.signal ?? null,
    spawn_error: errorRecord(result.error),
    timed_out: result.error?.code === 'ETIMEDOUT',
    stdout_bytes: stdout.length,
    stderr_bytes: stderr.length,
    stdout_base64: stdout.toString('base64'),
    stderr_base64: stderr.toString('base64'),
    capture_status: terminal ? 'complete' : 'UNKNOWN',
  };
}

function runChild({ executable, args, cwd, env, timeout, maxBuffer }) {
  const startedClock = performance.now(),
    startedAt = new Date().toISOString();
  let result;
  try {
    const options = { cwd, env, encoding: null, windowsHide: true };
    if (timeout !== undefined) options.timeout = timeout;
    if (maxBuffer !== undefined) options.maxBuffer = maxBuffer;
    result = spawnSync(executable, args, options);
  } catch (error) {
    result = { error, status: null, signal: null, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0) };
  }
  return {
    result,
    receipt: childReceipt({
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

function validateNestedChildren(nestedChildren) {
  if (!Array.isArray(nestedChildren)) fail('nested child declaration is malformed');
  const sorted = [...nestedChildren].sort();
  if (
    new Set(sorted).size !== sorted.length ||
    sorted.some((role) => !NESTED_ROLES.has(role)) ||
    (sorted.length !== 0 && sorted.join('|') !== [...NESTED_ROLES].sort().join('|'))
  )
    fail('nested child declaration differs');
  return sorted;
}

function removeReservation(active, expectedBytes) {
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
}) {
  const expectedNested = validateNestedChildren(nestedChildren),
    observations = observationRoot(controllerRoot),
    active = path.join(observations, 'active'),
    runId = randomUUID(),
    token = randomBytes(32).toString('hex');
  try {
    mkdirSync(active, { mode: 0o700 });
  } catch (error) {
    if (error?.code === 'EEXIST') fail('another or unresolved compound invocation owns the observation reservation');
    throw error;
  }
  const runRoot = path.join(observations, runId);
  const reservation = {
    schema: RESERVATION_SCHEMA,
    run_id: runId,
    token,
    observations_root: observations,
    status: 'active',
    expected_nested: expectedNested,
    created_at: new Date().toISOString(),
  };
  const reservationBytes = Buffer.from(JSON.stringify(reservation) + '\n');
  try {
    durableExclusive(path.join(active, 'reservation.json'), reservation);
    mkdirSync(runRoot, { mode: 0o700 });
    mkdirSync(path.join(runRoot, 'nested'), { mode: 0o700 });
    durableExclusive(path.join(runRoot, 'invocation.json'), {
      schema: 'DevelopmentControllerObservationInvocation/v1',
      run_id: runId,
      expected_nested: expectedNested,
      created_at: reservation.created_at,
    });
  } catch (error) {
    // The exclusive active directory remains as a fail-closed custody marker.
    throw error;
  }

  const childEnv = { ...env };
  for (const key of Object.keys(childEnv)) if (key.startsWith(INTERNAL_PREFIX)) delete childEnv[key];
  if (expectedNested.length) {
    childEnv[`${INTERNAL_PREFIX}ROOT`] = observations;
    childEnv[`${INTERNAL_PREFIX}RUN_ID`] = runId;
    childEnv[`${INTERNAL_PREFIX}TOKEN`] = token;
    childEnv[`${INTERNAL_PREFIX}RUN_ROOT`] = runRoot;
  }
  const { result, receipt } = runChild({ executable, args, cwd, env: childEnv, timeout, maxBuffer });
  const rootReceipt = { ...receipt, role: 'controller-child' };
  durableExclusive(path.join(runRoot, 'controller-child.json'), rootReceipt);

  let nestedComplete = true;
  const nestedSummary = [];
  for (const role of expectedNested) {
    const file = path.join(runRoot, 'nested', `${role}.json`);
    if (!existsSync(file)) {
      nestedComplete = false;
      nestedSummary.push({ role, capture_status: 'UNKNOWN' });
      continue;
    }
    const nested = JSON.parse(readFileSync(file, 'utf8'));
    if (nested.role !== role || nested.capture_status !== 'complete') nestedComplete = false;
    nestedSummary.push({ role, capture_status: nested.capture_status ?? 'UNKNOWN' });
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

function internalContext() {
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
export function invokeNestedObservedControllerChild({ role, executable, args, cwd, timeout, maxBuffer }) {
  if (!NESTED_ROLES.has(role)) fail('nested role is undeclared');
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
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith(INTERNAL_PREFIX)) delete env[key];
  const { result, receipt } = runChild({ executable, args, cwd, env, timeout, maxBuffer });
  const nestedReceipt = { ...receipt, role, parent_id: context.runId };
  durableExclusive(receiptFile, nestedReceipt);
  if (receipt.capture_status === 'complete') unlinkSync(pending);
  return result;
}
