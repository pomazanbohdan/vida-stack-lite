import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, test } from 'bun:test';
import { runDifferential } from '../tooling/differential.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const corpusPath = path.join(repositoryRoot, 'agent-runtime-new', 'config', 'differential-cases.v1.json');
const unsafeCorpusPath = path.join(
  repositoryRoot,
  'agent-runtime-new',
  'config',
  'differential-cases.invalid-work-id.test.json',
);
function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object')
    return (
      '{' +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ':' + stable(value[key]))
        .join(',') +
      '}'
    );
  return JSON.stringify(value);
}
function digest(value) {
  return createHash('sha256').update(stable(value)).digest('hex');
}
let report;
const bunRuntime = typeof process.versions.bun === 'string';
const differentialTest = bunRuntime ? test : test.skip;
let corpusBefore;

beforeAll(() => {
  if (!bunRuntime) return;
  corpusBefore = readFileSync(corpusPath, 'utf8');
  report = runDifferential({ repositoryRoot });
}, 60_000);

differentialTest('differential execution covers the bound semantic subset and fails closed on skipped adapters', () => {
  assert.equal(report.checkpoint_path, '.agent/work/agent-runtime-new-migration-current-v4-20260904/resume.json');
  const checkpoint = JSON.parse(readFileSync(path.join(repositoryRoot, report.checkpoint_path), 'utf8'));
  assert.equal(report.sealed_revision, checkpoint.sealed_revision);
  assert.equal(report.implementation_fingerprint, checkpoint.implementation_fingerprint);
  assert.equal(report.scope_contract_digest, checkpoint.scope_contract_digest);
  assert.equal(report.schema, 'CandidateDifferentialReport/v1');
  assert.equal(report.status, 'gap');
  assert.equal(report.semantic_cases, 1);
  assert.equal(report.semantic_results.find((item) => item.case_id === 'stable-canonical-object-order')?.match, true);
  const executed = report.semantic_results;
  assert.equal(executed.length, report.semantic_cases);
  assert.ok(executed.every((item) => item.match === true));
  assert.equal(report.host.repository_root, '<repo>');
  assert.equal(report.mismatches.length, 0);
  assert.equal(report.no_write_verified, true);
  assert.equal(report.no_write.worker_write_attempts, 0);
  assert.equal(report.no_write.worker_guard_install_failures, 0);
  assert.deepEqual(report.no_write.sandbox_changed_paths, []);
  assert.deepEqual(report.oracle_digests, [
    'dbc924332ed94367e4d68b667efc5b6646cdc2aee2203d97a5f6b6cdb6a191d3',
    'dbc924332ed94367e4d68b667efc5b6646cdc2aee2203d97a5f6b6cdb6a191d3',
  ]);
  assert.equal(report.gaps[0].code, 'GAP-RTNEW-ADAPTER-001');
  assert.equal(report.skipped_cases.length, 17);
});

differentialTest(
  'differential reporting preserves normalized result and state equivalence without writing the corpus',
  () => {
    const canonical = report.semantic_results.find((item) => item.case_id === 'stable-canonical-object-order');
    assert.deepEqual(
      {
        match: canonical.match,
        oracle_outcome: canonical.oracle_outcome,
        candidate_outcome: canonical.candidate_outcome,
        oracle_error_code: canonical.oracle_error_code,
        candidate_error_code: canonical.candidate_error_code,
        oracle_state_digest: canonical.oracle_state_digest,
        candidate_state_digest: canonical.candidate_state_digest,
        oracle_result_digest: canonical.oracle_result_digest,
        candidate_result_digest: canonical.candidate_result_digest,
      },
      {
        match: true,
        oracle_outcome: 'result',
        candidate_outcome: 'result',
        oracle_error_code: null,
        candidate_error_code: null,
        oracle_state_digest: canonical.oracle_state_digest,
        candidate_state_digest: canonical.oracle_state_digest,
        oracle_result_digest: canonical.oracle_result_digest,
        candidate_result_digest: canonical.oracle_result_digest,
      },
    );
    assert.equal(readFileSync(corpusPath, 'utf8'), corpusBefore);
  },
);

differentialTest(
  'differential validation rejects unsafe work-id corpus input before reading a work path',
  { timeout: 30_000 },
  () => {
    const invalidCorpus = JSON.parse(corpusBefore);
    invalidCorpus.work_id = '../outside';
    const withoutDigest = Object.fromEntries(Object.entries(invalidCorpus).filter(([key]) => key !== 'corpus_digest'));
    invalidCorpus.corpus_digest = digest(withoutDigest);
    writeFileSync(unsafeCorpusPath, JSON.stringify(invalidCorpus));
    try {
      const invalidReport = runDifferential({
        repositoryRoot,
        corpusPath: 'agent-runtime-new/config/differential-cases.invalid-work-id.test.json',
      });
      assert.equal(invalidReport.status, 'gap');
      assert.equal(invalidReport.semantic_cases, 0);
      assert.equal(invalidReport.no_write_verified, true);
      assert.equal(invalidReport.gaps[0].code, 'GAP-RTNEW-CORPUS-BINDING-001');
    } finally {
      unlinkSync(unsafeCorpusPath);
    }
  },
);
