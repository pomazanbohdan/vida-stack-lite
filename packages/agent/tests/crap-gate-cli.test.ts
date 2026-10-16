import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const script = path.join(root, 'tooling/crap-gate.ts');

function expectedSourceBinding(file: string): { path: string; byte_length: number; sha256: string } {
  const bytes = readFileSync(path.join(root, file));
  return { path: file, byte_length: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex') };
}

test('native CRAP inventory returns static function identities without numeric qualification', () => {
  const file = 'src/contracts/canonical-json-core.ts';
  const result = spawnSync(process.execPath, [script, '--inventory', file], {
    cwd: root,
    encoding: 'utf8',
    timeout: 20_000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, BUN_OPTIONS: '' },
  });
  expect(result.error).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.status).toBe(0);
  const output: unknown = JSON.parse(result.stdout);
  expect(output).toMatchObject({
    schema: 'MaintainedFunctionInventory/v1',
    mode: 'static-inventory-only',
    qualification: 'not-performed',
    sources: [file],
  });
  expect(output).toHaveProperty('files', [expectedSourceBinding(file)]);
  expect(output).toHaveProperty(
    'functions',
    expect.arrayContaining([
      expect.objectContaining({
        file,
        name: 'fn:canonicalJson',
        complexity: 1,
        identity: `${file}#fn:canonicalJson#0`,
      }),
      expect.objectContaining({
        file,
        name: 'fn:canonicalJsonDigest',
        complexity: 1,
        identity: `${file}#fn:canonicalJsonDigest#0`,
      }),
    ]),
  );
});

test('native CRAP inventory binds each selected source to its own bytes and function rows', () => {
  const files = ['src/contracts/canonical-json-core.ts', 'src/contracts/envelopes.ts'];
  const result = spawnSync(process.execPath, [script, '--inventory', ...files], {
    cwd: root,
    encoding: 'utf8',
    timeout: 20_000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, BUN_OPTIONS: '' },
  });
  expect(result.error).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.status).toBe(0);
  const output: unknown = JSON.parse(result.stdout);
  expect(output).toHaveProperty('files', files.map(expectedSourceBinding));
  expect(output).toHaveProperty('sources', files);
  for (const file of files)
    expect(output).toHaveProperty('functions', expect.arrayContaining([expect.objectContaining({ file })]));
});

test('native CRAP inventory denies duplicate or foreign sources and unsupported options', () => {
  for (const args of [
    ['--inventory', 'src/contracts/canonical-json-core.ts', 'src/contracts/canonical-json-core.ts'],
    ['--inventory', 'tests/crap-gate-cli.test.ts'],
    ['--relax-budget'],
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], {
      cwd: root,
      encoding: 'utf8',
      timeout: 20_000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, BUN_OPTIONS: '' },
    });
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain(
      args[0] === '--inventory'
        ? 'Function inventory requires unique maintained source paths.'
        : 'Unsupported CRAP budget gate arguments.',
    );
  }
});

const reviewed = 'ebf74615669c6ecdc0d754fdc3ad6eaf6e954c56';
const hostReview = '6f687506464048a0360f3fb8932eb7b77c7fc005';
const timingReview = '6e4655b1db2a32d08ae722940ff50b10d9e56ca6';
const facadeReview = '64f18b3148a80644787a1c2b997ad7a1ff6e5d5d';
const lifecycleReview = 'e9629b3c45cde992ef688af33b2538c7e3a67391';
const contractsReview = '386bf6c9b576e8e43c903155513358b403468179';
const dispositionReview = '892523d2a83edc6e21d7a05d6e9cca902aab6f44';
const cacheDispositionReview = '72c6dc3b29f9ad9f3960d82ab89bbb5d846ea2bd';
test.each([
  ['main-cedar', '0'.repeat(40), 'pinned published reviewed budget commit'],
  ['main-config', reviewed, 'outside the pinned independent source-lineage review'],
  ['main-host', reviewed, 'outside the pinned independent source-lineage review'],
  ['main-cedar', hostReview, 'outside the pinned independent source-lineage review'],
  ['main-runtime-timing', hostReview, 'outside the pinned independent source-lineage review'],
  ['main-host', timingReview, 'outside the pinned independent source-lineage review'],
  ['bun-runtime-facade', reviewed, 'outside the pinned independent source-lineage review'],
  ['main-host', facadeReview, 'outside the pinned independent source-lineage review'],
  ['bun-lifecycle-state', facadeReview, 'outside the pinned independent source-lineage review'],
  ['main-host', lifecycleReview, 'outside the pinned independent source-lineage review'],
  ['main-host', contractsReview, 'outside the pinned independent source-lineage review'],
  ['main-host', dispositionReview, 'pinned published reviewed budget commit'],
  ['main-host', cacheDispositionReview, 'pinned published reviewed budget commit'],
  ['unknown', reviewed, 'complete declared executable contour'],
  ['main-contracts', contractsReview, 'complete declared executable contour'],
])('scoped CRAP refuses %s with review %s before numerical admission', (contour, reference, message) => {
  const result = spawnSync(process.execPath, [script, '--contour', contour!, '--budget-ref', reference!], {
    cwd: root,
    encoding: 'utf8',
    timeout: 5000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, BUN_OPTIONS: '' },
  });
  expect(result.error).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.status).toBe(1);
  expect(result.stdout).toBe('');
  expect(result.stderr).toContain(message!);
});

test.each([
  ['main-host', hostReview],
  ['main-runtime-timing', timingReview],
  ['bun-runtime-facade', facadeReview],
  ['bun-lifecycle-state', lifecycleReview],
  ['main-public-ingress', contractsReview],
  ['main-envelopes', contractsReview],
  ['bun-runtime-initialization', dispositionReview],
  ['bun-cli-toolchain', dispositionReview],
  ['bun-cli-toolchain', cacheDispositionReview],
  ['bun-final-assurance', dispositionReview],
])('published %s lineage review still requires genuine focused numerical evidence', (contour, review) => {
  const result = spawnSync(process.execPath, [script, '--contour', contour!, '--budget-ref', review!], {
    cwd: root,
    encoding: 'utf8',
    timeout: 5000,
    maxBuffer: 1024 * 1024,
    env: {
      ...process.env,
      BUN_OPTIONS: '',
      VIDA_BUN_COVERAGE_REPORT: path.join(root, 'coverage', 'missing-scoped-review-control.json'),
    },
  });
  expect(result.error).toBeUndefined();
  expect(result.signal).toBeNull();
  expect(result.status).toBe(1);
  expect(result.stdout).toBe('');
  expect(result.stderr).toContain('ENOENT');
  expect(result.stderr).not.toContain('outside the pinned independent source-lineage review');
});
