import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  captureCleanSourceDirectoryInventory,
  captureConsumerProjectMoveInventory,
} from '../bin/consumer-project-relocation.ts';

const windows = process.platform === 'win32' ? describe : describe.skip;
windows('clean source inventory on native Windows', () => {
  test('observes nested files and empty directories without effects or a destination', async () => {
    const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'vida-clean-inventory-')));
    try {
      mkdirSync(path.join(root, 'source', 'nested'), { recursive: true });
      mkdirSync(path.join(root, 'source', 'empty'));
      const bytes = Buffer.alloc(9 * 1024 * 1024, 0x61);
      const file = path.join(root, 'source', 'nested', 'large.bin');
      writeFileSync(file, bytes);
      const result = await captureCleanSourceDirectoryInventory(root, 'source');
      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toMatchObject({
        source: 'source/nested/large.bin',
        size: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      });
      expect(result.files[0]!.identity).toBeTruthy();
      expect(result.directories.map((dir) => dir.path)).toEqual(['source', 'source/empty', 'source/nested']);
      expect(result.totalBytes).toBe(bytes.length);
      expect(result.entryCount).toBe(4);
      expect(readdirSync(root)).toEqual(['source']);
      expect(readdirSync(path.join(root, 'source')).sort()).toEqual(['empty', 'nested']);
      expect(readdirSync(path.join(root, 'source', 'empty'))).toEqual([]);
      expect(readdirSync(path.join(root, 'source', 'nested'))).toEqual(['large.bin']);
      expect(readFileSync(file).equals(bytes)).toBe(true);
    } finally {
      console.info('Retained fixture:', root);
    }
  });

  test('accepts opaque history names and nested .agent', async () => {
    const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'vida-clean-names-')));
    try {
      mkdirSync(path.join(root, 'source', '.agent', 'історія [old]'), { recursive: true });
      writeFileSync(path.join(root, 'source', '.agent', 'історія [old]', 'file name.txt'), 'data');
      const result = await captureCleanSourceDirectoryInventory(root, 'source');
      expect(result.files.map((file) => file.source)).toEqual(['source/.agent/історія [old]/file name.txt']);
    } finally {
      console.info('Retained fixture:', root);
    }
  });

  for (const [name, limits, succeeds] of [
    ['entry limit', { maxEntries: 1, maxBytes: 3 }, false],
    ['byte limit', { maxEntries: 2, maxBytes: 2 }, false],
    ['zero bytes', { maxEntries: 2, maxBytes: 0 }, false],
    ['exact limits', { maxEntries: 2, maxBytes: 3 }, true],
    ['negative entries', { maxEntries: -1, maxBytes: 3 }, false],
    ['excess entries', { maxEntries: 10001, maxBytes: 3 }, false],
    ['fractional entries', { maxEntries: 1.5, maxBytes: 3 }, false],
    ['excess bytes', { maxEntries: 2, maxBytes: 512 * 1024 * 1024 + 1 }, false],
    ['negative bytes', { maxEntries: 2, maxBytes: -1 }, false],
    ['non-finite bytes', { maxEntries: 2, maxBytes: NaN }, false],
  ] as const) {
    test(`applies ${name}`, async () => {
      const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'vida-clean-limits-')));
      try {
        mkdirSync(path.join(root, 'source'));
        writeFileSync(path.join(root, 'source', 'one'), 'abc');
        if (succeeds) {
          const result = await captureCleanSourceDirectoryInventory(root, 'source', limits);
          expect(result.entryCount).toBe(2);
          expect(result.totalBytes).toBe(3);
        } else {
          await Promise.resolve(expect(captureCleanSourceDirectoryInventory(root, 'source', limits)).rejects.toThrow());
        }
        expect(readFileSync(path.join(root, 'source', 'one'), 'utf8')).toBe('abc');
      } finally {
        console.info('Retained fixture:', root);
      }
    });
  }

  test('rejects a hardlinked file', async () => {
    const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'vida-clean-hardlink-')));
    try {
      mkdirSync(path.join(root, 'source'));
      writeFileSync(path.join(root, 'source', 'one'), 'one');
      linkSync(path.join(root, 'source', 'one'), path.join(root, 'other'));
      await Promise.resolve(expect(captureCleanSourceDirectoryInventory(root, 'source')).rejects.toThrow());
      expect(readFileSync(path.join(root, 'source', 'one'), 'utf8')).toBe('one');
    } finally {
      console.info('Retained fixture:', root);
    }
  });

  test('legacy move remains synchronous, byte retaining and requires an empty destination', () => {
    const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'vida-move-inventory-')));
    try {
      mkdirSync(path.join(root, 'source'));
      writeFileSync(path.join(root, 'source', 'file'), 'contents');
      const move = { id: 'test', oldRoot: 'source', newRoot: 'target' };
      expect(() => captureConsumerProjectMoveInventory(root, move)).toThrow();
      mkdirSync(path.join(root, 'target'));
      const result = captureConsumerProjectMoveInventory(root, move);
      expect(result).not.toBeInstanceOf(Promise);
      expect(result.files[0]!.bytes.toString()).toBe('contents');
      expect(result.files[0]!.identity).toBeTruthy();
      writeFileSync(path.join(root, 'target', 'occupied'), 'x');
      expect(() => captureConsumerProjectMoveInventory(root, move)).toThrow();
    } finally {
      console.info('Retained fixture:', root);
    }
  });
});

test.skipIf(process.platform === 'win32')('clean source inventory refuses unsupported platforms', async () => {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'vida-clean-unsupported-')));
  try {
    mkdirSync(path.join(root, 'source'));
    await Promise.resolve(
      expect(captureCleanSourceDirectoryInventory(root, 'source')).rejects.toThrow(
        'Windows verified large-file observation is unavailable',
      ),
    );
  } finally {
    console.info('Retained fixture:', root);
  }
});
