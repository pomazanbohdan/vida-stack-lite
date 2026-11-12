import { afterEach, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCensus } from '../scripts/sbvf-census.ts';

type Dict = Record<string, unknown>;
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cleanups: string[] = [];
afterEach(async () => { await Promise.all(cleanups.splice(0).map(path => rm(path, { recursive: true, force: true }))); });

function familyManifest(familyId: string, variants: string[]): Dict {
  return { schema: 'SBVFFamilyManifest/v1', families: [{ family_id: familyId, title: 't', summary: 's', rationale: 'r', variants, approved_by: 'devin', approved_at: '2026-11-20T00:00:00Z' }] };
}

async function manifestIssues(dir: string, family: Dict): Promise<{ valid: boolean; issues: string }> {
  const familyPath = join(dir, 'family.json');
  await writeFile(familyPath, JSON.stringify(family));
  const census = buildCensus(packageRoot, 0.7, familyPath);
  const validation = census.manifestValidation as Dict;
  return { valid: validation.valid === true, issues: ((validation.issues as string[] | undefined) ?? []).join('\n') };
}

test('census rejects family members sharing one SPLIT rowKey with subspan bindings', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vp-sbvf-guards-')); cleanups.push(dir);
  const result = await manifestIssues(dir, familyManifest('family-guard-same-row', [
    'uupm-react-avoid-unnecessary-effects-derive-data-during-render',
    'uupm-react-avoid-unnecessary-effects-handle-events-directly',
  ]));
  expect(result.valid).toBe(false);
  expect(result.issues).toContain('same CSV row');
  expect(result.issues).toContain('whole-cell only');
  expect(result.issues).toContain('SPLIT row');
});

test('census rejects a subspan-bound member on a distinct row without a rowKey collision', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vp-sbvf-guards-')); cleanups.push(dir);
  const result = await manifestIssues(dir, familyManifest('family-guard-subspan', [
    'uupm-winui-support-keyboard-navigation-tab-navigation',
    'uupm-react-perf-defer-await',
  ]));
  expect(result.valid).toBe(false);
  expect(result.issues).toContain('whole-cell only');
  expect(result.issues).toContain('SPLIT row');
  expect(result.issues).not.toContain('same CSV row');
});

test('census accepts whole-cell members bound to distinct rows', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vp-sbvf-guards-')); cleanups.push(dir);
  const result = await manifestIssues(dir, familyManifest('family-guard-clean', [
    'uupm-react-perf-defer-await',
    'uupm-react-perf-promise-all-parallel',
  ]));
  expect(result.valid).toBe(true);
  expect(result.issues).toBe('');
});
