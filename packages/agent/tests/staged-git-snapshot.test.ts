import { describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { withStagedGitSnapshot } from '../tooling/staged-git-snapshot.js';

interface Fixture {
  readonly root: string;
  readonly cleanup: () => void;
}

function command(root: string, args: readonly string[], input?: string, env: NodeJS.ProcessEnv = process.env): string {
  const result = spawnSync('git', [...args], {
    cwd: root,
    env,
    encoding: 'utf8',
    windowsHide: true,
    ...(input === undefined ? {} : { input }),
  });
  if (result.error || result.signal || result.status !== 0)
    throw new Error(`git ${args[0] ?? 'command'} failed: ${result.stderr ?? result.error?.message ?? result.signal}`);
  return result.stdout;
}

function fixture(): Fixture {
  const root = mkdtempSync(path.join(tmpdir(), 'vida staged snapshot '));
  mkdirSync(path.join(root, 'src'));
  writeFileSync(path.join(root, 'src/value.ts'), 'export const value = "base";\n');
  writeFileSync(path.join(root, 'src/deleted.ts'), 'export const deleted = true;\n');
  command(root, ['init', '-q']);
  command(root, ['config', 'user.email', 'fixture@example.invalid']);
  command(root, ['config', 'user.name', 'Fixture']);
  command(root, ['add', '.']);
  command(root, ['commit', '-qm', 'baseline']);
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

function indexFile(root: string): string {
  return path.resolve(root, command(root, ['rev-parse', '--git-path', 'index']).trim());
}

describe('staged Git snapshot', () => {
  test('materializes exact staged bytes and deletions while preserving partial staging and index custody', async () => {
    const current = fixture();
    try {
      const staged = 'export const value = "staged A";\n';
      const worktree = 'export const value = "worktree B";\n';
      writeFileSync(path.join(current.root, 'src/value.ts'), staged);
      command(current.root, ['add', '--', 'src/value.ts']);
      writeFileSync(path.join(current.root, 'src/value.ts'), worktree);
      command(current.root, ['rm', '--cached', '--', 'src/deleted.ts']);

      const before = readFileSync(indexFile(current.root));
      const dependencyRoot = path.join(current.root, 'installed', 'node_modules');
      mkdirSync(dependencyRoot, { recursive: true });
      writeFileSync(path.join(dependencyRoot, 'marker'), 'installed dependency');
      let snapshotRoot = '';
      const files = await withStagedGitSnapshot({
        repositoryRoot: current.root,
        dependencyMounts: [{ workspaceRelativePath: 'packages/agent', installedNodeModules: dependencyRoot }],
        run: ({ snapshotRoot: capturedRoot, trackedFiles }) => {
          snapshotRoot = capturedRoot;
          expect(readFileSync(path.join(capturedRoot, 'src/value.ts'), 'utf8')).toBe(staged);
          expect(() => readFileSync(path.join(capturedRoot, 'src/deleted.ts'), 'utf8')).toThrow();
          expect(readFileSync(path.join(capturedRoot, 'packages/agent/node_modules/marker'), 'utf8')).toBe(
            'installed dependency',
          );
          expect(trackedFiles).toContain('src/value.ts');
          expect(trackedFiles).not.toContain('src/deleted.ts');
          return trackedFiles;
        },
      });

      expect(files).toContain('src/value.ts');
      expect(snapshotRoot).not.toBe('');
      expect(() => readFileSync(path.join(snapshotRoot, 'src/value.ts'))).toThrow();
      expect(readFileSync(path.join(current.root, 'src/value.ts'), 'utf8')).toBe(worktree);
      expect(readFileSync(path.join(current.root, 'src/deleted.ts'), 'utf8')).toContain('deleted');
      expect(readFileSync(indexFile(current.root))).toEqual(before);
      expect(command(current.root, ['diff', '--cached', '--name-only', '-z'])).toContain('src/value.ts');
      expect(command(current.root, ['diff', '--name-only', '-z'])).toContain('src/value.ts');
    } finally {
      current.cleanup();
    }
  });

  test('uses the active GIT_INDEX_FILE instead of the default worktree index', async () => {
    const current = fixture();
    try {
      const alternateIndex = path.join(current.root, 'alternate-index');
      writeFileSync(alternateIndex, readFileSync(indexFile(current.root)));
      const gitEnv = { ...process.env, GIT_INDEX_FILE: 'alternate-index' };
      const staged = 'export const value = "alternate staged";\n';
      writeFileSync(path.join(current.root, 'src/value.ts'), staged);
      command(current.root, ['add', '--', 'src/value.ts'], undefined, gitEnv);
      const defaultIndexBefore = readFileSync(indexFile(current.root));
      const activeIndexBefore = readFileSync(alternateIndex);

      await withStagedGitSnapshot({
        repositoryRoot: current.root,
        gitEnv,
        run: ({ snapshotRoot }) => {
          expect(readFileSync(path.join(snapshotRoot, 'src/value.ts'), 'utf8')).toBe(staged);
        },
      });

      expect(readFileSync(alternateIndex)).toEqual(activeIndexBefore);
      expect(readFileSync(indexFile(current.root))).toEqual(defaultIndexBefore);
      expect(command(current.root, ['show', ':src/value.ts'])).toContain('base');
      expect(command(current.root, ['show', ':src/value.ts'], undefined, gitEnv)).toBe(staged);
    } finally {
      current.cleanup();
    }
  });

  test('detects index drift after a failed check and cleans the owned snapshot', async () => {
    const current = fixture();
    try {
      writeFileSync(path.join(current.root, 'src/value.ts'), 'export const value = "staged A";\n');
      command(current.root, ['add', '--', 'src/value.ts']);
      const worktree = 'export const value = "worktree B";\n';
      writeFileSync(path.join(current.root, 'src/value.ts'), worktree);
      let snapshotRoot = '';

      let failure: unknown;
      try {
        await withStagedGitSnapshot({
          repositoryRoot: current.root,
          run: ({ snapshotRoot: capturedRoot }) => {
            snapshotRoot = capturedRoot;
            command(current.root, ['add', '--', 'src/value.ts']);
            throw new Error('child check failed');
          },
        });
      } catch (error) {
        failure = error;
      }
      expect(failure).toBeInstanceOf(AggregateError);
      if (!(failure instanceof AggregateError)) throw new Error('Expected child and custody failures.');
      expect(failure.errors).toHaveLength(2);
      const childFailure: unknown = failure.errors[0];
      const custodyFailure: unknown = failure.errors[1];
      expect(childFailure).toMatchObject({ message: 'child check failed' });
      expect(custodyFailure).toBeInstanceOf(Error);
      if (!(custodyFailure instanceof Error)) throw new Error('Expected index custody failure.');
      expect(custodyFailure.message).toMatch(/index (?:identity )?changed/u);

      expect(snapshotRoot).not.toBe('');
      expect(() => readFileSync(path.join(snapshotRoot, 'src/value.ts'))).toThrow();
      expect(readFileSync(path.join(current.root, 'src/value.ts'), 'utf8')).toBe(worktree);
      expect(command(current.root, ['show', ':src/value.ts'])).toBe(worktree);
    } finally {
      current.cleanup();
    }
  });

  test('uses raw staged blobs despite an active smudge filter', async () => {
    const current = fixture();
    try {
      command(current.root, ['config', 'filter.uppercase.clean', 'cat']);
      command(current.root, ['config', 'filter.uppercase.smudge', 'tr a-z A-Z']);
      writeFileSync(path.join(current.root, '.gitattributes'), 'src/*.ts filter=uppercase\n');
      command(current.root, ['add', '--', '.gitattributes']);
      const staged = 'export const value = "staged lowercase";\n';
      writeFileSync(path.join(current.root, 'src/value.ts'), staged);
      command(current.root, ['add', '--', 'src/value.ts']);
      let snapshotRoot = '';
      await withStagedGitSnapshot({
        repositoryRoot: current.root,
        run: ({ snapshotRoot: capturedRoot }) => {
          snapshotRoot = capturedRoot;
          expect(readFileSync(path.join(capturedRoot, 'src/value.ts'), 'utf8')).toBe(staged);
          expect(lstatSync(path.join(capturedRoot, 'src/value.ts')).mode & 0o111).toBe(0);
        },
      });
      expect(() => readFileSync(path.join(snapshotRoot, 'src/value.ts'))).toThrow();
      expect(readFileSync(path.join(current.root, 'src/value.ts'), 'utf8')).toBe(staged);
    } finally {
      current.cleanup();
    }
  });

  test('preserves a replaced temporary directory and fails cleanup closed', async () => {
    const current = fixture();
    let movedRoot = '';
    let replacementRoot = '';
    try {
      await Promise.resolve(
        expect(
          withStagedGitSnapshot({
            repositoryRoot: current.root,
            run: ({ snapshotRoot }) => {
              replacementRoot = path.dirname(snapshotRoot);
              movedRoot = `${replacementRoot}-moved`;
              renameSync(replacementRoot, movedRoot);
              mkdirSync(replacementRoot);
            },
          }),
        ).rejects.toThrow(/temporary directory changed identity/u),
      );
      expect(existsSync(replacementRoot)).toBe(true);
      expect(existsSync(movedRoot)).toBe(true);
    } finally {
      if (replacementRoot && existsSync(replacementRoot)) rmSync(replacementRoot, { recursive: true, force: true });
      if (movedRoot && existsSync(movedRoot)) rmSync(movedRoot, { recursive: true, force: true });
      current.cleanup();
    }
  });

  test('rejects conflict, symlink, and submodule index entries before invoking checks', async () => {
    const conflict = fixture();
    try {
      const oid = command(conflict.root, ['rev-parse', 'HEAD:src/value.ts']).trim();
      command(conflict.root, ['update-index', '--force-remove', '--', 'src/value.ts']);
      command(
        conflict.root,
        ['update-index', '--index-info'],
        `100644 ${oid} 1\tsrc/value.ts\n100644 ${oid} 2\tsrc/value.ts\n`,
      );
      let invoked = false;
      await Promise.resolve(
        expect(
          withStagedGitSnapshot({
            repositoryRoot: conflict.root,
            run: () => {
              invoked = true;
            },
          }),
        ).rejects.toThrow(/unresolved entry/u),
      );
      expect(invoked).toBe(false);
    } finally {
      conflict.cleanup();
    }

    const links = fixture();
    try {
      const linkBlob = command(links.root, ['hash-object', '-w', '--stdin'], 'value.ts').trim();
      command(links.root, ['update-index', '--add', '--cacheinfo', `120000,${linkBlob},src/link.ts`]);
      let invoked = false;
      await Promise.resolve(
        expect(
          withStagedGitSnapshot({
            repositoryRoot: links.root,
            run: () => {
              invoked = true;
            },
          }),
        ).rejects.toThrow(/link or submodule/u),
      );
      expect(invoked).toBe(false);
    } finally {
      links.cleanup();
    }

    const submodules = fixture();
    try {
      const oid = command(submodules.root, ['rev-parse', 'HEAD']).trim();
      command(submodules.root, ['update-index', '--add', '--cacheinfo', `160000,${oid},src/nested`]);
      let invoked = false;
      await Promise.resolve(
        expect(
          withStagedGitSnapshot({
            repositoryRoot: submodules.root,
            run: () => {
              invoked = true;
            },
          }),
        ).rejects.toThrow(/link or submodule/u),
      );
      expect(invoked).toBe(false);
    } finally {
      submodules.cleanup();
    }
  });
});
