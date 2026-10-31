import { describe, expect, test } from 'bun:test';
import { validateRuntimeInitializationReceipt } from '../src/config/initialization-record.ts';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalRepositoryRoot, deriveWorkspaceId } from '../src/workspace-identity.ts';
import { derivePendingConfigurationReceipt, initializeProjectFromBundle } from '../bin/init-core.ts';
import { captureConsumerConfiguration, planConsumerConfiguration } from '../bin/init-configuration.ts';
import { withExclusiveInitConfigAdmission } from '../src/config/storage-read-admission.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import {
  applyConsumerConfiguration,
  inspectConsumerConfigurationOperation,
  resumeConsumerConfiguration,
  validateConsumerConfigurationOperation,
} from '../bin/consumer-configuration-operation.ts';

const encoded = (text: string) => ({
  base64: Buffer.from(text).toString('base64'),
  sha256: createHash('sha256').update(text).digest('hex'),
});

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseOperation(text: string) {
  const value: unknown = JSON.parse(text);
  return validateConsumerConfigurationOperation(value);
}

async function parseReceipt(text: string) {
  const value: unknown = JSON.parse(text);
  const schema = await readFile(path.join(packageRoot, 'schemas/runtime-initialization.v1.schema.json'), 'utf8');
  return validateRuntimeInitializationReceipt(value, schema);
}
const slot = '.agent/runtime-initialization.pending.v1.json';
const config = 'agent-runtime.config.v1.yaml';
async function fixture() {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'vida-config-operation-')));
  for (const name of ['one', 'two']) await mkdir(path.join(root, name));
  const request = { projectRoot: root, repository: 'example', projectMappings: ['one=one'] };
  await initializeProjectFromBundle(request, packageRoot);
  const receipt = await readFile(path.join(root, '.agent/runtime-initialization.v1.json'));
  await rm(path.join(root, '.agent/runtime-initialization.v1.json'));
  return { root, receipt, desired: { ...request, projectMappings: ['one=one', 'two=two'] } };
}
async function intent(root: string, desired: Awaited<ReturnType<typeof fixture>>['desired']) {
  const captured = captureConsumerConfiguration(desired);
  const derived = captured.receipt
    ? await withExclusiveInitConfigAdmission(root, deriveWorkspaceId(desired.repository, root), ({ assertActive }) =>
        derivePendingConfigurationReceipt(desired, assertActive),
      )
    : null;
  const identity = requireSafeRepositoryAccess(root).directoryIdentity('.', 'configuration root');
  const journal = {
    schema: 'ConsumerConfigurationOperation/v1',
    version: 1,
    operation_id: captured.plan.operation_id,
    root,
    root_identity: identity,
    workspace_id: deriveWorkspaceId(desired.repository, root),
    request: desired,
    binding: captured.plan.binding,
    before: captured.before.map((b) => ({
      base64: b.toString('base64'),
      sha256: createHash('sha256').update(b).digest('hex'),
    })),
    target: encoded(captured.targetConfig),
    receipt: derived
      ? {
          before: encoded(derived.beforeReceipt.toString('utf8')),
          target: encoded(derived.targetReceipt),
        }
      : null,
    progress: 'intent',
  };
  await writeFile(path.join(root, slot), JSON.stringify(journal) + '\n');
  return { journal, captured };
}

test('old pending and stale binding deny before config effects', async () => {
  const { root, desired, receipt } = await fixture();
  try {
    const before = await readFile(path.join(root, config));
    const plan = captureConsumerConfiguration(desired).plan;
    await writeFile(path.join(root, slot), receipt);
    expect(inspectConsumerConfigurationOperation(root).status).toBe('legacy_initialization_pending');
    await Promise.resolve(
      expect(applyConsumerConfiguration(desired, plan.binding, plan.operation_id)).rejects.toThrow(),
    );
    expect(await readFile(path.join(root, slot))).toEqual(receipt);
    await rm(path.join(root, slot));
    await Promise.resolve(
      expect(applyConsumerConfiguration(desired, '0'.repeat(64), plan.operation_id)).rejects.toThrow(/binding/i),
    );
    await Promise.resolve(
      expect(applyConsumerConfiguration(desired, plan.binding, 'foreign')).rejects.toThrow(/identity/i),
    );
    expect(await readFile(path.join(root, config))).toEqual(before);
    expect(await Bun.file(path.join(root, slot)).exists()).toBe(false);
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);

test('recovers after config CAS and retains intent on archive collision', async () => {
  const { root, desired } = await fixture();
  try {
    const { captured } = await intent(root, desired);
    await writeFile(path.join(root, config), captured.targetConfig);
    const archive = path.join(root, `.agent/consumer-configuration-operation.${captured.plan.operation_id}.v1.json`);
    await writeFile(archive, 'foreign');
    await Promise.resolve(
      expect(resumeConsumerConfiguration(desired, captured.plan.operation_id)).rejects.toThrow(/archive/i),
    );
    expect(await Bun.file(path.join(root, slot)).exists()).toBe(true);
    expect(await readFile(archive, 'utf8')).toBe('foreign');
    await rm(archive);
    expect(await resumeConsumerConfiguration(desired, captured.plan.operation_id)).toEqual({
      operation_id: captured.plan.operation_id,
      status: 'completed',
    });
    expect(await Bun.file(path.join(root, slot)).exists()).toBe(false);
    expect(await readFile(path.join(root, config), 'utf8')).toBe(captured.targetConfig);
    expect(parseOperation(await readFile(archive, 'utf8')).progress).toBe('complete');
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);

test('target mutation, foreign identity and mixed outputs fence recovery', async () => {
  const { root, desired } = await fixture();
  try {
    const { journal } = await intent(root, desired);
    await Promise.resolve(expect(resumeConsumerConfiguration(desired, 'foreign')).rejects.toThrow(/identity/i));
    await writeFile(path.join(root, slot), JSON.stringify({ ...journal, target: encoded('forged') }));
    await Promise.resolve(expect(resumeConsumerConfiguration(desired, journal.operation_id)).rejects.toThrow());
    await writeFile(path.join(root, slot), JSON.stringify(journal));
    await writeFile(path.join(root, 'AGENTS.md'), 'foreign');
    await Promise.resolve(
      expect(resumeConsumerConfiguration(desired, journal.operation_id)).rejects.toThrow(/outputs/i),
    );
    expect(await Bun.file(path.join(root, slot)).exists()).toBe(true);
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);

test('applies a bound plan and archives the completed intent', async () => {
  const { root, desired } = await fixture();
  try {
    const captured = captureConsumerConfiguration(desired);
    expect(await applyConsumerConfiguration(desired, captured.plan.binding, captured.plan.operation_id)).toEqual({
      operation_id: captured.plan.operation_id,
      status: 'completed',
    });
    expect(await readFile(path.join(root, config), 'utf8')).toBe(captured.targetConfig);
    expect(inspectConsumerConfigurationOperation(root).status).toBe('no_pending');
    expect(
      parseOperation(
        await readFile(
          path.join(root, `.agent/consumer-configuration-operation.${captured.plan.operation_id}.v1.json`),
          'utf8',
        ),
      ).progress,
    ).toBe('complete');
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);

test('configures existing inputs when the coordination namespace is absent', async () => {
  const { root, desired } = await fixture();
  try {
    await rm(path.join(root, '.agent'), { recursive: true });
    const inputs = ['AGENTS.md', 'AGENT.sidecar.md', config, 'docs/agent-instructions/documentation-policy.v1.json'];
    const stale = planConsumerConfiguration(desired);
    await writeFile(path.join(root, config), (await readFile(path.join(root, config), 'utf8')) + '\n');
    const before = await Promise.all(inputs.map((name) => readFile(path.join(root, name))));
    const captured = captureConsumerConfiguration(desired);
    expect(captured.plan.binding).not.toBe(stale.binding);
    expect(planConsumerConfiguration(desired)).toEqual(captured.plan);
    expect(existsSync(path.join(root, '.agent'))).toBe(false);
    await Promise.resolve(
      expect(applyConsumerConfiguration(desired, stale.binding, stale.operation_id)).rejects.toThrow(/binding/i),
    );
    await Promise.resolve(
      expect(applyConsumerConfiguration(desired, captured.plan.binding, 'foreign')).rejects.toThrow(/identity/i),
    );
    await Promise.resolve(
      expect(applyConsumerConfiguration(desired, captured.plan.binding, '../invalid')).rejects.toThrow(/identity/i),
    );
    expect(existsSync(path.join(root, '.agent'))).toBe(false);
    expect(await applyConsumerConfiguration(desired, captured.plan.binding, captured.plan.operation_id)).toEqual({
      operation_id: captured.plan.operation_id,
      status: 'completed',
    });
    const archive = parseOperation(
      await readFile(
        path.join(root, `.agent/consumer-configuration-operation.${captured.plan.operation_id}.v1.json`),
        'utf8',
      ),
    );
    expect(archive.progress).toBe('complete');
    expect(archive.before.map((entry) => Buffer.from(entry.base64, 'base64'))).toEqual(before);
    expect(archive.receipt).toBeNull();
    for (const [index, name] of inputs.entries())
      expect(await readFile(path.join(root, name))).toEqual(
        index === 2 ? Buffer.from(captured.targetConfig) : before[index]!,
      );
    expect(existsSync(path.join(root, slot))).toBe(false);
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);

test('pending receipt is refreshed with preserved provenance and creation time', async () => {
  const { root, desired, receipt } = await fixture();
  try {
    const receiptPath = path.join(root, '.agent/runtime-initialization.v1.json');
    await writeFile(receiptPath, receipt);
    const old = await parseReceipt(receipt.toString('utf8'));
    const capture = captureConsumerConfiguration(desired);
    await applyConsumerConfiguration(desired, capture.plan.binding, capture.plan.operation_id);
    const updated = await parseReceipt(await readFile(receiptPath, 'utf8'));
    expect(updated.created_at).toBe(old.created_at);
    expect(updated.provenance).toBe(old.provenance);
    expect(updated.workspace_binding_status).toBe('pending');
    expect(updated.project_ids).toEqual(['one', 'two']);
    expect(updated.config_digest).not.toBe(old.config_digest);
    expect(await readFile(path.join(root, config), 'utf8')).toBe(capture.targetConfig);
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);

test('adopted provenance remains adopted across receipt refresh', async () => {
  const { root, desired, receipt } = await fixture();
  try {
    const receiptPath = path.join(root, '.agent/runtime-initialization.v1.json');
    const adopted = { ...(await parseReceipt(receipt.toString('utf8'))), provenance: 'adopted_existing' };
    await writeFile(receiptPath, JSON.stringify(adopted) + '\n');
    const capture = captureConsumerConfiguration(desired);
    await applyConsumerConfiguration(desired, capture.plan.binding, capture.plan.operation_id);
    const updated = await parseReceipt(await readFile(receiptPath, 'utf8'));
    expect(updated.provenance).toBe('adopted_existing');
    expect(updated.created_at).toBe(adopted.created_at);
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);

test('receipt CAS recovery accepts only config then receipt prefix', async () => {
  const { root, desired, receipt } = await fixture();
  try {
    const receiptPath = path.join(root, '.agent/runtime-initialization.v1.json');
    await writeFile(receiptPath, receipt);
    const { journal, captured } = await intent(root, desired);
    if (!journal.receipt) throw new Error('Expected receipt intent');
    await writeFile(receiptPath, Buffer.from(journal.receipt.target.base64, 'base64'));
    await Promise.resolve(expect(resumeConsumerConfiguration(desired, journal.operation_id)).rejects.toThrow());
    expect(await Bun.file(path.join(root, slot)).exists()).toBe(true);
    await writeFile(receiptPath, receipt);
    await writeFile(path.join(root, config), captured.targetConfig);
    await writeFile(path.join(root, slot), JSON.stringify({ ...journal, progress: 'config_applied' }) + '\n');
    await writeFile(receiptPath, Buffer.from(journal.receipt.target.base64, 'base64'));
    expect(await resumeConsumerConfiguration(desired, journal.operation_id)).toEqual({
      operation_id: journal.operation_id,
      status: 'completed',
    });
    expect(await Bun.file(path.join(root, slot)).exists()).toBe(false);
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);

test('recovery completes the receipt after a config-only effect', async () => {
  const { root, desired, receipt } = await fixture();
  try {
    const receiptPath = path.join(root, '.agent/runtime-initialization.v1.json');
    await writeFile(receiptPath, receipt);
    const { journal, captured } = await intent(root, desired);
    if (!journal.receipt) throw new Error('Expected receipt intent');
    await writeFile(path.join(root, config), captured.targetConfig);
    await writeFile(path.join(root, slot), JSON.stringify({ ...journal, progress: 'config_applied' }) + '\n');
    await resumeConsumerConfiguration(desired, journal.operation_id);
    expect(await readFile(receiptPath)).toEqual(Buffer.from(journal.receipt.target.base64, 'base64'));
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);

test('bound or altered receipt and Host state are refused before intent', async () => {
  const { root, desired, receipt } = await fixture();
  try {
    const receiptPath = path.join(root, '.agent/runtime-initialization.v1.json');
    const bound = { ...(await parseReceipt(receipt.toString('utf8'))), workspace_binding_status: 'bound' };
    await writeFile(receiptPath, JSON.stringify(bound));
    await Promise.resolve(expect(applyConsumerConfiguration(desired, '0'.repeat(64), 'op1')).rejects.toThrow());
    const stale = { ...(await parseReceipt(receipt.toString('utf8'))), config_digest: '0'.repeat(64) };
    await writeFile(receiptPath, JSON.stringify(stale));
    await Promise.resolve(expect(applyConsumerConfiguration(desired, '0'.repeat(64), 'op1')).rejects.toThrow());
    await writeFile(receiptPath, receipt);
    const plan = captureConsumerConfiguration(desired).plan;
    await mkdir(path.join(root, '.agent/work'), { recursive: true });
    await writeFile(path.join(root, '.agent/work/session-handoff.v1.sqlite'), 'host');
    await Promise.resolve(
      expect(applyConsumerConfiguration(desired, plan.binding, plan.operation_id)).rejects.toThrow(),
    );
    expect(await Bun.file(path.join(root, slot)).exists()).toBe(false);
    expect(await readFile(receiptPath)).toEqual(receipt);
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);

function record(): ReturnType<typeof validateConsumerConfigurationOperation> {
  const root = canonicalRepositoryRoot(process.cwd());
  return {
    schema: 'ConsumerConfigurationOperation/v1',
    version: 1,
    operation_id: 'test-op',
    root,
    root_identity: 'identity',
    workspace_id: deriveWorkspaceId('test-repo', root),
    request: { projectRoot: root, repository: 'test-repo', projectMappings: ['test=.'] },
    binding: 'a'.repeat(64),
    before: [encoded('agents'), encoded('sidecar'), encoded('old'), encoded('policy')],
    target: encoded('target'),
    receipt: null,
    progress: 'intent',
  };
}

describe('frozen configuration record validation', () => {
  test('accepts a closed record with matching byte digests', () => {
    const value = record();
    expect(validateConsumerConfigurationOperation(value)).toEqual(value);
  });
  test('rejects target mutation, unknown fields and foreign schemas', () => {
    const value = record();
    expect(() =>
      validateConsumerConfigurationOperation({
        ...value,
        target: { ...value.target, base64: encoded('changed').base64 },
      }),
    ).toThrow();
    expect(() => validateConsumerConfigurationOperation({ ...value, extra: true })).toThrow();
    expect(() => validateConsumerConfigurationOperation({ ...value, schema: 'RuntimeInitialization/v1' })).toThrow();
  });
  test('rejects repository and root identity bindings that differ', () => {
    const value = record();
    expect(() =>
      validateConsumerConfigurationOperation({ ...value, request: { ...value.request, repository: 'other' } }),
    ).toThrow();
    expect(() => validateConsumerConfigurationOperation({ ...value, root: value.root + '-other' })).toThrow();
  });
});
