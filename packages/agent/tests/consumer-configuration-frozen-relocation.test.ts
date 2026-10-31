import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureConsumerConfiguration } from '../bin/init-configuration.ts';
import { initializeProjectFromBundle } from '../bin/init-core.ts';
import {
  freezeConsumerRelocation,
  validateConsumerConfigurationOperation,
} from '../bin/consumer-configuration-operation.ts';
import type { ConsumerConfigurationOperation } from '../bin/consumer-configuration-operation.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';

const encoded = (bytes: Uint8Array) => ({
  base64: Buffer.from(bytes).toString('base64'),
  sha256: createHash('sha256').update(bytes).digest('hex'),
});
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('frozen relocation validates capture and rejects altered structure and associations', async () => {
  const deadline = performance.now() + 30000;
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'vida-frozen-relocation-')));
  let succeeded = false;
  try {
    await mkdir(path.join(root, 'old', 'nested'), { recursive: true });
    await mkdir(path.join(root, 'new'));
    const initial = { projectRoot: root, repository: 'example', projectMappings: ['alpha=old'] };
    await initializeProjectFromBundle(initial, packageRoot);
    await rm(path.join(root, '.agent/runtime-initialization.v1.json'));
    await writeFile(path.join(root, 'old/nested/a.txt'), 'sentinel');
    const request = { ...initial, projectMappings: ['alpha=new'], projectMoves: ['alpha=old:new'] };
    const capture = captureConsumerConfiguration(request);
    const identity = requireSafeRepositoryAccess(root).directoryIdentity('.', 'configuration root');
    const relocation = freezeConsumerRelocation(request, capture, identity);
    const record = (): ConsumerConfigurationOperation => ({
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
    });
    expect(validateConsumerConfigurationOperation(record())).toEqual(record());
    const inventory = relocation.inventory[0]!;
    const file = inventory.files[0]!;
    const directory = inventory.directories[0]!;
    expect(file.state).toBe('not-started');
    expect(file.size).toBe(Buffer.byteLength('sentinel'));
    expect('bytes' in file).toBe(false);
    const changedFile = (change: object): unknown => ({
      ...record(),
      relocation: { ...relocation, inventory: [{ ...inventory, files: [{ ...file, ...change }] }] },
    });
    const invalid: unknown[] = [
      { ...record(), relocation: { ...relocation, extra: true } },
      changedFile({ state: 'unknown' }),
      changedFile({ sha256: 'bad' }),
      changedFile({ size: -1 }),
      changedFile({ size: 33554433 }),
      changedFile({ destination: 'new/../escape' }),
      changedFile({ identity: '{}' }),
      changedFile({ identity: '{"birthtime_ns":"1","dev":"01","ino":"2"}' }),
      {
        ...record(),
        relocation: {
          ...relocation,
          inventory: [
            { ...inventory, directories: [{ ...directory, entries: [] }, ...inventory.directories.slice(1)] },
          ],
        },
      },
      { ...record(), request: { ...request, projectMoves: ['alpha=old:other'] } },
      {
        ...record(),
        relocation: { ...relocation, policy: { ...relocation.policy, target: encoded(Buffer.from('foreign')) } },
      },
      { ...record(), relocation: undefined },
    ];
    for (const candidate of invalid) expect(() => validateConsumerConfigurationOperation(candidate)).toThrow();
    const capturedItem = capture.relocationInventory[0]!;
    const capturedFile = capturedItem.files[0]!;
    expect(() =>
      freezeConsumerRelocation(
        request,
        {
          ...capture,
          relocationInventory: [{ ...capturedItem, files: [{ ...capturedFile, bytes: Buffer.from('foreign') }] }],
        },
        identity,
      ),
    ).toThrow(/digest/);
    succeeded = true;
  } finally {
    console.info('Retained consumer fixture: ' + root);
    if (succeeded) expect(performance.now()).toBeLessThan(deadline);
  }
}, 30000);
