import { test, expect } from 'bun:test';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../src/config/runtime-config.ts';
import { openHostStateDatabase, HostStateStore } from '../src/host-state.ts';
import { MastraSessionLedger } from '../src/orchestration/persistent-session-handoff.ts';
import { parseSessionBridgeRequest } from '../src/orchestration/mastra-session-bridge.ts';
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'audit-state-replay-'));
  const template = readFileSync(path.join(packageRoot, 'templates/agent-runtime.config.template.v1.yaml'), 'utf8')
    .replaceAll('{{REPOSITORY}}', 'replay-consumer')
    .replaceAll('{{PROJECT}}', 'sample')
    .replaceAll('{{BUNDLE}}', 'vida-agent');
  writeFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), template);
  writeFileSync(path.join(root, 'AGENTS.md'), 'TEST-SETUP policy');
  writeFileSync(path.join(root, 'AGENT.sidecar.md'), 'TEST-SETUP source map');
  const config = loadRuntimeConfig(root),
    db = openHostStateDatabase(path.join(root, 'fixture.sqlite')),
    workspace = 'a'.repeat(64);
  const ledger = new MastraSessionLedger(db, workspace, config, root, new HostStateStore(db, workspace));
  const request = (id, index = 0) =>
    parseSessionBridgeRequest({
      schema: 'VidaSessionRequest/v1',
      run_id: 'run-test',
      workflow_id: 'task_execution',
      wave_index: index,
      action_id: id.repeat(64),
      assignment_index: 0,
      stage_id: 'synthesize_task',
      role: 'research-synthesizer',
      config_digest: runtimeConfigDigest(config),
      scope_digest: 'b'.repeat(64),
      bindings_manifest_ref: 'c'.repeat(64),
    });
  return {
    root,
    ledger,
    request,
    close() {
      ledger.close();
      const relative = path.relative(path.resolve(tmpdir()), root);
      if (relative.includes(path.sep) || !relative.startsWith('audit-state-replay-'))
        throw new Error('unsafe fixture cleanup');
      rmSync(root, { recursive: true, force: true });
    },
  };
}
test('exact reported observation retry survives lost ACK and wave advancement, while conflicting payload remains denied', () => {
  const f = fixture();
  try {
    let state = f.ledger.sync('test', 1, 'run-test', 'wave0', [f.request('1')]);
    state = f.ledger.issueWave('test', 1, state.version);
    const oldVersion = state.version,
      item = state.state.items[0],
      summary = 'Actual fixture terminal observation';
    const report = {
      schema: 'VidaSessionObservation/v1',
      action_id: item.request.action_id,
      issue_id: item.issue_id,
      agent_id: 'fixture-native-agent',
      tool_call_ref: 'fixture-call-one',
      status: 'reported_complete',
      summary,
      output_digest: canonicalJsonDigest(summary),
      evidence_refs: ['fixture:source'],
    };
    const recorded = f.ledger.report('test', 1, oldVersion, report);
    expect(f.ledger.report('test', 1, oldVersion, report)).toEqual(recorded);
    const advanced = f.ledger.sync('test', 1, 'run-test', 'wave1', [f.request('2', 1)]);
    expect(f.ledger.report('test', 1, oldVersion, report)).toEqual(advanced);
    expect(advanced.state.completed[0].items[0].observation).toEqual(report);
    const changed = { ...report, summary: 'Conflicting retry' };
    changed.output_digest = canonicalJsonDigest(changed.summary);
    expect(() => f.ledger.report('test', 1, advanced.version, changed)).toThrow();
    expect(f.ledger.resume('test', 1)).toEqual(advanced);
  } finally {
    f.close();
  }
});

test('null suspended step requires the authoritative Mastra success status', () => {
  const f = fixture();
  try {
    let state = f.ledger.sync('test', 1, 'run-test', 'wave0', [f.request('1')]);
    state = f.ledger.issueWave('test', 1, state.version);
    const item = state.state.items[0],
      summary = 'Observed terminal fixture';
    f.ledger.report('test', 1, state.version, {
      schema: 'VidaSessionObservation/v1',
      action_id: item.request.action_id,
      issue_id: item.issue_id,
      agent_id: 'fixture',
      tool_call_ref: 'fixture-terminal',
      status: 'reported_complete',
      summary,
      output_digest: canonicalJsonDigest(summary),
      evidence_refs: ['fixture:terminal'],
    });
    for (const status of ['failed', 'canceled', 'unknown'])
      expect(f.ledger.sync('test', 1, 'run-test', null, [], null, status).resume_status).toBe('blocked');
    expect(f.ledger.sync('test', 1, 'run-test', null, [], null, 'success').resume_status).toBe('complete');
    expect(f.ledger.resume('test', 1).resume_status).toBe('blocked');
  } finally {
    f.close();
  }
});

test('failed research observation is durable without a successful result or resume gate', () => {
  const f = fixture();
  try {
    let state = f.ledger.sync('test', 1, 'run-test', 'wave0', [f.request('1'), f.request('2'), f.request('3')]);
    state = f.ledger.issueWave('test', 1, state.version);
    for (const [index, item] of state.state.items.entries()) {
      const summary = index === 2 ? 'Observed failure' : 'Observed completion';
      state = f.ledger.report('test', 1, state.version, {
        schema: 'VidaSessionObservation/v1',
        action_id: item.request.action_id,
        issue_id: item.issue_id,
        agent_id: 'fixture-' + index,
        tool_call_ref: 'fixture-failed-wave-' + index,
        status: index === 2 ? 'reported_failed' : 'reported_complete',
        summary,
        output_digest: canonicalJsonDigest(summary),
        evidence_refs: ['fixture:wave'],
      });
    }
    expect(state.resume_status).toBe('blocked');
    expect(state.state.items.every((item) => item.observation !== null)).toBe(true);
    expect(state.state.items.some((item) => item.research_normalization)).toBe(false);
  } finally {
    f.close();
  }
});
