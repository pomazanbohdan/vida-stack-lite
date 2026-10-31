import { expect, test } from 'bun:test';
import { validateRuntimeInitializationReceipt } from '../src/config/initialization-record.ts';
import { validateDocumentationPolicy } from '../src/documentation/policy.ts';
import { link, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { captureConsumerProjectMoveInventory, parseConsumerProjectMoves } from '../bin/consumer-project-relocation.ts';
import { captureConsumerConfiguration } from '../bin/init-configuration.ts';
import { derivePendingConfigurationReceipt, initializeProjectFromBundle } from '../bin/init-core.ts';
import { withExclusiveInitConfigAdmission } from '../src/config/storage-read-admission.ts';
import { deriveWorkspaceId } from '../src/workspace-identity.ts';
import { parseRuntimeConfigYaml } from '../src/config/runtime-config.ts';

const current = new Map([
  ['alpha', 'old'],
  ['beta', 'other'],
]);
const desired = [
  { id: 'alpha', root: 'new' },
  { id: 'beta', root: 'other' },
];

test('binds explicit stable identity and roots', () => {
  expect(parseConsumerProjectMoves(['alpha=old:new'], current, desired)).toEqual([
    { id: 'alpha', oldRoot: 'old', newRoot: 'new' },
  ]);
  expect(() => parseConsumerProjectMoves([], current, desired)).toThrow(/explicit move/);
  expect(() => parseConsumerProjectMoves(['alpha=wrong:new'], current, desired)).toThrow();
  expect(() => parseConsumerProjectMoves(['alpha=old:new', 'alpha=old:new'], current, desired)).toThrow();
});

test('candidate inventory preserves files and rejects a nonempty destination and hard links', async () => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'vida-move-inventory-')));
  try {
    await mkdir(path.join(root, 'old', 'nested'), { recursive: true });
    await mkdir(path.join(root, 'new'));
    await writeFile(path.join(root, 'old', 'nested', 'sentinel.txt'), 'private');
    const move = { id: 'alpha', oldRoot: 'old', newRoot: 'new' };
    const inventory = captureConsumerProjectMoveInventory(root, move);
    expect(inventory.files.map((entry) => entry.destination)).toEqual(['new/nested/sentinel.txt']);
    expect(await readFile(path.join(root, 'old', 'nested', 'sentinel.txt'), 'utf8')).toBe('private');
    await writeFile(path.join(root, 'new', 'foreign'), 'foreign');
    expect(() => captureConsumerProjectMoveInventory(root, move)).toThrow(/empty/);
    await rm(path.join(root, 'new', 'foreign'));
    await link(path.join(root, 'old', 'nested', 'sentinel.txt'), path.join(root, 'old', 'hardlink'));
    expect(() => captureConsumerProjectMoveInventory(root, move)).toThrow();
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);

test('rejects root, metadata, overlaps and unselected identities', () => {
  for (const newRoot of ['.', '.agent/data', 'old/nested', 'other/nested', '../escape']) {
    const next = [
      { id: 'alpha', root: newRoot },
      { id: 'beta', root: 'other' },
    ];
    expect(() => parseConsumerProjectMoves([`alpha=old:${newRoot}`], current, next)).toThrow();
  }
  expect(() => parseConsumerProjectMoves(['missing=old:new'], current, desired)).toThrow();
});

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parsePolicy(text: string) {
  const value: unknown = JSON.parse(text);
  return validateDocumentationPolicy(value, 'docs/agent-instructions/documentation-policy.v1.json');
}

async function parseReceipt(text: string) {
  const value: unknown = JSON.parse(text);
  const schema = await readFile(path.join(packageRoot, 'schemas/runtime-initialization.v1.schema.json'), 'utf8');
  return validateRuntimeInitializationReceipt(value, schema);
}
async function relocationFixture() {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'vida-relocation-plan-')));
  await mkdir(path.join(root, 'old', 'nested'), { recursive: true });
  await mkdir(path.join(root, 'new'));
  const initial = { projectRoot: root, repository: 'example', projectMappings: ['alpha=old'] };
  await initializeProjectFromBundle(initial, packageRoot);
  await writeFile(path.join(root, 'old/nested/sentinel.txt'), 'private-sentinel');
  const desired = { ...initial, projectMappings: ['alpha=new'], projectMoves: ['alpha=old:new'] };
  return { root, desired };
}

async function tree(root: string, part = ''): Promise<string[]> {
  const result: string[] = [];
  for (const entry of (await readdir(path.join(root, part), { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const relative = part ? `${part}/${entry.name}` : entry.name;
    result.push(relative);
    if (entry.isDirectory()) result.push(...(await tree(root, relative)));
    else result.push((await readFile(path.join(root, relative))).toString('base64'));
  }
  return result;
}

test('read-only plan rebases typed paths and policy while redacting inventory', async () => {
  const { root, desired } = await relocationFixture();
  try {
    await rm(path.join(root, '.agent/runtime-initialization.v1.json'));
    const policyPath = path.join(root, 'docs/agent-instructions/documentation-policy.v1.json');
    const policy = {
      ...parsePolicy(await readFile(policyPath, 'utf8')),
      canonical_roots: ['old/nested'],
      map_paths: ['old/nested/sentinel.txt'],
    };
    await writeFile(policyPath, JSON.stringify(policy));
    const before = await tree(root);
    const capture = captureConsumerConfiguration(desired);
    const target = parseRuntimeConfigYaml(capture.targetConfig);
    expect(target.projects[0]?.project_id).toBe('alpha');
    expect(target.projects[0]?.project_root).toBe('new');
    expect(target.projects[0]?.wiki_root).toBe('new/docs');
    expect(parsePolicy(capture.targetPolicy).canonical_roots).toEqual(['new/nested']);
    expect(parsePolicy(capture.targetPolicy).map_paths).toEqual(['new/nested/sentinel.txt']);
    expect(capture.plan.changes.relocation).toMatchObject({ files: 1, projection: 'plan_only' });
    expect(JSON.stringify(capture.plan)).not.toContain('private-sentinel');
    expect(JSON.stringify(capture.plan)).not.toContain('sentinel.txt');
    expect(await tree(root)).toEqual(before);
    expect(captureConsumerConfiguration(desired).plan).toEqual(capture.plan);
    expect(await tree(root)).toEqual(before);
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);

test('pending receipt planning preserves provenance and binds target config', async () => {
  const { root, desired } = await relocationFixture();
  try {
    const before = await readFile(path.join(root, '.agent/runtime-initialization.v1.json'));
    const previous = await parseReceipt(before.toString('utf8'));
    const derived = await withExclusiveInitConfigAdmission(
      root,
      deriveWorkspaceId(desired.repository, root),
      ({ assertActive }) => derivePendingConfigurationReceipt(desired, assertActive),
    );
    const receipt = await parseReceipt(derived.targetReceipt);
    expect(receipt.created_at).toBe(previous.created_at);
    expect(receipt.provenance).toBe(previous.provenance);
    expect(receipt.config_digest).not.toBe(previous.config_digest);
    expect(await readFile(path.join(root, '.agent/runtime-initialization.v1.json'))).toEqual(before);
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);

test('derived pending receipt binds the projected policy bytes', async () => {
  const { root, desired } = await relocationFixture();
  try {
    const policyPath = path.join(root, 'docs/agent-instructions/documentation-policy.v1.json');
    const receiptPath = path.join(root, '.agent/runtime-initialization.v1.json');
    const policy = { ...parsePolicy(await readFile(policyPath, 'utf8')), canonical_roots: ['old/nested'] };
    const policyBytes = Buffer.from(JSON.stringify(policy));
    await writeFile(policyPath, policyBytes);
    const original = await parseReceipt(await readFile(receiptPath, 'utf8'));
    const amended = {
      ...original,
      templates: original.templates.map((entry, index) =>
        index === 3 ? { ...entry, output_sha256: createHash('sha256').update(policyBytes).digest('hex') } : entry,
      ),
    };
    await writeFile(receiptPath, JSON.stringify(amended) + '\n');
    const capture = captureConsumerConfiguration(desired);
    const result = await withExclusiveInitConfigAdmission(
      root,
      deriveWorkspaceId(desired.repository, root),
      ({ assertActive }) => derivePendingConfigurationReceipt(desired, assertActive),
    );
    const targetReceipt = await parseReceipt(result.targetReceipt);
    expect(targetReceipt.templates[3]?.output_sha256).toBe(
      createHash('sha256').update(capture.targetPolicy).digest('hex'),
    );
    expect(targetReceipt.created_at).toBe(original.created_at);
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);

test('missing move, foreign destination and same-byte replacement change or deny plan', async () => {
  const { root, desired } = await relocationFixture();
  try {
    await rm(path.join(root, '.agent/runtime-initialization.v1.json'));
    expect(() => captureConsumerConfiguration({ ...desired, projectMoves: [] })).toThrow(/explicit move/i);
    const first = captureConsumerConfiguration(desired).plan;
    const file = path.join(root, 'old/nested/sentinel.txt');
    await rename(file, path.join(root, 'old/nested/displaced'));
    await writeFile(file, 'private-sentinel');
    await rm(path.join(root, 'old/nested/displaced'));
    const second = captureConsumerConfiguration(desired).plan;
    expect(second.binding).not.toBe(first.binding);
    await writeFile(path.join(root, 'new/foreign'), 'foreign');
    expect(() => captureConsumerConfiguration(desired)).toThrow(/empty/i);
  } finally {
    console.info('Retained consumer fixture: ' + root);
  }
}, 30000);
