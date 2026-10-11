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
