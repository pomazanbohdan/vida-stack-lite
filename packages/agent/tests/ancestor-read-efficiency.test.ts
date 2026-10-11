import { expect, spyOn, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.js';

test.skipIf(process.platform !== 'linux')(
  'Linux readBytes returns exact bytes without rebuilding each ancestor prefix',
  () => {
    const fixture = mkdtempSync(path.join(os.tmpdir(), 'ancestor-read-efficiency-'));
    const repositoryRoot = path.join(fixture, 'repo');
    mkdirSync(repositoryRoot);
    const payload = Buffer.from([0, 1, 2, 127, 128, 255]);
    writeFileSync(path.join(repositoryRoot, 'value.bin'), payload);
    const originalDirname = path.dirname;
    const dirnameSpy = spyOn(path, 'dirname').mockImplementation((value: string) => originalDirname(value));
    let passed = false;

    try {
      const actual = requireSafeRepositoryAccess(repositoryRoot).readBytes('value.bin', 'efficiency fixture');
      expect(actual).toEqual(payload);
      expect(dirnameSpy).toHaveBeenCalled();
      expect(dirnameSpy.mock.calls.length).toBeLessThan(256);
      passed = true;
    } finally {
      dirnameSpy.mockRestore();
      if (passed) rmSync(fixture, { recursive: true, force: true });
    }
  },
);

test.skipIf(process.platform !== 'linux')(
  'Linux readBytes denies a repository root beneath a symlinked ancestor',
  () => {
    const fixture = mkdtempSync(path.join(os.tmpdir(), 'ancestor-symlink-denial-'));
    const realParent = path.join(fixture, 'real-parent');
    const realRoot = path.join(realParent, 'repo');
    const aliasParent = path.join(fixture, 'alias-parent');
    const symlinkedRoot = path.join(aliasParent, 'repo');
    mkdirSync(realRoot, { recursive: true });
    symlinkSync(realParent, aliasParent, 'dir');
    writeFileSync(path.join(realRoot, 'value.txt'), 'must not be read');
    let passed = false;

    try {
      expect(() =>
        requireSafeRepositoryAccess(symlinkedRoot).readBytes('value.txt', 'symlink ancestor fixture'),
      ).toThrow(/unsafe ancestor/u);
      passed = true;
    } finally {
      if (passed) rmSync(fixture, { recursive: true, force: true });
    }
  },
);
