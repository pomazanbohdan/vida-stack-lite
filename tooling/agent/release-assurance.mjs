import {
  releaseSourceBinding,
  releaseSourceInputs as sources,
  assertReleaseRetargetSettled,
  releasePath,
  releaseState,
  admissionMutex,
  operationMutex,
  selectedTarball,
} from '../../packages/agent/bin/local-release-artifacts.mjs';
import { assertNativeDeliveryEvidenceRepairSettled } from '../../packages/agent/bin/repair-native-delivery-evidence.mjs';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyForwardReviewSet } from './controllers/forward-review-proof.mjs';
import { runCommand } from './release-local.mjs';
import { verifyCIDeliveryEvidence, minimumNativeDeliveryChecks } from './release-ci-evidence.mjs';

const rootDefault = fileURLToPath(new URL('../../', import.meta.url));
/** @typedef {NonNullable<Parameters<typeof sources>[2]>} SourceObservations */
/** @typedef {SourceObservations[number]} InputObservation */
/** @typedef {{lane: string, path: string, inputs: string[], sha256: string, input_binding: string}} TestEvidence */
/** @typedef {{kind: string, path: string, reverse_path: string}} ReviewInput */
/** @typedef {{kind: string, path: string, sha256: string, reverse_path: string, reverse_sha256: string, status: 'passed'}} ReviewEvidence */
/** @typedef {{operation_id: string, version: string, schema?: unknown, status?: unknown, install_started?: unknown} & Record<string, unknown>} ReleaseRecord */
/** @typedef {{root?: string, operation: string, tests: TestEvidence[]}} RecordTestsInput */
/** @typedef {{root?: string, operation: string, scope_path: string, clear_work_id: string, repository_id: string, project_id: string, reviews: ReviewInput[]}} RecordAssuranceInput */
/** @typedef {{root?: string, operation: string}} SealInput */
/** @typedef {Parameters<typeof verifyCIDeliveryEvidence>[0]['ci']} CiEvidence */
/** @typedef {{root?: string, operation: string, version: string, ci?: CiEvidence | null | undefined}} VerifyInput */
/** @param {string | Uint8Array} value */
const sha = (value) => createHash('sha256').update(value).digest('hex');
/** @param {string} file @returns {unknown} */
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
/** @param {unknown} value @param {string} message @returns {Record<string, unknown>} */
function asRecord(value, message) {
  if (!isRecord(value)) throw new Error(message);
  return value;
}
/** @param {Record<string, unknown>} value @param {string} key @param {string} message */
function requiredString(value, key, message) {
  const field = value[key];
  if (typeof field !== 'string' || !field) throw new Error(message);
  return field;
}
/** @param {unknown} value @returns {value is TestEvidence} */
function isTestEvidence(value) {
  if (!isRecord(value) || !Array.isArray(value.inputs)) return false;
  return (
    typeof value.lane === 'string' &&
    typeof value.path === 'string' &&
    typeof value.sha256 === 'string' &&
    typeof value.input_binding === 'string' &&
    value.inputs.every((input) => typeof input === 'string')
  );
}
/** @param {unknown} value @returns {value is Record<string, unknown> & {exists: true, path: string, sha256: string}} */
function isScopeEntry(value) {
  return isRecord(value) && value.exists === true && typeof value.path === 'string' && typeof value.sha256 === 'string';
}
/** @param {unknown} value @returns {TestEvidence[]} */
function testEvidenceRows(value) {
  if (!Array.isArray(value) || !value.every(isTestEvidence)) throw new Error('Test evidence records invalid.');
  return value;
}
/** @param {unknown} value @returns {string} */
function releasePackFilename(value) {
  if (!Array.isArray(value) || value.length !== 1 || !isRecord(value[0]) || typeof value[0].filename !== 'string')
    throw new Error('Release pack metadata invalid.');
  return value[0].filename;
}
/** @param {unknown} value @returns {value is {schema: 'ScopedSourceSnapshot/v1', digest: string, entries: Array<Record<string, unknown> & {exists: true, path: string, sha256: string}>}} */
function isScopeSnapshot(value) {
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
/** @param {unknown} value */
function isPromiseLike(value) {
  return (
    value !== null &&
    (typeof value === 'object' || typeof value === 'function') &&
    'then' in value &&
    typeof value.then === 'function'
  );
}
/** @param {string} root @param {string[]} inputs @param {SourceObservations} [observations] */
export function testInputBinding(root, inputs, observations) {
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
/** @param {string} root @param {string} relative */
function localFile(root, relative) {
  const current = releasePath(root, relative);
  if (!lstatSync(current).isFile()) throw new Error('Assurance evidence must be a regular file.');
  return current;
}
/** @template T @param {string} root @param {string} operation @param {() => T} action @returns {T} */
function withAssuranceWriteLocks(root, operation, action) {
  const admission = admissionMutex(root);
  let worker;
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
/** @param {RecordTestsInput} input */
export function recordLocalTestEvidence({ root = rootDefault, operation, tests }) {
  return withAssuranceWriteLocks(root, operation, () => {
    if (!Array.isArray(tests)) throw new Error('Test evidence operation differs.');
    const pending = asRecord(
      read(path.join(root, '.agent/work/agent-local-release/pending.json')),
      'Pending release invalid.',
    );
    const recorded = tests.map(({ lane, path: relative, inputs }) => {
      const raw = readFileSync(localFile(root, relative));
      const log = asRecord(JSON.parse(raw.toString('utf8')), 'Test log invalid.');
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
/** @param {RecordAssuranceInput} input */
export function recordLocalAssurance({
  root = rootDefault,
  operation,
  scope_path,
  clear_work_id,
  repository_id,
  project_id,
  reviews,
}) {
  return withAssuranceWriteLocks(root, operation, () => {
    const folder = path.join(root, '.agent/work/agent-local-release', operation);
    const seal = asRecord(read(path.join(folder, 'source-seal.json')), 'Source seal invalid.');
    const evidence = reviews.map(({ kind, path: relative, reverse_path }) => ({
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

/** @param {SealInput} input */
export function writeLocalSourceSeal({ root = rootDefault, operation }) {
  return withAssuranceWriteLocks(root, operation, () => {
    const pending = asRecord(
      read(path.join(root, '.agent/work/agent-local-release/pending.json')),
      'Pending release invalid.',
    );
    if (pending.operation_id !== operation) throw new Error('Pending release differs.');
    const seal =
      /** @type {Record<string, unknown> & {operation_id: string, version: string, source_binding: string, tarball_sha256?: string, sealed_fingerprint?: string}} */ ({
        operation_id: operation,
        version: requiredString(pending, 'version', 'Pending release version invalid.'),
        ...releaseSourceBinding(root),
      });
    const release = asRecord(
      read(path.join(root, '.agent/work/agent-local-release', operation, 'release.json')),
      'Release record invalid.',
    );
    const packMetadata = release.pack_metadata;
    const packFilename = releasePackFilename(packMetadata);
    const releaseVersion = requiredString(release, 'version', 'Release version invalid.');
    const tarball = selectedTarball(
      packMetadata,
      path.dirname(releasePath(root, '.tmp/releases/' + operation + '/' + packFilename)),
      releaseVersion,
    );
    seal.tarball_sha256 = sha(readFileSync(tarball));
    seal.sealed_fingerprint = sha(JSON.stringify([seal.source_binding, seal.tarball_sha256]));
    const folder = path.join(root, '.agent/work/agent-local-release', operation);
    // The orchestrating session supplies actual native provenance; this seal grants no approval.
    writeFileSync(path.join(folder, 'source-seal.json'), JSON.stringify(seal, null, 2) + '\n');
    return {
      operation_id: operation,
      status: 'sealed_awaiting_assurance',
      source_binding: seal.source_binding,
      sealed_fingerprint: seal.sealed_fingerprint,
    };
  });
}
/** @param {VerifyInput} input */
export async function verifyLocalReleaseTests({ root = rootDefault, operation, version, ci }) {
  assertReleaseRetargetSettled(root, operation);
  const folder = path.join(root, '.agent/work/agent-local-release', operation);
  const proofFile = path.join(folder, 'tests.json');
  if (!existsSync(proofFile))
    throw new Error(
      'awaiting_assurance: current local retained-behavior/static logs and CI/CD build/install evidence in the release-local lane are required.',
    );
  const proofRelative = path.relative(root, proofFile).split(path.sep).join('/');
  const proofBytes = readFileSync(localFile(root, proofRelative));
  const proof = asRecord(JSON.parse(proofBytes.toString('utf8')), 'Tests proof invalid.');
  const observedEvidence = [{ path: proofRelative, bytes: proofBytes }];
  /** @type {InputObservation[]} */
  const inputObservations = [],
    bindings = new Map();

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
    const result = asRecord(JSON.parse(raw.toString('utf8')), 'Test log invalid.');
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
  const joined = await verifyCIDeliveryEvidence({ root, operation, version, ci });
  for (const evidence of observedEvidence)
    if (!readFileSync(localFile(root, evidence.path)).equals(evidence.bytes))
      throw Error('Local test evidence changed during CI observation.');
  for (const input of inputObservations) {
    const stat = lstatSync(releasePath(root, input.path));
    if (JSON.stringify([stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs]) !== JSON.stringify(input.identity))
      throw Error('Local test input changed during CI observation.');
  }
  return joined;
}
/** @param {VerifyInput} input */
export async function verifyLocalReleaseAssurance({ root = rootDefault, operation, version, ci }) {
  if (!isRecord(ci)) throw new Error('CI evidence invalid.');
  const profile = isRecord(ci.profile) ? ci.profile : undefined;
  if (JSON.stringify(profile?.required_checks) === JSON.stringify(minimumNativeDeliveryChecks)) {
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
  for (const entry of scope.entries) {
    if (!entry.exists || sha(readFileSync(localFile(root, entry.path))) !== entry.sha256)
      throw new Error('Public source scope evidence is stale.');
  }
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
  /** @type {(command: string, args: string[], options: {cwd: string}) => Promise<string>} */
  const runClearVerification =
    /** @type {(command: string, args: string[], options: {cwd: string}) => Promise<string>} */ (runCommand);
  const output = await runClearVerification(
    process.execPath,
    [
      path.join(root, 'packages/agent/bin/vida-agent.mjs'),
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
  const closeout = asRecord(JSON.parse(output), 'Current public CLEAR closeout response invalid.');
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
