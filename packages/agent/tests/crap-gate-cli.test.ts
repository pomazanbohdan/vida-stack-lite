import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const script = path.join(root, 'tooling/crap-gate.ts');

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

test('scoped CRAP refuses unreviewed correspondence versions and contours before numerical admission', () => {
  const reviewed = 'ebf74615669c6ecdc0d754fdc3ad6eaf6e954c56';
  const hostReview = '6f687506464048a0360f3fb8932eb7b77c7fc005';
  const timingReview = '6e4655b1db2a32d08ae722940ff50b10d9e56ca6';
  for (const [contour, reference, message] of [
    ['main-cedar', '0'.repeat(40), 'pinned published reviewed budget commit'],
    ['main-config', reviewed, 'outside the pinned independent source-lineage review'],
    ['main-host', reviewed, 'outside the pinned independent source-lineage review'],
    ['main-cedar', hostReview, 'outside the pinned independent source-lineage review'],
    ['main-runtime-timing', hostReview, 'outside the pinned independent source-lineage review'],
    ['main-host', timingReview, 'outside the pinned independent source-lineage review'],
    ['unknown', reviewed, 'complete declared executable contour'],
  ]) {
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
  }
});

test.each([
  ['main-host', '6f687506464048a0360f3fb8932eb7b77c7fc005'],
  ['main-runtime-timing', '6e4655b1db2a32d08ae722940ff50b10d9e56ca6'],
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
