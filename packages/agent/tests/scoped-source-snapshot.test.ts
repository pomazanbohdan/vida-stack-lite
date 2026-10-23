import { describe, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
import { initializeProject } from '../bin/init.ts';
import { inspectScope } from '../bin/scope.ts';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import {
  compareScopedSourceSnapshots,
  snapshotDeclaredSources,
  snapshotRuntimePackageSources,
} from '../src/orchestration/scoped-source-snapshot.ts';
import * as snapshots from '../src/orchestration/scoped-source-snapshot.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { expectAsyncReturned, expectRejection } from './helpers/expect-rejection.ts';

type SnapshotReader = Parameters<typeof snapshotDeclaredSources>[0];
type SnapshotEntry = ReturnType<typeof snapshotDeclaredSources>['entries'][number];
type FixtureManifestInput = { path: string; bytes: number; sha256: string };
type FixtureManifest = { schema: 'VidaStandaloneBuild/v1'; inputs: FixtureManifestInput[] };

function manifestInput(entry: SnapshotEntry): FixtureManifestInput {
  if (!entry.exists || typeof entry.bytes !== 'number' || typeof entry.sha256 !== 'string')
    throw new Error(`Manifest fixture source is absent or malformed: ${entry.path}`);
  return { path: entry.path, bytes: entry.bytes, sha256: entry.sha256 };
}

function reader(files: Map<string, string>): SnapshotReader {
  return {
    fileExists: (name) => files.has(name),
    readBytes: (name) => {
      const contents = files.get(name);
      if (contents === undefined) throw new Error(`Missing fixture bytes for ${name}`);
      return Buffer.from(contents);
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function stringField(value: unknown, key: string): string {
  if (!isRecord(value)) throw new Error(`Expected string field ${key}`);
  const field = value[key];
  if (typeof field !== 'string') throw new Error(`Expected string field ${key}`);
  return field;
}

function recordArray(value: unknown, key: string): Record<string, unknown>[] {
  if (!isRecord(value)) throw new Error(`Expected record array ${key}`);
  const candidate = value[key];
  if (!Array.isArray(candidate) || !candidate.every(isRecord)) throw new Error(`Expected record array ${key}`);
  return candidate;
}

describe('cooperative scoped source evidence', () => {
  test('runtime endpoint evidence keeps generated exports and copied schemas separate from maintained Source targets', () => {
    const bundle = 'packages/agent';
    const files = new Map([
      [`${bundle}/src/index.ts`, 'maintained source'],
      [`${bundle}/dist/src/runtime.js`, 'old generated export'],
      [`${bundle}/schemas/probe.schema.json`, '{}'],
      [`${bundle}/dist/schemas/probe.schema.json`, '{}'],
    ]);
    const capture = () => snapshotDeclaredSources(reader(files), [...files.keys()]);
    const before = capture();
    files.set(`${bundle}/dist/src/runtime.js`, 'current generated export');
    const target = capture();
    expect(snapshots.runtimeEndpointSourceTargets(bundle, before, target, capture())).toEqual([]);
    expect(compareScopedSourceSnapshots(before, target).map((change) => change.path)).toEqual([
      `${bundle}/dist/src/runtime.js`,
    ]);
    files.set(`${bundle}/dist/src/runtime.js`, 'different installed bytes');
    expect(() => snapshots.runtimeEndpointSourceTargets(bundle, before, target, capture())).toThrow();
    files.set(`${bundle}/dist/src/runtime.js`, 'current generated export');
    files.set(`${bundle}/schemas/probe.schema.json`, '{"type":"string"}');
    files.set(`${bundle}/dist/schemas/probe.schema.json`, '{"type":"string"}');
    files.set(`${bundle}/src/index.ts`, 'changed maintained source');
    const withSchema = capture();
    expect(
      snapshots.runtimeEndpointSourceTargets(bundle, before, withSchema, capture()).map((entry) => entry.path),
    ).toEqual([`${bundle}/schemas/probe.schema.json`, `${bundle}/src/index.ts`]);
    files.set(`${bundle}/schemas/probe.schema.json`, '{"type":"boolean"}');
    expect(() => snapshots.runtimeEndpointSourceTargets(bundle, withSchema, capture(), capture())).toThrow(
      /copied schema/,
    );
    files.delete(`${bundle}/schemas/probe.schema.json`);
    expect(() => snapshots.runtimeEndpointSourceTargets(bundle, withSchema, capture(), capture())).toThrow(
      /copied schema/,
    );
    files.set(`${bundle}/schemas/probe.schema.json`, '{"type":"string"}');
    files.set(`${bundle}/dist/schemas/probe.schema.json`, '{"type":"number"}');
    expect(() => snapshots.runtimeEndpointSourceTargets(bundle, before, capture(), capture())).toThrow(/copied schema/);
    files.delete(`${bundle}/schemas/probe.schema.json`);
    expect(() => snapshots.runtimeEndpointSourceTargets(bundle, before, capture(), capture())).toThrow(/copied schema/);
    files.set(`${bundle}/schemas/probe.schema.json`, '{}');
    files.set(`${bundle}/dist/schemas/probe.schema.json`, '{}');
    files.set(`${bundle}/dist/src/unlisted.js`, 'unlisted output');
    expect(() => snapshots.runtimeEndpointSourceTargets(bundle, target, capture(), capture())).toThrow(
      /maintained generated inventory/,
    );
  });
  test('retains distinct runtime endpoint inventories and derives appeared and disappeared bytes', () => {
    const prefix = 'packages/agent';
    const files = new Map([
      ['src/old.ts', 'old'],
      ['src/shared.ts', 'before'],
    ]);
    const manifest = (values: Map<string, string>): FixtureManifest => ({
      schema: 'VidaStandaloneBuild/v1',
      inputs: snapshotDeclaredSources(reader(values), [...values.keys()]).entries.map(manifestInput),
    });
    const paths = (values: Map<string, string>): string[] => [...values.keys()].map((name) => `${prefix}/${name}`);
    const beforeManifest = manifest(files);
    const extraInput = manifest(new Map([['docs/unrelated.md', 'valid extra input']])).inputs[0];
    if (extraInput === undefined) throw new Error('Extra manifest fixture input is missing');
    beforeManifest.inputs.push(extraInput);
    const before = snapshots.snapshotRuntimeManifestSources(beforeManifest, prefix, paths(files));
    expect(before).toEqual(snapshotRuntimePackageSources(reader(files), prefix, paths(files)));
    const firstEntry = before.entries[0];
    const firstManifestInput = beforeManifest.inputs[0];
    if (firstEntry === undefined || firstManifestInput === undefined)
      throw new Error('Runtime manifest fixture entry is missing');
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
    const firstChange = changes[0];
    if (firstChange === undefined) throw new Error('Runtime endpoint fixture change is missing');
    expect(firstChange.before).toEqual({ path: `${prefix}/src/new.ts`, exists: false, bytes: null, sha256: null });
    expect(before.entries).toHaveLength(2);
    expect(after.entries).toHaveLength(2);
    expect(() => snapshots.compareRuntimeEndpointSnapshots({ ...before, digest: '0'.repeat(64) }, after)).toThrow();
    for (const entries of [
      [firstEntry, firstEntry],
      [{ ...firstEntry, path: '../outside.ts' }],
      [{ ...firstEntry, bytes: -1 }],
      [{ ...firstEntry, sha256: 'wrong' }],
      [{ ...firstEntry, extra: true }],
    ]) {
      const body = { schema: before.schema, entries };
      expect(() =>
        snapshots.compareRuntimeEndpointSnapshots({ ...body, digest: canonicalJsonDigest(body) }, after),
      ).toThrow();
    }
    for (const invalid of [
      { ...beforeManifest, schema: 'other' },
      { ...beforeManifest, inputs: [...beforeManifest.inputs, firstManifestInput] },
      { ...beforeManifest, inputs: beforeManifest.inputs.slice(1) },
      { ...beforeManifest, inputs: null },
      { ...beforeManifest, inputs: [] },
      { ...beforeManifest, inputs: Array(2049).fill(firstManifestInput) },
      { ...beforeManifest, inputs: [{ ...firstManifestInput, extra: true }] },
      { ...beforeManifest, inputs: [{ path: 'src/old.ts', bytes: 3 }] },
      { ...beforeManifest, inputs: [{ ...firstManifestInput, path: '../outside.ts' }] },
      { ...beforeManifest, inputs: [{ ...firstManifestInput, bytes: -1 }] },
      { ...beforeManifest, inputs: [{ ...firstManifestInput, sha256: 'wrong' }] },
    ])
      expect(() =>
        snapshots.snapshotRuntimeManifestSources(
          invalid,
          prefix,
          paths(
            new Map([
              ['src/old.ts', 'old'],
              ['src/shared.ts', 'before'],
            ]),
          ),
        ),
      ).toThrow();
    expect(() => snapshots.snapshotRuntimeManifestSources(beforeManifest, prefix, ['foreign/src/old.ts'])).toThrow();
  });
  test('public scope resolves equal, nested, shared and repository-evidence paths without widening selectors', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'scope-shared-fixture-'));
    const deadline = performance.now() + 60_000;
    let completed = false;
    try {
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
      const selectedProject = config.projects.find((project) => project.project_id === 'selected');
      if (selectedProject === undefined) throw new Error('Selected fixture project is missing');
      expect(selectedProject.code_selectors).toEqual(['products/selected/src/**']);
      writeFileSync(path.join(root, 'shared.txt'), 'shared');
      const base = ['--project-root', root, '--repository', 'scope-fixture'];
      const evidence = path.join(root, '.scope-cli-evidence');
      mkdirSync(evidence);
      let sequence = 0;
      const argumentsFor = (args: string[], projects: string[]) => [
        ...base,
        ...projects.flatMap((project) => ['--project', project]),
        ...args,
      ];
      const inspect = (args: string[], projects: string[] = ['selected']) => inspectScope(argumentsFor(args, projects));
      const invoke = (args: string[], projects: string[] = ['selected']) => {
        const remaining = Math.floor(deadline - performance.now());
        if (remaining <= 0) throw new Error('Public scope fixture deadline expired before native launch.');
        const child = spawnSync(
          process.execPath,
          [path.join(packageRoot, 'bin/scope.ts'), ...argumentsFor(args, projects)],
          {
            encoding: 'utf8',
            windowsHide: true,
            timeout: Math.min(4000, remaining),
          },
        );
        const prefix = path.join(evidence, String(sequence++));
        writeFileSync(prefix + '.stdout.log', child.stdout ?? '');
        writeFileSync(prefix + '.stderr.log', child.stderr ?? '');
        expect(child.error).toBeUndefined();
        expect(child.signal).toBeNull();
        expect(child.status === 0 || child.status === 1).toBe(true);
        return child;
      };
      const shared = invoke(['--path', 'products/selected/src/probe.txt', '--repository-path', 'shared.txt']);
      expect(shared.status).toBe(0);
      const sharedOutput: unknown = JSON.parse(shared.stdout);
      expect(recordArray(sharedOutput, 'entries').map((entry) => stringField(entry, 'path'))).toEqual([
        'products/selected/src/probe.txt',
        'shared.txt',
      ]);
      expect(sharedOutput).toEqual(
        await inspect(['--path', 'products/selected/src/probe.txt', '--repository-path', 'shared.txt']),
      );
      for (const paths of [
        ['--repository-path', 'products/selected/src/probe.txt'],
        ['--repository-path', 'products/foreign/src/probe.txt'],
      ])
        await expectRejection(
          inspect(['--path', 'wiki/skills/guide.md', ...paths]),
          'repository scope path is covered by a configured project; use --path',
        );
      await expectRejection(
        inspect(['--path', 'products/foreign/src/probe.txt']),
        'scope path is outside selected products',
      );
      expect(invoke(['--path', 'products/selected/src/probe.txt'], ['peer']).status).toBe(0);
      expect(invoke(['--path', 'wiki/skills/guide.md', '--path', 'docs/internal/reference.md']).status).toBe(0);
      expect(invoke(['--path', 'products/src/shared-probe.txt'], ['broad']).status).toBe(0);
      for (const args of [
        ['--path', 'wiki/skills/guide.md', '--repository-path', 'products/selected/src/probe.txt'],
        ['--path', 'wiki/skills/guide.md', '--repository-path', 'products/foreign/src/probe.txt'],
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
      if (performance.now() >= deadline) throw new Error('Public scope fixture deadline expired before cleanup.');
      completed = true;
    } finally {
      if (completed) rmSync(root, { recursive: true, force: true });
      else console.error('Retained failed or uncertain public scope fixture at ' + root);
    }
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
      const expected = await expectAsyncReturned(() => inspectScope(['--project-root', root, ...options]));
      expect(
        await expectAsyncReturned(() => inspectScope(['--project-root', root.split(path.sep).join('/'), ...options])),
      ).toEqual(expected);
      await Promise.resolve(expect(inspectScope(['--project-root', '.', ...options])).rejects.toThrow('absolute'));
      symlinkSync(root, alias, 'junction');
      await Promise.resolve(expect(inspectScope(['--project-root', alias, ...options])).rejects.toThrow());
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
      const workDirectory = path.join(root, '.agent/work/fixture-auto-scope');
      mkdirSync(workDirectory, { recursive: true });
      const intakePath = path.join(workDirectory, 'intake.json');
      const relative = (name: string) => `.agent/work/fixture-auto-scope/${name}`;
      const workItem = {
        schema: 'WorkItem/v1',
        id: 'fixture-auto-scope',
        provider: 'local',
        provider_type: 'Task',
        canonical_kind: 'task',
        intent: 'task_execution',
        project_id: 'plugin',
        title: 'Prepare an external consumer task',
        description: 'Verify scoped source preparation in an initialized external project.',
        labels: [],
        risk_flags: [],
      };
      const scope = {
        schema: 'ImplementationScope/v1',
        scope_id: 'scope-fixture-auto-scope',
        work_id: 'fixture-auto-scope',
        source_revision: expected.digest,
        ac_ids: ['AC-SCOPE-1'],
        allowed_paths: ['products/plugin/docs/spec.md'],
        implementation_paths: ['products/plugin/docs/spec.md'],
        documentation_paths: ['products/plugin/docs/spec.md'],
        changed_symbols: [],
        non_goals: ['Source mutation'],
        acceptance_trace: ['AC-SCOPE-1'],
        behavior_trace: ['SR-SCOPE-1'],
        test_trace: ['external consumer scope preparation'],
        diagnostic_trace: ['fixture'],
        attribution: { thread_id: 'fixture-native-session', pointer: relative('intake.json') },
        owner: 'fixture',
        created_at: new Date().toISOString(),
      };
      const acceptance = {
        schema: 'AcceptanceManifest/v1',
        id: 'acceptance-fixture-auto-scope',
        version: 1,
        ac_ids: scope.ac_ids,
        source: relative('scope.json'),
        scope: scope.scope_id,
        source_revision: expected.digest,
        contracts: [
          {
            id: 'AC-SCOPE-1',
            definition: 'Prepare the selected external consumer scope without widening its source paths.',
            sr: 'SR-SCOPE-1',
            evidence: ['scoped-source-snapshot.test.ts'],
          },
        ],
      };
      const intake = {
        schema: 'VidaLocalSessionIntake/v1',
        native_session_handle: 'fixture-native-session',
        work_item: workItem,
        scope_path: relative('scope.json'),
        acceptance_path: relative('acceptance.json'),
        runtime_code_paths: ['vida-agent/bin/run.mjs'],
        route: 'R2',
        risk: 'low',
        change_kind: 'documentation',
      };
      writeFileSync(path.join(workDirectory, 'scope.json'), JSON.stringify(scope));
      writeFileSync(path.join(workDirectory, 'acceptance.json'), JSON.stringify(acceptance));
      writeFileSync(intakePath, JSON.stringify(intake));
      const invoke = (values: string[]) =>
        spawnSync(process.execPath, [path.join(packageRoot, 'bin/run.ts'), ...values], {
          encoding: 'utf8',
          windowsHide: true,
        });
      const preparedResult = invoke([...args, '--intake', intakePath]);
      expect(preparedResult.status, preparedResult.stderr).toBe(0);
      const prepared: unknown = JSON.parse(preparedResult.stdout);
      expect(stringField(prepared, 'status')).toBe('prepared');
      expect(recordArray(prepared, 'action_statuses').every((action) => action.status === 'unissued')).toBe(true);
      const denied = invoke([
        ...args,
        '--intake',
        intakePath,
        '--issue-wave',
        'true',
        '--expected-revision',
        '1',
        '--expected-digest',
        expected.digest,
      ]);
      expect(denied.status).not.toBe(0);
      const deniedOutput: unknown = JSON.parse(denied.stderr);
      expect(deniedOutput).toMatchObject({ code: 'GAP-VIDA-RUN-CLI-001' });
    } finally {
      rmSync(alias, { recursive: true, force: true });
      // Preserve the isolated consumer evidence until this process exits; the session backend may retain SQLite handles.
    }
  }, 30_000);
  test('reads installed package bytes with retained logical runtime paths and rejects consumer paths', () => {
    const files = new Map([['bin/run.mjs', 'actual package entry']]);
    const declared = ['vida-agent/bin/run.mjs'];
    const snapshot = snapshotRuntimePackageSources(reader(files), 'vida-agent', declared);
    const snapshotEntry = snapshot.entries[0];
    if (snapshotEntry === undefined) throw new Error('Installed package snapshot entry is missing');
    const declaredPath = declared[0];
    if (declaredPath === undefined) throw new Error('Declared runtime fixture path is missing');
    expect(snapshotEntry.path).toBe(declaredPath);
    expect(snapshotEntry.exists).toBe(true);
    const installedBytes = files.get('bin/run.mjs');
    if (installedBytes === undefined) throw new Error('Installed package fixture bytes are missing');
    const logicalFiles = new Map<string, string>([[declaredPath, installedBytes]]);
    expect(snapshot.digest).toBe(snapshotDeclaredSources(reader(logicalFiles), declared).digest);
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
    const unstable: SnapshotReader = {
      fileExists: () => true,
      readBytes: () => Buffer.from(reads++ === 0 ? 'first' : 'second'),
    };
    expect(() => snapshotDeclaredSources(unstable, ['src/a.ts'])).toThrow(/changed during snapshot/);
  });
});
