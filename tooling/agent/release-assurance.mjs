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
export { releaseSourceBinding } from '../../packages/agent/bin/local-release-artifacts.mjs';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyForwardReviewSet } from './controllers/forward-review-proof.mjs';
import { runCommand } from './release-local.mjs';
import { verifyCIDeliveryEvidence } from './release-ci-evidence.mjs';

const rootDefault = fileURLToPath(new URL('../../', import.meta.url));
const sha = (value) => createHash('sha256').update(value).digest('hex');
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
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
function localFile(root, relative) {
  const current = releasePath(root, relative);
  if (!lstatSync(current).isFile()) throw new Error('Assurance evidence must be a regular file.');
  return current;
}
function withAssuranceWriteLocks(root, operation, action) {
  const admission = admissionMutex(root);
  let worker;
  try {
    worker = operationMutex(root, operation);
    if (!worker) throw new Error('Local release: operation busy.');
    assertReleaseRetargetSettled(root, operation);
    assertNativeDeliveryEvidenceRepairSettled(root, operation);
    const pending = read(path.join(root, '.agent/work/agent-local-release/pending.json'));
    const current = releaseState(releasePath(root, '.agent/work/agent-local-release/' + operation + '/release.json'));
    const manifest = read(path.join(root, 'packages/agent/package.json'));
    if (pending.operation_id !== operation || pending.version !== current.version || current.operation_id !== operation ||
      current.version !== manifest.version || current.status !== 'awaiting_assurance' || current.install_started)
      throw new Error('Local release: current awaiting-assurance operation required.');
    const result = action();
    if (result && typeof result.then === 'function') throw new Error('Local release: proof writer must be synchronous.');
    return result;
  } finally {
    try { worker?.close(); } finally { admission.close(); }
  }
}
export function recordLocalTestEvidence({ root = rootDefault, operation, tests }) {
  return withAssuranceWriteLocks(root, operation, () => {
    if (!Array.isArray(tests)) throw new Error('Test evidence operation differs.');
    const pending = read(path.join(root, '.agent/work/agent-local-release/pending.json'));
    const recorded = tests.map(({ lane, path: relative, inputs }) => {
      const raw = readFileSync(localFile(root, relative));
      const log = JSON.parse(raw);
      if (log.exit_code !== 0 || !log.command || !log.started_at || !log.completed_at)
        throw new Error('Actual successful test log required.');
      return { lane, path: relative, inputs, input_binding: testInputBinding(root, inputs), sha256: sha(raw) };
    });
    const record = {
      schema: 'VidaLocalReleaseTests/v1',
      operation_id: operation,
      version: pending.version,
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
}) {
  return withAssuranceWriteLocks(root, operation, () => {
    const folder = path.join(root, '.agent/work/agent-local-release', operation);
    const seal = read(path.join(folder, 'source-seal.json'));
    const evidence = reviews.map(({ kind, path: relative, reverse_path }) => ({
      kind,
      path: relative,
      reverse_path,
      sha256: sha(readFileSync(localFile(root, relative))),
      reverse_sha256: sha(readFileSync(localFile(root, reverse_path))),
      status: 'passed',
    }));
    verifyForwardReviewSet(root, operation, seal.sealed_fingerprint, evidence, '.agent/release-assurance');
    const record = {
      schema: 'VidaLocalReleaseAssurance/v1',
      operation_id: operation,
      sealed_fingerprint: seal.sealed_fingerprint,
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

export function writeLocalSourceSeal({ root = rootDefault, operation }) {
  return withAssuranceWriteLocks(root, operation, () => {
    const pending = read(path.join(root, '.agent/work/agent-local-release/pending.json'));
    if (pending.operation_id !== operation) throw new Error('Pending release differs.');
    const seal = { operation_id: operation, version: pending.version, ...releaseSourceBinding(root) };
    const release = read(path.join(root, '.agent/work/agent-local-release', operation, 'release.json'));
    const tarball = selectedTarball(
      release.pack_metadata,
      path.dirname(releasePath(root, '.tmp/releases/' + operation + '/' + release.pack_metadata[0].filename)),
      release.version,
    );
    seal.tarball_sha256 = sha(readFileSync(tarball));
    seal.sealed_fingerprint = sha(JSON.stringify([seal.source_binding, seal.tarball_sha256]));
    const folder = path.join(root, '.agent/work/agent-local-release', operation);
    // The orchestrating session supplies actual native provenance; this seal grants no approval.
    writeFileSync(path.join(folder, 'source-seal.json'), JSON.stringify(seal, null, 2) + '\n');
    return { operation_id: operation, status: 'sealed_awaiting_assurance', source_binding: seal.source_binding, sealed_fingerprint: seal.sealed_fingerprint };
  });
}
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
  const proof = JSON.parse(proofBytes);
  const observedEvidence = [{ path: proofRelative, bytes: proofBytes }];
  const inputObservations = [],
    bindings = new Map();

  if (proof.operation_id !== operation || proof.version !== version)
    throw new Error('Tests operation binding differs.');
  const required = ['retained-behavior', 'static', 'release-local'];
  if (
    !Array.isArray(proof.tests) ||
    proof.tests.length !== required.length ||
    proof.tests
      .map((test) => test.lane)
      .sort()
      .join() !== required.sort().join()
  )
    throw new Error('Actual required test lanes missing.');
  for (const test of proof.tests) {
    const raw = readFileSync(localFile(root, test.path));
    const result = JSON.parse(raw);
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
export async function verifyLocalReleaseAssurance({ root = rootDefault, operation, version, ci }) {
  const tested = await verifyLocalReleaseTests({ root, operation, version, ci });
  const folder = path.join(root, '.agent/work/agent-local-release', operation);
  const seal = read(path.join(folder, 'source-seal.json'));
  const proofFile = path.join(folder, 'assurance.json');
  if (!existsSync(proofFile))
    throw new Error('awaiting_assurance: three actual fresh reviews, reverse validation and current CLEAR required.');
  const proof = read(proofFile);
  const release = read(path.join(folder, 'release.json'));
  const tarball = path.join(root, '.tmp/releases', operation, release.pack_metadata[0].filename);
  if (
    seal.operation_id !== operation ||
    seal.version !== version ||
    seal.source_binding !== tested.source_binding ||
    proof.operation_id !== operation ||
    proof.sealed_fingerprint !== seal.sealed_fingerprint ||
    sha(readFileSync(tarball)) !== seal.tarball_sha256
  )
    throw new Error('Assurance source, archive or operation binding differs.');
  verifyForwardReviewSet(root, operation, seal.sealed_fingerprint, proof.reviews, '.agent/release-assurance');
  const scope = read(localFile(root, proof.scope_path));
  if (
    scope.schema !== 'ScopedSourceSnapshot/v1' ||
    !scope.digest ||
    !Array.isArray(scope.entries) ||
    !scope.entries.length
  )
    throw new Error('Public source scope evidence missing.');
  for (const entry of scope.entries) {
    if (!entry.exists || sha(readFileSync(localFile(root, entry.path))) !== entry.sha256)
      throw new Error('Public source scope evidence is stale.');
  }
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(proof.clear_work_id ?? '') ||
    !/^[a-z0-9][a-z0-9-]{0,63}$/.test(proof.repository_id ?? '') ||
    !/^[a-z0-9][a-z0-9-]{0,63}$/.test(proof.project_id ?? '')
  )
    throw new Error('CLEAR work context invalid.');
  const output = await runCommand(
    process.execPath,
    [
      path.join(root, 'packages/agent/bin/vida-agent.mjs'),
      'documentation-clear',
      '--mode',
      'verify',
      '--project-root',
      root,
      '--repository',
      proof.repository_id,
      '--project',
      proof.project_id,
      '--work-id',
      proof.clear_work_id,
      '--source-revision',
      scope.digest,
    ],
    { cwd: root },
  );
  if (JSON.parse(output).status !== 'verified') throw new Error('Current public CLEAR closeout is not verified.');
  return { source_binding: seal.source_binding };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, operation] = process.argv.slice(2);
  if (!['--source', '--seal'].includes(mode) || !/^[a-z0-9][a-z0-9-]{0,95}$/.test(operation ?? ''))
    throw new Error('Usage: release-assurance.mjs --source OPERATION | --seal OPERATION');
  if (mode === '--source') {
    const pending = read(path.join(rootDefault, '.agent/work/agent-local-release/pending.json'));
    if (pending.operation_id !== operation) throw new Error('Pending release differs.');
    console.log(JSON.stringify({ operation_id: operation, version: pending.version, ...releaseSourceBinding() }));
    process.exit(0);
  }
  console.log(JSON.stringify(writeLocalSourceSeal({ root: rootDefault, operation })));
}
