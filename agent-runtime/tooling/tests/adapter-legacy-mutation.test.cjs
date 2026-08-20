'use strict';
/* global vi */

const fs = require('fs');
const os = require('os');
const path = require('path');
const backlog = require('../../lib/backlog-adapter.cjs');
const legacy = require('../../lib/legacy-import.cjs');

function temporaryRoot(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function backlogRoot(prefix = 'backlog-mutation-quality-') {
  const cwd = temporaryRoot(prefix);
  fs.mkdirSync(path.join(cwd, 'backlog', 'tasks'), { recursive: true });
  return cwd;
}

function jsonResult(value) {
  return { status: 0, stdout: JSON.stringify(value), stderr: '' };
}

function codedError(message, code) {
  const error = /** @type {Error & { code: string }} */ (new Error(message));
  error.code = code;
  return error;
}

describe('Backlog adapter mutation contracts', () => {
  test('run preserves the pinned command, invocation capability, process options and output type', () => {
    const calls = [];
    const result = backlog.run(['task', 'list', '--json'], {
      platform: 'linux', cliExists: false, npxCommand: 'npx-custom', cwd: 'ledger-root', timeout: 1234,
      runner(binary, args, options) {
        calls.push({ binary, args, options });
        return { status: 0, stdout: 42, stderr: '' };
      }
    });
    expect(calls).toEqual([{
      binary: 'npx-custom',
      args: ['--yes', 'backlog.md@1.50.1', 'task', 'list', '--json'],
      options: { encoding: 'utf8', cwd: 'ledger-root', timeout: 1234, windowsHide: true }
    }]);
    expect(result).toEqual({ available: true, output: '42' });

    for (const [platform, expected] of [['win32', 'npx.cmd'], ['linux', 'npx']]) {
      let call;
      backlog.run([], { platform, cliExists: false, runner: (binary, args, options) => {
        call = { binary, args, options };
        return { status: 0, stdout: '', stderr: '' };
      } });
      expect(call).toEqual({
        binary: expected,
        args: ['--yes', 'backlog.md@1.50.1'],
        options: { encoding: 'utf8', cwd: undefined, timeout: 30000, windowsHide: true }
      });
    }

    let direct;
    backlog.run(['x'], { platform: '', cliExists: true, npxCommand: '', runner: (binary, args) => {
      direct = { binary, args };
      return { status: 0, stdout: '', stderr: '' };
    } });
    expect(direct.binary).toBe(process.execPath);
    expect(direct.args).toEqual([
      path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js'),
      '--yes', 'backlog.md@1.50.1', 'x'
    ]);

    const exists = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    try {
      let discoveredFallback;
      backlog.run([], { platform: 'linux', npxCommand: 'fallback', runner: binary => {
        discoveredFallback = binary;
        return { status: 0, stdout: '', stderr: '' };
      } });
      expect(discoveredFallback).toBe('fallback');

      let forced;
      backlog.run([], { platform: 'linux', cliExists: true, npxCommand: 'fallback', runner: binary => {
        forced = binary;
        return { status: 0, stdout: '', stderr: '' };
      } });
      expect(forced).toBe(process.execPath);

      exists.mockReturnValue(true);
      let discoveredLocal;
      backlog.run([], { platform: 'linux', npxCommand: 'fallback', runner: binary => {
        discoveredLocal = binary;
        return { status: 0, stdout: '', stderr: '' };
      } });
      expect(discoveredLocal).toBe(process.execPath);
    } finally { exists.mockRestore(); }
  });

  test('run reports each failure source with deterministic precedence', () => {
    for (const [result, error] of [
      [{ status: 1, stderr: ' stderr ', stdout: 'stdout', error: new Error('spawn') }, 'stderr'],
      [{ status: 1, stderr: '', stdout: ' stdout ', error: new Error('spawn') }, 'stdout'],
      [{ status: 0, stderr: '', stdout: '', error: new Error(' spawn ') }, 'spawn'],
      [{ status: 1, stderr: '', stdout: '' }, 'Backlog CLI unavailable']
    ]) {
      expect(backlog.run(['x'], { runner: () => result })).toEqual({ available: false, failure: true, error });
    }
    expect(backlog.discover('cwd', { runner: () => ({ status: 0, stdout: '', stderr: '' }) })).toEqual({ available: true, output: '', data: {} });
    expect(backlog.discover('cwd', { runner: () => ({ status: 0, stdout: '{', stderr: '' }) })).toEqual({ available: true, output: '{', failure: true, error: 'Backlog CLI did not return JSON' });
    expect(backlog.discover('cwd', { runner: () => ({ status: 1, stdout: '', stderr: ' offline ' }) })).toEqual({ available: false, failure: true, error: 'offline' });
    expect(backlog.run([], { runner: () => ({ status: 0, stdout: '  value  ', stderr: '' }) })).toEqual({ available: true, output: 'value' });
  });

  test('sanitization distinguishes non-strings and the exact 512-character boundary', () => {
    const objectUrl = { length: 1, toString: () => 'https://example.test/object' };
    expect(backlog.sanitizeLink(objectUrl)).toBeNull();
    const prefix = 'https://example.test/';
    const boundary = `${prefix}${'x'.repeat(512 - prefix.length)}`;
    const overBoundary = `${boundary}x`;
    expect(boundary).toHaveLength(512);
    expect(backlog.sanitizeLink(boundary)).toBe(boundary);
    expect(backlog.sanitizeLink(overBoundary)).toBeNull();
  });

  test('agent ids are fully anchored and public commands have exact argument contracts', () => {
    for (const id of ['AGENT-0', 'AGENT-01', 'AGENT-1X', 'SAMPLE-TENANT-0', '', 'agent-1']) {
      expect(backlog.read(id, 'cwd', { runner: () => { throw new Error('must not run'); } })).toEqual({ available: true, failure: true, error: 'invalid agent-style Backlog id' });
    }
    const calls = [];
    const runner = (binary, args) => {
      calls.push({ binary, args });
      return jsonResult({ task: { id: 'AGENT-1', updatedAt: 'r1' } });
    };
    expect(backlog.read('AGENT-1', 'cwd', { platform: 'linux', cliExists: false, npxCommand: 'npx-x', runner })).toMatchObject({ data: { task: { id: 'AGENT-1' } } });
    expect(backlog.read('SAMPLE-TENANT-SAMPLE-PROJECT-1', 'cwd', { platform: 'linux', cliExists: false, npxCommand: 'npx-x', runner })).toMatchObject({ available: true });
    expect(backlog.discover('cwd', { platform: 'linux', cliExists: false, npxCommand: 'npx-x', runner })).toMatchObject({ available: true });
    expect(calls.map(value => value.args)).toEqual([
      ['--yes', 'backlog.md@1.50.1', 'task', 'view', 'AGENT-1', '--json'],
      ['--yes', 'backlog.md@1.50.1', 'task', 'view', 'SAMPLE-TENANT-SAMPLE-PROJECT-1', '--json'],
      ['--yes', 'backlog.md@1.50.1', 'task', 'list', '--json']
    ]);
  });

  test('provider revisions preserve aliases, exact local tokens and task envelopes', () => {
    const cwd = backlogRoot();
    const taskFile = path.join(cwd, 'backlog', 'tasks', 'agent-7 exact.md');
    fs.writeFileSync(taskFile, 'revision-body');
    const stat = fs.statSync(taskFile);
    expect(backlog.providerRevision({}, 'AGENT-7', cwd)).toBe(`backlog.md@1.50.1:${stat.mtimeMs}:${stat.size}`);
    expect(backlog.providerRevision({}, 'AGENT-8', cwd)).toBe('backlog.md@1.50.1:missing');
    expect(backlog.providerRevision({ updatedAt: 'camel', updated_at: 'snake' }, 'AGENT-7', cwd)).toBe('camel');
    expect(backlog.providerRevision({ updatedAt: '', updated_at: 'snake' }, 'AGENT-7', cwd)).toBe('snake');
    expect(backlog.providerRevision(null, 'AGENT-7', cwd)).toBe(`backlog.md@1.50.1:${stat.mtimeMs}:${stat.size}`);
    const tasksMissing = temporaryRoot('backlog-tasks-missing-');
    fs.mkdirSync(path.join(tasksMissing, 'backlog'));
    expect(backlog.providerRevision({}, 'AGENT-7', tasksMissing)).toBe('backlog.md@1.50.1:missing');

    for (const data of [
      { task: { id: 'AGENT-7', updatedAt: 'r' } },
      { data: { id: 'AGENT-7', updatedAt: 'r' } },
      { id: 'AGENT-7', updatedAt: 'r' }
    ]) {
      expect(backlog.guardRead('AGENT-7', 'r', cwd, { runner: () => jsonResult(data) })).toEqual({ available: true, task: data.task || data.data || data, revision: 'r' });
    }
    expect(backlog.guardRead('AGENT-7', '', cwd, {})).toEqual({ available: true, failure: true, error: 'expected provider revision required' });
    expect(backlog.guardRead('AGENT-7', 'old', cwd, { runner: () => jsonResult({ id: 'AGENT-7', updatedAt: 'new' }) })).toEqual({
      available: true, drift: true, error: 'provider revision drift; ledger write blocked', task: { id: 'AGENT-7', updatedAt: 'new' }, revision: 'new'
    });
  });

  test('ledger lock retries only EEXIST through the exact deadline and always releases acquired locks', () => {
    const cwd = backlogRoot();
    const expectedLock = path.join(cwd, 'backlog', '.agent-runtime-write.lock');
    const events = [];
    let mkdirCalls = 0;
    const io = {
      mkdirSync(value) {
        events.push(['mkdir', value]);
        if (mkdirCalls++ === 0) throw codedError('busy', 'EEXIST');
      },
      rmdirSync(value) { events.push(['rmdir', value]); },
      now: (() => { const values = [100, 101]; return () => values.shift(); })(),
      wait(array, index, expected, timeout) { events.push(['wait', array.constructor.name, index, expected, timeout]); }
    };
    expect(backlog.withLedgerLock(cwd, () => 'worked', /** @type {any} */ (io))).toBe('worked');
    expect(events).toEqual([
      ['mkdir', expectedLock], ['wait', 'Int32Array', 0, 0, 25], ['mkdir', expectedLock], ['rmdir', expectedLock]
    ]);

    const boundaryEvents = [];
    let boundaryMkdir = 0;
    const boundaryIo = {
      mkdirSync() { if (boundaryMkdir++ === 0) throw codedError('busy', 'EEXIST'); },
      rmdirSync() { boundaryEvents.push('release'); },
      now: (() => { const values = [0, 10000]; return () => values.shift(); })(),
      wait() { boundaryEvents.push('wait'); }
    };
    expect(backlog.withLedgerLock(cwd, () => 'boundary', /** @type {any} */ (boundaryIo))).toBe('boundary');
    expect(boundaryEvents).toEqual(['wait', 'release']);

    const timeoutIo = {
      mkdirSync() { throw codedError('busy', 'EEXIST'); },
      rmdirSync() { throw new Error('must not release'); },
      now: (() => { const values = [0, 10001]; return () => values.shift(); })(),
      wait() { throw new Error('must not wait'); }
    };
    expect(backlog.withLedgerLock(cwd, () => 'never', /** @type {any} */ (timeoutIo))).toEqual({ available: true, failure: true, error: 'Backlog local write lock unavailable' });

    let foreignAttempts = 0;
    const foreignIo = {
      mkdirSync() { if (foreignAttempts++ === 0) throw codedError('permission', 'EPERM'); },
      rmdirSync() { throw new Error('must not release'); },
      now: () => 0,
      wait() { throw new Error('must not wait'); }
    };
    expect(backlog.withLedgerLock(cwd, () => 'must not run', /** @type {any} */ (foreignIo))).toEqual({ available: true, failure: true, error: 'Backlog local write lock unavailable' });
    expect(foreignAttempts).toBe(1);

    const releaseEvents = [];
    expect(() => backlog.withLedgerLock(cwd, () => { throw new Error('action failed'); }, /** @type {any} */ ({
      mkdirSync: value => releaseEvents.push(['mkdir', value]),
      rmdirSync: value => releaseEvents.push(['rmdir', value]),
      now: () => 0,
      wait() {}
    }))).toThrow('action failed');
    expect(releaseEvents).toEqual([['mkdir', expectedLock], ['rmdir', expectedLock]]);
  });

  test('mutations preserve exact edit commands, revision movement, intent and id checks', () => {
    const cwd = backlogRoot();
    const operations = [
      {
        invoke: (revision, runner) => backlog.transition('AGENT-2', 'Done', revision, cwd, { platform: 'linux', cliExists: false, npxCommand: 'npx-x', runner }),
        expected: ['--yes', 'backlog.md@1.50.1', 'task', 'edit', 'AGENT-2', '--status', 'Done'],
        after: { id: 'AGENT-2', updatedAt: 'after', status: 'done', title: 'Old' }
      },
      {
        invoke: (revision, runner) => backlog.createOrUpdate({ id: 'AGENT-2', title: 'New' }, revision, cwd, { platform: 'linux', cliExists: false, npxCommand: 'npx-x', runner }),
        expected: ['--yes', 'backlog.md@1.50.1', 'task', 'edit', 'AGENT-2', '--title', 'New'],
        after: { id: 'AGENT-2', updatedAt: 'after', status: 'Todo', title: 'New' }
      },
      {
        invoke: (revision, runner) => backlog.link('AGENT-2', 'https://example.test/a%20b', revision, cwd, { platform: 'linux', cliExists: false, npxCommand: 'npx-x', runner }),
        expected: ['--yes', 'backlog.md@1.50.1', 'task', 'edit', 'AGENT-2', '--comment', 'Derived link: https://example.test/a%20b', '--comment-author', 'codex'],
        after: { id: 'AGENT-2', updatedAt: 'after', status: 'Todo', title: 'Old' }
      }
    ];
    for (const operation of operations) {
      let call = 0;
      const commands = [];
      const runner = (_binary, args) => {
        commands.push(args);
        call += 1;
        if (call === 1) return jsonResult({ task: { id: 'AGENT-2', updatedAt: 'before', status: 'Todo', title: 'Old' } });
        if (call === 2) return jsonResult({ ok: true });
        return jsonResult({ task: operation.after });
      };
      expect(operation.invoke('before', runner)).toEqual({ available: true, before_revision: 'before', revision: 'after', task: operation.after });
      expect(commands).toEqual([
        ['--yes', 'backlog.md@1.50.1', 'task', 'view', 'AGENT-2', '--json'],
        operation.expected,
        ['--yes', 'backlog.md@1.50.1', 'task', 'view', 'AGENT-2', '--json']
      ]);
    }

    expect(backlog.createOrUpdate(null, 'r', cwd, {})).toEqual({ available: true, failure: true, error: 'valid AGENT-style id required' });
    expect(backlog.createOrUpdate({ id: 'AGENT-2', title: '' }, 'r', cwd, {})).toEqual({ available: true, failure: true, error: 'title required' });
    expect(backlog.transition('AGENT-2X', 'Done', 'r', cwd, {})).toEqual({ available: true, failure: true, error: 'invalid agent-style Backlog id' });
    expect(backlog.link('AGENT-2', '', 'r', cwd, {})).toEqual({ available: true, failure: true, error: 'valid sanitized id and link required' });
    expect(backlog.link('agent-2', 'https://example.test/a', 'r', cwd, {})).toEqual({ available: true, failure: true, error: 'valid sanitized id and link required' });
  });

  test('every mutation failure returns its complete fail-closed public result', () => {
    const cwd = backlogRoot();
    expect(backlog.transition('AGENT-2', 'Done', '', cwd, {})).toEqual({ available: true, failure: true, error: 'expected provider revision required' });
    expect(backlog.transition('AGENT-2', 'Done', 'before', cwd, { runner: () => ({ status: 1, stdout: '', stderr: 'read down' }) })).toEqual({ available: false, failure: true, error: 'read down' });
    expect(backlog.transition('AGENT-2', 'Done', 'before', cwd, { runner: () => jsonResult({ task: { id: 'AGENT-2', updatedAt: 'other' } }) })).toEqual({
      available: true, drift: true, error: 'provider revision drift; ledger write blocked', task: { id: 'AGENT-2', updatedAt: 'other' }, revision: 'other'
    });

    let calls = 0;
    const wrongPre = () => jsonResult({ task: { taskId: 'AGENT-9', updatedAt: 'before' } });
    expect(backlog.transition('AGENT-2', 'Done', 'before', cwd, { runner: wrongPre })).toEqual({ available: true, failure: true, error: 'provider returned wrong pre-write task id' });

    calls = 0;
    const writeFailure = () => ++calls === 1
      ? jsonResult({ task: { id: 'AGENT-2', updatedAt: 'before' } })
      : { status: 1, stdout: '', stderr: 'write down' };
    expect(backlog.transition('AGENT-2', 'Done', 'before', cwd, { runner: writeFailure })).toEqual({ available: false, failure: true, error: 'write down' });

    calls = 0;
    const readbackFailure = () => {
      calls += 1;
      if (calls === 1) return jsonResult({ task: { id: 'AGENT-2', updatedAt: 'before' } });
      if (calls === 2) return jsonResult({ ok: true });
      return { status: 1, stdout: '', stderr: 'readback down' };
    };
    expect(backlog.transition('AGENT-2', 'Done', 'before', cwd, { runner: readbackFailure })).toEqual({ available: false, failure: true, error: 'readback down' });

    calls = 0;
    const unchanged = () => {
      calls += 1;
      return calls === 2 ? jsonResult({ ok: true }) : jsonResult({ task: { id: 'AGENT-2', updatedAt: 'same', status: 'Done' } });
    };
    expect(backlog.transition('AGENT-2', 'Done', 'same', cwd, { runner: unchanged })).toEqual({ available: true, failure: true, error: 'provider revision did not advance after write' });

    calls = 0;
    const missingStatus = () => {
      calls += 1;
      if (calls === 1) return jsonResult({ task: { id: 'AGENT-2', updatedAt: 'before' } });
      if (calls === 2) return jsonResult({ ok: true });
      return jsonResult({ task: { id: 'AGENT-2', updatedAt: 'after' } });
    };
    expect(backlog.transition('AGENT-2', 'Done', 'before', cwd, { runner: missingStatus })).toEqual({ available: true, failure: true, error: 'post-write status verification failed' });

    calls = 0;
    const missingTitle = () => {
      calls += 1;
      if (calls === 1) return jsonResult({ task: { id: 'AGENT-2', updatedAt: 'before' } });
      if (calls === 2) return jsonResult({ ok: true });
      return jsonResult({ task: { id: 'AGENT-2', updatedAt: 'after' } });
    };
    expect(backlog.createOrUpdate({ id: 'AGENT-2', title: 'Wanted' }, 'before', cwd, { runner: missingTitle })).toEqual({ available: true, failure: true, error: 'post-write title verification failed' });

    calls = 0;
    const wrongPost = () => {
      calls += 1;
      if (calls === 1) return jsonResult({ task: { id: 'AGENT-2', updatedAt: 'before' } });
      if (calls === 2) return jsonResult({ ok: true });
      return jsonResult({ task: { task_id: 'AGENT-9', updatedAt: 'after' } });
    };
    expect(backlog.transition('AGENT-2', 'Done', 'before', cwd, { runner: wrongPost })).toEqual({ available: true, failure: true, error: 'provider returned wrong post-write task id' });

    calls = 0;
    const unavailableThenHealthy = () => {
      calls += 1;
      if (calls === 1) return { status: 1, stdout: '', stderr: 'first read down' };
      if (calls === 2) return jsonResult({ ok: true });
      return jsonResult({ task: { id: 'AGENT-2', updatedAt: 'after', status: 'Done' } });
    };
    expect(backlog.transition('AGENT-2', 'Done', 'before', cwd, { runner: unavailableThenHealthy })).toEqual({ available: false, failure: true, error: 'first read down' });

    calls = 0;
    const malformedThenHealthy = () => {
      calls += 1;
      if (calls === 1) return { status: 0, stdout: '{', stderr: '' };
      if (calls === 2) return jsonResult({ ok: true });
      return jsonResult({ task: { id: 'AGENT-2', updatedAt: 'after', status: 'Done' } });
    };
    expect(backlog.transition('AGENT-2', 'Done', 'before', cwd, { runner: malformedThenHealthy })).toEqual({ available: true, output: '{', failure: true, error: 'Backlog CLI did not return JSON' });

    calls = 0;
    const writeDownThenHealthy = () => {
      calls += 1;
      if (calls === 1) return jsonResult({ task: { id: 'AGENT-2', updatedAt: 'before' } });
      if (calls === 2) return { status: 1, stdout: '', stderr: 'write only down' };
      return jsonResult({ task: { id: 'AGENT-2', updatedAt: 'after', status: 'Done' } });
    };
    expect(backlog.transition('AGENT-2', 'Done', 'before', cwd, { runner: writeDownThenHealthy })).toEqual({ available: false, failure: true, error: 'write only down' });

    calls = 0;
    const exoticStatus = () => {
      calls += 1;
      if (calls === 1) return jsonResult({ task: { id: 'AGENT-2', updatedAt: 'before' } });
      if (calls === 2) return jsonResult({ ok: true });
      return jsonResult({ task: { id: 'AGENT-2', updatedAt: 'after' } });
    };
    expect(backlog.transition('AGENT-2', 'Stryker was here!', 'before', cwd, { runner: exoticStatus })).toEqual({ available: true, failure: true, error: 'post-write status verification failed' });

    const invalidCwd = path.join(temporaryRoot('backlog-invalid-cwd-'), 'file');
    fs.writeFileSync(invalidCwd, 'not a directory');
    expect(backlog.transition('AGENT-2', 'Done', '', invalidCwd, {})).toEqual({ available: true, failure: true, error: 'expected provider revision required' });
    expect(backlog.transition('INVALID', 'Done', 'revision', invalidCwd, {})).toEqual({ available: true, failure: true, error: 'invalid agent-style Backlog id' });
  });
});

describe('legacy importer mutation contracts', () => {
  test('canonical selection sorts records and preserves exact revision, receipt authority and malformed evidence flags', () => {
    const root = temporaryRoot('legacy-mutation-quality-');
    fs.writeFileSync(path.join(root, 'z.json'), '{}');
    fs.writeFileSync(path.join(root, 'a.json'), '{bad');
    const zStat = fs.statSync(path.join(root, 'z.json'));
    const aStat = fs.statSync(path.join(root, 'a.json'));
    const readFile = vi.spyOn(fs, 'readFileSync');
    let receipt;
    try {
      receipt = legacy.importLegacy(root, { selection: ['z.json', 'a.json'] });
      expect(readFile).toHaveBeenCalledWith(path.join(root, 'z.json'), 'utf8');
    }
    finally { readFile.mockRestore(); }
    expect(receipt.records.map(record => record.pointer)).toEqual(['a.json', 'z.json']);
    expect(receipt.records[0]).toEqual({
      pointer: 'a.json', source_revision: `${aStat.mtimeMs}:${aStat.size}`,
      parse_error: expect.any(String), historical: true, non_authoritative: true
    });
    expect(receipt.records[1].source_revision).toBe(`${zStat.mtimeMs}:${zStat.size}`);
    expect(receipt).toMatchObject({
      schema: 'LegacyImportReceipt/v1', mode: 'read_only', source_root: path.resolve(root), imported_at: expect.any(String),
      assertions: {
        historical_non_authoritative: true,
        does_not_consume_approvals: true,
        does_not_consume_leases: true,
        ready_for_decision_is_not_human_approval: true,
        static_is_not_runtime: true
      }
    });
  });

  test('preserves every supported alias, falsey value and evidence classification', () => {
    const root = temporaryRoot('legacy-alias-mutation-');
    const samples = /** @type {Array<[string, Record<string, any>]>} */ ([
      ['primary.json', { schema: false, $schema: 'ignored', id: '', run_id: 'ignored', version: 0, protocol_version: 9, status: 'ready_for_decision', approval: false, leases: [], findings: [], evidence: [{ class: 'runtime', path: 'primary.log' }], gaps: [] }],
      ['null-fallback.json', { schema: null, $schema: 'fallback-schema', status: 'reviewed', approval: 'direct', leases: 'direct-lease', findings: 'direct-finding' }],
      ['snake.json', { $schema: 'dollar', run_id: 'run', protocol_version: 2, state: 'runtime_failed', approved: 'approved', lease: 'lease', receipts: { evidenceClass: 'runtime-proof', path: 'runtime.log' }, gaps: 'gap' }],
      ['third.json', { protocol_id: 'protocol', session_id: 'session', schemaVersion: 3, disposition: 'runtime_failed', approval_status: 'historical', agent_leases: 'agent', results: [
        { evidence_type: 'test-report', pointer: 'test.xml' },
        { layer: 'code', id: 'commit' },
        { kind: 'other', path: 'decision.md' },
        'raw-pointer'
      ], issues: 'issue', open_gaps: 'open' }],
      ['item.json', { item_id: 'item' }],
      ['packet.json', { packet_id: 'packet' }]
    ]);
    for (const [name, value] of samples) fs.writeFileSync(path.join(root, name), JSON.stringify(value));
    const records = Object.fromEntries(legacy.importLegacy(root, { selection: samples.map(([name]) => name), timeBudgetMs: 2000 }).records.map(record => [record.pointer, record]));
    expect(records['primary.json']).toMatchObject({
      schema: false, id: '', version: 0,
      approval: { status: 'pending_human_decision', historical: true, non_authoritative: true },
      leases: [], findings: [], evidence: [{ class: 'Runtime', pointer: 'primary.log', historical: true, non_authoritative: true }], gaps: [],
      runtime: { status: 'not_asserted', historical: true, non_authoritative: true }
    });
    expect(records['snake.json']).toMatchObject({
      schema: 'dollar', id: 'run', version: 2,
      approval: { status: 'approved', historical: true, non_authoritative: true },
      leases: ['lease'], findings: ['gap'], gaps: ['gap'],
      evidence: [{ class: 'Runtime', pointer: 'runtime.log', historical: true, non_authoritative: true }],
      runtime: { status: 'runtime_failed', historical: true, non_authoritative: true }
    });
    expect(records['third.json']).toMatchObject({
      schema: 'protocol', id: 'session', version: 3,
      approval: { status: 'historical', historical: true, non_authoritative: true },
      leases: ['agent'], findings: ['issue'], gaps: ['open'],
      evidence: [
        { class: 'Static', pointer: 'test.xml', historical: true, non_authoritative: true },
        { class: 'Code', pointer: 'commit', historical: true, non_authoritative: true },
        { class: 'Decision', pointer: 'decision.md', historical: true, non_authoritative: true },
        { class: 'Decision', pointer: 'raw-pointer', historical: true, non_authoritative: true }
      ],
      runtime: { status: 'runtime_failed', historical: true, non_authoritative: true }
    });
    expect(records['item.json'].id).toBe('item');
    expect(records['packet.json'].id).toBe('packet');
    expect(records['null-fallback.json']).toMatchObject({ schema: 'fallback-schema', approval: { status: 'direct' }, leases: ['direct-lease'], findings: ['direct-finding'], evidence: [], gaps: [] });
  });

  test('runCli defaults to the sliced process argv and preserves exact JSON output', () => {
    const root = temporaryRoot('legacy-default-argv-');
    fs.writeFileSync(path.join(root, 'one.json'), '{}');
    const originalArgv = process.argv;
    const output = [];
    process.argv = ['node-binary', 'legacy-import.cjs', root];
    try {
      legacy.runCli(undefined, value => { output.push(value); });
    } finally {
      process.argv = originalArgv;
    }
    expect(output).toHaveLength(1);
    expect(output[0].endsWith('\n')).toBe(true);
    expect(JSON.parse(output[0])).toMatchObject({ source_root: path.resolve(root), schema: 'LegacyImportReceipt/v1', mode: 'read_only' });
    const writes=[];const spy=vi.spyOn(process.stdout,'write').mockImplementation(value=>{writes.push(String(value));return true;});
    try { legacy.runCli([root]); } finally { spy.mockRestore(); }
    expect(writes).toHaveLength(1);expect(writes[0].endsWith('\n')).toBe(true);expect(JSON.parse(writes[0])).toMatchObject({source_root:path.resolve(root),schema:'LegacyImportReceipt/v1'});
  });
});

