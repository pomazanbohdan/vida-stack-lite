import { fsSafeArchiveEntry } from '../../packages/agent/tooling/fs-safe-archive-entry.ts';
import { closeSync, existsSync, fsyncSync, lstatSync, openSync, readFileSync, writeFileSync, writeSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import {
  releaseDigest as releaseDigestInput,
  releaseJSON as json,
  releasePath,
  releaseDirectory,
  saveReleaseState as saveReceipt,
  withReleaseAdmission,
  releaseIdPattern,
  releaseState,
  releaseSourceBinding,
  parseReleaseVersion,
} from '../../packages/agent/bin/local-release-artifacts.mjs';
import {
  readNativeRetargetCandidate,
  recheckNativeRetargetCandidate,
} from '../../packages/agent/bin/repair-release-retarget.mjs';
/** @typedef {import('../../packages/agent/tooling/release-dependency-types.js').AgentReadArchiveEntry} ReadArchiveEntry */
/** @typedef {import('../../packages/agent/tooling/release-dependency-types.js').AgentLoadZipArchiveWithPreflight} LoadZipArchiveWithPreflight */

const hex = /^[a-f0-9]{64}$/;
/** The release digest implementation hashes strings and byte views. @type {(bytes: string | Uint8Array) => string} */
const sha = releaseDigestInput;
const targetPattern = /^bun-(windows|linux|darwin)-(x64|arm64)(-baseline)?$/;
const id = /^[a-z0-9][a-z0-9-]{0,63}$/;
/** @typedef {{ schema: 'VidaCIDeliveryRequest/v1', operation_id: string, version: string, repository_id: string, project_ids: string[], target: string, source_binding: string, request_id: string }} CIDeliveryRequest */
/** @typedef {{ id: string, status: string }} CIDeliveryCheck */
/** @typedef {{ issuer: string, repository_id: string, project_ids: string[], target: string, required_checks: string[], github?: GitHubPolicy }} CIDeliveryProfile */
/** @typedef {{ id: number, key: string, ref: string, version: string, size_in_bytes: number, restore: 'hit'|'miss', matched_key: string|null, save: 'confirmed', save_action: 'skipped'|'success' }} DependencyCache */
/** @typedef {{ file: string, bytes: number, sha256: string }} CIDeliveryAsset */
/** @typedef {{ schema: string, request_id: string, operation_id: string, version: string, repository_id: string, project_ids: string[], target: string, source_binding: string, archive_sha256: string, manifest_sha256: string, payload_id: string, asset: CIDeliveryAsset, issuer: string, run_id: string, run_attempt: number, checks: CIDeliveryCheck[], dependency_cache?: DependencyCache }} CIDeliveryResult */
/** @typedef {{ schema: string, version: string, pin: string, target: string, inputs: {path: string, bytes: number, sha256: string}[], payloadId: string, asset: CIDeliveryAsset }} CIDeliveryManifest */
/** @typedef {{ operation_id: string, version: string, source_binding: string, candidate_digest?: string, archive_sha256: string, manifest_sha256: string, manifest: CIDeliveryManifest, asset?: CIDeliveryAsset, pack_metadata: PackageArchive[] }} CIDeliveryCandidate */
/** @typedef {{ name?: string, version?: string, filename: string, files: {path: string, size: number}[] }} PackageArchive */
/** @typedef {{ schema: string, issuer: string, run_id: string, run_attempt: number, artifact_id: string, conclusion: string, checks: CIDeliveryCheck[], result_bytes: Buffer }} CIDeliveryObservation */
/** @typedef {{ id: string, name: string }[]} GitHubStepPolicy */
/** @typedef {{ repository: string, repository_id: number, workflow_id: number, source_commit: string, workflow_path: string, workflow_sha256: string, job: string, steps: GitHubStepPolicy, artifact_hosts?: string[] }} GitHubPolicy */
/** @typedef {{id: number, run_attempt: number, workflow_id: number, path: string, event: string, status: string, conclusion: string, head_sha: string, repository: {id: number, full_name: string}, head_repository: {id: number}}} GitHubRun */
/** @typedef {{name: string, run_id: number, run_attempt: number, status: string, conclusion: string, started_at: string, completed_at: string, steps: {name: string, status: string, conclusion: string}[]}} GitHubJob */
/** @typedef {{id: number, name: string, expired: boolean, digest: string, created_at: string, workflow_run: {id: number, repository_id: number, head_repository_id: number, head_sha: string}}} GitHubArtifact */
/** @typedef {{candidate_bytes: Buffer, archive_bytes: Buffer, manifest_bytes: Buffer, asset_bytes: Buffer, native_build_result_bytes: Buffer, installer_bytes: Buffer}} FormationMembers */
/** @typedef {{schema: 'VidaCIPhaseResult/v2', request_id: string, run_id: string, run_attempt: number, source_binding: string, archive_sha256: string, phase: string, status: string, dependency_cache: DependencyCache}} NativeBuildReceipt */
/** @typedef {{schema: 'VidaLocalReleaseFormation/v1', authority: 'local_consistency_only', operation_id: string, request_id: string, version: string, source_binding: string, run_id: string, run_attempt: number, artifact_id: string, result_sha256: string, digest: string}} FormationPointer */
/** @typedef {{root: string, token?: string, signal?: AbortSignal, request: CIDeliveryRequest, profile: CIDeliveryProfile & {github: GitHubPolicy}, run_id: string|number, run_attempt: number, artifact_id: string|number}} DownloadOptions */
/** @typedef {DownloadOptions & {candidate: CIDeliveryCandidate, transport_path: string}} ObserveGitHubOptions */
// The existing archive reader stages ZIPs under its own 256 MiB ceiling.
export const ciTransportLimit = 256 * 1024 * 1024;
export const ciArchiveLimit = 240 * 1024 * 1024;
export const minimumNativeDeliveryChecks = Object.freeze(['native-build']);
// Retained for explicitly selected extended profiles and historical receipts.
export const nativeDeliveryChecks = Object.freeze([
  'native-build',
  'native-install',
  'public-routes',
  'offline-runtime',
  'native-dependencies',
  'state-preservation',
  'upgrade-recovery',
]);
/** @type {(value: unknown, message: string) => asserts value} */
const check = (value, message) => {
  if (!value) throw Error('GAP-VIDA-CI-DELIVERY-001: ' + message);
};
/** @param {unknown} left @param {unknown} right */
const equal = (left, right) => json(left) === json(right);
/** @param {unknown} value @param {string[]} fields */
function exact(value, fields) {
  check(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      equal(Object.keys(value).sort(), fields.slice().sort()),
    'CI contract fields differ',
  );
}
/** @param {string} text @returns {unknown} */
function parseJSON(text) {
  return /** @type {unknown} */ (JSON.parse(text));
}
/** @param {Record<string, unknown>} record */
function formationPointerRequestShape(record) {
  return (
    record.schema === 'VidaLocalReleaseFormation/v1' &&
    record.authority === 'local_consistency_only' &&
    typeof record.operation_id === 'string' &&
    releaseIdPattern.test(record.operation_id) &&
    typeof record.request_id === 'string' &&
    hex.test(record.request_id) &&
    typeof record.version === 'string' &&
    parseReleaseVersion(record.version) !== null &&
    typeof record.source_binding === 'string' &&
    hex.test(record.source_binding)
  );
}
/** @param {Record<string, unknown>} record */
function formationPointerProviderShape(record) {
  return (
    typeof record.run_id === 'string' &&
    record.run_id.length > 0 &&
    typeof record.run_attempt === 'number' &&
    Number.isSafeInteger(record.run_attempt) &&
    record.run_attempt > 0 &&
    typeof record.artifact_id === 'string' &&
    record.artifact_id.length > 0 &&
    typeof record.result_sha256 === 'string' &&
    hex.test(record.result_sha256)
  );
}
/** @param {unknown} value @returns {FormationPointer} */
function validateFormationPointer(value) {
  check(value !== null && typeof value === 'object' && !Array.isArray(value), 'formation pointer must be an object');
  const record = /** @type {Record<string, unknown>} */ (value);
  exact(record, [
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
  const { digest, ...body } = record;
  check(
    formationPointerRequestShape(record) &&
      formationPointerProviderShape(record) &&
      typeof digest === 'string' &&
      digest === sha(json(body)),
    'formed build pointer is invalid',
  );
  return /** @type {FormationPointer} */ (record);
}
/** @param {unknown} value */
function isProjectId(value) {
  return typeof value === 'string' && id.test(value);
}
/** @param {unknown} value */
function projects(value) {
  check(
    Array.isArray(value) &&
      value.length > 0 &&
      value.every((item) => isProjectId(item)) &&
      new Set(value).size === value.length &&
      equal(
        value,
        /** @type {string[]} */ (value).slice().sort((left, right) => left.localeCompare(right)),
      ),
    'exact project set invalid',
  );
}
/** @param {string} root @param {string} relative @param {number} [limit] */
function regularBytes(root, relative, limit = 8 * 1024 * 1024) {
  const file = releasePath(root, relative),
    stat = lstatSync(file);
  check(stat.isFile() && stat.size <= limit, 'CI file unsafe or oversized');
  return readFileSync(file);
}
/** @param {{root: string, operation: string, context: {schema?: string, repository_id: string, project_ids: string[]}, target: string, source_binding?: string}} args */
function requestBody({ root, operation, context, target, source_binding }) {
  check(
    releaseIdPattern.test(operation) &&
      context?.schema === 'ProjectContext/v1' &&
      id.test(context.repository_id) &&
      targetPattern.test(target),
    'request context invalid',
  );
  projects(context.project_ids);
  const state = releaseState(releasePath(root, '.agent/work/agent-local-release/' + operation + '/release.json'));
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
    project_ids: context.project_ids.slice(),
    target,
    source_binding: source_binding ?? releaseSourceBinding(root).source_binding,
  };
}
/** @param {string} operation @param {string} requestId */
function requestPath(operation, requestId) {
  check(releaseIdPattern.test(operation) && hex.test(requestId), 'request identity invalid');
  return '.agent/work/agent-local-release/' + operation + '/ci/' + requestId + '/request.json';
}
/** @returns {string} */
function formationPath() {
  return '.agent/work/agent-local-release/formed.json';
}
/** @param {string} operation @param {string} requestId */
function resultPath(operation, requestId) {
  check(releaseIdPattern.test(operation) && hex.test(requestId), 'formation identity invalid');
  return '.agent/work/agent-local-release/' + operation + '/ci/' + requestId + '/result.json';
}
/** @param {string} left @param {string} right */
function compareReleaseVersions(left, right) {
  const a = parseReleaseVersion(left),
    b = parseReleaseVersion(right);
  check(a && b, 'formation version invalid');
  /** @type {('major'|'minor'|'patch')[]} */
  const components = ['major', 'minor', 'patch'];
  for (const component of components) {
    if (a[component] !== b[component]) return a[component] < b[component] ? -1 : 1;
  }
  return 0;
}
const dependencyCacheKeyPattern = /^vida-bun-install-v1-[A-Za-z0-9_-]+-bun-1\.4\.2-[a-f0-9]{64}$/;
/** @param {unknown} value */
function positiveCacheInteger(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}
/** @param {unknown} value */
function dependencyCacheKey(value) {
  return typeof value === 'string' && dependencyCacheKeyPattern.test(value);
}
/** @param {unknown} value */
function dependencyCacheVersion(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 256 &&
    !Array.from(value).some((character) => {
      const code = character.charCodeAt(0);
      return (code >= 0 && code <= 31) || (code >= 127 && code <= 159);
    })
  );
}
/** @param {unknown} value @param {string} primary */
function dependencyCacheFallback(value, primary) {
  return (
    value === null ||
    (typeof value === 'string' &&
      dependencyCacheKey(value) &&
      value.startsWith(primary.slice(0, -64)) &&
      value !== primary)
  );
}
/** @param {DependencyCache} value @returns {DependencyCache} */
export function validateDependencyCache(value) {
  exact(value, ['id', 'key', 'ref', 'version', 'size_in_bytes', 'restore', 'matched_key', 'save', 'save_action']);
  check(positiveCacheInteger(value.id), 'dependency cache ID is invalid');
  check(dependencyCacheKey(value.key), 'dependency cache key is invalid');
  check(
    typeof value.ref === 'string' && /^refs\/heads\/[A-Za-z0-9._/-]+$/.test(value.ref),
    'dependency cache ref is invalid',
  );
  check(dependencyCacheVersion(value.version), 'dependency cache version is invalid');
  check(positiveCacheInteger(value.size_in_bytes), 'dependency cache size is invalid');
  check(value.save === 'confirmed', 'dependency cache API row is unconfirmed');
  if (value.restore === 'hit') {
    check(value.save_action === 'skipped' && value.matched_key === value.key, 'dependency cache hit differs');
  } else {
    check(
      value.restore === 'miss' &&
        value.save_action === 'success' &&
        dependencyCacheFallback(value.matched_key, value.key),
      'dependency cache save observation differs',
    );
  }
  return value;
}

function resultFields() {
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
/** @param {Record<string, unknown>} record */
function persistedResultIdentityShape(record) {
  return (
    typeof record.schema === 'string' &&
    typeof record.request_id === 'string' &&
    typeof record.operation_id === 'string' &&
    typeof record.version === 'string' &&
    typeof record.repository_id === 'string' &&
    Array.isArray(record.project_ids) &&
    typeof record.target === 'string' &&
    typeof record.source_binding === 'string'
  );
}
/** @param {Record<string, unknown>} record */
function persistedResultEvidenceShape(record) {
  return (
    typeof record.archive_sha256 === 'string' &&
    typeof record.manifest_sha256 === 'string' &&
    typeof record.payload_id === 'string' &&
    typeof record.issuer === 'string' &&
    typeof record.run_id === 'string' &&
    typeof record.run_attempt === 'number' &&
    Array.isArray(record.checks) &&
    record.asset !== null &&
    typeof record.asset === 'object'
  );
}
/** @param {unknown} value @returns {Record<string, unknown>} */
function persistedResultRecord(value) {
  check(value !== null && typeof value === 'object' && !Array.isArray(value), 'persisted result must be an object');
  return /** @type {Record<string, unknown>} */ (value);
}
/** @param {CIDeliveryRequest} request @param {unknown} result @returns {asserts result is CIDeliveryResult} */
function validatePersistedResult(request, result) {
  validateRequest(request);
  const resultRecord = persistedResultRecord(result);
  check(
    persistedResultIdentityShape(resultRecord) && persistedResultEvidenceShape(resultRecord),
    'persisted result shape is invalid',
  );
  const validatedResult = /** @type {CIDeliveryResult} */ (resultRecord);
  const fields = resultFields();
  if (validatedResult.schema === 'VidaCIDeliveryResult/v2') {
    exact(validatedResult, [...fields, 'dependency_cache']);
    validateDependencyCache(/** @type {DependencyCache} */ (validatedResult.dependency_cache));
  } else exact(validatedResult, fields);
  for (const field of /** @type {const} */ ([
    'request_id',
    'operation_id',
    'version',
    'repository_id',
    'project_ids',
    'target',
    'source_binding',
  ]))
    check(equal(validatedResult[field], request[field]), 'formation result request differs: ' + field);
  const profile = {
    issuer: validatedResult.issuer,
    repository_id: request.repository_id,
    project_ids: request.project_ids,
    target: request.target,
    required_checks: Array.isArray(validatedResult.checks) ? validatedResult.checks.map((item) => item?.id) : [],
  };
  profileMatches(request, profile);
  validateChecks(validatedResult.checks, profile);
  exact(validatedResult.asset, ['file', 'bytes', 'sha256']);
  check(
    ['VidaCIDeliveryResult/v1', 'VidaCIDeliveryResult/v2'].includes(validatedResult.schema) &&
      validatedResult.run_id.length > 0 &&
      Number.isSafeInteger(validatedResult.run_attempt) &&
      validatedResult.run_attempt > 0 &&
      hex.test(validatedResult.archive_sha256) &&
      hex.test(validatedResult.manifest_sha256) &&
      hex.test(validatedResult.payload_id) &&
      typeof validatedResult.asset.file === 'string' &&
      validatedResult.asset.file.length > 0 &&
      Number.isSafeInteger(validatedResult.asset.bytes) &&
      validatedResult.asset.bytes > 0 &&
      hex.test(validatedResult.asset.sha256),
    'formation result identity or asset differs',
  );
}
/** Reads the release owner's latest formed build pointer. It is a consistency receipt, not install or acceptance proof. */
/** @param {string} root */
export function readConfirmedCIDeliveryFormation(root) {
  const relative = formationPath();
  const file = releasePath(root, relative, true);
  if (!existsSync(file)) return null;
  const pointer = validateFormationPointer(parseJSON(regularBytes(root, relative).toString('utf8')));
  const journal = releaseState(
    releasePath(root, '.agent/work/agent-local-release/' + pointer.operation_id + '/release.json'),
  );
  const request = parseJSON(regularBytes(root, requestPath(pointer.operation_id, pointer.request_id)).toString('utf8'));
  validateRequest(request);
  check(
    journal.operation_id === pointer.operation_id &&
      journal.version === pointer.version &&
      request.operation_id === pointer.operation_id &&
      request.request_id === pointer.request_id &&
      request.version === pointer.version &&
      request.source_binding === pointer.source_binding,
    'formed build pointer differs from its operation or request',
  );
  const resultBytes = regularBytes(root, resultPath(pointer.operation_id, pointer.request_id), 8 * 1024 * 1024);
  check(sha(resultBytes) === pointer.result_sha256, 'formed build result receipt changed');
  const result = parseJSON(resultBytes.toString('utf8'));
  validatePersistedResult(request, result);
  check(
    result.run_id === pointer.run_id && result.run_attempt === pointer.run_attempt,
    'formed build pointer differs from its exact result',
  );
  return pointer;
}

/** @param {string} root @param {{request: CIDeliveryRequest, observation: CIDeliveryObservation}} args */
function persistCIDeliveryFormation(root, { request, observation }) {
  const resultRelative = resultPath(request.operation_id, request.request_id);
  const resultFile = releasePath(root, resultRelative, true);
  const resultBytes = Buffer.from(observation.result_bytes);
  if (existsSync(resultFile)) {
    check(regularBytes(root, resultRelative).equals(resultBytes), 'formed result already exists with different bytes');
  } else {
    releaseDirectory(root, path.posix.dirname(resultRelative));
    const descriptor = openSync(resultFile, 'wx', 0o600);
    try {
      writeFileSync(descriptor, resultBytes);
      fsyncSync(descriptor);
    } finally {
      closeSync(descriptor);
    }
  }
  const body = {
    schema: 'VidaLocalReleaseFormation/v1',
    authority: 'local_consistency_only',
    operation_id: request.operation_id,
    request_id: request.request_id,
    version: request.version,
    source_binding: request.source_binding,
    run_id: observation.run_id,
    run_attempt: observation.run_attempt,
    artifact_id: observation.artifact_id,
    result_sha256: sha(resultBytes),
  };
  const pointer = { ...body, digest: sha(json(body)) };
  const current = readConfirmedCIDeliveryFormation(root);
  if (current) {
    if (current.operation_id === pointer.operation_id) {
      check(
        equal(current, pointer),
        'formed operation is already bound to its exact successful artifact; a new build requires a higher version',
      );
      return current;
    } else {
      check(
        compareReleaseVersions(pointer.version, current.version) > 0,
        'formation baseline cannot regress or reuse an existing version',
      );
    }
  }
  saveReceipt(releasePath(root, formationPath(), true), pointer);
  return pointer;
}
/** Exclusive request producer. Expected Source edits retain the operation and prior request custody. */
/** @param {{root: string, operation: string, context: {schema?: string, repository_id: string, project_ids: string[]}, target: string}} args */
export function recordCIDeliveryRequest({ root, operation, context, target }) {
  const body = requestBody({ root, operation, context, target });
  const request = { ...body, request_id: sha(json(body)) };
  const relative = requestPath(operation, request.request_id),
    bytes = Buffer.from(json(request));
  if (existsSync(releasePath(root, relative, true))) {
    check(regularBytes(root, relative).equals(bytes), 'partial or changed request; preserve UNKNOWN');
  } else {
    releaseDirectory(root, path.posix.dirname(relative));
    // An uncertain partial first write remains custody; retry never overwrites it.
    writeFileSync(releasePath(root, relative, true), bytes, { flag: 'wx', mode: 0o600 });
  }
  return request;
}
/** @param {Record<string, unknown>} fields */
function validRequestIdentity(fields) {
  return (
    fields.schema === 'VidaCIDeliveryRequest/v1' &&
    typeof fields.operation_id === 'string' &&
    releaseIdPattern.test(fields.operation_id) &&
    typeof fields.version === 'string' &&
    parseReleaseVersion(fields.version) !== null &&
    typeof fields.repository_id === 'string' &&
    id.test(fields.repository_id)
  );
}
/** @param {Record<string, unknown>} fields */
function validRequestTarget(fields) {
  return (
    typeof fields.target === 'string' &&
    targetPattern.test(fields.target) &&
    typeof fields.source_binding === 'string' &&
    hex.test(fields.source_binding) &&
    typeof fields.request_id === 'string'
  );
}
/** @param {Record<string, unknown>} fields */
function validRequestFields(fields) {
  return validRequestIdentity(fields) && validRequestTarget(fields);
}
/** @param {unknown} request @returns {asserts request is CIDeliveryRequest} */
export function validateCIDeliveryRequest(request) {
  check(request !== null && typeof request === 'object' && !Array.isArray(request), 'request must be an object');
  /** @type {Record<string, unknown>} */
  const fieldsValue = /** @type {Record<string, unknown>} */ (request);
  exact(request, [
    'schema',
    'operation_id',
    'version',
    'repository_id',
    'project_ids',
    'target',
    'source_binding',
    'request_id',
  ]);
  const { request_id, ...body } = fieldsValue;
  projects(fieldsValue.project_ids);
  check(validRequestFields(fieldsValue) && request_id === sha(json(body)), 'request binding invalid');
}
/** @type {(value: unknown) => asserts value is CIDeliveryRequest} */
const validateRequest = validateCIDeliveryRequest;
/** @param {CIDeliveryRequest} request @param {CIDeliveryProfile} profile */
function profileMatches(request, profile) {
  check(
    profile &&
      typeof profile.issuer === 'string' &&
      profile.issuer.length > 0 &&
      profile.repository_id === request.repository_id &&
      equal(profile.project_ids, request.project_ids) &&
      profile.target === request.target &&
      Array.isArray(profile.required_checks) &&
      profile.required_checks.length > 0 &&
      new Set(profile.required_checks).size === profile.required_checks.length &&
      profile.required_checks.every((value) => typeof value === 'string' && value.length > 0) &&
      (equal(profile.required_checks, minimumNativeDeliveryChecks) ||
        equal(profile.required_checks, nativeDeliveryChecks)),
    'approved exact native build profile required',
  );
}
/** CI producer encoding. Actual observations are supplied by its qualified controller, not manufactured here. */
/** @param {{request: CIDeliveryRequest, candidate: CIDeliveryCandidate, profile: CIDeliveryProfile, observation: {issuer: string, run_id: string, run_attempt: number, conclusion: string, checks: CIDeliveryCheck[]}, dependency_cache: DependencyCache}} args */
export function encodeCIDeliveryResult({ request, candidate, profile, observation, dependency_cache }) {
  exact(observation, ['issuer', 'run_id', 'run_attempt', 'conclusion', 'checks']);
  validateDependencyCache(dependency_cache);
  const result = {
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
  check(observation.conclusion === 'success', 'producer observations failed or UNKNOWN');
  validateCIDeliveryResult({ request, candidate, profile, result });
  const result_bytes = Buffer.from(json(result));
  return result_bytes;
}
/** @param {CIDeliveryCheck[]} checks @param {CIDeliveryProfile} profile */
function validateChecks(checks, profile) {
  check(
    Array.isArray(checks) &&
      checks.length === profile.required_checks.length &&
      equal(
        checks.map((item) => item.id).sort((left, right) => left.localeCompare(right)),
        profile.required_checks.slice().sort((left, right) => left.localeCompare(right)),
      ),
    'required CI checks differ',
  );
  for (const item of checks) {
    exact(item, ['id', 'status']);
    check(item.status === 'passed', 'failed, skipped or UNKNOWN CI check');
  }
}
/** @param {{request: CIDeliveryRequest, candidate: CIDeliveryCandidate, profile: CIDeliveryProfile, result: CIDeliveryResult}} args */
function validateCIDeliveryResult({ request, candidate, profile, result }) {
  validateRequest(request);
  profileMatches(request, profile);
  exact(result, [...resultFields(), 'dependency_cache']);
  validateDependencyCache(/** @type {DependencyCache} */ (result.dependency_cache));
  for (const field of /** @type {const} */ ([
    'request_id',
    'operation_id',
    'version',
    'repository_id',
    'project_ids',
    'target',
    'source_binding',
  ]))
    check(equal(result[field], request[field]), 'result request differs: ' + field);
  check(
    result.issuer === profile.issuer &&
      typeof result.run_id === 'string' &&
      result.run_id.length > 0 &&
      Number.isSafeInteger(result.run_attempt) &&
      result.run_attempt > 0,
    'result run identity differs',
  );
  validateChecks(result.checks, profile);
  exact(result.asset, ['file', 'bytes', 'sha256']);
  check(
    result.schema === 'VidaCIDeliveryResult/v2' &&
      candidate.operation_id === request.operation_id &&
      candidate.version === request.version &&
      candidate.source_binding === request.source_binding &&
      candidate.manifest.target === request.target &&
      candidate.manifest.pin === '1.4.2' &&
      hex.test(candidate.manifest.payloadId) &&
      Array.isArray(candidate.manifest.inputs) &&
      candidate.manifest.inputs.length > 0 &&
      result.archive_sha256 === candidate.archive_sha256 &&
      result.manifest_sha256 === candidate.manifest_sha256 &&
      result.payload_id === candidate.manifest.payloadId &&
      equal(result.asset, candidate.manifest.asset),
    'CI candidate archive/manifest/payload differs',
  );
}
/** Consistency only: the actual isolated session/controller owns observation origin and profile authority. */
/** @param {{request: CIDeliveryRequest, candidate: CIDeliveryCandidate, profile: CIDeliveryProfile, observation: CIDeliveryObservation}} args */
export function validateCIDeliveryObservation({ request, candidate, profile, observation }) {
  validateRequest(request);
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
      typeof observation.run_id === 'string' &&
      observation.run_id.length > 0 &&
      Number.isSafeInteger(observation.run_attempt) &&
      observation.run_attempt > 0 &&
      typeof observation.artifact_id === 'string' &&
      observation.artifact_id.length > 0 &&
      observation.conclusion === 'success' &&
      Buffer.isBuffer(observation.result_bytes) &&
      observation.result_bytes.length <= 8 * 1024 * 1024,
    'actual complete controller observation required',
  );
  validateChecks(observation.checks, profile);
  const result = parseJSON(observation.result_bytes.toString('utf8'));
  validatePersistedResult(request, result);
  validateCIDeliveryResult({ request, candidate, profile, result });
  // Artifact IDs are assigned after upload; the controller binds them to the retrieved result bytes.
  for (const field of /** @type {const} */ (['issuer', 'run_id', 'run_attempt', 'checks']))
    check(equal(result[field], observation[field]), 'result observation differs: ' + field);
  return {
    source_binding: request.source_binding,
    request_id: request.request_id,
    operation_id: request.operation_id,
  };
}

/** @param {unknown} value */
function safeFormationMemberPath(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 1024 &&
    !value.includes('\\') &&
    !value.startsWith('/') &&
    value.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..')
  );
}

/** @param {Buffer} bytes @param {string} label @param {number} limit @returns {unknown} */
function parseFormationJSON(bytes, label, limit) {
  check(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= limit, label + ' bytes invalid');
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw Error('GAP-VIDA-CI-DELIVERY-001: ' + label + ' JSON invalid');
  }
}

/** @param {{request: CIDeliveryRequest, members: FormationMembers, providerObservation: {issuer: string, run_id: string, run_attempt: number, artifact_id: string}, profile: CIDeliveryProfile}} args */
export function validateCIDeliveryFormationMembers({ request, members, providerObservation, profile }) {
  const candidate = /** @type {CIDeliveryCandidate} */ (
    parseFormationJSON(members.candidate_bytes, 'candidate', 8 * 1024 * 1024)
  );
  exact(candidate, [
    'operation_id',
    'version',
    'source_binding',
    'pack_metadata',
    'archive_sha256',
    'manifest_sha256',
    'manifest',
  ]);
  const manifest = /** @type {CIDeliveryManifest} */ (
    parseFormationJSON(members.manifest_bytes, 'manifest', 8 * 1024 * 1024)
  );
  exact(manifest, ['schema', 'version', 'pin', 'target', 'inputs', 'payloadId', 'asset']);
  exact(manifest.asset, ['file', 'bytes', 'sha256']);
  check(
    candidate.operation_id === request.operation_id &&
      candidate.version === request.version &&
      candidate.source_binding === request.source_binding &&
      equal(candidate.manifest, manifest) &&
      manifest.schema === 'VidaStandaloneBuild/v1' &&
      manifest.version === request.version &&
      manifest.pin === '1.4.2' &&
      manifest.target === request.target &&
      hex.test(manifest.payloadId) &&
      Array.isArray(manifest.inputs) &&
      manifest.inputs.length > 0 &&
      manifest.inputs.length <= 100000 &&
      hex.test(candidate.archive_sha256) &&
      hex.test(candidate.manifest_sha256) &&
      sha(members.archive_bytes) === candidate.archive_sha256 &&
      sha(members.manifest_bytes) === candidate.manifest_sha256,
    'CI candidate, manifest, archive or request differs',
  );
  const inputPaths = new Set();
  for (const input of manifest.inputs) {
    exact(input, ['path', 'bytes', 'sha256']);
    check(
      safeFormationMemberPath(input.path) &&
        !inputPaths.has(input.path) &&
        Number.isSafeInteger(input.bytes) &&
        input.bytes > 0 &&
        hex.test(input.sha256),
      'native manifest input inventory invalid',
    );
    inputPaths.add(input.path);
  }
  check(
    safeFormationMemberPath(manifest.asset.file) &&
      !manifest.asset.file.includes('/') &&
      Number.isSafeInteger(manifest.asset.bytes) &&
      manifest.asset.bytes > 0 &&
      hex.test(manifest.asset.sha256) &&
      Buffer.isBuffer(members.archive_bytes) &&
      members.archive_bytes.length > 0 &&
      members.archive_bytes.length <= ciArchiveLimit &&
      Buffer.isBuffer(members.asset_bytes) &&
      members.asset_bytes.length === manifest.asset.bytes &&
      sha(members.asset_bytes) === manifest.asset.sha256 &&
      Buffer.isBuffer(members.installer_bytes) &&
      members.installer_bytes.length > 0 &&
      members.installer_bytes.length <= 1024 * 1024,
    'native archive, asset or installer bytes invalid',
  );
  check(
    Array.isArray(candidate.pack_metadata) && candidate.pack_metadata.length === 1,
    'exact one CI package archive required',
  );
  const pack = candidate.pack_metadata[0];
  check(
    pack?.name === 'vida-agent' &&
      pack.version === request.version &&
      pack.filename === 'vida-agent-' + request.version + '.tgz' &&
      Array.isArray(pack.files) &&
      pack.files.length > 0 &&
      pack.files.length <= 100000,
    'CI package archive metadata differs',
  );
  const packPaths = new Set();
  for (const file of pack.files) {
    check(
      file &&
        safeFormationMemberPath(file.path) &&
        !packPaths.has(file.path) &&
        Number.isSafeInteger(file.size) &&
        file.size >= 0,
      'CI package file inventory invalid',
    );
    packPaths.add(file.path);
  }
  const manifestFiles = pack.files.filter((file) => file.path === 'dist/standalone/manifest.json');
  const assetFiles = pack.files.filter((file) => file.path === 'dist/standalone/' + manifest.asset.file);
  check(
    manifestFiles.length === 1 &&
      manifestFiles[0]?.size === members.manifest_bytes.length &&
      assetFiles.length === 1 &&
      assetFiles[0]?.size === members.asset_bytes.length,
    'CI package inventory differs from actual native manifest and asset',
  );
  const receipt = /** @type {NativeBuildReceipt} */ (
    parseFormationJSON(members.native_build_result_bytes, 'native-build result', 1024 * 1024)
  );
  exact(receipt, [
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
  validateDependencyCache(receipt.dependency_cache);
  check(
    receipt.schema === 'VidaCIPhaseResult/v2' &&
      receipt.request_id === request.request_id &&
      receipt.run_id === providerObservation.run_id &&
      receipt.run_attempt === providerObservation.run_attempt &&
      receipt.source_binding === request.source_binding &&
      receipt.archive_sha256 === candidate.archive_sha256 &&
      receipt.phase === 'native-build' &&
      receipt.status === 'passed',
    'native-build result differs from the selected request and provider run',
  );
  const checks = /** @type {CIDeliveryCheck[]} */ ([{ id: 'native-build', status: 'passed' }]);
  const result_bytes = encodeCIDeliveryResult({
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
    dependency_cache: receipt.dependency_cache,
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
      result_bytes,
    },
  };
}

/** @param {{root: string, operation: string, version: string, ci?: {request_id: string, profile: CIDeliveryProfile, observe: (args: {request: CIDeliveryRequest, candidate: CIDeliveryCandidate}) => Promise<CIDeliveryObservation>} | null | undefined}} args */
export async function verifyCIDeliveryEvidence({ root, operation, version, ci }) {
  check(
    ci && typeof ci.observe === 'function',
    'no actual trusted controller observation supplied; local logs cannot qualify delivery',
  );
  const candidate = readNativeRetargetCandidate({ root, operation, published: true });
  const request = parseJSON(regularBytes(root, requestPath(operation, ci.request_id)).toString('utf8'));
  validateRequest(request);
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
  // This typed boundary is internal controller wiring, never a CLI callback or saved success flag.
  const observation = await ci.observe({
    request: structuredClone(request),
    candidate: structuredClone(candidate),
  });
  recheckNativeRetargetCandidate(root, candidate);
  check(
    regularBytes(root, requestPath(operation, ci.request_id)).equals(Buffer.from(json(request))),
    'request changed during observation',
  );
  const validated = validateCIDeliveryObservation({ request, candidate, profile, observation });
  await withReleaseAdmission(root, () => {
    const currentPending = releaseState(releasePath(root, '.agent/work/agent-local-release/pending.json'));
    check(
      currentPending.operation_id === operation &&
        currentPending.version === version &&
        !currentPending.install_started &&
        regularBytes(root, requestPath(operation, ci.request_id)).equals(Buffer.from(json(request))),
      'pending release or CI request changed during result publication',
    );
    // The release worker already owns the operation mutex; admission serializes this result with new reservations.
    recheckNativeRetargetCandidate(root, candidate);
    persistCIDeliveryFormation(root, { request, observation });
  });
  return validated;
}

/** @param {Response} response @param {number} limit */
async function responseBytes(response, limit) {
  check(response.ok && response.body, 'provider response unavailable');
  const body = /** @type {ReadableStream<Uint8Array>} */ (response.body);
  const chunks = [];
  let size = 0;
  for await (const chunk of body) {
    size += chunk.length;
    check(size <= limit, 'provider response oversized');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks, size);
}

/** @param {{artifact: GitHubArtifact, request: CIDeliveryRequest, run_id: string, run_attempt: number, repository_id: number, source_commit: string, job: GitHubJob}} args */
export function validateCIArtifactAttempt({
  artifact,
  request,
  run_id,
  run_attempt,
  repository_id,
  source_commit,
  job,
}) {
  const start = Date.parse(job?.started_at),
    end = Date.parse(job?.completed_at),
    created = Date.parse(artifact?.created_at);
  check(
    [start, end, created].every(Number.isFinite) &&
      start <= created &&
      created <= end &&
      artifact.expired === false &&
      artifact.workflow_run?.id === Number(run_id) &&
      artifact.workflow_run?.repository_id === repository_id &&
      artifact.workflow_run?.head_repository_id === repository_id &&
      artifact.workflow_run?.head_sha === source_commit &&
      artifact.name === request.request_id + '-' + run_attempt &&
      /^sha256:[a-f0-9]{64}$/.test(artifact.digest),
    'artifact differs from selected Source/run attempt interval',
  );
}

/** @param {string|null} location @param {string[]} hosts */
export function validateCIDownloadLocation(location, hosts) {
  let url;
  try {
    url = new URL(/** @type {string} */ (location));
  } catch {
    throw Error('GAP-VIDA-CI-DELIVERY-001: invalid artifact redirect');
  }
  check(
    Array.isArray(hosts) &&
      hosts.length > 0 &&
      new Set(hosts).size === hosts.length &&
      hosts.every((host) => typeof host === 'string' && /^(?:[a-z0-9]+(?:-[a-z0-9]+)*\.)+[a-z0-9]+$/.test(host)),
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

/** @param {unknown} value @returns {Record<string, unknown>} */
function packageRecord(value) {
  check(value !== null && typeof value === 'object' && !Array.isArray(value), 'package metadata invalid');
  return /** @type {Record<string, unknown>} */ (value);
}
/** @param {unknown} value */
function packageIdentity(value) {
  const record = packageRecord(value);
  check(typeof record.name === 'string' && typeof record.version === 'string', 'package name or version invalid');
  return /** @type {{name: string, version: string}} */ (record);
}
/** @param {unknown} value @returns {Record<string, unknown>} */
function declaredDependencies(value) {
  const record = packageRecord(value);
  return packageRecord(record.dependencies);
}
/** @param {{declared: unknown, lock: string, fsSafe: unknown, zip: unknown}} args */
export function validateCIZIPReaderVersions({ declared, lock, fsSafe, zip }) {
  const declaredDeps = declaredDependencies(declared);
  const fsSafeInfo = packageIdentity(fsSafe);
  const zipInfo = packageIdentity(zip);
  const pin = /"jszip"\s*:\s*\[\s*"jszip@(\d+\.\d+\.\d+)"/.exec(lock)?.[1];
  check(
    fsSafeInfo.name === '@openclaw/fs-safe' &&
      zipInfo.name === 'jszip' &&
      fsSafeInfo.version === declaredDeps['@openclaw/fs-safe'] &&
      pin &&
      zipInfo.version === pin,
    'archive reader differs from qualified Source dependency pins',
  );
}
/** @param {string} root @returns {Promise<{readArchiveEntry: ReadArchiveEntry, loadZipArchiveWithPreflight: LoadZipArchiveWithPreflight}>} */
async function qualifiedZIPReader(root) {
  try {
    const archive = fsSafeArchiveEntry(path.join(root, 'packages/agent'));
    const fsSafe = parseJSON(readFileSync(path.join(path.dirname(archive), '../package.json'), 'utf8'));
    const zipRequire = createRequire(archive);
    const zip = parseJSON(readFileSync(zipRequire.resolve('jszip/package.json'), 'utf8'));
    const declared = parseJSON(regularBytes(root, 'packages/agent/package.json').toString('utf8'));
    const lock = regularBytes(root, 'packages/agent/bun.lock').toString('utf8');
    validateCIZIPReaderVersions({ declared, lock, fsSafe, zip });
    const loaded =
      /** @type {import('../../packages/agent/tooling/release-dependency-types.js').AgentFsSafeArchiveModule} */ (
        await import(pathToFileURL(archive).href)
      );
    const { readArchiveEntry, loadZipArchiveWithPreflight } = loaded;
    check(
      typeof readArchiveEntry === 'function' && typeof loadZipArchiveWithPreflight === 'function',
      'qualified archive entry or preflight capability unavailable',
    );
    return { readArchiveEntry, loadZipArchiveWithPreflight };
  } catch {
    throw Error('GAP-VIDA-CI-DELIVERY-001: qualified ZIP reader unavailable or dependency drift; no installation');
  }
}

/** Explicit controller effect, never invoked by observation or a CLI default. */
/** @param {DownloadOptions} options */
export async function downloadGitHubCIDelivery(options) {
  const { root, token, signal } = options;
  const request = structuredClone(options.request),
    profile = structuredClone(options.profile);
  const { run_id, run_attempt, artifact_id } = options;
  validateRequest(request);
  profileMatches(request, profile);
  const policy = profile.github;
  check(
    profile.issuer === 'github-actions' &&
      /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(policy?.repository) &&
      /^[a-f0-9]{40}$/.test(policy.source_commit) &&
      Number.isSafeInteger(policy.repository_id) &&
      policy.repository_id > 0 &&
      Number.isSafeInteger(policy.workflow_id) &&
      policy.workflow_id > 0 &&
      /^\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/.test(policy.workflow_path) &&
      typeof policy.job === 'string' &&
      policy.job.length > 0 &&
      [run_id, artifact_id].every(
        (value) => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0,
      ) &&
      Number.isSafeInteger(run_attempt) &&
      run_attempt > 0,
    'explicit approved download profile required',
  );
  check(
    token === undefined || (typeof token === 'string' && token.length > 0 && !/[\p{Cc}]/u.test(token)),
    'explicit token invalid',
  );
  validateCIDownloadLocation(
    'https://' + policy.artifact_hosts?.[0] + '/',
    /** @type {string[]} */ (policy.artifact_hosts),
  );
  const relative =
    '.tmp/ci-delivery/' + request.request_id + '/' + run_id + '-' + run_attempt + '-' + artifact_id + '.zip';
  check(!existsSync(releasePath(root, relative, true)), 'retained download exists; inspect UNKNOWN before any retry');
  const base = 'https://api.github.com/repos/' + policy.repository;
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2026-03-10',
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
  };
  /** @param {string} suffix */
  /** @param {string} suffix @returns {Promise<unknown>} */
  const get = async (suffix) =>
    JSON.parse(
      (
        await responseBytes(
          await fetch(base + suffix, { headers, signal: /** @type {AbortSignal} */ (signal), redirect: 'error' }),
          8 * 1024 * 1024,
        )
      ).toString('utf8'),
    );
  const run = /** @type {GitHubRun} */ (await get('/actions/runs/' + run_id + '/attempts/' + run_attempt));
  check(
    run.id === Number(run_id) &&
      run.run_attempt === run_attempt &&
      run.head_sha === policy.source_commit &&
      run.workflow_id === policy.workflow_id &&
      run.path === policy.workflow_path &&
      run.event === 'workflow_dispatch' &&
      run.status === 'completed' &&
      run.conclusion === 'success' &&
      run.repository?.id === policy.repository_id &&
      run.head_repository?.id === policy.repository_id &&
      run.repository?.full_name === policy.repository,
    'selected download run differs',
  );
  const jobs = /** @type {{jobs: GitHubJob[], total_count: number}} */ (
    await get('/actions/runs/' + run_id + '/attempts/' + run_attempt + '/jobs?per_page=100')
  );
  check(
    Array.isArray(jobs.jobs) && jobs.total_count === jobs.jobs.length,
    'complete bounded download job observation required',
  );
  const selected = jobs.jobs.filter((job) => job.name === policy.job);
  const selectedJob = /** @type {GitHubJob} */ (selected[0]);
  check(
    selected.length === 1 &&
      selectedJob.run_id === Number(run_id) &&
      selectedJob.run_attempt === run_attempt &&
      selectedJob.status === 'completed' &&
      selectedJob.conclusion === 'success',
    'selected download job differs',
  );
  const artifact = /** @type {GitHubArtifact} */ (await get('/actions/artifacts/' + artifact_id));
  check(artifact.id === Number(artifact_id), 'download artifact identity differs');
  validateCIArtifactAttempt({
    artifact,
    request,
    run_id: /** @type {string} */ (run_id),
    run_attempt,
    repository_id: policy.repository_id,
    source_commit: policy.source_commit,
    job: selectedJob,
  });
  const response = await fetch(base + '/actions/artifacts/' + artifact_id + '/zip', {
    headers,
    signal: /** @type {AbortSignal} */ (signal),
    redirect: 'manual',
  });
  check(response.status === 302, 'artifact download did not return its selected redirect');
  const location = validateCIDownloadLocation(
    response.headers.get('location'),
    /** @type {string[]} */ (policy.artifact_hosts),
  );
  // The API credential is deliberately absent from the storage request.
  releaseDirectory(root, path.posix.dirname(relative));
  const file = releasePath(root, relative, true),
    descriptor = openSync(file, 'wx', 0o600);
  let size = 0;
  try {
    const data = await fetch(location, { signal: /** @type {AbortSignal} */ (signal), redirect: 'error' });
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
    'sha256:' + sha(regularBytes(root, relative, ciTransportLimit)) === artifact.digest,
    'download digest differs; retain custody',
  );
  return {
    transport_path: relative,
    run_id: String(run_id),
    run_attempt,
    artifact_id: String(artifact_id),
  };
}
/** Optional repository adapter. No ambient credentials, dispatch, default provider or authority issuance. */
/** @param {ObserveGitHubOptions} options */
export async function observeGitHubCIDelivery({
  root,
  request,
  candidate,
  profile,
  run_id,
  run_attempt,
  artifact_id,
  transport_path,
  token,
  signal,
}) {
  request = structuredClone(request);
  candidate = structuredClone(candidate);
  profile = structuredClone(profile);
  validateRequest(request);
  profileMatches(request, profile);
  const policy = profile.github;
  check(
    profile.issuer === 'github-actions' &&
      policy &&
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
      equal(policy.steps.map((item) => item.id).sort(), profile.required_checks.slice().sort()),
    'approved GitHub policy required',
  );
  check(
    [run_id, artifact_id].every(
      (value) => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0,
    ) &&
      Number.isSafeInteger(run_attempt) &&
      run_attempt > 0,
    'exact provider identities invalid',
  );
  const base = 'https://api.github.com/repos/' + policy.repository;
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2026-03-10',
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
  };
  /** @param {string} suffix @returns {Promise<unknown>} */
  const get = async (suffix) =>
    JSON.parse(
      (
        await responseBytes(
          await fetch(base + suffix, { headers, signal: /** @type {AbortSignal} */ (signal), redirect: 'error' }),
          8 * 1024 * 1024,
        )
      ).toString('utf8'),
    );
  const run = /** @type {GitHubRun} */ (await get('/actions/runs/' + run_id + '/attempts/' + run_attempt));
  check(
    run.id === Number(run_id) &&
      run.run_attempt === run_attempt &&
      run.repository?.id === policy.repository_id &&
      run.head_repository?.id === policy.repository_id &&
      run.repository?.full_name === policy.repository &&
      run.workflow_id === policy.workflow_id &&
      run.path === policy.workflow_path &&
      run.event === 'workflow_dispatch' &&
      run.status === 'completed' &&
      run.conclusion === 'success' &&
      run.head_sha === policy.source_commit,
    'run/attempt/workflow differs',
  );
  const definition = /** @type {{encoding: string, content: string}} */ (
    await get('/contents/' + policy.workflow_path + '?ref=' + run.head_sha)
  );
  check(
    definition.encoding === 'base64' && sha(Buffer.from(definition.content, 'base64')) === policy.workflow_sha256,
    'workflow definition differs',
  );
  const jobs = /** @type {{jobs: GitHubJob[], total_count: number}} */ (
    await get('/actions/runs/' + run_id + '/attempts/' + run_attempt + '/jobs?per_page=100')
  );
  check(Array.isArray(jobs.jobs) && jobs.total_count === jobs.jobs.length, 'bounded complete job observation required');
  const selected = jobs.jobs.filter((job) => job.name === policy.job);
  const selectedJob = /** @type {GitHubJob} */ (selected[0]);
  check(
    selected.length === 1 &&
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
  const artifact = /** @type {GitHubArtifact} */ (await get('/actions/artifacts/' + artifact_id));
  check(artifact.id === Number(artifact_id), 'artifact identity differs');
  validateCIArtifactAttempt({
    artifact,
    request,
    run_id: /** @type {string} */ (run_id),
    run_attempt,
    repository_id: policy.repository_id,
    source_commit: policy.source_commit,
    job: selectedJob,
  });
  const transport = regularBytes(root, transport_path, ciTransportLimit);
  check('sha256:' + sha(transport) === artifact.digest, 'provider ZIP transport differs');
  // Reuse the qualified library. Missing optional ZIP support is a GAP, never an implicit installation.
  const { readArchiveEntry, loadZipArchiveWithPreflight } = await qualifiedZIPReader(root);
  const zip = releasePath(root, transport_path);
  const packageMetadata = /** @type {PackageArchive} */ (candidate.pack_metadata[0]);
  let result_bytes, archive;
  try {
    // Validate physical names once before a native reader can collapse duplicate entries.
    await loadZipArchiveWithPreflight(transport, { maxArchiveBytes: ciTransportLimit });
    result_bytes = await readArchiveEntry(zip, 'result.json', {
      kind: 'zip',
      maxBytes: 8 * 1024 * 1024,
    });
    archive = await readArchiveEntry(zip, packageMetadata.filename, {
      kind: 'zip',
      maxBytes: ciArchiveLimit,
    });
  } catch {
    throw Error(
      'GAP-VIDA-CI-DELIVERY-001: qualified ZIP reader unavailable or artifact invalid; no dependency installation',
    );
  }
  check(
    sha(archive) === candidate.archive_sha256 && regularBytes(root, transport_path, ciTransportLimit).equals(transport),
    'nested archive or transport changed',
  );
  return {
    schema: 'VidaCIDeliveryObservation/v1',
    issuer: profile.issuer,
    run_id: String(run_id),
    run_attempt,
    artifact_id: String(artifact_id),
    conclusion: 'success',
    checks,
    result_bytes,
  };
}
