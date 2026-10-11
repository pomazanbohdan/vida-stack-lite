import path from 'node:path';

const packageRoot = path.resolve(import.meta.dirname, '..');
const env = {
  ...process.env,
  FAST_CHECK_NUM_RUNS: process.env.FAST_CHECK_NUM_RUNS ?? '100000',
  FAST_CHECK_SEED: process.env.FAST_CHECK_SEED ?? '20260830',
};
const child = Bun.spawn(
  [
    process.execPath,
    '--no-env-file',
    '--no-install',
    '--config=' + path.join(packageRoot, 'bunfig.toml'),
    'test',
    path.join(packageRoot, 'tests/fuzz.test.ts'),
  ],
  { cwd: packageRoot, env, stdout: 'inherit', stderr: 'inherit' },
);
process.exit(await child.exited);
