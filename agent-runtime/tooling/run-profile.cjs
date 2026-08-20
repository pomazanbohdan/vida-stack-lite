'use strict';

// Cross-platform launcher for an explicit, reproducible deeper manual profile.
const { spawnSync } = require('child_process');
const runs = process.argv[2];
if (!/^[1-9][0-9]*$/.test(runs || '')) throw new Error('positive property-run count required');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npm, ['run', 'verify'], {
  cwd: __dirname,
  env: { ...process.env, FC_RUNS: runs },
  stdio: 'inherit',
  windowsHide: true
});
process.exitCode = result.status === null ? 1 : result.status;
