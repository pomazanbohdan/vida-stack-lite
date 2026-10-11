import { expect, test } from 'bun:test';
import { rejects } from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { canonicalJson, canonicalJsonDigest } from '../src/contracts/canonical-json-core.js';
import { detectSafeRepositoryAccess, safeRepositoryProviderAvailable } from '../src/config/safe-repository-access.js';

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

test('canonical wire bytes preserve Unicode ordering, number boundaries, and rejection semantics', () => {
  const value = { '\ufffd': 'replacement', '\ud83d\ude00': 'astral', a: [1e-7, 0.25, Number.MAX_SAFE_INTEGER] };
  const wire = '{"a":[1e-7,0.25,9007199254740991],"😀":"astral","�":"replacement"}';
  expect(canonicalJson(value)).toBe(wire);
  expect(canonicalJsonDigest(value)).toBe(sha256(wire));
  expect(canonicalJson(JSON.parse(wire) as unknown)).toBe(wire);
  expect(() => canonicalJson('\ud800')).toThrow();
  expect(() => canonicalJson({ '\udfff': 'invalid key' })).toThrow();
});

test('upgraded native provider preserves exclusive creation, CAS failure, lock ownership, and atomic publication', async () => {
  const root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'vida-dependency-qualification-')));
  let verified = false;
  try {
    expect(safeRepositoryProviderAvailable).toBe(true);
    const access = detectSafeRepositoryAccess(root);
    access.assertAvailable();
    await access.writeExclusiveAtomicAsync('state.json', 'before', 'dependency qualification');
    await rejects(access.writeExclusiveAtomicAsync('state.json', 'overwrite', 'exclusive contender'));
    expect(readFileSync(path.join(root, 'state.json'), 'utf8')).toBe('before');
    expect(() => access.replaceAtomic('state.json', sha256('wrong'), 'after', 'stale CAS')).toThrow();
    expect(readFileSync(path.join(root, 'state.json'), 'utf8')).toBe('before');
    await access.withExclusiveLockAsync('state.json', 'owner', async () => {
      await rejects(access.withExclusiveLockAsync('state.json', 'contender', async () => undefined));
      const receipt = access.compareReserveReplace('state.json', sha256('before'), 'after', 'matching CAS');
      expect(receipt.status).toBe('applied');
      expect(receipt.result_hash).toBe(sha256('after'));
    });
    expect(access.withExclusiveLock('state.json', 'reacquire', () => 'held')).toBe('held');
    expect(readFileSync(path.join(root, 'state.json'), 'utf8')).toBe('after');
    verified = true;
  } finally {
    if (verified) rmSync(root, { recursive: true, force: true });
    else process.stderr.write(`Unverified dependency fixture preserved: ${root}\n`);
  }
});
