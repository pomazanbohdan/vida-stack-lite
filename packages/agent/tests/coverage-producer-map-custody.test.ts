import { expect, test } from 'bun:test';
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coverageToolInputs } from '../tooling/bun-coverage-evidence.mjs';
import { validateCoverageReport } from '../tooling/bun-coverage-report-validator.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function write(root: string, file: string, bytes: string | Uint8Array): void {
  const absolute = path.join(root, file);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, bytes);
}
function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected fixture record');
  return value as Record<string, unknown>;
}

function restoreOwnedDirectoryWrites(directory: string): void {
  chmodSync(directory, 0o700);
  for (const entry of readdirSync(directory, { withFileTypes: true }))
    if (entry.isDirectory()) restoreOwnedDirectoryWrites(path.join(directory, entry.name));
  // Never follow or change the installed dependency symlink target.
}

// Real producer over inert owned Source, not candidate quality or historical evidence.
// Its final CRAP stage must fail because this fixture has no published Git baseline.
test('real producer and consumer preserve pristine initialization maps while merging executed counters', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'coverage-map-custody-'));
  let passed = false;
  try {
    write(root, 'package.json', JSON.stringify({ files: ['src/**'], scripts: {} }));
    write(root, '.bun-version', readFileSync(path.join(packageRoot, '.bun-version')));
    write(root, 'src/sum.ts', 'export function sum(a: number, b: number): number { return a + b; }\n');
    write(
      root,
      'tests/sum.test.ts',
      "import {test,expect} from 'bun:test'; import {sum} from '../src/sum.ts'; test('owned sum assertion',()=>expect(sum(2,3)).toBe(5));\n",
    );
    for (const file of coverageToolInputs) {
      if (file === '.bun-version' || file === 'package.json') continue;
      if (file.startsWith('tooling/')) {
        const dest = path.join(root, file);
        mkdirSync(path.dirname(dest), { recursive: true });
        cpSync(path.join(packageRoot, file), dest);
      } else write(root, file, 'inert fixture capture input\n');
    }
    write(root, 'bunfig.toml', '[test]\nroot = "./tests"\n');
    write(root, 'schemas/inert.json', '{}\n');
    write(root, 'templates/inert.yaml', 'inert: true\n');
    write(root, 'instructions/inert.md', 'inert\n');
    symlinkSync(path.join(packageRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir');
    const child = spawnSync(process.execPath, [path.join(root, 'tooling/run-bun-coverage.ts')], {
      cwd: root,
      encoding: 'utf8',
      timeout: 15000,
      maxBuffer: 4 * 1024 * 1024,
    });
    write(root, 'child.stdout.log', child.stdout ?? '');
    write(root, 'child.stderr.log', child.stderr ?? '');
    expect(child.error).toBeUndefined();
    expect(child.signal).toBeNull();
    expect(child.status).toBe(1);
    expect(child.stderr).toMatch(/cannot identify the Source repository root/u);
    expect(child.stderr).toMatch(/Ran 1 test across 1 file/u);
    const reportPath = path.join(root, 'coverage/bun-unified/coverage-final.json');
    const report = record(JSON.parse(readFileSync(reportPath, 'utf8')));
    const manifest = record(JSON.parse(readFileSync(path.join(root, String(report.manifest_path)), 'utf8')));
    expect(report.source_maps).toEqual(manifest.source_maps);
    const source = path.join(root, 'src/sum.ts');
    const initialization = record(record(report.source_maps)[source]);
    const executed = record(record(report.coverage)[source]);
    expect(Object.values(record(initialization.f))).toEqual([0]);
    expect(Object.values(record(executed.f))).toEqual([1]);
    const result = await validateCoverageReport(reportPath, root, { requireFullCoverage: false });
    expect(result.processes).toBe(1);
    const canonical = result.canonical_source_maps[source];
    if (!canonical) throw new Error('Canonical Source map missing');
    expect(Object.values(canonical.f)).toEqual([0]);
    expect(canonical).not.toBe(result.report.source_maps[source]);
    expect(canonical).not.toBe(result.report.coverage[source]);
    expect(result.report.shards[0]?.status).toBe(0);
    passed = true;
  } finally {
    if (passed) {
      restoreOwnedDirectoryWrites(root);
      rmSync(root, { recursive: true, force: true });
    } else console.error('Preserved failed real map fixture: ' + root);
  }
}, 20000);
