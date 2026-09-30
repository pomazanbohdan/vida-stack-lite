const env = {
  ...process.env,
  FAST_CHECK_NUM_RUNS: process.env.FAST_CHECK_NUM_RUNS ?? '100000',
  FAST_CHECK_SEED: process.env.FAST_CHECK_SEED ?? '20260830',
};
const child = Bun.spawn(
  ['bun', '--bun', 'node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.config.mjs', 'tests/fuzz.test.mjs'],
  {
    env,
    stdout: 'inherit',
    stderr: 'inherit',
  },
);
process.exit(await child.exited);
