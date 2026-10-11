import { expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.js';
import {
  maintainedSourceInventory,
  runtimeManifestExecutableInventory,
} from '../tooling/maintained-source-inventory.ts';

test('maintained bin inventory lists each directory once for MJS and TS sources', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'maintained-source-inventory-'));
  try {
    function write(relative: string, contents: string): void {
      const target = path.join(root, relative);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, contents);
    }
    write('package.json', JSON.stringify({ files: ['bin/**', '!bin/excluded/**'] }));
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
