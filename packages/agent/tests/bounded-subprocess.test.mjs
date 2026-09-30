import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'bun:test';
import { runBoundedSubprocess, subprocessFailure } from './helpers/bounded-subprocess.mjs';

const roots = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test('bounded subprocess terminates the full child tree and returns actionable timeout diagnostics', async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'vida-subprocess-'));
  roots.push(root);
  const marker = path.join(root, 'grandchild-survived.txt');
  const grandchild = `setTimeout(() => require('node:fs').writeFileSync(process.argv[1], 'survived'), 3000)`;
  const parent = `require('node:child_process').spawn(process.execPath, ['-e', ${JSON.stringify(
    grandchild,
  )}, ${JSON.stringify(marker)}], { stdio: 'ignore' }); setInterval(() => {}, 1000);`;
  const result = await runBoundedSubprocess('node', ['-e', parent], { timeoutMs: 750 });
  assert.equal(result.timedOut, true);
  assert.match(result.diagnostic, /terminated the child process tree/);
  await new Promise((resolve) => setTimeout(resolve, 3500));
  assert.equal(existsSync(marker), false, subprocessFailure('child-tree cleanup', result));
});
