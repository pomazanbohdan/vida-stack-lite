import { expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('migration review rejects tampering and preserves UNKNOWN', async () => {
  const path = fileURLToPath(new URL('./fixtures/review-migration-plan-harness.ts', import.meta.url));
  const child = spawn(process.execPath, [path, '--cleanup-on-success'], { stdio: ['ignore', 'pipe', 'pipe'] });
  const stdout: Buffer[] = [], stderr: Buffer[] = [];
  child.stdout.on('data', chunk => stdout.push(chunk));
  child.stderr.on('data', chunk => stderr.push(chunk));
  const exit = await new Promise<number | null>(done => child.on('close', done));
  expect(Buffer.concat(stderr).toString()).toBe('');
  expect(exit).toBe(0);
  const result = JSON.parse(Buffer.concat(stdout).toString());
  expect(result.status).toBe('PASS');
  expect(result.cases.length).toBe(28);
  expect(result.cleanup).toBe('removed');
}, 30000);
