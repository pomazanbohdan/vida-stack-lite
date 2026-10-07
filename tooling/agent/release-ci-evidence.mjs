import { closeSync, existsSync, fsyncSync, lstatSync, openSync, readFileSync, writeFileSync, writeSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import {
  releaseDigest as sha,
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

const hex = /^[a-f0-9]{64}$/;
const targetPattern = /^bun-(windows|linux|darwin)-(x64|arm64)(-baseline)?$/;
const id = /^[a-z0-9][a-z0-9-]{0,63}$/;
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
const check = (value, message) => {
  if (!value) throw Error('GAP-VIDA-CI-DELIVERY-001: ' + message);
};
const equal = (left, right) => json(left) === json(right);
function exact(value, fields) {
  check(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      equal(Object.keys(value).sort(), fields.slice().sort()),
    'CI contract fields differ',
  );
}
function projects(value) {
  check(
    Array.isArray(value) &&
      value.length > 0 &&
      value.every((item) => id.test(item)) &&
      new Set(value).size === value.length &&
      equal(
        value,
        value.slice().sort((left, right) => left.localeCompare(right)),
      ),
    'exact project set invalid',
  );
}
function regularBytes(root, relative, limit = 8 * 1024 * 1024) {
  const file = releasePath(root, relative),
    stat = lstatSync(file);
  check(stat.isFile() && stat.size <= limit, 'CI file unsafe or oversized');
  return readFileSync(file);
}
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
function requestPath(operation, requestId) {
  check(releaseIdPattern.test(operation) && hex.test(requestId), 'request identity invalid');
  return '.agent/work/agent-local-release/' + operation + '/ci/' + requestId + '/request.json';
}
function formationPath() {
  return '.agent/work/agent-local-release/formed.json';
}
function resultPath(operation, requestId) {
  check(releaseIdPattern.test(operation) && hex.test(requestId), 'formation identity invalid');
  return '.agent/work/agent-local-release/' + operation + '/ci/' + requestId + '/result.json';
}
function compareReleaseVersions(left, right) {
  const a = parseReleaseVersion(left),
    b = parseReleaseVersion(right);
  check(a && b, 'formation version invalid');
  for (const component of ['major', 'minor', 'patch']) {
    if (a[component] !== b[component]) return a[component] < b[component] ? -1 : 1;
  }
  return 0;
}
function validatePersistedResult(request, result) {
  validateRequest(request);
  exact(result, [
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
  ]);
  for (const field of ['request_id', 'operation_id', 'version', 'repository_id', 'project_ids', 'target', 'source_binding'])
    check(equal(result[field], request[field]), 'formation result request differs: ' + field);
  const profile = {
    issuer: result.issuer,
    repository_id: request.repository_id,
    project_ids: request.project_ids,
    target: request.target,
    required_checks: Array.isArray(result.checks) ? result.checks.map((item) => item?.id) : [],
  };
  profileMatches(request, profile);
  validateChecks(result.checks, profile);
  exact(result.asset, ['file', 'bytes', 'sha256']);
  check(
    result.schema === 'VidaCIDeliveryResult/v1' &&
      typeof result.run_id === 'string' && result.run_id.length > 0 &&
      Number.isSafeInteger(result.run_attempt) && result.run_attempt > 0 &&
      hex.test(result.archive_sha256) && hex.test(result.manifest_sha256) && hex.test(result.payload_id) &&
      typeof result.asset.file === 'string' && result.asset.file.length > 0 &&
      Number.isSafeInteger(result.asset.bytes) && result.asset.bytes > 0 && hex.test(result.asset.sha256),
    'formation result identity or asset differs',
  );
}
/** Reads the release owner's latest formed build pointer. It is a consistency receipt, not install or acceptance proof. */
export function readConfirmedCIDeliveryFormation(root) {
  const relative = formationPath();
  const file = releasePath(root, relative, true);
  if (!existsSync(file)) return null;
  const pointer = JSON.parse(regularBytes(root, relative).toString('utf8'));
  exact(pointer, [
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
  const { digest, ...body } = pointer;
  check(
    pointer.schema === 'VidaLocalReleaseFormation/v1' &&
      pointer.authority === 'local_consistency_only' &&
      releaseIdPattern.test(pointer.operation_id) &&
      hex.test(pointer.request_id) &&
      parseReleaseVersion(pointer.version) !== null &&
      hex.test(pointer.source_binding) &&
      typeof pointer.run_id === 'string' && pointer.run_id.length > 0 &&
      Number.isSafeInteger(pointer.run_attempt) && pointer.run_attempt > 0 &&
      typeof pointer.artifact_id === 'string' && pointer.artifact_id.length > 0 &&
      hex.test(pointer.result_sha256) && digest === sha(json(body)),
    'formed build pointer is invalid',
  );
  const journal = releaseState(
    releasePath(root, '.agent/work/agent-local-release/' + pointer.operation_id + '/release.json'),
  );
  const request = JSON.parse(regularBytes(root, requestPath(pointer.operation_id, pointer.request_id)).toString('utf8'));
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
  const result = JSON.parse(resultBytes.toString('utf8'));
  validatePersistedResult(request, result);
  check(
    result.run_id === pointer.run_id && result.run_attempt === pointer.run_attempt,
    'formed build pointer differs from its exact result',
  );
  return pointer;
}

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
      check(equal(current, pointer), 'formed operation already has a different successful result');
      return current;
    }
    check(
      compareReleaseVersions(pointer.version, current.version) > 0,
      'formation baseline cannot regress or reuse an existing version',
    );
  }
  saveReceipt(releasePath(root, formationPath(), true), pointer);
  return pointer;
}
/** Exclusive request producer. Expected Source edits retain the operation and prior request custody. */
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
export function validateCIDeliveryRequest(request) {
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
  const { request_id, ...body } = request;
  projects(request.project_ids);
  check(
    request.schema === 'VidaCIDeliveryRequest/v1' &&
      releaseIdPattern.test(request.operation_id) &&
      parseReleaseVersion(request.version) !== null &&
      id.test(request.repository_id) &&
      targetPattern.test(request.target) &&
      hex.test(request.source_binding) &&
      request_id === sha(json(body)),
    'request binding invalid',
  );
}
const validateRequest = validateCIDeliveryRequest;
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
export function encodeCIDeliveryResult({ request, candidate, profile, observation }) {
  exact(observation, ['issuer', 'run_id', 'run_attempt', 'conclusion', 'checks']);
  const result = {
    schema: 'VidaCIDeliveryResult/v1',
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
  };
  check(observation.conclusion === 'success', 'producer observations failed or UNKNOWN');
  validateCIDeliveryResult({ request, candidate, profile, result });
  const result_bytes = Buffer.from(json(result));
  return result_bytes;
}
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
function validateCIDeliveryResult({ request, candidate, profile, result }) {
  validateRequest(request);
  profileMatches(request, profile);
  exact(result, [
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
  ]);
  for (const field of [
    'request_id',
    'operation_id',
    'version',
    'repository_id',
    'project_ids',
    'target',
    'source_binding',
  ])
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
    result.schema === 'VidaCIDeliveryResult/v1' &&
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
  const result = JSON.parse(observation.result_bytes.toString('utf8'));
  validateCIDeliveryResult({ request, candidate, profile, result });
  // Artifact IDs are assigned after upload; the controller binds them to the retrieved result bytes.
  for (const field of ['issuer', 'run_id', 'run_attempt', 'checks'])
    check(equal(result[field], observation[field]), 'result observation differs: ' + field);
  return { source_binding: request.source_binding, request_id: request.request_id, operation_id: request.operation_id };
}

function formationArtifactMembers(root, request, profile, provider) {
  exact(provider, ['run', 'job', 'artifact', 'workflow_bytes', 'transport_path']);
  const { run, job, artifact } = provider;
  const policy = profile.github;
  check(
    profile.issuer === 'github-actions' &&
      equal(profile.required_checks, minimumNativeDeliveryChecks) &&
      policy &&
      /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(policy.repository) &&
      Number.isSafeInteger(policy.repository_id) && policy.repository_id > 0 &&
      Number.isSafeInteger(policy.workflow_id) && policy.workflow_id > 0 &&
      /^[a-f0-9]{40}$/.test(policy.source_commit) &&
      /^\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/.test(policy.workflow_path) &&
      hex.test(policy.workflow_sha256) &&
      typeof policy.job === 'string' &&
      Array.isArray(policy.steps) && policy.steps.length === 1 &&
      policy.steps[0]?.id === 'native-build' &&
      typeof policy.steps[0]?.name === 'string' && policy.steps[0].name.length > 0,
    'minimum native-build profile required for fresh formation',
  );
  const runId = String(run?.id),
    runAttempt = run?.run_attempt;
  check(
    /^\d+$/.test(runId) && Number.isSafeInteger(Number(runId)) && Number(runId) > 0 &&
      Number.isSafeInteger(runAttempt) && runAttempt > 0 &&
      run.id === Number(runId) &&
      run.workflow_id === policy.workflow_id &&
      run.path === policy.workflow_path &&
      run.event === 'workflow_dispatch' &&
      run.status === 'completed' &&
      run.conclusion === 'success' &&
      run.head_sha === policy.source_commit &&
      run.repository?.id === policy.repository_id &&
      run.head_repository?.id === policy.repository_id &&
      run.repository?.full_name === policy.repository,
    'actual successful provider workflow run required',
  );
  const matches = Array.isArray(job?.steps)
    ? job.steps.filter((step) => step?.name === policy.steps[0].name)
    : [];
  check(
    job.name === policy.job &&
      job.run_id === run.id &&
      job.run_attempt === runAttempt &&
      job.status === 'completed' &&
      job.conclusion === 'success' &&
      matches.length === 1 &&
      matches[0].status === 'completed' &&
      matches[0].conclusion === 'success',
    'actual successful native-build job and step required',
  );
  check(
    artifact?.id === Number(artifact.id) && Number.isSafeInteger(artifact.id) && artifact.id > 0 &&
      artifact.name === 'build-' + request.request_id + '-' + runId + '-' + runAttempt &&
      artifact.expired === false &&
      /^sha256:[a-f0-9]{64}$/.test(artifact.digest) &&
      artifact.workflow_run?.id === run.id &&
      artifact.workflow_run?.repository_id === policy.repository_id &&
      artifact.workflow_run?.head_repository_id === policy.repository_id &&
      artifact.workflow_run?.head_sha === policy.source_commit,
    'actual six-member CI build artifact identity required',
  );
  const start = Date.parse(job.started_at),
    end = Date.parse(job.completed_at),
    created = Date.parse(artifact.created_at);
  check([start, end, created].every(Number.isFinite) && start <= created && created <= end,
    'CI build artifact is outside the selected job interval');
  check(
    Buffer.isBuffer(provider.workflow_bytes) && sha(provider.workflow_bytes) === policy.workflow_sha256,
    'selected Source workflow definition differs',
  );
  const relative = '.tmp/ci-delivery/' + request.request_id + '/' + runId + '-' + runAttempt + '-' + artifact.id + '.zip';
  check(provider.transport_path === relative, 'selected CI build ZIP path differs');
  const transport = regularBytes(root, relative, ciTransportLimit);
  check('sha256:' + sha(transport) === artifact.digest, 'CI build ZIP digest differs');
  return { policy, run, run_id: runId, run_attempt: runAttempt, job, artifact, transport, zip: releasePath(root, relative) };
}

function safeFormationMemberPath(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 1024 &&
    !value.includes('\\') && !value.startsWith('/') &&
    value.split('/').every((part) => part.length > 0 && part !== '.' && part !== '..');
}

function parseFormationJSON(bytes, label, limit) {
  check(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= limit, label + ' bytes invalid');
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw Error('GAP-VIDA-CI-DELIVERY-001: ' + label + ' JSON invalid');
  }
}

export function validateCIDeliveryFormationMembers({ request, members, providerObservation, profile }) {
  const candidate = parseFormationJSON(members.candidate_bytes, 'candidate', 8 * 1024 * 1024);
  exact(candidate, [
    'operation_id',
    'version',
    'source_binding',
    'pack_metadata',
    'archive_sha256',
    'manifest_sha256',
    'manifest',
  ]);
  const manifest = parseFormationJSON(members.manifest_bytes, 'manifest', 8 * 1024 * 1024);
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
      Array.isArray(manifest.inputs) && manifest.inputs.length > 0 && manifest.inputs.length <= 100000 &&
      hex.test(candidate.archive_sha256) && hex.test(candidate.manifest_sha256) &&
      sha(members.archive_bytes) === candidate.archive_sha256 &&
      sha(members.manifest_bytes) === candidate.manifest_sha256,
    'CI candidate, manifest, archive or request differs',
  );
  const inputPaths = new Set();
  for (const input of manifest.inputs) {
    exact(input, ['path', 'bytes', 'sha256']);
    check(
      safeFormationMemberPath(input.path) && !inputPaths.has(input.path) &&
        Number.isSafeInteger(input.bytes) && input.bytes > 0 && hex.test(input.sha256),
      'native manifest input inventory invalid',
    );
    inputPaths.add(input.path);
  }
  check(
    safeFormationMemberPath(manifest.asset.file) && !manifest.asset.file.includes('/') &&
      Number.isSafeInteger(manifest.asset.bytes) && manifest.asset.bytes > 0 && hex.test(manifest.asset.sha256) &&
      Buffer.isBuffer(members.archive_bytes) && members.archive_bytes.length > 0 && members.archive_bytes.length <= ciArchiveLimit &&
      Buffer.isBuffer(members.asset_bytes) && members.asset_bytes.length === manifest.asset.bytes &&
      sha(members.asset_bytes) === manifest.asset.sha256 &&
      Buffer.isBuffer(members.installer_bytes) && members.installer_bytes.length > 0 && members.installer_bytes.length <= 1024 * 1024,
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
      Array.isArray(pack.files) && pack.files.length > 0 && pack.files.length <= 100000,
    'CI package archive metadata differs',
  );
  const packPaths = new Set();
  for (const file of pack.files) {
    check(
      file && safeFormationMemberPath(file.path) && !packPaths.has(file.path) &&
        Number.isSafeInteger(file.size) && file.size >= 0,
      'CI package file inventory invalid',
    );
    packPaths.add(file.path);
  }
  const manifestFiles = pack.files.filter((file) => file.path === 'dist/standalone/manifest.json');
  const assetFiles = pack.files.filter((file) => file.path === 'dist/standalone/' + manifest.asset.file);
  check(
    manifestFiles.length === 1 && manifestFiles[0].size === members.manifest_bytes.length &&
      assetFiles.length === 1 && assetFiles[0].size === members.asset_bytes.length,
    'CI package inventory differs from actual native manifest and asset',
  );
  const receipt = parseFormationJSON(members.native_build_result_bytes, 'native-build result', 1024 * 1024);
  exact(receipt, [
    'schema',
    'request_id',
    'run_id',
    'run_attempt',
    'source_binding',
    'archive_sha256',
    'phase',
    'status',
  ]);
  check(
    receipt.schema === 'VidaCIPhaseResult/v1' &&
      receipt.request_id === request.request_id &&
      receipt.run_id === providerObservation.run_id &&
      receipt.run_attempt === providerObservation.run_attempt &&
      receipt.source_binding === request.source_binding &&
      receipt.archive_sha256 === candidate.archive_sha256 &&
      receipt.phase === 'native-build' && receipt.status === 'passed',
    'native-build result differs from the selected request and provider run',
  );
  const checks = [{ id: 'native-build', status: 'passed' }];
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

/**
 * Confirms a fresh pending operation from the current trusted CI controller.
 * `ci.observe({ request })` returns the exact provider run, native job, build artifact,
 * workflow bytes and ZIP transport path; the controller does not submit a success JSON.
 * This owner reads and validates the six ZIP members, derives the canonical v1 result
 * from the successful native-build step, then stores that result and the formation pointer.
 * The caller is the release worker and therefore already owns the operation mutex.
 */
export async function confirmCIDeliveryFormation({ root, operation, version, ci }) {
  check(ci && typeof ci.observe === 'function' && hex.test(ci.request_id), 'trusted native formation controller required');
  const stateRelative = '.agent/work/agent-local-release/' + operation + '/release.json';
  let state = releaseState(releasePath(root, stateRelative));
  let pending = releaseState(releasePath(root, '.agent/work/agent-local-release/pending.json'));
  const requestRelative = requestPath(operation, ci.request_id);
  const requestBytes = regularBytes(root, requestRelative, 8 * 1024 * 1024);
  const request = JSON.parse(requestBytes.toString('utf8'));
  validateRequest(request);
  check(
    releaseIdPattern.test(operation) && request.request_id === ci.request_id &&
      request.operation_id === operation && request.version === version &&
      state.operation_id === operation && state.version === version && state.status === 'awaiting_assurance' &&
      pending.operation_id === operation && pending.version === version && pending.status === 'awaiting_assurance' &&
      !state.install_started && !pending.install_started &&
      releaseSourceBinding(root).source_binding === request.source_binding,
    'fresh same-source uninstalled pending release required',
  );
  const profile = structuredClone(ci.profile);
  profileMatches(request, profile);
  check(equal(profile.required_checks, minimumNativeDeliveryChecks), 'minimum native-build profile required');
  const provider = await ci.observe({ request: structuredClone(request) });
  const selected = formationArtifactMembers(root, request, profile, provider);
  const { readArchiveEntry, loadZipArchiveWithPreflight } = await qualifiedZIPReader(root);
  let members;
  try {
    const inventory = await loadZipArchiveWithPreflight(selected.transport, { maxArchiveBytes: ciTransportLimit });
    const candidate_bytes = await readArchiveEntry(selected.zip, 'candidate.json', { kind: 'zip', maxBytes: 8 * 1024 * 1024 });
    const candidate = parseFormationJSON(candidate_bytes, 'candidate', 8 * 1024 * 1024);
    const pack = candidate.pack_metadata?.[0];
    const manifest_bytes = await readArchiveEntry(selected.zip, 'manifest.json', { kind: 'zip', maxBytes: 8 * 1024 * 1024 });
    const manifest = parseFormationJSON(manifest_bytes, 'manifest', 8 * 1024 * 1024);
    const expectedNames = [
      pack?.filename,
      manifest.asset?.file,
      'manifest.json',
      'candidate.json',
      'native-build.result.json',
      'install-windows.ps1',
    ].sort((left, right) => left.localeCompare(right));
    const actualNames = Object.keys(inventory.files).filter((name) => !inventory.files[name].dir).sort((left, right) => left.localeCompare(right));
    check(
      expectedNames.length === 6 && expectedNames.every((name) => typeof name === 'string') &&
        new Set(expectedNames).size === 6 && equal(actualNames, expectedNames),
      'CI build ZIP inventory differs from its exact six-member allowlist',
    );
    members = {
      candidate_bytes,
      archive_bytes: await readArchiveEntry(selected.zip, pack.filename, { kind: 'zip', maxBytes: ciArchiveLimit }),
      manifest_bytes,
      asset_bytes: await readArchiveEntry(selected.zip, manifest.asset.file, { kind: 'zip', maxBytes: ciArchiveLimit }),
      native_build_result_bytes: await readArchiveEntry(selected.zip, 'native-build.result.json', { kind: 'zip', maxBytes: 1024 * 1024 }),
      installer_bytes: await readArchiveEntry(selected.zip, 'install-windows.ps1', { kind: 'zip', maxBytes: 1024 * 1024 }),
    };
  } catch (error) {
    throw Error('GAP-VIDA-CI-DELIVERY-001: qualified build ZIP read or inventory validation failed; retain exact operation and artifact');
  }
  const providerObservation = {
    issuer: profile.issuer,
    run_id: selected.run_id,
    run_attempt: selected.run_attempt,
    artifact_id: String(selected.artifact.id),
  };
  const validated = validateCIDeliveryFormationMembers({ request, members, providerObservation, profile });
  await withReleaseAdmission(root, () => {
    state = releaseState(releasePath(root, stateRelative));
    pending = releaseState(releasePath(root, '.agent/work/agent-local-release/pending.json'));
    check(
      state.operation_id === operation && state.version === version && state.status === 'awaiting_assurance' &&
        pending.operation_id === operation && pending.version === version && pending.status === 'awaiting_assurance' &&
        !state.install_started && !pending.install_started &&
        regularBytes(root, requestRelative, 8 * 1024 * 1024).equals(requestBytes) &&
        releaseSourceBinding(root).source_binding === request.source_binding,
      'release request, Source or pending operation changed during formation observation',
    );
    persistCIDeliveryFormation(root, { request, observation: validated.observation });
  });
  return readConfirmedCIDeliveryFormation(root);
}

export async function verifyCIDeliveryEvidence({ root, operation, version, ci }) {
  check(
    ci && typeof ci.observe === 'function',
    'no actual trusted controller observation supplied; local logs cannot qualify delivery',
  );
  const candidate = readNativeRetargetCandidate({ root, operation, published: true });
  const request = JSON.parse(regularBytes(root, requestPath(operation, ci.request_id)));
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
  const observation = await ci.observe({ request: structuredClone(request), candidate: structuredClone(candidate) });
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

async function responseBytes(response, limit) {
  check(response.ok && response.body, 'provider response unavailable');
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    check(size <= limit, 'provider response oversized');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks, size);
}

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

export function validateCIDownloadLocation(location, hosts) {
  let url;
  try {
    url = new URL(location);
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

export function validateCIZIPReaderVersions({ declared, lock, fsSafe, zip }) {
  const pin = /"jszip"\s*:\s*\[\s*"jszip@(\d+\.\d+\.\d+)"/.exec(lock)?.[1];
  check(
    fsSafe.name === '@openclaw/fs-safe' &&
      zip.name === 'jszip' &&
      fsSafe.version === declared.dependencies?.['@openclaw/fs-safe'] &&
      pin &&
      zip.version === pin,
    'archive reader differs from qualified Source dependency pins',
  );
}
async function qualifiedZIPReader(root) {
  const require = createRequire(path.join(root, 'packages/agent/package.json'));
  try {
    const archive = require.resolve('@openclaw/fs-safe/archive');
    const fsSafe = JSON.parse(readFileSync(path.join(path.dirname(archive), '../package.json'), 'utf8'));
    const zipRequire = createRequire(archive);
    const zip = JSON.parse(readFileSync(zipRequire.resolve('jszip/package.json'), 'utf8'));
    const declared = JSON.parse(regularBytes(root, 'packages/agent/package.json'));
    const lock = regularBytes(root, 'packages/agent/bun.lock').toString('utf8');
    validateCIZIPReaderVersions({ declared, lock, fsSafe, zip });
    const { readArchiveEntry, loadZipArchiveWithPreflight } = await import(pathToFileURL(archive).href);
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
  validateCIDownloadLocation('https://' + policy.artifact_hosts?.[0] + '/', policy.artifact_hosts);
  const relative =
    '.tmp/ci-delivery/' + request.request_id + '/' + run_id + '-' + run_attempt + '-' + artifact_id + '.zip';
  check(!existsSync(releasePath(root, relative, true)), 'retained download exists; inspect UNKNOWN before any retry');
  const base = 'https://api.github.com/repos/' + policy.repository;
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2026-03-10',
    ...(token ? { Authorization: 'Bearer ' + token } : {}),
  };
  const get = async (suffix) =>
    JSON.parse(
      await responseBytes(await fetch(base + suffix, { headers, signal, redirect: 'error' }), 8 * 1024 * 1024),
    );
  const run = await get('/actions/runs/' + run_id + '/attempts/' + run_attempt);
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
  const jobs = await get('/actions/runs/' + run_id + '/attempts/' + run_attempt + '/jobs?per_page=100');
  check(
    Array.isArray(jobs.jobs) && jobs.total_count === jobs.jobs.length,
    'complete bounded download job observation required',
  );
  const selected = jobs.jobs.filter((job) => job.name === policy.job);
  check(
    selected.length === 1 &&
      selected[0].run_id === Number(run_id) &&
      selected[0].run_attempt === run_attempt &&
      selected[0].status === 'completed' &&
      selected[0].conclusion === 'success',
    'selected download job differs',
  );
  const artifact = await get('/actions/artifacts/' + artifact_id);
  check(artifact.id === Number(artifact_id), 'download artifact identity differs');
  validateCIArtifactAttempt({
    artifact,
    request,
    run_id,
    run_attempt,
    repository_id: policy.repository_id,
    source_commit: policy.source_commit,
    job: selected[0],
  });
  const response = await fetch(base + '/actions/artifacts/' + artifact_id + '/zip', {
    headers,
    signal,
    redirect: 'manual',
  });
  check(response.status === 302, 'artifact download did not return its selected redirect');
  const location = validateCIDownloadLocation(response.headers.get('location'), policy.artifact_hosts);
  // The API credential is deliberately absent from the storage request.
  releaseDirectory(root, path.posix.dirname(relative));
  const file = releasePath(root, relative, true),
    descriptor = openSync(file, 'wx', 0o600);
  let size = 0;
  try {
    const data = await fetch(location, { signal, redirect: 'error' });
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
  return { transport_path: relative, run_id: String(run_id), run_attempt, artifact_id: String(artifact_id) };
}
/** Optional repository adapter. No ambient credentials, dispatch, default provider or authority issuance. */
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
  const get = async (suffix) =>
    JSON.parse(
      await responseBytes(await fetch(base + suffix, { headers, signal, redirect: 'error' }), 8 * 1024 * 1024),
    );
  const run = await get('/actions/runs/' + run_id + '/attempts/' + run_attempt);
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
  const definition = await get('/contents/' + policy.workflow_path + '?ref=' + run.head_sha);
  check(
    definition.encoding === 'base64' && sha(Buffer.from(definition.content, 'base64')) === policy.workflow_sha256,
    'workflow definition differs',
  );
  const jobs = await get('/actions/runs/' + run_id + '/attempts/' + run_attempt + '/jobs?per_page=100');
  check(Array.isArray(jobs.jobs) && jobs.total_count === jobs.jobs.length, 'bounded complete job observation required');
  const selected = jobs.jobs.filter((job) => job.name === policy.job);
  check(
    selected.length === 1 &&
      selected[0].run_id === Number(run_id) &&
      selected[0].run_attempt === run_attempt &&
      selected[0].status === 'completed' &&
      selected[0].conclusion === 'success',
    'required native job differs',
  );
  const checks = policy.steps.map((step) => {
    const matches = selected[0].steps.filter((item) => item.name === step.name);
    check(
      matches.length === 1 && matches[0].status === 'completed' && matches[0].conclusion === 'success',
      'required native step failed/skipped',
    );
    return { id: step.id, status: 'passed' };
  });
  const artifact = await get('/actions/artifacts/' + artifact_id);
  check(artifact.id === Number(artifact_id), 'artifact identity differs');
  validateCIArtifactAttempt({
    artifact,
    request,
    run_id,
    run_attempt,
    repository_id: policy.repository_id,
    source_commit: policy.source_commit,
    job: selected[0],
  });
  const transport = regularBytes(root, transport_path, ciTransportLimit);
  check('sha256:' + sha(transport) === artifact.digest, 'provider ZIP transport differs');
  // Reuse the qualified library. Missing optional ZIP support is a GAP, never an implicit installation.
  const { readArchiveEntry, loadZipArchiveWithPreflight } = await qualifiedZIPReader(root);
  const zip = releasePath(root, transport_path);
  let result_bytes, archive;
  try {
    // Validate physical names once before a native reader can collapse duplicate entries.
    await loadZipArchiveWithPreflight(transport, { maxArchiveBytes: ciTransportLimit });
    result_bytes = await readArchiveEntry(zip, 'result.json', { kind: 'zip', maxBytes: 8 * 1024 * 1024 });
    archive = await readArchiveEntry(zip, candidate.pack_metadata[0].filename, {
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
