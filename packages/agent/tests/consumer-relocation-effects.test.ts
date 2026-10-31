import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureConsumerConfiguration } from '../bin/init-configuration.ts';
import { initializeProjectFromBundle } from '../bin/init-core.ts';
import {
  applyConsumerConfiguration,
  freezeConsumerRelocation,
  resumeConsumerConfiguration,
} from '../bin/consumer-configuration-operation.ts';
import type { ConsumerConfigurationOperation } from '../bin/consumer-configuration-operation.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const encoded = (bytes: Uint8Array) => ({
  base64: Buffer.from(bytes).toString('base64'),
  sha256: createHash('sha256').update(bytes).digest('hex'),
});

async function withFixture(
  body: (fixture: {
    root: string;
    request: { projectRoot: string; repository: string; projectMappings: string[]; projectMoves: string[] };
    capture: ReturnType<typeof captureConsumerConfiguration>;
    record: ConsumerConfigurationOperation;
  }) => Promise<void>,
): Promise<void> {
  const deadline = performance.now() + 30000;
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'vida-relocation-effects-')));
  let succeeded = false;
  try {
    await mkdir(path.join(root, 'old/nested'), { recursive: true });
    await mkdir(path.join(root, 'old/empty'));
    await mkdir(path.join(root, 'new'));
    const initial = { projectRoot: root, repository: 'example', projectMappings: ['alpha=old'] };
    await initializeProjectFromBundle(initial, packageRoot);
    await rm(path.join(root, '.agent/runtime-initialization.v1.json'));
    await writeFile(path.join(root, 'old/nested/a.txt'), 'sentinel');
    const request = { ...initial, projectMappings: ['alpha=new'], projectMoves: ['alpha=old:new'] };
    const capture = captureConsumerConfiguration(request);
    const identity = requireSafeRepositoryAccess(root).directoryIdentity('.', 'configuration root');
    const relocation = freezeConsumerRelocation(request, capture, identity);
    const record: ConsumerConfigurationOperation = {
      schema: 'ConsumerConfigurationOperation/v1',
      version: 1,
      operation_id: capture.plan.operation_id,
      root,
      root_identity: identity,
      workspace_id: deriveWorkspaceId(request.repository, root),
      request,
      binding: capture.plan.binding,
      before: capture.before.map(encoded),
      target: encoded(Buffer.from(capture.targetConfig)),
      receipt: null,
      progress: 'intent',
      relocation,
    };
    await body({ root, request, capture, record });
    succeeded = true;
  } finally {
    console.info('Retained consumer fixture: ' + root);
    if (succeeded) expect(performance.now()).toBeLessThan(deadline);
  }
}

test('apply moves original file and ADS while retaining source and empty directories', async () => {
  await withFixture(async ({ root, request, capture }) => {
    const source = path.join(root, 'old/nested/a.txt');
    if (process.platform === 'win32') await writeFile(source + ':proof', 'stream');
    const plan = captureConsumerConfiguration(request).plan;
    expect(plan.binding).toBe(capture.plan.binding);
    const result = await applyConsumerConfiguration(request, plan.binding, plan.operation_id);
    expect(result.relocation).toEqual({ source_directories_retained: 3, source_empty_directories_retained: 2 });
    expect(await readFile(path.join(root, 'new/nested/a.txt'), 'utf8')).toBe('sentinel');
    if (process.platform === 'win32')
      expect(await readFile(path.join(root, 'new/nested/a.txt') + ':proof', 'utf8')).toBe('stream');
    expect(await Bun.file(source).exists()).toBe(false);
  });
}, 30000);

test('resume reconciles issued original at target', async () => {
  await withFixture(async ({ root, request, record }) => {
    const relocation = record.relocation!;
    const item = relocation.inventory[0]!;
    const file = item.files[0]!;
    const access = requireSafeRepositoryAccess(root);
    await mkdir(path.join(root, 'new/nested'));
    const targetDirectories = [{ path: 'new/nested', identity: access.directoryIdentity('new/nested', 'target') }];
    await rename(path.join(root, file.source), path.join(root, file.destination));
    const journal: ConsumerConfigurationOperation = {
      ...record,
      relocation: { ...relocation, inventory: [{ ...item, targetDirectories, files: [{ ...file, state: 'issued' }] }] },
    };
    await writeFile(path.join(root, '.agent/runtime-initialization.pending.v1.json'), JSON.stringify(journal) + '\n');
    const result = await resumeConsumerConfiguration(request, record.operation_id);
    expect(result.status).toBe('completed');
    expect(await readFile(path.join(root, file.destination), 'utf8')).toBe('sentinel');
  });
}, 30000);

test('issued source remains unknown and unchanged', async () => {
  await withFixture(async ({ root, request, record }) => {
    const relocation = record.relocation!;
    const item = relocation.inventory[0]!;
    const file = item.files[0]!;
    const journal: ConsumerConfigurationOperation = {
      ...record,
      relocation: { ...relocation, inventory: [{ ...item, files: [{ ...file, state: 'issued' }] }] },
    };
    const pending = Buffer.from(JSON.stringify(journal) + '\n');
    const slot = path.join(root, '.agent/runtime-initialization.pending.v1.json');
    await writeFile(slot, pending);
    await Promise.resolve(expect(resumeConsumerConfiguration(request, record.operation_id)).rejects.toThrow());
    expect(await readFile(slot)).toEqual(pending);
    expect(await readFile(path.join(root, file.source), 'utf8')).toBe('sentinel');
    expect(await Bun.file(path.join(root, file.destination)).exists()).toBe(false);
  });
}, 30000);

test('pending container requires a positive empty planned directory', async () => {
  await withFixture(async ({ root, request, record }) => {
    const relocation = record.relocation!;
    const item = relocation.inventory[0]!;
    const journal: ConsumerConfigurationOperation = {
      ...record,
      relocation: { ...relocation, inventory: [{ ...item, pendingDirectory: 'new/empty' }] },
    };
    const pending = Buffer.from(JSON.stringify(journal) + '\n');
    const slot = path.join(root, '.agent/runtime-initialization.pending.v1.json');
    await writeFile(slot, pending);
    await Promise.resolve(expect(resumeConsumerConfiguration(request, record.operation_id)).rejects.toThrow());
    expect(await readFile(slot)).toEqual(pending);
    await mkdir(path.join(root, 'new/empty'));
    await writeFile(path.join(root, 'new/empty/foreign'), 'foreign');
    await Promise.resolve(expect(resumeConsumerConfiguration(request, record.operation_id)).rejects.toThrow());
    expect(await readFile(slot)).toEqual(pending);
    await rm(path.join(root, 'new/empty/foreign'));
    expect((await resumeConsumerConfiguration(request, record.operation_id)).status).toBe('completed');
  });
}, 30000);

test('same-byte foreign target and source-target collision are denied', async () => {
  await withFixture(async ({ root, request, record }) => {
    const relocation = record.relocation!;
    const item = relocation.inventory[0]!;
    const file = item.files[0]!;
    const access = requireSafeRepositoryAccess(root);
    await mkdir(path.join(root, 'new/nested'));
    const targetDirectories = [{ path: 'new/nested', identity: access.directoryIdentity('new/nested', 'target') }];
    const journal: ConsumerConfigurationOperation = {
      ...record,
      relocation: { ...relocation, inventory: [{ ...item, targetDirectories, files: [{ ...file, state: 'issued' }] }] },
    };
    const pending = Buffer.from(JSON.stringify(journal) + '\n');
    const slot = path.join(root, '.agent/runtime-initialization.pending.v1.json');
    await writeFile(slot, pending);
    await writeFile(path.join(root, file.destination), 'sentinel');
    await Promise.resolve(expect(resumeConsumerConfiguration(request, record.operation_id)).rejects.toThrow());
    await rename(path.join(root, file.source), path.join(root, 'held-original'));
    await Promise.resolve(expect(resumeConsumerConfiguration(request, record.operation_id)).rejects.toThrow());
    expect(await readFile(slot)).toEqual(pending);
    expect(await readFile(path.join(root, file.destination), 'utf8')).toBe('sentinel');
  });
}, 30000);
