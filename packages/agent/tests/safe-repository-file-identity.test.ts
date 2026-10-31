import { expect, test } from 'bun:test';
import {
  linkSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { requireSafeRepositoryAccess, safeRepositoryProviderAvailable } from '../src/config/safe-repository-access.js';

test.skipIf(process.platform !== 'win32' && !safeRepositoryProviderAvailable)(
  'observes file identity without writes and distinguishes equal-byte replacements',
  () => {
    const safeDir = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'agent-file-identity-')));
    let passed = false;
    try {
      const observe = requireSafeRepositoryAccess(safeDir).observeFileIdentity;
      if (!observe) throw new Error('native provider did not expose file identity');
      const data = path.join(safeDir, 'data');
      mkdirSync(data);
      const item = path.join(data, 'item');
      writeFileSync(item, 'same');
      const beforeRoot = readdirSync(safeDir).sort();
      const beforeData = readdirSync(data).sort();
      const identity = observe('data/item', 'item');
      expect(observe('data/item', 'item')).toBe(identity);
      expect(readdirSync(safeDir).sort()).toEqual(beforeRoot);
      expect(readdirSync(data).sort()).toEqual(beforeData);
      expect(readFileSync(item, 'utf8')).toBe('same');
      linkSync(item, path.join(data, 'hardlink'));
      expect(observe('data/hardlink', 'hardlink')).toBe(identity);
      renameSync(item, path.join(data, 'original'));
      writeFileSync(item, 'same');
      expect(observe('data/item', 'replacement')).not.toBe(identity);
      expect(readFileSync(item, 'utf8')).toBe('same');
      expect(() => observe('data', 'directory')).toThrow();
      expect(() => observe('../escape', 'escape')).toThrow();
      expect(() => observe('data/missing', 'missing')).toThrow();
      if (process.platform === 'linux') {
        symlinkSync('item', path.join(data, 'link'));
        expect(() => observe('data/link', 'link')).toThrow();
      }
      renameSync(safeDir, safeDir + '-moved');
      try {
        expect(() => observe('data/item', 'missing root')).toThrow();
      } finally {
        renameSync(safeDir + '-moved', safeDir);
      }
      passed = true;
    } finally {
      if (passed) rmSync(safeDir, { recursive: true, force: true });
      else console.error('Retained failed file identity fixture: ' + safeDir);
    }
  },
);
