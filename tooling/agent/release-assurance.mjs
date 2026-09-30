import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyForwardReviewSet } from './controllers/forward-review-proof.mjs';
import { runCommand } from './release-local.mjs';

const rootDefault = fileURLToPath(new URL('../../', import.meta.url));
const sha = (value) => createHash('sha256').update(value).digest('hex');
const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const excluded = new Set(['node_modules', 'dist', 'coverage', '.pack-inspect']);
function sources(root, relative) {
  const file = path.join(root, relative),
    stat = lstatSync(file);
  if (stat.isSymbolicLink()) throw new Error('Assurance refuses linked source.');
  if (stat.isFile()) return [{ path: relative, sha256: sha(readFileSync(file)) }];
  if (!stat.isDirectory()) throw new Error('Assurance source is not a file or directory.');
  return readdirSync(file)
    .sort()
    .filter((name) => !excluded.has(name))
    .flatMap((name) => sources(root, relative + '/' + name));
}
export function releaseSourceBinding(root = rootDefault) {
  const entries = [
    'package.json',
    'agent-runtime.config.v1.yaml',
    'AGENT.sidecar.md',
    'packages/agent',
    'tooling/agent/release-local.mjs',
    'tooling/agent/release-assurance.mjs',
    'tooling/agent/controllers/forward-review-proof.mjs',
    'tests/agent/release-local.test.mjs',
  ].flatMap((relative) => sources(root, relative));
  return { source_binding: sha(JSON.stringify(entries)), entries };
}
export function testInputBinding(root, inputs) {
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
      return sources(root, relative);
    });
  return sha(JSON.stringify(entries));
}
function localFile(root, relative) {
  if (
    typeof relative !== 'string' ||
    !relative ||
    relative.includes('\\') ||
    relative.startsWith('/') ||
    relative.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':'))
  )
    throw new Error('Assurance evidence path must be repository-relative.');
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    if (lstatSync(current).isSymbolicLink()) throw new Error('Assurance evidence must not be linked.');
  }
  if (!lstatSync(current).isFile()) throw new Error('Assurance evidence must be a regular file.');
  return current;
}
export function recordLocalTestEvidence({ root = rootDefault, operation, tests }) {
  const pending = read(path.join(root, '.agent/work/agent-local-release/pending.json'));
  if (pending.operation_id !== operation || !Array.isArray(tests)) throw new Error('Test evidence operation differs.');
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
}
export async function verifyLocalReleaseTests({ root = rootDefault, operation, version }) {
  const folder = path.join(root, '.agent/work/agent-local-release', operation);
  const proofFile = path.join(folder, 'tests.json');
  if (!existsSync(proofFile))
    throw new Error(
      'awaiting_assurance: current actual retained-behavior, static and release-local test logs are required.',
    );
  const proof = read(proofFile);
  const binding = releaseSourceBinding(root);
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
    if (
      sha(raw) !== test.sha256 ||
      test.input_binding !== testInputBinding(root, test.inputs) ||
      result.exit_code !== 0 ||
      !result.command ||
      !result.started_at ||
      !result.completed_at
    )
      throw new Error('Test log is missing, failed or bound to other source.');
  }
  return { source_binding: binding.source_binding };
}
export async function verifyLocalReleaseAssurance({ root = rootDefault, operation, version }) {
  const tested = await verifyLocalReleaseTests({ root, operation, version });
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
  const pending = read(path.join(rootDefault, '.agent/work/agent-local-release/pending.json'));
  if (pending.operation_id !== operation) throw new Error('Pending release differs.');
  const seal = { operation_id: operation, version: pending.version, ...releaseSourceBinding() };
  if (mode === '--source') {
    console.log(JSON.stringify(seal));
    process.exit(0);
  }
  const release = read(path.join(rootDefault, '.agent/work/agent-local-release', operation, 'release.json'));
  const tarball = path.join(rootDefault, '.tmp/releases', operation, release.pack_metadata[0].filename);
  seal.tarball_sha256 = sha(readFileSync(tarball));
  seal.sealed_fingerprint = sha(JSON.stringify([seal.source_binding, seal.tarball_sha256]));
  const folder = path.join(rootDefault, '.agent/work/agent-local-release', operation);
  // The orchestrating session supplies actual native provenance; this seal grants no approval.
  writeFileSync(path.join(folder, 'source-seal.json'), JSON.stringify(seal, null, 2) + '\n');
  console.log(
    JSON.stringify({
      operation_id: operation,
      status: 'sealed_awaiting_assurance',
      source_binding: seal.source_binding,
      sealed_fingerprint: seal.sealed_fingerprint,
    }),
  );
}
