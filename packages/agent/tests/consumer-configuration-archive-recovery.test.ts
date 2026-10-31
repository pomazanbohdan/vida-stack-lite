import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeProjectFromBundle } from '../bin/init-core.ts';
import { captureConsumerConfiguration } from '../bin/init-configuration.ts';
import {
  applyConsumerConfiguration,
  resumeConsumerConfiguration,
  validateConsumerConfigurationOperation,
} from '../bin/consumer-configuration-operation.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function scenario(move: boolean): Promise<void> {
  const deadline = performance.now() + 30000;
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'vida-config-archive-')));
  let succeeded = false;
  try {
    await mkdir(path.join(root, 'old/nested'), { recursive: true });
    await mkdir(path.join(root, 'new'));
    const initial = { projectRoot: root, repository: 'example', projectMappings: ['alpha=old'] };
    await initializeProjectFromBundle(initial, packageRoot);
    await writeFile(path.join(root, 'old/nested/a.txt'), 'sentinel');
    const request = move
      ? { ...initial, projectMappings: ['alpha=new'], projectMoves: ['alpha=old:new'] }
      : { ...initial, projectMappings: ['alpha=old', 'beta=new'] };
    const plan = captureConsumerConfiguration(request).plan;
    const first = await applyConsumerConfiguration(request, plan.binding, plan.operation_id);
    const archivePath = path.join(root, `.agent/consumer-configuration-operation.${plan.operation_id}.v1.json`);
    const slot = path.join(root, '.agent/runtime-initialization.pending.v1.json');
    const configPath = path.join(root, 'agent-runtime.config.v1.yaml');
    const receiptPath = path.join(root, '.agent/runtime-initialization.v1.json');
    const policyPath = path.join(root, 'docs/agent-instructions/documentation-policy.v1.json');
    const dataPath = path.join(root, move ? 'new/nested/a.txt' : 'old/nested/a.txt');
    const archive = await readFile(archivePath);
    const config = await readFile(configPath);
    const receipt = await readFile(receiptPath);
    const policy = await readFile(policyPath);
    const data = await readFile(dataPath);
    const unchanged = async () => {
      expect(await readFile(archivePath)).toEqual(archive);
      expect(await readFile(configPath)).toEqual(config);
      expect(await readFile(receiptPath)).toEqual(receipt);
      expect(await readFile(policyPath)).toEqual(policy);
      expect(await readFile(dataPath)).toEqual(data);
      expect(await Bun.file(slot).exists()).toBe(false);
    };
    expect(await resumeConsumerConfiguration(request, plan.operation_id)).toEqual(first);
    await unchanged();
    await Promise.resolve(
      expect(resumeConsumerConfiguration({ ...request, repository: 'foreign' }, plan.operation_id)).rejects.toThrow(),
    );
    await Promise.resolve(expect(resumeConsumerConfiguration(request, `config-${'0'.repeat(64)}`)).rejects.toThrow());
    await Promise.resolve(expect(resumeConsumerConfiguration(request, '../escape')).rejects.toThrow());
    await unchanged();
    const heldArchive = path.join(root, 'held-archive');
    await rename(archivePath, heldArchive);
    await Promise.resolve(expect(resumeConsumerConfiguration(request, plan.operation_id)).rejects.toThrow());
    expect(await readFile(heldArchive)).toEqual(archive);
    expect(await readFile(configPath)).toEqual(config);
    expect(await readFile(receiptPath)).toEqual(receipt);
    expect(await readFile(dataPath)).toEqual(data);
    expect(await Bun.file(slot).exists()).toBe(false);
    await rename(heldArchive, archivePath);
    const parsed = validateConsumerConfigurationOperation(JSON.parse(archive.toString('utf8')));
    const incompleteRecords = [
      { ...parsed, progress: 'config_applied' },
      ...(parsed.relocation
        ? [
            {
              ...parsed,
              relocation: { ...parsed.relocation, policy: { ...parsed.relocation.policy, state: 'not-started' } },
            },
          ]
        : []),
    ];
    for (const incomplete of incompleteRecords) {
      const incompleteBytes = Buffer.from(JSON.stringify(incomplete) + '\n');
      validateConsumerConfigurationOperation(incomplete);
      await writeFile(archivePath, incompleteBytes);
      await Promise.resolve(
        expect(resumeConsumerConfiguration(request, plan.operation_id)).rejects.toThrow(/not complete/),
      );
      expect(await readFile(archivePath)).toEqual(incompleteBytes);
      expect(await readFile(configPath)).toEqual(config);
      expect(await readFile(receiptPath)).toEqual(receipt);
      expect(await readFile(dataPath)).toEqual(data);
      expect(await Bun.file(slot).exists()).toBe(false);
    }
    await writeFile(archivePath, archive);
    const tampered = Buffer.from(JSON.stringify({ ...parsed, root_identity: 'foreign' }) + '\n');
    await writeFile(archivePath, tampered);
    await Promise.resolve(expect(resumeConsumerConfiguration(request, plan.operation_id)).rejects.toThrow());
    expect(await readFile(archivePath)).toEqual(tampered);
    expect(await readFile(configPath)).toEqual(config);
    expect(await readFile(receiptPath)).toEqual(receipt);
    expect(await readFile(dataPath)).toEqual(data);
    await writeFile(archivePath, archive);
    await writeFile(configPath, 'foreign');
    await Promise.resolve(expect(resumeConsumerConfiguration(request, plan.operation_id)).rejects.toThrow());
    expect(await readFile(configPath, 'utf8')).toBe('foreign');
    expect(await readFile(archivePath)).toEqual(archive);
    expect(await readFile(receiptPath)).toEqual(receipt);
    expect(await readFile(dataPath)).toEqual(data);
    await writeFile(configPath, config);
    await writeFile(receiptPath, 'foreign');
    await Promise.resolve(expect(resumeConsumerConfiguration(request, plan.operation_id)).rejects.toThrow());
    expect(await readFile(receiptPath, 'utf8')).toBe('foreign');
    expect(await readFile(archivePath)).toEqual(archive);
    expect(await readFile(configPath)).toEqual(config);
    expect(await readFile(policyPath)).toEqual(policy);
    expect(await readFile(dataPath)).toEqual(data);
    await writeFile(receiptPath, receipt);
    await writeFile(policyPath, 'foreign');
    await Promise.resolve(expect(resumeConsumerConfiguration(request, plan.operation_id)).rejects.toThrow());
    expect(await readFile(policyPath, 'utf8')).toBe('foreign');
    expect(await readFile(archivePath)).toEqual(archive);
    expect(await readFile(configPath)).toEqual(config);
    expect(await readFile(receiptPath)).toEqual(receipt);
    expect(await readFile(dataPath)).toEqual(data);
    await writeFile(policyPath, policy);
    if (move) {
      await writeFile(dataPath, 'changed');
      await Promise.resolve(expect(resumeConsumerConfiguration(request, plan.operation_id)).rejects.toThrow());
      expect(await readFile(dataPath, 'utf8')).toBe('changed');
      expect(await readFile(archivePath)).toEqual(archive);
      await writeFile(dataPath, data);
    }
    await writeFile(slot, archive);
    await Promise.resolve(expect(resumeConsumerConfiguration(request, plan.operation_id)).rejects.toThrow());
    expect(await readFile(slot)).toEqual(archive);
    expect(await readFile(archivePath)).toEqual(archive);
    expect(await readFile(configPath)).toEqual(config);
    expect(await readFile(receiptPath)).toEqual(receipt);
    expect(await readFile(dataPath)).toEqual(data);
    await rm(slot);
    await unchanged();
    succeeded = true;
  } finally {
    console.info('Retained consumer fixture: ' + root);
    if (succeeded) expect(performance.now()).toBeLessThan(deadline);
  }
}

test('archive-only resume returns the original no-move result with pending receipt', async () => {
  await scenario(false);
}, 30000);

test('archive-only resume returns the original relocation result with pending receipt', async () => {
  await scenario(true);
}, 30000);
