'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const scopeIntegrity = require('../../lib/scope-integrity.cjs');
const scopeConvergence = require('../../lib/scope-convergence.cjs');
const { checkpoint } = require('./fixtures.cjs');

function repository(prefix = 'runtime-scope-integrity-') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src', 'page.js'), 'export const page = 1;\n');
  fs.writeFileSync(path.join(root, 'docs', 'platform.md'), '# Platform\n');
  return root;
}

function file(root, relative) {
  const absolute = path.join(root, relative);
  const stat = fs.lstatSync(absolute);
  return { relative, absolute, mode: stat.mode & 0o777 };
}

function input(root) {
  return {
    source_revision: 'git:scope-test',
    implementationFiles: [file(root, 'src/page.js')],
    documentationFiles: [file(root, 'docs/platform.md')],
    absenceAssertions: [{ path: 'src/removed.js', required: true, present: false }],
    repository_head: 'unrelated-head'
  };
}

describe('scope integrity snapshots', () => {
  test('captures implementation and documentation separately without source text', () => {
    const root = repository();
    expect(scopeIntegrity.repositoryHead(root)).toBeNull();
    const snapshot = scopeIntegrity.capture(input(root));
    expect(snapshot.schema).toBe('ScopeSnapshot/v1');
    expect(snapshot.scope_paths).toEqual(['src/page.js']);
    expect(snapshot.documentation_paths).toEqual(['docs/platform.md']);
    expect(snapshot.files).toHaveLength(2);
    expect(snapshot.implementation_fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(snapshot)).not.toContain('export const page');
    expect(JSON.stringify(snapshot)).not.toContain('# Platform');
    expect(snapshot.snapshot_id).toBe(scopeIntegrity.snapshotId(snapshot));
  });

  test('mtime-only changes keep snapshot identity and report metadata_only', () => {
    const root = repository();
    const first = scopeIntegrity.capture(input(root));
    const implementation = path.join(root, 'src', 'page.js');
    const before = fs.statSync(implementation);
    fs.utimesSync(implementation, new Date(before.atimeMs + 1000), new Date(before.mtimeMs + 1000));
    const second = scopeIntegrity.capture(input(root));
    expect(second.implementation_fingerprint).toBe(first.implementation_fingerprint);
    expect(second.snapshot_id).toBe(first.snapshot_id);
    expect(scopeIntegrity.report(first, second).status).toBe('metadata_only');
    expect(scopeIntegrity.stableCapture(input(root), { settleMs: 0 }).snapshot_id).toBe(first.snapshot_id);
  });

  test('documentation-only changes do not require a new implementation fingerprint', () => {
    const root = repository();
    const first = scopeIntegrity.capture(input(root));
    fs.appendFileSync(path.join(root, 'docs', 'platform.md'), 'Updated baseline.\n');
    const second = scopeIntegrity.capture(input(root));
    const report = scopeIntegrity.report(first, second);
    expect(second.implementation_fingerprint).toBe(first.implementation_fingerprint);
    expect(report.status).toBe('documentation_only');
    expect(report.changed_paths).toEqual(['docs/platform.md']);
    const added = path.join(root, 'docs', 'new.md');
    fs.writeFileSync(added, '# New\n');
    const third = scopeIntegrity.capture({ ...input(root), documentationFiles: [file(root, 'docs/platform.md'), file(root, 'docs/new.md')] });
    const addedReport = scopeIntegrity.report(second, third);
    expect(addedReport.old_hashes).toContainEqual({ path: 'docs/new.md', sha256: null });
    expect(addedReport.new_hashes.find(item => item.path === 'docs/new.md').sha256).toMatch(/^[a-f0-9]{64}$/);
    const removed = scopeIntegrity.capture({ ...input(root), documentationFiles: [] });
    const removedReport = scopeIntegrity.report(third, removed);
    expect(removedReport.new_hashes).toContainEqual({ path: 'docs/new.md', sha256: null });
    const implementationChange = scopeIntegrity.capture(input(root));
    fs.appendFileSync(path.join(root, 'src', 'page.js'), 'export const implementationChanged = true;\n');
    const changed = scopeIntegrity.report(implementationChange, scopeIntegrity.capture(input(root)));
    expect(changed.status).toBe('changed');
    expect(changed.next_action).toMatch(/fresh seal and review packet/i);
  });

  test('stable capture fails closed when a writer changes implementation bytes between passes', () => {
    const root = repository();
    expect(() => scopeIntegrity.stableCapture(input(root), {
      settleMs: 1,
      wait: () => fs.appendFileSync(path.join(root, 'src', 'page.js'), 'export const changed = true;\n')
    })).toThrow(expect.objectContaining({ code: 'GAP-SCOPE-MUTATING-001' }));
  });

  test('stable capture also supports the default bounded wait and rejects non-files/read failures', () => {
    const root = repository();
    expect(scopeIntegrity.stableCapture(input(root), { settleMs: 1 }).snapshot_id).toMatch(/^[a-f0-9]{64}$/);
    expect(() => scopeIntegrity.capture({ ...input(root), implementationFiles: [file(root, 'src')] })).toThrow(expect.objectContaining({ code: 'GAP-SCOPE-MUTATING-001' }));
    expect(() => scopeIntegrity.capture({ ...input(root), implementationFiles: [{ relative: 'src/missing.js', absolute: path.join(root, 'src', 'missing.js'), mode: 420 }] })).toThrow(expect.objectContaining({ code: 'GAP-SCOPE-MUTATING-001' }));
  });

  test('source revision changes are explicit and never silently merged', () => {
    const root = repository();
    const first = scopeIntegrity.capture(input(root));
    const second = scopeIntegrity.capture({ ...input(root), source_revision: 'git:next' });
    const report = scopeIntegrity.report(first, second);
    expect(report.status).toBe('changed');
    expect(report.next_action).toMatch(/new source revision/i);
    expect(report.old_hashes).toHaveLength(2);
    expect(report.new_hashes).toHaveLength(2);
  });

  test('ownership reports unclaimed paths and accepts a complete active claim', () => {
    const paths = ['src/page.js', 'docs/platform.md'];
    const conflict = scopeIntegrity.ownership({
      paths,
      coordination: { exclusive_resources: ['file:src/page.js'], active_resources: ['file:src/page.js'], blocked_resources: [], thread_id: 'thread-1' }
    });
    expect(conflict.status).toBe('ownership_conflict');
    expect(conflict.missing_paths).toEqual(['docs/platform.md']);
    const owned = scopeIntegrity.ownership({
      paths,
      coordination: { exclusive_resources: paths.map(value => `file:${value}`), active_resources: paths.map(value => `file:${value}`), blocked_resources: [], thread_id: 'thread-1' }
    });
    expect(owned.status).toBe('owned');
    expect(owned.claim_status.every(item => item.status === 'active')).toBe(true);
    const blocked = scopeIntegrity.ownership({ paths, coordination: { exclusive_resources: paths.map(value => `file:${value}`), active_resources: ['file:src/page.js'], blocked_resources: ['file:docs/platform.md'], thread_id: 'thread-1' } });
    expect(blocked.claim_status.find(item => item.path === 'docs/platform.md').status).toBe('blocked');
    const notClaimed = scopeIntegrity.ownership({ paths, coordination: { exclusive_resources: paths.map(value => `file:${value}`), active_resources: [], blocked_resources: [], thread_id: 'thread-1' } });
    expect(notClaimed.claim_status.every(item => item.status === 'not_claimed')).toBe(true);
    expect(scopeIntegrity.ownership({ coordination: { exclusive_resources: [], active_resources: [], blocked_resources: [] } }).status).toBe('owned');
  });

  test('missing prior snapshot is an explicit evidence gap', () => {
    const root = repository();
    const current = scopeIntegrity.capture(input(root));
    const report = scopeIntegrity.report(null, current, { evidence_pointer: 'WORK.md#scope' });
    expect(report.status).toBe('evidence_gap');
    expect(report.gap_code).toBe('GAP-SCOPE-SNAPSHOT-001');
    expect(report.next_action).toMatch(/fresh seal/i);
    expect(JSON.stringify(report)).not.toContain('export const page');
    expect(scopeIntegrity.report(null, undefined, {}).source_revision).toBeNull();
  });

  test('scope classification can separate implementation and documentation paths', () => {
    const state = checkpoint({ allowed_paths: ['src/page.js', 'docs/platform.md'], fingerprint_paths: ['src/page.js', 'docs/platform.md'], documentation_paths: ['docs/platform.md'] });
    const scope = {
      schema: 'ImplementationScope/v1', scope_id: 'scope-integrity', work_id: state.work_id, source_revision: state.source_revision,
      ac_ids: [...state.acceptance_manifest.ac_ids], allowed_paths: ['src/page.js', 'docs/platform.md'], implementation_paths: ['src/page.js'], documentation_paths: ['docs/platform.md'],
      changed_symbols: [], non_goals: ['unrelated'], acceptance_trace: ['WORK.md#AC'], behavior_trace: ['WORK.md#behavior'], test_trace: ['tests/scope'], diagnostic_trace: ['WORK.md#diagnostic'],
      attribution: { thread_id: 'thread-scope', pointer: 'WORK.md#scope' }, owner: 'executor', created_at: new Date().toISOString()
    };
    expect(() => scopeConvergence.scopeContractValid(scope, state)).not.toThrow();
    expect(() => scopeConvergence.scopeContractValid({ ...scope, documentation_paths: ['src/other.js'] }, state)).toThrow(/classification exceeds/);
    expect(() => scopeConvergence.scopeContractValid({ ...scope, implementation_paths: ['docs/platform.md'] }, state)).toThrow(/overlaps/);
  });
});
