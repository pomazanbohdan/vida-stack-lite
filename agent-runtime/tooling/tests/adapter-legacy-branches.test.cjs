'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const backlog = require('../../lib/backlog-adapter.cjs');
const legacy = require('../../lib/legacy-import.cjs');

function workspace(prefix) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.mkdirSync(path.join(cwd, 'backlog', 'tasks'), { recursive: true });
  return cwd;
}

describe('Backlog public adapter exhaustive outcomes', () => {
  test('runner fallback, response defaults and local provider variants stay typed', () => {
    expect(backlog.run(['x'], { platform: 'linux', cliExists: false, npxCommand: 'agent-runtime-no-such-npx' })).toMatchObject({ available: false, failure: true });
    expect(backlog.run(['x'], { runner: () => ({ status: 0 }) })).toEqual({ available: true, output: '' });
    expect(backlog.discover(undefined, { runner: () => ({ status: 0 }) })).toMatchObject({ data: {} });
    expect(backlog.read('AGENT-1', undefined, { runner: () => ({ status: 0, stdout: JSON.stringify({ id: 'AGENT-1', updatedAt: 'raw' }) }) })).toMatchObject({ data: { id: 'AGENT-1' } });
    const cwd = workspace('backlog-branches-');
    expect(backlog.providerRevision({ updatedAt: 'u1' }, 'AGENT-1', cwd)).toBe('u1');
    expect(backlog.providerRevision({ updated_at: 'u2' }, 'AGENT-1', cwd)).toBe('u2');
    expect(backlog.providerRevision({}, 'AGENT-1', cwd)).toBe('backlog.md@1.50.1:missing');
    expect(backlog.providerRevision({}, 'AGENT-1', '')).toContain('backlog.md@1.50.1:');
    fs.writeFileSync(path.join(cwd, 'backlog', 'tasks', 'AGENT-1 task.md'), 'x');
    expect(backlog.providerRevision({}, 'AGENT-1', cwd)).toMatch(/backlog\.md@1\.50\.1:/);
    expect(backlog.guardRead('bad', 'r', cwd, { runner: () => ({ status: 0, stdout: '{}' }) })).toMatchObject({ failure: true });
    expect(backlog.guardRead('AGENT-1', 'raw', cwd, { runner: () => ({ status: 0, stdout: JSON.stringify({ id: 'AGENT-1', updatedAt: 'raw' }) }) })).toMatchObject({ task: { id: 'AGENT-1' } });
  });

  test('mutations block every pre/write/readback/post/intent failure', () => {
    const cwd = workspace('backlog-mutation-');
    fs.writeFileSync(path.join(cwd, 'backlog', 'tasks', 'AGENT-2 task.md'), 'x');
    const json = task => ({ status: 0, stdout: JSON.stringify(task), stderr: '' });
    let call = 0;
    const writeFailure = () => (++call === 1 ? json({ task: { id: 'AGENT-2', updatedAt: 'before' } }) : { status: 1, stdout: '', stderr: '' });
    expect(backlog.transition('AGENT-2', 'Done', 'before', cwd, { runner: writeFailure })).toMatchObject({ available: false });
    call = 0;
    const readbackFailure = () => (++call === 1 ? json({ task: { id: 'AGENT-2', updatedAt: 'before' } }) : call === 2 ? json({ task: { id: 'AGENT-2', updatedAt: 'write' } }) : { status: 0, stdout: '{' });
    expect(backlog.transition('AGENT-2', 'Done', 'before', cwd, { runner: readbackFailure })).toMatchObject({ failure: true, error: 'Backlog CLI did not return JSON' });
    call = 0;
    const wrongPost = () => { call++; if (call === 1) return json({ task: { id: 'AGENT-2', updatedAt: 'before' } }); if (call === 2) return json({ task: { id: 'AGENT-2', updatedAt: 'write' } }); return json({ task: { id: 'AGENT-3', updatedAt: 'after' } }); };
    expect(backlog.transition('AGENT-2', 'Done', 'before', cwd, { runner: wrongPost })).toMatchObject({ error: expect.stringMatching(/wrong post/) });
    call = 0;
    const titleMismatch = () => { call++; if (call === 1) return json({ task: { id: 'AGENT-2', updatedAt: 'before', title: 'old' } }); if (call === 2) return json({ task: { id: 'AGENT-2', updatedAt: 'write', title: 'old' } }); return json({ task: { id: 'AGENT-2', updatedAt: 'after', title: 'wrong' } }); };
    expect(backlog.createOrUpdate({ id: 'AGENT-2', title: 'wanted' }, 'before', cwd, { runner: titleMismatch })).toMatchObject({ failure: true, error: expect.stringMatching(/title/) });
    expect(backlog.createOrUpdate({ id: 'AGENT-2', title: '' }, 'r', cwd, {})).toMatchObject({ failure: true });
    expect(backlog.transition('bad', 'Done', 'r', cwd, {})).toMatchObject({ failure: true });
    expect(backlog.link('AGENT-2', 'ftp://bad', 'r', cwd, {})).toMatchObject({ failure: true });
    expect(backlog.isTerminalLedgerStatus('closed')).toBe(true);
    expect(backlog.isTerminalLedgerStatus('completed')).toBe(true);
    expect(backlog.isTerminalLedgerStatus('open')).toBe(false);

    const wrongAliases = () => json({ task: { taskId: 'AGENT-9', updatedAt: 'before' } });
    expect(backlog.transition('AGENT-2', 'Done', 'before', cwd, { runner: wrongAliases })).toMatchObject({ error: expect.stringMatching(/wrong pre/) });
    const wrongSnake = () => json({ task: { task_id: 'AGENT-9', updatedAt: 'before' } });
    expect(backlog.transition('AGENT-2', 'Done', 'before', cwd, { runner: wrongSnake })).toMatchObject({ error: expect.stringMatching(/wrong pre/) });
    expect(backlog.transition('AGENT-2', 'Done', '', cwd, {})).toMatchObject({ failure: true });
    expect(backlog.transition('AGENT-2', 'Done', 'old', cwd, { runner: () => json({ task: { id: 'AGENT-2', updatedAt: 'new' } }) })).toMatchObject({ drift: true });
    const statusMismatch = (() => { let n = 0; return () => { n++; return json({ task: { id: 'AGENT-2', updatedAt: n === 1 ? 'before' : n === 2 ? 'write' : 'after', status: 'Todo' } }); }; })();
    expect(backlog.transition('AGENT-2', 'Done', 'before', cwd, { runner: statusMismatch })).toMatchObject({ error: expect.stringMatching(/status/) });
    let lockTime = 0;
    const foreignLock = { mkdirSync: () => { const error = /** @type {Error & { code?: string }} */ (new Error('permission')); error.code = 'EPERM'; throw error; }, rmdirSync: () => {}, now: () => lockTime++, wait: () => {} };
    expect(backlog.withLedgerLock(cwd, () => 'never', /** @type {any} */ (foreignLock))).toMatchObject({ failure: true });
  });
});

describe('legacy public importer aliases and scalar normalization', () => {
  test('normalizes aliases, scalar lists and default writer output without authority', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-branches-'));
    fs.mkdirSync(path.join(root, 'empty'));
    fs.writeFileSync(path.join(root, 'aliases.json'), JSON.stringify({ $schema: 's', session_id: 'session', schemaVersion: 2, disposition: 'ready_for_decision', approval_status: 'old', agent_leases: 'lease', issues: 'issue', evidence: 'plain-pointer', open_gaps: 'gap' }));
    fs.writeFileSync(path.join(root, 'empty-evidence.json'), JSON.stringify({ results: [{}] }));
    const receipt = legacy.importLegacy(root);
    const record = receipt.records.find(value => value.pointer === 'aliases.json');
    expect(record).toMatchObject({ schema: 's', id: 'session', version: 2, approval: { status: 'pending_human_decision' }, leases: ['lease'], findings: ['issue'], gaps: ['gap'], runtime: { status: 'not_asserted' } });
    expect(record.evidence).toMatchObject([{ class: 'Decision', pointer: 'plain-pointer' }]);
    expect(receipt.records.find(value => value.pointer === 'empty-evidence.json').evidence).toMatchObject([{ class: 'Decision', pointer: null }]);
    const original = process.stdout.write;
    const output = [];
    process.stdout.write = value => { output.push(value); return true; };
    try { legacy.runCli([root]); } finally { process.stdout.write = original; }
    expect(JSON.parse(output.join('')).mode).toBe('read_only');
    expect(() => legacy.runCli([], () => {})).toThrow(/Usage/);
  });
});
