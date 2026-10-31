import { expect, test } from 'bun:test';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.js';
import { createInitializationBundle } from './helpers/init-bundle.ts';
import {
  maintainedSourceInventory,
  runtimeManifestExecutableInventory,
  runtimeExecutableInventory,
  standaloneBuildInputInventory,
  selectMaintainedSourcePaths,
} from '../tooling/maintained-source-inventory.ts';

test.serial('package selection compiles patterns once per call and observes changed inputs', () => {
  const files = Object.freeze(['src/nested/b.ts', 'src/a.ts', 'src/a.ts', 'src/private/no.ts', 'bin/main.ts']);
  const patterns = ['src/**', 'bin/*.ts', '!src/private/**'];
  const originalRegExp = globalThis.RegExp;
  const observations: { selected: string[]; constructions: number }[] = [];
  let constructions = 0;
  globalThis.RegExp = new Proxy(originalRegExp, {
    construct(target, args, newTarget): RegExp {
      constructions += 1;
      const result: unknown = Reflect.construct(target, args, newTarget);
      if (!(result instanceof originalRegExp)) throw new Error('RegExp constructor returned a foreign value');
      return result;
    },
  });
  try {
    observations.push({ selected: selectMaintainedSourcePaths(files, patterns), constructions });
    patterns[0] = 'src/*.ts';
    patterns[1] = '!bin/**';
    const previous = constructions;
    observations.push({
      selected: selectMaintainedSourcePaths(files, patterns),
      constructions: constructions - previous,
    });
  } finally {
    globalThis.RegExp = originalRegExp;
  }
  expect(observations.map(({ selected }) => selected)).toEqual([
    ['bin/main.ts', 'src/a.ts', 'src/a.ts', 'src/nested/b.ts'],
    ['src/a.ts', 'src/a.ts'],
  ]);
  for (const observation of observations) expect(observation.constructions).toBe(patterns.length);
  expect(files).toEqual(['src/nested/b.ts', 'src/a.ts', 'src/a.ts', 'src/private/no.ts', 'bin/main.ts']);
});

test('package selection retains literal metacharacters, exclusions and repeated stateless matching', () => {
  const files = ['src/a+b.ts', 'src/ab.ts', 'src/a+bXts', 'src/deep/a+b.ts', 'src/a+b.ts'];
  expect(selectMaintainedSourcePaths(files, ['src/a+b.ts'])).toEqual(['src/a+b.ts', 'src/a+b.ts']);
  expect(selectMaintainedSourcePaths(files, ['src/*.ts', '!src/a+b.ts'])).toEqual(['src/ab.ts']);
  expect(selectMaintainedSourcePaths(files, ['!src/**'])).toEqual([]);
  expect(selectMaintainedSourcePaths(files, [])).toEqual([]);
  expect(selectMaintainedSourcePaths([], ['src/**'])).toEqual([]);
});

test('initialization resource copying preserves sources and excludes exact custody sidecars', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-resource-copy-custody-'));
  try {
    const source = path.join(root, 'source'),
      destination = path.join(root, 'consumer'),
      uuid = '01234567-89ab-cdef-0123-456789abcdef',
      retained = ['schemas/public.json', 'schemas/.hidden.json', 'schemas/.public.json.cas.lock.extra/real.json'],
      excluded = [
        'schemas/.public.json.cas.lock',
        'schemas/.public.json.cas.lock.reclaim/owner.json',
        `schemas/..public.json.cas.lock.reclaim.${uuid}.released/owner.json`,
        'schemas/public.json.lock.reclaim/owner.json',
        `schemas/.vida-resource-lock-${'a'.repeat(64)}.lock.reclaim/owner.json`,
      ];
    for (const file of [...retained, ...excluded]) {
      mkdirSync(path.dirname(path.join(source, file)), { recursive: true });
      writeFileSync(path.join(source, file), `${file}\n`);
    }
    const bundle = createInitializationBundle(source, destination, ['schemas']);
    for (const file of retained)
      expect(readFileSync(path.join(bundle, file))).toEqual(readFileSync(path.join(source, file)));
    for (const file of excluded) {
      expect(() => lstatSync(path.join(bundle, file))).toThrow(/ENOENT/);
      expect(readFileSync(path.join(source, file), 'utf8')).toBe(`${file}\n`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('runtime executable inventory excludes lock reclaim metadata while retaining hidden schema sources', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-runtime-inventory-cas-'));
  try {
    function write(relative: string, contents: string): void {
      const target = path.join(root, relative);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, contents);
    }
    write('package.json', JSON.stringify({ files: ['src/**'], bin: {} }));
    write('src/host.ts', 'export const host = true;\n');
    write('tooling/maintained-source-inventory.ts', 'export {};\n');
    write('schemas/.x.schema.json', '{"title":"real hidden schema"}\n');
    write('schemas/.ordinary-hidden/kept.schema.json', '{"title":"ordinary hidden source"}\n');
    write('schemas/.x.schema.json.cas.lock.reclaim.extra/owner.json', '{"title":"ordinary lookalike"}\n');
    write('schemas/foo.schema.json', '{"title":"ordinary schema"}\n');
    write('schemas/foo.schema.json.lock.reclaim.extra/owner.json', '{"title":"ordinary lock lookalike"}\n');
    write('TESTING.md', 'testing input\n');
    write('.bun-version', '1.4.2\n');
    write('bun.lock', '{}\n');
    write('bunfig.toml', '[install]\n');
    write('tooling/build-standalone.ts', 'export {};\n');
    write('tooling/pack-sdk.ts', 'export {};\n');
    write('tooling/owned-staging.ts', 'export {};\n');
    write('tooling/owned-cleanup-completion.ts', 'export {};\n');
    write('instructions/runtime.md', 'runtime instruction\n');
    write('templates/agent.md', 'agent template\n');
    for (const file of ['documentation/transition-proof.js', 'index.js', 'runtime.js', 'trusted-host.js'])
      write(`dist/src/${file}`, 'export {};\n');
    write('dist/schemas/runtime.schema.json', '{"title":"dist schema"}\n');

    const uuid = '01234567-89ab-cdef-0123-456789abcdef';
    const metadata = [
      `schemas/.x.schema.json.cas.lock.reclaim/owner.json`,
      `schemas/..x.schema.json.cas.lock.reclaim.${uuid}.released/owner.json`,
      `schemas/..x.schema.json.cas.lock.reclaim.${uuid}.reclaimed/owner.json`,
      'schemas/foo.schema.json.lock.reclaim/owner.json',
      `schemas/.foo.schema.json.lock.reclaim.${uuid}.released/owner.json`,
      `schemas/.foo.schema.json.lock.reclaim.${uuid}.reclaimed/owner.json`,
      `schemas/.vida-resource-lock-${'a'.repeat(64)}.lock.reclaim/owner.json`,
    ];
    const ownerBytes = Buffer.from(
      `{"schema":"SafeRepositoryAccessReclaimGuard/v1","owner_pid":${process.pid},"owner_token":"${uuid}"}\n`,
    );
    for (const file of metadata) write(file, ownerBytes.toString());

    const ownerSnapshots = metadata.map((file) => {
      const target = path.join(root, file);
      const stat = lstatSync(target);
      return {
        file,
        bytes: readFileSync(target),
        dev: stat.dev,
        ino: stat.ino,
        size: stat.size,
        mtimeMs: stat.mtimeMs,
      };
    });
    const retainedSources = [
      'schemas/.x.schema.json',
      'schemas/.ordinary-hidden/kept.schema.json',
      'schemas/.x.schema.json.cas.lock.reclaim.extra/owner.json',
      'schemas/foo.schema.json',
      'schemas/foo.schema.json.lock.reclaim.extra/owner.json',
    ];
    const schemaSnapshots = retainedSources.map((file) => ({ file, bytes: readFileSync(path.join(root, file)) }));
    const inventory = runtimeExecutableInventory(root, 'source');
    expect(inventory).toContain('src/host.ts');
    expect(inventory).toContain('schemas/.x.schema.json');
    expect(inventory).toContain('schemas/.ordinary-hidden/kept.schema.json');
    expect(inventory).toContain('schemas/.x.schema.json.cas.lock.reclaim.extra/owner.json');
    expect(inventory).toContain('schemas/foo.schema.json');
    expect(inventory).toContain('schemas/foo.schema.json.lock.reclaim.extra/owner.json');
    for (const file of metadata) expect(inventory).not.toContain(file);
    const standaloneInputs = standaloneBuildInputInventory(root);
    // bin/bun.ts imports this leaf directly; it must reach the native payload.
    expect(standaloneInputs).toContain('tooling/owned-cleanup-completion.ts');
    expect(standaloneInputs).toContain('src/host.ts');
    expect(standaloneInputs).toContain('schemas/.x.schema.json');
    expect(standaloneInputs).toContain('schemas/.ordinary-hidden/kept.schema.json');
    expect(standaloneInputs).toContain('schemas/.x.schema.json.cas.lock.reclaim.extra/owner.json');
    expect(standaloneInputs).toContain('schemas/foo.schema.json');
    expect(standaloneInputs).toContain('schemas/foo.schema.json.lock.reclaim.extra/owner.json');
    expect(standaloneInputs).toContain('instructions/runtime.md');
    expect(standaloneInputs).toContain('templates/agent.md');
    expect(standaloneInputs).toContain('dist/src/index.js');
    expect(standaloneInputs).toContain('dist/schemas/runtime.schema.json');
    for (const file of metadata) expect(standaloneInputs).not.toContain(file);
    for (const snapshot of ownerSnapshots) {
      const target = path.join(root, snapshot.file);
      const after = lstatSync(target);
      expect(readFileSync(target)).toEqual(snapshot.bytes);
      expect({ dev: after.dev, ino: after.ino, size: after.size, mtimeMs: after.mtimeMs }).toEqual({
        dev: snapshot.dev,
        ino: snapshot.ino,
        size: snapshot.size,
        mtimeMs: snapshot.mtimeMs,
      });
    }
    for (const snapshot of schemaSnapshots)
      expect(readFileSync(path.join(root, snapshot.file))).toEqual(snapshot.bytes);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('maintained bin inventory lists each directory once for MJS and TS sources', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'maintained-source-inventory-'));
  try {
    function write(relative: string, contents: string): void {
      const target = path.join(root, relative);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, contents);
    }
    write('package.json', JSON.stringify({ files: ['bin/**', '!bin/excluded/**'], bin: { vida: './bin/z.ts' } }));
    for (const file of ['bin/a.mjs', 'bin/z.ts', 'bin/nested/c.ts', 'bin/excluded/x.ts']) write(file, 'export {};\n');
    write('bin/readme.md', 'ignored\n');
    const safeAccess = requireSafeRepositoryAccess(root);
    const counts = new Map<string, number>();
    const access = {
      ...safeAccess,
      listFiles(target: string, label: string): readonly string[] {
        if (target === 'bin' || target.startsWith('bin/')) counts.set(target, (counts.get(target) ?? 0) + 1);
        return safeAccess.listFiles(target, label);
      },
    };
    const inventory = maintainedSourceInventory(root, access);
    expect(inventory.binSources).toEqual(['bin/a.mjs', 'bin/nested/c.ts', 'bin/z.ts']);
    expect(inventory.publicBinSources).toEqual(['bin/z.ts']);
    expect([...counts.entries()].sort(([left], [right]) => left.localeCompare(right))).toEqual([
      ['bin', 1],
      ['bin/excluded', 1],
      ['bin/nested', 1],
    ]);
    expect(inventory.repositoryOnlySources).toEqual(['bin/excluded/x.ts']);
    expect(
      runtimeManifestExecutableInventory([{ path: 'bin/z.ts' }, { path: 'bin/a.mjs' }, { path: 'bin/readme.md' }]),
    ).toEqual(['bin/a.mjs', 'bin/z.ts']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('historical executable inventory preserves only tooling paths present in its selected manifest', () => {
  const nativeTool = 'tooling/maintained-source-inventory.ts';
  const historicalTool = 'tooling/maintained-source-inventory.mjs';
  expect(runtimeManifestExecutableInventory([{ path: nativeTool }, { path: 'tooling/unrelated.ts' }])).toEqual([
    nativeTool,
  ]);
  expect(runtimeManifestExecutableInventory([{ path: historicalTool }])).toEqual([historicalTool]);
  expect(runtimeManifestExecutableInventory([{ path: nativeTool }, { path: historicalTool }])).toEqual([
    historicalTool,
    nativeTool,
  ]);
  expect(runtimeManifestExecutableInventory([{ path: 'src/config/runtime-config.ts' }])).toEqual([
    'src/config/runtime-config.ts',
  ]);
});

test('captured inventory manifest selects Source without reopening a changed package file', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-captured-inventory-'));
  try {
    mkdirSync(path.join(root, 'src'));
    mkdirSync(path.join(root, 'bin'));
    writeFileSync(path.join(root, 'src/first.ts'), 'export function first() {}');
    writeFileSync(path.join(root, 'src/second.ts'), 'export function second() {}');
    const captured = Buffer.from(JSON.stringify({ files: ['src/first.ts'], bin: {} }));
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({ files: ['src/second.ts'], bin: {} }));
    expect(maintainedSourceInventory(root, undefined, captured).mutationSources).toEqual(['src/first.ts']);
    expect(maintainedSourceInventory(root).mutationSources).toEqual(['src/second.ts']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
