import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeProjectFromBundle } from '../bin/init-core.mjs';
import { main } from '../bin/init.mjs';

const bundle = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('public partial initialization fails explicitly and preserves all existing bytes without publishing', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'audit-partial-init-'));
  try {
    await mkdir(path.join(root, '.git'));
    const bytes = Buffer.from('project-owned instructions\r\n');
    await writeFile(path.join(root, 'AGENTS.md'), bytes);
    const before = await readdir(root, { recursive: true });
    const exit = { exitCode: 0 };
    const stdout = [];
    const stderr = [];
    await main({
      isMain: true,
      bunRuntime: true,
      args: ['--project-root', root, '--repository', 'consumer', '--project', 'sample'],
      exit,
      io: { log: (message) => stdout.push(message), error: (message) => stderr.push(message) },
      initialize: (input) => initializeProjectFromBundle(input, bundle),
    });
    expect(exit.exitCode).toBe(1);
    expect(stdout).toEqual([]);
    const result = JSON.parse(stderr[0]);
    expect(result).toMatchObject({ status: 'partial_not_ready', ready: false, existing: ['AGENTS.md'] });
    expect(result.missing).toContain('AGENT.sidecar.md');
    expect(result.next_action).toContain('reconciliation');
    expect(await readFile(path.join(root, 'AGENTS.md'))).toEqual(bytes);
    expect(await readdir(root, { recursive: true })).toEqual(before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
