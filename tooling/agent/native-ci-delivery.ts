import { fsSafeArchiveEntry } from '../../packages/agent/tooling/fs-safe-archive-entry.ts';
import type { AgentExtractArchiveModule } from '../../packages/agent/tooling/release-dependency-types.ts';
// Repository-owned CI producer. Importing this module never builds or installs.
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  releaseDigest as sha,
  releaseJSON as json,
  releasePath,
  releaseDirectory,
  releaseSourceBinding,
} from '../../packages/agent/bin/local-release-artifacts.ts';
import { runCommand } from './release-local.ts';
import { checkManifest, readPin } from '../../packages/agent/bin/bun.ts';
import { readBunPackMetadata } from '../../packages/agent/tooling/bun-pack-metadata.ts';
import {
  ciArchiveLimit,
  ciTransportLimit,
  nativeDeliveryChecks,
  minimumNativeDeliveryChecks,
  validateCIDeliveryRequest,
  encodeCIDeliveryResult,
  validateDependencyCache,
} from './release-ci-evidence.ts';

type NativeCIRequest = {
  schema: 'VidaCIDeliveryRequest/v1';
  operation_id: string;
  version: string;
  repository_id: string;
  project_ids: string[];
  target: string;
  source_binding: string;
  request_id: string;
};
type DependencyCache = {
  id: number;
  key: string;
  ref: string;
  version: string;
  size_in_bytes: number;
  restore: 'hit' | 'miss';
  matched_key: string | null;
  save: 'confirmed';
  save_action: 'skipped' | 'success';
};
type NativeCIIdentity = {
  request: NativeCIRequest;
  run_id: string;
  run_attempt: number;
  source_commit: string;
  dependency_cache: DependencyCache;
};
type PackedFile = { path: string; size: number };
type PackMetadata = { name: string; version: string; filename: string; files: PackedFile[] };
type NativeAsset = { file: string; sha256: string; bytes: number };
type NativeManifestInput = { path: string; bytes: number; sha256: string };
type NativeManifest = {
  schema: 'VidaStandaloneBuild/v1';
  version: string;
  pin: string;
  target: string;
  inputs: NativeManifestInput[];
  asset: NativeAsset;
  payloadId: string;
};
type NativeCandidate = {
  operation_id: string;
  version: string;
  source_binding: string;
  archive_sha256: string;
  manifest_sha256: string;
  pack_metadata: PackMetadata[];
  manifest: NativeManifest;
};
type NativeCIReceipt = {
  schema: 'VidaCIPhaseResult/v2';
  request_id: string;
  run_id: string;
  run_attempt: number;
  source_binding: string;
  archive_sha256: string;
  phase: string;
  status: 'passed';
  dependency_cache: DependencyCache;
};
type NativeCIContext = NativeCIIdentity & {
  root: string;
  source: string;
  checkout: string;
  packageRoot: string;
  manifest: { version: string; engines: { bun: string; node: string } };
};
type MessageObjectExpectation = {
  exact?: string;
  prefix?: string;
  includes?: string[];
  oneOf?: MessageExpectation[];
};
type MessageExpectation = string | MessageObjectExpectation;
type JsonDenialExpectation = {
  kind: 'json';
  keys?: string[];
  fields?: Record<string, string | number | boolean | null>;
  message: MessageExpectation;
};
type LineDenialExpectation = { kind: 'line'; message: MessageObjectExpectation };
type DenialExpectation = JsonDenialExpectation | LineDenialExpectation;
type CommandRecord = {
  command?: string;
  args?: string[];
  code?: number | null;
  signal?: string | null;
  stdout?: string;
  stderr?: string;
};
type CommandOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  log?: string;
  windowsVerbatimArguments?: boolean;
};
type CommandExecutor = (command: string, args: string[], options?: CommandOptions) => Promise<string>;
type NativeCICommandRunner = CommandExecutor & {
  denied?: (
    command: string,
    args: string[],
    options: CommandOptions,
    expected: DenialExpectation,
  ) => Promise<CommandRecord>;
};

const requireCI: (value: unknown, message: string) => asserts value = (value, message) => {
  if (!value) throw Error('GAP-VIDA-CI-DELIVERY-001: ' + message);
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');
function requiredEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  requireCI(typeof value === 'string', `required CI environment value ${key} is missing`);
  return value;
}
function dependencyCacheFields(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    typeof value.key === 'string' &&
    typeof value.ref === 'string' &&
    typeof value.version === 'string' &&
    typeof value.size_in_bytes === 'number'
  );
}
function dependencyCacheState(value: unknown): boolean {
  return (
    isRecord(value) &&
    (value.restore === 'hit' || value.restore === 'miss') &&
    (value.matched_key === null || typeof value.matched_key === 'string') &&
    value.save === 'confirmed' &&
    (value.save_action === 'skipped' || value.save_action === 'success')
  );
}
function isDependencyCache(value: unknown): value is DependencyCache {
  return isRecord(value) && dependencyCacheFields(value) && dependencyCacheState(value);
}
function isNativeCIRequest(value: unknown): value is NativeCIRequest {
  return (
    isRecord(value) &&
    value.schema === 'VidaCIDeliveryRequest/v1' &&
    typeof value.operation_id === 'string' &&
    typeof value.version === 'string' &&
    typeof value.repository_id === 'string' &&
    isStringArray(value.project_ids) &&
    typeof value.target === 'string' &&
    typeof value.source_binding === 'string' &&
    typeof value.request_id === 'string'
  );
}
function isPackedFile(value: unknown): value is PackedFile {
  return (
    isRecord(value) &&
    typeof value.path === 'string' &&
    value.path.length > 0 &&
    !value.path.includes('\\') &&
    !value.path.includes('\0') &&
    !path.posix.isAbsolute(value.path) &&
    path.posix.normalize(value.path) === value.path &&
    value.path.split('/').every((part) => part !== '' && part !== '.' && part !== '..') &&
    typeof value.size === 'number' &&
    Number.isSafeInteger(value.size) &&
    value.size >= 0
  );
}
function isPackMetadata(value: unknown): value is PackMetadata {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.version === 'string' &&
    typeof value.filename === 'string' &&
    Array.isArray(value.files) &&
    value.files.every(isPackedFile) &&
    new Set(value.files.map((file: PackedFile) => file.path)).size === value.files.length
  );
}
function isNativeAsset(value: unknown): value is NativeAsset {
  return (
    isRecord(value) &&
    typeof value.file === 'string' &&
    typeof value.sha256 === 'string' &&
    typeof value.bytes === 'number'
  );
}
function isNativeManifestInput(value: unknown): value is NativeManifestInput {
  return (
    isRecord(value) &&
    typeof value.path === 'string' &&
    typeof value.bytes === 'number' &&
    typeof value.sha256 === 'string'
  );
}
function isNativeManifest(value: unknown): value is NativeManifest {
  return (
    isRecord(value) &&
    value.schema === 'VidaStandaloneBuild/v1' &&
    typeof value.version === 'string' &&
    typeof value.pin === 'string' &&
    typeof value.target === 'string' &&
    Array.isArray(value.inputs) &&
    value.inputs.every(isNativeManifestInput) &&
    isNativeAsset(value.asset) &&
    typeof value.payloadId === 'string'
  );
}
function isNativeCandidate(value: unknown): value is NativeCandidate {
  return (
    isRecord(value) &&
    typeof value.operation_id === 'string' &&
    typeof value.version === 'string' &&
    typeof value.source_binding === 'string' &&
    typeof value.archive_sha256 === 'string' &&
    typeof value.manifest_sha256 === 'string' &&
    Array.isArray(value.pack_metadata) &&
    value.pack_metadata.every(isPackMetadata) &&
    isNativeManifest(value.manifest)
  );
}
function isNativeCIReceipt(value: unknown): value is NativeCIReceipt {
  return (
    isRecord(value) &&
    value.schema === 'VidaCIPhaseResult/v2' &&
    typeof value.request_id === 'string' &&
    typeof value.run_id === 'string' &&
    typeof value.run_attempt === 'number' &&
    typeof value.source_binding === 'string' &&
    typeof value.archive_sha256 === 'string' &&
    typeof value.phase === 'string' &&
    value.status === 'passed' &&
    isDependencyCache(value.dependency_cache)
  );
}
function isCommandRecord(value: unknown): value is CommandRecord {
  return (
    isRecord(value) &&
    typeof value.command === 'string' &&
    isStringArray(value.args) &&
    (value.code === null || typeof value.code === 'number') &&
    (value.signal === null || typeof value.signal === 'string') &&
    typeof value.stdout === 'string' &&
    typeof value.stderr === 'string'
  );
}
function isArchiveModule(value: unknown): value is AgentExtractArchiveModule {
  return isRecord(value) && typeof value.extractArchive === 'function';
}
function readPackageManifest(root: string): {
  version: string;
  engines: { bun: string; node: string };
} {
  const value = parseUnknownJSON(physical(root, 'packages/agent/package.json', 1024 * 1024).toString('utf8'));
  requireCI(
    isRecord(value) &&
      typeof value.version === 'string' &&
      isRecord(value.engines) &&
      typeof value.engines.bun === 'string' &&
      typeof value.engines.node === 'string',
    'CI package manifest is malformed',
  );
  return { version: value.version, engines: { bun: value.engines.bun, node: value.engines.node } };
}
function readNativeManifest(bytes: Buffer): NativeManifest {
  const value = parseUnknownJSON(bytes.toString('utf8'));
  requireCI(isNativeManifest(value), 'CI native manifest JSON is malformed');
  return value;
}
function emitNativeBuildFailureDiagnostics(ctx: NativeCIContext): void {
  const value = parseUnknownJSON(physical(ctx.root, 'logs/native-build/1.json', 8 * 1024 * 1024).toString('utf8'));
  requireCI(
    isRecord(value) && typeof value.stdout === 'string' && typeof value.stderr === 'string',
    'native build diagnostic receipt is malformed',
  );
  process.stdout.write(value.stdout);
  process.stderr.write(value.stderr);
}
function parseUnknownJSON(text: string): unknown {
  const value: unknown = JSON.parse(text);
  return value;
}
function checkedRequest(
  value: unknown,
  guard: (input: unknown) => input is NativeCIRequest = isNativeCIRequest,
): NativeCIRequest {
  requireCI(guard(value), 'CI request JSON is malformed');
  validateCIDeliveryRequest(value);
  return value;
}
const profileFor = (request: NativeCIRequest) => ({
  issuer: 'github-actions',
  repository_id: request.repository_id,
  project_ids: request.project_ids,
  target: request.target,
  required_checks: [...minimumNativeDeliveryChecks],
});
function nativeAssetName(target: string): string {
  if (target === 'bun-windows-x64') return 'vida-agent-bun-windows-x64.exe';
  if (target === 'bun-linux-x64') return 'vida-agent-bun-linux-x64';
  throw Error('GAP-VIDA-CI-DELIVERY-001: unsupported native target');
}
function dependencyCacheEvidence(env: NodeJS.ProcessEnv): DependencyCache {
  const evidence = {
    id: Number(env.VIDA_CI_CACHE_ID),
    key: env.VIDA_CI_CACHE_KEY,
    ref: env.VIDA_CI_CACHE_REF,
    version: env.VIDA_CI_CACHE_VERSION,
    size_in_bytes: Number(env.VIDA_CI_CACHE_BYTES),
    restore: env.VIDA_CI_CACHE_RESTORE,
    matched_key: env.VIDA_CI_CACHE_MATCHED_KEY || null,
    save: env.VIDA_CI_CACHE_SAVE,
    save_action: env.VIDA_CI_CACHE_SAVE_ACTION,
  };
  requireCI(isDependencyCache(evidence), 'dependency cache JSON environment is malformed');
  validateDependencyCache(evidence);
  return evidence;
}

/** Environment consistency is a local CI fence, never human authorization. */
export function validateNativeCIInvocation({
  env,
  platform,
  arch,
  bun,
}: {
  env: NodeJS.ProcessEnv;
  platform: string;
  arch: string;
  bun: string | undefined;
}): NativeCIIdentity {
  requireCI(
    env.CI === 'true' && env.GITHUB_ACTIONS === 'true' && env.VIDA_NATIVE_CI_ENABLED === 'true',
    'CI producer is dormant',
  );
  const executingPackageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../packages/agent'),
    executingPin = readPin(executingPackageRoot);
  checkManifest(executingPackageRoot, executingPin);
  const nativeTarget =
    platform === 'win32' && env.GITHUB_JOB === 'native-windows-x64'
      ? 'bun-windows-x64'
      : platform === 'linux' && env.GITHUB_JOB === 'native-linux-x64'
        ? 'bun-linux-x64'
        : null;
  requireCI(
    nativeTarget !== null && arch === 'x64' && bun === process.versions.bun && bun === executingPin,
    'qualified native x64 pinned producer required',
  );
  requireCI(
    env.GITHUB_REPOSITORY === 'pomazanbohdan/vida-stack-lite' &&
      env.GITHUB_REPOSITORY_ID === '1340911900' &&
      typeof env.GITHUB_RUN_ID === 'string' &&
      /^\d+$/.test(env.GITHUB_RUN_ID) &&
      typeof env.GITHUB_RUN_ATTEMPT === 'string' &&
      /^[1-9]\d*$/.test(env.GITHUB_RUN_ATTEMPT) &&
      typeof env.CI_SOURCE_COMMIT === 'string' &&
      /^[a-f0-9]{40}$/.test(env.CI_SOURCE_COMMIT) &&
      env.CI_SOURCE_COMMIT === env.GITHUB_SHA &&
      env.GITHUB_WORKFLOW_REF ===
        'pomazanbohdan/vida-stack-lite/.github/workflows/agent-native-delivery.yml@refs/heads/main',
    'CI repository/job/commit differs',
  );
  requireCI(
    typeof env.CI_REQUEST === 'string' && Buffer.byteLength(env.CI_REQUEST) <= 8 * 1024 * 1024,
    'CI request missing or oversized',
  );
  const request = checkedRequest(parseUnknownJSON(requiredEnv(env, 'CI_REQUEST')));
  requireCI(
    request.repository_id === 'vida-agent' &&
      json(request.project_ids) === json(['agent']) &&
      request.target === nativeTarget,
    'CI context differs',
  );
  return {
    request,
    run_id: requiredEnv(env, 'GITHUB_RUN_ID'),
    run_attempt: Number(env.GITHUB_RUN_ATTEMPT),
    source_commit: requiredEnv(env, 'CI_SOURCE_COMMIT'),
    dependency_cache: dependencyCacheEvidence(env),
  };
}

const receiptFields = [
  'schema',
  'request_id',
  'run_id',
  'run_attempt',
  'source_binding',
  'archive_sha256',
  'phase',
  'status',
  'dependency_cache',
];
export function validateNativeCIReceipts({
  identity,
  candidate,
  receipts,
  phases = nativeDeliveryChecks,
}: {
  identity: NativeCIIdentity;
  candidate: NativeCandidate;
  receipts: NativeCIReceipt[];
  phases?: readonly string[];
}): void {
  requireCI(
    Array.isArray(receipts) && receipts.length === phases.length,
    'complete ordered CI phase observations required',
  );
  for (let index = 0; index < phases.length; index++) {
    const record = receipts[index];
    requireCI(record && typeof record === 'object' && !Array.isArray(record), 'malformed CI phase observation');
    requireCI(
      json(Object.keys(record).sort()) === json(receiptFields.slice().sort()) &&
        record.schema === 'VidaCIPhaseResult/v2' &&
        record.request_id === identity.request.request_id &&
        record.run_id === identity.run_id &&
        record.run_attempt === identity.run_attempt &&
        record.source_binding === identity.request.source_binding &&
        record.archive_sha256 === candidate.archive_sha256 &&
        json(record.dependency_cache) === json(identity.dependency_cache) &&
        record.phase === phases[index] &&
        record.status === 'passed',
      'failed/changed/UNKNOWN CI phase observation',
    );
  }
}

function physical(root: string, relative: string, maximum = ciArchiveLimit): Buffer {
  const file = releasePath(root, relative),
    stat = lstatSync(file);
  requireCI(stat.isFile() && stat.nlink === 1 && stat.size <= maximum, 'unsafe/oversized CI file');
  return readFileSync(file);
}
function exclusive(root: string, relative: string, value: Buffer | object): void {
  const directory = path.posix.dirname(relative);
  if (directory !== '.') releaseDirectory(root, directory);
  writeFileSync(releasePath(root, relative, true), Buffer.isBuffer(value) ? value : json(value), {
    flag: 'wx',
    mode: 0o600,
  });
}
function context(): NativeCIContext {
  const identity = validateNativeCIInvocation({
    env: process.env,
    platform: process.platform,
    arch: process.arch,
    bun: process.versions.bun,
  });
  const source = realpathSync(requiredEnv(process.env, 'VIDA_CI_SOURCE_ROOT')),
    checkout = realpathSync(requiredEnv(process.env, 'GITHUB_WORKSPACE'));
  const temporary = realpathSync(requiredEnv(process.env, 'RUNNER_TEMP'));
  const root = releaseDirectory(temporary, 'vida-ci-operation-' + identity.run_id + '-' + identity.run_attempt);
  requireCI(source.startsWith(temporary + path.sep) && source !== checkout, 'isolated CI Source mirror required');
  for (const tree of [source, checkout])
    requireCI(
      releaseSourceBinding(tree).source_binding === identity.request.source_binding,
      'CI Source differs from current request',
    );
  const packageRoot = path.join(source, 'packages/agent'),
    pin = readPin(packageRoot);
  checkManifest(packageRoot, pin);
  const manifest = readPackageManifest(source);
  requireCI(
    manifest.version === identity.request.version && manifest.engines.bun === pin,
    'CI package identity differs',
  );
  return {
    ...identity,
    root,
    source,
    checkout,
    packageRoot: path.join(source, 'packages/agent'),
    manifest,
  };
}
function candidateFor(ctx: NativeCIContext): NativeCandidate {
  const candidateValue = parseUnknownJSON(physical(ctx.root, 'candidate.json', 8 * 1024 * 1024).toString('utf8'));
  requireCI(isNativeCandidate(candidateValue), 'CI candidate JSON is malformed');
  const candidate = candidateValue;
  requireCI(
    candidate.operation_id === ctx.request.operation_id &&
      candidate.version === ctx.request.version &&
      candidate.source_binding === ctx.request.source_binding &&
      candidate.manifest.target === ctx.request.target &&
      candidate.manifest.pin === ctx.manifest.engines.bun,
    'CI candidate identity differs',
  );
  const pack = candidate.pack_metadata[0];
  requireCI(pack, 'CI candidate pack metadata is missing');
  const archive = physical(ctx.root, 'output/' + pack.filename);
  const manifest = physical(ctx.root, 'package/dist/standalone/manifest.json', 8 * 1024 * 1024);
  const asset = physical(ctx.root, 'package/dist/standalone/' + candidate.manifest.asset.file);
  requireCI(
    sha(archive) === candidate.archive_sha256 &&
      sha(manifest) === candidate.manifest_sha256 &&
      sha(asset) === candidate.manifest.asset.sha256 &&
      asset.length === candidate.manifest.asset.bytes,
    'CI archive/manifest/asset changed',
  );
  return candidate;
}
const nativePrerequisiteFailure =
  /Cannot find module|Cannot find package|ERR_MODULE_NOT_FOUND|ModuleNotFound|Error loading shared library|failed to load.*(?:\.node|dll)/i;

function messageMatches(actual: string, expected: MessageExpectation): boolean {
  if (typeof expected === 'string') return actual === expected;
  if (expected.exact !== undefined) return actual === expected.exact;
  if (expected.prefix !== undefined) return actual.startsWith(expected.prefix);
  if (expected.includes !== undefined) return expected.includes.every((part) => actual.includes(part));
  if (expected.oneOf !== undefined) return expected.oneOf.some((entry) => messageMatches(actual, entry));
  return false;
}

function structuredDenial(stderr: string, expected: JsonDenialExpectation): boolean {
  let value;
  try {
    value = parseUnknownJSON(stderr.trim());
  } catch {
    return false;
  }
  if (!isRecord(value)) return false;
  const denial = value;
  if (expected.keys && json(Object.keys(denial).sort()) !== json([...expected.keys].sort())) return false;
  if (Object.entries(expected.fields ?? {}).some(([key, field]) => denial[key] !== field)) return false;
  return typeof denial.message === 'string' && messageMatches(denial.message, expected.message);
}

function errorLines(stderr: string): string[] {
  return stderr
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^(?:error|Error):\s*/, ''))
    .filter((line) => line && !/^\d+\s*\|/.test(line) && !/^at\s/.test(line));
}

export function nativeCIDenialDiagnostics(record: CommandRecord | undefined | null): string {
  const stdout = typeof record?.stdout === 'string' ? record.stdout.slice(-2048) : '';
  const stderr = typeof record?.stderr === 'string' ? record.stderr.slice(-2048) : '';
  const command = typeof record?.command === 'string' ? JSON.stringify(record.command) : 'unknown';
  const args = Array.isArray(record?.args) ? JSON.stringify(record.args) : 'unknown';
  const exitCode = denialExitCode(record);
  const signal = record?.signal === null ? 'null' : typeof record?.signal === 'string' ? record.signal : 'unknown';
  return `command: ${command}\nargs: ${args}\nexit code: ${exitCode}\nsignal: ${signal}\nstdout tail:\n${stdout}\nstderr tail:\n${stderr}`;
}

function denialExitCode(record: CommandRecord | undefined | null): string {
  return typeof record?.code === 'number' && Number.isInteger(record.code) ? String(record.code) : 'unknown';
}

function nativeCIDenialError(message: string, record: CommandRecord, cause: unknown): Error {
  return new Error(`${message}\n${nativeCIDenialDiagnostics(record)}`, { cause });
}

export function validateNativeCIDenial(record: CommandRecord, expected: DenialExpectation): void {
  requireCI(
    hasTerminalDenialObservation(record),
    'expected denial lacks actual terminal observation; FAIL/UNKNOWN retained',
  );
  requireCI(record.code === 1, 'expected denial observed a different integer exit; known FAIL');
  requireCI(typeof record.stderr === 'string', 'expected denial receipt lacks stderr; FAIL/UNKNOWN retained');
  requireCI(
    !nativePrerequisiteFailure.test(record.stderr + '\n' + (typeof record.stdout === 'string' ? record.stdout : '')),
    'native prerequisite failure cannot satisfy expected rejection',
  );
  const matches =
    expected?.kind === 'json'
      ? structuredDenial(record.stderr, expected)
      : expected?.kind === 'line' && typeof expected.message === 'object'
        ? errorLines(record.stderr).some((line) => messageMatches(line, expected.message))
        : false;
  requireCI(matches, 'expected denial message or structured contract did not match');
}

function hasTerminalDenialObservation(record: CommandRecord | undefined | null): boolean {
  return typeof record?.code === 'number' && Number.isInteger(record.code) && record.signal === null;
}

function jsonDenial(
  fields: Record<string, string>,
  message: MessageExpectation,
  keys = [...Object.keys(fields), 'message'],
): JsonDenialExpectation {
  return { kind: 'json', keys, fields, message };
}

const nativeCICommandDenialEntries: Array<[string, DenialExpectation]> = [
  [
    'run',
    jsonDenial(
      { schema: 'VidaAgentRunResult/v1', status: 'blocked', code: 'GAP-VIDA-RUN-CLI-001' },
      {
        exact:
          'Launcher arguments are incomplete or contain an unsupported option. Next action: inspect the exact work and check its issued contract before retrying.',
      },
    ),
  ],
  ['init', { kind: 'line', message: { prefix: 'Usage: init.mjs ' } }],
  ['install', { kind: 'line', message: { prefix: 'Usage: install.mjs ' } }],
  ['reconcile-artifacts', jsonDenial({ status: 'blocked' }, { exact: 'vida repair artifacts: invalid arguments' })],
  ['documentation-clear', { kind: 'line', message: { exact: 'documentation CLEAR arguments invalid' } }],
  [
    'scope',
    jsonDenial(
      { schema: 'VidaAgentCommandResult/v1', status: 'blocked', code: 'GAP-VIDA-SCOPE-001' },
      {
        prefix: 'scope requires --project-root ABSOLUTE --repository ID --project ID --path RELATIVE',
      },
    ),
  ],
  [
    'development-controller',
    jsonDenial(
      { status: 'blocked', code: 'GAP-DEVELOPMENT-CONTROLLER-001' },
      { prefix: 'development-controller prepare --target ABS --controller-root NEW_ABS' },
    ),
  ],
];
const nativeCICommandDenials = new Map(nativeCICommandDenialEntries);

export function validateNativeCICommandDenialInventory(
  commands: Iterable<string>,
  bin?: Record<string, string>,
): Map<string, DenialExpectation> {
  const expectedCommands = [...nativeCICommandDenials.keys()].sort(),
    advertisedCommands = [...commands].sort();
  requireCI(json(advertisedCommands) === json(expectedCommands), 'public command denial expectation inventory differs');
  for (const [name, entry] of Object.entries(bin ?? {})) {
    if (name === 'vida-agent') continue;
    const command = path.basename(entry, path.extname(entry));
    requireCI(nativeCICommandDenials.has(command), 'maintained alias lacks an explicit command denial expectation');
  }
  return nativeCICommandDenials;
}

export const nativeCIUnadmittedWorkflowDenial = jsonDenial(
  { schema: 'VidaAgentRunResult/v1', status: 'blocked', code: 'GAP-VIDA-RUN-WORKFLOW-001' },
  {
    exact:
      'The requested workflow is not configured for this selection. Next action: inspect the exact work and check its issued contract before retrying.',
  },
);

export function validateNativeCIUnadmittedRun(record: CommandRecord): void {
  validateNativeCIDenial(record, nativeCIUnadmittedWorkflowDenial);
}
export function createNativeCICommandRunner(
  ctx: NativeCIContext,
  phase: string,
  execute: CommandExecutor = runCommand,
): NativeCICommandRunner {
  let count = 0;
  releaseDirectory(ctx.root, 'logs/' + phase);
  const invoke: NativeCICommandRunner = (command, args, options = {}) =>
    execute(command, args, {
      cwd: ctx.root,
      ...options,
      log: path.join(ctx.root, 'logs', phase, String(count++) + '.json'),
    });
  invoke.denied = async (command, args, options, expected) => {
    const name = 'logs/' + phase + '/' + count + '.json';
    let commandError;
    try {
      await invoke(command, args, options);
    } catch (error) {
      commandError = error;
    }
    let observed: unknown;
    try {
      observed = parseUnknownJSON(physical(ctx.root, name, 8 * 1024 * 1024).toString('utf8'));
    } catch (receiptError) {
      throw new Error('expected denial receipt is missing or unreadable; FAIL/UNKNOWN retained', {
        cause: commandError ?? receiptError,
      });
    }
    let observedRecord: CommandRecord = {};
    try {
      requireCI(isCommandRecord(observed), 'rejection command receipt is malformed');
      observedRecord = observed;
      requireCI(
        observedRecord.command === command && json(observedRecord.args) === json(args),
        'rejection child differs',
      );
      validateNativeCIDenial(observedRecord, expected);
      if (!commandError) requireCI(false, 'expected rejection returned success');
    } catch (validationError) {
      throw nativeCIDenialError(
        validationError instanceof Error ? validationError.message : String(validationError),
        observedRecord,
        commandError ?? validationError,
      );
    }
    return observedRecord;
  };
  return invoke;
}
function runner(ctx: NativeCIContext, phase: string): NativeCICommandRunner {
  return createNativeCICommandRunner(ctx, phase);
}
async function nativeBuild(ctx: NativeCIContext, invoke: NativeCICommandRunner): Promise<void> {
  requireCI((await invoke(process.execPath, ['--version'])).trim() === ctx.manifest.engines.bun, 'CI Bun pin differs');
  try {
    await invoke(process.execPath, ['run', 'ci:pinned'], { cwd: ctx.packageRoot });
  } catch (error) {
    try {
      emitNativeBuildFailureDiagnostics(ctx);
    } catch (diagnosticError) {
      throw new Error(
        `${error instanceof Error ? error.message : String(error)}\nNative build diagnostics failed: ${diagnosticError instanceof Error ? diagnosticError.message : String(diagnosticError)}`,
        { cause: error },
      );
    }
    throw error;
  }
  releaseDirectory(ctx.root, 'output');
  const filename = 'vida-agent-' + ctx.request.version + '.tgz';
  await invoke(
    process.execPath,
    ['pm', 'pack', '--ignore-scripts', '--filename', path.join(ctx.root, 'output', filename)],
    { cwd: ctx.packageRoot },
  );
  const packed = await readBunPackMetadata({
    archive: path.join(ctx.root, 'output', filename),
    name: 'vida-agent',
    version: ctx.request.version,
    filename,
    nativeTarget: ctx.request.target,
  });
  requireCI(packed.length === 1, 'CI pack metadata cardinality differs');
  const packedEntry = packed[0];
  requireCI(
    packedEntry &&
      packedEntry.name === 'vida-agent' &&
      packedEntry.version === ctx.request.version &&
      packedEntry.filename === 'vida-agent-' + ctx.request.version + '.tgz',
    'CI native pack identity differs',
  );
  const archive = physical(ctx.root, 'output/' + packedEntry.filename);
  const archiveModule: unknown = await import(pathToFileURL(fsSafeArchiveEntry(ctx.packageRoot)).href);
  requireCI(isArchiveModule(archiveModule), 'qualified archive API is malformed');
  const { extractArchive } = archiveModule;
  releaseDirectory(ctx.root, 'package');
  await extractArchive({
    archivePath: path.join(ctx.root, 'output', packedEntry.filename),
    destDir: path.join(ctx.root, 'package'),
    kind: 'tar',
    tarGzip: true,
    timeoutMs: 0,
    stripComponents: 1,
    limits: {
      maxArchiveBytes: ciArchiveLimit,
      maxExtractedBytes: 512 * 1024 * 1024,
      maxEntryBytes: ciArchiveLimit,
    },
  });
  const manifestBytes = physical(ctx.root, 'package/dist/standalone/manifest.json', 8 * 1024 * 1024);
  const manifest = readNativeManifest(manifestBytes);
  requireCI(
    manifest.schema === 'VidaStandaloneBuild/v1' &&
      manifest.version === ctx.request.version &&
      manifest.pin === ctx.manifest.engines.bun &&
      manifest.target === ctx.request.target &&
      manifest.inputs.length > 0,
    'native manifest differs',
  );
  requireCI(manifest.asset.file === nativeAssetName(ctx.request.target), 'native executable name differs');
  const asset = physical(ctx.root, 'package/dist/standalone/' + manifest.asset.file);
  requireCI(
    sha(asset) === manifest.asset.sha256 && asset.length === manifest.asset.bytes,
    'formed native executable differs',
  );
  // The extracted member must be the exact current builder output, never an SDK projection.
  requireCI(
    manifestBytes.equals(physical(ctx.source, 'packages/agent/dist/standalone/manifest.json', 8 * 1024 * 1024)) &&
      asset.equals(physical(ctx.source, 'packages/agent/dist/standalone/' + manifest.asset.file)),
    'packed native bytes differ',
  );
  exclusive(ctx.root, 'candidate.json', {
    operation_id: ctx.request.operation_id,
    version: ctx.request.version,
    source_binding: ctx.request.source_binding,
    pack_metadata: packed,
    archive_sha256: sha(archive),
    manifest_sha256: sha(manifestBytes),
    manifest,
  });
}

async function emitBuild(ctx: NativeCIContext): Promise<void> {
  const phaseName = 'emit-build';
  const intent = 'phases/' + phaseName + '.intent.json';
  const outputDirectory = path.join(ctx.root, 'publication');
  const artifactName = 'build-' + ctx.request.request_id + '-' + ctx.run_id + '-' + ctx.run_attempt;
  requireCI(
    typeof process.env.GITHUB_OUTPUT === 'string' && !/[\r\n\0]/.test(process.env.GITHUB_OUTPUT),
    'actual CI output boundary missing',
  );
  requireCI(
    !existsSync(releasePath(ctx.root, intent, true)),
    'prior issued build publication retained; inspect UNKNOWN, no reissue',
  );
  requireCI(
    !existsSync(releasePath(ctx.root, 'publication', true)),
    'prior build artifact directory retained; inspect UNKNOWN, no reissue',
  );
  requireCI(
    !/[\r\n\0]/.test(outputDirectory) && /^[A-Za-z0-9._-]{1,255}$/.test(artifactName),
    'CI build artifact output identity is unsafe',
  );
  const candidateBytes = physical(ctx.root, 'candidate.json', 8 * 1024 * 1024);
  const candidate = parseUnknownJSON(candidateBytes.toString('utf8'));
  requireCI(isNativeCandidate(candidate), 'CI candidate JSON is malformed');
  const receiptBytes = physical(ctx.root, 'phases/native-build.result.json', 1024 * 1024);
  const receipt = parseUnknownJSON(receiptBytes.toString('utf8'));
  requireCI(isNativeCIReceipt(receipt), 'CI phase receipt JSON is malformed');
  validateNativeCIReceipts({
    identity: ctx,
    candidate,
    receipts: [receipt],
    phases: ['native-build'],
  });
  const pack = requireNativePackMetadata(candidate, ctx);
  requireCI(
    candidate.manifest?.schema === 'VidaStandaloneBuild/v1' &&
      candidate.manifest.version === ctx.request.version &&
      candidate.manifest.target === ctx.request.target &&
      candidate.manifest.pin === ctx.manifest.engines.bun &&
      candidate.manifest.asset?.file === nativeAssetName(ctx.request.target),
    'CI native build manifest identity differs',
  );
  const manifestBytes = physical(ctx.root, 'package/dist/standalone/manifest.json', 8 * 1024 * 1024);
  const manifestValue = parseUnknownJSON(manifestBytes.toString('utf8'));
  requireCI(isNativeManifest(manifestValue), 'CI native manifest JSON is malformed');
  const manifest = manifestValue;
  const assetBytes = physical(ctx.root, 'package/dist/standalone/' + manifest.asset.file, ciArchiveLimit);
  const archiveBytes = physical(ctx.root, 'output/' + pack.filename, ciArchiveLimit);
  const installerPath = 'packages/agent/tooling/install-windows.ps1';
  const installerBytes =
    ctx.request.target === 'bun-windows-x64' ? physical(ctx.source, installerPath, 1024 * 1024) : null;
  requireCI(
    manifest.schema === 'VidaStandaloneBuild/v1' &&
      manifest.version === ctx.request.version &&
      manifest.target === ctx.request.target &&
      manifest.pin === ctx.manifest.engines.bun &&
      manifest.asset.file === nativeAssetName(ctx.request.target) &&
      manifestBytes.equals(physical(ctx.source, 'packages/agent/dist/standalone/manifest.json', 8 * 1024 * 1024)) &&
      assetBytes.equals(physical(ctx.source, 'packages/agent/dist/standalone/' + manifest.asset.file)),
    'CI source and native bytes differ',
  );
  requireCI(
    candidate.archive_sha256 === sha(archiveBytes) &&
      candidate.manifest_sha256 === sha(manifestBytes) &&
      manifest.asset.sha256 === sha(assetBytes) &&
      manifest.asset.bytes === assetBytes.length,
    'CI build candidate binding differs',
  );
  const packedFiles = Array.isArray(pack.files) ? pack.files : [];
  const packedManifest = packedFiles.filter((file) => file?.path === 'dist/standalone/manifest.json');
  const packedAsset = packedFiles.filter((file) => file?.path === 'dist/standalone/' + manifest.asset.file);
  requireCI(
    packedManifest.length === 1 &&
      packedManifest[0]?.size === manifestBytes.length &&
      packedAsset.length === 1 &&
      packedAsset[0]?.size === assetBytes.length,
    'CI native pack inventory differs',
  );
  const files: Array<[string, Buffer, number]> = [
    [pack.filename, archiveBytes, ciArchiveLimit],
    [manifest.asset.file, assetBytes, ciArchiveLimit],
    ['manifest.json', manifestBytes, 8 * 1024 * 1024],
    ['candidate.json', candidateBytes, 8 * 1024 * 1024],
    ['native-build.result.json', receiptBytes, 1024 * 1024],
    ...(installerBytes ? [['install-windows.ps1', installerBytes, 1024 * 1024] as [string, Buffer, number]] : []),
  ];
  const names = files.map(([name]) => name);
  requireCI(
    names.length === (installerBytes ? 6 : 5) &&
      new Set(names).size === names.length &&
      names.every((name) => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)),
    'CI build artifact inventory differs',
  );
  const totalBytes = files.reduce((total, [, bytes, limit]) => {
    requireCI(bytes.length > 0 && bytes.length <= limit, 'CI build artifact member exceeds its bound');
    return total + bytes.length;
  }, 0);
  requireCI(totalBytes <= ciTransportLimit, 'CI build artifact exceeds transport bound');
  exclusive(ctx.root, intent, {
    request_id: ctx.request.request_id,
    run_id: ctx.run_id,
    run_attempt: ctx.run_attempt,
    phase: phaseName,
    status: 'issued',
  });
  console.log(
    json({
      phase: phaseName,
      status: 'issued',
      request_id: ctx.request.request_id,
      run_id: ctx.run_id,
      run_attempt: ctx.run_attempt,
    }).trim(),
  );
  releaseDirectory(ctx.root, 'publication');
  for (const [name, bytes, limit] of files) {
    exclusive(ctx.root, 'publication/' + name, bytes);
    requireCI(physical(ctx.root, 'publication/' + name, limit).equals(bytes), 'CI build artifact copy differs');
  }
  requireCI(
    json(readdirSync(outputDirectory).sort()) === json(names.slice().sort()),
    'CI build artifact output is not the exact flat allowlist',
  );
  const afterContext = context();
  const afterCandidateBytes = physical(afterContext.root, 'candidate.json', 8 * 1024 * 1024);
  const afterReceiptBytes = physical(afterContext.root, 'phases/native-build.result.json', 1024 * 1024);
  const afterArchiveBytes = physical(afterContext.root, 'output/' + pack.filename, ciArchiveLimit);
  const afterManifestBytes = physical(afterContext.root, 'package/dist/standalone/manifest.json', 8 * 1024 * 1024);
  const afterAssetBytes = physical(afterContext.root, 'package/dist/standalone/' + manifest.asset.file, ciArchiveLimit);
  const afterInstallerBytes = installerBytes ? physical(afterContext.source, installerPath, 1024 * 1024) : null;
  const afterCandidate = candidateFor(afterContext);
  requireCI(
    afterCandidateBytes.equals(candidateBytes) &&
      afterReceiptBytes.equals(receiptBytes) &&
      afterArchiveBytes.equals(archiveBytes) &&
      afterManifestBytes.equals(manifestBytes) &&
      afterAssetBytes.equals(assetBytes) &&
      (installerBytes === null || (afterInstallerBytes !== null && afterInstallerBytes.equals(installerBytes))) &&
      json(afterCandidate) === json(candidate),
    'CI build inputs changed during emission',
  );
  for (const [name, bytes, limit] of files)
    requireCI(
      physical(afterContext.root, 'publication/' + name, limit).equals(bytes),
      'CI build output changed during emission',
    );
  requireCI(
    json(readdirSync(outputDirectory).sort()) === json(names.slice().sort()),
    'CI build artifact output inventory changed during emission',
  );
  writeFileSync(
    requiredEnv(process.env, 'GITHUB_OUTPUT'),
    'directory=' +
      outputDirectory +
      '\n' +
      'artifact_name=' +
      artifactName +
      '\n' +
      'archive_file=' +
      pack.filename +
      '\n' +
      'asset_file=' +
      manifest.asset.file +
      '\n',
    { flag: 'a' },
  );
  // This result records formation provenance and integrity; it runs no test phase.
  const result = encodeCIDeliveryResult({
    request: ctx.request,
    candidate,
    profile: profileFor(ctx.request),
    dependency_cache: ctx.dependency_cache,
    observation: {
      issuer: 'github-actions',
      run_id: ctx.run_id,
      run_attempt: ctx.run_attempt,
      conclusion: 'success',
      checks: minimumNativeDeliveryChecks.map((id) => ({ id, status: 'passed' })),
    },
  });
  exclusive(ctx.root, 'output/result.json', result);
  exclusive(ctx.root, 'output/candidate.json', candidateBytes);
  requireCI(
    physical(ctx.root, 'output/candidate.json', 8 * 1024 * 1024).equals(candidateBytes),
    'CI formation candidate copy differs',
  );
  writeFileSync(
    requiredEnv(process.env, 'GITHUB_OUTPUT'),
    'formation_directory=' +
      path.join(ctx.root, 'output') +
      '\n' +
      'formation_artifact_name=' +
      ctx.request.request_id +
      '-' +
      ctx.run_attempt +
      '\n' +
      'formation_archive_file=' +
      pack.filename +
      '\n',
    { flag: 'a' },
  );
  console.log(
    json({
      phase: phaseName,
      status: 'passed',
      request_id: ctx.request.request_id,
      artifact_name: artifactName,
      files: names,
    }).trim(),
  );
}

function requireNativePackMetadata(candidate: NativeCandidate, ctx: NativeCIContext): PackMetadata {
  const pack = candidate.pack_metadata?.[0];
  requireCI(
    Array.isArray(candidate.pack_metadata) &&
      candidate.pack_metadata.length === 1 &&
      pack?.name === 'vida-agent' &&
      pack.version === ctx.request.version &&
      pack.filename === 'vida-agent-' + ctx.request.version + '.tgz' &&
      path.basename(pack.filename) === pack.filename,
    'CI native build pack identity differs',
  );
  return pack;
}
async function phase(ctx: NativeCIContext, name: string): Promise<void> {
  requireCI(name === 'native-build', 'only native formation is supported; tests belong to development tasks');
  const intent = 'phases/native-build.intent.json';
  requireCI(
    !existsSync(releasePath(ctx.root, intent, true)),
    'prior issued formation retained; inspect UNKNOWN, no reissue',
  );
  exclusive(ctx.root, intent, {
    request_id: ctx.request.request_id,
    run_id: ctx.run_id,
    run_attempt: ctx.run_attempt,
    phase: name,
    status: 'issued',
  });
  console.log(json({ phase: name, status: 'issued', request_id: ctx.request.request_id }).trim());
  await nativeBuild(ctx, runner(ctx, name));
  const completedContext = context();
  const candidate = candidateFor(completedContext);
  exclusive(completedContext.root, 'phases/native-build.result.json', {
    schema: 'VidaCIPhaseResult/v2',
    request_id: ctx.request.request_id,
    run_id: ctx.run_id,
    run_attempt: ctx.run_attempt,
    source_binding: ctx.request.source_binding,
    archive_sha256: candidate.archive_sha256,
    phase: name,
    status: 'passed',
    dependency_cache: completedContext.dependency_cache,
  });
  console.log(json({ phase: name, status: 'passed', request_id: ctx.request.request_id }).trim());
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const ctx = context();
    const args = process.argv.slice(2);
    if (args.length === 2 && args[0] === '--phase' && args[1] === 'emit-build') await emitBuild(ctx);
    else if (args.length === 2 && args[0] === '--phase' && args[1] !== undefined) await phase(ctx, args[1]);
    else throw Error('GAP-VIDA-CI-DELIVERY-001: fixed formation phase required');
  } catch (error) {
    console.error(
      JSON.stringify({
        status: 'blocked',
        code: 'GAP-VIDA-CI-DELIVERY-001',
        message: error instanceof Error ? error.message : String(error),
        custody: 'retain issued intent and bytes; no automatic cleanup/reissue',
      }),
    );
    process.exitCode = 1;
  }
}
