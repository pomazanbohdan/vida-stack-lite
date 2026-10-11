import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { captureFingerprint, fingerprintDigestForManifest } from '../tooling/fingerprint.js';
import { expectRejection } from './helpers/expect-rejection.js';

const shaAbc = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
const shaAbd = 'a52d159f262b2c6ddb724a61840befc36eb30c88877a4030b65cbe86298449c9';

describe('CandidateFingerprint/v1 digest serialization', () => {
  test('matches an independently assembled canonical NUL-delimited preimage', () => {
    const digest = fingerprintDigestForManifest([
      { path: 'packages/agent/a.ts', mode: 0o644, bytes: 3, sha256: shaAbc },
    ]);
    // file\0path\0mode\0length\0sha256\0\0 followed directly by absence JSON.
    expect(digest).toBe('4734c5bd10da0dad2a72eeb71459a043f0cfab338ab5dd010125df74ab7d658a');
  });

  test('binds each subsequent row in the supplied sorted path order', () => {
    const digest = fingerprintDigestForManifest([
      { path: 'packages/agent/a.ts', mode: 0o644, bytes: 3, sha256: shaAbc },
      {
        path: 'packages/agent/b.ts',
        mode: 0o755,
        bytes: 4,
        sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
      },
    ]);
    expect(digest).toBe('d700ede5b3286ac0a47fce4c2b431063aa62a7f485826797f910a3e30fbbc632');
  });

  test('changes when an input file digest changes', () => {
    const original = fingerprintDigestForManifest([
      { path: 'packages/agent/a.ts', mode: 0o644, bytes: 3, sha256: shaAbc },
    ]);
    const changed = fingerprintDigestForManifest([
      { path: 'packages/agent/a.ts', mode: 0o644, bytes: 3, sha256: shaAbd },
    ]);
    expect(changed).toBe('f5cc48ddb1d5d385f307322007ba9208b135308356b2189b7c4b49f8eaeb1153');
    expect(changed).not.toBe(original);
  });
});

describe('CandidateFingerprint/v1 filesystem capture', () => {
  function fixture(): { root: string; candidate: string } {
    const root = mkdtempSync(path.join(tmpdir(), 'vida-fingerprint-'));
    const candidate = path.join(root, 'packages/agent');
    mkdirSync(candidate, { recursive: true });
    writeFileSync(path.join(root, 'agent-runtime.config.v1.yaml'), 'fixture-config\n', { mode: 0o644 });
    chmodSync(path.join(root, 'agent-runtime.config.v1.yaml'), 0o644);
    return { root, candidate };
  }

  test('captures sorted real file bytes, mode and active authority with the exact digest framing', async () => {
    const { root, candidate } = fixture();
    try {
      mkdirSync(path.join(candidate, 'node_modules'));
      writeFileSync(path.join(candidate, 'node_modules/excluded.ts'), 'excluded');
      writeFileSync(path.join(candidate, '.DS_Store'), 'excluded');
      writeFileSync(path.join(candidate, 'z.ts'), 'unicode-é東京\n');
      chmodSync(path.join(candidate, 'z.ts'), 0o644);
      writeFileSync(path.join(candidate, 'a.ts'), 'abc');
      chmodSync(path.join(candidate, 'a.ts'), 0o755);
      const output = await captureFingerprint(candidate);
      const expected = [
        { path: 'agent-runtime.config.v1.yaml', mode: 0o644, text: 'fixture-config\n' },
        { path: 'packages/agent/a.ts', mode: 0o755, text: 'abc' },
        { path: 'packages/agent/z.ts', mode: 0o644, text: 'unicode-é東京\n' },
      ].map(({ path: file, mode, text }) => ({
        path: file,
        mode,
        bytes: Buffer.byteLength(text),
        sha256: createHash('sha256').update(text).digest('hex'),
      }));
      expect(output.schema).toBe('CandidateFingerprint/v1');
      expect(output.files).toEqual(expected);
      const preimage =
        expected.map((entry) => `file\0${entry.path}\0${entry.mode}\0${entry.bytes}\0${entry.sha256}\0\0`).join('') +
        '{"absence":[]}';
      expect(output.fingerprint).toBe(createHash('sha256').update(preimage).digest('hex'));
      chmodSync(path.join(candidate, 'a.ts'), 0o644);
      const changedMode = await captureFingerprint(candidate);
      expect(changedMode.fingerprint).not.toBe(output.fingerprint);
      writeFileSync(path.join(candidate, 'a.ts'), 'abd');
      const changedContent = await captureFingerprint(candidate);
      expect(changedContent.fingerprint).not.toBe(changedMode.fingerprint);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejects a package archive rather than silently omitting it', async () => {
    const { root, candidate } = fixture();
    try {
      writeFileSync(path.join(candidate, 'generated.tgz'), 'archive');
      await expectRejection(captureFingerprint(candidate), 'fingerprint refuses generated package archive');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('rejects a symbolic link rather than following it', async () => {
    const { root, candidate } = fixture();
    try {
      writeFileSync(path.join(root, 'outside.ts'), 'outside');
      symlinkSync(path.join(root, 'outside.ts'), path.join(candidate, 'linked.ts'));
      await expectRejection(captureFingerprint(candidate), 'fingerprint refuses symbolic-link/reparse entry');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
