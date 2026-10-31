import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { captureConsumerConfiguration, captureConsumerConfigurationForRecovery } from '../bin/init-configuration.ts';
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

test('read-only recovery admits only the original object and qualified directory snapshots', async () => {
  const deadline = performance.now() + 30000;
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'vida-relocation-recovery-')));
  let succeeded = false;
  try {
    await mkdir(path.join(root, 'old/nested'), { recursive: true });
    await mkdir(path.join(root, 'new'));
    const initial = { projectRoot: root, repository: 'example', projectMappings: ['alpha=old'] };
    await initializeProjectFromBundle(initial, packageRoot);
    await rm(path.join(root, '.agent/runtime-initialization.v1.json'));
    await writeFile(path.join(root, 'old/nested/a.txt'), 'sentinel');
    const request = { ...initial, projectMappings: ['alpha=new'], projectMoves: ['alpha=old:new'] };
    const original = captureConsumerConfiguration(request);
    const access = requireSafeRepositoryAccess(root);
    const identity = access.directoryIdentity('.', 'configuration root');
    const relocation = freezeConsumerRelocation(request, original, identity);
    const record = (): ConsumerConfigurationOperation => ({
      schema: 'ConsumerConfigurationOperation/v1',
      version: 1,
      operation_id: original.plan.operation_id,
      root,
      root_identity: identity,
      workspace_id: deriveWorkspaceId(request.repository, root),
      request,
      binding: original.plan.binding,
      before: original.before.map(encoded),
      target: encoded(Buffer.from(original.targetConfig)),
      receipt: null,
      progress: 'intent',
      relocation,
    });
    const pendingPath = path.join(root, '.agent/runtime-initialization.pending.v1.json');
    const observe = async (value: unknown) => {
      const pending = Buffer.from(JSON.stringify(value) + '\n');
      await writeFile(pendingPath, pending);
      const result = captureConsumerConfigurationForRecovery(request, {
        pending,
        before: original.before,
        target: Buffer.from(original.targetConfig),
        beforeReceipt: null,
        targetReceipt: null,
      });
      expect(await readFile(pendingPath)).toEqual(pending);
      return result;
    };
    expect((await observe(record())).plan.binding).toBe(original.plan.binding);
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), original.targetConfig);
    await writeFile(path.join(root, 'docs/agent-instructions/documentation-policy.v1.json'), original.targetPolicy);
    await Promise.resolve(
      expect(
        observe({
          ...record(),
          progress: 'complete',
          relocation: { ...relocation, policy: { ...relocation.policy, state: 'completed' } },
        }),
      ).rejects.toThrow(/precedes relocation/),
    );
    await writeFile(path.join(root, 'agent-runtime.config.v1.yaml'), original.before[2]!);
    await writeFile(path.join(root, 'docs/agent-instructions/documentation-policy.v1.json'), original.before[3]!);
    const item = relocation.inventory[0]!;
    const file = item.files[0]!;
    const issued = { ...relocation, inventory: [{ ...item, files: [{ ...file, state: 'issued' as const }] }] };
    await Promise.resolve(expect(observe({ ...record(), relocation: issued })).rejects.toThrow());
    await mkdir(path.join(root, 'new/nested'));
    const targetDirectories = [{ path: 'new/nested', identity: access.directoryIdentity('new/nested', 'target') }];
    const qualified = { ...issued, inventory: [{ ...issued.inventory[0]!, targetDirectories }] };
    await Promise.resolve(expect(observe({ ...record(), relocation: qualified })).rejects.toThrow());
    await rename(path.join(root, 'old/nested/a.txt'), path.join(root, 'new/nested/a.txt'));
    await Promise.resolve(expect(observe({ ...record(), relocation: issued })).rejects.toThrow());
    expect((await observe({ ...record(), relocation: qualified })).plan.binding).toBe(original.plan.binding);
    const completed = {
      ...qualified,
      inventory: [{ ...qualified.inventory[0]!, files: [{ ...file, state: 'completed' as const }] }],
    };
    expect(
      (await observe({ ...record(), relocation: completed })).relocationInventory[0]!.files[0]!.bytes.toString(),
    ).toBe('sentinel');
    await rename(path.join(root, 'new/nested/a.txt'), path.join(root, 'held-sentinel'));
    await writeFile(path.join(root, 'new/nested/a.txt'), 'sentinel');
    await Promise.resolve(expect(observe({ ...record(), relocation: completed })).rejects.toThrow());
    await rm(path.join(root, 'new/nested/a.txt'));
    await rename(path.join(root, 'held-sentinel'), path.join(root, 'new/nested/a.txt'));
    await writeFile(path.join(root, 'old/nested/a.txt'), 'collision');
    await Promise.resolve(expect(observe({ ...record(), relocation: completed })).rejects.toThrow());
    await rm(path.join(root, 'old/nested/a.txt'));
    await writeFile(path.join(root, 'new/nested/a.txt'), 'changed');
    await Promise.resolve(expect(observe({ ...record(), relocation: completed })).rejects.toThrow());
    const invalid: unknown[] = [
      {
        ...record(),
        relocation: {
          ...qualified,
          inventory: [{ ...qualified.inventory[0]!, targetDirectories: [{ ...targetDirectories[0]!, extra: true }] }],
        },
      },
      {
        ...record(),
        relocation: {
          ...qualified,
          inventory: [
            { ...qualified.inventory[0]!, targetDirectories: [{ ...targetDirectories[0]!, path: 'new/foreign' }] },
          ],
        },
      },
    ];
    for (const value of invalid) expect(() => validateConsumerConfigurationOperation(value)).toThrow();
    succeeded = true;
  } finally {
    console.info('Retained consumer fixture: ' + root);
    if (succeeded) expect(performance.now()).toBeLessThan(deadline);
  }
}, 30000);
