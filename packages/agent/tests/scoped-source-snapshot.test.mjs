import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
import { initializeProject } from '../bin/init.mjs';
import { inspectScope } from '../bin/scope.mjs';
import {
  compareScopedSourceSnapshots,
  snapshotDeclaredSources,
  snapshotRuntimePackageSources,
} from '../src/orchestration/scoped-source-snapshot.ts';

function reader(files) {
  return {
    fileExists: (name) => files.has(name),
    readBytes: (name) => Buffer.from(files.get(name)),
  };
}

describe('cooperative scoped source evidence', () => {
  test('public scope snapshots explicit shared files and rejects unsafe or project-covered shared paths', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'scope-shared-fixture-'));
    mkdirSync(path.join(root, '.git'), { recursive: true });
    for (const project of ['selected', 'foreign']) {
      mkdirSync(path.join(root, 'products', project, 'src'), { recursive: true });
      writeFileSync(path.join(root, 'products', project, 'src/probe.txt'), project);
    }
    await initializeProject({
      projectRoot: root,
      repository: 'scope-fixture',
      projectMappings: ['selected=products/selected', 'foreign=products/foreign'],
    });
    writeFileSync(path.join(root, 'shared.txt'), 'shared');
    const base = ['--project-root', root, '--repository', 'scope-fixture', '--project', 'selected'];
    const invoke = (args) =>
      spawnSync(process.execPath, [path.join(packageRoot, 'bin/scope.mjs'), ...base, ...args], {
        encoding: 'utf8',
        windowsHide: true,
      });
    const shared = invoke(['--path', 'products/selected/src/probe.txt', '--repository-path', 'shared.txt']);
    expect(shared.status).toBe(0);
    expect(JSON.parse(shared.stdout).entries.map((entry) => entry.path)).toEqual([
      'products/selected/src/probe.txt',
      'shared.txt',
    ]);
    for (const args of [
      ['--repository-path', 'products/selected/src/probe.txt'],
      ['--repository-path', 'products/foreign/src/probe.txt'],
      ['--path', 'products/foreign/src/probe.txt'],
      ['--repository-path', 'shared.txt', '--repository-path', 'shared.txt'],
      ['--repository-path', '../escape.txt'],
    ])
      expect(invoke(args).status).not.toBe(0);
    mkdirSync(path.join(root, 'shared-dir'));
    writeFileSync(path.join(root, 'shared-dir/probe.txt'), 'shared');
    symlinkSync(path.join(root, 'shared-dir'), path.join(root, 'linked-dir'), 'junction');
    expect(invoke(['--repository-path', 'linked-dir/probe.txt']).status).not.toBe(0);
  }, 60_000);

  test('derives prepare scope in an external consumer and normalizes public absolute roots without admitting unsafe paths', async () => {
    const scratch = path.join(tmpdir(), 'scope-input-fixtures');
    mkdirSync(scratch, { recursive: true });
    const root = mkdtempSync(path.join(scratch, 'consumer-'));
    const alias = root + '-alias';
    try {
      mkdirSync(path.join(root, 'products/plugin'), { recursive: true });
      await initializeProject({
        projectRoot: root,
        repository: 'scope-input-fixture',
        projectMappings: ['plugin=products/plugin'],
      });
      const options = [
        '--repository',
        'scope-input-fixture',
        '--project',
        'plugin',
        '--path',
        'products/plugin/docs/spec.md',
      ];
      const expected = await inspectScope(['--project-root', root, ...options]);
      expect(await inspectScope(['--project-root', root.split(path.sep).join('/'), ...options])).toEqual(expected);
      await expect(inspectScope(['--project-root', '.', ...options])).rejects.toThrow('absolute');
      symlinkSync(root, alias, 'junction');
      await expect(inspectScope(['--project-root', alias, ...options])).rejects.toThrow();
      const args = [
        '--project-root',
        root.split(path.sep).join('/'),
        '--repository',
        'scope-input-fixture',
        '--project',
        'plugin',
        '--work-path',
        'products/plugin',
        '--work-id',
        'fixture-auto-scope',
        '--attempt',
        '1',
        '--team',
        'default-development',
        '--kind',
        'task',
        '--intent',
        'task_execution',
        '--workflow',
        'task_execution',
        '--scope-path',
        'products/plugin/docs/spec.md',
      ];
      const invoke = (values) =>
        spawnSync(process.execPath, [path.join(packageRoot, 'bin/run.mjs'), ...values], {
          encoding: 'utf8',
          windowsHide: true,
        });
      const preparedResult = invoke(args);
      expect(preparedResult.status, preparedResult.stderr).toBe(0);
      const prepared = JSON.parse(preparedResult.stdout);
      expect(prepared.status).toBe('prepared');
      expect(prepared.action_statuses.every((action) => action.status === 'unissued')).toBe(true);
      const denied = invoke([
        ...args,
        '--issue-wave',
        'true',
        '--expected-revision',
        '1',
        '--expected-digest',
        expected.digest,
      ]);
      expect(denied.status).not.toBe(0);
      expect(JSON.parse(denied.stderr)).toMatchObject({ code: 'GAP-VIDA-RUN-CLI-001' });
    } finally {
      rmSync(alias, { recursive: true, force: true });
      // Preserve the isolated consumer evidence until this process exits; the session backend may retain SQLite handles.
    }
  }, 30_000);
  test('reads installed package bytes with retained logical runtime paths and rejects consumer paths', () => {
    const files = new Map([['bin/run.mjs', 'actual package entry']]);
    const declared = ['vida-agent/bin/run.mjs'];
    const snapshot = snapshotRuntimePackageSources(reader(files), 'vida-agent', declared);
    expect(snapshot.entries[0].path).toBe(declared[0]);
    expect(snapshot.entries[0].exists).toBe(true);
    expect(snapshot.digest).toBe(
      snapshotDeclaredSources(reader(new Map([[declared[0], files.get('bin/run.mjs')]])), declared).digest,
    );
    expect(() => snapshotRuntimePackageSources(reader(files), 'vida-agent', ['products/plugin/src/main.ts'])).toThrow(
      'outside the configured package identity',
    );
    expect(() => snapshotRuntimePackageSources(reader(files), 'vida-agent', ['vida-agent/../outside.ts'])).toThrow();
  });
  test('sorts exact paths and reports only affected changed, appeared and disappeared files', () => {
    const files = new Map([
      ['src/b.ts', 'b0'],
      ['src/a.ts', 'a0'],
    ]);
    const before = snapshotDeclaredSources(reader(files), ['src/b.ts', 'src/a.ts', 'src/c.ts']);
    expect(before.entries.map((entry) => entry.path)).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
    files.set('src/a.ts', 'a1');
    files.delete('src/b.ts');
    files.set('src/c.ts', 'c1');
    files.set('unrelated.ts', 'not in scope');
    const after = snapshotDeclaredSources(reader(files), ['src/b.ts', 'src/a.ts', 'src/c.ts']);
    expect(compareScopedSourceSnapshots(before, after).map(({ path, kind }) => [path, kind])).toEqual([
      ['src/a.ts', 'changed'],
      ['src/b.ts', 'disappeared'],
      ['src/c.ts', 'appeared'],
    ]);
    expect(compareScopedSourceSnapshots(after, after)).toEqual([]);
  });

  test('rejects traversal, duplicate paths, changed scope and unstable reads', () => {
    const files = new Map([['src/a.ts', 'a0']]);
    for (const paths of [['../a'], ['/absolute'], ['src\\a.ts'], ['src/a.ts', 'src/a.ts']])
      expect(() => snapshotDeclaredSources(reader(files), paths)).toThrow();
    const before = snapshotDeclaredSources(reader(files), ['src/a.ts']);
    const otherScope = snapshotDeclaredSources(reader(files), ['src/a.ts', 'src/b.ts']);
    expect(() => compareScopedSourceSnapshots(before, otherScope)).toThrow(/different scope/);
    let reads = 0;
    const unstable = {
      fileExists: () => true,
      readBytes: () => Buffer.from(reads++ === 0 ? 'first' : 'second'),
    };
    expect(() => snapshotDeclaredSources(unstable, ['src/a.ts'])).toThrow(/changed during snapshot/);
  });
});
