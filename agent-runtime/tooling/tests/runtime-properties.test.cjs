'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const fc = require('fast-check');
const runtime = require('../../lib/runtime.cjs');
const { checkpoint } = require('./fixtures.cjs');

function repository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-quality-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'quality@test'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'quality'], { cwd: root });
  fs.writeFileSync(path.join(root, 'safe.txt'), 'safe');
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'base'], { cwd: root });
  return root;
}

describe('fast-check boundary properties', () => {
  test('unsafe relative paths never resolve to a fingerprint scope', () => {
    const root = repository();
    fc.assert(fc.property(fc.oneof(fc.constant('../safe.txt'), fc.constant('C:/safe.txt'), fc.constant('-safe.txt'), fc.constant('!safe.txt'), fc.constant('safe\\txt'), fc.constant('a/../safe.txt'), fc.constantFrom('[', ']')), unsafe => {
      expect(() => runtime.resolveScope({ fingerprint_paths: [unsafe] }, root)).toThrow();
    }), { numRuns: 100 });
  });

  test('malformed bindings and timestamps do not validate as evidence', () => {
    const state = checkpoint();
    fc.assert(fc.property(fc.string().filter(value => !Number.isFinite(Date.parse(value))), value => {
      const evidence = { schema: 'Evidence/v1', id: 'x', class: 'Static', timestamp: value, ac_refs: ['AC-QUALITY-1'], pointer: 'pointer', work_id: state.work_id, source_revision: state.source_revision, sealed_revision: state.sealed_revision, implementation_fingerprint: state.implementation_fingerprint, acceptance_manifest_id: state.acceptance_manifest.id, acceptance_manifest_version: state.acceptance_manifest.version };
      expect(() => runtime.validateEvidence([evidence], state)).toThrow();
    }), { numRuns: 100 });
  });

  test('CAS rejects replayed expected revisions', () => {
    const root = repository();
    const work = path.join(root, '.agent', 'work', 'quality');
    fs.mkdirSync(work, { recursive: true });
    const file = path.join(work, 'resume.json');
    const state = checkpoint({ work_id: 'quality', lifecycle_state: 'INTAKE', revision: 1, sealed_at: undefined, sealed_revision: undefined, implementation_fingerprint: undefined });
    fs.writeFileSync(file, JSON.stringify(state));
    const next = runtime.beginTrace(file, { expectedRevision: 1, sourceRevision: state.source_revision });
    expect(next.revision).toBe(2);
    fc.assert(fc.property(fc.integer({ min: -10, max: 1 }), replay => {
      expect(() => runtime.beginTrace(file, { expectedRevision: replay, sourceRevision: state.source_revision })).toThrow();
    }), { numRuns: 40 });
  });
});
