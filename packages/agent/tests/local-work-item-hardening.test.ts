import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { rename } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from 'bun:test';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';
import { WORK_ITEM_TYPES } from '../src/work-items/catalog.js';
import { formatWorkItemKey } from '../src/work-items/key.js';
import { createLocalWorkItem, inspectLocalWorkItemStore, reparentLocalWorkItem } from '../src/work-items/store.js';
import { createLocalWorkItemFixture, localWorkItemTest } from './helpers/local-work-item-fixture.js';

const digest = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');
const schemaDocument = z
  .looseObject({
    $schema: z.literal('https://json-schema.org/draft/2020-12/schema'),
    properties: z.looseObject({
      canonical_kind: z.object({ type: z.literal('string'), enum: z.array(z.string()) }),
      type_code: z.object({ type: z.literal('string'), enum: z.array(z.string()) }),
    }),
  })
  .parse(JSON.parse(readFileSync(new URL('../schemas/local-work-item.v1.schema.json', import.meta.url), 'utf8')));
const ajv = new Ajv2020({ strict: true, allErrors: true, ownProperties: true });
const uuidSchema = z.string().uuid();
ajv.addFormat('uuid', { type: 'string', validate: (value: string) => uuidSchema.safeParse(value).success });
const validateFrontmatter = ajv.compile(schemaDocument);
const counterSchema = z.strictObject({
  schema: z.literal('LocalWorkItemCounter/v1'),
  owner_digest: z.string(),
  next_number: z.number().int().positive().safe(),
});

async function createOwnedFixture(operationId: string, title = 'Owned item') {
  const fixture = await createLocalWorkItemFixture();
  const outcome = await createLocalWorkItem(fixture.binding, {
    operation_id: operationId,
    type_code: 'TASK',
    title,
    description: 'Preserved **body**.\n',
  });
  if (outcome.status !== 'applied') throw new Error(`setup returned ${outcome.status}`);
  return { ...fixture, item: outcome.item };
}

test('LocalWorkItem JSON schema follows the runtime catalog', () => {
  expect(schemaDocument.properties.canonical_kind.enum).toEqual(WORK_ITEM_TYPES.map((item) => item.kind));
  expect(schemaDocument.properties.type_code.enum).toEqual(WORK_ITEM_TYPES.map((item) => item.code));
  for (const item of WORK_ITEM_TYPES) {
    const frontmatter = {
      type: 'Work Item',
      schema: 'LocalWorkItem/v1',
      version: 1,
      internal_id: '00000000-0000-4000-8000-000000000001',
      repository_id: 'repo',
      project_id: 'demo',
      number: 1,
      canonical_kind: item.kind,
      type_code: item.code,
      key: formatWorkItemKey({ repository_prefix: 'REPO', project_prefix: 'DEMO', type_code: item.code, number: 1 }),
      aliases: [],
      parent_id: null,
      revision: 1,
      title: 'Schema example',
      provider_refs: {},
    };
    expect(validateFrontmatter(frontmatter)).toBe(true);
    expect(validateFrontmatter({ ...frontmatter, description: 'belongs in the body' })).toBe(false);
    expect(validateFrontmatter({ ...frontmatter, number: 0 })).toBe(false);
    expect(validateFrontmatter({ ...frontmatter, aliases: [''] })).toBe(false);
  }
});

localWorkItemTest(
  'native inspection fences invalid owned counters',
  async () => {
    const fixture = await createOwnedFixture('hardening-counter');
    const access = fixture.binding.access;
    const target = 'work/.local-work-item-counter.v1.json';
    const original = access.readText(target, 'counter integrity control');
    const counter = counterSchema.parse(JSON.parse(original));
    const wrongOwner = (counter.owner_digest.startsWith('0') ? '1' : '0') + counter.owner_digest.slice(1);
    const foreign = JSON.stringify({ ...counter, owner_digest: wrongOwner }) + '\n';
    await access.replaceAtomicAsync(target, digest(original), foreign, 'controlled counter owner drift');
    expect((await inspectLocalWorkItemStore(fixture.binding)).status).toBe('needs_reconciliation');
    expect(access.readText(target, 'unchanged foreign counter')).toBe(foreign);
    const malformed = JSON.stringify({ ...counter, next_number: 0 }) + '\n';
    await access.replaceAtomicAsync(target, digest(foreign), malformed, 'controlled malformed counter');
    expect((await inspectLocalWorkItemStore(fixture.binding)).status).toBe('needs_reconciliation');
    expect(access.readText(target, 'unchanged malformed counter')).toBe(malformed);
    const rewound = JSON.stringify({ ...counter, next_number: fixture.item.number }) + '\n';
    await access.replaceAtomicAsync(target, digest(malformed), rewound, 'controlled counter rewind');
    const authoritativePaths = [
      'work/.local-work-item-owner.v1.json',
      target,
      'work/index.md',
      `work/items/${fixture.item.internal_id}.md`,
      'work/.local-work-item-operations/hardening-counter.json',
    ];
    const beforeCreate = authoritativePaths.map((entry) => access.readText(entry, 'rewound counter preimage'));
    const recordNames = access.listFiles('work/items', 'record allocation preimage');
    const operationNames = access.listFiles('work/.local-work-item-operations', 'operation allocation preimage');
    const inspection = await inspectLocalWorkItemStore(fixture.binding);
    const allocation = await createLocalWorkItem(fixture.binding, {
      operation_id: 'hardening-rewound-create',
      type_code: 'PBI',
      title: 'Must not reuse the TASK number',
    });
    expect(inspection.status).toBe('needs_reconciliation');
    expect(allocation.status).toBe('rejected');
    expect(authoritativePaths.map((entry) => access.readText(entry, 'rewound counter unchanged'))).toEqual(
      beforeCreate,
    );
    expect(access.listFiles('work/items', 'record allocation unchanged')).toEqual(recordNames);
    expect(access.listFiles('work/.local-work-item-operations', 'operation allocation unchanged')).toEqual(
      operationNames,
    );
  },
  { timeout_ms: 30_000 },
);

localWorkItemTest(
  'native inspection fences a missing items directory',
  async () => {
    const fixture = await createOwnedFixture('hardening-missing-items');
    const access = fixture.binding.access;
    const recordBefore = access.readText(`work/items/${fixture.item.internal_id}.md`, 'preserved record before move');
    const indexBefore = access.readText('work/index.md', 'index preimage');
    const source = path.resolve(fixture.root, 'work/items');
    const retained = path.resolve(fixture.root, 'work/items.retained');
    for (const target of [source, retained]) {
      const relative = path.relative(fixture.root, target);
      if (!relative || relative.startsWith('..') || path.isAbsolute(relative))
        throw new Error('fixture move escaped root');
    }
    await rename(source, retained);
    const emptyIndex = '# Local work items\n\n_No work items._\n';
    await access.replaceAtomicAsync('work/index.md', digest(indexBefore), emptyIndex, 'controlled empty derived index');
    expect((await inspectLocalWorkItemStore(fixture.binding)).status).toBe('needs_reconciliation');
    expect(access.readText(`work/items.retained/${fixture.item.internal_id}.md`, 'retained moved record')).toBe(
      recordBefore,
    );
    expect(access.readText('work/index.md', 'unchanged controlled index')).toBe(emptyIndex);
  },
  { timeout_ms: 15_000 },
);

localWorkItemTest(
  'native index titles stay literal on one line',
  async () => {
    const title = 'First\n![image](https://example.invalid/x) **bold** <tag>';
    const fixture = await createOwnedFixture('hardening-index-title', title);
    const access = fixture.binding.access;
    expect(fixture.item.title).toBe(title);
    const raw = access.readText(`work/items/${fixture.item.internal_id}.md`, 'actual persisted frontmatter');
    const delimiter = raw.indexOf('\n---\n', 4);
    if (delimiter < 0) throw new Error('record body delimiter missing');
    const frontmatter: unknown = parseYaml(raw.slice(4, delimiter));
    expect(validateFrontmatter(frontmatter)).toBe(true);
    expect(z.object({ title: z.string() }).parse(frontmatter).title).toBe(title);
    expect(raw.slice(delimiter + 5)).toBe('Preserved **body**.\n');
    const expectedTitle = 'First \\!\\[image\\]\\(https://example.invalid/x\\) \\*\\*bold\\*\\* \\<tag\\>';
    expect(access.readText('work/index.md', 'literal index title')).toBe(
      `# Local work items\n\n- [${fixture.item.key}](items/${fixture.item.internal_id}.md) — ${expectedTitle}\n`,
    );
    const invalidFrontmatter = { ...z.record(z.string(), z.unknown()).parse(frontmatter), aliases: [''] };
    const invalidRecord = `---\n${stringifyYaml(invalidFrontmatter).trimEnd()}\n---\n${raw.slice(delimiter + 5)}`;
    const recordPath = `work/items/${fixture.item.internal_id}.md`;
    await access.replaceAtomicAsync(recordPath, digest(raw), invalidRecord, 'controlled empty alias');
    const inspection = await inspectLocalWorkItemStore(fixture.binding);
    expect(validateFrontmatter(invalidFrontmatter)).toBe(false);
    expect(inspection.status).toBe('needs_reconciliation');
    expect(access.readText(recordPath, 'unchanged empty alias')).toBe(invalidRecord);
  },
  { timeout_ms: 15_000 },
);

localWorkItemTest(
  'native reparents an existing child to root',
  async () => {
    const fixture = await createLocalWorkItemFixture();
    const parent = await createLocalWorkItem(fixture.binding, {
      operation_id: 'hardening-parent',
      type_code: 'PBI',
      title: 'Parent',
    });
    if (parent.status !== 'applied') throw new Error(`parent setup returned ${parent.status}`);
    const child = await createLocalWorkItem(fixture.binding, {
      operation_id: 'hardening-child',
      type_code: 'TASK',
      title: 'Child',
      parent_id: parent.item.internal_id,
      description: 'Kept body',
    });
    if (child.status !== 'applied') throw new Error(`child setup returned ${child.status}`);
    const detached = await reparentLocalWorkItem(fixture.binding, {
      operation_id: 'hardening-detach',
      internal_id: child.item.internal_id,
      expected_revision: child.item.revision,
      parent_id: null,
    });
    expect(detached.status).toBe('applied');
    if (detached.status !== 'applied') throw new Error('root reparent did not apply');
    expect(detached.item).toMatchObject({
      internal_id: child.item.internal_id,
      number: child.item.number,
      key: child.item.key,
      parent_id: null,
      revision: 2,
      description: 'Kept body',
    });
    const inspection = await inspectLocalWorkItemStore(fixture.binding);
    if (inspection.status !== 'ready') throw new Error('detached store is not ready');
    expect(inspection.items.find((item) => item.internal_id === child.item.internal_id)?.parent_id).toBeNull();
    expect(
      counterSchema.parse(
        JSON.parse(
          fixture.binding.access.readText('work/.local-work-item-counter.v1.json', 'unchanged allocation counter'),
        ),
      ).next_number,
    ).toBe(3);
  },
  { timeout_ms: 30_000 },
);

localWorkItemTest(
  'native preserves foreign entries in an owned store',
  async () => {
    const fixture = await createOwnedFixture('hardening-owned-data');
    const access = fixture.binding.access;
    await access.writeExclusiveAtomicAsync(
      'work/items/foreign.txt',
      'Retained foreign data\n',
      'controlled foreign item',
    );
    const targets = [
      'work/.local-work-item-owner.v1.json',
      'work/.local-work-item-counter.v1.json',
      'work/index.md',
      `work/items/${fixture.item.internal_id}.md`,
      'work/items/foreign.txt',
    ];
    const before = targets.map((target) => access.readText(target, 'owned-state before refusal'));
    const result = await createLocalWorkItem(fixture.binding, {
      operation_id: 'hardening-foreign-refusal',
      type_code: 'TASK',
      title: 'Refused',
    });
    expect(result.status).toBe('rejected');
    expect((await inspectLocalWorkItemStore(fixture.binding)).status).toBe('needs_reconciliation');
    expect(targets.map((target) => access.readText(target, 'owned-state after refusal'))).toEqual(before);
    expect(
      access.fileExists('work/.local-work-item-operations/hardening-foreign-refusal.json', 'no refused journal'),
    ).toBe(false);
  },
  { timeout_ms: 15_000 },
);

localWorkItemTest(
  'native preserves a foreign root index without adoption',
  async () => {
    const fixture = await createLocalWorkItemFixture();
    const binding = {
      ...fixture.binding,
      product: { ...fixture.binding.product, work_items: { ...fixture.binding.product.work_items, storage_root: '.' } },
    };
    const foreignIndex = '# Existing project index\n\n[Product](docs/index.md)\n';
    await binding.access.writeExclusiveAtomicAsync('index.md', foreignIndex, 'controlled foreign project index');
    const result = await createLocalWorkItem(binding, {
      operation_id: 'hardening-root-index',
      type_code: 'TASK',
      title: 'Refused',
    });
    expect(result.status).toBe('needs_reconciliation');
    expect((await inspectLocalWorkItemStore(binding)).status).toBe('needs_reconciliation');
    expect(binding.access.readText('index.md', 'preserved project index')).toBe(foreignIndex);
    expect(binding.access.fileExists('.local-work-item-owner.v1.json', 'no adopted owner')).toBe(false);
    expect(binding.access.fileExists('.local-work-item-counter.v1.json', 'no adopted counter')).toBe(false);
  },
  { timeout_ms: 15_000 },
);
