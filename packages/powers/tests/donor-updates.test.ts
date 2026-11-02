import { afterAll, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  activePrefixes,
  classifyNewFile,
  parseNameStatus,
  triageDonor,
} from '../scripts/donor-updates.ts';
import {
  buildSourceBaseline,
  serializeSourceBaseline,
} from '../scripts/source-updates.ts';

const directories: string[] = [];

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
