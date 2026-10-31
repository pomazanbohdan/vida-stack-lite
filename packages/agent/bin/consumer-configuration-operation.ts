import { createHash } from 'node:crypto';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import schema from '../schemas/consumer-configuration-operation.v1.schema.json' with { type: 'json' };
import { validateRuntimeInitializationReceipt } from '../src/config/initialization-record.ts';
import { readRuntimePackageResourceText, runtimePackageAccess } from '../src/config/runtime-config.ts';
import { repositoryReadOnlyObservation, requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { canonicalRepositoryRoot, deriveWorkspaceId } from '../src/workspace-identity.ts';
import { withExclusiveInitConfigAdmission } from '../src/config/storage-read-admission.ts';
import { captureConsumerConfiguration, captureConsumerConfigurationForRecovery } from './init-configuration.ts';
import type { ConsumerConfigurationRequest } from './init-configuration.ts';
import { RUNTIME_INITIALIZATION_PATH } from '../src/config/project-paths.ts';
import { derivePendingConfigurationReceipt } from './init-core.ts';
import { parseConsumerProjectMoves, rebaseDocumentationPolicy } from './consumer-project-relocation.ts';
import { parseRuntimeConfigYaml } from '../src/config/runtime-config.ts';
import { projectMappings } from './project-mapping-contract.ts';

interface Bytes {
  readonly base64: string;
  readonly sha256: string;
}
type MoveState = 'not-started' | 'issued' | 'completed';
interface FrozenRelocation {
  readonly inventory: readonly {
    readonly move: { readonly id: string; readonly oldRoot: string; readonly newRoot: string };
    readonly rootIdentity: string;
    readonly destinationIdentity: string;
    readonly directories: readonly {
      readonly path: string;
      readonly identity: string;
      readonly entries: readonly string[];
    }[];
    readonly targetDirectories?: readonly { readonly path: string; readonly identity: string }[];
    readonly pendingDirectory?: string;
    readonly files: readonly {
      readonly source: string;
      readonly destination: string;
      readonly identity: string;
      readonly sha256: string;
      readonly size: number;
      readonly state: MoveState;
    }[];
  }[];
  readonly policy: { readonly before: Bytes; readonly target: Bytes; readonly state: MoveState };
}
export interface ConsumerConfigurationOperation {
  readonly schema: 'ConsumerConfigurationOperation/v1';
  readonly version: 1;
  readonly operation_id: string;
  readonly root: string;
  readonly root_identity: string;
  readonly workspace_id: string;
  readonly request: ConsumerConfigurationRequest;
  readonly binding: string;
  readonly before: readonly Bytes[];
  readonly target: Bytes;
  readonly receipt: { readonly before: Bytes; readonly target: Bytes } | null;
  readonly relocation?: FrozenRelocation;
  readonly progress: 'intent' | 'config_applied' | 'receipt_applied' | 'complete';
}

type AjvConstructor = new (options: Record<string, unknown>) => { compile<T>(schema: object): ValidateFunction<T> };
const Constructor = Ajv2020 as unknown as AjvConstructor;
const validate = new Constructor({
  strict: true,
  allErrors: false,
  ownProperties: true,
}).compile<ConsumerConfigurationOperation>(schema);
const validateRelocation = new Constructor({
  strict: true,
  allErrors: false,
  ownProperties: true,
}).compile<FrozenRelocation>({ $defs: schema.$defs, $ref: '#/$defs/relocation' });
const pending = '.agent/runtime-initialization.pending.v1.json';
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

/** Validate the complete frozen record and each retained byte string. */
export function validateConsumerConfigurationOperation(value: unknown): ConsumerConfigurationOperation {
  if (!validate(value)) throw new Error('Invalid consumer configuration operation');
  for (const entry of [
    ...value.before,
    value.target,
    ...(value.receipt ? [value.receipt.before, value.receipt.target] : []),
  ]) {
    const bytes = Buffer.from(entry.base64, 'base64');
    if (bytes.toString('base64') !== entry.base64 || createHash('sha256').update(bytes).digest('hex') !== entry.sha256)
      throw new Error('Consumer configuration operation bytes differ from digest');
  }
  if (
    value.request.projectRoot !== value.root ||
    deriveWorkspaceId(value.request.repository, value.root) !== value.workspace_id
  )
    throw new Error('Consumer configuration operation identity differs');
  if (value.relocation) {
    // The shared pending reader accepts at most 8 MiB, including the serialized newline.
    if (Buffer.byteLength(JSON.stringify(value) + '\n') > 8 * 1024 * 1024)
      throw new Error('Relocation operation exceeds pending reader limit');
    validateFrozenRelocation({ ...value, relocation: value.relocation });
  } else if ((value.request.projectMoves ?? []).length) throw new Error('Missing relocation inventory');
  return value;
}

/** Observe only. A valid record conveys no right to resume it. */
export function inspectConsumerConfigurationOperation(projectRoot: string): {
  readonly status: 'no_pending' | 'configuration_pending' | 'legacy_initialization_pending' | 'unknown_pending';
} {
  if (
    !path.isAbsolute(projectRoot) ||
    path.resolve(projectRoot) !== projectRoot ||
    canonicalRepositoryRoot(projectRoot) !== projectRoot
  )
    throw new Error('Project root must be canonical and physical');
  const view = repositoryReadOnlyObservation(requireSafeRepositoryAccess(projectRoot));
  if (!view.fileExists(pending, 'pending initialization')) return { status: 'no_pending' };
  try {
    const value: unknown = JSON.parse(decoder.decode(view.readBytes(pending, 'pending initialization')));
    try {
      const operation = validateConsumerConfigurationOperation(value);
      return { status: operation.root === projectRoot ? 'configuration_pending' : 'unknown_pending' };
    } catch {
      const raw = readRuntimePackageResourceText(
        runtimePackageAccess(),
        'schemas/runtime-initialization.v1.schema.json',
        'initialization schema',
      );
      validateRuntimeInitializationReceipt(value, raw);
      return { status: 'legacy_initialization_pending' };
    }
  } catch {
    return { status: 'unknown_pending' };
  }
}

const configPath = 'agent-runtime.config.v1.yaml';
const sha = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const encoded = (bytes: Uint8Array): Bytes => ({ base64: Buffer.from(bytes).toString('base64'), sha256: sha(bytes) });
const decoded = (entry: Bytes): Buffer => Buffer.from(entry.base64, 'base64');
const serialize = (record: ConsumerConfigurationOperation): string => JSON.stringify(record) + '\n';
const archivePath = (id: string): string => `.agent/consumer-configuration-operation.${id}.v1.json`;
const policyPath = 'docs/agent-instructions/documentation-policy.v1.json';
type Completion = {
  readonly operation_id: string;
  readonly status: 'completed';
  readonly relocation?: {
    readonly source_directories_retained: number;
    readonly source_empty_directories_retained: number;
  };
};

/** Freeze only the qualified capture. Recovery must requalify each original object before reading its bytes. */
export function freezeConsumerRelocation(
  request: ConsumerConfigurationRequest,
  capture: ReturnType<typeof captureConsumerConfiguration>,
  rootIdentity: string,
): FrozenRelocation {
  const relocation: FrozenRelocation = {
    inventory: capture.relocationInventory.map((item) => ({
      ...item,
      files: item.files.map(({ source, destination, identity, sha256, bytes }) => {
        if (sha(bytes) !== sha256) throw new Error('Relocation capture bytes differ from digest');
        return { source, destination, identity, sha256, size: bytes.length, state: 'not-started' as const };
      }),
    })),
    policy: {
      before: encoded(capture.before[3]!),
      target: encoded(Buffer.from(capture.targetPolicy)),
      state: 'not-started',
    },
  };
  validateFrozenRelocation({
    request,
    before: capture.before.map(encoded),
    target: encoded(Buffer.from(capture.targetConfig)),
    root_identity: rootIdentity,
    relocation,
  });
  if (
    JSON.stringify(capture.plan.request.project_moves) !== JSON.stringify(relocation.inventory.map((item) => item.move))
  )
    throw new Error('Relocation capture differs from plan');
  return relocation;
}

type RelocationValidationInput = Pick<
  ConsumerConfigurationOperation,
  'request' | 'before' | 'target' | 'root_identity'
> & { readonly relocation: FrozenRelocation };

function validateFrozenRelocation(record: RelocationValidationInput): void {
  const journal = record.relocation;
  if (!validateRelocation(journal)) throw new Error('Invalid relocation schema');
  const checkBytes = (entry: Bytes) => {
    const bytes = decoded(entry);
    if (bytes.toString('base64') !== entry.base64 || sha(bytes) !== entry.sha256)
      throw new Error('Relocation bytes differ from digest');
    return bytes;
  };
  const beforePolicy = checkBytes(journal.policy.before);
  const targetPolicy = checkBytes(journal.policy.target);
  if (!beforePolicy.equals(decoded(record.before[3]!))) throw new Error('Relocation policy before differs');
  const beforeConfig = parseRuntimeConfigYaml(decoder.decode(decoded(record.before[2]!)));
  const afterConfig = parseRuntimeConfigYaml(decoder.decode(decoded(record.target)));
  const desired = projectMappings(record.request.projectMappings);
  const moves = parseConsumerProjectMoves(
    record.request.projectMoves,
    new Map(beforeConfig.projects.map((project) => [project.project_id, project.project_root])),
    desired,
  );
  if (
    !moves.length ||
    JSON.stringify(moves) !== JSON.stringify(journal.inventory.map((item) => item.move)) ||
    moves.some(
      (move) => afterConfig.projects.find((project) => project.project_id === move.id)?.project_root !== move.newRoot,
    ) ||
    !Buffer.from(rebaseDocumentationPolicy(decoder.decode(beforePolicy), moves)).equals(targetPolicy)
  )
    throw new Error('Relocation request or policy differs');
  const device = (identity: string, directory: boolean): string => {
    const id: unknown = JSON.parse(identity);
    if (
      !id ||
      typeof id !== 'object' ||
      Array.isArray(id) ||
      !('birthtime_ns' in id) ||
      !('dev' in id) ||
      !('ino' in id) ||
      typeof id.birthtime_ns !== 'string' ||
      typeof id.dev !== 'string' ||
      typeof id.ino !== 'string' ||
      !/^[1-9][0-9]*$/.test(id.birthtime_ns) ||
      !/^[1-9][0-9]*$/.test(id.dev) ||
      !/^[1-9][0-9]*$/.test(id.ino) ||
      (directory ? !('mode' in id) || typeof id.mode !== 'string' || !/^[1-9][0-9]*$/.test(id.mode) : 'mode' in id) ||
      Object.keys(id).length !== (directory ? 4 : 3) ||
      identity !==
        (directory && 'mode' in id
          ? JSON.stringify({ birthtime_ns: id.birthtime_ns, dev: id.dev, ino: id.ino, mode: id.mode })
          : JSON.stringify({ birthtime_ns: id.birthtime_ns, dev: id.dev, ino: id.ino }))
    )
      throw new Error('Invalid relocation identity');
    return id.dev;
  };
  const entryName = (name: string): boolean =>
    /^[A-Za-z0-9._-]+$/.test(name) &&
    name !== '.' &&
    name !== '..' &&
    !name.endsWith('.') &&
    !['.git', '.vida', '.agent', '.planning'].includes(name.toLowerCase()) &&
    !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name);
  for (const item of journal.inventory) {
    if (
      item.rootIdentity !== record.root_identity ||
      device(item.destinationIdentity, true) !== device(item.rootIdentity, true) ||
      item.directories.length + item.files.length > 10000
    )
      throw new Error('Invalid relocation inventory');
    const paths = new Set<string>();
    const children = new Map<string, string[]>();
    let total = 0;
    for (const dir of item.directories) {
      if (
        (dir.path !== item.move.oldRoot && !dir.path.startsWith(item.move.oldRoot + '/')) ||
        device(dir.identity, true) !== device(item.rootIdentity, true) ||
        paths.has(dir.path.toLowerCase()) ||
        dir.entries.some((name) => !entryName(name)) ||
        new Set(dir.entries.map((name) => name.toLowerCase())).size !== dir.entries.length ||
        JSON.stringify([...dir.entries].sort()) !== JSON.stringify(dir.entries)
      )
        throw new Error('Invalid relocation directory');
      paths.add(dir.path.toLowerCase());
      children.set(dir.path, []);
    }
    if (!children.has(item.move.oldRoot)) throw new Error('Missing relocation source directory');
    const targetDirs = new Set<string>([item.move.newRoot.toLowerCase()]);
    for (const dir of item.targetDirectories ?? []) {
      const source = item.move.oldRoot + dir.path.slice(item.move.newRoot.length);
      if (
        !dir.path.startsWith(item.move.newRoot + '/') ||
        !children.has(source) ||
        targetDirs.has(dir.path.toLowerCase()) ||
        device(dir.identity, true) !== device(item.rootIdentity, true)
      )
        throw new Error('Invalid relocation target directory');
      targetDirs.add(dir.path.toLowerCase());
    }
    for (const dir of item.targetDirectories ?? [])
      if (!targetDirs.has(dir.path.slice(0, dir.path.lastIndexOf('/')).toLowerCase()))
        throw new Error('Missing relocation target parent');
    if (item.pendingDirectory) {
      const pendingDir = item.pendingDirectory;
      const source = item.move.oldRoot + pendingDir.slice(item.move.newRoot.length);
      if (
        !pendingDir.startsWith(item.move.newRoot + '/') ||
        !children.has(source) ||
        targetDirs.has(pendingDir.toLowerCase()) ||
        !targetDirs.has(pendingDir.slice(0, pendingDir.lastIndexOf('/')).toLowerCase())
      )
        throw new Error('Invalid pending relocation directory');
    }
    for (const file of item.files) {
      total += file.size;
      if (
        !file.source.startsWith(item.move.oldRoot + '/') ||
        file.destination !== item.move.newRoot + file.source.slice(item.move.oldRoot.length) ||
        device(file.identity, false) !== device(item.rootIdentity, true) ||
        paths.has(file.source.toLowerCase())
      )
        throw new Error('Invalid relocation file');
      paths.add(file.source.toLowerCase());
    }
    if (total > 32 * 1024 * 1024) throw new Error('Relocation inventory exceeds limit');
    for (const name of [...item.directories.map((dir) => dir.path), ...item.files.map((file) => file.source)]) {
      if (name === item.move.oldRoot) continue;
      const slash = name.lastIndexOf('/');
      const parent = name.slice(0, slash);
      const leaf = name.slice(slash + 1);
      if (!entryName(leaf) || !children.has(parent)) throw new Error('Invalid relocation tree');
      children.get(parent)!.push(leaf);
    }
    for (const dir of item.directories)
      if (JSON.stringify(children.get(dir.path)!.sort()) !== JSON.stringify(dir.entries))
        throw new Error('Relocation listing differs');
  }
  if (journal.inventory.filter((item) => item.pendingDirectory).length > 1)
    throw new Error('Multiple relocation directories are pending');
  if (
    journal.policy.state !== 'not-started' &&
    journal.inventory.some((item) => item.pendingDirectory || item.files.some((file) => file.state !== 'completed'))
  )
    throw new Error('Relocation policy precedes file completion');
}

function rootIdentity(root: string): string {
  if (!path.isAbsolute(root) || path.resolve(root) !== root || canonicalRepositoryRoot(root) !== root)
    throw new Error('Project root must be canonical and physical');
  return requireSafeRepositoryAccess(root).directoryIdentity('.', 'configuration root');
}

function sameRequest(left: ConsumerConfigurationRequest, right: ConsumerConfigurationRequest): boolean {
  return (
    left.projectRoot === right.projectRoot &&
    left.repository === right.repository &&
    JSON.stringify(left.projectMappings) === JSON.stringify(right.projectMappings) &&
    JSON.stringify(left.teamProjectGrants ?? []) === JSON.stringify(right.teamProjectGrants ?? []) &&
    JSON.stringify(left.projectMoves ?? []) === JSON.stringify(right.projectMoves ?? [])
  );
}

/** Start one configuration operation from a freshly bound plan. */
export async function applyConsumerConfiguration(
  request: ConsumerConfigurationRequest,
  expectedBinding: string,
  operationId: string,
): Promise<Completion> {
  const frozenRequest = structuredClone(request);
  const root = frozenRequest.projectRoot;
  const initialIdentity = rootIdentity(root);
  if (!/^[a-f0-9]{64}$/.test(expectedBinding) || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(operationId))
    throw new Error('Invalid operation identity or binding');
  const workspace = deriveWorkspaceId(frozenRequest.repository, root);
  return withExclusiveInitConfigAdmission(root, workspace, async (proof) => {
    proof.assertActive();
    if (rootIdentity(root) !== initialIdentity) throw new Error('Root identity changed');
    const access = requireSafeRepositoryAccess(root);
    if (access.fileExists(archivePath(operationId), 'configuration archive'))
      throw new Error('Configuration archive already exists');
    const capture = captureConsumerConfiguration(frozenRequest);
    if (capture.plan.binding !== expectedBinding) throw new Error('Configuration plan binding changed');
    if (capture.plan.operation_id !== operationId)
      throw new Error('Configuration operation identity differs from plan');
    const derived = capture.receipt ? await derivePendingConfigurationReceipt(frozenRequest, proof.assertActive) : null;
    if (derived && (derived.plan.binding !== capture.plan.binding || !derived.beforeReceipt.equals(capture.receipt!)))
      throw new Error('Receipt inputs changed before intent');
    const record: ConsumerConfigurationOperation = {
      schema: 'ConsumerConfigurationOperation/v1',
      version: 1,
      operation_id: operationId,
      root,
      root_identity: initialIdentity,
      workspace_id: workspace,
      request: frozenRequest,
      binding: capture.plan.binding,
      before: capture.before.map(encoded),
      target: encoded(Buffer.from(capture.targetConfig)),
      receipt: derived
        ? { before: encoded(derived.beforeReceipt), target: encoded(Buffer.from(derived.targetReceipt)) }
        : null,
      ...(capture.relocationInventory.length
        ? { relocation: freezeConsumerRelocation(frozenRequest, capture, initialIdentity) }
        : {}),
      progress: 'intent',
    };
    validateConsumerConfigurationOperation(record);
    proof.assertActive();
    if (rootIdentity(root) !== initialIdentity) throw new Error('Root identity changed');
    await access.ensureDirectoryAsync('.agent', 'configuration namespace');
    proof.assertActive();
    if (rootIdentity(root) !== initialIdentity) throw new Error('Root identity changed');
    access.assertDirectory('.agent', 'configuration namespace');
    if (access.fileExists(archivePath(operationId), 'configuration archive'))
      throw new Error('Configuration archive already exists');
    const fresh = captureConsumerConfiguration(frozenRequest);
    if (
      (fresh.receipt === null) !== (record.receipt === null) ||
      (fresh.receipt && record.receipt && !fresh.receipt.equals(decoded(record.receipt.before))) ||
      fresh.plan.binding !== record.binding ||
      fresh.plan.operation_id !== record.operation_id ||
      !Buffer.from(fresh.targetConfig).equals(decoded(record.target))
    )
      throw new Error('Configuration binding changed before intent');
    await access.writeExclusiveAtomicAsync(pending, serialize(record), 'configuration intent');
    return finishOperation(record, Buffer.from(serialize(record)), proof);
  });
}

/** Resume only the exact owned journal and its observed old or target state. */
export async function resumeConsumerConfiguration(
  request: ConsumerConfigurationRequest,
  operationId: string,
): Promise<Completion> {
  if (typeof operationId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(operationId))
    throw new Error('Invalid operation identity');
  const frozenRequest = structuredClone(request);
  const root = frozenRequest.projectRoot;
  const identity = rootIdentity(root);
  const workspace = deriveWorkspaceId(frozenRequest.repository, root);
  return withExclusiveInitConfigAdmission(root, workspace, async (proof) => {
    proof.assertActive();
    const access = requireSafeRepositoryAccess(root);
    const view = repositoryReadOnlyObservation(access);
    const hasPending = view.fileExists(pending, 'configuration intent');
    const archive = archivePath(operationId);
    const hasArchive = view.fileExists(archive, 'configuration archive');
    const pendingBytes = hasPending ? view.readBytes(pending, 'configuration intent') : null;
    const archiveBytes = hasArchive ? view.readBytes(archive, 'configuration archive') : null;
    if (hasPending && hasArchive) throw new Error('Configuration pending and archive conflict');
    if (!pendingBytes && !archiveBytes) throw new Error('Configuration operation not found');
    const bytes = pendingBytes ?? archiveBytes!;
    const record = validateConsumerConfigurationOperation(JSON.parse(decoder.decode(bytes)));
    if (
      record.operation_id !== operationId ||
      record.root !== root ||
      record.root_identity !== identity ||
      record.workspace_id !== workspace ||
      !sameRequest(record.request, frozenRequest)
    )
      throw new Error('Configuration operation identity differs');
    if (archiveBytes) return observeArchivedCompletion(record, archiveBytes, proof);
    return finishOperation(record, bytes, proof);
  });
}

function completedResult(record: ConsumerConfigurationOperation): Completion {
  if (!record.relocation) return { operation_id: record.operation_id, status: 'completed' };
  const dirs = record.relocation.inventory.flatMap((item) => item.directories);
  const view = repositoryReadOnlyObservation(requireSafeRepositoryAccess(record.root));
  return {
    operation_id: record.operation_id,
    status: 'completed',
    relocation: {
      source_directories_retained: dirs.length,
      source_empty_directories_retained: dirs.filter(
        (dir) => view.listFiles(dir.path, 'retained source directory').length === 0,
      ).length,
    },
  };
}

/** Observe a complete owned archive without replaying effects. */
async function observeArchivedCompletion(
  record: ConsumerConfigurationOperation,
  archive: Buffer,
  proof: { readonly assertActive: () => void },
): Promise<Completion> {
  if (
    record.operation_id !== `config-${record.binding}` ||
    record.progress !== 'complete' ||
    (record.relocation &&
      (record.relocation.policy.state !== 'completed' ||
        record.relocation.inventory.some(
          (item) =>
            item.pendingDirectory ||
            item.files.some((file) => file.state !== 'completed') ||
            item.directories.some(
              (dir) =>
                dir.path !== item.move.oldRoot &&
                !item.targetDirectories?.some(
                  (target) => target.path === item.move.newRoot + dir.path.slice(item.move.oldRoot.length),
                ),
            ),
        )))
  )
    throw new Error('Configuration archive is not complete');
  const recovery = {
    archived: true as const,
    archive,
    before: record.before.map(decoded),
    target: decoded(record.target),
    beforeReceipt: record.receipt ? decoded(record.receipt.before) : null,
    targetReceipt: record.receipt ? decoded(record.receipt.target) : null,
  };
  const check = () => {
    proof.assertActive();
    if (rootIdentity(record.root) !== record.root_identity) throw new Error('Root identity changed');
    const capture = captureConsumerConfigurationForRecovery(record.request, recovery);
    if (
      capture.plan.binding !== record.binding ||
      capture.plan.operation_id !== record.operation_id ||
      !Buffer.from(capture.targetConfig).equals(decoded(record.target))
    )
      throw new Error('Frozen configuration binding changed');
    return capture;
  };
  check();
  if (record.receipt) {
    const derived = await derivePendingConfigurationReceipt(record.request, proof.assertActive, recovery);
    if (
      derived.plan.binding !== record.binding ||
      !derived.beforeReceipt.equals(decoded(record.receipt.before)) ||
      !Buffer.from(derived.targetReceipt).equals(decoded(record.receipt.target))
    )
      throw new Error('Frozen receipt binding changed');
  }
  const result = completedResult(record);
  check();
  return result;
}

async function finishOperation(
  initial: ConsumerConfigurationOperation,
  initialBytes: Buffer,
  proof: { readonly assertActive: () => void },
): Promise<Completion> {
  let record = initial;
  let bytes = initialBytes;
  const access = requireSafeRepositoryAccess(record.root);
  const revalidate = async () => {
    proof.assertActive();
    if (rootIdentity(record.root) !== record.root_identity) throw new Error('Root identity changed');
    const recovery = {
      pending: bytes,
      before: record.before.map(decoded),
      target: decoded(record.target),
      beforeReceipt: record.receipt ? decoded(record.receipt.before) : null,
      targetReceipt: record.receipt ? decoded(record.receipt.target) : null,
    };
    const capture = captureConsumerConfigurationForRecovery(record.request, recovery);
    if (
      (capture.receipt === null) !== (record.receipt === null) ||
      capture.plan.binding !== record.binding ||
      capture.plan.operation_id !== record.operation_id ||
      !Buffer.from(capture.targetConfig).equals(decoded(record.target))
    )
      throw new Error('Frozen configuration binding changed');
    if (record.receipt) {
      const derived = await derivePendingConfigurationReceipt(record.request, proof.assertActive, recovery);
      if (
        derived.plan.binding !== record.binding ||
        !derived.beforeReceipt.equals(decoded(record.receipt.before)) ||
        !Buffer.from(derived.targetReceipt).equals(decoded(record.receipt.target))
      )
        throw new Error('Frozen receipt binding changed');
    }
    const current = access.readBytes(configPath, 'configuration output');
    const old = current.equals(decoded(record.before[2]!));
    const target = current.equals(decoded(record.target));
    if ((!old && !target) || (record.progress !== 'intent' && !target))
      throw new Error('Configuration output does not match journal progress');
    const receiptCurrent = record.receipt
      ? access.readBytes(RUNTIME_INITIALIZATION_PATH, 'initialization receipt')
      : null;
    const receiptOld = !!record.receipt && !!receiptCurrent && receiptCurrent.equals(decoded(record.receipt.before));
    const receiptTarget = !!record.receipt && !!receiptCurrent && receiptCurrent.equals(decoded(record.receipt.target));
    if (record.receipt && !receiptOld && !receiptTarget) throw new Error('Receipt state differs');
    return { old, target, receiptOld, receiptTarget };
  };
  const advance = async (progress: ConsumerConfigurationOperation['progress']) => {
    const current = await revalidate();
    if (
      !current.target ||
      ((progress === 'receipt_applied' || progress === 'complete') && record.receipt && !current.receiptTarget)
    )
      throw new Error('Configuration or receipt target has not been observed');
    const next = { ...record, progress };
    const nextText = serialize(next);
    proof.assertActive();
    await access.replaceAtomicAsync(pending, sha(bytes), nextText, 'configuration intent progress');
    record = next;
    bytes = Buffer.from(nextText);
  };
  const updateRelocation = async (nextRelocation: FrozenRelocation) => {
    await revalidate();
    const next = { ...record, relocation: nextRelocation };
    validateConsumerConfigurationOperation(next);
    const nextText = serialize(next);
    proof.assertActive();
    await access.replaceAtomicAsync(pending, sha(bytes), nextText, 'relocation intent progress');
    record = next;
    bytes = Buffer.from(nextText);
  };
  const currentIntent = () => {
    proof.assertActive();
    if (
      rootIdentity(record.root) !== record.root_identity ||
      !access.readBytes(pending, 'relocation intent').equals(bytes)
    )
      throw new Error('Relocation intent ownership changed');
  };
  if (record.relocation) {
    if (
      record.progress !== 'intent' &&
      (record.relocation.policy.state !== 'completed' ||
        record.relocation.inventory.some(
          (item) =>
            item.pendingDirectory ||
            item.files.some((file) => file.state !== 'completed') ||
            item.directories.some(
              (dir) =>
                dir.path !== item.move.oldRoot &&
                !item.targetDirectories?.some(
                  (target) => target.path === item.move.newRoot + dir.path.slice(item.move.oldRoot.length),
                ),
            ),
        ))
    )
      throw new Error('Relocation progress precedes effects');
    for (let i = 0; i < record.relocation.inventory.length; i++) {
      const setItem = async (item: FrozenRelocation['inventory'][number]) => {
        const relocation = record.relocation!;
        await updateRelocation({
          ...relocation,
          inventory: relocation.inventory.map((entry, index) => (index === i ? item : entry)),
        });
      };
      let item = record.relocation.inventory[i]!;
      if (item.pendingDirectory) {
        const directory = {
          path: item.pendingDirectory,
          identity: access.directoryIdentity(item.pendingDirectory, 'relocation target directory'),
        };
        const { pendingDirectory: _pendingDirectory, ...rest } = item;
        await setItem({ ...rest, targetDirectories: [...(item.targetDirectories ?? []), directory] });
      }
      item = record.relocation!.inventory[i]!;
      const paths = item.directories
        .map((dir) => item.move.newRoot + dir.path.slice(item.move.oldRoot.length))
        .filter((dir) => dir !== item.move.newRoot)
        .sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
      for (const target of paths) {
        item = record.relocation!.inventory[i]!;
        if (item.targetDirectories?.some((dir) => dir.path === target)) continue;
        await setItem({ ...item, pendingDirectory: target });
        currentIntent();
        await access.ensureDirectoryAsync(target, 'relocation target directory');
        item = record.relocation!.inventory[i]!;
        const directory = { path: target, identity: access.directoryIdentity(target, 'relocation target directory') };
        const { pendingDirectory: _pendingDirectory, ...rest } = item;
        await setItem({ ...rest, targetDirectories: [...(item.targetDirectories ?? []), directory] });
      }
      item = record.relocation!.inventory[i]!;
      for (let j = 0; j < item.files.length; j++) {
        item = record.relocation!.inventory[i]!;
        const file = item.files[j]!;
        if (file.state === 'completed') continue;
        if (file.state === 'not-started') {
          await setItem({
            ...item,
            files: item.files.map((entry, index) => (index === j ? { ...entry, state: 'issued' as const } : entry)),
          });
          currentIntent();
          await access.moveNoReplaceAsync(file.source, file.destination, file.sha256, 'relocation file');
        }
        item = record.relocation!.inventory[i]!;
        await setItem({
          ...item,
          files: item.files.map((entry, index) => (index === j ? { ...entry, state: 'completed' as const } : entry)),
        });
      }
    }
    let relocation = record.relocation!;
    if (relocation.inventory.some((item) => item.files.some((file) => file.state !== 'completed')))
      throw new Error('Relocation files are incomplete');
    if (
      relocation.policy.state === 'not-started' &&
      decoded(relocation.policy.before).equals(decoded(relocation.policy.target)) &&
      relocation.inventory.some(
        (item) =>
          item.pendingDirectory ||
          item.directories.some(
            (dir) =>
              dir.path !== item.move.oldRoot &&
              !item.targetDirectories?.some(
                (target) => target.path === item.move.newRoot + dir.path.slice(item.move.oldRoot.length),
              ),
          ),
      )
    )
      throw new Error('Relocation target directories are incomplete');
    if (
      relocation.policy.state === 'not-started' &&
      !decoded(relocation.policy.before).equals(decoded(relocation.policy.target))
    ) {
      await updateRelocation({ ...relocation, policy: { ...relocation.policy, state: 'issued' } });
      currentIntent();
      await access.replaceAtomicAsync(
        policyPath,
        relocation.policy.before.sha256,
        decoder.decode(decoded(relocation.policy.target)),
        'relocation policy',
      );
    }
    relocation = record.relocation!;
    await revalidate();
    if (!access.readBytes(policyPath, 'relocation policy').equals(decoded(relocation.policy.target)))
      throw new Error('Relocation policy outcome is unknown');
    if (relocation.policy.state !== 'completed')
      await updateRelocation({ ...relocation, policy: { ...relocation.policy, state: 'completed' } });
  }
  const state = await revalidate();
  if (record.progress === 'intent' && state.old && !state.target) {
    proof.assertActive();
    await access.replaceAtomicAsync(
      configPath,
      record.before[2]!.sha256,
      decoder.decode(decoded(record.target)),
      'configuration output',
    );
  }
  if (record.progress === 'intent') await advance('config_applied');
  if (record.progress === 'config_applied') {
    const receiptState = await revalidate();
    if (record.receipt && receiptState.receiptOld && !receiptState.receiptTarget) {
      proof.assertActive();
      await access.replaceAtomicAsync(
        RUNTIME_INITIALIZATION_PATH,
        record.receipt.before.sha256,
        decoder.decode(decoded(record.receipt.target)),
        'initialization receipt',
      );
    }
    await advance('receipt_applied');
  }
  if (record.progress === 'receipt_applied') await advance('complete');
  await revalidate();
  const result = completedResult(record);
  if (access.fileExists(archivePath(record.operation_id), 'configuration archive'))
    throw new Error('Configuration archive already exists');
  proof.assertActive();
  await access.moveNoReplaceAsync(pending, archivePath(record.operation_id), sha(bytes), 'configuration archive');
  proof.assertActive();
  if (
    access.fileExists(pending, 'configuration intent') ||
    !access.readBytes(archivePath(record.operation_id), 'configuration archive').equals(bytes)
  )
    throw new Error('Configuration archive outcome is unknown');
  return result;
}
