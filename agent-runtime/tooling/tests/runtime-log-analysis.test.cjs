'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const Ajv2020 = require('ajv/dist/2020').default;
const analyzer = require('../../bin/analyze-runtime-logs.cjs');

function tempRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-analysis-'));
  fs.mkdirSync(path.join(root, '.git'));
  return root;
}
function write(root, relative, value) {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value), 'utf8');
  return file;
}
function opts(root, extra = {}) { return { root, outputRoot: '.planning/agent-flow/runtime-analysis', maxFileBytes: 100000, ...extra }; }

describe('runtime log analyzer', () => {
  test('clusters repeated runtime failures and preserves compact evidence pointers', () => {
    const root = tempRepo();
    write(root, '.planning/agent-flow/test-output/run-a.log', [
      JSON.stringify({ run_id: 'run-a', operation: 'verify:pre', phase: 'VERIFY', code: 'GATE_BLOCKED', message: 'review preflight snapshot invalid', preconditions_valid: true }),
      JSON.stringify({ run_id: 'run-b', operation: 'verify:pre', phase: 'VERIFY', code: 'GATE_BLOCKED', message: 'review preflight snapshot invalid', preconditions_valid: true }),
      JSON.stringify({ run_id: 'run-c', operation: 'verify:pre', phase: 'VERIFY', code: 'GATE_BLOCKED', message: 'review preflight snapshot invalid', preconditions_valid: true })
    ].join('\n'));
    const result = analyzer.analyze(opts(root));
    expect(result.report.status).toBe('findings');
    expect(result.report.recurrence_clusters).toHaveLength(1);
    expect(result.report.recurrence_clusters[0]).toMatchObject({ count: 3, distinct_runs: 3, failure_class: 'runtime-defect' });
    expect(result.report.recurrence_clusters[0].evidence_pointers[0]).toContain('#L1');
  });

  test('does not treat one expected fail-closed event as a defect candidate', () => {
    const root = tempRepo();
    write(root, '.planning/agent-flow/test-output/run.log', JSON.stringify({ run_id: 'run-a', operation: 'verify:pre', code: 'GATE_BLOCKED', message: 'dirty overlap blocks review preflight' }));
    const result = analyzer.analyze(opts(root));
    expect(result.report.recurrence_clusters).toEqual([]);
    expect(result.report.status).toBe('no_new_signal');
  });

  test('does not merge similar text across operations or source revisions', () => {
    const root = tempRepo();
    write(root, '.planning/agent-flow/test-output/run.log', [
      JSON.stringify({ run_id: 'run-a', operation: 'verify:pre', source_revision: 'rev-a', code: 'ERR_RUNTIME', message: 'same failure' }),
      JSON.stringify({ run_id: 'run-a', operation: 'ship:pre', source_revision: 'rev-a', code: 'ERR_RUNTIME', message: 'same failure' }),
      JSON.stringify({ run_id: 'run-a', operation: 'verify:pre', source_revision: 'rev-b', code: 'ERR_RUNTIME', message: 'same failure' })
    ].join('\n'));
    const result = analyzer.analyze(opts(root));
    expect(result.report.recurrence_clusters).toEqual([]);
    expect(result.report.source_counts.events).toBe(3);
  });

  test('reuses snapshot watermark and avoids duplicate findings', () => {
    const root = tempRepo();
    write(root, '.planning/agent-flow/test-output/run.log', JSON.stringify({ run_id: 'run-a', operation: 'verify:pre', code: 'ERR_RUNTIME', message: 'runtime failed' }));
    const first = analyzer.writeResult(analyzer.analyze(opts(root)));
    const second = analyzer.analyze(opts(root));
    expect(first.report.snapshot.snapshot_id).toBe(second.report.snapshot.snapshot_id);
    expect(second.report.status).toBe('no_new_signal');
    expect(second.report.watermark.reused).toBe(true);
  });

  test('blocks and preserves the prior watermark when the snapshot changes while reading', () => {
    const root = tempRepo();
    const file = write(root, '.planning/agent-flow/test-output/run.log', JSON.stringify({ run_id: 'run-a', operation: 'verify:pre', code: 'ERR_RUNTIME', message: 'runtime failed' }));
    const first = analyzer.writeResult(analyzer.analyze(opts(root)));
    const priorWatermark = fs.readFileSync(path.join(root, '.planning/agent-flow/runtime-analysis/watermark.json'), 'utf8');
    const blocked = analyzer.analyze({ ...opts(root), beforeConsistencyCheck: () => fs.appendFileSync(file, '\n' + JSON.stringify({ run_id: 'run-b', operation: 'verify:pre', code: 'ERR_RUNTIME', message: 'runtime failed' })) });
    expect(blocked.report.status).toBe('blocked');
    expect(blocked.report.known_gaps.join(' ')).toMatch(/snapshot changed/);
    analyzer.writeResult(blocked);
    expect(fs.readFileSync(path.join(root, '.planning/agent-flow/runtime-analysis/watermark.json'), 'utf8')).toBe(priorWatermark);
    expect(first.report.snapshot.snapshot_id).toBe(blocked.report.snapshot.snapshot_id);
  });

  test('redacts secrets and reports large evidence as an optimization candidate', () => {
    const root = tempRepo();
    write(root, '.planning/agent-flow/test-output/run.log', [
      JSON.stringify({ run_id: 'run-a', operation: 'preflight', code: 'ERR', message: 'token=secret-value' }),
      JSON.stringify({ run_id: 'run-a', operation: 'preflight', code: 'ERR', message: 'token=secret-value' }),
      JSON.stringify({ run_id: 'run-a', operation: 'preflight', code: 'ERR', message: 'token=secret-value' })
    ].join('\n'));
    const result = analyzer.analyze(opts(root));
    expect(JSON.stringify(result.report)).not.toContain('secret-value');
    expect(result.report.optimization_findings.some(item => item.kind === 'duplicate-operation-candidate')).toBe(true);
  });

  test('rejects unsafe roots and validates the report schema through the public artifact', () => {
    expect(() => analyzer.analyze({ root: path.join(os.tmpdir(), '..'), logRoots: ['..'] })).toThrow(/unsafe|repository root/);
    const root = tempRepo();
    write(root, '.planning/agent-flow/test-output/run.log', '');
    const result = analyzer.writeResult(analyzer.analyze(opts(root)));
    const schema = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../schemas/runtime-log-analysis-report.v1.schema.json'), 'utf8'));
    const ajv = new Ajv2020({ strict: false, validateFormats: false });
    expect(ajv.compile(schema)(result.report)).toBe(true);
  });

  test('CLI defaults to summary and never emits raw log content', () => {
    const root = tempRepo();
    write(root, '.planning/agent-flow/test-output/run.log', JSON.stringify({ run_id: 'run-a', operation: 'verify', code: 'ERR', message: 'password=hidden' }));
    const output = execFileSync(process.execPath, [path.resolve(__dirname, '../../bin/analyze-runtime-logs.cjs'), '--root', root], { encoding: 'utf8' });
    expect(output).toContain('RuntimeLogAnalysisReport/v1');
    expect(output).not.toContain('hidden');
    expect(output).not.toContain('run.log#L1');
  });

  test('includes checkpoints only when explicitly requested and extracts compact knowledge references', () => {
    const root = tempRepo();
    write(root, '.agent/work/work-1/resume.json', { schema: 'WorkCheckpoint/v2', platform_knowledge_context: { schema: 'PlatformKnowledgeContext/v1', official_sources: [{ url: 'https://docs.example.test/platform', title: 'Academy', platform_version: '8.x', last_verified: '2026-08-20', source_hash: 'a'.repeat(64) }], skills: [{ skill_id: 'skill-1', path: '.codex/skills/skill-1/SKILL.md', skill_sha256: 'b'.repeat(64), role: 'executor', phase: 'execute', status: 'applied' }] } });
    expect(analyzer.analyze(opts(root)).report.source_counts.files).toBe(0);
    const result = analyzer.analyze(opts(root, { includeCheckpoints: true }));
    expect(result.report.source_counts.files).toBe(1);
    expect(result.report.documentation_research[0]).toMatchObject({ source_url: 'https://docs.example.test/platform' });
    expect(result.report.skill_assessment[0]).toMatchObject({ skill_id: 'skill-1' });
  });
});

