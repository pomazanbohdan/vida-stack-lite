import { closeSync, existsSync, fsyncSync, lstatSync, openSync, readFileSync, writeFileSync, writeSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fsSafeArchiveEntry } from '../../packages/agent/tooling/fs-safe-archive-entry.ts';
import { ownedTempWorkspace, cleanupOwnedWorkspace } from '../../packages/agent/tooling/owned-staging.ts';
import { readRuntimeConfigIdentityForObservation } from '../../packages/agent/src/config/runtime-config.ts';
import type {
  AgentFsSafeArchiveModule,
  AgentLoadZipArchiveWithPreflight,
  AgentReadArchiveEntry,
} from '../../packages/agent/tooling/release-dependency-types.js';
import {
  releaseDigest as digest,
  releaseJSON as canonicalJSON,
  releasePath,
  releaseDirectory,
  releaseState,
  saveReleaseState as saveReceipt,
  releaseSourceBinding,
  parseReleaseVersion,
  releaseIdPattern,
  withReleaseAdmission,
} from '../../packages/agent/bin/local-release-artifacts.ts';
import {
  readNativeRetargetCandidate,
  recheckNativeRetargetCandidate,
} from '../../packages/agent/bin/repair-release-retarget.ts';

const hex = /^[a-f0-9]{64}$/;
const targetPattern = /^bun-(windows|linux|darwin)-(x64|arm64)(-baseline)?$/;
const projectIdPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;

export const ciTransportLimit = 256 * 1024 * 1024;
export const ciArchiveLimit = 240 * 1024 * 1024;
export const minimumNativeDeliveryChecks = Object.freeze(['native-build']);
export const nativeDeliveryChecks = Object.freeze([
  'native-build',
  'native-install',
  'public-routes',
  'offline-runtime',
  'native-dependencies',
  'state-preservation',
  'upgrade-recovery',
]);

export interface CIDeliveryRequest {
  schema: 'VidaCIDeliveryRequest/v1';
  operation_id: string;
  version: string;
  repository_id: string;
  project_ids: string[];
  target: string;
  source_binding: string;
  request_id: string;
}
export interface CIDeliveryCheck {
  id: string;
  status: string;
}
export interface DependencyCache {
  id: number;
  key: string;
  ref: string;
  version: string;
  size_in_bytes: number;
  restore: 'hit' | 'miss';
  matched_key: string | null;
  save: 'confirmed';
  save_action: 'skipped' | 'success';
}
interface CIDeliveryAsset {
  file: string;
  bytes: number;
  sha256: string;
}
export interface CIDeliveryProfile {
  issuer: string;
  repository_id: string;
  project_ids: string[];
  target: string;
  required_checks: string[];
  github?: GitHubPolicy;
}
interface GitHubPolicy {
  repository: string;
  repository_id: number;
  workflow_id: number;
  source_commit: string;
  workflow_path: string;
  workflow_sha256: string;
  job: string;
  steps: Array<{ id: string; name: string }>;
  artifact_hosts?: string[];
}
interface PackageArchive {
  name?: string;
  version?: string;
  filename: string;
  files: Array<{ path: string; size: number }>;
}
interface CIDeliveryManifest {
  schema: string;
  version: string;
  pin: string;
  target: string;
  inputs: Array<{ path: string; bytes: number; sha256: string }>;
  payloadId: string;
  asset: CIDeliveryAsset;
}
export interface CIDeliveryCandidate {
  operation_id: string;
  version: string;
  source_binding: string;
  candidate_digest?: string;
  archive_sha256: string;
  manifest_sha256: string;
  manifest: CIDeliveryManifest;
  asset?: CIDeliveryAsset;
  pack_metadata: PackageArchive[];
}
interface CIDeliveryResult {
  schema: string;
  request_id: string;
  operation_id: string;
  version: string;
  repository_id: string;
  project_ids: string[];
  target: string;
  source_binding: string;
  archive_sha256: string;
  manifest_sha256: string;
  payload_id: string;
  asset: CIDeliveryAsset;
  issuer: string;
  run_id: string;
  run_attempt: number;
  checks: CIDeliveryCheck[];
  dependency_cache?: DependencyCache;
}
export interface CIDeliveryObservation {
  schema: string;
  issuer: string;
  run_id: string;
  run_attempt: number;
  artifact_id: string;
  conclusion: string;
  checks: CIDeliveryCheck[];
  result_bytes: Buffer;
}
export interface FormationMembers {
  candidate_bytes: Buffer;
  archive_bytes: Buffer;
  manifest_bytes: Buffer;
  asset_bytes: Buffer;
  native_build_result_bytes: Buffer;
  installer_bytes: Buffer;
}
export interface FormationPointer {
  schema: 'VidaLocalReleaseFormation/v1';
  authority: 'local_consistency_only';
  operation_id: string;
  request_id: string;
  version: string;
  source_binding: string;
  run_id: string;
  run_attempt: number;
  artifact_id: string;
  result_sha256: string;
  digest: string;
}
type NativeReleaseTarget = 'bun-linux-x64' | 'bun-windows-x64';
interface TargetFormationRow {
  target: NativeReleaseTarget;
  request_id: string;
  run_id: string;
  run_attempt: number;
  artifact_id: string;
  result_sha256: string;
}
export interface FormationPointerV2 {
  schema: 'VidaLocalReleaseFormation/v2';
  authority: 'local_consistency_only';
  operation_id: string;
  version: string;
  source_binding: string;
  targets: TargetFormationRow[];
  digest: string;
}
type TargetCI = {
  target: NativeReleaseTarget;
  request_id: string;
  profile: CIDeliveryProfile;
  observe: (args: { request: CIDeliveryRequest; candidate: CIDeliveryCandidate }) => Promise<CIDeliveryObservation>;
};

export interface GitHubJob {
  id?: number;
  name: string;
  run_id: number;
  run_attempt: number;
  status: string;
  conclusion: string;
  started_at: string;
  completed_at: string;
  steps: Array<{
    name: string;
    status: string;
    conclusion: string;
    number?: number | null;
    started_at?: string | null;
    completed_at?: string | null;
  }>;
}
export interface GitHubArtifact {
  id: number;
  name: string;
  expired: boolean;
  digest: string;
  created_at: string;
  workflow_run: {
    id: number;
    repository_id: number;
    head_repository_id: number;
    head_sha: string;
  };
}

export function nativeBuildArtifactName(requestId: string, runId: string, attempt: number): string {
  check(
    hex.test(requestId) && /^[1-9]\d*$/u.test(runId) && isPositiveSafeInteger(attempt),
    'native artifact name identity invalid',
  );
  return `build-${requestId}-${runId}-${attempt}`;
}

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('GAP-VIDA-CI-DELIVERY-001: ' + message);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function exact(value: unknown, fields: readonly string[]): asserts value is Record<string, unknown> {
  check(
    isRecord(value) && canonicalJSON(Object.keys(value).sort()) === canonicalJSON([...fields].sort()),
    'CI contract fields differ',
  );
}
function parseJSON(text: string): unknown {
  return JSON.parse(text);
}
function equal(left: unknown, right: unknown): boolean {
  return canonicalJSON(left) === canonicalJSON(right);
}
function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string');
}
function projects(value: unknown): asserts value is string[] {
  check(
    isStringArray(value) &&
      value.length > 0 &&
      value.every((item) => projectIdPattern.test(item)) &&
      new Set(value).size === value.length &&
      equal(
        value,
        [...value].sort((a, b) => a.localeCompare(b)),
      ),
    'exact project set invalid',
  );
}
function safeMemberPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 1024 &&
    !value.includes('\\') &&
    !value.startsWith('/') &&
    value.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..')
  );
}
function resultFields(): string[] {
  return [
    'schema',
    'request_id',
    'operation_id',
    'version',
    'repository_id',
    'project_ids',
    'target',
    'source_binding',
    'archive_sha256',
    'manifest_sha256',
    'payload_id',
    'asset',
    'issuer',
    'run_id',
    'run_attempt',
    'checks',
  ];
}
function requestPath(operation: string, requestId: string): string {
  check(releaseIdPattern.test(operation) && hex.test(requestId), 'request identity invalid');
  return `.agent/work/agent-local-release/${operation}/ci/${requestId}/request.json`;
}
function formationPath(): string {
  return '.agent/work/agent-local-release/formed.json';
}
function resultPath(operation: string, requestId: string): string {
  check(releaseIdPattern.test(operation) && hex.test(requestId), 'formation identity invalid');
  return `.agent/work/agent-local-release/${operation}/ci/${requestId}/result.json`;
}
function formationPointer(value: unknown): FormationPointer {
  exact(value, [
    'schema',
    'authority',
    'operation_id',
    'request_id',
    'version',
    'source_binding',
    'run_id',
    'run_attempt',
    'artifact_id',
    'result_sha256',
    'digest',
  ]);
  const record = value;
  const { digest: pointerDigest, ...body } = record;
  check(
    record.schema === 'VidaLocalReleaseFormation/v1' &&
      record.authority === 'local_consistency_only' &&
      typeof record.operation_id === 'string' &&
      releaseIdPattern.test(record.operation_id) &&
      typeof record.request_id === 'string' &&
      hex.test(record.request_id) &&
      typeof record.version === 'string' &&
      parseReleaseVersion(record.version) !== null &&
      typeof record.source_binding === 'string' &&
      hex.test(record.source_binding) &&
      typeof record.run_id === 'string' &&
      record.run_id.length > 0 &&
      isPositiveSafeInteger(record.run_attempt) &&
      typeof record.artifact_id === 'string' &&
      record.artifact_id.length > 0 &&
      typeof record.result_sha256 === 'string' &&
      hex.test(record.result_sha256) &&
      typeof pointerDigest === 'string' &&
      pointerDigest === digest(canonicalJSON(body)),
    'formed build pointer is invalid',
  );
  return {
    schema: 'VidaLocalReleaseFormation/v1',
    authority: 'local_consistency_only',
    operation_id: record.operation_id,
    request_id: record.request_id,
    version: record.version,
    source_binding: record.source_binding,
    run_id: record.run_id,
    run_attempt: record.run_attempt,
    artifact_id: record.artifact_id,
    result_sha256: record.result_sha256,
    digest: pointerDigest,
  };
}
function regularBytes(root: string, relative: string, limit = 8 * 1024 * 1024): Buffer {
  const file = releasePath(root, relative);
  const stat = lstatSync(file);
  check(stat.isFile() && stat.size <= limit, 'CI file unsafe or oversized');
  return readFileSync(file);
}
function requestBody(args: {
  root: string;
  operation: string;
  context: { schema?: string; repository_id: string; project_ids: string[] };
  target: string;
  source_binding?: string;
}): Omit<CIDeliveryRequest, 'request_id'> {
  const { root, operation, context, target, source_binding } = args;
  check(
    releaseIdPattern.test(operation) &&
      context?.schema === 'ProjectContext/v1' &&
      projectIdPattern.test(context.repository_id) &&
      targetPattern.test(target),
    'request context invalid',
  );
  projects(context.project_ids);
  const state = releaseState(releasePath(root, `.agent/work/agent-local-release/${operation}/release.json`));
  const pending = releaseState(releasePath(root, '.agent/work/agent-local-release/pending.json'));
  check(
    state.operation_id === operation &&
      pending.operation_id === operation &&
      state.version === pending.version &&
      !state.install_started,
    'request operation differs or installation started',
  );
  return {
    schema: 'VidaCIDeliveryRequest/v1',
    operation_id: operation,
    version: state.version,
    repository_id: context.repository_id,
    project_ids: [...context.project_ids],
    target,
    source_binding: source_binding ?? releaseSourceBinding(root).source_binding,
  };
}
function requestShape(record: Record<string, unknown>): boolean {
  return (
    record.schema === 'VidaCIDeliveryRequest/v1' &&
    typeof record.operation_id === 'string' &&
    releaseIdPattern.test(record.operation_id) &&
    typeof record.version === 'string' &&
    parseReleaseVersion(record.version) !== null &&
    typeof record.repository_id === 'string' &&
    projectIdPattern.test(record.repository_id) &&
    typeof record.target === 'string' &&
    targetPattern.test(record.target) &&
    typeof record.source_binding === 'string' &&
    hex.test(record.source_binding) &&
    typeof record.request_id === 'string'
  );
}
function assertManifest(value: unknown): asserts value is CIDeliveryManifest {
  exact(value, ['schema', 'version', 'pin', 'target', 'inputs', 'payloadId', 'asset']);
  check(
    typeof value.schema === 'string' &&
      typeof value.version === 'string' &&
      typeof value.pin === 'string' &&
      parseReleaseVersion(value.pin) !== null &&
      typeof value.target === 'string' &&
      typeof value.payloadId === 'string' &&
      Array.isArray(value.inputs) &&
      isRecord(value.asset),
    'native manifest shape invalid',
  );
  exact(value.asset, ['file', 'bytes', 'sha256']);
  check(
    typeof value.asset.file === 'string' &&
      isPositiveSafeInteger(value.asset.bytes) &&
      typeof value.asset.sha256 === 'string',
    'native manifest asset invalid',
  );
  for (const input of value.inputs) {
    exact(input, ['path', 'bytes', 'sha256']);
    check(
      typeof input.path === 'string' && typeof input.bytes === 'number' && typeof input.sha256 === 'string',
      'native manifest input invalid',
    );
  }
}
function assertCandidate(value: unknown): asserts value is CIDeliveryCandidate {
  exact(value, [
    'operation_id',
    'version',
    'source_binding',
    'pack_metadata',
    'archive_sha256',
    'manifest_sha256',
    'manifest',
  ]);
  check(
    typeof value.operation_id === 'string' &&
      typeof value.version === 'string' &&
      typeof value.source_binding === 'string' &&
      typeof value.archive_sha256 === 'string' &&
      typeof value.manifest_sha256 === 'string' &&
      Array.isArray(value.pack_metadata),
    'native candidate shape invalid',
  );
  assertManifest(value.manifest);
  for (const entry of value.pack_metadata) {
    check(
      isRecord(entry) && typeof entry.filename === 'string' && Array.isArray(entry.files),
      'native package inventory invalid',
    );
    for (const file of entry.files) {
      check(
        isRecord(file) && typeof file.path === 'string' && typeof file.size === 'number',
        'native package file invalid',
      );
    }
  }
}
function assertPersistedResult(value: unknown): asserts value is CIDeliveryResult {
  check(isRecord(value), 'persisted result must be an object');
  check(typeof value.schema === 'string', 'persisted result schema invalid');
  if (value.schema === 'VidaCIDeliveryResult/v2') exact(value, [...resultFields(), 'dependency_cache']);
  else exact(value, resultFields());
  check(
    typeof value.request_id === 'string' &&
      typeof value.operation_id === 'string' &&
      typeof value.version === 'string' &&
      typeof value.repository_id === 'string' &&
      isStringArray(value.project_ids) &&
      typeof value.target === 'string' &&
      typeof value.source_binding === 'string' &&
      typeof value.archive_sha256 === 'string' &&
      typeof value.manifest_sha256 === 'string' &&
      typeof value.payload_id === 'string' &&
      isRecord(value.asset) &&
      typeof value.issuer === 'string' &&
      typeof value.run_id === 'string' &&
      typeof value.run_attempt === 'number' &&
      Array.isArray(value.checks),
    'delivery result shape invalid',
  );
  exact(value.asset, ['file', 'bytes', 'sha256']);
  check(
    typeof value.asset.file === 'string' &&
      typeof value.asset.bytes === 'number' &&
      typeof value.asset.sha256 === 'string',
    'delivery result asset invalid',
  );
  for (const item of value.checks) {
    exact(item, ['id', 'status']);
    check(typeof item.id === 'string' && typeof item.status === 'string', 'delivery result check invalid');
  }
  check(
    value.schema === 'VidaCIDeliveryResult/v1' || value.schema === 'VidaCIDeliveryResult/v2',
    'persisted result schema unsupported',
  );
  if (value.schema === 'VidaCIDeliveryResult/v2') validateDependencyCache(value.dependency_cache);
}
function assertCIDeliveryResult(value: unknown): asserts value is CIDeliveryResult {
  assertPersistedResult(value);
  check(value.schema === 'VidaCIDeliveryResult/v2', 'current delivery result must be v2');
}
export function validateCIDeliveryRequest(value: unknown): asserts value is CIDeliveryRequest {
  exact(value, [
    'schema',
    'operation_id',
    'version',
    'repository_id',
    'project_ids',
    'target',
    'source_binding',
    'request_id',
  ]);
  const fields = value;
  const requestId = fields.request_id;
  const body = {
    schema: fields.schema,
    operation_id: fields.operation_id,
    version: fields.version,
    repository_id: fields.repository_id,
    project_ids: fields.project_ids,
    target: fields.target,
    source_binding: fields.source_binding,
  };
  projects(fields.project_ids);
  check(
    requestShape(fields) && typeof requestId === 'string' && requestId === digest(canonicalJSON(body)),
    'request binding invalid',
  );
}
export function recordCIDeliveryRequest(args: {
  root: string;
  operation: string;
  context: { schema?: string; repository_id: string; project_ids: string[] };
  target: string;
}): CIDeliveryRequest {
  const body = requestBody(args);
  const request: CIDeliveryRequest = {
    ...body,
    request_id: digest(canonicalJSON(body)),
  };
  const relative = requestPath(args.operation, request.request_id);
  const bytes = Buffer.from(canonicalJSON(request));
  const file = releasePath(args.root, relative, true);
  if (existsSync(file)) {
    check(regularBytes(args.root, relative).equals(bytes), 'partial or changed request; preserve UNKNOWN');
  } else {
    releaseDirectory(args.root, path.posix.dirname(relative));
    writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
  }
  return request;
}
/** Issue the fixed repository workflow's two dispatch inputs through the existing request owner. */
export function issueApprovedNativePair(args: { root: string; operation: string }): {
  linux: CIDeliveryRequest;
  windows: CIDeliveryRequest;
} {
  const identity = readRuntimeConfigIdentityForObservation(args.root);
  check(
    identity.repository_id === 'vida-agent' &&
      identity.bundle === 'packages/agent' &&
      identity.project_ids.includes('agent'),
    'approved repository project identity differs',
  );
  const context = {
    schema: 'ProjectContext/v1',
    repository_id: identity.repository_id,
    project_ids: ['agent'],
  };
  const linux = recordCIDeliveryRequest({
    ...args,
    context,
    target: 'bun-linux-x64',
  });
  const windows = recordCIDeliveryRequest({
    ...args,
    context,
    target: 'bun-windows-x64',
  });
  check(
    linux.operation_id === windows.operation_id &&
      linux.version === windows.version &&
      linux.source_binding === windows.source_binding,
    'request pair changed during issuance; retain issued requests',
  );
  return { linux, windows };
}
function profileMatches(request: CIDeliveryRequest, profile: CIDeliveryProfile): void {
  check(
    typeof profile.issuer === 'string' &&
      profile.issuer.length > 0 &&
      profile.repository_id === request.repository_id &&
      equal(profile.project_ids, request.project_ids) &&
      profile.target === request.target &&
      profile.required_checks.length > 0 &&
      new Set(profile.required_checks).size === profile.required_checks.length &&
      profile.required_checks.every((item) => item.length > 0) &&
      (equal(profile.required_checks, minimumNativeDeliveryChecks) ||
        equal(profile.required_checks, nativeDeliveryChecks)),
    'approved exact native build profile required',
  );
}
function assertDependencyCache(value: unknown): asserts value is DependencyCache {
  exact(value, ['id', 'key', 'ref', 'version', 'size_in_bytes', 'restore', 'matched_key', 'save', 'save_action']);
  check(isPositiveSafeInteger(value.id), 'dependency cache ID is invalid');
  const key = value.key;
  check(typeof key === 'string', 'dependency cache key is invalid');
  const cacheKey = /^vida-bun-install-v1-[A-Za-z0-9_-]+-bun-(\d+\.\d+\.\d+)-[a-f0-9]{64}$/.exec(key);
  check(cacheKey !== null && parseReleaseVersion(cacheKey[1] ?? '') !== null, 'dependency cache key is invalid');
  check(
    typeof value.ref === 'string' && /^refs\/heads\/[A-Za-z0-9._/-]+$/.test(value.ref),
    'dependency cache ref is invalid',
  );
  check(
    typeof value.version === 'string' &&
      value.version.length > 0 &&
      value.version.length <= 256 &&
      !Array.from(value.version).some((character) => {
        const code = character.charCodeAt(0);
        return (code >= 0 && code <= 31) || (code >= 127 && code <= 159);
      }),
    'dependency cache version is invalid',
  );
  check(isPositiveSafeInteger(value.size_in_bytes), 'dependency cache size is invalid');
  check(value.save === 'confirmed', 'dependency cache API row is unconfirmed');
  if (value.restore === 'hit') {
    check(value.save_action === 'skipped' && value.matched_key === key, 'dependency cache hit differs');
  } else {
    const matchedKey = value.matched_key;
    const matchedCacheKey =
      typeof matchedKey === 'string'
        ? /^vida-bun-install-v1-[A-Za-z0-9_-]+-bun-(\d+\.\d+\.\d+)-[a-f0-9]{64}$/.exec(matchedKey)
        : null;
    check(
      value.restore === 'miss' &&
        value.save_action === 'success' &&
        (matchedKey === null ||
          (typeof matchedKey === 'string' &&
            matchedCacheKey !== null &&
            parseReleaseVersion(matchedCacheKey[1] ?? '') !== null &&
            matchedKey.startsWith(key.slice(0, -64)) &&
            matchedKey !== key)),
      'dependency cache save observation differs',
    );
  }
}
export function validateDependencyCache(value: unknown): DependencyCache {
  assertDependencyCache(value);
  return value;
}
function validateChecks(checks: CIDeliveryCheck[], profile: CIDeliveryProfile): void {
  check(
    Array.isArray(checks) &&
      checks.length === profile.required_checks.length &&
      equal(checks.map((item) => item.id).sort(), [...profile.required_checks].sort()),
    'required CI checks differ',
  );
  for (const item of checks) {
    exact(item, ['id', 'status']);
    check(item.status === 'passed', 'failed, skipped or UNKNOWN CI check');
  }
}
function validateResult(args: {
  request: CIDeliveryRequest;
  candidate: CIDeliveryCandidate;
  profile: CIDeliveryProfile;
  result: CIDeliveryResult;
}): void {
  const { request, candidate, profile, result } = args;
  validateCIDeliveryRequest(request);
  profileMatches(request, profile);
  exact(result, [...resultFields(), 'dependency_cache']);
  if (result.dependency_cache !== undefined) validateDependencyCache(result.dependency_cache);
  const requestFields: (keyof CIDeliveryRequest)[] = [
    'request_id',
    'operation_id',
    'version',
    'repository_id',
    'project_ids',
    'target',
    'source_binding',
  ];
  for (const field of requestFields) check(equal(result[field], request[field]), `result request differs: ${field}`);
  check(
    result.issuer === profile.issuer && result.run_id.length > 0 && isPositiveSafeInteger(result.run_attempt),
    'result run identity differs',
  );
  validateChecks(result.checks, profile);
  const cachePinMatches =
    result.dependency_cache === undefined ||
    /^vida-bun-install-v1-[A-Za-z0-9_-]+-bun-(\d+\.\d+\.\d+)-[a-f0-9]{64}$/.exec(result.dependency_cache.key)?.[1] ===
      candidate.manifest.pin;
  check(cachePinMatches, 'dependency cache Bun pin differs');
  exact(result.asset, ['file', 'bytes', 'sha256']);
  check(
    result.schema === 'VidaCIDeliveryResult/v2' &&
      candidate.operation_id === request.operation_id &&
      candidate.version === request.version &&
      candidate.source_binding === request.source_binding &&
      candidate.manifest.target === request.target &&
      parseReleaseVersion(candidate.manifest.pin) !== null &&
      cachePinMatches &&
      hex.test(candidate.manifest.payloadId) &&
      candidate.manifest.inputs.length > 0 &&
      result.archive_sha256 === candidate.archive_sha256 &&
      result.manifest_sha256 === candidate.manifest_sha256 &&
      result.payload_id === candidate.manifest.payloadId &&
      equal(result.asset, candidate.manifest.asset),
    'CI candidate archive/manifest/payload differs',
  );
}
export function encodeCIDeliveryResult(args: {
  request: CIDeliveryRequest;
  candidate: CIDeliveryCandidate;
  profile: CIDeliveryProfile;
  observation: {
    issuer: string;
    run_id: string;
    run_attempt: number;
    conclusion: string;
    checks: CIDeliveryCheck[];
  };
  dependency_cache: DependencyCache;
}): Buffer {
  const { request, candidate, profile, observation, dependency_cache } = args;
  exact(observation, ['issuer', 'run_id', 'run_attempt', 'conclusion', 'checks']);
  validateDependencyCache(dependency_cache);
  check(observation.conclusion === 'success', 'producer observations failed or UNKNOWN');
  const result: CIDeliveryResult = {
    schema: 'VidaCIDeliveryResult/v2',
    request_id: request.request_id,
    operation_id: request.operation_id,
    version: request.version,
    repository_id: request.repository_id,
    project_ids: request.project_ids,
    target: request.target,
    source_binding: request.source_binding,
    archive_sha256: candidate.archive_sha256,
    manifest_sha256: candidate.manifest_sha256,
    payload_id: candidate.manifest.payloadId,
    asset: candidate.manifest.asset,
    issuer: observation.issuer,
    run_id: observation.run_id,
    run_attempt: observation.run_attempt,
    checks: observation.checks,
    dependency_cache,
  };
  validateResult({ request, candidate, profile, result });
  return Buffer.from(canonicalJSON(result));
}
export function validateCIDeliveryObservation(args: {
  request: CIDeliveryRequest;
  candidate: CIDeliveryCandidate;
  profile: CIDeliveryProfile;
  observation: CIDeliveryObservation;
}): { source_binding: string; request_id: string; operation_id: string } {
  const { request, candidate, profile, observation } = args;
  validateCIDeliveryRequest(request);
  profileMatches(request, profile);
  exact(observation, [
    'schema',
    'issuer',
    'run_id',
    'run_attempt',
    'artifact_id',
    'conclusion',
    'checks',
    'result_bytes',
  ]);
  check(
    observation.schema === 'VidaCIDeliveryObservation/v1' &&
      observation.issuer === profile.issuer &&
      observation.run_id.length > 0 &&
      isPositiveSafeInteger(observation.run_attempt) &&
      observation.artifact_id.length > 0 &&
      observation.conclusion === 'success' &&
      Buffer.isBuffer(observation.result_bytes) &&
      observation.result_bytes.length <= 8 * 1024 * 1024,
    'actual complete controller observation required',
  );
  validateChecks(observation.checks, profile);
  const parsed = parseJSON(observation.result_bytes.toString('utf8'));
  check(isRecord(parsed), 'persisted result must be an object');
  assertCIDeliveryResult(parsed);
  const result = parsed;
  validateResult({ request, candidate, profile, result });
  const observationFields: (keyof CIDeliveryObservation)[] = ['issuer', 'run_id', 'run_attempt', 'checks'];
  for (const field of observationFields)
    check(equal(result[field], observation[field]), `result observation differs: ${field}`);
  return {
    source_binding: request.source_binding,
    request_id: request.request_id,
    operation_id: request.operation_id,
  };
}
export async function verifyCIDeliveryEvidence(args: {
  root: string;
  operation: string;
  version: string;
  ci?:
    | {
        request_id: string;
        profile: CIDeliveryProfile;
        observe: (args: {
          request: CIDeliveryRequest;
          candidate: CIDeliveryCandidate;
        }) => Promise<CIDeliveryObservation>;
      }
    | null
    | undefined;
}): Promise<{
  source_binding: string;
  request_id: string;
  operation_id: string;
}> {
  const { root, operation, version, ci } = args;
  check(
    ci && typeof ci.observe === 'function',
    'no actual trusted controller observation supplied; local logs cannot qualify delivery',
  );
  const candidate = readNativeRetargetCandidate({
    root,
    operation,
    published: true,
  });
  const requestValue = parseJSON(regularBytes(root, requestPath(operation, ci.request_id)).toString('utf8'));
  validateCIDeliveryRequest(requestValue);
  const request = requestValue;
  const pending = releaseState(releasePath(root, '.agent/work/agent-local-release/pending.json'));
  check(
    request.request_id === ci.request_id &&
      request.operation_id === operation &&
      request.version === version &&
      pending.operation_id === operation &&
      pending.version === version &&
      request.source_binding === candidate.source_binding,
    'current request differs',
  );
  const profile = structuredClone(ci.profile);
  profileMatches(request, profile);
  const observation = await ci.observe({
    request: structuredClone(request),
    candidate: structuredClone(candidate),
  });
  recheckNativeRetargetCandidate(root, candidate);
  check(
    regularBytes(root, requestPath(operation, ci.request_id)).equals(Buffer.from(canonicalJSON(request))),
    'request changed during observation',
  );
  const validated = validateCIDeliveryObservation({
    request,
    candidate,
    profile,
    observation,
  });
  await withReleaseAdmission(root, () => {
    const currentPending = releaseState(releasePath(root, '.agent/work/agent-local-release/pending.json'));
    check(
      currentPending.operation_id === operation &&
        currentPending.version === version &&
        !currentPending.install_started &&
        regularBytes(root, requestPath(operation, ci.request_id)).equals(Buffer.from(canonicalJSON(request))),
      'pending release or CI request changed during result publication',
    );
    recheckNativeRetargetCandidate(root, candidate);
    persistCIDeliveryFormation(root, request, observation);
  });
  return validated;
}
export function validateCIArtifactAttempt(args: {
  artifact: GitHubArtifact;
  request: CIDeliveryRequest;
  run_id: string;
  run_attempt: number;
  repository_id: number;
  source_commit: string;
  job: GitHubJob;
  artifact_kind?: 'formation' | 'native-build';
}): void {
  const { artifact, request, run_id, run_attempt, repository_id, source_commit, job } = args;
  const start = Date.parse(job.started_at),
    end = Date.parse(job.completed_at),
    created = Date.parse(artifact.created_at);
  check(
    [start, end, created].every(Number.isFinite) &&
      start <= created &&
      created <= end &&
      artifact.expired === false &&
      artifact.workflow_run.id === Number(run_id) &&
      artifact.workflow_run.repository_id === repository_id &&
      artifact.workflow_run.head_repository_id === repository_id &&
      artifact.workflow_run.head_sha === source_commit &&
      artifact.name ===
        (args.artifact_kind === 'native-build'
          ? nativeBuildArtifactName(request.request_id, run_id, run_attempt)
          : `${request.request_id}-${run_attempt}`) &&
      /^sha256:[a-f0-9]{64}$/.test(artifact.digest),
    'artifact differs from selected Source/run attempt interval',
  );
}
export function validateCIDownloadLocation(location: string | null, hosts: unknown): string {
  let url: URL;
  try {
    check(typeof location === 'string', 'artifact redirect missing');
    url = new URL(location);
  } catch {
    throw new Error('GAP-VIDA-CI-DELIVERY-001: invalid artifact redirect');
  }
  check(
    isStringArray(hosts) &&
      hosts.length > 0 &&
      new Set(hosts).size === hosts.length &&
      hosts.every((host) => /^(?:[a-z0-9]+(?:-[a-z0-9]+)*\.)+[a-z0-9]+$/.test(host)),
    'approved exact artifact hosts required',
  );
  check(
    url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !url.port &&
      !url.hash &&
      hosts.includes(url.hostname),
    'artifact redirect origin differs',
  );
  return url.href;
}

function validateCIProducerArtifactLocation(location: string | null): string {
  check(typeof location === 'string', 'artifact redirect missing');
  let url: URL;
  try {
    url = new URL(location);
  } catch {
    throw new Error('GAP-VIDA-CI-DELIVERY-001: invalid artifact redirect');
  }
  check(
    /^productionresults[a-z0-9-]*\.blob\.core\.windows\.net$/.test(url.hostname),
    'producer artifact host rejected',
  );
  return validateCIDownloadLocation(location, [url.hostname]);
}
export function validateCIDeliveryFormationMembers(args: {
  request: CIDeliveryRequest;
  members: FormationMembers;
  providerObservation: {
    issuer: string;
    run_id: string;
    run_attempt: number;
    artifact_id: string;
  };
  profile: CIDeliveryProfile;
}): {
  candidate: CIDeliveryCandidate;
  checks: CIDeliveryCheck[];
  observation: CIDeliveryObservation;
} {
  const { request, providerObservation, profile } = args;
  const { candidate, checks, dependency_cache } = validateCIProducerFormationMembers(args);
  const resultBytes = encodeCIDeliveryResult({
    request,
    candidate,
    profile,
    observation: {
      issuer: providerObservation.issuer,
      run_id: providerObservation.run_id,
      run_attempt: providerObservation.run_attempt,
      conclusion: 'success',
      checks,
    },
    dependency_cache,
  });
  return {
    candidate,
    checks,
    observation: {
      schema: 'VidaCIDeliveryObservation/v1',
      issuer: providerObservation.issuer,
      run_id: providerObservation.run_id,
      run_attempt: providerObservation.run_attempt,
      artifact_id: providerObservation.artifact_id,
      conclusion: 'success',
      checks,
      result_bytes: resultBytes,
    },
  };
}
export function validateCIProducerFormationMembers(args: {
  request: CIDeliveryRequest;
  members: FormationMembers;
  providerObservation: {
    issuer: string;
    run_id: string;
    run_attempt: number;
    artifact_id: string;
  };
  profile: CIDeliveryProfile;
}): {
  candidate: CIDeliveryCandidate;
  checks: CIDeliveryCheck[];
  dependency_cache: DependencyCache;
} {
  const { request, members, providerObservation, profile } = args;
  validateCIDeliveryRequest(request);
  check(
    Buffer.isBuffer(members.candidate_bytes) &&
      Buffer.isBuffer(members.archive_bytes) &&
      Buffer.isBuffer(members.manifest_bytes) &&
      Buffer.isBuffer(members.asset_bytes) &&
      Buffer.isBuffer(members.native_build_result_bytes) &&
      Buffer.isBuffer(members.installer_bytes),
    'CI formation members must be byte buffers',
  );
  const candidateValue = parseFormationJSON(members.candidate_bytes, 'candidate', 8 * 1024 * 1024);
  const manifestValue = parseFormationJSON(members.manifest_bytes, 'manifest', 8 * 1024 * 1024);
  check(isRecord(candidateValue) && isRecord(manifestValue), 'candidate or manifest object invalid');
  assertCandidate(candidateValue);
  assertManifest(manifestValue);
  const candidate = candidateValue;
  const manifest = manifestValue;
  exact(candidateValue, [
    'operation_id',
    'version',
    'source_binding',
    'pack_metadata',
    'archive_sha256',
    'manifest_sha256',
    'manifest',
  ]);
  exact(manifestValue, ['schema', 'version', 'pin', 'target', 'inputs', 'payloadId', 'asset']);
  exact(manifest.asset, ['file', 'bytes', 'sha256']);
  check(
    candidate.operation_id === request.operation_id &&
      candidate.version === request.version &&
      candidate.source_binding === request.source_binding &&
      equal(candidate.manifest, manifest) &&
      manifest.schema === 'VidaStandaloneBuild/v1' &&
      manifest.version === request.version &&
      parseReleaseVersion(manifest.pin) !== null &&
      manifest.target === request.target &&
      hex.test(manifest.payloadId) &&
      manifest.inputs.length > 0 &&
      manifest.inputs.length <= 100000 &&
      hex.test(candidate.archive_sha256) &&
      hex.test(candidate.manifest_sha256) &&
      digest(members.archive_bytes) === candidate.archive_sha256 &&
      digest(members.manifest_bytes) === candidate.manifest_sha256,
    'CI candidate, manifest, archive or request differs',
  );
  const inputPaths = new Set<string>();
  for (const input of manifest.inputs) {
    exact(input, ['path', 'bytes', 'sha256']);
    check(
      safeMemberPath(input.path) &&
        !inputPaths.has(input.path) &&
        isPositiveSafeInteger(input.bytes) &&
        hex.test(input.sha256),
      'native manifest input inventory invalid',
    );
    inputPaths.add(input.path);
  }
  check(
    safeMemberPath(manifest.asset.file) &&
      !manifest.asset.file.includes('/') &&
      isPositiveSafeInteger(manifest.asset.bytes) &&
      hex.test(manifest.asset.sha256) &&
      members.archive_bytes.length > 0 &&
      members.archive_bytes.length <= ciArchiveLimit &&
      members.asset_bytes.length === manifest.asset.bytes &&
      digest(members.asset_bytes) === manifest.asset.sha256 &&
      members.installer_bytes.length > 0 &&
      members.installer_bytes.length <= 1024 * 1024,
    'native archive, asset or installer bytes invalid',
  );
  check(candidate.pack_metadata.length === 1, 'exact one CI package archive required');
  const pack = candidate.pack_metadata[0];
  check(
    pack?.name === 'vida-agent' &&
      pack.version === request.version &&
      pack.filename === `vida-agent-${request.version}.tgz` &&
      pack.files.length > 0 &&
      pack.files.length <= 100000,
    'CI package archive metadata differs',
  );
  const packPaths = new Set<string>();
  for (const file of pack.files) {
    check(
      safeMemberPath(file.path) && !packPaths.has(file.path) && Number.isSafeInteger(file.size) && file.size >= 0,
      'CI package file inventory invalid',
    );
    packPaths.add(file.path);
  }
  const manifests = pack.files.filter((file) => file.path === 'dist/standalone/manifest.json');
  const assets = pack.files.filter((file) => file.path === `dist/standalone/${manifest.asset.file}`);
  check(
    manifests.length === 1 &&
      manifests[0]?.size === members.manifest_bytes.length &&
      assets.length === 1 &&
      assets[0]?.size === members.asset_bytes.length,
    'CI package inventory differs from actual native manifest and asset',
  );
  const receiptValue = parseFormationJSON(members.native_build_result_bytes, 'native-build result', 1024 * 1024);
  check(isRecord(receiptValue), 'native-build result object invalid');
  exact(receiptValue, [
    'schema',
    'request_id',
    'run_id',
    'run_attempt',
    'source_binding',
    'archive_sha256',
    'phase',
    'status',
    'dependency_cache',
  ]);
  check(
    receiptValue.schema === 'VidaCIPhaseResult/v2' &&
      receiptValue.request_id === request.request_id &&
      receiptValue.run_id === providerObservation.run_id &&
      receiptValue.run_attempt === providerObservation.run_attempt &&
      receiptValue.source_binding === request.source_binding &&
      receiptValue.archive_sha256 === candidate.archive_sha256 &&
      receiptValue.phase === 'native-build' &&
      receiptValue.status === 'passed',
    'native-build result differs from the selected request and provider run',
  );
  const dependencyCache = receiptValue.dependency_cache;
  check(isRecord(dependencyCache), 'native dependency cache result invalid');
  const validatedDependencyCache = validateDependencyCache(dependencyCache);
  const checks = [{ id: 'native-build', status: 'passed' }];
  profileMatches(request, profile);
  check(
    providerObservation.issuer === profile.issuer &&
      approvedProviderNumber(providerObservation.run_id) &&
      Number.isSafeInteger(providerObservation.run_attempt) &&
      providerObservation.run_attempt > 0 &&
      approvedProviderNumber(providerObservation.artifact_id),
    'producer provider identity invalid',
  );
  validateChecks(checks, profile);
  check(
    /^vida-bun-install-v1-[A-Za-z0-9_-]+-bun-(\d+\.\d+\.\d+)-[a-f0-9]{64}$/.exec(validatedDependencyCache.key)?.[1] ===
      candidate.manifest.pin,
    'CI candidate archive/manifest/payload differs',
  );
  return { candidate, checks, dependency_cache: validatedDependencyCache };
}
export function readConfirmedCIDeliveryFormation(root: string): FormationPointer | FormationPointerV2 | null {
  const relative = formationPath();
  const file = releasePath(root, relative, true);
  if (!existsSync(file)) return null;
  const raw = parseJSON(regularBytes(root, relative).toString('utf8'));
  if (isRecord(raw) && raw.schema === 'VidaLocalReleaseFormation/v2') return readConfirmedTargetFormation(root, raw);
  const pointer = formationPointer(raw);
  const journal = releaseState(
    releasePath(root, `.agent/work/agent-local-release/${pointer.operation_id}/release.json`),
  );
  const request = parseJSON(regularBytes(root, requestPath(pointer.operation_id, pointer.request_id)).toString('utf8'));
  validateCIDeliveryRequest(request);
  check(
    journal.operation_id === pointer.operation_id &&
      journal.version === pointer.version &&
      request.operation_id === pointer.operation_id &&
      request.request_id === pointer.request_id &&
      request.version === pointer.version &&
      request.source_binding === pointer.source_binding,
    'formed build pointer differs from its operation or request',
  );
  const bytes = regularBytes(root, resultPath(pointer.operation_id, pointer.request_id));
  check(digest(bytes) === pointer.result_sha256, 'formed build result receipt changed');
  const resultValue = parseJSON(bytes.toString('utf8'));
  assertPersistedResult(resultValue);
  const identityFields: Array<keyof CIDeliveryRequest> = [
    'request_id',
    'operation_id',
    'version',
    'repository_id',
    'project_ids',
    'target',
    'source_binding',
  ];
  for (const field of identityFields) {
    check(equal(resultValue[field], request[field]), `formation result request differs: ${field}`);
  }
  const resultProfile: CIDeliveryProfile = {
    issuer: resultValue.issuer,
    repository_id: request.repository_id,
    project_ids: request.project_ids,
    target: request.target,
    required_checks: resultValue.checks.map((item) => item.id),
  };
  profileMatches(request, resultProfile);
  validateChecks(resultValue.checks, resultProfile);
  check(
    resultValue.run_id.length > 0 &&
      isPositiveSafeInteger(resultValue.run_attempt) &&
      hex.test(resultValue.archive_sha256) &&
      hex.test(resultValue.manifest_sha256) &&
      hex.test(resultValue.payload_id) &&
      resultValue.asset.file.length > 0 &&
      isPositiveSafeInteger(resultValue.asset.bytes) &&
      hex.test(resultValue.asset.sha256),
    'formation result identity or asset differs',
  );
  check(
    resultValue.run_id === pointer.run_id && resultValue.run_attempt === pointer.run_attempt,
    'formed build pointer differs from its exact result',
  );
  return pointer;
}
function readConfirmedTargetFormation(root: string, value: unknown): FormationPointerV2 {
  exact(value, ['schema', 'authority', 'operation_id', 'version', 'source_binding', 'targets', 'digest']);
  const { digest: supplied, ...body } = value;
  check(
    value.schema === 'VidaLocalReleaseFormation/v2' &&
      value.authority === 'local_consistency_only' &&
      typeof value.operation_id === 'string' &&
      releaseIdPattern.test(value.operation_id) &&
      typeof value.version === 'string' &&
      parseReleaseVersion(value.version) !== null &&
      typeof value.source_binding === 'string' &&
      hex.test(value.source_binding) &&
      typeof supplied === 'string' &&
      supplied === digest(canonicalJSON(body)) &&
      Array.isArray(value.targets) &&
      value.targets.length === 2,
    'target formation pointer is invalid',
  );
  const operation = value.operation_id,
    version = value.version,
    sourceBinding = value.source_binding;
  const journal = releaseState(releasePath(root, `.agent/work/agent-local-release/${operation}/release.json`));
  check(journal.operation_id === operation && journal.version === version, 'target formation journal differs');
  const rows: TargetFormationRow[] = [];
  let repositoryId: string | undefined;
  let projectIds: string[] | undefined;
  for (const [index, row] of value.targets.entries()) {
    exact(row, ['target', 'request_id', 'run_id', 'run_attempt', 'artifact_id', 'result_sha256']);
    const target = index === 0 ? 'bun-linux-x64' : 'bun-windows-x64';
    check(
      row.target === target &&
        typeof row.request_id === 'string' &&
        hex.test(row.request_id) &&
        typeof row.run_id === 'string' &&
        row.run_id.length > 0 &&
        isPositiveSafeInteger(row.run_attempt) &&
        typeof row.artifact_id === 'string' &&
        row.artifact_id.length > 0 &&
        typeof row.result_sha256 === 'string' &&
        hex.test(row.result_sha256),
      'target formation row differs',
    );
    const requestValue = parseJSON(regularBytes(root, requestPath(operation, row.request_id)).toString('utf8'));
    validateCIDeliveryRequest(requestValue);
    check(
      requestValue.operation_id === operation &&
        requestValue.version === version &&
        requestValue.source_binding === sourceBinding &&
        requestValue.target === target &&
        requestValue.request_id === row.request_id,
      'target formation request differs',
    );
    if (repositoryId === undefined) {
      repositoryId = requestValue.repository_id;
      projectIds = requestValue.project_ids;
    } else
      check(
        requestValue.repository_id === repositoryId && equal(requestValue.project_ids, projectIds),
        'target formation project differs',
      );
    const resultBytes = regularBytes(root, resultPath(operation, row.request_id));
    check(digest(resultBytes) === row.result_sha256, 'target formation result changed');
    const resultValue = parseJSON(resultBytes.toString('utf8'));
    assertPersistedResult(resultValue);
    check(resultValue.schema === 'VidaCIDeliveryResult/v2', 'target formation result schema differs');
    for (const field of [
      'request_id',
      'operation_id',
      'version',
      'repository_id',
      'project_ids',
      'target',
      'source_binding',
    ] as const)
      check(equal(resultValue[field], requestValue[field]), 'target formation result request differs: ' + field);
    const profile: CIDeliveryProfile = {
      issuer: resultValue.issuer,
      repository_id: requestValue.repository_id,
      project_ids: requestValue.project_ids,
      target,
      required_checks: resultValue.checks.map((item) => item.id),
    };
    profileMatches(requestValue, profile);
    validateChecks(resultValue.checks, profile);
    check(
      resultValue.run_id === row.run_id &&
        resultValue.run_attempt === row.run_attempt &&
        hex.test(resultValue.archive_sha256) &&
        hex.test(resultValue.manifest_sha256) &&
        hex.test(resultValue.payload_id) &&
        isPositiveSafeInteger(resultValue.asset.bytes) &&
        hex.test(resultValue.asset.sha256) &&
        resultValue.asset.file === 'vida-agent-' + target + (target.startsWith('bun-windows-') ? '.exe' : ''),
      'target formation result identity differs',
    );
    rows.push({
      target,
      request_id: row.request_id,
      run_id: row.run_id,
      run_attempt: row.run_attempt,
      artifact_id: row.artifact_id,
      result_sha256: row.result_sha256,
    });
  }
  check(
    rows[0]?.artifact_id !== rows[1]?.artifact_id &&
      rows[0]?.request_id !== rows[1]?.request_id &&
      rows[0]?.run_id === rows[1]?.run_id &&
      rows[0]?.run_attempt === rows[1]?.run_attempt,
    'target formation observations are not independent',
  );
  return {
    schema: 'VidaLocalReleaseFormation/v2',
    authority: 'local_consistency_only',
    operation_id: operation,
    version,
    source_binding: sourceBinding,
    targets: rows,
    digest: supplied,
  };
}

/** Confirm both staged targets from actual controller observations. This grants formation consistency only. */
export async function verifyCIDeliveryFormationPair(args: {
  root: string;
  operation: string;
  version: string;
  targets: readonly TargetCI[];
  recheckLocalTests: () => void;
}): Promise<FormationPointerV2> {
  const { root, operation, version, targets, recheckLocalTests } = args;
  check(
    Array.isArray(targets as unknown) && targets.length === 2 && typeof recheckLocalTests === 'function',
    'two target observations required',
  );
  const selected = [...targets].sort((a, b) => a.target.localeCompare(b.target));
  check(
    selected[0]?.target === 'bun-linux-x64' && selected[1]?.target === 'bun-windows-x64',
    'exact Linux and Windows targets required',
  );
  const primary = readNativeRetargetCandidate({
    root,
    operation,
    published: true,
  });
  check(
    primary.version === version && selected.some((entry) => entry.target === primary.manifest.target),
    'published primary target differs',
  );
  const observations: Array<{
    request: CIDeliveryRequest;
    candidate: ReturnType<typeof readNativeRetargetCandidate>;
    observation: CIDeliveryObservation;
    profile: CIDeliveryProfile;
  }> = [];
  for (const selectedTarget of selected) {
    const candidate =
      selectedTarget.target === primary.manifest.target
        ? primary
        : readNativeRetargetCandidate({
            root,
            operation,
            target: selectedTarget.target,
          });
    const requestValue = parseJSON(
      regularBytes(root, requestPath(operation, selectedTarget.request_id)).toString('utf8'),
    );
    validateCIDeliveryRequest(requestValue);
    check(
      requestValue.request_id === selectedTarget.request_id &&
        requestValue.operation_id === operation &&
        requestValue.version === version &&
        requestValue.target === selectedTarget.target &&
        requestValue.source_binding === candidate.source_binding &&
        candidate.version === version,
      'target request differs',
    );
    const profile = structuredClone(selectedTarget.profile);
    profileMatches(requestValue, profile);
    const delivered = await selectedTarget.observe({
      request: structuredClone(requestValue),
      candidate: structuredClone(candidate),
    });
    recheckNativeRetargetCandidate(root, candidate);
    check(
      regularBytes(root, requestPath(operation, requestValue.request_id)).equals(
        Buffer.from(canonicalJSON(requestValue)),
      ),
      'target request changed',
    );
    validateCIDeliveryObservation({
      request: requestValue,
      candidate,
      profile,
      observation: delivered,
    });
    const observation = {
      ...delivered,
      checks: structuredClone(delivered.checks),
      result_bytes: Buffer.from(delivered.result_bytes),
    };
    observations.push({
      request: requestValue,
      candidate,
      observation,
      profile,
    });
  }
  const first = observations[0],
    second = observations[1];
  check(
    first !== undefined &&
      second !== undefined &&
      first.observation.artifact_id !== second.observation.artifact_id &&
      first.observation.run_id === second.observation.run_id &&
      first.observation.run_attempt === second.observation.run_attempt &&
      first.profile.issuer === 'github-actions' &&
      second.profile.issuer === 'github-actions' &&
      first.profile.github !== undefined &&
      second.profile.github !== undefined &&
      first.profile.github.source_commit === second.profile.github.source_commit &&
      /^[a-f0-9]{40}$/.test(first.profile.github.source_commit) &&
      first.profile.github.repository === second.profile.github.repository &&
      first.profile.github.repository_id === second.profile.github.repository_id &&
      first.profile.github.workflow_id === second.profile.github.workflow_id &&
      first.profile.github.workflow_path === second.profile.github.workflow_path &&
      first.profile.github.workflow_sha256 === second.profile.github.workflow_sha256 &&
      first.profile.github.job !== second.profile.github.job &&
      first.request.source_binding === second.request.source_binding &&
      first.request.repository_id === second.request.repository_id &&
      equal(first.request.project_ids, second.request.project_ids),
    'target Source, provider run or project differs',
  );
  let completed: FormationPointerV2 | undefined;
  await withReleaseAdmission(root, () => {
    const pending = releaseState(releasePath(root, '.agent/work/agent-local-release/pending.json'));
    check(
      pending.operation_id === operation && pending.version === version && !pending.install_started,
      'pending release changed',
    );
    recheckLocalTests();
    for (const item of observations) {
      recheckNativeRetargetCandidate(root, item.candidate);
      validateCIDeliveryObservation(item);
      check(
        regularBytes(root, requestPath(operation, item.request.request_id)).equals(
          Buffer.from(canonicalJSON(item.request)),
        ),
        'target request changed',
      );
      const relative = resultPath(operation, item.request.request_id);
      const file = releasePath(root, relative, true);
      if (existsSync(file))
        check(regularBytes(root, relative).equals(item.observation.result_bytes), 'target result already differs');
    }
    const body: Omit<FormationPointerV2, 'digest'> = {
      schema: 'VidaLocalReleaseFormation/v2',
      authority: 'local_consistency_only',
      operation_id: operation,
      version,
      source_binding: first.request.source_binding,
      targets: observations.map(({ request, observation }) => ({
        target: request.target as NativeReleaseTarget,
        request_id: request.request_id,
        run_id: observation.run_id,
        run_attempt: observation.run_attempt,
        artifact_id: observation.artifact_id,
        result_sha256: digest(observation.result_bytes),
      })),
    };
    const pointer: FormationPointerV2 = {
      ...body,
      digest: digest(canonicalJSON(body)),
    };
    const current = readConfirmedCIDeliveryFormation(root);
    if (current?.operation_id === operation) {
      check(equal(current, pointer), 'formation operation already differs');
      completed = current as FormationPointerV2;
      return;
    }
    if (current) {
      const previous = parseReleaseVersion(current.version),
        next = parseReleaseVersion(version);
      check(
        previous !== null && next !== null && compareVersion(next, previous) > 0,
        'formation baseline cannot regress',
      );
    }
    for (const item of observations) {
      const relative = resultPath(operation, item.request.request_id);
      const file = releasePath(root, relative, true);
      if (!existsSync(file)) {
        releaseDirectory(root, path.posix.dirname(relative));
        const descriptor = openSync(file, 'wx', 0o600);
        try {
          writeFileSync(descriptor, item.observation.result_bytes);
          fsyncSync(descriptor);
        } finally {
          closeSync(descriptor);
        }
      }
    }
    saveReceipt(releasePath(root, formationPath(), true), pointer);
    completed = pointer;
  });
  check(completed !== undefined, 'target formation completion missing');
  return completed;
}
function persistCIDeliveryFormation(
  root: string,
  request: CIDeliveryRequest,
  observation: CIDeliveryObservation,
): FormationPointer {
  const relative = resultPath(request.operation_id, request.request_id);
  const file = releasePath(root, relative, true);
  const resultBytes = Buffer.from(observation.result_bytes);
  if (existsSync(file))
    check(regularBytes(root, relative).equals(resultBytes), 'formed result already exists with different bytes');
  else {
    releaseDirectory(root, path.posix.dirname(relative));
    const descriptor = openSync(file, 'wx', 0o600);
    try {
      writeFileSync(descriptor, resultBytes);
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
  }
  const pointerBody: Omit<FormationPointer, 'digest'> = {
    schema: 'VidaLocalReleaseFormation/v1',
    authority: 'local_consistency_only',
    operation_id: request.operation_id,
    request_id: request.request_id,
    version: request.version,
    source_binding: request.source_binding,
    run_id: observation.run_id,
    run_attempt: observation.run_attempt,
    artifact_id: observation.artifact_id,
    result_sha256: digest(resultBytes),
  };
  const pointer: FormationPointer = {
    ...pointerBody,
    digest: digest(canonicalJSON(pointerBody)),
  };
  const current = readConfirmedCIDeliveryFormation(root);
  if (current?.operation_id === pointer.operation_id) {
    check(
      current.schema === 'VidaLocalReleaseFormation/v1' && equal(current, pointer),
      'formed operation is already bound to its exact successful artifact; a new build requires a higher version',
    );
    return current;
  }
  if (current) {
    const oldVersion = parseReleaseVersion(current.version);
    const nextVersion = parseReleaseVersion(pointer.version);
    check(
      oldVersion !== null && nextVersion !== null && compareVersion(nextVersion, oldVersion) > 0,
      'formation baseline cannot regress or reuse an existing version',
    );
  }
  saveReceipt(releasePath(root, formationPath(), true), pointer);
  return pointer;
}
function compareVersion(
  left: { major: number; minor: number; patch: number },
  right: { major: number; minor: number; patch: number },
): number {
  const components: Array<'major' | 'minor' | 'patch'> = ['major', 'minor', 'patch'];
  for (const field of components) {
    if (left[field] !== right[field]) return left[field] < right[field] ? -1 : 1;
  }
  return 0;
}

function packageRecord(value: unknown): Record<string, unknown> {
  check(isRecord(value), 'package metadata invalid');
  return value;
}
function packageIdentity(value: unknown): { name: string; version: string } {
  const record = packageRecord(value);
  check(typeof record.name === 'string' && typeof record.version === 'string', 'package name or version invalid');
  return { name: record.name, version: record.version };
}
function declaredDependencies(value: unknown): Record<string, unknown> {
  return packageRecord(packageRecord(value).dependencies);
}
export function validateCIZIPReaderVersions(args: {
  declared: unknown;
  lock: string;
  fsSafe: unknown;
  zip: unknown;
}): void {
  const declaredDeps = declaredDependencies(args.declared);
  const fsSafeInfo = packageIdentity(args.fsSafe);
  const zipInfo = packageIdentity(args.zip);
  const pin = /"jszip"\s*:\s*\[\s*"jszip@(\d+\.\d+\.\d+)"/.exec(args.lock)?.[1];
  check(
    fsSafeInfo.name === '@openclaw/fs-safe' &&
      zipInfo.name === 'jszip' &&
      fsSafeInfo.version === declaredDeps['@openclaw/fs-safe'] &&
      pin !== undefined &&
      zipInfo.version === pin,
    'archive reader differs from qualified Source dependency pins',
  );
}
interface QualifiedZipReader {
  readArchiveEntry: AgentReadArchiveEntry;
  loadZipArchiveWithPreflight: AgentLoadZipArchiveWithPreflight;
}
function isQualifiedArchiveModule(value: unknown): value is AgentFsSafeArchiveModule {
  return (
    isRecord(value) &&
    typeof value.readArchiveEntry === 'function' &&
    typeof value.loadZipArchiveWithPreflight === 'function'
  );
}
async function qualifiedZIPReader(root: string): Promise<QualifiedZipReader> {
  try {
    const archiveEntry = fsSafeArchiveEntry(path.join(root, 'packages/agent'));
    const fsSafe = parseJSON(readFileSync(path.join(path.dirname(archiveEntry), '../package.json'), 'utf8'));
    const zipRequire = createRequire(archiveEntry);
    const zip = parseJSON(readFileSync(zipRequire.resolve('jszip/package.json'), 'utf8'));
    const declared = parseJSON(regularBytes(root, 'packages/agent/package.json').toString('utf8'));
    const lock = regularBytes(root, 'packages/agent/bun.lock').toString('utf8');
    validateCIZIPReaderVersions({ declared, lock, fsSafe, zip });
    const loaded: unknown = await import(pathToFileURL(archiveEntry).href);
    check(isQualifiedArchiveModule(loaded), 'qualified archive entry or preflight capability unavailable');
    const { readArchiveEntry, loadZipArchiveWithPreflight } = loaded;
    return { readArchiveEntry, loadZipArchiveWithPreflight };
  } catch {
    throw new Error('GAP-VIDA-CI-DELIVERY-001: qualified ZIP reader unavailable or dependency drift; no installation');
  }
}

interface DownloadOptions {
  root: string;
  token?: string;
  signal?: AbortSignal;
  request: CIDeliveryRequest;
  profile: CIDeliveryProfile & { github: GitHubPolicy };
  run_id: string | number;
  run_attempt: number;
  artifact_id: string | number;
}
interface ObserveGitHubOptions extends DownloadOptions {
  candidate: CIDeliveryCandidate;
  transport_path: string;
}
type ObserveGitHubFormationOptions = Omit<ObserveGitHubOptions, 'candidate'>;
interface GitHubRun {
  id: number;
  run_attempt: number;
  workflow_id: number;
  path: string;
  event: string;
  status: string;
  conclusion: string | null;
  head_sha: string;
  repository: { id: number; full_name: string };
  head_repository: { id: number };
}
function githubJobs(value: unknown): { jobs: unknown[]; total_count: number } {
  check(
    isRecord(value) && Array.isArray(value.jobs) && typeof value.total_count === 'number',
    'provider jobs response malformed',
  );
  return { jobs: value.jobs, total_count: value.total_count };
}
function selectedGitHubJob(value: unknown): GitHubJob {
  check(
    isRecord(value) &&
      typeof value.name === 'string' &&
      typeof value.run_id === 'number' &&
      typeof value.run_attempt === 'number' &&
      typeof value.status === 'string' &&
      typeof value.conclusion === 'string' &&
      typeof value.started_at === 'string' &&
      typeof value.completed_at === 'string' &&
      Array.isArray(value.steps),
    'selected provider job malformed',
  );
  const steps: GitHubJob['steps'] = [];
  for (const step of value.steps) {
    check(
      isRecord(step) &&
        typeof step.name === 'string' &&
        typeof step.status === 'string' &&
        typeof step.conclusion === 'string',
      'selected provider job step malformed',
    );
    steps.push({
      name: step.name,
      status: step.status,
      conclusion: step.conclusion,
      number: typeof step.number === 'number' ? step.number : null,
      started_at: typeof step.started_at === 'string' ? step.started_at : null,
      completed_at: typeof step.completed_at === 'string' ? step.completed_at : null,
    });
  }
  return {
    ...(typeof value.id === 'number' ? { id: value.id } : {}),
    name: value.name,
    run_id: value.run_id,
    run_attempt: value.run_attempt,
    status: value.status,
    conclusion: value.conclusion,
    started_at: value.started_at,
    completed_at: value.completed_at,
    steps,
  };
}

function publicationStep(value: unknown, name: string): { number: number; start: number; end: number } {
  check(
    isRecord(value) &&
      value.name === name &&
      value.status === 'completed' &&
      value.conclusion === 'success' &&
      isPositiveSafeInteger(value.number) &&
      typeof value.started_at === 'string' &&
      typeof value.completed_at === 'string',
    'publication source-quality step failed/skipped or malformed',
  );
  const start = Date.parse(value.started_at),
    end = Date.parse(value.completed_at);
  check(
    Number.isFinite(start) && Number.isFinite(end) && start <= end,
    'publication source-quality step interval differs',
  );
  return { number: value.number, start, end };
}

function jobInterval(job: GitHubJob): { start: number; end: number } {
  const start = Date.parse(job.started_at);
  const end = Date.parse(job.completed_at);
  check(Number.isFinite(start) && Number.isFinite(end) && start <= end, 'provider job interval malformed');
  return { start, end };
}

function assertNativeBuildJobSteps(job: GitHubJob, artifactCreatedAt: number): void {
  if (job.steps.length === 0) return;
  const native = job.steps.filter((step) => step.name === 'native-build');
  const step = native[0];
  const start = typeof step?.started_at === 'string' ? Date.parse(step.started_at) : Number.NaN;
  const end = typeof step?.completed_at === 'string' ? Date.parse(step.completed_at) : Number.NaN;
  const jobRange = jobInterval(job);
  check(
    native.length === 1 &&
      step?.status === 'completed' &&
      step.conclusion === 'success' &&
      isPositiveSafeInteger(step.number) &&
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      start <= end &&
      start >= jobRange.start &&
      end <= artifactCreatedAt &&
      artifactCreatedAt <= jobRange.end,
    'required native step failed/skipped or missing/malformed',
  );
}

function assertLinuxPublicationQualityJob(
  rawQualityJob: unknown,
  qualityJob: GitHubJob,
  nativeJob: GitHubJob,
  runId: number,
  runAttempt: number,
): void {
  check(
    qualityJob.name === 'full-source-quality' &&
      isPositiveSafeInteger(qualityJob.id) &&
      isPositiveSafeInteger(nativeJob.id) &&
      qualityJob.id !== nativeJob.id &&
      qualityJob.run_id === runId &&
      qualityJob.run_attempt === runAttempt &&
      qualityJob.status === 'completed' &&
      qualityJob.conclusion === 'success' &&
      nativeJob.run_id === runId &&
      nativeJob.run_attempt === runAttempt &&
      nativeJob.status === 'completed' &&
      nativeJob.conclusion === 'success',
    'publication quality/native job identity differs',
  );
  const qualityInterval = jobInterval(qualityJob);
  const nativeInterval = jobInterval(nativeJob);
  check(qualityInterval.end <= nativeInterval.start, 'publication source-quality job must precede native job');
  check(isRecord(rawQualityJob) && Array.isArray(rawQualityJob.steps), 'publication source-quality steps malformed');
  if (rawQualityJob.steps.length > 0) {
    const qualitySteps = rawQualityJob.steps.filter(
      (step: unknown) => isRecord(step) && step.name === 'full-source-quality',
    );
    check(qualitySteps.length === 1, 'exactly one full-source-quality step required in quality job');
    const step = publicationStep(qualitySteps[0], 'full-source-quality');
    check(
      step.start >= qualityInterval.start && step.end <= qualityInterval.end,
      'publication source-quality step interval differs from its job',
    );
  }
}
function githubArtifact(value: unknown): GitHubArtifact {
  check(
    isRecord(value) &&
      isRecord(value.workflow_run) &&
      typeof value.id === 'number' &&
      typeof value.name === 'string' &&
      typeof value.expired === 'boolean' &&
      typeof value.digest === 'string' &&
      typeof value.created_at === 'string' &&
      typeof value.workflow_run.id === 'number' &&
      typeof value.workflow_run.repository_id === 'number' &&
      typeof value.workflow_run.head_repository_id === 'number' &&
      typeof value.workflow_run.head_sha === 'string',
    'provider artifact response malformed',
  );
  return {
    id: value.id,
    name: value.name,
    expired: value.expired,
    digest: value.digest,
    created_at: value.created_at,
    workflow_run: {
      id: value.workflow_run.id,
      repository_id: value.workflow_run.repository_id,
      head_repository_id: value.workflow_run.head_repository_id,
      head_sha: value.workflow_run.head_sha,
    },
  };
}
function approvedProviderNumber(value: string | number): boolean {
  return /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
}
async function responseBytes(response: Response, limit: number): Promise<Buffer> {
  check(response.ok && response.body, 'provider response unavailable');
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of response.body) {
    check(chunk instanceof Uint8Array, 'provider response contains a non-byte chunk');
    size += chunk.byteLength;
    check(size <= limit, 'provider response oversized');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks, size);
}
async function downloadGitHubArtifact(
  options: DownloadOptions,
  requireCompletedWorkflow: boolean,
): Promise<{
  transport_path: string;
  run_id: string;
  run_attempt: number;
  artifact_id: string;
}> {
  const { root, token, signal } = options;
  const request = structuredClone(options.request);
  const profile = structuredClone(options.profile);
  const { run_id, run_attempt, artifact_id } = options;
  validateCIDeliveryRequest(request);
  profileMatches(request, profile);
  const policy = profile.github;
  check(
    profile.issuer === 'github-actions' &&
      /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(policy?.repository ?? '') &&
      /^[a-f0-9]{40}$/.test(policy.source_commit) &&
      Number.isSafeInteger(policy.repository_id) &&
      policy.repository_id > 0 &&
      Number.isSafeInteger(policy.workflow_id) &&
      policy.workflow_id > 0 &&
      /^\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/.test(policy.workflow_path) &&
      typeof policy.job === 'string' &&
      policy.job.length > 0 &&
      (requireCompletedWorkflow ||
        (hex.test(policy.workflow_sha256) &&
          Array.isArray(policy.steps) &&
          policy.steps.length === profile.required_checks.length &&
          equal(policy.steps.map((item) => item.id).sort(), [...profile.required_checks].sort()))) &&
      [run_id, artifact_id].every(approvedProviderNumber) &&
      Number.isSafeInteger(run_attempt) &&
      run_attempt > 0,
    'explicit approved download profile required',
  );
  check(
    token === undefined || (typeof token === 'string' && token.length > 0 && !/[\p{Cc}]/u.test(token)),
    'explicit token invalid',
  );
  if (requireCompletedWorkflow)
    validateCIDownloadLocation(`https://${policy.artifact_hosts?.[0] ?? ''}/`, policy.artifact_hosts ?? []);
  const relative = `.tmp/ci-delivery/${request.request_id}/${run_id}-${run_attempt}-${artifact_id}.zip`;
  check(!existsSync(releasePath(root, relative, true)), 'retained download exists; inspect UNKNOWN before any retry');
  const base = `https://api.github.com/repos/${policy.repository}`;
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2026-03-10',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const get = async (suffix: string): Promise<unknown> =>
    parseJSON(
      (
        await responseBytes(
          await fetch(base + suffix, {
            headers,
            ...(signal === undefined ? {} : { signal }),
            redirect: 'error',
          }),
          8 * 1024 * 1024,
        )
      ).toString('utf8'),
    );
  const run = githubRun(await get(`/actions/runs/${run_id}/attempts/${run_attempt}`));
  check(
    run.id === Number(run_id) &&
      run.run_attempt === run_attempt &&
      run.head_sha === policy.source_commit &&
      run.workflow_id === policy.workflow_id &&
      run.path === policy.workflow_path &&
      run.event === 'workflow_dispatch' &&
      (requireCompletedWorkflow ? run.status === 'completed' && run.conclusion === 'success' : true) &&
      run.repository.id === policy.repository_id &&
      run.head_repository.id === policy.repository_id &&
      run.repository.full_name === policy.repository,
    'selected download run differs',
  );
  if (!requireCompletedWorkflow) {
    const definition = await get(`/contents/${policy.workflow_path}?ref=${run.head_sha}`);
    check(
      isRecord(definition) &&
        typeof definition.encoding === 'string' &&
        typeof definition.content === 'string' &&
        definition.encoding === 'base64' &&
        digest(Buffer.from(definition.content, 'base64')) === policy.workflow_sha256,
      'workflow definition differs',
    );
  }
  const jobs = githubJobs(await get(`/actions/runs/${run_id}/attempts/${run_attempt}/jobs?per_page=100`));
  check(jobs.jobs.length === jobs.total_count, 'complete bounded download job observation required');
  const selectedJobs = jobs.jobs.filter((job) => isRecord(job) && job.name === policy.job);
  check(selectedJobs.length === 1, 'selected download job differs');
  const selectedJob = selectedGitHubJob(selectedJobs[0]);
  if (!requireCompletedWorkflow)
    check(
      isPositiveSafeInteger(selectedJob.id) &&
        jobs.jobs.filter((job) => isRecord(job) && job.id === selectedJob.id).length === 1,
      'native provider job ID is invalid or not unique',
    );
  check(
    selectedJob.run_id === Number(run_id) &&
      selectedJob.run_attempt === run_attempt &&
      selectedJob.status === 'completed' &&
      selectedJob.conclusion === 'success',
    'selected download job differs',
  );
  if (!requireCompletedWorkflow) {
    if (request.target === 'bun-linux-x64') {
      const qualityJobs = jobs.jobs.filter((job) => isRecord(job) && job.name === 'full-source-quality');
      check(qualityJobs.length === 1, 'unique full-source-quality provider job required');
      const qualityJob = selectedGitHubJob(qualityJobs[0]);
      check(
        jobs.jobs.filter((job) => isRecord(job) && job.id === qualityJob.id).length === 1 &&
          jobs.jobs.filter((job) => isRecord(job) && job.id === selectedJob.id).length === 1,
        'provider job IDs are not unique',
      );
      assertLinuxPublicationQualityJob(qualityJobs[0], qualityJob, selectedJob, Number(run_id), run_attempt);
    }
  }
  const artifact = githubArtifact(await get(`/actions/artifacts/${artifact_id}`));
  check(artifact.id === Number(artifact_id), 'download artifact identity differs');
  validateCIArtifactAttempt({
    artifact,
    request,
    run_id: String(run_id),
    run_attempt,
    repository_id: policy.repository_id,
    source_commit: policy.source_commit,
    job: selectedJob,
    artifact_kind: requireCompletedWorkflow ? 'formation' : 'native-build',
  });
  if (!requireCompletedWorkflow) assertNativeBuildJobSteps(selectedJob, Date.parse(artifact.created_at));
  const response = await fetch(`${base}/actions/artifacts/${artifact_id}/zip`, {
    headers,
    ...(signal === undefined ? {} : { signal }),
    redirect: 'manual',
  });
  check(response.status === 302, 'artifact download did not return its selected redirect');
  const location = requireCompletedWorkflow
    ? validateCIDownloadLocation(response.headers.get('location'), policy.artifact_hosts ?? [])
    : validateCIProducerArtifactLocation(response.headers.get('location'));
  // The API credential is deliberately absent from the storage request.
  releaseDirectory(root, path.posix.dirname(relative));
  const file = releasePath(root, relative, true);
  const descriptor = openSync(file, 'wx', 0o600);
  let size = 0;
  try {
    const data = await fetch(location, {
      ...(signal === undefined ? {} : { signal }),
      redirect: 'error',
    });
    check(data.ok && data.body, 'artifact storage unavailable; retain download intent');
    const length = data.headers.get('content-length');
    check(
      length === null || (/^\d+$/.test(length) && Number(length) <= ciTransportLimit),
      'artifact ZIP declared length exceeds qualified reader limit',
    );
    for await (const chunk of data.body) {
      const bytes = Buffer.from(chunk);
      size += bytes.length;
      check(size <= ciTransportLimit, 'artifact ZIP exceeds qualified reader limit');
      for (let offset = 0; offset < bytes.length;) {
        const written = writeSync(descriptor, bytes, offset, bytes.length - offset);
        check(written > 0, 'partial artifact write');
        offset += written;
      }
    }
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
  check(
    `sha256:${digest(regularBytes(root, relative, ciTransportLimit))}` === artifact.digest,
    'download digest differs; retain custody',
  );
  return {
    transport_path: relative,
    run_id: String(run_id),
    run_attempt,
    artifact_id: String(artifact_id),
  };
}
export async function downloadGitHubCIDelivery(options: DownloadOptions): Promise<{
  transport_path: string;
  run_id: string;
  run_attempt: number;
  artifact_id: string;
}> {
  return downloadGitHubArtifact(options, true);
}
export async function downloadGitHubCIProducerArtifact(options: DownloadOptions): Promise<{
  transport_path: string;
  run_id: string;
  run_attempt: number;
  artifact_id: string;
}> {
  const profile = structuredClone(options.profile);
  const policy = profile.github;
  const jobByTarget: Record<string, string> = {
    'bun-windows-x64': 'native-windows-x64',
    'bun-linux-x64': 'native-linux-x64',
  };
  check(
    equal(profile.required_checks, minimumNativeDeliveryChecks) &&
      policy?.artifact_hosts === undefined &&
      policy?.repository_id === 1340911900 &&
      policy.workflow_path === '.github/workflows/agent-native-delivery.yml' &&
      Array.isArray(policy.steps) &&
      equal(
        policy.steps.map((item) => item.id),
        ['native-build'],
      ) &&
      policy.job === jobByTarget[options.request.target],
    'approved native producer profile required',
  );
  return downloadGitHubArtifact(options, false);
}
export async function readCIProducerFormationMembers(args: {
  root: string;
  request: CIDeliveryRequest;
  transport_path: string;
  installer_bytes: Buffer;
}): Promise<FormationMembers> {
  const { root, request, transport_path, installer_bytes } = args;
  validateCIDeliveryRequest(request);
  check(Buffer.isBuffer(installer_bytes), 'source installer must be bytes');
  const target = request.target;
  check(target === 'bun-windows-x64' || target === 'bun-linux-x64', 'unsupported producer target');
  const currentInstaller = regularBytes(
    root,
    target === 'bun-windows-x64' ? 'packages/agent/tooling/install-windows.ps1' : 'install/install.sh',
    1024 * 1024,
  );
  check(currentInstaller.equals(installer_bytes), 'supplied installer differs from current Source');
  const transport = regularBytes(root, transport_path, ciTransportLimit);
  const { readArchiveEntry, loadZipArchiveWithPreflight } = await qualifiedZIPReader(root);
  const zip = releasePath(root, transport_path);
  await loadZipArchiveWithPreflight(transport, {
    maxArchiveBytes: ciTransportLimit,
  });
  const read = (name: string, maxBytes: number): Promise<Buffer> =>
    readArchiveEntry(zip, name, { kind: 'zip', maxBytes });
  const candidate_bytes = await read('candidate.json', 8 * 1024 * 1024);
  const archive_bytes = await read(`vida-agent-${request.version}.tgz`, ciArchiveLimit);
  const manifest_bytes = await read('manifest.json', 8 * 1024 * 1024);
  const asset_bytes = await read(`vida-agent-${target}${target === 'bun-windows-x64' ? '.exe' : ''}`, ciTransportLimit);
  const native_build_result_bytes = await read('native-build.result.json', 1024 * 1024);
  let selectedInstaller = installer_bytes;
  if (target === 'bun-windows-x64') {
    selectedInstaller = await read('install-windows.ps1', 1024 * 1024);
    check(selectedInstaller.equals(installer_bytes), 'formation Windows installer differs from current Source');
  }
  check(
    regularBytes(root, transport_path, ciTransportLimit).equals(transport),
    'producer transport changed during reads',
  );
  return {
    candidate_bytes,
    archive_bytes,
    manifest_bytes,
    asset_bytes,
    native_build_result_bytes,
    installer_bytes: selectedInstaller,
  };
}
async function observeGitHubCIDeliveryInternal(
  options: ObserveGitHubFormationOptions & { candidate?: CIDeliveryCandidate },
): Promise<{
  observation: CIDeliveryObservation;
  candidate: CIDeliveryCandidate;
  archive_bytes: Buffer;
  transport_sha256: string;
}> {
  let { root, request, candidate, profile, run_id, run_attempt, artifact_id, transport_path, token, signal } = options;
  request = structuredClone(request);
  if (candidate) candidate = structuredClone(candidate);
  profile = structuredClone(profile);
  validateCIDeliveryRequest(request);
  profileMatches(request, profile);
  const policy = profile.github;
  check(
    profile.issuer === 'github-actions' &&
      policy !== undefined &&
      /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(policy.repository) &&
      Number.isSafeInteger(policy.repository_id) &&
      policy.repository_id > 0 &&
      Number.isSafeInteger(policy.workflow_id) &&
      policy.workflow_id > 0 &&
      /^[a-f0-9]{40}$/.test(policy.source_commit) &&
      /^\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/.test(policy.workflow_path) &&
      hex.test(policy.workflow_sha256) &&
      typeof policy.job === 'string' &&
      Array.isArray(policy.steps) &&
      policy.steps.length === profile.required_checks.length &&
      equal(policy.steps.map((item) => item.id).sort(), [...profile.required_checks].sort()),
    'approved GitHub policy required',
  );
  check(
    [run_id, artifact_id].every(approvedProviderNumber) && Number.isSafeInteger(run_attempt) && run_attempt > 0,
    'exact provider identities invalid',
  );
  const base = `https://api.github.com/repos/${policy.repository}`;
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2026-03-10',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const get = async (suffix: string): Promise<unknown> =>
    parseJSON(
      (
        await responseBytes(
          await fetch(base + suffix, {
            headers,
            ...(signal === undefined ? {} : { signal }),
            redirect: 'error',
          }),
          8 * 1024 * 1024,
        )
      ).toString('utf8'),
    );
  const run = githubRun(await get(`/actions/runs/${run_id}/attempts/${run_attempt}`));
  check(
    run.id === Number(run_id) &&
      run.run_attempt === run_attempt &&
      run.repository.id === policy.repository_id &&
      run.head_repository.id === policy.repository_id &&
      run.repository.full_name === policy.repository &&
      run.workflow_id === policy.workflow_id &&
      run.path === policy.workflow_path &&
      run.event === 'workflow_dispatch' &&
      run.status === 'completed' &&
      run.conclusion === 'success' &&
      run.head_sha === policy.source_commit,
    'run/attempt/workflow differs',
  );
  const definition = await get(`/contents/${policy.workflow_path}?ref=${run.head_sha}`);
  check(
    isRecord(definition) &&
      typeof definition.encoding === 'string' &&
      typeof definition.content === 'string' &&
      definition.encoding === 'base64' &&
      digest(Buffer.from(definition.content, 'base64')) === policy.workflow_sha256,
    'workflow definition differs',
  );
  const jobs = githubJobs(await get(`/actions/runs/${run_id}/attempts/${run_attempt}/jobs?per_page=100`));
  check(jobs.jobs.length === jobs.total_count, 'bounded complete job observation required');
  const selectedJobs = jobs.jobs.filter((job) => isRecord(job) && job.name === policy.job);
  check(selectedJobs.length === 1, 'required native job differs');
  const selectedJob = selectedGitHubJob(selectedJobs[0]);
  check(
    selectedJob.run_id === Number(run_id) &&
      selectedJob.run_attempt === run_attempt &&
      selectedJob.status === 'completed' &&
      selectedJob.conclusion === 'success',
    'required native job differs',
  );
  const checks = policy.steps.map((step) => {
    const matches = selectedJob.steps.filter((item) => item.name === step.name);
    check(
      matches.length === 1 && matches[0]?.status === 'completed' && matches[0]?.conclusion === 'success',
      'required native step failed/skipped',
    );
    return { id: step.id, status: 'passed' };
  });
  const artifact = githubArtifact(await get(`/actions/artifacts/${artifact_id}`));
  check(artifact.id === Number(artifact_id), 'artifact identity differs');
  validateCIArtifactAttempt({
    artifact,
    request,
    run_id: String(run_id),
    run_attempt,
    repository_id: policy.repository_id,
    source_commit: policy.source_commit,
    job: selectedJob,
  });
  const transport = regularBytes(root, transport_path, ciTransportLimit);
  check(`sha256:${digest(transport)}` === artifact.digest, 'provider ZIP transport differs');
  const { readArchiveEntry, loadZipArchiveWithPreflight } = await qualifiedZIPReader(root);
  const zip = releasePath(root, transport_path);
  let resultBytes: Buffer | undefined;
  let archiveBytes: Buffer | undefined;
  let snapshot: ReturnType<typeof ownedTempWorkspace> | undefined;
  let snapshotIdentity: string | undefined;
  let observationFailure: Error | undefined;
  let cleanupFailure: Error | undefined;
  try {
    await loadZipArchiveWithPreflight(transport, {
      maxArchiveBytes: ciTransportLimit,
    });
    let selectedZip = zip;
    if (candidate === undefined) {
      snapshot = ownedTempWorkspace('vida-ci-formation-');
      snapshot.store.write('formation.zip', transport, {
        maxBytes: ciTransportLimit,
      });
      selectedZip = snapshot.path('formation.zip');
      const directory = lstatSync(snapshot.dir, { bigint: true });
      check(
        directory.isDirectory() &&
          !directory.isSymbolicLink() &&
          snapshot.exactIdentity !== undefined &&
          directory.dev === snapshot.exactIdentity.dev &&
          directory.ino === snapshot.exactIdentity.ino,
        'formation snapshot directory differs',
      );
      const info = lstatSync(selectedZip);
      check(info.isFile() && !info.isSymbolicLink() && info.nlink === 1, 'formation snapshot identity invalid');
      snapshotIdentity = JSON.stringify([info.dev, info.ino, info.size, info.mtimeMs, info.ctimeMs]);
      check(snapshot.read('formation.zip').equals(transport), 'formation snapshot differs');
      const candidateValue = parseFormationJSON(
        await readArchiveEntry(selectedZip, 'candidate.json', {
          kind: 'zip',
          maxBytes: 8 * 1024 * 1024,
        }),
        'candidate',
        8 * 1024 * 1024,
      );
      assertCandidate(candidateValue);
      check(
        candidateValue.pack_metadata.length === 1 &&
          candidateValue.pack_metadata[0]?.filename === `vida-agent-${request.version}.tgz`,
        'candidate archive identity differs',
      );
      candidate = candidateValue;
    }
    resultBytes = await readArchiveEntry(selectedZip, 'result.json', {
      kind: 'zip',
      maxBytes: 8 * 1024 * 1024,
    });
    const packageMetadata = candidate.pack_metadata[0];
    check(
      packageMetadata !== undefined && typeof packageMetadata.filename === 'string',
      'candidate package metadata absent',
    );
    archiveBytes = await readArchiveEntry(selectedZip, packageMetadata.filename, {
      kind: 'zip',
      maxBytes: ciArchiveLimit,
    });
    if (snapshot) {
      const info = lstatSync(selectedZip);
      const directory = lstatSync(snapshot.dir, { bigint: true });
      check(
        directory.isDirectory() &&
          !directory.isSymbolicLink() &&
          snapshot.exactIdentity !== undefined &&
          directory.dev === snapshot.exactIdentity.dev &&
          directory.ino === snapshot.exactIdentity.ino &&
          info.isFile() &&
          !info.isSymbolicLink() &&
          info.nlink === 1 &&
          JSON.stringify([info.dev, info.ino, info.size, info.mtimeMs, info.ctimeMs]) === snapshotIdentity &&
          snapshot.read('formation.zip').equals(transport),
        'formation snapshot changed',
      );
    }
  } catch (error) {
    observationFailure = new Error(
      'GAP-VIDA-CI-DELIVERY-001: qualified ZIP reader unavailable or artifact invalid; no dependency installation',
      { cause: error },
    );
  } finally {
    if (snapshot && cleanupOwnedWorkspace(snapshot) !== 'removed')
      cleanupFailure = Error('GAP-VIDA-CI-DELIVERY-001: formation snapshot cleanup incomplete');
  }
  if (observationFailure && cleanupFailure)
    throw new AggregateError([observationFailure, cleanupFailure], 'Formation observation and cleanup failed');
  if (observationFailure) throw observationFailure;
  if (cleanupFailure) throw cleanupFailure;
  check(
    resultBytes !== undefined && archiveBytes !== undefined && candidate !== undefined,
    'formation members missing',
  );
  check(
    digest(archiveBytes) === candidate.archive_sha256 &&
      regularBytes(root, transport_path, ciTransportLimit).equals(transport),
    'nested archive or transport changed',
  );
  const observation: CIDeliveryObservation = {
    schema: 'VidaCIDeliveryObservation/v1',
    issuer: profile.issuer,
    run_id: String(run_id),
    run_attempt,
    artifact_id: String(artifact_id),
    conclusion: 'success',
    checks,
    result_bytes: resultBytes,
  };
  if (options.candidate === undefined) validateCIDeliveryObservation({ request, candidate, profile, observation });
  return {
    observation,
    candidate,
    archive_bytes: archiveBytes,
    transport_sha256: digest(transport),
  };
}
export async function observeGitHubCIDelivery(options: ObserveGitHubOptions): Promise<CIDeliveryObservation> {
  return (await observeGitHubCIDeliveryInternal(options)).observation;
}
/** Provider-bound candidate and archive from one retained formation ZIP. */
export async function observeGitHubCIDeliveryWithCandidate(options: ObserveGitHubFormationOptions) {
  return observeGitHubCIDeliveryInternal(options);
}
function githubRun(value: unknown): GitHubRun {
  check(
    isRecord(value) &&
      isRecord(value.repository) &&
      isRecord(value.head_repository) &&
      typeof value.id === 'number' &&
      typeof value.run_attempt === 'number' &&
      typeof value.workflow_id === 'number' &&
      typeof value.path === 'string' &&
      typeof value.event === 'string' &&
      typeof value.status === 'string' &&
      (value.conclusion === null || typeof value.conclusion === 'string') &&
      typeof value.head_sha === 'string' &&
      typeof value.repository.id === 'number' &&
      typeof value.repository.full_name === 'string' &&
      typeof value.head_repository.id === 'number',
    'provider run response malformed',
  );
  return {
    id: value.id,
    run_attempt: value.run_attempt,
    workflow_id: value.workflow_id,
    path: value.path,
    event: value.event,
    status: value.status,
    conclusion: value.conclusion,
    head_sha: value.head_sha,
    repository: {
      id: value.repository.id,
      full_name: value.repository.full_name,
    },
    head_repository: { id: value.head_repository.id },
  };
}
function parseFormationJSON(bytes: Buffer, label: string, limit: number): unknown {
  check(bytes.length > 0 && bytes.length <= limit, `${label} bytes invalid`);
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new Error(`GAP-VIDA-CI-DELIVERY-001: ${label} JSON invalid`);
  }
}
