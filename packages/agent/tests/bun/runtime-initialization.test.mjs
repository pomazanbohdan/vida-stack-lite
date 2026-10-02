import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { configuredTestContext } from '../configured-context.mjs';
import { bindRuntimeInitialization } from '../../src/runtime-initialization.ts';
import { HostStateStore, openHostStateDatabase } from '../../src/host-state.ts';
import { deriveWorkspaceId } from '../../src/workspace-identity.ts';
import { loadRuntimeConfig, runtimeConfigDigest } from '../../src/config/runtime-config.ts';
import { canonicalJsonDigest } from '../../src/contracts/public-ingress.ts';

let root, receiptPath, receipt, database, store;
let racers = [];
beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'vida-init-binding-'));
  const { repositoryRoot } = configuredTestContext();
  for (const file of ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml'])
    copyFileSync(path.join(repositoryRoot, file), path.join(root, file));
  mkdirSync(path.join(root, '.agent'));
  const config = loadRuntimeConfig(root);
  const workspaceId = deriveWorkspaceId(config.repository.repository_id, root);
  receiptPath = path.join(root, '.agent', 'runtime-initialization.v1.json');
  receipt = {
    schema: 'RuntimeInitialization/v1',
    version: 1,
    workspace_id: workspaceId,
    repository_id: config.repository.repository_id,
    project_ids: config.projects.map((project) => project.project_id).sort(),
    integrations_digest: canonicalJsonDigest(config.integrations),
    config_digest: runtimeConfigDigest(config),
    schema_sha256: createHash('sha256')
      .update(readFileSync(new URL('../../schemas/runtime-initialization.v1.schema.json', import.meta.url)))
      .digest('hex'),
    workspace_binding_status: 'pending',
  };
  writeFileSync(receiptPath, JSON.stringify(receipt) + '\n');
  database = openHostStateDatabase(path.join(root, '.agent', 'host.sqlite'));
  store = new HostStateStore(database, workspaceId);
});
afterEach(async () => {
  for (const racer of racers)
    if (racer.child.exitCode === null && racer.child.signalCode === null) racer.child.kill('SIGKILL');
  await Promise.allSettled(racers.map((racer) => racer.done));
  racers = [];
  database?.close();
  rmSync(root, { recursive: true, force: true });
});

test('derives one stable workspace ID for normalized spelling and different IDs for another checkout', () => {
  expect(deriveWorkspaceId(receipt.repository_id, path.join(root, '.'))).toBe(receipt.workspace_id);
  const other = mkdtempSync(path.join(tmpdir(), 'vida-other-workspace-'));
  try {
    expect(deriveWorkspaceId(receipt.repository_id, other)).not.toBe(receipt.workspace_id);
  } finally {
    rmSync(other, { recursive: true, force: true });
  }
});

test('same workspace binding is idempotent under concurrent callers', async () => {
  const results = await Promise.all([bindRuntimeInitialization(root, store), bindRuntimeInitialization(root, store)]);
  expect(results[0]).toEqual({ ...receipt, workspace_binding_status: 'bound' });
  expect(results[1]).toEqual(results[0]);
  const boundBytes = readFileSync(receiptPath);
  expect(await bindRuntimeInitialization(root, store)).toEqual(results[0]);
  expect(readFileSync(receiptPath)).toEqual(boundBytes);
});

test('foreign or stale receipt is rejected without replacing the pending bytes', async () => {
  for (const [field, value] of [
    ['workspace_id', 'f'.repeat(64)],
    ['repository_id', 'foreign'],
    ['project_ids', ['foreign']],
    ['integrations_digest', 'f'.repeat(64)],
    ['config_digest', 'f'.repeat(64)],
    ['schema_sha256', 'f'.repeat(64)],
    ['workspace_binding_status', 'foreign'],
  ]) {
    const bytes = JSON.stringify({ ...receipt, [field]: value }) + '\n';
    writeFileSync(receiptPath, bytes);
    await expect(bindRuntimeInitialization(root, store)).rejects.toThrow();
    expect(readFileSync(receiptPath, 'utf8')).toBe(bytes);
  }
});

test('fails closed when the host store or persisted receipt does not match deterministic workspace identity', async () => {
  const bytes = readFileSync(receiptPath);
  await expect(bindRuntimeInitialization(root, {})).rejects.toThrow('trusted HostStateStore');
  await expect(bindRuntimeInitialization(root, new HostStateStore(database, 'f'.repeat(64)))).rejects.toThrow(
    'trusted host workspace differs',
  );
  expect(readFileSync(receiptPath)).toEqual(bytes);
  rmSync(receiptPath);
  await expect(bindRuntimeInitialization(root, store)).rejects.toThrow('unavailable');
});

test('competing workspace is denied after the first bind', async () => {
  await bindRuntimeInitialization(root, store);
  const bytes = readFileSync(receiptPath);
  await expect(bindRuntimeInitialization(root, new HostStateStore(database, 'f'.repeat(64)))).rejects.toThrow();
  expect(readFileSync(receiptPath)).toEqual(bytes);
});

describe('separate process initialization', () => {
  beforeEach(async () => {
    const hostModule = new URL('../../src/host-state.ts', import.meta.url).href;
    const initModule = new URL('../../src/runtime-initialization.ts', import.meta.url).href;
    const program = `
    const { HostStateStore, openHostStateDatabase } = await import(${JSON.stringify(hostModule)});
    const { bindRuntimeInitialization } = await import(${JSON.stringify(initModule)});
    const db = openHostStateDatabase(${JSON.stringify(path.join(root, '.agent', 'host.sqlite'))});
    try {
      const store = new HostStateStore(db, ${JSON.stringify(receipt.workspace_id)});
      console.log('READY');
      await new Promise(resolve => process.stdin.once('data', resolve));
      console.log(JSON.stringify(await bindRuntimeInitialization(${JSON.stringify(root)}, store)));
    } finally { db.close(); }
  `;
    racers = [1, 2].map(() => {
      let child;
      const done = new Promise((resolve, reject) => {
        child = execFile(
          process.execPath,
          ['-e', program],
          { cwd: tmpdir(), timeout: 15000, windowsHide: true },
          (error, stdout) => (error ? reject(error) : resolve(stdout)),
        );
      });
      const ready = new Promise((resolve, reject) => {
        let output = '';
        child.stdout.on('data', (data) => {
          output += data;
          if (output.includes('READY\n')) resolve();
        });
        done.then(() => reject(new Error('race process exited before release')), reject);
      });
      return { child, ready, done };
    });
    await Promise.all(racers.map((racer) => racer.ready));
  });

  test('separate processes bind one pending receipt without changing its identity', async () => {
    for (const racer of racers) racer.child.stdin.end('go\n');
    const outputs = await Promise.all(racers.map((racer) => racer.done));
    for (const output of outputs)
      expect(JSON.parse(output.slice(output.indexOf('\n') + 1))).toEqual({
        ...receipt,
        workspace_binding_status: 'bound',
      });
    expect(JSON.parse(readFileSync(receiptPath, 'utf8'))).toEqual({ ...receipt, workspace_binding_status: 'bound' });
  });
});
