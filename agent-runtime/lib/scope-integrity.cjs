/* Compact, read-only scope snapshots for shared-worktree assurance. */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const { spawnSync } = require('child_process');

const STATUSES = Object.freeze([
  'unchanged', 'metadata_only', 'documentation_only', 'changed',
  'unstable', 'ownership_conflict', 'evidence_gap'
]);

function error(message, code = 'GATE_BLOCKED') {
  /** @type {Error & { code?: string }} */
  const result = new Error(message);
  result.code = code;
  throw result;
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(stable(value)).digest('hex');
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function repositoryHead(root) {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : null;
}

function snapshotIdentity(snapshot) {
  return {
    source_revision: snapshot.source_revision,
    implementation_fingerprint: snapshot.implementation_fingerprint,
    change_impact_assessment_id: snapshot.change_impact_assessment_id || null,
    change_impact_digest: snapshot.change_impact_digest || null,
    change_impact_profile: snapshot.change_impact_profile || null,
    change_impact_status: snapshot.change_impact_status || null,
    files: snapshot.files.map(file => ({ path: file.path, sha256: file.sha256, size: file.size, mode: file.mode, kind: file.kind })),
    absence_assertions: snapshot.absence_assertions.map(item => ({ path: item.path, required: item.required, present: item.present }))
  };
}

function snapshotId(snapshot) {
  return digest(snapshotIdentity(snapshot));
}

function sortedPaths(values) {
  return [...new Set((values || []).filter(value => typeof value === 'string' && value.trim()))].sort();
}

function readFileEntry(file, kind, aggregate) {
  let stat;
  let bytes;
  try {
    stat = fs.lstatSync(file.absolute);
    if (!stat.isFile()) error(`scope path is not a file: ${file.relative}`, 'GAP-SCOPE-MUTATING-001');
    bytes = fs.readFileSync(file.absolute);
  } catch (cause) {
    if (cause?.code === 'GATE_BLOCKED' || cause?.code === 'GAP-SCOPE-MUTATING-001') throw cause;
    error(`scope snapshot could not read ${file.relative}`, 'GAP-SCOPE-MUTATING-001');
  }
  const hash = sha256(bytes);
  if (aggregate) aggregate.update(`file\0${file.relative}\0${file.mode}\0${bytes.length}\0${hash}\0`);
  if (aggregate) aggregate.update('\0');
  return { path: file.relative, sha256: hash, size: bytes.length, mode: file.mode, mtime_ms: stat.mtimeMs, kind };
}

function capture(input) {
  const implementation = input.implementationFiles || [];
  const documentation = input.documentationFiles || [];
  const aggregate = crypto.createHash('sha256');
  const files = [
    ...implementation.map(file => readFileEntry(file, 'implementation', aggregate)),
    ...documentation.map(file => readFileEntry(file, 'documentation', null))
  ].sort((left, right) => left.path.localeCompare(right.path));
  const absence = (input.absenceAssertions || []).map(item => ({
    path: item.path,
    required: item.required === true,
    present: item.present === true
  })).sort((left, right) => left.path.localeCompare(right.path));
  aggregate.update(stable({ absence }));
  const snapshot = {
    schema: 'ScopeSnapshot/v1',
    snapshot_id: null,
    source_revision: input.source_revision || null,
    implementation_fingerprint: aggregate.digest('hex'),
    scope_paths: files.filter(file => file.kind === 'implementation').map(file => file.path),
    documentation_paths: files.filter(file => file.kind === 'documentation').map(file => file.path),
    files,
    absence_assertions: absence,
    repository_head: input.repository_head ?? null,
    coordination: input.coordination || null,
    change_impact_assessment_id: input.impact?.assessment_id || null,
    change_impact_digest: input.impact?.digest || null,
    change_impact_profile: input.impact?.predicted_test_profile || null,
    change_impact_status: input.impact?.status || null,
    captured_at: input.captured_at || new Date().toISOString()
  };
  snapshot.snapshot_id = snapshotId(snapshot);
  return snapshot;
}

function snapshotEqual(left, right) {
  return snapshotId(left) === snapshotId(right) && left.implementation_fingerprint === right.implementation_fingerprint;
}

function stableCapture(input, options = {}) {
  const first = capture(input);
  const settleMs = Number.isInteger(options.settleMs) ? Math.max(0, options.settleMs) : 10;
  if (settleMs > 0) {
    const wait = options.wait || ((_, __, ___, ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms));
    wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, settleMs);
  }
  const second = capture({ ...input, captured_at: new Date().toISOString() });
  if (!snapshotEqual(first, second)) error('scope changed while being sealed', 'GAP-SCOPE-MUTATING-001');
  return second;
}

function fileMap(snapshot) {
  return new Map((snapshot?.files || []).map(file => [file.path, file]));
}

function changedPaths(previous, current) {
  const before = fileMap(previous);
  const after = fileMap(current);
  const paths = new Set([...before.keys(), ...after.keys()]);
  return [...paths].sort().filter(file => {
    const left = before.get(file);
    const right = after.get(file);
    return !left || !right || left.sha256 !== right.sha256 || left.size !== right.size || left.mode !== right.mode || left.mtime_ms !== right.mtime_ms;
  });
}

function reportGap(current, input) {
  return {
    schema: 'ScopeIntegrityReport/v1', status: 'evidence_gap', gap_code: 'GAP-SCOPE-SNAPSHOT-001',
    changed_paths: [], unchanged_paths: [], old_hashes: [], new_hashes: [],
    owner_thread_ids: input.owner_thread_ids || [], claim_status: input.claim_status || [],
    source_revision: current?.source_revision || input.source_revision || null,
    repository_head: current?.repository_head || input.repository_head || null,
    change_impact_assessment_id: input.impact?.assessment_id || null,
    change_impact_digest: input.impact?.digest || null,
    change_impact_profile: input.impact?.predicted_test_profile || null,
    change_impact_status: input.impact?.status || null,
    unverified_edges: input.impact?.unverified_edges || [],
    unknown_edges: input.impact?.unknown_edges || [],
    next_action: 'Create a fresh seal to record ScopeSnapshot/v1.', evidence_pointer: input.evidence_pointer || null
  };
}

function reportSourceChange(previous, current, input) {
  return {
    schema: 'ScopeIntegrityReport/v1', status: 'changed', gap_code: null,
    changed_paths: [], unchanged_paths: current.files.map(file => file.path), old_hashes: previous.files.map(file => ({ path: file.path, sha256: file.sha256 })),
    new_hashes: current.files.map(file => ({ path: file.path, sha256: file.sha256 })), owner_thread_ids: input.owner_thread_ids || [], claim_status: input.claim_status || [],
    source_revision: current.source_revision, repository_head: current.repository_head,
    change_impact_assessment_id: input.impact?.assessment_id || null,
    change_impact_digest: input.impact?.digest || null,
    change_impact_profile: input.impact?.predicted_test_profile || null,
    change_impact_status: input.impact?.status || null,
    unverified_edges: input.impact?.unverified_edges || [],
    unknown_edges: input.impact?.unknown_edges || [],
    next_action: 'Create a fresh seal for the new source revision.', evidence_pointer: input.evidence_pointer || null
  };
}

function changedBytePaths(changed, before, after) {
  return changed.filter(file => before.get(file)?.sha256 !== after.get(file)?.sha256 || before.get(file)?.size !== after.get(file)?.size || before.get(file)?.mode !== after.get(file)?.mode);
}

function reportStatus(changed, changedBytes, documentation) {
  if (changed.length === 0) return 'unchanged';
  if (changedBytes.length === 0) return 'metadata_only';
  return changedBytes.every(file => documentation.has(file)) ? 'documentation_only' : 'changed';
}

function reportNextAction(status) {
  return ['unchanged', 'metadata_only', 'documentation_only'].includes(status)
    ? 'Keep the current assurance set; no reviewer dispatch is needed.'
    : 'Create a fresh seal and review packet for the changed implementation scope.';
}

function report(previous, current, input = {}) {
  if (!previous) return reportGap(current, input);
  if (previous.source_revision !== current.source_revision) return reportSourceChange(previous, current, input);
  const changed = changedPaths(previous, current);
  const before = fileMap(previous);
  const after = fileMap(current);
  const changedBytes = changedBytePaths(changed, before, after);
  const documentation = new Set([...(previous.documentation_paths || []), ...(current.documentation_paths || [])]);
  const status = reportStatus(changed, changedBytes, documentation);
  const oldHashes = changed.map(file => ({ path: file, sha256: before.get(file)?.sha256 || null }));
  const newHashes = changed.map(file => ({ path: file, sha256: after.get(file)?.sha256 || null }));
  return {
    schema: 'ScopeIntegrityReport/v1', status, gap_code: null, changed_paths: changed,
    unchanged_paths: current.files.map(file => file.path).filter(file => !changed.includes(file)), old_hashes: oldHashes, new_hashes: newHashes,
    owner_thread_ids: input.owner_thread_ids || [], claim_status: input.claim_status || [], source_revision: current.source_revision,
    repository_head: current.repository_head,
    change_impact_assessment_id: input.impact?.assessment_id || null,
    change_impact_digest: input.impact?.digest || null,
    change_impact_profile: input.impact?.predicted_test_profile || null,
    change_impact_status: input.impact?.status || null,
    unverified_edges: input.impact?.unverified_edges || [],
    unknown_edges: input.impact?.unknown_edges || [],
    next_action: reportNextAction(status),
    evidence_pointer: input.evidence_pointer || null
  };
}

function ownership(input) {
  const required = sortedPaths(input.paths);
  if (!input.coordination) return { status: 'not_required', owner_thread_ids: [], claim_status: [] };
  const binding = input.coordination;
  const exclusive = new Set(binding.exclusive_resources || []);
  const missing = required.filter(file => !exclusive.has(`file:${file}`));
  const active = new Set(binding.active_resources || []);
  const blocked = new Set(binding.blocked_resources || []);
  const claim_status = required.map(file => ({ path: file, resource: `file:${file}`, status: missing.includes(file) ? 'unowned' : blocked.has(`file:${file}`) ? 'blocked' : active.has(`file:${file}`) ? 'active' : 'not_claimed' }));
  const owner_thread_ids = binding.thread_id ? [binding.thread_id] : [];
  return { status: missing.length || claim_status.some(item => item.status === 'not_claimed') ? 'ownership_conflict' : 'owned', owner_thread_ids, claim_status, missing_paths: missing };
}

module.exports = { STATUSES, stable, digest, repositoryHead, capture, stableCapture, report, ownership, snapshotId };
