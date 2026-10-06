import { existsSync, lstatSync, mkdirSync, opendirSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { root as safeRoot } from '@openclaw/fs-safe/root';
import {
  admissionMutex,
  operationMutex,
  createRepairSourcePass,
  releaseDigest as sha,
  releaseJSON as json,
  requireRelease as require,
  releasePath,
  releaseRelative,
  registerRepairSourcePath,
  releaseDirectory,
  releaseIdPattern,
  releaseState,
  releaseSourceBinding,
  releaseSourceInputs,
  selectedTarball,
} from './local-release-artifacts.mjs';
import { verifyForwardReviewSet } from './forward-review-proof.mjs';

const base = (op) => '.agent/work/agent-local-release/' + op;
const repair = (op) => base(op) + '/native-delivery-evidence';
const targets = (op) => [base(op) + '/tests.json', base(op) + '/source-seal.json', base(op) + '/assurance.json'];
const phaseNames = [
  'planning',
  'custody',
  'tests_pending',
  'tests_removed',
  'source_seal_pending',
  'source_seal_removed',
  'assurance_pending',
  'assurance_removed',
  'complete',
];
const pathFields = new Set([
  'path',
  'reverse_path',
  'scope_path',
  'clear_path',
  'transport_path',
  'archive',
  'stdout_path',
  'stderr_path',
  'log_path',
  'result_path',
  'observation_path',
  'manifest_path',
  'installer_path',
]);
const sourceExcluded = new Set(['node_modules', 'dist', 'coverage', '.pack-inspect']);
const sourceScratch = new Set(['.tmp', '.agent', 'packages/agent/.tmp', 'packages/agent/.agent']);
const identity = (stat) => (stat ? [stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs] : null);
const sealed = (body) => ({ ...body, digest: sha(json(body)) });
function keys(value, expected) {
  require(value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join() === expected.slice().sort().join(), 'native evidence repair fields differ');
}
function read(root, relative, limit = 8 * 1024 * 1024) {
  const file = releasePath(root, relative),
    stat = lstatSync(file);
  require(stat.isFile() && stat.nlink === 1 && stat.size <= limit, 'native evidence repair file unsafe or oversized');
  const before = identity(stat),
    bytes = readFileSync(file);
  require(json(before) === json(identity(lstatSync(file))), 'native evidence repair input changed during read');
  return bytes;
}
function object(root, relative) {
  return JSON.parse(read(root, relative).toString('utf8'));
}
function fileObservation(root, relative) {
  const file = releasePath(root, relative, true),
    stat = lstatSync(file, { throwIfNoEntry: false });
  if (!stat) return { path: relative, kind: 'file', exists: false, identity: null, sha256: null };
  require(stat.isFile() && stat.nlink === 1, 'native evidence dependency is not a regular file');
  const bytes = read(root, relative, 512 * 1024 * 1024);
  return { path: relative, kind: 'file', exists: true, identity: identity(stat), sha256: sha(bytes) };
}
function registerClosureNode(nodes, relative, sourcePass) {
  const normalized = releaseRelative(relative);
  if (nodes.has(normalized)) return;
  registerRepairSourcePath(sourcePass, normalized);
  nodes.add(normalized);
}
function closureDirectoryMembers(root, relative, nodes, sourcePass) {
  registerClosureNode(nodes, relative, sourcePass);
  const directory = opendirSync(releasePath(root, relative));
  const members = [];
  try {
    while (true) {
      const entry = directory.readSync();
      if (!entry) break;
      registerClosureNode(nodes, relative + '/' + entry.name, sourcePass);
      members.push(entry.name);
    }
  } finally {
    directory.closeSync();
  }
  return members.sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}
function addRef(root, enqueue, value, packageRelative = false) {
  require(typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 1024 &&
    !value.includes('\\') &&
    !path.isAbsolute(value) &&
    !/[\x00-\x1f:]/.test(value), 'native evidence dependency reference invalid');
  const candidate = packageRelative ? 'packages/agent/' + value : value;
  enqueue(candidate, true);
}
function references(root, enqueue, value, packageRelative = false) {
  if (Array.isArray(value)) {
    for (const item of value) references(root, enqueue, item, packageRelative);
    return;
  }
  if (!value || typeof value !== 'object') return;
  const standaloneBuild = value.schema === 'VidaStandaloneBuild/v1';
  packageRelative ||= standaloneBuild;
  if (standaloneBuild) {
    require(Array.isArray(value.inputs), 'native evidence standalone inputs invalid');
    for (const input of value.inputs) {
      keys(input, ['path', 'bytes', 'sha256']);
      require(Number.isSafeInteger(input.bytes) &&
        input.bytes >= 0 &&
        typeof input.sha256 === 'string' &&
        /^[a-f0-9]{64}$/.test(input.sha256), 'native evidence standalone input invalid');
      addRef(root, enqueue, input.path, true);
    }
  }
  for (const [key, child] of Object.entries(value)) {
    if (pathFields.has(key) && typeof child === 'string') addRef(root, enqueue, child, packageRelative);
    else if (key === 'inputs' && Array.isArray(child)) {
      if (!standaloneBuild) for (const input of child) addRef(root, enqueue, input, packageRelative);
    } else if (key === 'filename' && typeof child === 'string' && /^[\w.-]+\.tgz$/.test(child))
      addRef(root, enqueue, '.tmp/releases/' + value.operation_id + '/' + child);
    else if (key === 'entries' && Array.isArray(child)) {
      for (const entry of child)
        if (entry && typeof entry.path === 'string') addRef(root, enqueue, entry.path, packageRelative);
    } else if (child && typeof child === 'object')
      references(root, enqueue, child, packageRelative || key === 'pack_metadata');
  }
}
function closure(root, operation, seal, sourcePass) {
  const queue = [],
    nodes = new Set(),
    queued = new Set();
  const enqueue = (relative, validatePath = false) => {
    const normalized = releaseRelative(relative);
    if (validatePath) releaseRelative(relative);
    if (queued.has(normalized)) return;
    queued.add(normalized);
    registerClosureNode(nodes, normalized, sourcePass);
    queue.push(normalized);
  };
  enqueue(base(operation) + '/release.json');
  enqueue('.agent/work/agent-local-release/pending.json');
  enqueue('.agent/work/agent-local-release/successful.json');
  for (const target of targets(operation)) enqueue(target);
  const release = object(root, base(operation) + '/release.json');
  for (const item of release.pack_metadata ?? [])
    if (typeof item.filename === 'string') enqueue('.tmp/releases/' + operation + '/' + item.filename);
  for (const entry of seal.entries) addRef(root, enqueue, entry.path);
  const current = releaseSourceBinding(root, true, sourcePass);
  for (const entry of current.entries) addRef(root, enqueue, entry.path);
  const files = new Map(),
    directories = new Map(),
    parsed = new Set();
  const opRelative = base(operation),
    opDir = releasePath(root, opRelative);
  const opStat = lstatSync(opDir);
  const opMembers = closureDirectoryMembers(root, opRelative, nodes, sourcePass);
  directories.set(base(operation), {
    path: base(operation),
    kind: 'directory',
    exists: true,
    identity: identity(opStat),
    members: opMembers.filter((name) => !/^worker\.sqlite(?:-wal|-shm|-journal)?$/.test(name)),
  });
  const walk = (start, sourceMode = false) => {
    const pending = [start];
    while (pending.length) {
      const relative = pending.pop();
      registerClosureNode(nodes, relative, sourcePass);
      const absolute = releasePath(root, relative),
        stat = lstatSync(absolute);
      require(!stat.isSymbolicLink(), 'native evidence dependency linked');
      if (stat.isDirectory()) {
        const members = closureDirectoryMembers(root, relative, nodes, sourcePass);
        directories.set(relative, {
          path: relative,
          kind: 'directory',
          exists: true,
          identity: identity(stat),
          members,
        });
        if (sourceMode && sourceScratch.has(relative)) continue;
        for (const name of members) {
          const child = relative + '/' + name;
          if (
            !sourceMode &&
            (child.startsWith(repair(operation) + '/') || /^worker\.sqlite(?:-wal|-shm|-journal)?$/.test(name))
          )
            continue;
          if (sourceMode) {
            const childStat = lstatSync(releasePath(root, child));
            require(!childStat.isSymbolicLink(), 'native evidence dependency linked');
            if (childStat.isDirectory() && (sourceExcluded.has(name) || sourceScratch.has(child))) continue;
          }
          pending.push(child);
        }
      } else {
        files.set(relative, fileObservation(root, relative));
        if (relative.endsWith('.json')) enqueue(relative);
      }
    }
  };
  // The operation directory is the reader-owned root for requests, results, observations, phases and logs.
  for (const name of opMembers) {
    if (name === 'native-delivery-evidence' || /^worker\.sqlite(?:-wal|-shm|-journal)?$/.test(name)) continue;
    walk(base(operation) + '/' + name);
  }
  const expandJson = (relative, observed) => {
    if (
      !relative.endsWith('.json') ||
      !observed.exists ||
      observed.identity[2] > 8 * 1024 * 1024 ||
      parsed.has(relative)
    )
      return;
    parsed.add(relative);
    const bytes = read(root, relative);
    require(sha(bytes) === observed.sha256, 'native evidence dependency changed during closure: ' + relative);
    const parsedValue = JSON.parse(bytes.toString('utf8'));
    references(
      root,
      enqueue,
      parsedValue,
      relative.startsWith('packages/agent/') && parsedValue.schema === 'VidaStandaloneBuild/v1',
    );
  };
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const relative = queue[cursor];
    if (relative.startsWith(repair(operation) + '/') || directories.has(relative)) continue;
    const inventoried = files.get(relative);
    if (inventoried) {
      expandJson(relative, inventoried);
      continue;
    }
    const file = releasePath(root, relative, true),
      stat = lstatSync(file, { throwIfNoEntry: false });
    const parent = path.posix.dirname(relative),
      parentPath = parent === '.' ? null : releasePath(root, parent, true),
      parentStat = parentPath && lstatSync(parentPath, { throwIfNoEntry: false });
    if (parentStat?.isDirectory() && !directories.has(parent)) {
      const members = closureDirectoryMembers(root, parent, nodes, sourcePass).filter(
        (name) =>
          !(parent === '.agent/work/agent-local-release' && /^admission\.sqlite(?:-wal|-shm|-journal)?$/.test(name)),
      );
      directories.set(parent, {
        path: parent,
        kind: 'directory',
        exists: true,
        identity: identity(parentStat),
        members,
      });
    }
    registerClosureNode(nodes, relative, sourcePass);
    if (!stat) {
      files.set(relative, fileObservation(root, relative));
      continue;
    }
    if (stat.isDirectory()) {
      walk(relative, true);
    } else {
      const observed = fileObservation(root, relative);
      files.set(relative, observed);
      expandJson(relative, observed);
    }
  }
  // Preserve explicit absences for the three repair targets and all reader references.
  for (const target of targets(operation)) if (!files.has(target)) files.set(target, fileObservation(root, target));
  return {
    source_binding: current.source_binding,
    source_observations: current.observations,
    files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)),
    directories: [...directories.values()].sort((a, b) => a.path.localeCompare(b.path)),
  };
}
function sameClosure(root, expected, operation, sourcePass) {
  const mutable = new Set(targets(operation)),
    nodes = new Set();
  for (const item of expected.files)
    if (!mutable.has(item.path)) {
      registerClosureNode(nodes, item.path, sourcePass);
      require(json(fileObservation(root, item.path)) === json(item), 'protected dependency changed: ' + item.path);
    }
  for (const item of expected.directories) {
    const stat = lstatSync(releasePath(root, item.path), { throwIfNoEntry: false });
    require(stat && stat.isDirectory() && !stat.isSymbolicLink(), 'protected dependency directory missing: ' +
      item.path);
    const ignored =
      item.path === base(operation)
        ? new Set([
            'native-delivery-evidence',
            'worker.sqlite',
            'worker.sqlite-wal',
            'worker.sqlite-shm',
            'worker.sqlite-journal',
            ...[...mutable]
              .filter((p) => p.startsWith(item.path + '/') && p.slice(item.path.length + 1).indexOf('/') < 0)
              .map((p) => p.slice(item.path.length + 1)),
          ])
        : item.path === '.agent/work/agent-local-release'
          ? new Set(['admission.sqlite', 'admission.sqlite-wal', 'admission.sqlite-shm', 'admission.sqlite-journal'])
          : new Set();
    const members = closureDirectoryMembers(root, item.path, nodes, sourcePass).filter((name) => !ignored.has(name));
    const expectedMembers = item.members.filter((name) => !ignored.has(name)).sort();
    require(stat.dev === item.identity[0] && stat.ino === item.identity[1], 'protected directory identity changed: ' +
      item.path);
    require(json(members) === json(expectedMembers), 'protected directory membership changed: ' + item.path);
  }
  const current = releaseSourceBinding(root, true, sourcePass);
  require(current.source_binding === expected.source_binding &&
    json(current.observations) === json(expected.source_observations), 'Source or dependency binding changed');
}
function eligible(root, operation) {
  require(releaseIdPattern.test(operation), 'operation invalid');
  releasePath(root, 'packages/agent/package.json');
  const manifest = object(root, 'packages/agent/package.json'),
    state = releaseState(releasePath(root, base(operation) + '/release.json')),
    pending = releaseState(releasePath(root, '.agent/work/agent-local-release/pending.json'));
  require(manifest.name === 'vida-agent' &&
    state.operation_id === operation &&
    pending.operation_id === operation &&
    state.version === pending.version &&
    state.version === manifest.version &&
    state.status === 'awaiting_assurance' &&
    !state.install_started, 'original operation is not eligible');
  return { state, pending };
}
function validateSeal(root, operation, state, sourcePass) {
  const value = object(root, base(operation) + '/source-seal.json');
  keys(value, ['operation_id', 'version', 'source_binding', 'entries', 'tarball_sha256', 'sealed_fingerprint']);
  require(value.operation_id === operation &&
    value.version === state.version &&
    value.source_binding === state.source_binding &&
    value.tarball_sha256 === state.tarball_sha256 &&
    Array.isArray(value.entries) &&
    value.entries.length > 0 &&
    sha(JSON.stringify(value.entries)) === value.source_binding &&
    value.sealed_fingerprint ===
      sha(
        JSON.stringify([value.source_binding, value.tarball_sha256]),
      ), 'source seal does not bind the original release');
  const current = releaseSourceBinding(root, true, sourcePass);
  require(value.source_binding !==
    current.source_binding, 'source seal is current; stale qualification repair is not applicable');
  const archive = selectedTarball(
    state.pack_metadata,
    path.dirname(releasePath(root, '.tmp/releases/' + operation + '/' + state.pack_metadata[0].filename)),
    state.version,
  );
  require(sha(readFileSync(archive)) === value.tarball_sha256, 'source seal archive binding differs');
  return value;
}
function validateTestsFile(root, operation, state, current = false, sourcePass) {
  const testsPath = base(operation) + '/tests.json';
  const testsFile = releasePath(root, testsPath, true);
  if (existsSync(testsFile)) {
    const tests = JSON.parse(read(root, testsPath).toString('utf8'));
    keys(tests, ['schema', 'operation_id', 'version', 'tests']);
    require(tests.schema === 'VidaLocalReleaseTests/v1' &&
      tests.operation_id === operation &&
      tests.version === state.version &&
      Array.isArray(tests.tests), 'current local test record invalid');
    require(tests.tests.length === 3 &&
      tests.tests
        .map((entry) => entry.lane)
        .sort()
        .join() === ['release-local', 'retained-behavior', 'static'].join(), 'current local test lanes differ');
    for (const entry of tests.tests) {
      keys(entry, ['lane', 'path', 'inputs', 'input_binding', 'sha256']);
      require(typeof entry.lane === 'string' &&
        Array.isArray(entry.inputs) &&
        entry.inputs.length > 0 &&
        /^[a-f0-9]{64}$/.test(entry.input_binding) &&
        /^[a-f0-9]{64}$/.test(entry.sha256), 'current local test entry invalid');
      require(new Set(entry.inputs).size === entry.inputs.length, 'current local test input set invalid');
      const log = read(root, entry.path);
      require(sha(log) === entry.sha256, 'current local test log differs');
      const result = JSON.parse(log.toString('utf8'));
      require(result.exit_code === 0 &&
        result.command &&
        result.started_at &&
        result.completed_at, 'successful current local test log required');
      if (current) {
        const inputs = entry.inputs
          .slice()
          .sort()
          .flatMap((relative) => releaseSourceInputs(root, relative, undefined, sourcePass));
        require(entry.input_binding ===
          sha(JSON.stringify(inputs)), 'new test evidence is not bound to current inputs');
      }
    }
  }
  return existsSync(testsFile);
}
function validateAssuranceFile(root, operation, seal) {
  const assurancePath = base(operation) + '/assurance.json';
  const assuranceFile = releasePath(root, assurancePath, true);
  if (existsSync(assuranceFile)) {
    const assurance = JSON.parse(read(root, assurancePath).toString('utf8'));
    keys(assurance, [
      'schema',
      'operation_id',
      'sealed_fingerprint',
      'scope_path',
      'clear_work_id',
      'repository_id',
      'project_id',
      'reviews',
    ]);
    require(assurance.schema === 'VidaLocalReleaseAssurance/v1' &&
      assurance.operation_id === operation &&
      assurance.sealed_fingerprint === seal.sealed_fingerprint &&
      Array.isArray(assurance.reviews), 'current assurance record invalid');
    verifyForwardReviewSet(root, operation, seal.sealed_fingerprint, assurance.reviews, '.agent/release-assurance');
  }
  return existsSync(assuranceFile);
}
function validateJoinFiles(root, operation, state, seal) {
  validateTestsFile(root, operation, state);
  validateAssuranceFile(root, operation, seal);
}
function currentSeal(root, operation, state, sourcePass) {
  const value = object(root, base(operation) + '/source-seal.json');
  keys(value, ['operation_id', 'version', 'source_binding', 'entries', 'tarball_sha256', 'sealed_fingerprint']);
  const current = releaseSourceBinding(root, true, sourcePass);
  require(value.operation_id === operation &&
    value.version === state.version &&
    value.source_binding === current.source_binding &&
    Array.isArray(value.entries) &&
    sha(JSON.stringify(value.entries)) === value.source_binding &&
    value.tarball_sha256 === state.tarball_sha256 &&
    value.sealed_fingerprint ===
      sha(JSON.stringify([value.source_binding, value.tarball_sha256])), 'current source seal binding differs');
  const archive = selectedTarball(
    state.pack_metadata,
    path.dirname(releasePath(root, '.tmp/releases/' + operation + '/' + state.pack_metadata[0].filename)),
    state.version,
  );
  require(sha(readFileSync(archive)) === value.tarball_sha256, 'current source seal archive differs');
  return value;
}
function unseal(value, schema, fields) {
  keys(value, [...fields, 'digest']);
  const { digest, ...body } = value;
  require(value.schema === schema && digest === sha(json(body)), 'native evidence repair seal differs');
  return value;
}
const planFields = [
  'schema',
  'operation_id',
  'version',
  'actor',
  'release_before',
  'source_before',
  'closure',
  'beforeimages',
];
const stateFields = ['schema', 'operation_id', 'plan_digest', 'phase'];
function planFile(op) {
  return repair(op) + '/plan.json';
}
function stateFile(op) {
  return repair(op) + '/state.json';
}
function loadPlan(root, operation) {
  const plan = unseal(object(root, planFile(operation)), 'NativeDeliveryEvidenceRepairPlan/v1', planFields);
  require(plan.operation_id === operation &&
    releaseIdPattern.test(operation) &&
    typeof plan.actor === 'string' &&
    plan.actor.trim() &&
    plan.actor.length <= 256 &&
    Array.isArray(plan.beforeimages) &&
    plan.beforeimages.length === 3 &&
    plan.beforeimages.map((item) => item.path).join() ===
      targets(operation).join(), 'native evidence repair plan identity differs');
  for (const [index, item] of plan.beforeimages.entries()) {
    keys(item, ['path', 'kind', 'exists', 'identity', 'sha256', 'copy']);
    require(item.kind === 'file' &&
      typeof item.exists === 'boolean' &&
      (item.exists
        ? Array.isArray(item.identity) &&
          /^[a-f0-9]{64}$/.test(item.sha256) &&
          item.copy === repair(operation) + '/custody/before-' + index + '.bin'
        : item.identity === null && item.sha256 === null && item.copy === null), 'native evidence beforeimage differs');
  }
  return plan;
}
function phase(root, operation, plan) {
  const file = releasePath(root, stateFile(operation), true);
  if (!existsSync(file)) return null;
  const state = unseal(object(root, stateFile(operation)), 'NativeDeliveryEvidenceRepairState/v1', stateFields);
  require(state.operation_id === operation &&
    state.plan_digest === plan.digest &&
    phaseNames.includes(state.phase), 'native evidence repair phase differs');
  return state;
}
async function access(root) {
  const packageFile = releasePath(root, 'packages/agent/package.json');
  require(realpathSync(packageFile) === packageFile, 'package containment differs');
  return safeRoot(root, { hardlinks: 'reject', symlinks: 'reject', maxBytes: 512 * 1024 * 1024, mode: 0o600 });
}
function reserve(root, operation) {
  const relative = repair(operation);
  releaseDirectory(root, base(operation));
  mkdirSync(releasePath(root, relative, true), { mode: 0o700 });
}
async function savePhase(api, operation, plan, value) {
  await api.write(
    stateFile(operation),
    json(
      sealed({
        schema: 'NativeDeliveryEvidenceRepairState/v1',
        operation_id: operation,
        plan_digest: plan.digest,
        phase: value,
      }),
    ),
  );
}
function custodyRows(root, operation, plan) {
  const file = repair(operation) + '/custody/seal.json';
  const custody = unseal(object(root, file), 'NativeDeliveryEvidenceRepairCustody/v1', [
    'schema',
    'operation_id',
    'plan_digest',
    'beforeimages',
  ]);
  require(custody.operation_id === operation &&
    custody.plan_digest === plan.digest &&
    json(custody.beforeimages) === json(plan.beforeimages), 'native evidence custody differs');
  for (const before of custody.beforeimages) {
    if (!before.exists) continue;
    const current = fileObservation(root, before.copy);
    require(current.exists && current.sha256 === before.sha256, 'native evidence beforeimage custody changed');
  }
  return custody;
}
function currentTarget(root, entry) {
  return fileObservation(root, entry.path);
}
function validateContinuity(root, operation, plan, state, allowTargetOutputs = false, sourcePass) {
  const { state: original, pending } = eligible(root, operation);
  const { pending: frozenPending, ...releaseBefore } = plan.release_before;
  require(json({
    operation_id: original.operation_id,
    version: original.version,
    status: original.status,
    source_binding: original.source_binding,
    tarball_sha256: original.tarball_sha256,
  }) === json(releaseBefore), 'release identity changed');
  require(json({ operation_id: pending.operation_id, version: pending.version }) ===
    json(frozenPending), 'pending identity changed');
  sameClosure(root, plan.closure, operation, sourcePass);
  custodyRows(root, operation, plan);
  if (state.phase === 'complete') {
    if (!allowTargetOutputs)
      for (const entry of plan.beforeimages)
        require(!currentTarget(root, entry).exists, 'completed repair target reappeared');
    return;
  }
  for (const entry of plan.beforeimages) {
    const current = currentTarget(root, entry),
      at = plan.beforeimages.indexOf(entry);
    const order = [
      'tests_pending',
      'tests_removed',
      'source_seal_pending',
      'source_seal_removed',
      'assurance_pending',
      'assurance_removed',
      'complete',
    ].indexOf(state.phase);
    const pendingIndex = [0, 2, 4].includes(order) ? [0, 2, 4].indexOf(order) : -1;
    if (entry.exists && order >= 0 && at < Math.floor((order + 1) / 2)) {
      require(!current.exists, 'removed evidence unexpectedly returned');
    } else if (entry.exists && pendingIndex === at) {
      require(!current.exists ||
        current.sha256 === entry.sha256, 'in-progress evidence is neither beforeimage nor absent postimage');
    } else
      require(json(current) ===
        json({
          path: entry.path,
          kind: entry.kind,
          exists: entry.exists,
          identity: entry.identity,
          sha256: entry.sha256,
        }), 'unstarted evidence beforeimage changed');
  }
}
function validateCompletedReset(root, operation, plan, state, sourcePass) {
  const { state: original, pending } = eligible(root, operation);
  const { pending: frozenPending, ...releaseBefore } = plan.release_before;
  require(state.phase === 'complete' &&
    json({
      operation_id: original.operation_id,
      version: original.version,
      status: original.status,
      source_binding: original.source_binding,
      tarball_sha256: original.tarball_sha256,
    }) === json(releaseBefore) &&
    json({ operation_id: pending.operation_id, version: pending.version }) ===
      json(frozenPending), 'completed repair release identity changed');
  custodyRows(root, operation, plan);
  const tests = validateTestsFile(root, operation, original, true, sourcePass);
  const sealPath = releasePath(root, base(operation) + '/source-seal.json', true);
  const assurancePath = releasePath(root, base(operation) + '/assurance.json', true);
  let seal;
  if (existsSync(sealPath)) seal = currentSeal(root, operation, original, sourcePass);
  if (existsSync(assurancePath)) {
    require(seal && tests, 'new assurance requires current test evidence and source seal');
    validateAssuranceFile(root, operation, seal);
  }
}
function eligibleForPlan(root, operation, sourcePass) {
  const { state, pending } = eligible(root, operation),
    seal = validateSeal(root, operation, state, sourcePass);
  validateJoinFiles(root, operation, state, seal);
  return { state, pending, seal };
}
export async function inspectNativeDeliveryEvidenceRepair({ root, operation }) {
  try {
    const sourcePass = createRepairSourcePass();
    if (existsSync(releasePath(root, planFile(operation), true))) {
      const plan = loadPlan(root, operation),
        state = phase(root, operation, plan);
      require(state, 'repair phase missing; UNKNOWN');
      if (state.phase === 'complete') validateCompletedReset(root, operation, plan, state, sourcePass);
      else validateContinuity(root, operation, plan, state, true, sourcePass);
      return {
        status: state.phase === 'complete' ? 'awaiting_new_qualification' : state.phase,
        operation_id: operation,
        version: plan.version,
        gaps: [
          'fresh current local tests, source seal, CI/CD results and three reviews with reverse validation and current CLEAR remain required',
        ],
        qualified: false,
      };
    }
    const { state, seal } = eligibleForPlan(root, operation, sourcePass);
    closure(root, operation, seal, sourcePass);
    return {
      status: 'stale_qualification_repairable',
      operation_id: operation,
      version: state.version,
      qualified: false,
    };
  } catch (error) {
    return { status: 'blocked', operation_id: operation, blockers: [error.message], qualified: false };
  }
}
async function finishPlan(root, operation, plan, options = {}) {
  const api = await access(root),
    custodyDir = repair(operation) + '/custody',
    entries = plan.beforeimages;
  const { withReleaseRepairLocks } = await import('./local-release-artifacts.mjs');
  return withReleaseRepairLocks(root, operation, async () => {
    const state = phase(root, operation, plan);
    require(state?.phase === 'planning', 'planning phase differs');
    require(!existsSync(releasePath(root, custodyDir, true)), 'partial custody is UNKNOWN; no reconstruction');
    const sourcePass = createRepairSourcePass();
    eligibleForPlan(root, operation, sourcePass);
    sameClosure(root, plan.closure, operation, sourcePass);
    await options.onPhase?.('planning');
    mkdirSync(releasePath(root, custodyDir, true), { mode: 0o700 });
    for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      if (entry.exists)
        await api.create(custodyDir + '/before-' + index + '.bin', read(root, entry.path, 512 * 1024 * 1024));
    }
    await api.create(
      custodyDir + '/seal.json',
      json(
        sealed({
          schema: 'NativeDeliveryEvidenceRepairCustody/v1',
          operation_id: operation,
          plan_digest: plan.digest,
          beforeimages: entries,
        }),
      ),
    );
    custodyRows(root, operation, plan);
    await savePhase(api, operation, plan, 'custody');
    await options.onPhase?.('custody');
    return { status: 'planned', operation_id: operation, version: plan.version, qualified: false };
  });
}
export async function planNativeDeliveryEvidenceRepair({ root, operation, actor }, options = {}) {
  require(typeof actor === 'string' && actor.trim() && actor.length <= 256, 'repair actor missing');
  const existing = releasePath(root, planFile(operation), true);
  if (existsSync(existing)) {
    const plan = loadPlan(root, operation);
    require(plan.actor === actor, 'repair attribution differs');
    const state = phase(root, operation, plan);
    require(state && ['planning', 'custody'].includes(state.phase), 'partial repair namespace is UNKNOWN');
    return state.phase === 'custody'
      ? { status: 'planned', operation_id: operation, version: plan.version, qualified: false }
      : finishPlan(root, operation, plan, options);
  }
  const sourcePass = createRepairSourcePass(),
    { state, pending } = eligibleForPlan(root, operation, sourcePass),
    beforeimages = targets(operation).map((file, index) => {
      const observed = fileObservation(root, file);
      return { ...observed, copy: observed.exists ? repair(operation) + '/custody/before-' + index + '.bin' : null };
    }),
    frozen = closure(root, operation, object(root, base(operation) + '/source-seal.json'), sourcePass);
  const plan = sealed({
    schema: 'NativeDeliveryEvidenceRepairPlan/v1',
    operation_id: operation,
    version: state.version,
    actor,
    release_before: {
      operation_id: state.operation_id,
      version: state.version,
      status: state.status,
      source_binding: state.source_binding,
      tarball_sha256: state.tarball_sha256,
      pending: { operation_id: pending.operation_id, version: pending.version },
    },
    source_before: frozen.source_binding,
    closure: frozen,
    beforeimages,
  });
  const api = await access(root);
  const admission = admissionMutex(root);
  let worker;
  try {
    worker = operationMutex(root, operation);
    require(worker, 'operation busy');
    const sourcePass = createRepairSourcePass();
    eligibleForPlan(root, operation, sourcePass);
    sameClosure(root, frozen, operation, sourcePass);
    require(!existsSync(releasePath(root, repair(operation), true)), 'partial or foreign repair namespace is UNKNOWN');
    reserve(root, operation);
    await api.create(planFile(operation), json(plan));
    await savePhase(api, operation, plan, 'planning');
  } finally {
    try {
      worker?.close();
    } finally {
      admission.close();
    }
  }
  return finishPlan(root, operation, plan, options);
}
async function apply(root, operation, options = {}) {
  const plan = loadPlan(root, operation),
    initial = phase(root, operation, plan);
  require(initial, 'repair phase missing; UNKNOWN');
  custodyRows(root, operation, plan);
  const api = await access(root);
  const { withReleaseRepairLocks } = await import('./local-release-artifacts.mjs');
  return withReleaseRepairLocks(root, operation, async () => {
    const current = phase(root, operation, plan);
    require(current, 'repair phase missing; UNKNOWN');
    if (current.phase === 'complete') {
      validateCompletedReset(root, operation, plan, current, createRepairSourcePass());
      return {
        status: 'awaiting_new_qualification',
        operation_id: operation,
        version: plan.version,
        gaps: [
          'fresh current local tests, source seal, CI/CD results and three reviews with reverse validation and current CLEAR remain required',
        ],
        qualified: false,
      };
    }
    validateContinuity(root, operation, plan, current, false, createRepairSourcePass());
    const sequence = [
      { pending: 'tests_pending', done: 'tests_removed', index: 0, label: 'tests' },
      { pending: 'source_seal_pending', done: 'source_seal_removed', index: 1, label: 'source_seal' },
      { pending: 'assurance_pending', done: 'assurance_removed', index: 2, label: 'assurance' },
    ];
    let phaseValue = current.phase;
    for (const item of sequence) {
      if (phaseNames.indexOf(phaseValue) > phaseNames.indexOf(item.done)) continue;
      const before = plan.beforeimages[item.index],
        observed = currentTarget(root, before);
      require(!before.exists ||
        !observed.exists ||
        observed.sha256 === before.sha256, 'evidence is neither exact beforeimage nor absent postimage');
      if (phaseValue !== item.pending && phaseValue !== item.done) {
        require(phaseValue === 'custody' ||
          phaseValue === 'tests_removed' ||
          phaseValue === 'source_seal_removed', 'repair phase ordering differs');
        await savePhase(api, operation, plan, item.pending);
        phaseValue = item.pending;
      }
      await options.onPhase?.(item.pending);
      if (before.exists && observed.exists) await api.remove(before.path);
      await options.onPhase?.(item.label + '_effect');
      require(!currentTarget(root, before).exists, 'evidence removal postcondition differs');
      await savePhase(api, operation, plan, item.done);
      phaseValue = item.done;
      await options.onPhase?.(item.done);
    }
    sameClosure(root, plan.closure, operation, createRepairSourcePass());
    for (const item of plan.beforeimages)
      require(!currentTarget(root, item).exists, 'derived qualification join remains');
    await savePhase(api, operation, plan, 'complete');
    await options.onPhase?.('complete');
    return {
      status: 'awaiting_new_qualification',
      operation_id: operation,
      version: plan.version,
      gaps: [
        'fresh current local tests, source seal, CI/CD results and three reviews with reverse validation and current CLEAR remain required',
      ],
      qualified: false,
    };
  });
}
export async function applyNativeDeliveryEvidenceRepair({ root, operation }, options = {}) {
  return apply(root, operation, options);
}
export function assertNativeDeliveryEvidenceRepairSettled(root, operation) {
  const dir = releasePath(root, repair(operation), true);
  if (!existsSync(dir)) return;
  const planPath = releasePath(root, planFile(operation), true);
  require(existsSync(planPath), 'native evidence repair namespace is incomplete; UNKNOWN');
  const plan = loadPlan(root, operation),
    state = phase(root, operation, plan);
  require(state?.phase === 'complete', 'native evidence repair active or UNKNOWN');
  validateCompletedReset(root, operation, plan, state, createRepairSourcePass());
}
export async function runNativeDeliveryEvidenceRepair(args, options) {
  const values = {};
  for (let index = 0; index < args.length; index += 2) {
    require(['--kind', '--mode', '--project-root', '--operation', '--actor'].includes(args[index]) &&
      args[index + 1] &&
      !Object.hasOwn(values, args[index]), 'native evidence repair arguments invalid');
    values[args[index]] = args[index + 1];
  }
  require(values['--kind'] === 'native-delivery-evidence' &&
    path.isAbsolute(values['--project-root'] ?? '') &&
    releaseIdPattern.test(values['--operation'] ?? '') &&
    ['inspect', 'plan', 'apply', 'resume'].includes(
      values['--mode'],
    ), 'native evidence repair operation arguments invalid');
  const input = { root: values['--project-root'], operation: values['--operation'], actor: values['--actor'] };
  if (values['--mode'] === 'inspect') {
    require(!input.actor, 'inspect accepts no actor');
    return inspectNativeDeliveryEvidenceRepair(input);
  }
  if (values['--mode'] === 'plan') return planNativeDeliveryEvidenceRepair(input, options);
  require(!input.actor, 'apply/resume use frozen attribution');
  return applyNativeDeliveryEvidenceRepair(input, options);
}
