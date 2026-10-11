import { describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveWorkspaceId } from '../src/workspace-identity.js';
import { loadRuntimeConfig } from '../src/config/runtime-config.js';
import { acquireStorageReadAdmission } from '../src/config/storage-read-admission.js';

describe('fresh storage admission gate', () => {
  test('initializes the exact fresh zero-byte gate and retains a valid gate on reopen', () => {
    const fixture = openRepositoryFixture('fresh-storage-gate-');
    try {
      const file = path.join(fixture.root, '.vida/storage-admission.v1.sqlite');
      const lease = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, '.vida/unused.sqlite');
      lease.close();
      const initialBytes = readFileSync(file);
      expect(initialBytes.length).toBeGreaterThan(0);
      const again = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, '.vida/unused.sqlite');
      again.close();
      expect(readFileSync(file)).toEqual(initialBytes);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test('completes an existing exact zero-byte gate without recreating source storage', () => {
    const fixture = openRepositoryFixture('interrupted-storage-gate-');
    const file = path.join(fixture.root, '.vida/storage-admission.v1.sqlite');
    try {
      writeFileSync(file, '', { flag: 'wx' });
      const lease = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, '.vida/unused.sqlite');
      lease.close();
      expect(readFileSync(file).length).toBeGreaterThan(0);
      expect(() => readFileSync(path.join(fixture.root, '.vida/unused.sqlite'))).toThrow();
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test('denies a persisted one-page empty database without changing its bytes', () => {
    const fixture = openRepositoryFixture('malformed-storage-gate-');
    const file = path.join(fixture.root, '.vida/storage-admission.v1.sqlite');
    try {
      const malformed = new Database(file);
      malformed.exec('CREATE TABLE transient_gate_probe(value TEXT); DROP TABLE transient_gate_probe;');
      malformed.close();
      const before = readFileSync(file);
      expect(() => acquireStorageReadAdmission(fixture.root, fixture.workspaceId, '.vida/unused.sqlite')).toThrow(
        /zero-byte gate preimage/u,
      );
      expect(readFileSync(file)).toEqual(before);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });

  test('denies a different workspace identity and gate sidecars', () => {
    const fixture = openRepositoryFixture('storage-gate-identity-');
    const file = path.join(fixture.root, '.vida/storage-admission.v1.sqlite');
    try {
      const lease = acquireStorageReadAdmission(fixture.root, fixture.workspaceId, '.vida/unused.sqlite');
      lease.close();
      const before = readFileSync(file);
      expect(() => acquireStorageReadAdmission(fixture.root, 'd'.repeat(64), '.vida/unused.sqlite')).toThrow(
        /gate identity differs/u,
      );
      expect(readFileSync(file)).toEqual(before);
      writeFileSync(file + '-wal', 'unexpected sidecar', { flag: 'wx' });
      expect(() => acquireStorageReadAdmission(fixture.root, fixture.workspaceId, '.vida/unused.sqlite')).toThrow(
        /gate sidecar is present/u,
      );
      expect(readFileSync(file)).toEqual(before);
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  });
});

function openRepositoryFixture(prefix: string): { readonly root: string; readonly workspaceId: string } {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  try {
    const repositoryRoot =
      process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT ??
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
    for (const file of ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml'])
      copyFileSync(path.join(repositoryRoot, file), path.join(root, file));
    mkdirSync(path.join(root, '.vida'));
    const config = loadRuntimeConfig(root);
    return { root, workspaceId: deriveWorkspaceId(config.repository.repository_id, root) };
  } catch (error) {
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
}
