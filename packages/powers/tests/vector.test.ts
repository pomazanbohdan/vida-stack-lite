import { afterAll, expect, test } from 'bun:test';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkVector, runCheckVectorCli, startCheckVectorCli } from '../scripts/vector.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tempRoots: string[] = [];

afterAll(() => { for (const directory of tempRoots) rmSync(directory, { recursive: true, force: true }); });

function fixture(): string {
  const directory = mkdtempSync(join(tmpdir(), 'vp-vector-'));
  tempRoots.push(directory);
  for (const file of ['docs/VECTOR.md', 'donors.yaml', 'corpus-map.json', 'source-baseline.json', 'catalog.json']) {
    mkdirSync(dirname(join(directory, file)), { recursive: true });
    cpSync(join(root, file), join(directory, file));
  }
  return directory;
}

function rewrite(directory: string, update: (text: string) => string): void {
  const path = join(directory, 'docs/VECTOR.md');
  writeFileSync(path, update(readFileSync(path, 'utf8')));
}

test('VECTOR.md matches processed donor pins and live corpus counts', () => {
  const result = checkVector(root);
  expect(result.issues).toEqual([]);
  expect(result.ok).toBe(true);
});

test('reports an unknown donor and a stale pin', () => {
  const unknown = fixture();
  rewrite(unknown, (text) => text.replace(/(\| 6 \| wondelai-skills[^\n]*\n)/u, `$1| 7 | missing-donor | \`${'a'.repeat(40)}\` | 0 | 0 | 0 | none | 3,278 / 3,429 / 1,258 | none |\n`));
  expect(checkVector(unknown).issues.map((issue) => issue.code)).toContain('VECTOR_DONOR_UNKNOWN');

  const stale = fixture();
  rewrite(stale, (text) => text.replace('c172996495bed0fcd26896a9416b2093fd7073f0', 'f'.repeat(40)));
  expect(checkVector(stale).issues.map((issue) => issue.code)).toContain('VECTOR_PIN_STALE');
});

test('reports an invalid latest result and missing sections or rows', () => {
  const invalid = fixture();
  rewrite(invalid, (text) => text.split('\n').map((line) => line.startsWith('| 8 | uupm') ? line.replace(/\| [\d,]+ \/ [\d,]+ \/ [\d,]+ \|/u, '| n/a |') : line).join('\n'));
  expect(checkVector(invalid).issues.map((issue) => issue.code)).toContain('VECTOR_RESULT_INVALID');

  const empty = fixture();
  rewrite(empty, () => '# Empty vector\n');
  expect(checkVector(empty).issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(['VECTOR_SECTION_MISSING', 'VECTOR_ROWS_MISSING']));
});

test('runs the vector CLI in process', () => {
  const output: string[] = [];
  expect(runCheckVectorCli(['--root', root], (text) => output.push(text))).toBe(0);
  expect(output[0]).toContain('vector check:');
  output.length = 0;
  expect(runCheckVectorCli(['--root', root, '--json'], (text) => output.push(text))).toBe(0);
  expect(JSON.parse(output[0]!).ok).toBe(true);
  output.length = 0;
  expect(runCheckVectorCli([], (text) => output.push(text))).toBe(0);
  expect(output[0]).toContain('vector check:');
  output.length = 0;
  expect(runCheckVectorCli(['--root', join(root, 'missing'), '--json'], (text) => output.push(text))).toBe(2);
  expect(JSON.parse(output[0]!).ok).toBe(false);
  output.length = 0;
  expect(runCheckVectorCli(['--root', join(root, 'missing')], (text) => output.push(text))).toBe(2);
  expect(output[0]).toContain('error:');
  output.length = 0;
  expect(startCheckVectorCli([process.execPath, join(root, 'scripts/vector.ts'), '--root', root], (text) => output.push(text))).toBe(0);
  expect(startCheckVectorCli([process.execPath, 'other'], (text) => output.push(text))).toBeUndefined();
});
