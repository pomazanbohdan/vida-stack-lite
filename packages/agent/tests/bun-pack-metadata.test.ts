import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test } from 'bun:test';
import { readBunPackMetadata } from '../tooling/bun-pack-metadata.ts';
import { expectRejection } from './helpers/expect-rejection.ts';

type TarFixtureEntry = { path: string; body?: Buffer | string; type?: string; link?: string; declaredSize?: number };

function tarEntry(input: TarFixtureEntry): Buffer {
  const body = Buffer.from(input.body ?? '');
  const header = Buffer.alloc(512);
  header.write(input.path, 0, 100, 'utf8');
  header.write('0000644\0', 100, 8, 'ascii');
  header.write('0000000\0', 108, 8, 'ascii');
  header.write('0000000\0', 116, 8, 'ascii');
  header.write((input.declaredSize ?? body.length).toString(8).padStart(11, '0') + '\0', 124, 12, 'ascii');
  header.write('00000000000\0', 136, 12, 'ascii');
  header.fill(0x20, 148, 156);
  header.write(input.type ?? '0', 156, 1, 'ascii');
  if (input.link) header.write(input.link, 157, 100, 'utf8');
  header.write('ustar\0', 257, 6, 'ascii');
  header.write('00', 263, 2, 'ascii');
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'ascii');
  const padding = Buffer.alloc((512 - (body.length % 512)) % 512);
  return Buffer.concat([header, body, padding]);
}

function archive(entries: TarFixtureEntry[]): Buffer {
  return Buffer.concat([...entries.map(tarEntry), Buffer.alloc(1024)]);
}

function fixture(bytes: Buffer): { archive: string; dispose: () => void } {
  const directory = mkdtempSync(path.join(tmpdir(), 'vida-bun-pack-metadata-'));
  const file = path.join(directory, 'vida-agent-2.4.6.tgz');
  writeFileSync(file, bytes);
  return { archive: file, dispose: () => rmSync(directory, { recursive: true, force: true }) };
}

const packageJson = JSON.stringify({ name: 'vida-agent', version: '2.4.6' });
const expected = { name: 'vida-agent', version: '2.4.6', filename: 'vida-agent-2.4.6.tgz' };

test('reads sorted regular file inventory and full integrity from the produced archive bytes', async () => {
  const bytes = archive([
    { path: 'package/z.js', body: 'export const z = 1;' },
    { path: 'package/package.json', body: packageJson },
    { path: 'package/a.d.ts', body: 'export declare const a: 1;' },
  ]);
  const owned = fixture(bytes);
  try {
    expect(await readBunPackMetadata({ archive: owned.archive, ...expected })).toEqual([
      {
        ...expected,
        integrity: 'sha512-' + createHash('sha512').update(bytes).digest('base64'),
        files: [
          { path: 'a.d.ts', size: Buffer.byteLength('export declare const a: 1;') },
          { path: 'package.json', size: Buffer.byteLength(packageJson) },
          { path: 'z.js', size: Buffer.byteLength('export const z = 1;') },
        ],
      },
    ]);
  } finally {
    owned.dispose();
  }
});

test('rejects duplicate and non-canonical archive paths', async () => {
  for (const entries of [
    [
      { path: 'package/package.json', body: packageJson },
      { path: 'package/a.js', body: 'one' },
      { path: 'package/a.js', body: 'two' },
    ],
    [
      { path: 'package/package.json', body: packageJson },
      { path: 'package/../escape.js', body: 'unsafe' },
    ],
    [
      { path: 'package/package.json', body: packageJson },
      { path: 'package//empty.js', body: 'unsafe' },
    ],
    [
      { path: 'package/package.json', body: packageJson },
      { path: 'package\\escape.js', body: 'unsafe' },
    ],
  ]) {
    const owned = fixture(archive(entries));
    try {
      await expectRejection(
        readBunPackMetadata({ archive: owned.archive, ...expected }),
        /duplicate path|not canonical/u,
      );
    } finally {
      owned.dispose();
    }
  }
});

test('rejects links, directories, foreign roots and archive identity mismatches', async () => {
  for (const entries of [
    [
      { path: 'package/package.json', body: packageJson },
      { path: 'package/link', type: '2', link: 'outside' },
    ],
    [
      { path: 'package/package.json', body: packageJson },
      { path: 'package/hardlink', type: '1', link: 'package/file' },
    ],
    [
      { path: 'package/package.json', body: packageJson },
      { path: 'package/folder', type: '5' },
    ],
    [
      { path: 'package/package.json', body: packageJson },
      { path: 'other/file.js', body: 'foreign' },
    ],
  ]) {
    const owned = fixture(archive(entries));
    try {
      await expectRejection(
        readBunPackMetadata({ archive: owned.archive, ...expected }),
        /regular files only|not canonical/u,
      );
    } finally {
      owned.dispose();
    }
  }

  const owned = fixture(archive([{ path: 'package/package.json', body: packageJson }]));
  try {
    await expectRejection(
      readBunPackMetadata({ archive: owned.archive, ...expected, version: '2.4.7' }),
      /identity differs/,
    );
    await expectRejection(
      readBunPackMetadata({ archive: owned.archive, ...expected, filename: 'renamed.tgz' }),
      /filename differs/,
    );
  } finally {
    owned.dispose();
  }
});

test('rejects archive and expanded-file sizes before materializing unbounded input', async () => {
  const archiveBound = fixture(Buffer.from('small placeholder'));
  try {
    truncateSync(archiveBound.archive, 256 * 1024 * 1024 + 1);
    await expectRejection(readBunPackMetadata({ archive: archiveBound.archive, ...expected }), /rejected|size limit/u);
  } finally {
    archiveBound.dispose();
  }

  const oversizedEntry = fixture(
    archive([
      { path: 'package/package.json', body: packageJson },
      { path: 'package/large.bin', declaredSize: 64 * 1024 * 1024 + 1 },
    ]),
  );
  try {
    await expectRejection(readBunPackMetadata({ archive: oversizedEntry.archive, ...expected }), /size limit/u);
  } finally {
    oversizedEntry.dispose();
  }
});
