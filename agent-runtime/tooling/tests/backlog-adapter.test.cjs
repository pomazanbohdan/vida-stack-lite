'use strict';
const adapter = require('../../lib/backlog-adapter.cjs');
const fs = require('fs');
const os = require('os');
const path = require('path');

function runnerFactory() {
  let task = { id: 'AGENT-8', updatedAt: '2026-08-16T12:00:00Z', status: 'Todo', title: 'Initial' };
  return {
    runner(_binary, args) {
      if (args.includes('edit')) {
        const statusIndex = args.indexOf('--status');
        const titleIndex = args.indexOf('--title');
        task = { ...task, status: statusIndex >= 0 ? args[statusIndex + 1] : task.status, title: titleIndex >= 0 ? args[titleIndex + 1] : task.title, updatedAt: '2026-08-16T12:01:00Z' };
      }
      return { status: 0, stdout: JSON.stringify({ task }), stderr: '' };
    },
    task: () => task
  };
}

describe('derived Backlog adapter', () => {
  test('read guard and transitions require the current provider revision', () => {
    const fake = runnerFactory();
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'backlog-adapter-'));
    fs.mkdirSync(path.join(cwd, 'backlog'));
    const first = adapter.guardRead('AGENT-8', fake.task().updatedAt, cwd, { runner: fake.runner });
    expect(first.drift).toBeUndefined();
    const changed = adapter.transition('AGENT-8', 'In Progress', first.revision, cwd, { runner: fake.runner });
    expect(changed.task.status).toBe('In Progress');
    expect(adapter.guardRead('AGENT-8', first.revision, cwd, { runner: fake.runner }).drift).toBe(true);
  });

  test('ledger values never close runtime or delivery', () => {
    expect(adapter.sanitizeLink('https://example.test/work/8?token=secret')).toBeNull();
    expect(adapter.sanitizeLink('https://example.test/work/8')).toBe('https://example.test/work/8');
    expect(adapter.isTerminalLedgerStatus('Done')).toBe(true);
    expect(adapter.closesDeliveryOrRuntime({ status: 'Done' })).toBe(false);
  });

  test('public mutation seams verify readback, intent, revision, failures and lock cleanup', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'backlog-seams-'));
    fs.mkdirSync(path.join(cwd, 'backlog', 'tasks'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'backlog', 'tasks', 'AGENT-9 task.md'), 'x');
    let task = { id: 'AGENT-9', status: 'Todo', title: 'Old' }, calls = 0;
    const runner = (_bin, args) => {
      calls++;
      if (args.includes('list')) return { status: 0, stdout: JSON.stringify({ task }), stderr: '' };
      if (args.includes('edit')) { task = { ...task, status: args.includes('--status') ? args[args.indexOf('--status') + 1] : task.status, title: args.includes('--title') ? args[args.indexOf('--title') + 1] : task.title, updatedAt: `2026-08-16T12:00:0${calls}Z` }; }
      return { status: 0, stdout: JSON.stringify({ task }), stderr: '' };
    };
    const revision = adapter.providerRevision({}, 'AGENT-9', cwd);
    expect(revision).toContain('backlog.md@1.50.1:');
    expect(adapter.discover(cwd, { runner }).available).toBe(true);
    expect(adapter.createOrUpdate({ id: 'AGENT-9', title: 'New' }, revision, cwd, { runner }).task.title).toBe('New');
    const current = task.updatedAt;
    expect(adapter.reconcile({ id: 'AGENT-9', title: 'Again' }, current, cwd, { runner }).task.title).toBe('Again');
    expect(adapter.link('AGENT-9', 'https://example.test/a', task.updatedAt, cwd, { runner }).available).toBe(true);
    expect(adapter.createOrUpdate({ id: 'bad', title: 'x' }, 'x', cwd, { runner }).failure).toBe(true);
    expect(adapter.link('bad', 'https://example.test/a', 'x', cwd, { runner }).failure).toBe(true);
    expect(adapter.run(['x'], { runner: () => ({ status: 1, stderr: 'down' }) })).toMatchObject({ available: false, error: 'down' });
    expect(adapter.discover(cwd, { runner: () => ({ status: 0, stdout: '{', stderr: '' }) }).failure).toBe(true);
    const lock = path.join(cwd, 'backlog', '.agent-runtime-write.lock'); fs.mkdirSync(lock);
    expect(adapter.withLedgerLock(cwd, () => 'never').failure).toBe(true);
    fs.rmdirSync(lock);
  }, 15_000);

  test('CLI capability selection covers Windows/Linux and direct/fallback commands', () => {
    for (const sample of [
      { platform: 'win32', cliExists: true, expected: process.execPath },
      { platform: 'linux', cliExists: true, expected: process.execPath },
      { platform: 'win32', cliExists: false, npxCommand: 'npx-win', expected: 'npx-win' },
      { platform: 'linux', cliExists: false, npxCommand: 'npx-linux', expected: 'npx-linux' }
    ]) {
      let command;
      const result = adapter.run(['task', 'list'], { ...sample, runner: (binary, args) => { command = { binary, args }; return { status: 0, stdout: '{}', stderr: '' }; } });
      expect(result.available).toBe(true);
      expect(command.binary).toBe(sample.expected);
      expect(command.args).toContain('backlog.md@1.50.1');
    }
  });

  test('ZOMBIES input boundaries and provider fault/readback branches fail closed', () => {
    for (const value of [undefined, null, '', 'x'.repeat(513), 'https://a.test/a\nnext', 'ftp://a.test/a', 'https://u:p@a.test/a', 'https://a.test/a?q=1', 'https://a.test/a#x', 'not a url']) expect(adapter.sanitizeLink(value)).toBeNull();
    expect(adapter.sanitizeLink('http://a.test/a/b')).toBe('http://a.test/a/b');
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'backlog-faults-'));
    fs.mkdirSync(path.join(cwd, 'backlog', 'tasks'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'backlog', 'tasks', 'AGENT-10 task.md'), 'one');
    expect(adapter.providerRevision({}, 'AGENT-404', cwd)).toBe('backlog.md@1.50.1:missing');
    expect(adapter.providerRevision({ updated_at: 'r2' }, 'AGENT-10', cwd)).toBe('r2');
    expect(adapter.guardRead('AGENT-10', '', cwd, { runner: () => ({ status: 0, stdout: '{}' }) }).failure).toBe(true);
    expect(adapter.guardRead('AGENT-10', 'r', cwd, { runner: () => ({ status: 1, stdout: '', stderr: '' }) }).available).toBe(false);
    expect(adapter.run(['x'], { runner: () => ({ status: 0, stdout: '', stderr: '', error: new Error('spawn') }) }).available).toBe(false);

    const wrong = { id: 'AGENT-11', updatedAt: 'r1', status: 'Todo', title: 'old' };
    const wrongRunner = () => ({ status: 0, stdout: JSON.stringify({ task: wrong }), stderr: '' });
    expect(adapter.transition('AGENT-10', 'Done', 'r1', cwd, { runner: wrongRunner }).error).toMatch(/wrong pre-write/);

    let calls = 0;
    const unchanged = { id: 'AGENT-10', updatedAt: 'same', status: 'Todo', title: 'old' };
    const unchangedRunner = () => ({ status: 0, stdout: JSON.stringify({ task: unchanged }), stderr: '' });
    expect(adapter.transition('AGENT-10', 'Done', 'same', cwd, { runner: unchangedRunner }).error).toMatch(/did not advance/);
    const mismatchRunner = (_bin, args) => {
      calls++;
      const task = calls === 1 ? { id: 'AGENT-10', updatedAt: 'before', status: 'Todo', title: 'old' } : args.includes('edit') ? { id: 'AGENT-10', updatedAt: 'write', status: 'Todo', title: 'old' } : { id: 'AGENT-10', updatedAt: 'after', status: 'Todo', title: 'old' };
      return { status: 0, stdout: JSON.stringify({ data: task }), stderr: '' };
    };
    expect(adapter.transition('AGENT-10', 'Done', 'before', cwd, { runner: mismatchRunner }).error).toMatch(/post-write status/);
    expect(adapter.createOrUpdate({ id: 'AGENT-10' }, 'before', cwd, { runner: mismatchRunner }).failure).toBe(true);
    expect(adapter.transition('INVALID', 'Done', 'before', cwd, { runner: mismatchRunner }).failure).toBe(true);
  });
});
