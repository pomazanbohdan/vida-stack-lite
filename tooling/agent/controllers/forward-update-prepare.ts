import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  closeSync,
  constants,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertGeneratedRootAgents,
  inspectForwardUpdate,
  assertProjectOwnedIntegrationRetirement,
} from './forward-update-plan.ts';
import { verifyForwardReviewSet } from './forward-review-proof.ts';
import { assertForwardInvocationLock, withForwardInvocationLock } from './forward-invocation-lock.ts';
import {
  errorMessage,
  isRecord,
  prettyJSON as json,
  sha256 as sha,
} from '../../../packages/agent/src/contracts/forward-controller-values.ts';

type JsonRecord = Record<string, unknown>;
type Inspection = ReturnType<typeof inspectForwardUpdate>;
type Change = Inspection['changed'][number];
type LifecycleChange = Change & { readonly old_sha256: string; readonly new_sha256: string };
export type ForwardLock = {
  readonly schema: 'VidaForwardUpdateMaintenance/v1';
  readonly operation_id: string;
  readonly operator: string;
  readonly parent_generation: string;
  readonly parent_selector_sha256: string;
  readonly parent_cutoff_sha256: string;
  readonly first_admitted_work_attempt: string;
  readonly old_payload_manifest_sha256: string;
  readonly new_payload_manifest_sha256: string;
  readonly changed: readonly Change[];
  readonly preserved_mutable_outputs: readonly unknown[];
};
type ForwardEvent = JsonRecord & {
  readonly schema: 'VidaForwardUpdateEvent/v1';
  readonly operation_id: string;
  readonly lock_sha256: string;
  readonly phase: string;
  readonly path?: string;
};
type PayloadEntry =
  Parameters<typeof assertProjectOwnedIntegrationRetirement>[1] extends ReadonlyMap<string, infer Entry>
    ? Entry
    : never;
type PayloadManifest = { readonly files: readonly PayloadEntry[] };
type PhaseName = 'baseline' | 'verify' | 'closeout' | 'historical' | 'current' | 'current_verify';
type PhaseOutput = JsonRecord & {
  readonly status: 'baseline_ready' | 'closeout_verified';
  readonly closeout_sha256?: string;
  readonly receipt_path?: string;
  readonly event_id?: string;
  readonly event_timestamp?: string;
  readonly event_suffix_sha256?: string;
  readonly current_closeout_path?: string;
  readonly current_closeout_sha256?: string;
  readonly current_inventory_digest?: string;
  readonly repair_plan_digest?: string;
};
type ForwardOptions = {
  readonly root: string;
  readonly oldPayloadRoot: string;
  readonly payloadRoot: string;
  readonly operationId: string;
  readonly operator: string;
  readonly preserveConfiguredResearchChangelog?: boolean;
  readonly resume?: boolean;
  readonly invocationToken?: string | null;
  readonly onPhase?: (phase: string, path?: string) => void;
  readonly approvedRepair?: unknown;
  readonly documentationWorkId?: string | null;
  readonly completedReadonlyCapture?: string | null;
};
type DocumentationOptions = Pick<
  ForwardOptions,
  'root' | 'oldPayloadRoot' | 'payloadRoot' | 'approvedRepair' | 'documentationWorkId'
> & {
  readonly lock: ForwardLock;
};
function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isPayloadManifest(value: unknown): value is PayloadManifest {
  return (
    isRecord(value) &&
    isUnknownArray(value.files) &&
    value.files.every(
      (entry: unknown) =>
        isRecord(entry) &&
        typeof entry.path === 'string' &&
        typeof entry.sha256 === 'string' &&
        typeof entry.size === 'number',
    )
  );
}

export function isForwardLock(value: unknown): value is ForwardLock {
  return (
    isRecord(value) &&
    value.schema === 'VidaForwardUpdateMaintenance/v1' &&
    typeof value.operation_id === 'string' &&
    typeof value.operator === 'string' &&
    typeof value.parent_generation === 'string' &&
    typeof value.parent_selector_sha256 === 'string' &&
    typeof value.parent_cutoff_sha256 === 'string' &&
    typeof value.first_admitted_work_attempt === 'string' &&
    typeof value.old_payload_manifest_sha256 === 'string' &&
    typeof value.new_payload_manifest_sha256 === 'string' &&
    isUnknownArray(value.changed) &&
    value.changed.every(
      (entry: unknown) =>
        isRecord(entry) &&
        typeof entry.path === 'string' &&
        (typeof entry.old_sha256 === 'string' || entry.old_sha256 === null) &&
        typeof entry.new_sha256 === 'string' &&
        (typeof entry.old_size === 'number' || entry.old_size === null) &&
        typeof entry.new_size === 'number',
    ) &&
    isUnknownArray(value.preserved_mutable_outputs)
  );
}

function isForwardEvent(value: unknown): value is ForwardEvent {
  return (
    isRecord(value) &&
    value.schema === 'VidaForwardUpdateEvent/v1' &&
    typeof value.operation_id === 'string' &&
    typeof value.lock_sha256 === 'string' &&
    typeof value.phase === 'string' &&
    (value.path === undefined || typeof value.path === 'string')
  );
}

function reviewKind(item: unknown): unknown {
  if (item === null || item === undefined) throw new TypeError(`Cannot read properties of ${item} (reading 'kind')`);
  return Reflect.get(Object(item), 'kind');
}

function requireLifecycleChange(change: Change): LifecycleChange {
  const oldSha = change.old_sha256;
  const newSha = change.new_sha256;
  if (typeof oldSha !== 'string' || typeof newSha !== 'string') fail('lifecycle-only CLEAR change hashes invalid');
  return { ...change, old_sha256: oldSha, new_sha256: newSha };
}

function isPhaseOutput(value: unknown): value is PhaseOutput {
  return isRecord(value) && (value.status === 'baseline_ready' || value.status === 'closeout_verified');
}

function fail(message: string): never {
  throw new Error(`vida forward prepare: ${message}`);
}
const documentationPolicyPath = 'docs/agent-instructions/documentation-policy.v1.json';
const lifecycleInstructionPath = 'vida-agent/instructions/development-lifecycle.md';
const documentationPhaseScript = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'forward-documentation-phase.ts',
);
const lifecycleOnlyScript = path.join(path.dirname(fileURLToPath(import.meta.url)), 'forward-lifecycle-clear.ts');
function administrativeEnvironment(project: string, payloadRoot: string, operationId: string): NodeJS.ProcessEnv {
  const pin = readFileSync(path.join(payloadRoot, 'vida-agent/.bun-version'), 'utf8').trim();
  if (!/^\d+\.\d+\.\d+$/.test(pin) || !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(operationId))
    fail('administrative cache binding invalid');
  return {
    ...process.env,
    BUN_RUNTIME_TRANSPILER_CACHE_PATH: path.join(project, '.tmp', 'vida-bun-cache', 'vida-agent', pin, operationId),
  };
}
function requireDocumentationPhase(
  project: string,
  payloadRoot: string,
  phase: Extract<PhaseName, 'baseline' | 'verify' | 'closeout'>,
  successorManifest: string,
  operationId: string,
  documentationWorkId: string | null,
): PhaseOutput {
  const result = spawnSync(
    process.execPath,
    [
      path.join(path.resolve(payloadRoot), 'vida-agent/bin/bun.mjs'),
      documentationPhaseScript,
      project,
      phase,
      path.resolve(payloadRoot),
      successorManifest,
      operationId,
      documentationWorkId ?? '',
    ],
    {
      cwd: path.join(path.resolve(payloadRoot), 'vida-agent'),
      windowsHide: true,
      timeout: 120_000,
      encoding: 'utf8',
      env: administrativeEnvironment(project, payloadRoot, operationId),
    },
  );
  if (result.error || result.status !== 0)
    fail(`runtime documentation ${phase} blocked: ${result.stderr || result.error?.message}`);
  let output: unknown;
  try {
    output = JSON.parse(result.stdout.trim());
  } catch {
    fail(`runtime documentation ${phase} output invalid`);
  }
  if (!isPhaseOutput(output) || output.status !== (phase === 'baseline' ? 'baseline_ready' : 'closeout_verified'))
    fail(`runtime documentation ${phase} status invalid`);
  return output;
}
function requireLifecycleOnlyPhase(
  project: string,
  payloadRoot: string,
  phase: Extract<PhaseName, 'current_verify' | 'historical' | 'current' | 'baseline' | 'closeout'>,
  lock: ForwardLock,
  change: LifecycleChange,
  policyHash: string,
  approvedRepair: unknown = null,
  documentationWorkId: string | null = null,
): PhaseOutput {
  const result = spawnSync(
    process.execPath,
    [
      path.join(path.resolve(payloadRoot), 'vida-agent/bin/bun.mjs'),
      lifecycleOnlyScript,
      project,
      phase,
      lock.operation_id,
      change.old_sha256,
      change.new_sha256,
      policyHash,
      lock.old_payload_manifest_sha256,
      lock.new_payload_manifest_sha256,
      path.resolve(payloadRoot),
      documentationWorkId ?? '',
    ],
    {
      cwd: path.join(path.resolve(payloadRoot), 'vida-agent'),
      windowsHide: true,
      timeout: 120_000,
      encoding: 'utf8',
      env: administrativeEnvironment(project, payloadRoot, lock.operation_id),
    },
  );
  if (result.error || result.status !== 0)
    fail(`lifecycle-only CLEAR ${phase} blocked: ${result.stderr || result.error?.message}`);
  let output: unknown;
  try {
    output = JSON.parse(result.stdout.trim());
  } catch {
    fail(`lifecycle-only CLEAR ${phase} output invalid`);
  }
  if (!isPhaseOutput(output) || output.status !== (phase === 'baseline' ? 'baseline_ready' : 'closeout_verified'))
    fail(`lifecycle-only CLEAR ${phase} status invalid`);
  return output;
}
function file(location: string): Buffer {
  const stat = lstatSync(location);
  if (!stat.isFile() || stat.isSymbolicLink()) fail(`unsafe file: ${location}`);
  return readFileSync(location);
}
function directory(location: string): void {
  const stat = lstatSync(location);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail(`unsafe directory: ${location}`);
}
function exists(location: string): boolean {
  try {
    lstatSync(location);
    return true;
  } catch (error) {
    if (isRecord(error) && error.code === 'ENOENT') return false;
    throw error;
  }
}
function safeAt(root: string, relative: string): string {
  if (
    typeof relative !== 'string' ||
    !relative ||
    relative.includes('\\') ||
    relative.startsWith('/') ||
    relative.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':'))
  )
    fail('unsafe relative path');
  let parent = root;
  for (const part of relative.split('/').slice(0, -1)) {
    parent = path.join(parent, part);
    directory(parent);
  }
  return path.join(parent, relative.slice(relative.lastIndexOf('/') + 1));
}
function ensureAddedParent(root: string, relative: string): string {
  if (!relative.startsWith('vida-agent/')) fail('only bundle additions are supported');
  let current = root;
  for (const part of relative.split('/').slice(0, -1)) {
    current = path.join(current, part);
    if (!exists(current)) mkdirSync(current);
    directory(current);
  }
  return path.join(current, relative.slice(relative.lastIndexOf('/') + 1));
}
function exact(filePath: string, value: unknown): void {
  if (!file(filePath).equals(json(value))) fail(`durable record drift: ${filePath}`);
}
function authorize(project: string, workRoot: string, lock: ForwardLock): JsonRecord {
  const raw = file(path.join(workRoot, 'forward-authorization.v1.json'));
  let value: unknown;
  try {
    value = JSON.parse(raw.toString('utf8'));
  } catch {
    fail('invalid forward authorization');
  }
  const keys = ['schema', 'operation_id', 'operator', 'outcome', 'pointer', 'plan_sha256', 'evidence'];
  if (
    !isRecord(value) ||
    !value ||
    Object.keys(value).sort().join(',') !== keys.sort().join(',') ||
    !raw.equals(json(value)) ||
    value.schema !== 'VidaForwardUpdateAuthorization/v1' ||
    value.operation_id !== lock.operation_id ||
    value.operator !== lock.operator ||
    value.outcome !== 'approved' ||
    typeof value.pointer !== 'string' ||
    !value.pointer.trim() ||
    typeof value.plan_sha256 !== 'string' ||
    value.plan_sha256 !== sha(json(lock)) ||
    !isUnknownArray(value.evidence) ||
    value.evidence.length !== 3 ||
    value.evidence
      .map((item: unknown) => reviewKind(item))
      .sort((left, right) => {
        const leftText = String(left);
        const rightText = String(right);
        return leftText < rightText ? -1 : leftText > rightText ? 1 : 0;
      })
      .join(',') !== 'assurance,correctness,security'
  )
    fail('forward authorization does not bind exact plan and review set');
  try {
    verifyForwardReviewSet(project, lock.operation_id, value.plan_sha256, value.evidence);
  } catch (error) {
    fail(`forward review evidence invalid: ${errorMessage(error)}`);
  }
  return value;
}
function appendJournal(filePath: string, value: ForwardEvent): void {
  const fd = openSync(filePath, constants.O_CREAT | constants.O_APPEND | constants.O_WRONLY, 0o600);
  try {
    writeFileSync(fd, `${JSON.stringify(value)}\n`);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}
function journalEvents(filePath: string, operationId: string, lockSha: string): ForwardEvent[] {
  let raw: string;
  try {
    raw = file(filePath).toString('utf8');
  } catch (error: unknown) {
    if (isRecord(error) && error.code === 'ENOENT') return [];
    throw error;
  }
  if (raw && !raw.endsWith('\n')) fail('incomplete journal');
  const events: unknown[] = raw
    ? raw
        .trimEnd()
        .split('\n')
        .map((line): unknown => JSON.parse(line))
    : [];
  if (
    events.some(
      (event) =>
        !isForwardEvent(event) ||
        event.schema !== 'VidaForwardUpdateEvent/v1' ||
        event.operation_id !== operationId ||
        event.lock_sha256 !== lockSha ||
        ![
          'acquired',
          'file_replaced',
          'repair_prerequisite_validated',
          'documentation_closeout_verified',
          'documentation_current_closeout_verified',
          'bundle_prepared',
        ].includes(event.phase) ||
        (event.phase === 'file_replaced' && typeof event.path !== 'string'),
    )
  )
    fail('journal drift');
  return events.filter(isForwardEvent);
}

/** Finalize may only publish a lifecycle-only successor with the exact durable CLEAR proof. */
export function verifyLifecycleOnlyForward({
  root,
  oldPayloadRoot,
  payloadRoot,
  lock,
  approvedRepair = null,
  documentationWorkId = null,
}: DocumentationOptions): PhaseOutput | null {
  const lifecycle = lock.changed.find((entry) => entry.path === lifecycleInstructionPath);
  const policyChange = lock.changed.find((entry) => entry.path === documentationPolicyPath);
  if (!lifecycle || policyChange) return null;
  const lifecycleChange = requireLifecycleChange(lifecycle);
  const priorValue: unknown = JSON.parse(
    file(path.join(path.resolve(oldPayloadRoot), 'vida-agent-payload.manifest.v1.json')).toString('utf8'),
  );
  const nextValue: unknown = JSON.parse(
    file(path.join(path.resolve(payloadRoot), 'vida-agent-payload.manifest.v1.json')).toString('utf8'),
  );
  if (!isPayloadManifest(priorValue) || !isPayloadManifest(nextValue)) fail('payload manifest invalid');
  const prior = priorValue;
  const next = nextValue;
  const policyHash = prior.files.find((entry) => entry.path === documentationPolicyPath)?.sha256;
  if (!policyHash || next.files.find((entry) => entry.path === documentationPolicyPath)?.sha256 !== policyHash)
    fail('lifecycle-only CLEAR policy manifest changed');
  const proof = requireLifecycleOnlyPhase(
    path.resolve(root),
    payloadRoot,
    'current_verify',
    lock,
    lifecycleChange,
    policyHash,
    approvedRepair,
    documentationWorkId,
  );
  const lockSha = sha(json(lock));
  const events = journalEvents(
    path.join(path.resolve(root), `.agent/cutover/${lock.operation_id}/forward-journal.v1.jsonl`),
    lock.operation_id,
    lockSha,
  );
  const recorded = events.filter((event) => event.phase === 'documentation_closeout_verified');
  const current = events.filter((event) => event.phase === 'documentation_current_closeout_verified');
  const recordedCloseout = recorded[0];
  const recordedCurrent = current[0];
  if (
    recorded.length !== 1 ||
    !recordedCloseout ||
    recordedCloseout.closeout_sha256 !== proof.closeout_sha256 ||
    recordedCloseout.receipt_path !== proof.receipt_path ||
    recordedCloseout.event_id !== proof.event_id ||
    recordedCloseout.event_timestamp !== proof.event_timestamp ||
    recordedCloseout.event_suffix_sha256 !== proof.event_suffix_sha256 ||
    current.length !== 1 ||
    !recordedCurrent ||
    recordedCurrent.closeout_path !== proof.current_closeout_path ||
    recordedCurrent.closeout_sha256 !== proof.current_closeout_sha256 ||
    recordedCurrent.inventory_digest !== proof.current_inventory_digest ||
    recordedCurrent.repair_plan_digest !== proof.repair_plan_digest ||
    !events.some((event) => event.phase === 'bundle_prepared')
  )
    fail('lifecycle-only CLEAR journal proof missing or changed');
  return proof;
}

/** Recheck the selected branch's current CLEAR checkpoint without creating one. */
export function verifyCurrentForwardDocumentation(options: DocumentationOptions): PhaseOutput | null {
  const { root, oldPayloadRoot, payloadRoot, lock, approvedRepair = null, documentationWorkId = null } = options;
  if (lock.changed.some((entry) => entry.path === documentationPolicyPath)) {
    const proof = requireDocumentationPhase(
      path.resolve(root),
      payloadRoot,
      'verify',
      lock.new_payload_manifest_sha256,
      lock.operation_id,
      documentationWorkId,
    );
    const events = journalEvents(
      path.join(path.resolve(root), `.agent/cutover/${lock.operation_id}/forward-journal.v1.jsonl`),
      lock.operation_id,
      sha(json(lock)),
    );
    if (!events.some((event) => event.phase === 'bundle_prepared'))
      fail('runtime documentation bundle preparation proof missing');
    return proof;
  }
  return verifyLifecycleOnlyForward({ root, oldPayloadRoot, payloadRoot, lock, approvedRepair, documentationWorkId });
}

/** Retained journal labels reverify the same new authorized CLEAR cycle before selection. */
export function completeCurrentLifecycleOnlyForward({
  root,
  oldPayloadRoot,
  payloadRoot,
  lock,
  approvedRepair = null,
  documentationWorkId = null,
}: DocumentationOptions): PhaseOutput | null {
  const lifecycle = lock.changed.find((entry) => entry.path === lifecycleInstructionPath);
  const policyChange = lock.changed.find((entry) => entry.path === documentationPolicyPath);
  if (!lifecycle || policyChange) return null;
  const lifecycleChange = requireLifecycleChange(lifecycle);
  const priorValue: unknown = JSON.parse(
    file(path.join(path.resolve(oldPayloadRoot), 'vida-agent-payload.manifest.v1.json')).toString('utf8'),
  );
  const nextValue: unknown = JSON.parse(
    file(path.join(path.resolve(payloadRoot), 'vida-agent-payload.manifest.v1.json')).toString('utf8'),
  );
  if (!isPayloadManifest(priorValue) || !isPayloadManifest(nextValue)) fail('payload manifest invalid');
  const prior = priorValue;
  const next = nextValue;
  const policyHash = prior.files.find((entry) => entry.path === documentationPolicyPath)?.sha256;
  if (!policyHash || next.files.find((entry) => entry.path === documentationPolicyPath)?.sha256 !== policyHash)
    fail('lifecycle-only CLEAR policy manifest changed');
  const lockSha = sha(json(lock));
  const journalPath = path.join(path.resolve(root), `.agent/cutover/${lock.operation_id}/forward-journal.v1.jsonl`);
  const events = journalEvents(journalPath, lock.operation_id, lockSha);
  if (
    events.filter((event) => event.phase === 'documentation_closeout_verified').length !== 1 ||
    events.filter((event) => event.phase === 'bundle_prepared').length !== 1
  )
    fail('lifecycle-only CLEAR same-cycle journal proof missing');
  const historical = requireLifecycleOnlyPhase(
    path.resolve(root),
    payloadRoot,
    'historical',
    lock,
    lifecycleChange,
    policyHash,
    approvedRepair,
    documentationWorkId,
  );
  const recordedHistorical = events.find((event) => event.phase === 'documentation_closeout_verified');
  if (
    !recordedHistorical ||
    recordedHistorical.closeout_sha256 !== historical.closeout_sha256 ||
    recordedHistorical.receipt_path !== historical.receipt_path ||
    recordedHistorical.event_id !== historical.event_id ||
    recordedHistorical.event_timestamp !== historical.event_timestamp ||
    recordedHistorical.event_suffix_sha256 !== historical.event_suffix_sha256
  )
    fail('lifecycle-only CLEAR same-cycle event proof changed');
  const proof = requireLifecycleOnlyPhase(
    path.resolve(root),
    payloadRoot,
    'current',
    lock,
    lifecycleChange,
    policyHash,
    approvedRepair,
    documentationWorkId,
  );
  const recorded = events.filter((event) => event.phase === 'documentation_current_closeout_verified');
  const recordedCurrent = recorded[0];
  if (
    recorded.length > 1 ||
    (recorded.length === 1 &&
      (!recordedCurrent ||
        recordedCurrent.closeout_path !== proof.current_closeout_path ||
        recordedCurrent.closeout_sha256 !== proof.current_closeout_sha256 ||
        recordedCurrent.inventory_digest !== proof.current_inventory_digest ||
        recordedCurrent.repair_plan_digest !== proof.repair_plan_digest))
  )
    fail('lifecycle-only CLEAR current journal proof changed');
  if (!recorded.length)
    appendJournal(journalPath, {
      schema: 'VidaForwardUpdateEvent/v1',
      operation_id: lock.operation_id,
      lock_sha256: lockSha,
      phase: 'documentation_current_closeout_verified',
      closeout_path: proof.current_closeout_path,
      closeout_sha256: proof.current_closeout_sha256,
      inventory_digest: proof.current_inventory_digest,
      repair_plan_digest: proof.repair_plan_digest,
    });
  return proof;
}

/**
 * Proposal-only first transaction half. The lock deliberately remains held.
 * A matching selector reader, commit and release phase must be built before use.
 */
export function prepareForwardBundle(options: ForwardOptions): JsonRecord {
  if (!/^node(?:\.exe)?$/iu.test(path.basename(process.execPath)))
    fail('Node.js launcher required before forward effects');
  const { root, operationId, invocationToken = null } = options;
  if (invocationToken) {
    assertForwardInvocationLock(root, operationId, invocationToken);
    return prepareForwardBundleCore(options);
  }
  return withForwardInvocationLock(root, operationId, (token) =>
    prepareForwardBundleCore({ ...options, invocationToken: token }),
  );
}

function prepareForwardBundleCore({
  root,
  oldPayloadRoot,
  payloadRoot,
  operationId,
  operator,
  preserveConfiguredResearchChangelog = false,
  resume = false,
  onPhase,
  approvedRepair: _approvedRepair = null,
  documentationWorkId = null,
  completedReadonlyCapture = null,
}: ForwardOptions): JsonRecord {
  if (!/^[a-z0-9][a-z0-9._-]{0,79}$/.test(operationId) || !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(operator))
    fail('invalid operation identity');
  const project = path.resolve(root);
  const selector = file(safeAt(project, '.agent/active-runtime-selector.v1.json'));
  let current: JsonRecord;
  try {
    const parsed: unknown = JSON.parse(selector.toString('utf8'));
    if (!isRecord(parsed)) fail('invalid selector');
    current = parsed;
  } catch {
    fail('invalid selector');
  }
  const generation = current.generation;
  if (typeof generation !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(generation)) fail('invalid generation');
  const overlayPath = safeAt(project, `.agent/cutover/${generation}/maintenance-lock.v1.json`);
  const workRoot = safeAt(project, `.agent/cutover/${operationId}`);
  directory(workRoot);
  const intentPath = path.join(workRoot, 'forward-intent.v1.json');
  const journalPath = path.join(workRoot, 'forward-journal.v1.jsonl');
  let lock: ForwardLock;
  if (resume) {
    const parsedLock: unknown = JSON.parse(file(intentPath).toString('utf8'));
    if (!isForwardLock(parsedLock)) fail('resume intent identity differs');
    lock = parsedLock;
    if (
      lock.schema !== 'VidaForwardUpdateMaintenance/v1' ||
      lock.operation_id !== operationId ||
      lock.operator !== operator ||
      lock.parent_generation !== generation ||
      lock.parent_selector_sha256 !== sha(selector)
    )
      fail('resume intent identity differs');
    exact(intentPath, lock);
    authorize(project, workRoot, lock);
    if (!exists(overlayPath)) {
      const inspection = inspectForwardUpdate({
        root,
        oldPayloadRoot,
        payloadRoot,
        preserveConfiguredResearchChangelog,
      });
      if (
        !inspection.apply_ready ||
        inspection.selector_sha256 !== lock.parent_selector_sha256 ||
        inspection.cutoff_witness_sha256 !== lock.parent_cutoff_sha256 ||
        inspection.old_payload_manifest_sha256 !== lock.old_payload_manifest_sha256 ||
        inspection.new_payload_manifest_sha256 !== lock.new_payload_manifest_sha256 ||
        JSON.stringify(inspection.changed) !== JSON.stringify(lock.changed) ||
        JSON.stringify(inspection.preserved_mutable_outputs) !== JSON.stringify(lock.preserved_mutable_outputs)
      )
        fail('unlocked intent differs from current exact source tuple');
      const fd = openSync(overlayPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
      try {
        writeFileSync(fd, json(lock));
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
    }
  } else {
    const inspection = inspectForwardUpdate({ root, oldPayloadRoot, payloadRoot, preserveConfiguredResearchChangelog });
    if (!inspection.apply_ready) fail('installed drift requires explicit classification before update');
    if (operationId === inspection.generation) fail('new operation ID required');
    lock = {
      schema: 'VidaForwardUpdateMaintenance/v1',
      operation_id: operationId,
      operator,
      parent_generation: inspection.generation,
      parent_selector_sha256: inspection.selector_sha256,
      parent_cutoff_sha256: inspection.cutoff_witness_sha256,
      first_admitted_work_attempt: inspection.first_admitted_work_attempt,
      old_payload_manifest_sha256: inspection.old_payload_manifest_sha256,
      new_payload_manifest_sha256: inspection.new_payload_manifest_sha256,
      changed: inspection.changed,
      preserved_mutable_outputs: inspection.preserved_mutable_outputs,
    };
    authorize(project, workRoot, lock);
    const intentFd = openSync(intentPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
    try {
      writeFileSync(intentFd, json(lock));
      fsyncSync(intentFd);
    } finally {
      closeSync(intentFd);
    }
    onPhase?.('intent_written');
    const fd = openSync(overlayPath, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
    try {
      writeFileSync(fd, json(lock));
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
  }
  const lockSha = sha(json(lock));
  const events = journalEvents(journalPath, operationId, lockSha);
  if (!events.some((event) => event.phase === 'acquired')) {
    appendJournal(journalPath, {
      schema: 'VidaForwardUpdateEvent/v1',
      operation_id: operationId,
      lock_sha256: lockSha,
      phase: 'acquired',
    });
    onPhase?.('acquired');
  }
  exact(overlayPath, lock);
  if (sha(file(safeAt(project, '.agent/active-runtime-selector.v1.json'))) !== lock.parent_selector_sha256)
    fail('selector changed under maintenance');
  if (sha(file(safeAt(project, `.agent/cutover/${generation}/cutoff-witness.json`))) !== lock.parent_cutoff_sha256)
    fail('first-work witness changed under maintenance');
  if (
    sha(file(path.join(path.resolve(oldPayloadRoot), 'vida-agent-payload.manifest.v1.json'))) !==
      lock.old_payload_manifest_sha256 ||
    sha(file(path.join(path.resolve(payloadRoot), 'vida-agent-payload.manifest.v1.json'))) !==
      lock.new_payload_manifest_sha256
  )
    fail('staged manifest changed');
  if (completedReadonlyCapture !== null) {
    // The existing parent overlay denies normal execution throughout capture and
    // partial-success recovery. No HostState fence or bundle publication exists yet.
    const result = spawnSync(
      process.execPath,
      [
        path.join(path.resolve(payloadRoot), 'vida-agent/bin/bun.mjs'),
        path.join(path.resolve(payloadRoot), 'vida-agent/bin/capture-completed-readonly.mjs'),
        '--project-root',
        project,
        '--payload-root',
        path.resolve(payloadRoot),
        '--forward-operation',
        operationId,
        '--capture-request',
        completedReadonlyCapture,
      ],
      {
        cwd: project,
        encoding: 'utf8',
        windowsHide: true,
        timeout: 120_000,
        env: administrativeEnvironment(project, payloadRoot, operationId),
      },
    );
    if (result.error || result.status !== 0)
      fail(`completed readonly owner closure blocked: ${result.stderr || result.error?.message}`);
    let captured: unknown;
    try {
      captured = JSON.parse(result.stdout.trim());
    } catch {
      fail('completed readonly capture output invalid');
    }
    if (
      !isRecord(captured) ||
      captured.status !== 'captured_normalization_pending' ||
      captured.owner_released !== true ||
      captured.canonical_acceptance !== false ||
      captured.native_calls !== 0
    )
      fail('completed readonly closure result invalid');
    exact(overlayPath, lock);
    authorize(project, workRoot, lock);
    onPhase?.('completed_readonly_owner_closed');
  }
  const oldOwnershipValue: unknown = JSON.parse(
    file(path.join(path.resolve(oldPayloadRoot), 'vida-agent-payload.manifest.v1.json')).toString('utf8'),
  );
  const nextOwnershipValue: unknown = JSON.parse(
    file(path.join(path.resolve(payloadRoot), 'vida-agent-payload.manifest.v1.json')).toString('utf8'),
  );
  if (!isPayloadManifest(oldOwnershipValue) || !isPayloadManifest(nextOwnershipValue)) fail('payload manifest invalid');
  const oldOwnership = oldOwnershipValue;
  const nextOwnership = nextOwnershipValue;
  assertProjectOwnedIntegrationRetirement(
    project,
    new Map(oldOwnership.files.map((entry): [string, PayloadEntry] => [entry.path, entry])),
    new Map(nextOwnership.files.map((entry): [string, PayloadEntry] => [entry.path, entry])),
  );
  const prerequisite = new Set([
    'vida-agent/schemas/research-synthesis.v1.schema.json',
    'vida-agent/src/contracts/envelopes.ts',
    'vida-agent/src/host-state.ts',
    'vida-agent/src/orchestration/persistent-session-handoff.ts',
    'vida-agent/bin/repair-research-records.mjs',
    'vida-agent/bin/reconcile-artifacts.mjs',
    'vida-agent/package.json',
    'vida-agent/tests/reconcile-artifacts.test.mjs',
  ]);
  const requiresRepair = lock.changed.some(
    (entry) => entry.path === 'vida-agent/schemas/implementation-scope.v1.schema.json',
  );
  if (requiresRepair && !lock.changed.some((entry) => entry.path === 'vida-agent/bin/reconcile-artifacts.mjs'))
    fail('current-v1 schema change lacks bundle-owned repair command');
  const policyChange = lock.changed.find((entry) => entry.path === documentationPolicyPath);
  const lifecycleChange = lock.changed.find((entry) => entry.path === lifecycleInstructionPath);
  const lifecycleOnly = lifecycleChange && !policyChange;
  let lifecyclePolicyHash: string | null = null;
  if (lifecycleOnly) {
    const priorValue: unknown = JSON.parse(
      file(path.join(path.resolve(oldPayloadRoot), 'vida-agent-payload.manifest.v1.json')).toString('utf8'),
    );
    const nextValue: unknown = JSON.parse(
      file(path.join(path.resolve(payloadRoot), 'vida-agent-payload.manifest.v1.json')).toString('utf8'),
    );
    if (!isPayloadManifest(priorValue) || !isPayloadManifest(nextValue)) fail('payload manifest invalid');
    const prior = priorValue;
    const next = nextValue;
    const oldPolicy = prior.files.find((entry) => entry.path === documentationPolicyPath);
    const newPolicy = next.files.find((entry) => entry.path === documentationPolicyPath);
    if (
      !oldPolicy ||
      oldPolicy.sha256 !== newPolicy?.sha256 ||
      sha(file(safeAt(project, documentationPolicyPath))) !== oldPolicy.sha256 ||
      !/^[a-f0-9]{64}$/.test(lifecycleChange.old_sha256 ?? '') ||
      !/^[a-f0-9]{64}$/.test(lifecycleChange.new_sha256 ?? '')
    )
      fail('lifecycle-only CLEAR parent policy or instruction binding changed');
    lifecyclePolicyHash = oldPolicy.sha256;
  }
  if (policyChange) {
    if (!lifecycleChange) fail('policy transition requires declared lifecycle replacement');
    requireDocumentationPhase(
      project,
      payloadRoot,
      'baseline',
      lock.new_payload_manifest_sha256,
      operationId,
      documentationWorkId,
    );
    onPhase?.('documentation_baseline_ready');
  }
  // The public admitted successor now holds the real HostState fence before any prefix.
  const governed = new Set([documentationPolicyPath, lifecycleInstructionPath, 'vida-agent/TESTING.md']);
  const ordered = [
    ...lock.changed.filter((entry) => !governed.has(entry.path) && prerequisite.has(entry.path)),
    ...lock.changed.filter((entry) => !governed.has(entry.path) && !prerequisite.has(entry.path)),
    ...lock.changed.filter((entry) => governed.has(entry.path) && entry.path !== documentationPolicyPath),
    ...lock.changed.filter((entry) => entry.path === documentationPolicyPath),
  ];
  let repairValidated = !requiresRepair || events.some((event) => event.phase === 'repair_prerequisite_validated');
  const validateRepair = () => {
    if (repairValidated) return;
    const run = spawnSync(
      process.execPath,
      [path.join(project, 'vida-agent/bin/bun.mjs'), 'test', 'tests/reconcile-artifacts.test.mjs'],
      { cwd: path.join(project, 'vida-agent'), windowsHide: true, timeout: 120_000, encoding: 'utf8' },
    );
    if (run.error || run.status !== 0 || !run.output?.join('').includes('2 pass'))
      fail('installed bundle-owned repair command failed its pinned functional check');
    appendJournal(journalPath, {
      schema: 'VidaForwardUpdateEvent/v1',
      operation_id: operationId,
      lock_sha256: lockSha,
      phase: 'repair_prerequisite_validated',
    });
    onPhase?.('repair_prerequisite_validated');
    repairValidated = true;
  };
  for (const change of ordered) {
    if (lifecycleOnly && lifecycleChange && change.path === lifecycleInstructionPath) {
      const policyHash = lifecyclePolicyHash;
      if (!policyHash) fail('lifecycle-only CLEAR policy hash missing');
      requireLifecycleOnlyPhase(
        project,
        payloadRoot,
        'baseline',
        lock,
        requireLifecycleChange(lifecycleChange),
        policyHash,
        null,
        documentationWorkId,
      );
      onPhase?.('documentation_baseline_ready');
    }
    if (
      !change.path.startsWith('vida-agent/') &&
      change.path !== documentationPolicyPath &&
      change.path !== 'AGENTS.md'
    )
      fail('non-bundle replacement denied');
    if (change.path === 'AGENTS.md') assertGeneratedRootAgents(payloadRoot);
    const installedPath =
      change.old_sha256 === null ? ensureAddedParent(project, change.path) : safeAt(project, change.path);
    const replacement = file(safeAt(path.resolve(payloadRoot), change.path));
    if (sha(replacement) !== change.new_sha256 || replacement.length !== change.new_size)
      fail(`successor bytes changed: ${change.path}`);
    const currentBytes = exists(installedPath) ? file(installedPath) : null;
    if (change.old_sha256 === null && currentBytes === null) {
      const pending = `${installedPath}.pending-${randomUUID()}`;
      const fd = openSync(pending, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
      try {
        writeFileSync(fd, replacement);
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
      try {
        linkSync(pending, installedPath);
      } finally {
        unlinkSync(pending);
      }
    } else if (currentBytes && sha(currentBytes) === change.old_sha256 && currentBytes.length === change.old_size) {
      const pending = `${installedPath}.pending-${randomUUID()}`;
      const fd = openSync(pending, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
      try {
        writeFileSync(fd, replacement);
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
      if (sha(file(installedPath)) !== change.old_sha256) fail(`installed CAS lost: ${change.path}`);
      renameSync(pending, installedPath);
    } else if (!currentBytes || sha(currentBytes) !== change.new_sha256 || currentBytes.length !== change.new_size)
      fail(`third-party installed bytes: ${change.path}`);
    if (sha(file(installedPath)) !== change.new_sha256) fail(`publication failed: ${change.path}`);
    if (!events.some((event) => event.phase === 'file_replaced' && event.path === change.path)) {
      appendJournal(journalPath, {
        schema: 'VidaForwardUpdateEvent/v1',
        operation_id: operationId,
        lock_sha256: lockSha,
        phase: 'file_replaced',
        path: change.path,
      });
      onPhase?.('file_replaced', change.path);
    }
  }
  // The repair command's functional check must run against the complete installed
  // successor, not the first prerequisite prefix of a partially replaced bundle.
  if (requiresRepair) {
    const nextValue: unknown = JSON.parse(
      file(path.join(path.resolve(payloadRoot), 'vida-agent-payload.manifest.v1.json')).toString('utf8'),
    );
    if (!isPayloadManifest(nextValue)) fail('payload manifest invalid');
    const next = nextValue;
    for (const entry of next.files.filter((item) => item.path.startsWith('vida-agent/'))) {
      const installed = file(safeAt(project, entry.path));
      if (sha(installed) !== entry.sha256 || installed.length !== entry.size)
        fail(`incomplete installed repair successor: ${entry.path}`);
    }
  }
  validateRepair();
  if (policyChange) {
    const proof = requireDocumentationPhase(
      project,
      payloadRoot,
      'closeout',
      lock.new_payload_manifest_sha256,
      operationId,
      documentationWorkId,
    );
    const recorded = events.find((event) => event.phase === 'documentation_closeout_verified');
    if (
      recorded &&
      (recorded.closeout_sha256 !== proof.closeout_sha256 || recorded.receipt_path !== proof.receipt_path)
    )
      fail('policy transition journal proof changed');
    if (!recorded)
      appendJournal(journalPath, {
        schema: 'VidaForwardUpdateEvent/v1',
        operation_id: operationId,
        lock_sha256: lockSha,
        phase: 'documentation_closeout_verified',
        closeout_sha256: proof.closeout_sha256,
        receipt_path: proof.receipt_path,
      });
    onPhase?.('documentation_closeout_verified');
  } else if (lifecycleOnly && lifecycleChange) {
    const policyHash = lifecyclePolicyHash;
    if (!policyHash) fail('lifecycle-only CLEAR policy hash missing');
    const closeout = requireLifecycleOnlyPhase(
      project,
      payloadRoot,
      events.some((entry) => entry.phase === 'documentation_closeout_verified') ? 'historical' : 'closeout',
      lock,
      requireLifecycleChange(lifecycleChange),
      policyHash,
      null,
      documentationWorkId,
    );
    const event = events.find((entry) => entry.phase === 'documentation_closeout_verified');
    if (event) {
      if (
        event.closeout_sha256 !== closeout.closeout_sha256 ||
        event.receipt_path !== closeout.receipt_path ||
        event.event_id !== closeout.event_id ||
        event.event_timestamp !== closeout.event_timestamp ||
        event.event_suffix_sha256 !== closeout.event_suffix_sha256
      )
        fail('lifecycle-only CLEAR journal proof changed');
    } else {
      appendJournal(journalPath, {
        schema: 'VidaForwardUpdateEvent/v1',
        operation_id: operationId,
        lock_sha256: lockSha,
        phase: 'documentation_closeout_verified',
        closeout_sha256: closeout.closeout_sha256,
        receipt_path: closeout.receipt_path,
        event_id: closeout.event_id,
        ...(closeout.event_timestamp
          ? { event_timestamp: closeout.event_timestamp, event_suffix_sha256: closeout.event_suffix_sha256 }
          : {}),
      });
    }
    onPhase?.('documentation_closeout_verified');
  }
  if (!events.some((event) => event.phase === 'bundle_prepared')) {
    appendJournal(journalPath, {
      schema: 'VidaForwardUpdateEvent/v1',
      operation_id: operationId,
      lock_sha256: lockSha,
      phase: 'bundle_prepared',
    });
    onPhase?.('bundle_prepared');
  }
  return {
    schema: 'VidaForwardUpdatePrepareResult/v1',
    operation_id: operationId,
    status: 'maintenance_held_awaiting_selector',
    lock_sha256: lockSha,
  };
}
