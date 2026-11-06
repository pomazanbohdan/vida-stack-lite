import { afterAll, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import {
  activePrefixes,
  classifyNewFile,
  packageRoot,
  parseNameStatus,
  runTriageCli,
  startTriageCli,
  triageAll,
  triageDonor,
} from '../scripts/donor-updates.ts';
import {
  buildSourceBaseline,
  serializeSourceBaseline,
} from '../scripts/source-updates.ts';

const directories: string[] = [];
const here = dirname(fileURLToPath(import.meta.url));

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trim();
}

async function makeGitFixture(): Promise<{ root: string; target: string }> {
  const root = await mkdtemp(join(tmpdir(), 'vp-donor-updates-'));
  directories.push(root);
  const donorRoot = join(root, '.tmp', 'donors', 'd1');
  await mkdir(donorRoot, { recursive: true });
  git(donorRoot, 'init', '-q');
  git(donorRoot, 'config', 'user.email', 'test@example.com');
  git(donorRoot, 'config', 'user.name', 'Test');
  await mkdir(join(donorRoot, 'skills', 'demo'), { recursive: true });
  await writeFile(join(donorRoot, 'skills', 'demo', 'a.md'), 'alpha\n', 'utf8');
  git(donorRoot, 'add', '.');
  git(donorRoot, 'commit', '-q', '-m', 'base');
  const base = git(donorRoot, 'rev-parse', 'HEAD');
  await writeFile(
    join(root, 'donors.yaml'),
    `schema: vida-powers-donors/v1\nlocal_root: .tmp/donors\ndonors:\n  - id: d1\n    local_path: d1\n    head_sha: ${base}\n    license: MIT\n`,
    'utf8',
  );
  await writeFile(
    join(root, 'corpus-map.json'),
    JSON.stringify({
      schema: 'VPCorpusMap/v1',
      donors: {
        d1: {
          source_revision: base,
          files: { 'skills/demo/a.md': { status: 'converted', instruction_ids: ['i1'] } },
        },
      },
    }),
    'utf8',
  );
  await writeFile(join(root, 'source-baseline.json'), serializeSourceBaseline(buildSourceBaseline(root)), 'utf8');
  await writeFile(join(donorRoot, 'skills', 'demo', 'a.md'), 'alpha changed\n', 'utf8');
  await writeFile(join(donorRoot, 'skills', 'demo', 'b.md'), 'beta\n', 'utf8');
  git(donorRoot, 'add', '.');
  git(donorRoot, 'commit', '-q', '-m', 'update');
  return { root, target: git(donorRoot, 'rev-parse', 'HEAD') };
}

afterAll(async () => {
  await Promise.all(directories.map((directory) => rm(directory, { recursive: true, force: true })));
});

test('parses git name-status including renames', () => {
  const entries = parseNameStatus('A\tnew.md\nM\tchanged.md\nD\told.md\nR100\tbefore.md\tafter.md\n');
  expect(entries).toEqual([
    { status: 'A', path: 'new.md', oldPath: null },
    { status: 'M', path: 'changed.md', oldPath: null },
    { status: 'D', path: 'old.md', oldPath: null },
    { status: 'R', path: 'after.md', oldPath: 'before.md' },
  ]);
});

test('classifies new files by content kind, exclusions and selected directories', () => {
  const prefixes = new Set(['skills', 'skills/demo']);
  expect(classifyNewFile('skills/demo/reference.md', prefixes)).toMatchObject({ disposition: 'candidate', reason: 'markdown-candidate' });
  expect(classifyNewFile('scripts/run.ts', prefixes)).toMatchObject({ kind: 'other', disposition: 'rejected', reason: 'non-markdown' });
  expect(classifyNewFile('.changeset/note.md', prefixes)).toMatchObject({ disposition: 'rejected', reason: 'excluded-path' });
  expect(classifyNewFile('harness/demo.md', prefixes)).toMatchObject({ disposition: 'rejected', reason: 'excluded-path' });
  expect(classifyNewFile('docs/outside.md', prefixes)).toMatchObject({ disposition: 'rejected', reason: 'outside-selected-directories' });
});

test('collects only ancestor directories of active map files', () => {
  const map = new Map([
    ['d1', {
      revision: 'a'.repeat(40),
      files: new Map([
        ['skills/demo/SKILL.md', { status: 'converted', instructionIds: ['i1'] }],
        ['README.md', { status: 'rejected', instructionIds: [] }],
      ]),
    }],
  ]);
  expect([...activePrefixes(map, 'd1')]).toEqual(['skills', 'skills/demo']);
});

test('triage reports changed used files and new candidates against the baseline', async () => {
  const { root, target } = await makeGitFixture();
  const triage = triageDonor(root, 'd1', target);
  expect(triage).toMatchObject({
    donor: 'd1',
    added: 1,
    modified: 1,
    deleted: 0,
    changedUsed: 1,
    deletedUsed: 0,
    newCandidates: 1,
    newRejected: 0,
  });
  expect(triage.usedChanges).toEqual([{ path: 'skills/demo/a.md', status: 'M', instructionIds: ['i1'] }]);
  expect(triage.newFiles).toEqual([{ path: 'skills/demo/b.md', kind: 'markdown', disposition: 'candidate', reason: 'markdown-candidate' }]);
});

async function makeDeleteRenameFixture(): Promise<{ root: string; target: string }> {
  const root = await mkdtemp(join(tmpdir(), 'vp-donor-updates-'));
  directories.push(root);
  const donorRoot = join(root, '.tmp', 'donors', 'd1');
  await mkdir(join(donorRoot, 'skills', 'demo'), { recursive: true });
  git(donorRoot, 'init', '-q');
  git(donorRoot, 'config', 'user.email', 'test@example.com');
  git(donorRoot, 'config', 'user.name', 'Test');
  await writeFile(join(donorRoot, 'skills', 'demo', 'a.md'), 'alpha\n', 'utf8');
  await writeFile(join(donorRoot, 'skills', 'demo', 'd.md'), 'delta\n', 'utf8');
  git(donorRoot, 'add', '.');
  git(donorRoot, 'commit', '-q', '-m', 'base');
  const base = git(donorRoot, 'rev-parse', 'HEAD');
  await writeFile(
    join(root, 'donors.yaml'),
    `schema: vida-powers-donors/v1\nlocal_root: .tmp/donors\ndonors:\n  - id: d1\n    local_path: d1\n    head_sha: ${base}\n    license: MIT\n`,
    'utf8',
  );
  await writeFile(
    join(root, 'corpus-map.json'),
    JSON.stringify({
      schema: 'VPCorpusMap/v1',
      donors: {
        d1: {
          source_revision: base,
          files: {
            'skills/demo/a.md': { status: 'converted', instruction_ids: ['i1'] },
            'skills/demo/d.md': { status: 'converted', instruction_ids: ['i2'] },
          },
        },
      },
    }),
    'utf8',
  );
  await writeFile(join(root, 'source-baseline.json'), serializeSourceBaseline(buildSourceBaseline(root)), 'utf8');
  await rm(join(donorRoot, 'skills', 'demo', 'a.md'));
  git(donorRoot, 'mv', 'skills/demo/d.md', 'skills/demo/e.md');
  git(donorRoot, 'add', '-A');
  git(donorRoot, 'commit', '-q', '-m', 'delete and rename');
  return { root, target: git(donorRoot, 'rev-parse', 'HEAD') };
}

test('triage reports deleted and renamed used files', async () => {
  const { root, target } = await makeDeleteRenameFixture();
  const triage = triageDonor(root, 'd1', target);
  expect(triage).toMatchObject({ deleted: 1, renamed: 1, deletedUsed: 1 });
  expect(triage.usedChanges).toEqual([{ path: 'skills/demo/a.md', status: 'D', instructionIds: ['i1'] }]);
});

test('triageAll and the triage CLI summarize text, JSON and errors', async () => {
  const { root, target } = await makeGitFixture();
  const all = triageAll(root, ['d1'], new Map([['d1', target]]));
  expect(all.summary).toMatchObject({ donors: 1, added: 1, modified: 1, deleted: 0, changedUsed: 1 });

  const out = join(root, 'triage.json');
  const output: string[] = [];
  expect(runTriageCli(['--root', root, '--target', target, '--out', out], (line) => output.push(line))).toBe(0);
  expect(output.some((line) => line.includes('donor update triage:'))).toBe(true);
  expect(output.some((line) => line.includes('used='))).toBe(true);
  expect(output.some((line) => line.includes('candidate'))).toBe(true);
  expect(output.some((line) => line.includes('written:'))).toBe(true);
  expect(readFileSync(out, 'utf8')).toContain('"donor": "d1"');

  const json: string[] = [];
  expect(runTriageCli(['--root', root, '--target', target, '--json'], (line) => json.push(line))).toBe(0);
  expect(JSON.parse(json[0]!).summary.donors).toBe(1);

  const error: string[] = [];
  expect(runTriageCli(['--root', join(root, 'missing')], (line) => error.push(line))).toBe(1);
  expect(error[0]).toContain('error:');
  const errorJson: string[] = [];
  expect(runTriageCli(['--root', join(root, 'missing'), '--json'], (line) => errorJson.push(line))).toBe(1);
  expect(JSON.parse(errorJson[0]!).ok).toBe(false);

  expect(packageRoot()).toBe(join(here, '..'));
  const previousExit = process.exitCode;
  try {
    expect(startTriageCli([process.execPath, join(here, '../scripts/donor-updates.ts'), '--root', root, '--target', target], (line) => output.push(line))).toBe(0);
    expect(startTriageCli([process.execPath, 'other'], (line) => output.push(line))).toBeUndefined();
  } finally {
    process.exitCode = previousExit;
  }
});

test('triage reports a git failure', async () => {
  const { root, target } = await makeGitFixture();
  await rm(join(root, '.tmp', 'donors', 'd1', '.git'), { recursive: true });
  expect(() => triageDonor(root, 'd1', target)).toThrow('git diff');
});
