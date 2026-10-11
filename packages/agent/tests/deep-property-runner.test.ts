import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const packageRoot = path.resolve(import.meta.dirname, '..');

async function runDeepProperty(overrides: NodeJS.ProcessEnv = {}) {
  const manifest = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>;
  };
  const entry = /^bun (tooling\/run-property\.ts)$/u.exec(manifest.scripts['test:deep:pinned'] ?? '')?.[1];
  if (!entry) throw new Error('Deep property command has no supported package-owned runner');
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: '/vida-no-runtime-on-path',
    FAST_CHECK_NUM_RUNS: '16',
    FAST_CHECK_SEED: '20260830',
  };
  delete env.BUN_OPTIONS;
  delete env.FAST_CHECK_PATH;
  Object.assign(env, overrides);
  const child = Bun.spawn([process.execPath, '--no-env-file', '--no-install', entry], {
    cwd: packageRoot,
    env,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  return { exitCode, stdout, stderr };
}

test('deep property command uses the current Bun executable without a PATH runtime fallback', async () => {
  const { exitCode, stdout, stderr } = await runDeepProperty();
  expect({ exitCode, stdout, stderr }).toMatchObject({ exitCode: 0 });
  expect(stderr).toContain('6 pass');
  expect(stderr).toContain('0 fail');
  expect(stderr).toContain('configured authorization rejects malformed requests with matched trusted identity');
});

test.each([
  ['seed', { FAST_CHECK_SEED: '1junk' }, 'Property seed and positive run count must be safe integers.'],
  ['run count', { FAST_CHECK_NUM_RUNS: '0' }, 'Property seed and positive run count must be safe integers.'],
  ['replay path', { FAST_CHECK_PATH: 'not-a-shrink-path' }, 'Unable to replay, got invalid path=not-a-shrink-path'],
] as const)('deep property command forwards and rejects invalid %s', async (_name, overrides, message) => {
  const result = await runDeepProperty(overrides);
  expect(result.exitCode).toBe(1);
  expect(result.stderr).toContain(message);
  expect(result.stderr).not.toContain('6 pass');
});
