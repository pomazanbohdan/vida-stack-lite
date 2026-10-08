import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
import { initializeProject } from '../bin/init.mjs';
import { inspectScope } from '../bin/scope.mjs';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import {
  compareScopedSourceSnapshots,
  snapshotDeclaredSources,
  snapshotRuntimePackageSources,
} from '../src/orchestration/scoped-source-snapshot.ts';
import * as snapshots from '../src/orchestration/scoped-source-snapshot.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';

function reader(files) {
  return {
    fileExists: (name) => files.has(name),
    readBytes: (name) => Buffer.from(files.get(name)),
  };
}

describe('cooperative scoped source evidence', () => {
  test('retains distinct runtime endpoint inventories and derives appeared and disappeared bytes', () => {
    const prefix = 'packages/agent';
    const files = new Map([['src/old.ts', 'old'], ['src/shared.ts', 'before']]);
    const manifest = (values) => ({
      schema: 'VidaStandaloneBuild/v1',
      inputs: snapshotDeclaredSources(reader(values), [...values.keys()]).entries.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })),
    });
    const paths = (values) => [...values.keys()].map((name) => `${prefix}/${name}`);
    const beforeManifest = manifest(files);
    beforeManifest.inputs.push(manifest(new Map([['docs/unrelated.md', 'valid extra input']])).inputs[0]);
    const before = snapshots.snapshotRuntimeManifestSources(beforeManifest, prefix, paths(files));
    expect(before).toEqual(snapshotRuntimePackageSources(reader(files), prefix, paths(files)));
    files.delete('src/old.ts');
    files.set('src/shared.ts', 'after');
    files.set('src/new.ts', 'new');
    const afterManifest = manifest(files);
    const after = snapshots.snapshotRuntimeManifestSources(afterManifest, prefix, paths(files));
    expect(after).toEqual(snapshotRuntimePackageSources(reader(files), prefix, paths(files)));
    expect(() => compareScopedSourceSnapshots(before, after)).toThrow('different scope');
    const changes = snapshots.compareRuntimeEndpointSnapshots(before, after);
    expect(changes.map(({ path, kind }) => [path, kind])).toEqual([
      [`${prefix}/src/new.ts`, 'appeared'],
      [`${prefix}/src/old.ts`, 'disappeared'],
      [`${prefix}/src/shared.ts`, 'changed'],
    ]);
    expect(changes[0].before).toEqual({ path: `${prefix}/src/new.ts`, exists: false, bytes: null, sha256: null });
    expect(before.entries).toHaveLength(2);
    expect(after.entries).toHaveLength(2);
    expect(() => snapshots.compareRuntimeEndpointSnapshots({ ...before, digest: '0'.repeat(64) }, after)).toThrow();
    for (const entries of [
      [before.entries[0], before.entries[0]],
      [{ ...before.entries[0], path: '../outside.ts' }],
      [{ ...before.entries[0], bytes: -1 }],
      [{ ...before.entries[0], sha256: 'wrong' }],
      [{ ...before.entries[0], extra: true }],
    ]) {
      const body = { schema: before.schema, entries };
      expect(() => snapshots.compareRuntimeEndpointSnapshots({ ...body, digest: canonicalJsonDigest(body) }, after)).toThrow();
    }
    for (const invalid of [
      { ...beforeManifest, schema: 'other' },
      { ...beforeManifest, inputs: [...beforeManifest.inputs, beforeManifest.inputs[0]] },
      { ...beforeManifest, inputs: beforeManifest.inputs.slice(1) },
      { ...beforeManifest, inputs: null },
      { ...beforeManifest, inputs: [] },
      { ...beforeManifest, inputs: Array(2049).fill(beforeManifest.inputs[0]) },
      { ...beforeManifest, inputs: [{ ...beforeManifest.inputs[0], extra: true }] },
      { ...beforeManifest, inputs: [{ path: 'src/old.ts', bytes: 3 }] },
      { ...beforeManifest, inputs: [{ ...beforeManifest.inputs[0], path: '../outside.ts' }] },
      { ...beforeManifest, inputs: [{ ...beforeManifest.inputs[0], bytes: -1 }] },
      { ...beforeManifest, inputs: [{ ...beforeManifest.inputs[0], sha256: 'wrong' }] },
    ]) expect(() => snapshots.snapshotRuntimeManifestSources(invalid, prefix, paths(new Map([['src/old.ts', 'old'], ['src/shared.ts', 'before']])))).toThrow();
    expect(() => snapshots.snapshotRuntimeManifestSources(beforeManifest, prefix, ['foreign/src/old.ts'])).toThrow();
  });
  test('public scope resolves equal, nested, shared and repository-evidence paths without widening selectors', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'scope-shared-fixture-'));
    mkdirSync(path.join(root, '.git'), { recursive: true });
    for (const project of ['selected', 'foreign'])
      mkdirSync(path.join(root, 'products', project, 'src'), { recursive: true });
    mkdirSync(path.join(root, 'products/src'), { recursive: true });
    mkdirSync(path.join(root, 'wiki/skills'), { recursive: true });
    mkdirSync(path.join(root, 'docs/internal'), { recursive: true });
    writeFileSync(path.join(root, 'products/selected/src/probe.txt'), 'selected');
    writeFileSync(path.join(root, 'products/foreign/src/probe.txt'), 'foreign');
    writeFileSync(path.join(root, 'products/src/shared-probe.txt'), 'broad-root');
    writeFileSync(path.join(root, 'wiki/skills/guide.md'), 'informational skills path');
    writeFileSync(path.join(root, 'docs/internal/reference.md'), 'informational internal path');
    await initializeProject({
      projectRoot: root,
      repository: 'scope-fixture',
      projectMappings: [
        'selected=products/selected',
        'peer=products/selected',
        'broad=products',
        'foreign=products/foreign',
      ],
    });
    const config = loadRuntimeConfig(root);
    expect(config.projects.find((project) => project.project_id === 'selected').code_selectors).toEqual([
      'products/selected/src/**',
    ]);
    writeFileSync(path.join(root, 'shared.txt'), 'shared');
    const base = ['--project-root', root, '--repository', 'scope-fixture'];
    const invoke = (args, projects = ['selected']) =>
      spawnSync(
        process.execPath,
        [
          path.join(packageRoot, 'bin/scope.mjs'),
          ...base,
          ...projects.flatMap((project) => ['--project', project]),
          ...args,
        ],
        {
          encoding: 'utf8',
          windowsHide: true,
        },
      );
    const shared = invoke(['--path', 'products/selected/src/probe.txt', '--repository-path', 'shared.txt']);
    expect(shared.status).toBe(0);
    expect(JSON.parse(shared.stdout).entries.map((entry) => entry.path)).toEqual([
      'products/selected/src/probe.txt',
      'shared.txt',
    ]);
    expect(invoke(['--path', 'products/selected/src/probe.txt'], ['peer']).status).toBe(0);
    expect(invoke(['--path', 'wiki/skills/guide.md', '--path', 'docs/internal/reference.md']).status).toBe(0);
    expect(invoke(['--path', 'products/src/shared-probe.txt'], ['broad']).status).toBe(0);
    for (const args of [
      ['--repository-path', 'products/selected/src/probe.txt'],
      ['--repository-path', 'products/foreign/src/probe.txt'],
      ['--path', 'products/foreign/src/probe.txt'],
      ['--repository-path', 'shared.txt', '--repository-path', 'shared.txt'],
      ['--repository-path', '../escape.txt'],
    ])
      expect(invoke(args).status).not.toBe(0);
    expect(invoke(['--path', 'products/foreign/src/probe.txt'], ['broad']).status).not.toBe(0);
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
