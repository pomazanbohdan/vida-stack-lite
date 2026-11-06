import { afterAll, expect, test } from 'bun:test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateAgainstSchema } from '../skills/vp-mode/scripts/schema.ts';
import {
  buildSourceBaseline,
  checkSourceUpdates,
  packageRoot,
  parseDonorManifest,
  parseSourceBaseline,
  runBuildBaselineCli,
  runCheckSourceUpdatesCli,
  serializeSourceBaseline,
  SourceUpdateError,
} from '../scripts/source-updates.ts';

const here = dirname(fileURLToPath(import.meta.url));
const directories: string[] = [];
const headA = 'a'.repeat(40);
const headB = 'b'.repeat(40);

async function makeFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'vp-source-updates-'));
  directories.push(root);
  const donorRoot = join(root, '.tmp', 'donors', 'd1');
  await mkdir(join(donorRoot, '.git'), { recursive: true });
  await writeFile(join(donorRoot, '.git', 'HEAD'), `${headA}\n`, 'utf8');
  await writeFile(join(donorRoot, 'a.md'), 'alpha\n', 'utf8');
  await writeFile(join(donorRoot, 'b.md'), 'beta\n', 'utf8');
  await writeFile(
    join(root, 'donors.yaml'),
    `schema: vida-powers-donors/v1\nlocal_root: .tmp/donors\ndonors:\n  - id: d1\n    local_path: d1\n    head_sha: ${headA}\n    license: MIT\n`,
    'utf8',
  );
  await writeFile(
    join(root, 'corpus-map.json'),
    JSON.stringify({
      schema: 'VPCorpusMap/v1',
      donors: {
        d1: {
          source_revision: headA,
          files: {
            'a.md': { status: 'converted', instruction_ids: ['i1', 'i2'] },
            'b.md': { status: 'split', instruction_ids: ['i2'] },
            'rejected.md': { status: 'rejected', instruction_ids: [] },
          },
        },
      },
    }),
    'utf8',
  );
  return root;
}

async function writeBaseline(root: string): Promise<string> {
  const path = join(root, 'source-baseline.json');
  await writeFile(path, serializeSourceBaseline(buildSourceBaseline(root)), 'utf8');
  return path;
}

afterAll(async () => {
  await Promise.all(directories.map((directory) => rm(directory, { recursive: true, force: true })));
});

test('builds a deterministic baseline for active map files only', async () => {
  const root = await makeFixture();
  const baseline = buildSourceBaseline(root);
  expect(baseline.schema).toBe('VPSourceBaseline/v1');
  expect([...baseline.donors.keys()]).toEqual(['d1']);
  const donor = baseline.donors.get('d1');
  expect(donor?.revision).toBe(headA);
  expect([...(donor?.files.keys() ?? [])]).toEqual(['a.md', 'b.md']);
  expect(donor?.files.get('a.md')?.bytes).toBe(6);
  expect(donor?.files.get('a.md')?.sha256).toMatch(/^[0-9a-f]{64}$/);
  const roundTrip = parseSourceBaseline(JSON.parse(serializeSourceBaseline(baseline)) as unknown);
  expect([...(roundTrip.donors.get('d1')?.files.keys() ?? [])]).toEqual(['a.md', 'b.md']);
});

test('serialized baseline matches the published schema', async () => {
  const root = await makeFixture();
  const serialized = JSON.parse(serializeSourceBaseline(buildSourceBaseline(root))) as unknown;
  const schema = JSON.parse(readFileSync(join(here, '../config/vpsourcebaseline.v1.schema.json'), 'utf8')) as Record<string, unknown>;
  expect(validateAgainstSchema(serialized, schema)).toEqual([]);
});

test('reports current and covered instructions when hashes and revisions match', async () => {
  const root = await makeFixture();
  const baseline = buildSourceBaseline(root);
  const report = checkSourceUpdates(root, baseline);
  expect(report.summary).toMatchObject({
    donors: 1,
    files: 2,
    coveredInstructions: 2,
    affectedInstructions: 0,
    current: 2,
    stale: 0,
    missing: 0,
    unknown: 0,
  });
});

test('reports pin-stale when only the donor revision advanced', async () => {
  const root = await makeFixture();
  const baseline = buildSourceBaseline(root);
  await writeFile(
    join(root, 'donors.yaml'),
    `schema: vida-powers-donors/v1\nlocal_root: .tmp/donors\ndonors:\n  - id: d1\n    local_path: d1\n    head_sha: ${headB}\n    license: MIT\n`,
    'utf8',
  );
  const report = checkSourceUpdates(root, baseline);
  expect(report.summary.current).toBe(0);
  expect(report.summary['pin-stale']).toBe(2);
  expect(report.summary.affectedInstructions).toBe(2);
  expect(report.donors[0]?.status).toBe('pin-stale');
});

test('reports stale and maps the changed file to its instructions', async () => {
  const root = await makeFixture();
  const baseline = buildSourceBaseline(root);
  await writeFile(join(root, '.tmp', 'donors', 'd1', 'a.md'), 'alpha changed\n', 'utf8');
  const report = checkSourceUpdates(root, baseline);
  expect(report.summary.stale).toBe(1);
  expect(report.summary.current).toBe(1);
  const finding = report.donors[0]?.files.find((file) => file.path === 'a.md');
  expect(finding?.status).toBe('stale');
  expect(finding?.instructions).toEqual(['i1', 'i2']);
  expect(report.summary.affectedInstructions).toBe(2);
});

test('reports missing when a source file disappears', async () => {
  const root = await makeFixture();
  const baseline = buildSourceBaseline(root);
  await rm(join(root, '.tmp', 'donors', 'd1', 'b.md'));
  const report = checkSourceUpdates(root, baseline);
  expect(report.summary.missing).toBe(1);
  expect(report.donors[0]?.files.find((file) => file.path === 'b.md')?.instructions).toEqual(['i2']);
});

test('reports unknown for a new active map file absent from the baseline', async () => {
  const root = await makeFixture();
  const baseline = buildSourceBaseline(root);
  const mapPath = join(root, 'corpus-map.json');
  const map = JSON.parse(readFileSync(mapPath, 'utf8')) as { donors: { d1: { files: Record<string, unknown> } } };
  map.donors.d1.files['c.md'] = { status: 'converted', instruction_ids: ['i3'] };
  await writeFile(mapPath, JSON.stringify(map), 'utf8');
  await writeFile(join(root, '.tmp', 'donors', 'd1', 'c.md'), 'gamma\n', 'utf8');
  const report = checkSourceUpdates(root, baseline);
  expect(report.summary.unknown).toBe(1);
  expect(report.donors[0]?.files.find((file) => file.path === 'c.md')?.instructions).toEqual(['i3']);
});

test('rejects a map path that escapes the donor content root', async () => {
  const root = await makeFixture();
  const mapPath = join(root, 'corpus-map.json');
  const map = JSON.parse(readFileSync(mapPath, 'utf8')) as { donors: { d1: { files: Record<string, unknown> } } };
  map.donors.d1.files['../outside.md'] = { status: 'converted', instruction_ids: ['i9'] };
  await writeFile(mapPath, JSON.stringify(map), 'utf8');
  expect(() => buildSourceBaseline(root)).toThrow(SourceUpdateError);
});

test('rejects a corpus revision that differs from the donor manifest', async () => {
  const root = await makeFixture();
  const mapPath = join(root, 'corpus-map.json');
  const map = JSON.parse(readFileSync(mapPath, 'utf8')) as { donors: { d1: { source_revision: string } } };
  map.donors.d1.source_revision = headB;
  await writeFile(mapPath, JSON.stringify(map), 'utf8');
  expect(() => buildSourceBaseline(root)).toThrow(SourceUpdateError);
});

test('rejects a donor clone whose HEAD differs from the manifest', async () => {
  const root = await makeFixture();
  await writeFile(join(root, '.tmp', 'donors', 'd1', '.git', 'HEAD'), `${headB}\n`, 'utf8');
  expect(() => buildSourceBaseline(root)).toThrow(SourceUpdateError);
});

test('reports unknown when the local clone is at an unrelated revision', async () => {
  const root = await makeFixture();
  const baseline = buildSourceBaseline(root);
  const unrelated = 'c'.repeat(40);
  await writeFile(join(root, '.tmp', 'donors', 'd1', '.git', 'HEAD'), `${unrelated}\n`, 'utf8');
  const report = checkSourceUpdates(root, baseline);
  expect(report.summary.unknown).toBe(2);
  expect(report.donors[0]?.observedHead).toBe(unrelated);
});

test('rejects a baseline whose revision differs from the corpus map', async () => {
  const root = await makeFixture();
  const baseline = buildSourceBaseline(root);
  const mapPath = join(root, 'corpus-map.json');
  const map = JSON.parse(readFileSync(mapPath, 'utf8')) as { donors: { d1: { source_revision: string } } };
  map.donors.d1.source_revision = headB;
  await writeFile(mapPath, JSON.stringify(map), 'utf8');
  expect(() => checkSourceUpdates(root, baseline)).toThrow(SourceUpdateError);
});

test('CLI returns 0 current, 1 stale and 2 invalid baseline', async () => {
  const currentRoot = await makeFixture();
  const currentBaseline = await writeBaseline(currentRoot);
  const currentOutput: string[] = [];
  expect(runCheckSourceUpdatesCli(['--root', currentRoot, '--baseline', currentBaseline, '--json'], (text) => currentOutput.push(text))).toBe(0);
  expect(JSON.parse(currentOutput.join('\n')).summary.current).toBe(2);

  const staleRoot = await makeFixture();
  const staleBaseline = await writeBaseline(staleRoot);
  await writeFile(join(staleRoot, '.tmp', 'donors', 'd1', 'a.md'), 'changed\n', 'utf8');
  const staleOutput: string[] = [];
  expect(runCheckSourceUpdatesCli(['--root', staleRoot, '--baseline', staleBaseline, '--json'], (text) => staleOutput.push(text))).toBe(1);
  expect(JSON.parse(staleOutput.join('\n')).summary.stale).toBe(1);

  const invalidRoot = await makeFixture();
  const invalidBaseline = join(invalidRoot, 'source-baseline.json');
  await writeFile(invalidBaseline, '{"schema":"wrong"}', 'utf8');
  expect(runCheckSourceUpdatesCli(['--root', invalidRoot, '--baseline', invalidBaseline, '--json'], () => undefined)).toBe(2);
});

test('builds a baseline across multiple donors in sorted order', async () => {
  const root = await makeFixture();
  const donorRoot = join(root, '.tmp', 'donors', 'd2');
  await mkdir(join(donorRoot, '.git'), { recursive: true });
  await writeFile(join(donorRoot, '.git', 'HEAD'), `${headA}\n`, 'utf8');
  await writeFile(join(donorRoot, 'c.md'), 'gamma\n', 'utf8');
  const donorsPath = join(root, 'donors.yaml');
  await writeFile(donorsPath, `${readFileSync(donorsPath, 'utf8')}  - id: d2\n    local_path: d2\n    head_sha: ${headA}\n    license: MIT\n`, 'utf8');
  const mapPath = join(root, 'corpus-map.json');
  const map = JSON.parse(readFileSync(mapPath, 'utf8')) as { donors: Record<string, unknown> };
  map.donors.d2 = { source_revision: headA, files: { 'c.md': { status: 'converted', instruction_ids: ['i3'] } } };
  await writeFile(mapPath, JSON.stringify(map), 'utf8');
  expect([...buildSourceBaseline(root).donors.keys()]).toEqual(['d1', 'd2']);
});

test('rejects invalid baseline bytes and resolves the package root', () => {
  expect(() => parseSourceBaseline({
    schema: 'VPSourceBaseline/v1',
    basis: 'synthetic',
    donors: { d1: { revision: headA, files: { 'a.md': { sha256: 'a'.repeat(64), bytes: -1 } } } },
  })).toThrow('bytes must be a non-negative integer');
  expect(packageRoot()).toBe(join(here, '..'));
  const manifest = parseDonorManifest({
    schema: 'vida-powers-donors/v1',
    local_root: 'packages/powers/.tmp/donors',
    donors: [{ id: 'd1', local_path: 'd1', head_sha: headA, license: 'MIT' }],
  }, join(here, '..'));
  expect(manifest.localRoot).toBe(resolve(join(here, '..'), '..', '..', 'packages/powers/.tmp/donors'));
  const twoDonors = parseSourceBaseline({
    schema: 'VPSourceBaseline/v1',
    basis: 'synthetic',
    donors: {
      b: { revision: headA, files: {} },
      a: { revision: headA, files: {} },
    },
  });
  expect(serializeSourceBaseline(twoDonors)).toContain('"a"');
});

test('resolves symbolic and packed clone heads', async () => {
  const root = await makeFixture();
  const git = join(root, '.tmp', 'donors', 'd1', '.git');
  await writeFile(join(git, 'HEAD'), 'ref: refs/heads/main\n', 'utf8');
  await writeFile(join(git, 'packed-refs'), `${headA} refs/heads/main\n`, 'utf8');
  expect(buildSourceBaseline(root).donors.get('d1')?.revision).toBe(headA);

  const unresolved = await makeFixture();
  const unresolvedGit = join(unresolved, '.tmp', 'donors', 'd1', '.git');
  await writeFile(join(unresolvedGit, 'HEAD'), 'ref: refs/heads/main\n', 'utf8');
  expect(() => buildSourceBaseline(unresolved)).toThrow('cannot read clone HEAD');
});

test('reports unknown without a clone head and for a baseline-only donor', async () => {
  const root = await makeFixture();
  const baseline = buildSourceBaseline(root);
  await rm(join(root, '.tmp', 'donors', 'd1', '.git', 'HEAD'));
  expect(checkSourceUpdates(root, baseline).summary.unknown).toBe(2);

  const baselineOnly = parseSourceBaseline({
    schema: 'VPSourceBaseline/v1',
    basis: 'synthetic',
    donors: { d2: { revision: headA, files: { 'x.md': { sha256: 'a'.repeat(64), bytes: 1 } } } },
  });
  const report = checkSourceUpdates(root, baselineOnly);
  expect(report.donors.find((donor) => donor.donor === 'd2')?.status).toBe('unknown');
});

test('rejects an unreadable mapped source and reports a non-ENOENT read error', async () => {
  const missing = await makeFixture();
  await rm(join(missing, '.tmp', 'donors', 'd1', 'a.md'));
  expect(() => buildSourceBaseline(missing)).toThrow('is not readable');

  const directory = await makeFixture();
  const baseline = buildSourceBaseline(directory);
  await rm(join(directory, '.tmp', 'donors', 'd1', 'a.md'));
  await mkdir(join(directory, '.tmp', 'donors', 'd1', 'a.md'));
  expect(() => checkSourceUpdates(directory, baseline)).toThrow('cannot read source');
});

test('build and check CLIs emit text and JSON', async () => {
  const root = await makeFixture();
  const out = join(root, 'baseline.json');
  const json: string[] = [];
  expect(runBuildBaselineCli(['--root', root, '--out', out, '--json'], (text) => json.push(text))).toBe(0);
  expect(JSON.parse(json[0]!).files).toBe(2);
  const text: string[] = [];
  expect(runBuildBaselineCli(['--root', root, '--out', out], (line) => text.push(line))).toBe(0);
  expect(text[0]).toContain('source baseline:');
  const errorText: string[] = [];
  expect(runBuildBaselineCli(['--root', join(root, 'missing')], (line) => errorText.push(line))).toBe(2);
  expect(errorText[0]).toContain('error:');
  const errorJson: string[] = [];
  expect(runBuildBaselineCli(['--root', join(root, 'missing'), '--json'], (line) => errorJson.push(line))).toBe(2);
  expect(JSON.parse(errorJson[0]!).ok).toBe(false);

  const baseline = await writeBaseline(root);
  const checkText: string[] = [];
  expect(runCheckSourceUpdatesCli(['--root', root, '--baseline', baseline], (line) => checkText.push(line))).toBe(0);
  expect(checkText[0]).toContain('source update check:');
  await writeFile(join(root, '.tmp', 'donors', 'd1', 'a.md'), 'changed\n', 'utf8');
  const staleText: string[] = [];
  expect(runCheckSourceUpdatesCli(['--root', root, '--baseline', baseline], (line) => staleText.push(line))).toBe(1);
  expect(staleText.some((line) => line.startsWith('stale d1:a.md'))).toBe(true);
  const checkError: string[] = [];
  expect(runCheckSourceUpdatesCli(['--root', join(root, 'missing'), '--baseline', baseline], (line) => checkError.push(line))).toBe(2);
  expect(checkError[0]).toContain('error:');
});
