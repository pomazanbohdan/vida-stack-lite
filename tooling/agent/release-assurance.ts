import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import {
  releaseSourceBinding,
  releaseSourceInputs as sources,
  assertReleaseRetargetSettled,
  releasePath,
  releaseDirectory,
  releaseState,
  admissionMutex,
  operationMutex,
  selectedTarball,
} from '../../packages/agent/bin/local-release-artifacts.ts';
import { assertNativeDeliveryEvidenceRepairSettled } from '../../packages/agent/bin/repair-native-delivery-evidence.ts';
import { verifyForwardReviewSet } from './controllers/forward-review-proof.ts';
import { runCommand } from './release-local.ts';
import {
  verifyCIDeliveryEvidence,
  verifyCIDeliveryFormationPair,
  observeGitHubCIDelivery,
  observeGitHubCIDeliveryWithCandidate,
  validateCIDeliveryRequest,
  minimumNativeDeliveryChecks,
  ciTransportLimit,
  type CIDeliveryRequest,
  type CIDeliveryCandidate,
} from './release-ci-evidence.ts';
import {
  stageNativeRetargetCandidate,
  planReleaseRetarget,
  applyReleaseRetarget,
  readNativeRetargetCandidate,
} from '../../packages/agent/bin/repair-release-retarget.ts';

const rootDefault = fileURLToPath(new URL('../../', import.meta.url));
type SourceObservations = NonNullable<Parameters<typeof sources>[2]>;
type InputObservation = SourceObservations[number];
interface TestEvidence {
  lane: string;
  path: string;
  inputs: string[];
  sha256: string;
  input_binding: string;
}
interface ReviewInput {
  kind: string;
  path: string;
  reverse_path: string;
}
interface ReviewEvidence {
  kind: string;
  path: string;
  sha256: string;
  reverse_path: string;
  reverse_sha256: string;
  status: 'passed';
}
interface RecordTestsInput {
  root?: string;
  operation: string;
  tests: TestEvidence[];
}
interface RecordAssuranceInput {
  root?: string;
  operation: string;
  scope_path: string;
  clear_work_id: string;
  repository_id: string;
  project_id: string;
  reviews: ReviewInput[];
}
interface SealInput {
  root?: string;
  operation: string;
}
type CiEvidence = Parameters<typeof verifyCIDeliveryEvidence>[0]['ci'];
type TargetCiEvidence = { targets: Parameters<typeof verifyCIDeliveryFormationPair>[0]['targets'] };
function isTargetCi(value: CiEvidence | TargetCiEvidence | null | undefined): value is TargetCiEvidence {
  return isRecord(value) && 'targets' in value && Array.isArray(value.targets);
}
interface VerifyInput {
  root?: string;
  operation: string;
  version: string;
  ci?: CiEvidence | TargetCiEvidence | null | undefined;
}
type JsonRecord = Record<string, unknown>;

const sha = (value: string | Uint8Array): string => createHash('sha256').update(value).digest('hex');
function parseJSON(text: string): unknown {
  const value: unknown = JSON.parse(text);
  return value;
}
function read(file: string): unknown {
  return parseJSON(readFileSync(file, 'utf8'));
}
function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function asRecord(value: unknown, message: string): JsonRecord {
  if (!isRecord(value)) throw new Error(message);
  return value;
}
function requiredString(value: JsonRecord, key: string, message: string): string {
  const field = value[key];
  if (typeof field !== 'string' || !field) throw new Error(message);
  return field;
}
function isTestEvidence(value: unknown): value is TestEvidence {
  return (
    isRecord(value) &&
    Array.isArray(value.inputs) &&
    typeof value.lane === 'string' &&
    typeof value.path === 'string' &&
    typeof value.sha256 === 'string' &&
    typeof value.input_binding === 'string' &&
    value.inputs.every((input: unknown) => typeof input === 'string')
  );
}
function isScopeEntry(value: unknown): value is JsonRecord & { exists: true; path: string; sha256: string } {
  return isRecord(value) && value.exists === true && typeof value.path === 'string' && typeof value.sha256 === 'string';
}
function testEvidenceRows(value: unknown): TestEvidence[] {
  if (!Array.isArray(value) || !value.every(isTestEvidence)) throw new Error('Test evidence records invalid.');
  return value;
}
function releasePackFilename(value: unknown): string {
  if (!Array.isArray(value) || value.length !== 1 || !isRecord(value[0]) || typeof value[0].filename !== 'string')
    throw new Error('Release pack metadata invalid.');
  return value[0].filename;
}
function isScopeSnapshot(value: unknown): value is JsonRecord & {
  schema: 'ScopedSourceSnapshot/v1';
  digest: string;
  entries: Array<JsonRecord & { exists: true; path: string; sha256: string }>;
} {
  return (
    isRecord(value) &&
    value.schema === 'ScopedSourceSnapshot/v1' &&
    typeof value.digest === 'string' &&
    !!value.digest &&
    Array.isArray(value.entries) &&
    value.entries.length > 0 &&
    value.entries.every(isScopeEntry)
  );
}
function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    'then' in value &&
    typeof value.then === 'function'
  );
}
export function testInputBinding(root: string, inputs: string[], observations?: SourceObservations): string {
  if (!Array.isArray(inputs) || !inputs.length || new Set(inputs).size !== inputs.length)
    throw new Error('Test inputs must be a nonempty exact set.');
  const entries = inputs
    .slice()
    .sort()
    .flatMap((relative) => {
      if (
        typeof relative !== 'string' ||
        !relative ||
        relative.includes('\\') ||
        relative.startsWith('/') ||
        relative.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':'))
      )
        throw new Error('Test input path invalid.');
      return sources(root, relative, observations);
    });
  return sha(JSON.stringify(entries));
}
function localFile(root: string, relative: string): string {
  const current = releasePath(root, relative);
  if (!lstatSync(current).isFile()) throw new Error('Assurance evidence must be a regular file.');
  return current;
}
function withAssuranceWriteLocks<T>(root: string, operation: string, action: () => T): T {
  const admission = admissionMutex(root);
  let worker: ReturnType<typeof operationMutex> | undefined;
  try {
    worker = operationMutex(root, operation);
    if (!worker) throw new Error('Local release: operation busy.');
    assertReleaseRetargetSettled(root, operation);
    assertNativeDeliveryEvidenceRepairSettled(root, operation);
    const pending = asRecord(
      read(path.join(root, '.agent/work/agent-local-release/pending.json')),
      'Pending release invalid.',
    );
    const current = releaseState(releasePath(root, '.agent/work/agent-local-release/' + operation + '/release.json'));
    const manifest = asRecord(read(path.join(root, 'packages/agent/package.json')), 'Package manifest invalid.');
    if (
      pending.operation_id !== operation ||
      pending.version !== current.version ||
      current.operation_id !== operation ||
      current.version !== manifest.version ||
      current.status !== 'awaiting_assurance' ||
      current.install_started
    )
      throw new Error('Local release: current awaiting-assurance operation required.');
    const result = action();
    if (isPromiseLike(result)) throw new Error('Local release: proof writer must be synchronous.');
    return result;
  } finally {
    try {
      worker?.close();
    } finally {
      admission.close();
    }
  }
}
export function recordLocalTestEvidence({ root = rootDefault, operation, tests }: RecordTestsInput) {
  return withAssuranceWriteLocks(root, operation, () => {
    if (!Array.isArray(tests)) throw new Error('Test evidence operation differs.');
    const pending = asRecord(
      read(path.join(root, '.agent/work/agent-local-release/pending.json')),
      'Pending release invalid.',
    );
    const recorded = tests.map(({ lane, path: relative, inputs }) => {
      const raw = readFileSync(localFile(root, relative));
      const log = asRecord(parseJSON(raw.toString('utf8')), 'Test log invalid.');
      if (log.exit_code !== 0 || !log.command || !log.started_at || !log.completed_at)
        throw new Error('Actual successful test log required.');
      return { lane, path: relative, inputs, input_binding: testInputBinding(root, inputs), sha256: sha(raw) };
    });
    const record = {
      schema: 'VidaLocalReleaseTests/v1',
      operation_id: operation,
      version: requiredString(pending, 'version', 'Pending release version invalid.'),
      tests: recorded,
    };
    writeFileSync(
      path.join(root, '.agent/work/agent-local-release', operation, 'tests.json'),
      JSON.stringify(record, null, 2) + '\n',
    );
    return record;
  });
}
export function recordLocalAssurance({
  root = rootDefault,
  operation,
  scope_path,
  clear_work_id,
  repository_id,
  project_id,
  reviews,
}: RecordAssuranceInput) {
  return withAssuranceWriteLocks(root, operation, () => {
    const folder = path.join(root, '.agent/work/agent-local-release', operation);
    const seal = asRecord(read(path.join(folder, 'source-seal.json')), 'Source seal invalid.');
    const evidence: ReviewEvidence[] = reviews.map(({ kind, path: relative, reverse_path }) => ({
      kind,
      path: relative,
      reverse_path,
      sha256: sha(readFileSync(localFile(root, relative))),
      reverse_sha256: sha(readFileSync(localFile(root, reverse_path))),
      status: 'passed',
    }));
    const sealedFingerprint = requiredString(seal, 'sealed_fingerprint', 'Source seal fingerprint invalid.');
    verifyForwardReviewSet(root, operation, sealedFingerprint, evidence, '.agent/release-assurance');
    const record = {
      schema: 'VidaLocalReleaseAssurance/v1',
      operation_id: operation,
      sealed_fingerprint: sealedFingerprint,
      scope_path,
      clear_work_id,
      repository_id,
      project_id,
      reviews: evidence,
    };
    writeFileSync(path.join(folder, 'assurance.json'), JSON.stringify(record, null, 2) + '\n');
    return { operation_id: operation, status: 'joined' };
  });
}
export function writeLocalSourceSeal({ root = rootDefault, operation }: SealInput) {
  return withAssuranceWriteLocks(root, operation, () => {
    const pending = asRecord(
      read(path.join(root, '.agent/work/agent-local-release/pending.json')),
      'Pending release invalid.',
    );
    if (pending.operation_id !== operation) throw new Error('Pending release differs.');
    const seal: {
      operation_id: string;
      version: string;
      source_binding: string;
      tarball_sha256?: string;
      sealed_fingerprint?: string;
    } = {
      operation_id: operation,
      version: requiredString(pending, 'version', 'Pending release version invalid.'),
      ...releaseSourceBinding(root),
    };
    const release = asRecord(
      read(path.join(root, '.agent/work/agent-local-release', operation, 'release.json')),
      'Release record invalid.',
    );
    const packFilename = releasePackFilename(release.pack_metadata);
    const releaseVersion = requiredString(release, 'version', 'Release version invalid.');
    const tarball = selectedTarball(
      release.pack_metadata,
      path.dirname(releasePath(root, '.tmp/releases/' + operation + '/' + packFilename)),
      releaseVersion,
    );
    seal.tarball_sha256 = sha(readFileSync(tarball));
    seal.sealed_fingerprint = sha(JSON.stringify([seal.source_binding, seal.tarball_sha256]));
    const folder = path.join(root, '.agent/work/agent-local-release', operation);
    writeFileSync(path.join(folder, 'source-seal.json'), JSON.stringify(seal, null, 2) + '\n');
    return {
      operation_id: operation,
      status: 'sealed_awaiting_assurance',
      source_binding: seal.source_binding,
      sealed_fingerprint: seal.sealed_fingerprint,
    };
  });
}
function captureLocalReleaseTests({ root = rootDefault, operation, version }: VerifyInput) {
  assertReleaseRetargetSettled(root, operation);
  const folder = path.join(root, '.agent/work/agent-local-release', operation);
  const proofFile = path.join(folder, 'tests.json');
  if (!existsSync(proofFile))
    throw new Error(
      'awaiting_assurance: current local retained-behavior/static logs and CI/CD build/install evidence in the release-local lane are required.',
    );
  const proofRelative = path.relative(root, proofFile).split(path.sep).join('/');
  const proofBytes = readFileSync(localFile(root, proofRelative));
  const proof = asRecord(parseJSON(proofBytes.toString('utf8')), 'Tests proof invalid.');
  const observedEvidence: Array<{ path: string; bytes: Buffer }> = [{ path: proofRelative, bytes: proofBytes }];
  const inputObservations: InputObservation[] = [];
  const bindings = new Map<string, string>();
  if (proof.operation_id !== operation || proof.version !== version)
    throw new Error('Tests operation binding differs.');
  const testEvidence = testEvidenceRows(proof.tests);
  const required = ['retained-behavior', 'static', 'release-local'];
  if (
    testEvidence.length !== required.length ||
    testEvidence
      .map((test) => test.lane)
      .sort()
      .join() !== required.sort().join()
  )
    throw new Error('Actual required test lanes missing.');
  for (const test of testEvidence) {
    const raw = readFileSync(localFile(root, test.path));
    const result = asRecord(parseJSON(raw.toString('utf8')), 'Test log invalid.');
    const inputKey = JSON.stringify(test.inputs);
    if (!bindings.has(inputKey)) bindings.set(inputKey, testInputBinding(root, test.inputs, inputObservations));
    if (
      sha(raw) !== test.sha256 ||
      test.input_binding !== bindings.get(inputKey) ||
      result.exit_code !== 0 ||
      !result.command ||
      !result.started_at ||
      !result.completed_at
    )
      throw new Error('Test log is missing, failed or bound to other source.');
    observedEvidence.push({ path: test.path, bytes: raw });
  }
  return { root, observedEvidence, inputObservations };
}

function recheckLocalReleaseTests(capture: ReturnType<typeof captureLocalReleaseTests>): void {
  const { root, observedEvidence, inputObservations } = capture;
  for (const evidence of observedEvidence)
    if (!readFileSync(localFile(root, evidence.path)).equals(evidence.bytes))
      throw Error('Local test evidence changed during CI observation.');
  for (const input of inputObservations) {
    const stat = lstatSync(releasePath(root, input.path));
    if (JSON.stringify([stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs]) !== JSON.stringify(input.identity))
      throw Error('Local test input changed during CI observation.');
  }
}

/** Local tests authorize only formation of an inert SDK archive, never installation or publication. */
export async function verifyLocalPackTests(input: VerifyInput): Promise<{ source_binding: string }> {
  const root = input.root ?? rootDefault;
  const before = releaseSourceBinding(root).source_binding;
  const pending = releaseState(releasePath(root, '.agent/work/agent-local-release/pending.json'));
  const journal = releaseState(releasePath(root, `.agent/work/agent-local-release/${input.operation}/release.json`));
  if (
    pending.operation_id !== input.operation ||
    pending.version !== input.version ||
    journal.operation_id !== input.operation ||
    journal.version !== input.version ||
    journal.install_started ||
    !['awaiting_assurance', 'running', 'packing'].includes(journal.status)
  )
    throw new Error('Local pack operation differs or is no longer eligible.');
  const capture = captureLocalReleaseTests(input);
  recheckLocalReleaseTests(capture);
  if (releaseSourceBinding(root).source_binding !== before)
    throw new Error('Local pack Source changed during test inspection.');
  return { source_binding: before };
}

export async function verifyLocalReleaseTests(input: VerifyInput) {
  const capture = captureLocalReleaseTests(input);
  const { root, operation, version, ci } = { ...input, root: input.root ?? rootDefault };
  if (isTargetCi(ci))
    return verifyCIDeliveryFormationPair({
      root,
      operation,
      version,
      targets: ci.targets,
      recheckLocalTests: () => recheckLocalReleaseTests(capture),
    });
  const joined = await verifyCIDeliveryEvidence({ root, operation, version, ci });
  recheckLocalReleaseTests(capture);
  return joined;
}
type ApprovedGitHubPair = {
  root?: string;
  operation: string;
  version: string;
  source_commit: string;
  run_id: string;
  run_attempt: number;
  linux: { request_id: string; artifact_id: string; transport_path: string };
  windows: { request_id: string; artifact_id: string; transport_path: string };
  token?: string;
};
function approvedGitHubTargets(input: ApprovedGitHubPair) {
  const root = input.root ?? rootDefault;
  if (!/^[a-f0-9]{40}$/.test(input.source_commit)) throw Error('Selected Source commit is invalid.');
  const workflowPath = '.github/workflows/agent-native-delivery.yml';
  const file = releasePath(root, workflowPath);
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 8 * 1024 * 1024)
    throw Error('Selected workflow Source is invalid.');
  const workflowHash = sha(readFileSync(file));
  const targets = (['bun-linux-x64', 'bun-windows-x64'] as const).map((target) => {
    const selected = target === 'bun-linux-x64' ? input.linux : input.windows;
    const profile = {
      issuer: 'github-actions',
      repository_id: 'vida-agent',
      project_ids: ['agent'],
      target,
      required_checks: [...minimumNativeDeliveryChecks],
      github: {
        repository: 'pomazanbohdan/vida-stack-lite',
        repository_id: 1340911900,
        workflow_id: 374583166,
        source_commit: input.source_commit,
        workflow_path: workflowPath,
        workflow_sha256: workflowHash,
        job: target === 'bun-linux-x64' ? 'native-linux-x64' : 'native-windows-x64',
        steps: [{ id: 'native-build', name: 'native-build' }],
      },
    };
    return {
      target,
      request_id: selected.request_id,
      profile,
      observe: ({ request, candidate }: { request: CIDeliveryRequest; candidate: CIDeliveryCandidate }) =>
        observeGitHubCIDelivery({
          root,
          request,
          candidate,
          profile,
          run_id: input.run_id,
          run_attempt: input.run_attempt,
          artifact_id: selected.artifact_id,
          transport_path: selected.transport_path,
          ...(input.token ? { token: input.token } : {}),
          signal: AbortSignal.timeout(30_000),
        }),
    };
  });
  return targets;
}
/** Observe the fixed project workflow only after its actual run has completed. */
export async function verifyApprovedGitHubFormationPair(input: ApprovedGitHubPair) {
  const root = input.root ?? rootDefault;
  const targets = approvedGitHubTargets(input);
  return verifyLocalReleaseTests({
    root,
    operation: input.operation,
    version: input.version,
    ci: { targets },
  });
}
/** Verify both provider artifacts before staging either target through the existing retarget owner. */
export async function stageApprovedGitHubFormationPair(input: ApprovedGitHubPair & { actor: string }) {
  const root = input.root ?? rootDefault;
  if (typeof input.actor !== 'string' || !input.actor.trim() || input.actor.length > 256)
    throw Error('Retarget actor is invalid.');
  const retarget = `.agent/work/agent-local-release/${input.operation}/retarget`;
  if (existsSync(releasePath(root, retarget, true)))
    throw Error('Existing retarget staging requires inspection; preserve UNKNOWN.');
  const source = releaseSourceBinding(root).source_binding;
  const targets = approvedGitHubTargets(input);
  if (input.linux.artifact_id === input.windows.artifact_id) throw Error('Selected target artifacts differ.');
  const rows: Array<{
    target: 'bun-linux-x64' | 'bun-windows-x64';
    request: CIDeliveryRequest;
    request_bytes: Buffer;
    selected: ApprovedGitHubPair['linux'];
    candidate: CIDeliveryCandidate;
    archive_bytes: Buffer;
    transport_sha256: string;
  }> = [];
  for (const target of targets) {
    const selected = target.target === 'bun-linux-x64' ? input.linux : input.windows;
    if (!/^[a-f0-9]{64}$/.test(selected.request_id)) throw Error('Target request identity invalid.');
    const requestPath = `.agent/work/agent-local-release/${input.operation}/ci/${selected.request_id}/request.json`;
    const requestBytes = readFileSync(localFile(root, requestPath));
    const request: unknown = parseJSON(requestBytes.toString('utf8'));
    validateCIDeliveryRequest(request);
    if (
      request.request_id !== selected.request_id ||
      request.operation_id !== input.operation ||
      request.version !== input.version ||
      request.target !== target.target ||
      request.source_binding !== source
    )
      throw Error('Target request or Source differs.');
    const observed = await observeGitHubCIDeliveryWithCandidate({
      root,
      request,
      profile: target.profile,
      run_id: input.run_id,
      run_attempt: input.run_attempt,
      artifact_id: selected.artifact_id,
      transport_path: selected.transport_path,
      ...(input.token ? { token: input.token } : {}),
      signal: AbortSignal.timeout(30_000),
    });
    rows.push({ target: target.target, request, request_bytes: requestBytes, selected, ...observed });
  }
  if (rows.length !== 2 || releaseSourceBinding(root).source_binding !== source) throw Error('Target Source changed.');
  for (const row of rows) {
    const requestPath = `.agent/work/agent-local-release/${input.operation}/ci/${row.request.request_id}/request.json`;
    const transport = localFile(root, row.selected.transport_path);
    const transportStat = lstatSync(transport);
    if (!transportStat.isFile() || transportStat.size > ciTransportLimit) throw Error('Provider transport invalid.');
    if (
      !readFileSync(localFile(root, requestPath)).equals(row.request_bytes) ||
      sha(readFileSync(transport)) !== row.transport_sha256
    )
      throw Error('Target request or provider transport changed.');
  }
  if (existsSync(releasePath(root, retarget, true)))
    throw Error('Retarget staging changed during provider observation; preserve UNKNOWN.');
  const parent = `.tmp/ci-retarget/${input.operation}`;
  releaseDirectory(root, parent);
  const primary = process.platform === 'win32' ? 'bun-windows-x64' : 'bun-linux-x64';
  for (const row of rows) {
    const folder = `${parent}/${row.request.request_id}`;
    mkdirSync(releasePath(root, folder, true), { mode: 0o700 });
    const archive = `${folder}/${row.candidate.pack_metadata[0]!.filename}`;
    writeFileSync(releasePath(root, archive, true), row.archive_bytes, { flag: 'wx', mode: 0o600 });
    const descriptor = `${folder}/candidate.json`;
    writeFileSync(
      releasePath(root, descriptor, true),
      JSON.stringify({
        schema: row.target === primary ? 'VidaNativeRetargetCandidate/v1' : 'VidaNativeRetargetCandidate/v2',
        operation_id: input.operation,
        version: input.version,
        source_binding: source,
        archive,
        pack_metadata: row.candidate.pack_metadata,
        ...(row.target === primary ? {} : { target: row.target }),
      }),
      { flag: 'wx', mode: 0o600 },
    );
    await stageNativeRetargetCandidate({ root, operation: input.operation, candidateFile: descriptor });
    const staged = readNativeRetargetCandidate({
      root,
      operation: input.operation,
      ...(row.target === primary ? {} : { target: row.target }),
    });
    if (
      staged.archive_sha256 !== row.candidate.archive_sha256 ||
      staged.manifest_sha256 !== row.candidate.manifest_sha256 ||
      !isDeepStrictEqual(staged.manifest, row.candidate.manifest)
    )
      throw Error('Staged candidate differs from provider observation; preserve stage.');
  }
  await planReleaseRetarget({ root, operation: input.operation, actor: input.actor });
  await applyReleaseRetarget({ root, operation: input.operation });
  return verifyApprovedGitHubFormationPair(input);
}
export async function verifyLocalReleaseAssurance({ root = rootDefault, operation, version, ci }: VerifyInput) {
  if (!isRecord(ci)) throw new Error('CI evidence invalid.');
  if (isTargetCi(ci)) {
    if (
      ci.targets.length === 2 &&
      ci.targets.every(
        (item) => JSON.stringify(item.profile.required_checks) === JSON.stringify(minimumNativeDeliveryChecks),
      )
    )
      return verifyLocalReleaseTests({ root, operation, version, ci });
  } else {
    const profile = isRecord(ci.profile) ? ci.profile : undefined;
    if (JSON.stringify(profile?.required_checks) === JSON.stringify(minimumNativeDeliveryChecks))
      return verifyCIDeliveryEvidence({ root, operation, version, ci });
  }
  const tested = await verifyLocalReleaseTests({ root, operation, version, ci });
  const folder = path.join(root, '.agent/work/agent-local-release', operation);
  const seal = asRecord(read(path.join(folder, 'source-seal.json')), 'Source seal invalid.');
  const proofFile = path.join(folder, 'assurance.json');
  if (!existsSync(proofFile))
    throw new Error('awaiting_assurance: three actual fresh reviews, reverse validation and current CLEAR required.');
  const proof = asRecord(read(proofFile), 'Assurance proof invalid.');
  const release = asRecord(read(path.join(folder, 'release.json')), 'Release record invalid.');
  const packFilename = releasePackFilename(release.pack_metadata);
  const sealedFingerprint = requiredString(seal, 'sealed_fingerprint', 'Source seal fingerprint invalid.');
  const sourceBinding = requiredString(seal, 'source_binding', 'Source seal binding invalid.');
  const tarballSha256 = requiredString(seal, 'tarball_sha256', 'Source seal archive digest invalid.');
  const tarball = path.join(root, '.tmp/releases', operation, packFilename);
  if (
    seal.operation_id !== operation ||
    seal.version !== version ||
    sourceBinding !== tested.source_binding ||
    proof.operation_id !== operation ||
    proof.sealed_fingerprint !== sealedFingerprint ||
    sha(readFileSync(tarball)) !== tarballSha256
  )
    throw new Error('Assurance source, archive or operation binding differs.');
  verifyForwardReviewSet(root, operation, sealedFingerprint, proof.reviews, '.agent/release-assurance');
  const scopePath = requiredString(proof, 'scope_path', 'Public source scope path missing.');
  const scope = asRecord(read(localFile(root, scopePath)), 'Public source scope evidence invalid.');
  if (!isScopeSnapshot(scope)) throw new Error('Public source scope evidence missing.');
  for (const entry of scope.entries)
    if (!entry.exists || sha(readFileSync(localFile(root, entry.path))) !== entry.sha256)
      throw new Error('Public source scope evidence is stale.');
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(requiredString(proof, 'clear_work_id', 'CLEAR work context invalid.')) ||
    !/^[a-z0-9][a-z0-9-]{0,63}$/.test(requiredString(proof, 'repository_id', 'CLEAR work context invalid.')) ||
    !/^[a-z0-9][a-z0-9-]{0,63}$/.test(requiredString(proof, 'project_id', 'CLEAR work context invalid.'))
  )
    throw new Error('CLEAR work context invalid.');
  const repositoryId = requiredString(proof, 'repository_id', 'CLEAR repository invalid.');
  const projectId = requiredString(proof, 'project_id', 'CLEAR project invalid.');
  const clearWorkId = requiredString(proof, 'clear_work_id', 'CLEAR work identifier invalid.');
  const sourceRevision = requiredString(scope, 'digest', 'Public source scope digest invalid.');
  const output = await runCommand(
    process.execPath,
    [
      path.join(root, 'packages/agent/bin/vida-agent.ts'),
      'documentation-clear',
      '--mode',
      'verify',
      '--project-root',
      root,
      '--repository',
      repositoryId,
      '--project',
      projectId,
      '--work-id',
      clearWorkId,
      '--source-revision',
      sourceRevision,
    ],
    { cwd: root },
  );
  const closeout = asRecord(parseJSON(output), 'Current public CLEAR closeout response invalid.');
  if (closeout.status !== 'verified') throw new Error('Current public CLEAR closeout is not verified.');
  return { source_binding: sourceBinding };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, operation] = process.argv.slice(2);
  if ((mode !== '--source' && mode !== '--seal') || !operation || !/^[a-z0-9][a-z0-9-]{0,95}$/.test(operation))
    throw new Error('Usage: release-assurance.mjs --source OPERATION | --seal OPERATION');
  if (mode === '--source') {
    const pending = asRecord(
      read(path.join(rootDefault, '.agent/work/agent-local-release/pending.json')),
      'Pending release invalid.',
    );
    if (pending.operation_id !== operation) throw new Error('Pending release differs.');
    console.log(
      JSON.stringify({
        operation_id: operation,
        version: requiredString(pending, 'version', 'Pending release version invalid.'),
        ...releaseSourceBinding(),
      }),
    );
    process.exit(0);
  }
  console.log(JSON.stringify(writeLocalSourceSeal({ root: rootDefault, operation })));
}
