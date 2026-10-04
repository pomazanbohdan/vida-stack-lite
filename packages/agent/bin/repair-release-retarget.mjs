import { mkdirSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { root as safeRoot } from '@openclaw/fs-safe/root';
import { extractArchive } from '@openclaw/fs-safe/archive';
import {
  releaseDigest as sha,
  releaseJSON as json,
  requireRelease as require,
  releaseRelative,
  releasePath,
  releaseDirectory,
  releaseIdPattern,
  releaseState,
  releaseSourceBinding,
  selectedTarball,
  packedDistribution,
  assertReleaseRetargetSettled,
  withReleaseRepairLocks,
  retargetStateRelative,
} from './local-release-artifacts.mjs';

const binaryLimit = 512 * 1024 * 1024;
const textLimit = 8 * 1024 * 1024;
const base = (operation) => '.agent/work/agent-local-release/' + operation;
const repair = (operation) => base(operation) + '/retarget';
const archivePath = (operation, name) => '.tmp/releases/' + operation + '/' + name;
const sealed = (body) => ({ ...body, digest: sha(json(body)) });
function keys(value, expected) {
  require(value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join() === expected.slice().sort().join(), 'repair contract fields differ');
}
function read(root, relative, limit = textLimit) {
  const file = releasePath(root, relative),
    stat = lstatSync(file);
  require(stat.isFile() && stat.size <= limit, 'repair file unsafe or oversized');
  return readFileSync(file);
}
const object = (root, relative) => JSON.parse(read(root, relative));
function unseal(value, schema, expected) {
  keys(value, [...expected, 'digest']);
  const { digest, ...body } = value;
  require(value.schema === schema && digest === sha(json(body)), 'repair seal differs');
  return value;
}
function identity(root, relative, directory = false) {
  const file = releasePath(root, relative, true),
    stat = lstatSync(file, { throwIfNoEntry: false });
  if (!stat) return null;
  require(directory ? stat.isDirectory() : stat.isFile(), 'repair input must be regular');
  return [stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs];
}
function observation(root, relative, limit = textLimit) {
  const before = identity(root, relative);
  if (!before) return { path: relative, sha256: null, identity: null };
  const bytes = read(root, relative, limit);
  require(json(before) === json(identity(root, relative)), 'repair input changed during read');
  return { path: relative, sha256: sha(bytes), identity: before };
}
function sameObservations(root, observations) {
  for (const entry of observations)
    require(json(identity(root, entry.path, entry.kind === 'directory')) ===
      json(entry.identity), 'repair input changed: ' + entry.path);
}
function sourceObservations(root, expected) {
  const source = releaseSourceBinding(root, true);
  require(source.source_binding === expected, 'frozen Source differs');
  return source.observations;
}
async function access(root) {
  releasePath(root, 'packages/agent/package.json');
  return safeRoot(root, { hardlinks: 'reject', symlinks: 'reject', maxBytes: binaryLimit, mode: 0o600 });
}
function reserve(root, relative) {
  releaseDirectory(root, path.posix.dirname(relative));
  // Root.copyIn overwrites. Only this exclusive reservation grants ownership of its destinations.
  mkdirSync(releasePath(root, relative, true), { mode: 0o700 });
}
function inventory(root, relative) {
  const result = [];
  const walk = (current) => {
    for (const name of readdirSync(releasePath(root, current)).sort()) {
      const child = current + '/' + name,
        stat = lstatSync(releasePath(root, child));
      if (stat.isDirectory()) walk(child);
      else result.push(observation(root, child, binaryLimit));
    }
  };
  walk(relative);
  return result;
}
function eligible(root, operation) {
  require(releaseIdPattern.test(operation), 'operation invalid');
  const state = releaseState(releasePath(root, base(operation) + '/release.json'));
  const pending = releaseState(releasePath(root, '.agent/work/agent-local-release/pending.json'));
  const manifest = object(root, 'packages/agent/package.json');
  require(state.operation_id === operation &&
    pending.operation_id === operation &&
    state.version === pending.version &&
    state.version === manifest.version &&
    state.status === 'awaiting_assurance' &&
    !state.install_started, 'original operation is not eligible');
  return state;
}

const candidateFields = ['schema', 'operation_id', 'version', 'source_binding', 'archive', 'pack_metadata'];
const candidateSealFields = [
  'schema',
  'operation_id',
  'version',
  'source_binding',
  'pack_metadata',
  'archive_sha256',
  'entries',
];
function candidateSeal(root, operation) {
  const seal = unseal(
    object(root, repair(operation) + '/candidate/seal.json'),
    'VidaNativeRetargetStage/v1',
    candidateSealFields,
  );
  require(seal.operation_id === operation, 'candidate operation differs');
  const folder = repair(operation) + '/candidate';
  const actual = inventory(root, folder).filter((entry) => entry.path !== folder + '/seal.json');
  require(json(actual.map(({ path: file, sha256 }) => ({ path: file, sha256 }))) ===
    json(seal.entries), 'candidate stage changed');
  return { seal, observations: actual.concat(observation(root, folder + '/seal.json')) };
}

/** Read only: exact sealed archive-owned bytes; no generated Source output or qualification. */
export function readNativeRetargetCandidate({ root, operation, published = false }) {
  require(releaseIdPattern.test(operation), 'operation invalid');
  if (published) assertReleaseRetargetSettled(root, operation);
  const { seal, observations } = candidateSeal(root, operation);
  const source = releaseSourceBinding(root, true);
  require(seal.version === object(root, 'packages/agent/package.json').version &&
    seal.source_binding === source.source_binding, 'candidate Source differs');
  const folder = repair(operation) + '/candidate';
  const manifestPath = folder + '/payload/dist/standalone/manifest.json';
  const manifestBytes = read(root, manifestPath);
  const manifest = JSON.parse(manifestBytes);
  keys(manifest, ['schema', 'version', 'pin', 'target', 'inputs', 'payloadId', 'asset']);
  keys(manifest.asset, ['file', 'bytes', 'sha256']);
  require(manifest.schema === 'VidaStandaloneBuild/v1' &&
    manifest.version === seal.version &&
    manifest.pin === '1.4.2' &&
    /^bun-(windows|linux|darwin)-(x64|arm64)(-baseline)?$/.test(manifest.target), 'candidate native manifest differs');
  require(/^[a-f0-9]{64}$/.test(manifest.payloadId) &&
    Array.isArray(manifest.inputs) &&
    manifest.inputs.length > 0 &&
    new Set(manifest.inputs.map((entry) => entry.path)).size ===
      manifest.inputs.length, 'candidate build input inventory differs');
  for (const entry of manifest.inputs) {
    keys(entry, ['path', 'bytes', 'sha256']);
    const observed = observations.find((item) => item.path === folder + '/payload/' + releaseRelative(entry.path));
    require(observed &&
      observed.sha256 === entry.sha256 &&
      observed.identity[2] === entry.bytes, 'candidate build input bytes differ');
  }
  const relative = 'dist/standalone/' + releaseRelative(manifest.asset?.file);
  const assetPath = folder + '/payload/' + relative;
  const assetObserved = observations.find((entry) => entry.path === assetPath);
  const archiveObserved = observations.find((entry) => entry.path === folder + '/archive.tgz');
  require(assetObserved?.identity[2] === manifest.asset.bytes &&
    assetObserved?.sha256 === manifest.asset.sha256 &&
    archiveObserved?.sha256 === seal.archive_sha256, 'candidate native bytes differ');
  if (published) {
    const state = releaseState(releasePath(root, base(operation) + '/release.json'));
    const canonicalArchive = observation(root, archivePath(operation, seal.pack_metadata[0].filename), binaryLimit);
    require(state.operation_id === operation &&
      state.version === seal.version &&
      state.source_binding === seal.source_binding &&
      state.tarball_sha256 === seal.archive_sha256 &&
      json(state.pack_metadata) === json(seal.pack_metadata) &&
      canonicalArchive.sha256 === seal.archive_sha256, 'published candidate differs');
    observations.push(
      ...[
        base(operation) + '/release.json',
        '.agent/work/agent-local-release/pending.json',
        retargetStateRelative(operation),
        repair(operation) + '/plan.json',
      ].map((file) => observation(root, file, binaryLimit)),
      canonicalArchive,
    );
  }
  observations.push(...source.observations);
  return {
    operation_id: operation,
    version: seal.version,
    source_binding: seal.source_binding,
    pack_metadata: seal.pack_metadata,
    archive_sha256: seal.archive_sha256,
    manifest,
    manifest_sha256: sha(manifestBytes),
    asset: { ...manifest.asset, path: releasePath(root, assetPath), relative, target: manifest.target },
    observations,
  };
}

/** Recheck the same read observation after an asynchronous controller boundary without a second byte scan. */
export function recheckNativeRetargetCandidate(root, candidate) {
  sameObservations(root, candidate.observations);
}

/** Consume an already formed archive. This does not build, execute, install or qualify it. */
export async function stageNativeRetargetCandidate({ root, operation, candidateFile }) {
  require(typeof candidateFile === 'string' &&
    !path.isAbsolute(candidateFile), 'candidate input must be repository relative');
  const candidate = object(root, releaseRelative(candidateFile));
  keys(candidate, candidateFields);
  require(candidate.schema === 'VidaNativeRetargetCandidate/v1' &&
    candidate.operation_id === operation, 'candidate identity differs');
  const original = eligible(root, operation);
  require(packedDistribution(original.pack_metadata) === 'npm' &&
    candidate.version === original.version &&
    packedDistribution(candidate.pack_metadata) === 'native', 'candidate channel or version differs');
  require(candidate.source_binding === releaseSourceBinding(root).source_binding, 'candidate Source differs');
  releaseRelative(candidate.archive);
  const selected = selectedTarball(
    candidate.pack_metadata,
    path.dirname(releasePath(root, candidate.archive)),
    candidate.version,
  );
  require(selected === releasePath(root, candidate.archive) &&
    candidate.pack_metadata[0].filename === original.pack_metadata[0].filename &&
    candidate.archive !==
      archivePath(operation, original.pack_metadata[0].filename), 'candidate archive location differs');
  const folder = repair(operation) + '/candidate',
    api = await access(root);
  if (identity(root, folder + '/seal.json')) {
    const { seal } = candidateSeal(root, operation);
    require(seal.source_binding === candidate.source_binding &&
      json(seal.pack_metadata) === json(candidate.pack_metadata) &&
      seal.archive_sha256 === sha(read(root, candidate.archive, binaryLimit)), 'existing candidate stage differs');
    return { status: 'staged', operation_id: operation, version: seal.version };
  }
  reserve(root, folder); // Existing incomplete staging is UNKNOWN and is never reconstructed.
  const input = observation(root, candidate.archive, binaryLimit);
  await api.copyIn(folder + '/archive.tgz', selected);
  releaseDirectory(root, folder + '/payload');
  const files = candidate.pack_metadata[0].files;
  require(files.length <= 16384 &&
    new Set(files.map((file) => file.path.toLowerCase())).size ===
      files.length, 'candidate inventory ambiguous or oversized');
  for (const file of files) require(Number.isSafeInteger(file.size) && file.size >= 0, 'candidate file size invalid');
  await extractArchive({
    archivePath: releasePath(root, folder + '/archive.tgz'),
    destDir: releasePath(root, folder + '/payload'),
    kind: 'tar',
    tarGzip: true,
    stripComponents: 1,
    timeoutMs: 0,
    entryModes: 'clamp',
    onFiltered: 'reject-archive',
    limits: {
      maxArchiveBytes: binaryLimit,
      maxEntries: 32768,
      maxExtractedBytes: 1024 * 1024 * 1024,
      maxEntryBytes: binaryLimit,
      maxMetaEntryBytes: textLimit,
      maxEntryPathComponents: 64,
    },
    entryFilter: (entry) => {
      const name = entry.path.replace(/\/$/, '');
      if (
        entry.kind === 'directory' &&
        (name === 'package' || files.some((file) => ('package/' + file.path).startsWith(name + '/')))
      )
        return 'extract';
      return entry.kind === 'file' && files.some((file) => 'package/' + file.path === name && file.size === entry.size)
        ? 'extract'
        : 'skip';
    },
  });
  const payload = inventory(root, folder + '/payload');
  require(payload.length === files.length, 'candidate payload inventory differs');
  for (const entry of payload) {
    const relative = entry.path.slice((folder + '/payload/').length);
    require(files.some(
      (file) => file.path === relative && file.size === entry.identity[2],
    ), 'candidate payload differs');
    if (!relative.startsWith('dist/'))
      require(sha(read(root, 'packages/agent/' + relative, binaryLimit)) ===
        entry.sha256, 'candidate packaged Source differs');
  }
  const native = object(root, folder + '/payload/dist/standalone/manifest.json');
  require(native.schema === 'VidaStandaloneBuild/v1' &&
    native.version === candidate.version &&
    native.pin === '1.4.2' &&
    typeof native.target === 'string' &&
    /^bun-(?:windows|linux|darwin)-(?:x64|arm64)(?:-baseline)?$/.test(native.target), 'native manifest differs');
  const asset = payload.find(
    (entry) => entry.path === folder + '/payload/dist/standalone/' + releaseRelative(native.asset?.file),
  );
  require(asset &&
    asset.sha256 === native.asset.sha256 &&
    asset.identity[2] === native.asset.bytes, 'native asset differs');
  sameObservations(root, [input]);
  require(candidate.source_binding === releaseSourceBinding(root).source_binding, 'Source changed during staging');
  const entries = inventory(root, folder).map(({ path: file, sha256 }) => ({ path: file, sha256 }));
  await api.create(
    folder + '/seal.json',
    json(
      sealed({
        schema: 'VidaNativeRetargetStage/v1',
        operation_id: operation,
        version: candidate.version,
        source_binding: candidate.source_binding,
        pack_metadata: candidate.pack_metadata,
        archive_sha256: sha(read(root, folder + '/archive.tgz', binaryLimit)),
        entries,
      }),
    ),
  );
  return { status: 'staged', operation_id: operation, version: candidate.version };
}

// Preserve receipt files and their referenced logs. Source-seal entries are Source inputs, not receipts.
function retainedFiles(root, operation, original) {
  const files = new Set([
    base(operation) + '/release.json',
    '.agent/work/agent-local-release/pending.json',
    archivePath(operation, original.pack_metadata[0].filename),
  ]);
  const success = '.agent/work/agent-local-release/successful.json';
  if (identity(root, success)) files.add(success);
  for (const name of readdirSync(releasePath(root, base(operation)))) {
    if (name === 'retarget' || /^worker\.sqlite(?:-wal|-shm|-journal)?$/.test(name)) continue;
    const relative = base(operation) + '/' + name;
    if (lstatSync(releasePath(root, relative)).isDirectory())
      inventory(root, relative).forEach((entry) => files.add(entry.path));
    else files.add(relative);
  }
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (['path', 'reverse_path', 'scope_path', 'clear_path'].includes(key) && typeof child === 'string') {
        releaseRelative(child);
        require(!child.startsWith(repair(operation) + '/'), 'receipt cannot reference repair staging');
        files.add(child);
      } else if (key === 'inputs' && Array.isArray(child)) {
        for (const input of child)
          if (typeof input === 'string' && input.startsWith('.tmp/')) {
            releaseRelative(input);
            const info = lstatSync(releasePath(root, input));
            if (info.isFile()) files.add(input);
            else inventory(root, input).forEach((entry) => files.add(entry.path));
          }
      } else if (key !== 'entries' && key !== 'files') visit(child);
    }
  };
  for (const relative of files) {
    require(files.size <= 4096, 'receipt closure oversized');
    if (relative.endsWith('.json') && !relative.endsWith('/source-seal.json') && !relative.endsWith('/release.json'))
      visit(object(root, relative));
  }
  return [...files].sort();
}
const planFields = [
  'schema',
  'operation_id',
  'version',
  'actor',
  'source_binding',
  'candidate_digest',
  'before',
  'custody',
  'release_after',
  'archive_before',
  'archive_after',
];
const stateFields = ['schema', 'operation_id', 'plan_digest', 'phase', 'release_after_sha256'];
function loadPlan(root, operation) {
  const plan = unseal(object(root, repair(operation) + '/plan.json'), 'VidaReleaseRetargetPlan/v1', planFields);
  require(plan.operation_id === operation &&
    releaseIdPattern.test(operation) &&
    typeof plan.actor === 'string' &&
    plan.actor.trim() &&
    plan.actor.length <= 256 &&
    Array.isArray(plan.before) &&
    plan.before.length === 3 &&
    json(plan.before.map((entry) => entry.path)) ===
      json([
        '.agent/work/agent-local-release/pending.json',
        '.agent/work/agent-local-release/successful.json',
        base(operation) + '/release.json',
      ]) &&
    Array.isArray(plan.custody) &&
    plan.custody.length > 0 &&
    plan.custody.length <= 4096, 'repair plan identity or closure differs');
  for (const [index, entry] of plan.custody.entries()) {
    keys(entry, ['path', 'sha256', 'copy']);
    releaseRelative(entry.path);
    require(entry.copy === repair(operation) + '/custody/files/' + index &&
      /^[a-f0-9]{64}$/.test(entry.sha256), 'custody entry differs');
  }
  require(new Set(plan.custody.map((entry) => entry.path.toLowerCase())).size ===
    plan.custody.length, 'custody aliases');
  return plan;
}
async function savePhase(api, operation, plan, phase) {
  await api.write(
    retargetStateRelative(operation),
    json(
      sealed({
        schema: 'VidaReleaseRetargetState/v1',
        operation_id: operation,
        plan_digest: plan.digest,
        phase,
        release_after_sha256: sha(json(plan.release_after)),
      }),
    ),
  );
}
function pointers(root, operation) {
  return [
    '.agent/work/agent-local-release/pending.json',
    '.agent/work/agent-local-release/successful.json',
    base(operation) + '/release.json',
  ].map((file) => observation(root, file));
}
export async function inspectReleaseRetarget({ root, operation }) {
  const original = eligible(root, operation);
  const file = repair(operation) + '/plan.json';
  if (identity(root, file)) {
    const plan = loadPlan(root, operation);
    const state = planningState(root, operation, plan);
    return {
      status: state?.phase ?? 'unknown_missing_phase',
      operation_id: operation,
      version: plan.version,
      qualified: false,
    };
  }
  return { status: 'requires_staged_candidate', operation_id: operation, version: original.version, qualified: false };
}

function planningState(root, operation, plan) {
  if (!identity(root, retargetStateRelative(operation))) return null;
  const state = unseal(object(root, retargetStateRelative(operation)), 'VidaReleaseRetargetState/v1', stateFields);
  require(state.operation_id === operation &&
    state.plan_digest === plan.digest &&
    state.release_after_sha256 === sha(json(plan.release_after)), 'planning reservation differs');
  return state;
}
function custodyAbsent(root, operation) {
  return !lstatSync(releasePath(root, repair(operation) + '/custody', true), { throwIfNoEntry: false });
}
async function finishPlanning(root, operation, plan, { onPhase } = {}, frozenInputs, frozenCandidate) {
  const { seal, observations: staged } = frozenCandidate ?? candidateSeal(root, operation),
    original = eligible(root, operation);
  require(seal.digest === plan.candidate_digest &&
    seal.version === plan.version &&
    original.tarball_sha256 === plan.archive_before &&
    json({
      ...original,
      pack_metadata: seal.pack_metadata,
      source_binding: seal.source_binding,
      tarball_sha256: seal.archive_sha256,
    }) === json(plan.release_after), 'planning continuity differs');
  const stable =
    frozenInputs ??
    plan.custody
      .map((entry) => {
        const observed = observation(root, entry.path, binaryLimit);
        require(observed.sha256 === entry.sha256, 'planning preimage changed');
        return observed;
      })
      .concat(staged, sourceObservations(root, plan.source_binding));
  require(json(retainedFiles(root, operation, original)) ===
    json(plan.custody.map((entry) => entry.path)), 'planning receipt closure changed');
  const before = pointers(root, operation);
  require(json(before.map((entry) => entry.sha256)) ===
    json(plan.before.map((entry) => entry.sha256)), 'planning pointers changed');
  stable.push(observation(root, repair(operation) + '/plan.json'));
  const api = await access(root),
    custody = repair(operation) + '/custody';
  await withReleaseRepairLocks(root, operation, async () => {
    sameObservations(root, stable.concat(before));
    eligible(root, operation);
    require(loadPlan(root, operation).digest === plan.digest, 'planning plan changed');
    const state = planningState(root, operation, plan);
    require(!state || state.phase === 'planning', 'planning phase differs');
    if (!state) {
      await savePhase(api, operation, plan, 'planning');
      await onPhase?.('planning_recovered');
    }
    require(custodyAbsent(root, operation), 'partial custody UNKNOWN; no reconstruction');
    reserve(root, custody);
  });
  await onPhase?.('custody_reserved');
  for (const entry of plan.custody) await api.copyIn(entry.copy, releasePath(root, entry.path), { mkdir: true });
  for (const entry of plan.custody)
    require(sha(read(root, entry.copy, binaryLimit)) === entry.sha256, 'custody copy differs');
  await api.create(
    custody + '/seal.json',
    json(sealed({ schema: 'VidaReleaseRetargetCustody/v1', operation_id: operation, entries: plan.custody })),
  );
  await api.copyIn(custody + '/publication.tgz', releasePath(root, repair(operation) + '/candidate/archive.tgz'));
  stable.push(observation(root, custody + '/publication.tgz', binaryLimit));
  await onPhase?.('custody_ready');
  await withReleaseRepairLocks(root, operation, async () => {
    sameObservations(root, stable.concat(before));
    eligible(root, operation);
    require(planningState(root, operation, plan)?.phase === 'planning', 'planning reservation changed');
    await savePhase(api, operation, plan, 'custody');
  });
  return { status: 'planned', operation_id: operation, version: plan.version };
}

export async function planReleaseRetarget({ root, operation, actor }, { onPhase } = {}) {
  require(typeof actor === 'string' && actor.trim() && actor.length <= 256, 'repair actor missing');
  const existing = repair(operation) + '/plan.json';
  if (identity(root, existing)) {
    const plan = loadPlan(root, operation);
    require(plan.actor === actor, 'repair attribution differs');
    const state = planningState(root, operation, plan);
    if (!state || state.phase === 'planning') return finishPlanning(root, operation, plan, { onPhase });
    return inspectReleaseRetarget({ root, operation });
  }
  const original = eligible(root, operation),
    { seal, observations: staged } = candidateSeal(root, operation);
  require(packedDistribution(original.pack_metadata) === 'npm' &&
    seal.version === original.version, 'original or candidate binding differs');
  const sources = sourceObservations(root, seal.source_binding);
  const archive = archivePath(operation, original.pack_metadata[0].filename);
  selectedTarball(original.pack_metadata, path.dirname(releasePath(root, archive)), original.version);
  require(sha(read(root, archive, binaryLimit)) === original.tarball_sha256, 'original archive differs');
  const before = pointers(root, operation),
    retained = retainedFiles(root, operation, original).map((file) =>
      observation(root, file, file === archive ? binaryLimit : textLimit),
    );
  const api = await access(root),
    custody = repair(operation) + '/custody';
  const preserved = retained.map((entry, i) => ({
    path: entry.path,
    sha256: entry.sha256,
    copy: custody + '/files/' + i,
  }));
  const release_after = {
    ...original,
    pack_metadata: seal.pack_metadata,
    source_binding: seal.source_binding,
    tarball_sha256: seal.archive_sha256,
  };
  const plan = sealed({
    schema: 'VidaReleaseRetargetPlan/v1',
    operation_id: operation,
    version: original.version,
    actor,
    source_binding: seal.source_binding,
    candidate_digest: seal.digest,
    before,
    custody: preserved,
    release_after,
    archive_before: original.tarball_sha256,
    archive_after: seal.archive_sha256,
  });
  const stable = retained.concat(staged, sources);
  await withReleaseRepairLocks(root, operation, async () => {
    sameObservations(root, stable.concat(before));
    eligible(root, operation);
    await api.create(existing, json(plan));
    await savePhase(api, operation, plan, 'planning');
  });
  await onPhase?.('planning');
  return finishPlanning(root, operation, plan, { onPhase }, stable, { seal, observations: staged });
}

/** Known-phase reconciliation only. The optional observer is a fault-test seam, never a CLI input. */
export async function applyReleaseRetarget({ root, operation }, { onPhase } = {}) {
  const plan = loadPlan(root, operation);
  const phase = planningState(root, operation, plan);
  if ((!phase || phase.phase === 'planning') && custodyAbsent(root, operation))
    await finishPlanning(root, operation, plan, { onPhase });
  const { seal, observations: staged } = candidateSeal(root, operation);
  require(seal.digest === plan.candidate_digest, 'frozen candidate differs');
  const custodySeal = unseal(object(root, repair(operation) + '/custody/seal.json'), 'VidaReleaseRetargetCustody/v1', [
    'schema',
    'operation_id',
    'entries',
  ]);
  require(custodySeal.operation_id === operation &&
    json(custodySeal.entries) === json(plan.custody), 'custody seal differs');
  const stable = staged.concat(
    observation(root, repair(operation) + '/custody/seal.json'),
    sourceObservations(root, plan.source_binding),
  );
  for (const entry of plan.custody) {
    const copy = observation(root, entry.copy, binaryLimit);
    require(copy.sha256 === entry.sha256, 'custody changed');
    stable.push(copy);
    if (!plan.before.some((before) => before.path === entry.path) && !entry.path.endsWith('.tgz')) {
      const current = observation(root, entry.path);
      require(current.sha256 === entry.sha256, 'retained receipt changed');
      stable.push(current);
    }
  }
  const originalCopy = plan.custody.find((entry) => entry.path === base(operation) + '/release.json');
  require(originalCopy, 'original release custody missing');
  const original = releaseState(releasePath(root, originalCopy.copy));
  const expected = {
    ...original,
    pack_metadata: seal.pack_metadata,
    source_binding: seal.source_binding,
    tarball_sha256: seal.archive_sha256,
  };
  require(original.operation_id === operation &&
    original.version === plan.version &&
    original.status === 'awaiting_assurance' &&
    !original.install_started &&
    original.tarball_sha256 === plan.archive_before &&
    seal.archive_sha256 === plan.archive_after &&
    seal.version === plan.version &&
    seal.source_binding === plan.source_binding &&
    packedDistribution(original.pack_metadata) === 'npm' &&
    packedDistribution(seal.pack_metadata) === 'native' &&
    json(expected) === json(plan.release_after), 'frozen three-field continuity differs');
  const archive = archivePath(operation, plan.release_after.pack_metadata[0].filename);
  const observedArchive = observation(root, archive, binaryLimit);
  const publication = observation(root, repair(operation) + '/custody/publication.tgz', binaryLimit);
  require(observedArchive.sha256 === plan.archive_before ||
    observedArchive.sha256 === plan.archive_after, 'archive UNKNOWN');
  require(publication.sha256 === plan.archive_after ||
    (publication.sha256 === null &&
      observedArchive.sha256 === plan.archive_after), 'publication stage missing or changed');
  stable.push(observedArchive, publication, observation(root, repair(operation) + '/plan.json'));
  const api = await access(root);
  return withReleaseRepairLocks(root, operation, async () => {
    sameObservations(root, stable);
    const original = eligible(root, operation),
      current = pointers(root, operation);
    for (const pointer of plan.before.slice(0, 2))
      require(current.find((entry) => entry.path === pointer.path)?.sha256 ===
        pointer.sha256, 'original pointer changed');
    const releaseHash = current[2].sha256,
      beforeHash = plan.before[2].sha256,
      afterHash = sha(json(plan.release_after));
    require(releaseHash === beforeHash || releaseHash === afterHash, 'release UNKNOWN');
    require(original.version === plan.version, 'original version changed');
    const stateFile = retargetStateRelative(operation);
    const state = identity(root, stateFile)
      ? unseal(object(root, stateFile), 'VidaReleaseRetargetState/v1', stateFields)
      : null;
    require(state === null ||
      (state.operation_id === operation &&
        state.plan_digest === plan.digest &&
        ['planning', 'custody', 'archive', 'release', 'complete'].includes(state.phase) &&
        state.release_after_sha256 === afterHash), 'repair phase UNKNOWN');
    // A missing initial ACK is known only while all frozen preimages still hold.
    require(state ||
      (releaseHash === beforeHash && observedArchive.sha256 === plan.archive_before), 'missing phase after effects');
    require(state?.phase !== 'planning' ||
      (releaseHash === beforeHash && observedArchive.sha256 === plan.archive_before), 'planning phase effects UNKNOWN');
    const phase = state?.phase === 'planning' ? 'custody' : (state?.phase ?? 'custody');
    if (phase === 'complete') {
      require(releaseHash === afterHash &&
        observedArchive.sha256 === plan.archive_after, 'complete postcondition changed');
      return { status: 'complete', operation_id: operation, version: plan.version, qualified: false };
    }
    require(!(phase === 'custody' && releaseHash !== beforeHash) &&
      !(releaseHash === afterHash && observedArchive.sha256 !== plan.archive_after) &&
      !(phase === 'archive' && observedArchive.sha256 !== plan.archive_after) &&
      !(phase === 'release' && releaseHash !== afterHash), 'mixed repair phase UNKNOWN');
    if (observedArchive.sha256 === plan.archive_before) {
      require(releaseHash === beforeHash && phase === 'custody', 'archive phase differs');
      await api.move(repair(operation) + '/custody/publication.tgz', archive, { overwrite: true });
      await onPhase?.('archive_effect');
    }
    await savePhase(api, operation, plan, 'archive');
    await onPhase?.('archive');
    if (releaseHash === beforeHash) {
      await api.write(base(operation) + '/release.json', json(plan.release_after));
      await onPhase?.('release_effect');
    }
    await savePhase(api, operation, plan, 'release');
    await onPhase?.('release');
    await savePhase(api, operation, plan, 'complete');
    return { status: 'complete', operation_id: operation, version: plan.version, qualified: false };
  });
}

export async function runReleaseRetarget(args, options) {
  const values = {};
  for (let i = 0; i < args.length; i += 2) {
    require(['--kind', '--mode', '--project-root', '--operation', '--actor'].includes(args[i]) &&
      args[i + 1] &&
      !Object.hasOwn(values, args[i]), 'retarget arguments invalid');
    values[args[i]] = args[i + 1];
  }
  require(values['--kind'] === 'release-retarget' &&
    path.isAbsolute(values['--project-root'] ?? '') &&
    releaseIdPattern.test(values['--operation'] ?? '') &&
    ['inspect', 'plan', 'apply', 'resume'].includes(values['--mode']), 'retarget operation arguments invalid');
  const input = { root: values['--project-root'], operation: values['--operation'], actor: values['--actor'] };
  if (values['--mode'] === 'inspect') {
    require(!input.actor, 'inspect accepts no actor');
    return inspectReleaseRetarget(input);
  }
  if (values['--mode'] === 'plan') return planReleaseRetarget(input, options);
  require(!input.actor, 'apply/resume use frozen attribution');
  return applyReleaseRetarget(input, options);
}
