import { expect, test } from 'bun:test';
import { mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from 'zod';
import { formatWorkItemKey } from '../src/work-items/key.js';
import {
  createLocalWorkItem,
  inspectLocalWorkItemStore,
  reparentLocalWorkItem,
  reclassifyLocalWorkItem,
  resolveLocalWorkItem,
  type LocalWorkItemBinding,
  type LocalWorkItemRequest,
  type CreateLocalWorkItemRequest,
  type LocalWorkItemOutcome,
  type LocalWorkItemRecord,
} from '../src/work-items/store.js';
import { createLocalWorkItemFixture, localWorkItemTest } from './helpers/local-work-item-fixture.js';

const frontmatterSchema = z.record(z.string(), z.unknown());
const counterSchema = z.strictObject({
  schema: z.literal('LocalWorkItemCounter/v1'),
  owner_digest: z.string().regex(/^[a-f0-9]{64}$/),
  next_number: z.number().int().positive().safe(),
});
const strictRecordKeys = [
  'type',
  'schema',
  'version',
  'internal_id',
  'repository_id',
  'project_id',
  'number',
  'canonical_kind',
  'type_code',
  'key',
  'aliases',
  'parent_id',
  'revision',
  'title',
  'provider_refs',
].sort();

function requireApplied(outcome: LocalWorkItemOutcome): LocalWorkItemRecord {
  if (outcome.status !== 'applied') throw new Error(`expected applied, received ${outcome.status}`);
  return outcome.item;
}

function markdownRecord(text: string): { frontmatter: Record<string, unknown>; body: string } {
  if (!text.startsWith('---\n')) throw new Error('record frontmatter must start with YAML delimiter');
  const separator = text.indexOf('\n---\n', 4);
  if (separator < 0) throw new Error('record frontmatter must end before its Markdown body');
  return {
    frontmatter: frontmatterSchema.parse(parseYaml(text.slice(4, separator))),
    body: text.slice(separator + 5),
  };
}

function storeSnapshot(
  binding: LocalWorkItemBinding,
  internalIds: readonly string[],
  operationIds: readonly string[],
): Record<string, string | null> {
  const root = binding.product.work_items.storage_root;
  const paths = [
    `${root}/.local-work-item-owner.v1.json`,
    `${root}/.local-work-item-counter.v1.json`,
    `${root}/index.md`,
    ...internalIds.map((id) => `${root}/items/${id}.md`),
    ...operationIds.map((id) => `${root}/.local-work-item-operations/${encodeURIComponent(id)}.json`),
  ];
  return Object.fromEntries(
    paths.map((target) => [
      target,
      binding.access.fileExists(target, 'LocalWorkItem authoritative snapshot')
        ? binding.access.readText(target, 'LocalWorkItem authoritative snapshot')
        : null,
    ]),
  );
}

function requireRejected(outcome: LocalWorkItemOutcome, reason: string): void {
  if (outcome.status !== 'rejected') throw new Error(`expected rejected, received ${outcome.status}`);
  expect(outcome.reason).toContain(reason);
}

test('formats only canonical LocalWorkItem keys', () => {
  expect(formatWorkItemKey({ repository_prefix: 'REPO', project_prefix: 'DEMO', type_code: 'TASK', number: 12 })).toBe(
    'REPO-DEMO-TASK-12',
  );
  expect(() =>
    formatWorkItemKey({ repository_prefix: 'repo', project_prefix: 'DEMO', type_code: 'TASK', number: 1 }),
  ).toThrow();
  expect(() =>
    formatWorkItemKey({ repository_prefix: 'REPO', project_prefix: 'DEMO', type_code: 'task' as 'TASK', number: 1 }),
  ).toThrow();
  expect(() =>
    formatWorkItemKey({ repository_prefix: 'REPO', project_prefix: 'DEMO', type_code: 'TASK', number: 0 }),
  ).toThrow();
  expect(() =>
    formatWorkItemKey({
      repository_prefix: 'REPO',
      project_prefix: 'DEMO',
      type_code: 'TASK',
      number: Number.MAX_SAFE_INTEGER + 1,
    }),
  ).toThrow();
});

localWorkItemTest(
  'native creates strict records with provider refs in independent products',
  async () => {
    const firstFixture = await createLocalWorkItemFixture(undefined, { instrument: true });
    const secondFixture = await createLocalWorkItemFixture(undefined, { instrument: true });
    const secondBinding = {
      ...secondFixture.binding,
      product: {
        ...secondFixture.binding.product,
        project_id: 'secondary',
        title: 'Secondary project',
        prefix: 'ALT',
      },
    };
    const firstItem = requireApplied(
      await createLocalWorkItem(firstFixture.binding, {
        operation_id: 'c1-first-product',
        type_code: 'TASK',
        title: 'First product task',
        description: 'First **Markdown** body.\n',
        provider_refs: { tracker: 'TASK-101' },
      }),
    );
    const secondItem = requireApplied(
      await createLocalWorkItem(secondBinding, {
        operation_id: 'c1-second-product',
        type_code: 'TASK',
        title: 'Second product task',
        description: 'Second _Markdown_ body.\n',
        provider_refs: { tracker: 'TASK-202' },
      }),
    );

    expect(firstFixture.root).not.toBe(secondFixture.root);
    expect(firstFixture.binding.product.project_id).not.toBe(secondBinding.product.project_id);
    expect(firstFixture.binding.product.prefix).not.toBe(secondBinding.product.prefix);
    expect(firstItem).toMatchObject({
      repository_id: 'repo',
      project_id: 'demo',
      number: 1,
      canonical_kind: 'task',
      type_code: 'TASK',
      key: 'REPO-DEMO-TASK-1',
      title: 'First product task',
      provider_refs: { tracker: 'TASK-101' },
      description: 'First **Markdown** body.\n',
    });
    expect(firstItem.internal_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(secondItem).toMatchObject({
      repository_id: 'repo',
      project_id: 'secondary',
      number: 1,
      canonical_kind: 'task',
      type_code: 'TASK',
      key: 'REPO-ALT-TASK-1',
      title: 'Second product task',
      provider_refs: { tracker: 'TASK-202' },
      description: 'Second _Markdown_ body.\n',
    });
    expect(secondItem.internal_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(secondItem.internal_id).not.toBe(firstItem.internal_id);

    const firstByUuid = await resolveLocalWorkItem(firstFixture.binding, { uuid: firstItem.internal_id });
    const firstByKey = await resolveLocalWorkItem(firstFixture.binding, { key: firstItem.key });
    const firstInspection = await inspectLocalWorkItemStore(firstFixture.binding);
    if (firstInspection.status !== 'ready') throw new Error(`first store is ${firstInspection.status}`);
    expect(firstByUuid).toEqual(firstItem);
    expect(firstByKey).toEqual(firstItem);
    expect(firstInspection.items).toEqual([firstItem]);
    expect(firstInspection.pending_operations).toEqual([]);

    const secondByUuid = await resolveLocalWorkItem(secondBinding, { uuid: secondItem.internal_id });
    const secondByKey = await resolveLocalWorkItem(secondBinding, { key: secondItem.key });
    const secondInspection = await inspectLocalWorkItemStore(secondBinding);
    if (secondInspection.status !== 'ready') throw new Error(`second store is ${secondInspection.status}`);
    expect(secondByUuid).toEqual(secondItem);
    expect(secondByKey).toEqual(secondItem);
    expect(secondInspection.items).toEqual([secondItem]);
    expect(secondInspection.pending_operations).toEqual([]);

    const firstRecordText = firstFixture.binding.access.readText(
      `work/items/${firstItem.internal_id}.md`,
      'LocalWorkItem C1 record snapshot',
    );
    const firstRecord = markdownRecord(firstRecordText);
    expect(Object.keys(firstRecord.frontmatter).sort()).toEqual(strictRecordKeys);
    expect(firstRecord.frontmatter).toEqual({
      type: 'Work Item',
      schema: 'LocalWorkItem/v1',
      version: 1,
      internal_id: firstItem.internal_id,
      repository_id: 'repo',
      project_id: 'demo',
      number: 1,
      canonical_kind: 'task',
      type_code: 'TASK',
      key: 'REPO-DEMO-TASK-1',
      aliases: [],
      parent_id: null,
      revision: 1,
      title: 'First product task',
      provider_refs: { tracker: 'TASK-101' },
    });
    expect('description' in firstRecord.frontmatter).toBe(false);
    expect(firstRecord.body).toBe('First **Markdown** body.\n');
    const firstIndex = firstFixture.binding.access.readText('work/index.md', 'LocalWorkItem C1 index snapshot');
    expect(firstIndex.startsWith('---\n')).toBe(false);
    expect(firstIndex).toContain(`- [${firstItem.key}](items/${firstItem.internal_id}.md)`);

    const secondRecordText = secondBinding.access.readText(
      `work/items/${secondItem.internal_id}.md`,
      'LocalWorkItem C1 record snapshot',
    );
    const secondRecord = markdownRecord(secondRecordText);
    expect(Object.keys(secondRecord.frontmatter).sort()).toEqual(strictRecordKeys);
    expect(secondRecord.frontmatter).toEqual({
      type: 'Work Item',
      schema: 'LocalWorkItem/v1',
      version: 1,
      internal_id: secondItem.internal_id,
      repository_id: 'repo',
      project_id: 'secondary',
      number: 1,
      canonical_kind: 'task',
      type_code: 'TASK',
      key: 'REPO-ALT-TASK-1',
      aliases: [],
      parent_id: null,
      revision: 1,
      title: 'Second product task',
      provider_refs: { tracker: 'TASK-202' },
    });
    expect('description' in secondRecord.frontmatter).toBe(false);
    expect(secondRecord.body).toBe('Second _Markdown_ body.\n');
    const secondIndex = secondBinding.access.readText('work/index.md', 'LocalWorkItem C1 index snapshot');
    expect(secondIndex.startsWith('---\n')).toBe(false);
    expect(secondIndex).toContain(`- [${secondItem.key}](items/${secondItem.internal_id}.md)`);
    const firstCounter = counterSchema.parse(
      JSON.parse(
        firstFixture.binding.access.readText(
          'work/.local-work-item-counter.v1.json',
          'LocalWorkItem C1 counter snapshot',
        ),
      ),
    );
    const secondCounter = counterSchema.parse(
      JSON.parse(
        secondBinding.access.readText('work/.local-work-item-counter.v1.json', 'LocalWorkItem C1 counter snapshot'),
      ),
    );
    expect(firstCounter.next_number).toBe(2);
    expect(secondCounter.next_number).toBe(2);
    expect(firstCounter.owner_digest).not.toBe(secondCounter.owner_digest);
  },
  { timeout_ms: 15_000, instrument: true },
);

localWorkItemTest(
  'native shares numbering and preserves reclassification aliases',
  async () => {
    const fixture = await createLocalWorkItemFixture();
    const pbi = requireApplied(
      await createLocalWorkItem(fixture.binding, {
        operation_id: 'c2-create-pbi',
        type_code: 'PBI',
        title: 'Work item PBI',
        description: 'Stable **body** for the PBI.',
        provider_refs: { tracker: 'PBI-301' },
      }),
    );
    const bug = requireApplied(
      await createLocalWorkItem(fixture.binding, {
        operation_id: 'c2-create-bug',
        type_code: 'BUG',
        title: 'Work item bug',
      }),
    );
    const task = requireApplied(
      await createLocalWorkItem(fixture.binding, {
        operation_id: 'c2-create-task',
        type_code: 'TASK',
        title: 'Work item task',
      }),
    );

    expect([pbi.number, bug.number, task.number]).toEqual([1, 2, 3]);
    expect([pbi.key, bug.key, task.key]).toEqual(['REPO-DEMO-PBI-1', 'REPO-DEMO-BUG-2', 'REPO-DEMO-TASK-3']);
    const pbiRecordPath = `work/items/${pbi.internal_id}.md`;
    const pbiRecordBefore = fixture.binding.access.readText(pbiRecordPath, 'LocalWorkItem C2 before snapshot');

    const reclassified = requireApplied(
      await reclassifyLocalWorkItem(fixture.binding, {
        operation_id: 'c2-reclassify-to-bug',
        internal_id: pbi.internal_id,
        expected_revision: pbi.revision,
        type_code: 'BUG',
      }),
    );
    const pbiRecordAsBug = fixture.binding.access.readText(pbiRecordPath, 'LocalWorkItem C2 reclassified snapshot');
    const oldPbiKey = await resolveLocalWorkItem(fixture.binding, { alias: pbi.key });
    expect(reclassified).toMatchObject({
      internal_id: pbi.internal_id,
      number: pbi.number,
      type_code: 'BUG',
      key: 'REPO-DEMO-BUG-1',
      aliases: [pbi.key],
      description: pbi.description,
      provider_refs: pbi.provider_refs,
      revision: pbi.revision + 1,
    });
    expect(pbiRecordAsBug).not.toBe(pbiRecordBefore);
    expect(markdownRecord(pbiRecordAsBug).frontmatter).toMatchObject({
      type_code: 'BUG',
      key: 'REPO-DEMO-BUG-1',
      aliases: [pbi.key],
      revision: pbi.revision + 1,
    });
    expect(oldPbiKey).toMatchObject({ internal_id: pbi.internal_id, key: reclassified.key });

    const restored = requireApplied(
      await reclassifyLocalWorkItem(fixture.binding, {
        operation_id: 'c2-reclassify-back-to-pbi',
        internal_id: pbi.internal_id,
        expected_revision: reclassified.revision,
        type_code: 'PBI',
      }),
    );
    const pbiRecordRestored = fixture.binding.access.readText(pbiRecordPath, 'LocalWorkItem C2 restored snapshot');
    const oldBugKey = await resolveLocalWorkItem(fixture.binding, { alias: reclassified.key });
    const currentKey = await resolveLocalWorkItem(fixture.binding, { key: pbi.key });
    const stableUuid = await resolveLocalWorkItem(fixture.binding, { uuid: pbi.internal_id });
    const inspection = await inspectLocalWorkItemStore(fixture.binding);
    if (inspection.status !== 'ready') throw new Error(`store is ${inspection.status}`);
    expect(restored).toMatchObject({
      internal_id: pbi.internal_id,
      number: pbi.number,
      type_code: 'PBI',
      key: pbi.key,
      aliases: [reclassified.key],
      description: pbi.description,
      provider_refs: pbi.provider_refs,
      revision: pbi.revision + 2,
    });
    expect(restored.aliases).not.toContain(restored.key);
    expect(pbiRecordRestored).not.toBe(pbiRecordAsBug);
    expect(markdownRecord(pbiRecordRestored).body).toBe(markdownRecord(pbiRecordBefore).body);
    expect(oldBugKey).toMatchObject({ internal_id: pbi.internal_id, key: restored.key });
    expect(currentKey).toEqual(restored);
    expect(stableUuid).toEqual(restored);
    expect(inspection.items.map((item) => item.number).sort((left, right) => left - right)).toEqual([1, 2, 3]);
    expect(inspection.pending_operations).toEqual([]);
  },
  { timeout_ms: 45_000 },
);

localWorkItemTest(
  'native applies arbitrary and equal-type hierarchy without fixed leaves',
  async () => {
    const fixture = await createLocalWorkItemFixture({ mode: 'any' });
    const task = requireApplied(
      await createLocalWorkItem(fixture.binding, {
        operation_id: 'c3-task-root',
        type_code: 'TASK',
        title: 'Task root',
      }),
    );
    const pbi = requireApplied(
      await createLocalWorkItem(fixture.binding, {
        operation_id: 'c3-task-pbi',
        type_code: 'PBI',
        title: 'PBI child',
        parent_id: task.internal_id,
      }),
    );
    const bugParent = requireApplied(
      await createLocalWorkItem(fixture.binding, {
        operation_id: 'c3-bug-root',
        type_code: 'BUG',
        title: 'Bug root',
      }),
    );
    const bugChild = requireApplied(
      await createLocalWorkItem(fixture.binding, {
        operation_id: 'c3-bug-child',
        type_code: 'BUG',
        title: 'Equal type bug child',
        parent_id: bugParent.internal_id,
      }),
    );
    expect(pbi.parent_id).toBe(task.internal_id);
    expect(bugChild.parent_id).toBe(bugParent.internal_id);
    expect(bugChild.type_code).toBe(bugParent.type_code);

    const governed: LocalWorkItemBinding = {
      ...fixture.binding,
      product: {
        ...fixture.binding.product,
        work_items: {
          ...fixture.binding.product.work_items,
          hierarchy: {
            mode: 'custom',
            allowed_children: { TASK: ['PBI'], PBI: ['BUG'], BUG: ['BUG'] },
          },
        },
      },
    };
    const internalIds = [task.internal_id, pbi.internal_id, bugParent.internal_id, bugChild.internal_id];
    const operationIds = [
      'c3-task-root',
      'c3-task-pbi',
      'c3-bug-root',
      'c3-bug-child',
      'c3-deny-incoming-edge',
      'c3-deny-outgoing-edge',
    ];
    const before = storeSnapshot(governed, internalIds, operationIds);
    requireRejected(
      await reclassifyLocalWorkItem(governed, {
        operation_id: 'c3-deny-incoming-edge',
        internal_id: pbi.internal_id,
        expected_revision: pbi.revision,
        type_code: 'BUG',
      }),
      'TASK -> BUG',
    );
    expect(storeSnapshot(governed, internalIds, operationIds)).toEqual(before);
    requireRejected(
      await reclassifyLocalWorkItem(governed, {
        operation_id: 'c3-deny-outgoing-edge',
        internal_id: bugParent.internal_id,
        expected_revision: bugParent.revision,
        type_code: 'TASK',
      }),
      'TASK -> BUG',
    );
    expect(storeSnapshot(governed, internalIds, operationIds)).toEqual(before);
    const inspection = await inspectLocalWorkItemStore(fixture.binding);
    if (inspection.status !== 'ready') throw new Error(`store is ${inspection.status}`);
    expect(Object.fromEntries(inspection.items.map(({ internal_id, parent_id }) => [internal_id, parent_id]))).toEqual({
      [task.internal_id]: null,
      [pbi.internal_id]: task.internal_id,
      [bugParent.internal_id]: null,
      [bugChild.internal_id]: bugParent.internal_id,
    });
    expect(inspection.pending_operations).toEqual([]);
  },
  { timeout_ms: 60_000 },
);

localWorkItemTest(
  'native rejects invalid topology and stale revision without effects',
  async () => {
    const first = await createLocalWorkItemFixture({ mode: 'any' });
    const root = requireApplied(
      await createLocalWorkItem(first.binding, {
        operation_id: 'c4-root',
        type_code: 'TASK',
        title: 'Topology root',
      }),
    );
    const child = requireApplied(
      await createLocalWorkItem(first.binding, {
        operation_id: 'c4-child',
        type_code: 'PBI',
        title: 'Topology child',
        parent_id: root.internal_id,
      }),
    );
    const firstOps = ['c4-root', 'c4-child', 'c4-self-parent', 'c4-cycle'];
    const firstIds = [root.internal_id, child.internal_id];
    const firstBefore = storeSnapshot(first.binding, firstIds, firstOps);
    requireRejected(
      await reparentLocalWorkItem(first.binding, {
        operation_id: 'c4-self-parent',
        internal_id: root.internal_id,
        expected_revision: root.revision,
        parent_id: root.internal_id,
      }),
      'cycle',
    );
    expect(storeSnapshot(first.binding, firstIds, firstOps)).toEqual(firstBefore);
    requireRejected(
      await reparentLocalWorkItem(first.binding, {
        operation_id: 'c4-cycle',
        internal_id: root.internal_id,
        expected_revision: root.revision,
        parent_id: child.internal_id,
      }),
      'cycle',
    );
    expect(storeSnapshot(first.binding, firstIds, firstOps)).toEqual(firstBefore);

    const second = await createLocalWorkItemFixture({ mode: 'any' });
    const foreign = await createLocalWorkItemFixture({ mode: 'any' });
    const foreignBinding: LocalWorkItemBinding = {
      ...foreign.binding,
      product: { ...foreign.binding.product, project_id: 'foreign', prefix: 'FRGN' },
    };
    const localItem = requireApplied(
      await createLocalWorkItem(second.binding, {
        operation_id: 'c4-local',
        type_code: 'TASK',
        title: 'Local product item',
      }),
    );
    const foreignItem = requireApplied(
      await createLocalWorkItem(foreignBinding, {
        operation_id: 'c4-foreign',
        type_code: 'TASK',
        title: 'Foreign product parent',
      }),
    );
    const secondOps = ['c4-local', 'c4-foreign-parent', 'c4-stale-revision'];
    const secondBefore = storeSnapshot(second.binding, [localItem.internal_id], secondOps);
    requireRejected(
      await reparentLocalWorkItem(second.binding, {
        operation_id: 'c4-foreign-parent',
        internal_id: localItem.internal_id,
        expected_revision: localItem.revision,
        parent_id: foreignItem.internal_id,
      }),
      'parent does not exist in this product',
    );
    expect(storeSnapshot(second.binding, [localItem.internal_id], secondOps)).toEqual(secondBefore);
    requireRejected(
      await reparentLocalWorkItem(second.binding, {
        operation_id: 'c4-stale-revision',
        internal_id: localItem.internal_id,
        expected_revision: localItem.revision + 1,
        parent_id: null,
      }),
      'stale work item revision',
    );
    expect(storeSnapshot(second.binding, [localItem.internal_id], secondOps)).toEqual(secondBefore);
    const firstInspection = await inspectLocalWorkItemStore(first.binding);
    const secondInspection = await inspectLocalWorkItemStore(second.binding);
    expect(firstInspection.status).toBe('ready');
    expect(secondInspection.status).toBe('ready');
    if (firstInspection.status !== 'ready' || secondInspection.status !== 'ready')
      throw new Error('refusal fixture is not ready');
    expect(
      Object.fromEntries(firstInspection.items.map(({ internal_id, parent_id }) => [internal_id, parent_id])),
    ).toEqual({
      [root.internal_id]: null,
      [child.internal_id]: root.internal_id,
    });
    expect(secondInspection.items).toEqual([localItem]);
  },
  { timeout_ms: 45_000 },
);

localWorkItemTest(
  'native refuses unsafe and no-follow store paths',
  async () => {
    const unsafe = await createLocalWorkItemFixture();
    const unsafeBinding: LocalWorkItemBinding = {
      ...unsafe.binding,
      product: {
        ...unsafe.binding.product,
        work_items: { ...unsafe.binding.product.work_items, storage_root: '../outside' },
      },
    };
    requireRejected(
      await createLocalWorkItem(unsafeBinding, {
        operation_id: 'c5-unsafe-storage',
        type_code: 'TASK',
        title: 'Unsafe storage target',
      }),
      'path',
    );
    expect((await inspectLocalWorkItemStore(unsafe.binding)).status).toBe('absent');

    const linkFixture = await createLocalWorkItemFixture();
    const targetFixture = await createLocalWorkItemFixture();
    const linkPath = path.join(linkFixture.root, 'work');
    await symlink(targetFixture.root, linkPath, 'junction');
    const { readdir } = await import('node:fs/promises');
    const targetBefore = await readdir(targetFixture.root);
    const linkedBinding: LocalWorkItemBinding = {
      ...linkFixture.binding,
      product: {
        ...linkFixture.binding.product,
        work_items: { ...linkFixture.binding.product.work_items, storage_root: 'work' },
      },
    };
    const noFollow = await createLocalWorkItem(linkedBinding, {
      operation_id: 'c5-no-follow',
      type_code: 'TASK',
      title: 'Reparse target must remain untouched',
    });
    if (noFollow.status !== 'rejected') throw new Error(`no-follow result was ${noFollow.status}`);
    expect(noFollow.reason).toMatch(/symlink|symbolic link|reparse/i);
    expect((await inspectLocalWorkItemStore(linkedBinding)).status).not.toBe('ready');
    expect(await readdir(targetFixture.root)).toEqual(targetBefore);
  },
  { timeout_ms: 15_000 },
);

localWorkItemTest(
  'native serializes concurrent allocation without number reuse',
  async () => {
    const fixture = await createLocalWorkItemFixture();
    const requests = [
      {
        operation_id: 'c6-concurrent-a',
        type_code: 'TASK',
        title: 'Concurrent allocation A',
      },
      {
        operation_id: 'c6-concurrent-b',
        type_code: 'TASK',
        title: 'Concurrent allocation B',
      },
    ] satisfies CreateLocalWorkItemRequest[];
    const outcomes = await Promise.all(requests.map((request) => createLocalWorkItem(fixture.binding, request)));
    const statuses = outcomes.map((outcome) => {
      if (outcome.status === 'applied' || outcome.status === 'already_applied')
        return { status: outcome.status, internal_id: outcome.item.internal_id, number: outcome.item.number };
      if (outcome.status === 'rejected') return { status: outcome.status, reason: outcome.reason };
      if (outcome.status === 'needs_reconciliation')
        return { status: outcome.status, operation_id: outcome.operation_id, reason: outcome.reason };
      if (outcome.status === 'busy') return { status: outcome.status, operation_id: outcome.operation_id };
      return { status: outcome.status };
    });
    if (!outcomes.every((outcome) => outcome.status === 'applied' || outcome.status === 'busy'))
      throw new Error(`concurrent calls returned unexpected terminal outcomes: ${JSON.stringify(statuses)}`);
    process.stderr.write(`[C6 initial outcomes] ${JSON.stringify(statuses)}\n`);
    const busyIndex = outcomes.findIndex((outcome) => outcome.status === 'busy');
    if (busyIndex >= 0) {
      const retry = await createLocalWorkItem(fixture.binding, requests[busyIndex]!);
      if (retry.status !== 'applied') throw new Error(`bounded busy retry returned ${retry.status}`);
      process.stderr.write(
        `[C6 bounded retry] ${JSON.stringify({ status: retry.status, internal_id: retry.item.internal_id, number: retry.item.number })}\n`,
      );
      outcomes[busyIndex] = retry;
    }
    const applied = outcomes.map((outcome) => {
      if (outcome.status !== 'applied') throw new Error(`concurrent call remained ${outcome.status}`);
      return outcome.item;
    });
    expect(new Set(applied.map((item) => item.internal_id)).size).toBe(applied.length);
    expect(applied.map((item) => item.number).sort((left, right) => left - right)).toEqual(
      Array.from({ length: applied.length }, (_, index) => index + 1),
    );
    const counter = counterSchema.parse(
      JSON.parse(fixture.binding.access.readText('work/.local-work-item-counter.v1.json', 'C6 counter sequence')),
    );
    expect(counter.next_number).toBe(applied.length + 1);
    const inspection = await inspectLocalWorkItemStore(fixture.binding);
    if (inspection.status !== 'ready') throw new Error(`store is ${inspection.status}`);
    expect(Object.fromEntries(inspection.items.map((item) => [item.internal_id, item.number]))).toEqual(
      Object.fromEntries(applied.map((item) => [item.internal_id, item.number])),
    );
    expect(inspection.pending_operations).toEqual([]);
  },
  { timeout_ms: 30_000 },
);

localWorkItemTest(
  'native preserves disabled records and explicit root storage',
  async () => {
    const fixture = await createLocalWorkItemFixture({ mode: 'any' });
    const item = requireApplied(
      await createLocalWorkItem(fixture.binding, {
        operation_id: 'c7-initial-task',
        type_code: 'TASK',
        title: 'Record becomes disabled',
      }),
    );
    const disabledBinding: LocalWorkItemBinding = {
      ...fixture.binding,
      product: {
        ...fixture.binding.product,
        work_items: {
          ...fixture.binding.product.work_items,
          enabled_types: ['PBI', 'BUG'],
          hierarchy: { mode: 'custom', allowed_children: { PBI: ['BUG'], BUG: [] } },
        },
      },
    };
    expect(await resolveLocalWorkItem(disabledBinding, { uuid: item.internal_id })).toEqual(item);
    requireRejected(
      await createLocalWorkItem(disabledBinding, {
        operation_id: 'c7-disabled-create',
        type_code: 'TASK',
        title: 'Disabled type cannot be created',
      }),
      'disabled',
    );
    requireRejected(
      await reclassifyLocalWorkItem(disabledBinding, {
        operation_id: 'c7-disabled-reclassify',
        internal_id: item.internal_id,
        expected_revision: item.revision,
        type_code: 'TASK',
      }),
      'disabled',
    );
    const disabledInspection = await inspectLocalWorkItemStore(disabledBinding);
    if (disabledInspection.status !== 'ready') throw new Error(`disabled store is ${disabledInspection.status}`);
    expect(disabledInspection.items).toEqual([item]);

    const rootFixture = await createLocalWorkItemFixture({ mode: 'any' });
    const rootBinding: LocalWorkItemBinding = {
      ...rootFixture.binding,
      product: {
        ...rootFixture.binding.product,
        work_items: { ...rootFixture.binding.product.work_items, storage_root: '.' },
      },
    };
    const rootItem = requireApplied(
      await createLocalWorkItem(rootBinding, {
        operation_id: 'c7-explicit-root-storage',
        type_code: 'TASK',
        title: 'Explicit root storage',
      }),
    );
    expect(rootBinding.access.fileExists('items/index.md', 'C7 alternate index absent')).toBe(false);
    expect(rootBinding.access.fileExists('index.md', 'C7 root storage index')).toBe(true);
    expect(rootBinding.access.fileExists('.local-work-item-owner.v1.json', 'C7 root storage owner')).toBe(true);
    const rootInspection = await inspectLocalWorkItemStore(rootBinding);
    if (rootInspection.status !== 'ready') throw new Error(`root store is ${rootInspection.status}`);
    expect(rootInspection.items).toEqual([rootItem]);
  },
  { timeout_ms: 30_000 },
);

localWorkItemTest(
  'native rejects exhaustion and alias collision without effects',
  async () => {
    const fixture = await createLocalWorkItemFixture({ mode: 'any' });
    const first = requireApplied(
      await createLocalWorkItem(fixture.binding, {
        operation_id: 'c8-first',
        type_code: 'TASK',
        title: 'Alias owner',
      }),
    );
    const second = requireApplied(
      await createLocalWorkItem(fixture.binding, {
        operation_id: 'c8-second',
        type_code: 'BUG',
        title: 'Counter successor',
      }),
    );
    const recordPath = path.join(fixture.root, 'work', 'items', `${first.internal_id}.md`);
    const recordBefore = await readFile(recordPath, 'utf8');
    const parsed = markdownRecord(recordBefore);
    parsed.frontmatter.aliases = ['REPO-DEMO-TASK-3'];
    const recordAfter = `---\n${stringifyYaml(parsed.frontmatter).trimEnd()}\n---\n${parsed.body}`;
    await writeFile(recordPath, recordAfter, 'utf8');
    const ids = [first.internal_id, second.internal_id];
    const operations = ['c8-first', 'c8-second', 'c8-alias-collision', 'c8-exhaustion'];
    const beforeCollision = storeSnapshot(fixture.binding, ids, operations);
    requireRejected(
      await createLocalWorkItem(fixture.binding, {
        operation_id: 'c8-alias-collision',
        type_code: 'TASK',
        title: 'Generated key conflicts with a foreign alias',
      }),
      'collision',
    );
    expect(storeSnapshot(fixture.binding, ids, operations)).toEqual(beforeCollision);

    const counterPath = path.join(fixture.root, 'work', '.local-work-item-counter.v1.json');
    const counterText = fixture.binding.access.readText('work/.local-work-item-counter.v1.json', 'C8 counter preimage');
    const counter = counterSchema.parse(JSON.parse(counterText));
    await writeFile(counterPath, `${JSON.stringify({ ...counter, next_number: Number.MAX_SAFE_INTEGER })}\n`, 'utf8');
    const exhaustedCounter = fixture.binding.access.readText(
      'work/.local-work-item-counter.v1.json',
      'C8 exhausted counter',
    );
    const exhaustionBefore = storeSnapshot(fixture.binding, ids, operations);
    requireRejected(
      await createLocalWorkItem(fixture.binding, {
        operation_id: 'c8-exhaustion',
        type_code: 'TASK',
        title: 'Counter must refuse exhaustion',
      }),
      'exhausted',
    );
    expect(storeSnapshot(fixture.binding, ids, operations)).toEqual(exhaustionBefore);
    expect(fixture.binding.access.readText('work/.local-work-item-counter.v1.json', 'C8 counter after refusal')).toBe(
      exhaustedCounter,
    );
    expect(exhaustedCounter).toContain(String(Number.MAX_SAFE_INTEGER));
  },
  { timeout_ms: 45_000 },
);

localWorkItemTest(
  'native invalid requests leave an absent store uninitialized',
  async () => {
    const fixture = await createLocalWorkItemFixture({ mode: 'any' });
    const rejectedSchema = z.strictObject({ status: z.literal('rejected'), reason: z.string() });
    const invoke = async (binding: LocalWorkItemBinding, request: unknown) => {
      const outcome: unknown = await Reflect.apply(createLocalWorkItem, undefined, [binding, request]);
      return rejectedSchema.parse(outcome);
    };
    expect(
      (await invoke(fixture.binding, { operation_id: '', type_code: 'TASK', title: 'Invalid operation' })).reason,
    ).toContain('operation_id');
    const invalidCode: unknown = await Reflect.apply(createLocalWorkItem, undefined, [
      fixture.binding,
      { operation_id: 'c20-unsupported-code', type_code: 'NOPE', title: 'Unsupported code' },
    ]);
    expect(rejectedSchema.parse(invalidCode).reason).toContain('type_code');
    expect(
      (
        await invoke(fixture.binding, {
          operation_id: 'c20-missing-parent',
          type_code: 'TASK',
          title: 'Missing parent',
          parent_id: '00000000-0000-4000-8000-000000000022',
        })
      ).reason,
    ).toContain('parent');
    const invalidPrefix: LocalWorkItemBinding = {
      ...fixture.binding,
      product: { ...fixture.binding.product, prefix: 'demo' },
    };
    expect(
      (
        await invoke(invalidPrefix, {
          operation_id: 'c20-invalid-prefix',
          type_code: 'TASK',
          title: 'Invalid prefix',
        })
      ).reason,
    ).toContain('prefix');
    const unsafeStorage: LocalWorkItemBinding = {
      ...fixture.binding,
      product: {
        ...fixture.binding.product,
        work_items: { ...fixture.binding.product.work_items, storage_root: '../unsafe' },
      },
    };
    expect(
      (
        await invoke(unsafeStorage, {
          operation_id: 'c20-unsafe-storage',
          type_code: 'TASK',
          title: 'Unsafe path',
        })
      ).reason,
    ).toContain('path');
    expect(
      (await invoke(fixture.binding, { operation_id: 'c20-empty-title', type_code: 'TASK', title: '  ' })).reason,
    ).toContain('title');
    for (const [field, value, operationId] of [
      ['internal_id', '00000000-0000-4000-8000-000000000020', 'c20-internal-id'],
      ['key', 'REPO-DEMO-TASK-1', 'c20-key'],
      ['number', 1, 'c20-number'],
    ] as const) {
      const payload = {
        operation_id: operationId,
        type_code: 'TASK',
        title: `Caller injected ${field}`,
        [field]: value,
      };
      expect((await invoke(fixture.binding, payload)).reason).toContain(field);
    }
    expect(await inspectLocalWorkItemStore(fixture.binding)).toEqual({ status: 'absent' });
    expect(fixture.binding.access.fileExists('work/.local-work-item-owner.v1.json', 'C20 absent owner')).toBe(false);
    expect(fixture.binding.access.fileExists('work/.local-work-item-counter.v1.json', 'C20 absent counter')).toBe(
      false,
    );
    expect(fixture.binding.access.fileExists('work/index.md', 'C20 absent index')).toBe(false);
  },
  { timeout_ms: 15_000 },
);

localWorkItemTest(
  'native diagnoses unowned legacy data without adoption',
  async () => {
    const fixture = await createLocalWorkItemFixture({ mode: 'any' });
    const legacy = '{"legacy":"preserve exact bytes"}\n';
    const index = '# Foreign index\n\nKeep this file as written.\n';
    await mkdir(path.join(fixture.root, 'work', 'items'), { recursive: true });
    await writeFile(path.join(fixture.root, 'work', 'items', 'legacy.json'), legacy, 'utf8');
    await writeFile(path.join(fixture.root, 'work', 'index.md'), index, 'utf8');
    const creation = await createLocalWorkItem(fixture.binding, {
      operation_id: 'c22-refuse-adoption',
      type_code: 'TASK',
      title: 'Do not adopt foreign records',
    });
    if (creation.status !== 'needs_reconciliation')
      throw new Error(`expected needs_reconciliation, received ${creation.status}`);
    expect(creation.operation_id).toBe('c22-refuse-adoption');
    expect(creation.reason).toContain('unowned');
    const inspection = await inspectLocalWorkItemStore(fixture.binding);
    expect(inspection).toMatchObject({ status: 'needs_reconciliation', reason: 'unowned work item data is present' });
    let lookupError: unknown;
    try {
      await resolveLocalWorkItem(fixture.binding, { key: 'REPO-DEMO-TASK-1' });
    } catch (error) {
      lookupError = error;
    }
    expect(lookupError).toBeInstanceOf(TypeError);
    expect(lookupError).toHaveProperty('message', 'unowned work item data is present');
    expect(await readFile(path.join(fixture.root, 'work', 'items', 'legacy.json'), 'utf8')).toBe(legacy);
    expect(await readFile(path.join(fixture.root, 'work', 'index.md'), 'utf8')).toBe(index);
    for (const target of [
      'work/.local-work-item-owner.v1.json',
      'work/.local-work-item-counter.v1.json',
      'work/.local-work-item-operations/c22-refuse-adoption.json',
    ])
      expect(fixture.binding.access.fileExists(target, 'C22 no adoption output')).toBe(false);
    const itemFiles = fixture.binding.access.listFiles('work/items', 'C22 no adopted record');
    expect(itemFiles).toEqual(['legacy.json']);
  },
  { timeout_ms: 15_000 },
);

localWorkItemTest(
  'native exact retry is idempotent and changed payload conflicts',
  async () => {
    const fixture = await createLocalWorkItemFixture();
    const request = {
      operation_id: 'c21-exact-retry',
      type_code: 'TASK',
      title: 'Retry preserves its original input',
      description: 'The original **body**.',
      provider_refs: { tracker: 'TASK-401' },
    } satisfies LocalWorkItemRequest;
    const created = requireApplied(await createLocalWorkItem(fixture.binding, request));
    const retry = await createLocalWorkItem(fixture.binding, request);
    if (retry.status !== 'already_applied') throw new Error(`exact retry returned ${retry.status}`);
    expect(retry.item).toEqual(created);

    const recordPath = `work/items/${created.internal_id}.md`;
    const recordBeforeConflict = fixture.binding.access.readText(
      recordPath,
      'LocalWorkItem C21 record before conflict',
    );
    const counterBeforeConflict = fixture.binding.access.readText(
      'work/.local-work-item-counter.v1.json',
      'LocalWorkItem C21 counter before conflict',
    );
    const conflict = await createLocalWorkItem(fixture.binding, {
      ...request,
      title: 'Changed input under the original operation ID',
    });
    if (conflict.status !== 'rejected') throw new Error(`changed-input retry returned ${conflict.status}`);
    expect(conflict.reason).toBe('operation_id was reused with different input');
    const recordAfterConflict = fixture.binding.access.readText(recordPath, 'LocalWorkItem C21 record after conflict');
    const counterAfterConflict = fixture.binding.access.readText(
      'work/.local-work-item-counter.v1.json',
      'LocalWorkItem C21 counter after conflict',
    );
    const resolved = await resolveLocalWorkItem(fixture.binding, { uuid: created.internal_id });
    const inspection = await inspectLocalWorkItemStore(fixture.binding);
    if (inspection.status !== 'ready') throw new Error(`store is ${inspection.status}`);

    expect(created.number).toBe(1);
    expect(recordAfterConflict).toBe(recordBeforeConflict);
    expect(counterAfterConflict).toBe(counterBeforeConflict);
    expect(resolved).toEqual(created);
    expect(inspection.items).toEqual([created]);
    expect(inspection.pending_operations).toEqual([]);
  },
  { timeout_ms: 15_000 },
);
