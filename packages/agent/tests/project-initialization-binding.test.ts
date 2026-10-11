import { expect, test } from 'bun:test';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { bindProjectInitialization } from '../src/config/project-initialization-binding.js';
import type { HostStateStore } from '../src/host-state.js';

test('project initialization binding rejects an untrusted Host before reading or creating repository state', async () => {
  const repositoryRoot = mkdtempSync(path.join(tmpdir(), 'vida-init-binding-untrusted-'));
  try {
    const failure = await bindProjectInitialization(repositoryRoot, {} as HostStateStore).then(
      () => undefined,
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(Error);
    expect(failure).toHaveProperty('message', 'Project initialization requires a trusted Host.');
    expect(readdirSync(repositoryRoot)).toEqual([]);
  } finally {
    rmSync(repositoryRoot, { recursive: true, force: true });
  }
});
