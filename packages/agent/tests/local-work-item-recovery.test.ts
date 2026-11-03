import { createHash } from 'node:crypto';
import { expect } from 'bun:test';
import {
  createLocalWorkItem,
  inspectLocalWorkItemStore,
  reclassifyLocalWorkItem,
  reparentLocalWorkItem,
  resolveLocalWorkItem,
  resumeLocalWorkItemOperation,
  type CreateLocalWorkItemRequest,
  type LocalWorkItemBinding,
} from '../src/work-items/store.js';
import type { ProductDefinition } from '../src/config/product-model.js';
import type { SafeRepositoryAccess } from '../src/config/safe-repository-access.js';
import { createLocalWorkItemFixture, localWorkItemTest } from './helpers/local-work-item-fixture.js';

const counterPath = 'work/.local-work-item-counter.v1.json';
const ownerPath = 'work/.local-work-item-owner.v1.json';

function journalPath(operationId: string): string {
  return `work/.local-work-item-operations/${encodeURIComponent(operationId)}.json`;
}

function digest(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function objectFromJson(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text);
  if (value === null || Array.isArray(value) || typeof value !== 'object')
    throw new TypeError('expected a JSON object');
  return value as Record<string, unknown>;
}

function reorderJson(text: string): string {
  const entries = Object.entries(objectFromJson(text)).reverse();
  return `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`;
}

function journalItemId(access: SafeRepositoryAccess, operationId: string): string {
  const raw = access.readText(journalPath(operationId), 'recovery test journal witness');
  const value = objectFromJson(raw).item_id;
  if (typeof value !== 'string') throw new TypeError('journal item_id witness is missing');
  return value;
}

function readIfPresent(access: SafeRepositoryAccess, target: string): string | null {
  return access.fileExists(target, 'recovery test bounded snapshot')
    ? access.readText(target, 'recovery test bounded snapshot')
    : null;
}

function expectRecordAbsent(access: SafeRepositoryAccess, id: string): void {
  expect(access.fileExists(`work/items/${id}.md`, 'recovery test record witness')).toBe(false);
}

function withAccess(binding: LocalWorkItemBinding, overrides: Partial<SafeRepositoryAccess>): LocalWorkItemBinding {
  return { ...binding, access: Object.freeze({ ...binding.access, ...overrides }) };
}

function ownerDriftedBinding(binding: LocalWorkItemBinding): LocalWorkItemBinding {
  return { ...binding, repository: { ...binding.repository, prefix: 'ALT' } };
}

localWorkItemTest(
  'native recovers create interrupted before counter reservation',
  async () => {
    const fixture = await createLocalWorkItemFixture();
    const native = fixture.binding.access;
    let fired = false;
    let counterAtFault: string | null = null;
    const binding = withAccess(fixture.binding, {
      replaceAtomicAsync: async (target, expectedHash, contents, label) => {
        if (target === counterPath && !fired) {
          fired = true;
          counterAtFault = native.readText(counterPath, 'C9 counter preimage');
          throw new Error('injected before real counter reservation');
        }
        await native.replaceAtomicAsync(target, expectedHash, contents, label);
      },
    });
    const first = await createLocalWorkItem(binding, {
      operation_id: 'c9-create',
      type_code: 'TASK',
      title: 'Recover before reservation',
      description: 'body survives',
    });
    expect(fired).toBe(true);
    expect(first.status).toBe('needs_reconciliation');
    if (first.status !== 'needs_reconciliation') throw new Error('create did not retain counter uncertainty');
    const id = journalItemId(native, 'c9-create');
    const journal = objectFromJson(native.readText(journalPath('c9-create'), 'C9 journal witness'));
    expect(journal.phase).toBe('reserved');
    expect(journal.status).toBe('pending');
    expect(counterAtFault).not.toBeNull();
    expect(readIfPresent(native, counterPath)).toBe(counterAtFault);
    expectRecordAbsent(native, id);
    const pending = await inspectLocalWorkItemStore(binding);
    expect(pending.status).toBe('needs_reconciliation');
    if (pending.status !== 'needs_reconciliation') throw new Error('unindexed pending store was not fenced');
    expect(pending.reason).toContain('derived index');
    const resumed = await resumeLocalWorkItemOperation(binding, 'c9-create');
    expect(resumed.status).toBe('applied');
    if (resumed.status !== 'applied') throw new Error('supported resume did not apply the reserved create');
    expect(resumed.item.internal_id).toBe(id);
    expect(resumed.item.number).toBe(1);
    expect(resumed.item.description).toBe('body survives');
    const ready = await inspectLocalWorkItemStore(binding);
    expect(ready.status).toBe('ready');
    if (ready.status !== 'ready') throw new Error('resumed store is not ready');
    expect(ready.pending_operations).toEqual([]);
    const retry = await createLocalWorkItem(binding, {
      operation_id: 'c9-create',
      type_code: 'TASK',
      title: 'Recover before reservation',
      description: 'body survives',
    });
    expect(retry.status).toBe('already_applied');
    if (retry.status !== 'already_applied') throw new Error('exact retry did not settle to current result');
    expect(retry.item).toMatchObject({ internal_id: id, number: 1, description: 'body survives' });
    expect(native.listFiles('work/items', 'C9 record inventory')).toHaveLength(1);
  },
  { timeout_ms: 30_000, instrument: true },
);

localWorkItemTest(
  'native recovers create interrupted after counter reservation',
  async () => {
    const fixture = await createLocalWorkItemFixture();
    const native = fixture.binding.access;
    let fired = false;
    const binding = withAccess(fixture.binding, {
      replaceAtomicAsync: async (target, expectedHash, contents, label) => {
        await native.replaceAtomicAsync(target, expectedHash, contents, label);
        if (target === counterPath && !fired) {
          fired = true;
          throw new Error('injected after real counter reservation');
        }
      },
    });
    const first = await createLocalWorkItem(binding, {
      operation_id: 'c10-create',
      type_code: 'TASK',
      title: 'Recover after reservation',
      description: 'persisted journal body',
    });
    expect(fired).toBe(true);
    expect(first.status).toBe('needs_reconciliation');
    if (first.status !== 'needs_reconciliation') throw new Error('create did not retain counter uncertainty');
    const id = journalItemId(native, 'c10-create');
    const reservedCounter = native.readText(counterPath, 'C10 counter witness');
    expect(objectFromJson(reservedCounter).next_number).toBe(2);
    expectRecordAbsent(native, id);
    const pending = await inspectLocalWorkItemStore(binding);
    expect(pending.status).toBe('needs_reconciliation');
    if (pending.status !== 'needs_reconciliation') throw new Error('unindexed pending store was not fenced');
    expect(pending.reason).toContain('derived index');
    const resumed = await resumeLocalWorkItemOperation(binding, 'c10-create');
    expect(resumed.status).toBe('applied');
    if (resumed.status !== 'applied') throw new Error('supported resume did not recover the reserved create');
    expect(resumed.item).toMatchObject({ internal_id: id, number: 1, description: 'persisted journal body' });
    const retry = await createLocalWorkItem(binding, {
      operation_id: 'c10-create',
      type_code: 'TASK',
      title: 'Recover after reservation',
      description: 'persisted journal body',
    });
    expect(retry.status).toBe('already_applied');
    if (retry.status !== 'already_applied') throw new Error('exact retry did not settle');
    expect(retry.item.internal_id).toBe(id);
    expect(retry.item.number).toBe(1);
    expect(native.listFiles('work/items', 'C10 record inventory')).toHaveLength(1);
  },
  { timeout_ms: 30_000, instrument: true },
);

localWorkItemTest(
  'native recovers create interrupted after record publication',
  async () => {
    const fixture = await createLocalWorkItemFixture();
    const native = fixture.binding.access;
    let loseAck = true;
    const binding = withAccess(fixture.binding, {
      writeExclusiveAtomicAsync: async (target, contents, label) => {
        await native.writeExclusiveAtomicAsync(target, contents, label);
        if (loseAck && target.startsWith('work/items/') && target.endsWith('.md')) {
          loseAck = false;
          throw new Error('injected lost acknowledgment after real record publication');
        }
      },
    });
    const first = await createLocalWorkItem(binding, {
      operation_id: 'c11-create',
      type_code: 'TASK',
      title: 'Recover published record',
      description: 'published body',
    });
    expect(loseAck).toBe(false);
    expect(first.status).toBe('needs_reconciliation');
    if (first.status !== 'needs_reconciliation') throw new Error('lost record acknowledgment was not retained');
    const id = journalItemId(native, 'c11-create');
    const published = await resolveLocalWorkItem(fixture.binding, { uuid: id });
    expect(published).not.toBeNull();
    if (!published) throw new Error('real record publication is missing');
    expect(published.number).toBe(1);
    expect(published.description).toBe('published body');
    const resumed = await resumeLocalWorkItemOperation(binding, 'c11-create');
    expect(resumed.status).toBe('applied');
    if (resumed.status !== 'applied') throw new Error('resume did not reconcile published record');
    expect(resumed.item).toMatchObject({ internal_id: id, number: 1 });
    const inspected = await inspectLocalWorkItemStore(binding);
    expect(inspected.status).toBe('ready');
    if (inspected.status !== 'ready') throw new Error('reconciled store is not ready');
    expect(inspected.pending_operations).toEqual([]);
    expect(inspected.items).toHaveLength(1);
    const retry = await createLocalWorkItem(binding, {
      operation_id: 'c11-create',
      type_code: 'TASK',
      title: 'Recover published record',
      description: 'published body',
    });
    expect(retry.status).toBe('already_applied');
    if (retry.status !== 'already_applied') throw new Error('exact retry did not report already_applied');
    expect(retry.item).toMatchObject({ internal_id: id, number: 1, description: 'published body' });
    expect(native.listFiles('work/items', 'C11 record inventory')).toEqual([`${id}.md`]);
  },
  { timeout_ms: 30_000, instrument: true },
);

localWorkItemTest(
  'native recovers create interrupted after derived index publication',
  async () => {
    const fixture = await createLocalWorkItemFixture();
    const native = fixture.binding.access;
    let loseAck = true;
    const binding = withAccess(fixture.binding, {
      writeExclusiveAtomicAsync: async (target, contents, label) => {
        await native.writeExclusiveAtomicAsync(target, contents, label);
        if (loseAck && target === 'work/index.md') {
          loseAck = false;
          throw new Error('injected lost acknowledgment after real index publication');
        }
      },
    });
    const first = await createLocalWorkItem(binding, {
      operation_id: 'c12-create',
      type_code: 'TASK',
      title: 'Recover published index',
      description: 'index body',
    });
    expect(loseAck).toBe(false);
    expect(first.status).toBe('needs_reconciliation');
    if (first.status !== 'needs_reconciliation') throw new Error('lost index acknowledgment was not retained');
    const id = journalItemId(native, 'c12-create');
    const actualIndex = native.readText('work/index.md', 'C12 derived index witness');
    expect(actualIndex).toContain(`items/${id}.md`);
    expect(native.listFiles('work/items', 'C12 record inventory')).toEqual([`${id}.md`]);
    const resumed = await resumeLocalWorkItemOperation(binding, 'c12-create');
    expect(resumed.status).toBe('applied');
    if (resumed.status !== 'applied') throw new Error('resume did not bind the already published index');
    expect(resumed.item).toMatchObject({ internal_id: id, number: 1, description: 'index body' });
    const ready = await inspectLocalWorkItemStore(binding);
    expect(ready.status).toBe('ready');
    if (ready.status !== 'ready') throw new Error('reconciled index is not ready');
    expect(ready.pending_operations).toEqual([]);
    expect(ready.items).toHaveLength(1);
    expect(native.readText('work/index.md', 'C12 final index witness')).toBe(actualIndex);
    const retry = await createLocalWorkItem(binding, {
      operation_id: 'c12-create',
      type_code: 'TASK',
      title: 'Recover published index',
      description: 'index body',
    });
    expect(retry.status).toBe('already_applied');
    if (retry.status !== 'already_applied') throw new Error('exact retry did not report already_applied');
    expect(retry.item).toMatchObject({ internal_id: id, number: 1 });
  },
  { timeout_ms: 30_000, instrument: true },
);

localWorkItemTest(
  'native refuses policy and owner drift during recovery',
  async () => {
    const fixture = await createLocalWorkItemFixture();
    const native = fixture.binding.access;
    let fired = false;
    let counterAtFault: string | null = null;
    const binding = withAccess(fixture.binding, {
      replaceAtomicAsync: async (target, expectedHash, contents, label) => {
        if (target === counterPath && !fired) {
          fired = true;
          counterAtFault = native.readText(counterPath, 'C13 counter preimage');
          throw new Error('injected before counter reservation for drift fixture');
        }
        await native.replaceAtomicAsync(target, expectedHash, contents, label);
      },
    });
    const first = await createLocalWorkItem(binding, {
      operation_id: 'c13-create',
      type_code: 'TASK',
      title: 'Retain under drift',
      description: 'preserved pending body',
    });
    expect(first.status).toBe('needs_reconciliation');
    if (first.status !== 'needs_reconciliation') throw new Error('drift setup did not remain pending');
    const id = journalItemId(native, 'c13-create');
    const journalBefore = native.readText(journalPath('c13-create'), 'C13 retained journal');
    const recordText = objectFromJson(journalBefore).record_text;
    const counterBefore = native.readText(counterPath, 'C13 retained counter');
    expect(typeof recordText).toBe('string');
    expectRecordAbsent(native, id);
    const initial = await inspectLocalWorkItemStore(binding);
    expect(initial.status).toBe('needs_reconciliation');
    if (initial.status !== 'needs_reconciliation') throw new Error('unindexed drift fixture was not fenced');
    expect(initial.reason).toContain('derived index');
    expect(counterAtFault).not.toBeNull();

    const changedPolicy: ProductDefinition['work_items']['hierarchy'] = {
      mode: 'custom',
      allowed_children: { PBI: ['BUG'], BUG: [], TASK: [] },
    };
    const policyBinding: LocalWorkItemBinding = {
      ...binding,
      product: { ...binding.product, work_items: { ...binding.product.work_items, hierarchy: changedPolicy } },
    };
    const policyRefusal = await resumeLocalWorkItemOperation(policyBinding, 'c13-create');
    expect(policyRefusal.status).toBe('needs_reconciliation');
    if (policyRefusal.status !== 'needs_reconciliation') throw new Error('changed policy was not fenced');
    expect(policyRefusal.reason).toContain('hierarchy policy or enabled types changed');
    const policyView = await inspectLocalWorkItemStore(policyBinding);
    expect(policyView.status).toBe('needs_reconciliation');
    if (policyView.status !== 'needs_reconciliation') throw new Error('policy drift did not remain fenced');
    expect(policyView.reason).toContain('derived index');

    const ownerBefore = native.readText(ownerPath, 'C13 owner preimage');
    const ownerAfter = reorderJson(ownerBefore.replace('"repository_prefix":"REPO"', '"repository_prefix":"ALT"'));
    await native.replaceAtomicAsync(ownerPath, digest(ownerBefore), ownerAfter, 'C13 controlled owner drift');
    const driftBinding = ownerDriftedBinding(binding);
    const ownerRefusal = await resumeLocalWorkItemOperation(driftBinding, 'c13-create');
    expect(ownerRefusal.status).toBe('needs_reconciliation');
    if (ownerRefusal.status !== 'needs_reconciliation') throw new Error('changed owner prefix was not fenced');
    const ownerView = await inspectLocalWorkItemStore(driftBinding);
    expect(ownerView.status).toBe('needs_reconciliation');
    expect(native.readText(ownerPath, 'C13 preserved drifted owner')).toBe(ownerAfter);
    expect(native.readText(journalPath('c13-create'), 'C13 preserved journal')).toBe(journalBefore);
    expect(native.readText(counterPath, 'C13 preserved counter')).toBe(counterBefore);
    expectRecordAbsent(native, id);
    if (typeof recordText !== 'string') throw new Error('persisted body witness is missing');
    expect(recordText).toContain('preserved pending body');
  },
  { timeout_ms: 30_000, instrument: true },
);

localWorkItemTest(
  'native retries completed operations after later mutations without reverting history',
  async () => {
    const fixture = await createLocalWorkItemFixture({ mode: 'any' });
    const binding = fixture.binding;
    const created = await createLocalWorkItem(binding, {
      operation_id: 'c14-create-item',
      type_code: 'TASK',
      title: 'Original body',
      description: 'keep this body',
      provider_refs: { tracker: 'T-14' },
    });
    expect(created.status).toBe('applied');
    if (created.status !== 'applied') throw new Error('C14 initial create failed');
    const itemId = created.item.internal_id;
    const parentResult = await createLocalWorkItem(binding, {
      operation_id: 'c14-create-parent',
      type_code: 'PBI',
      title: 'Later parent',
    });
    expect(parentResult.status).toBe('applied');
    if (parentResult.status !== 'applied') throw new Error('C14 parent create failed');
    const classified = await reclassifyLocalWorkItem(binding, {
      operation_id: 'c14-reclassify',
      internal_id: itemId,
      expected_revision: 1,
      type_code: 'BUG',
    });
    expect(classified.status).toBe('applied');
    if (classified.status !== 'applied') throw new Error('C14 reclassification failed');
    const reparented = await reparentLocalWorkItem(binding, {
      operation_id: 'c14-reparent',
      internal_id: itemId,
      expected_revision: 2,
      parent_id: parentResult.item.internal_id,
    });
    expect(reparented.status).toBe('applied');
    if (reparented.status !== 'applied') throw new Error('C14 reparent failed');
    const retry = await createLocalWorkItem(binding, {
      operation_id: 'c14-create-item',
      type_code: 'TASK',
      title: 'Original body',
      description: 'keep this body',
      provider_refs: { tracker: 'T-14' },
    });
    expect(retry.status).toBe('already_applied');
    if (retry.status !== 'already_applied') throw new Error('C14 completed create retry was not recognized');
    expect(retry.item).toMatchObject({
      internal_id: itemId,
      number: created.item.number,
      canonical_kind: 'bug',
      type_code: 'BUG',
      revision: 3,
      description: 'keep this body',
      provider_refs: { tracker: 'T-14' },
      parent_id: parentResult.item.internal_id,
      aliases: [created.item.key],
    });
    const byId = await resolveLocalWorkItem(binding, { uuid: itemId });
    expect(byId).toMatchObject({ internal_id: itemId, revision: 3, parent_id: parentResult.item.internal_id });
    const ready = await inspectLocalWorkItemStore(binding);
    expect(ready.status).toBe('ready');
    if (ready.status !== 'ready') throw new Error('C14 store is not ready');
    expect(ready.items).toHaveLength(2);
    expect(ready.items.find((item) => item.internal_id === itemId)).toMatchObject({
      revision: 3,
      parent_id: parentResult.item.internal_id,
    });
    expect(fixture.binding.access.listFiles('work/items', 'C14 record inventory')).toHaveLength(2);
  },
  { timeout_ms: 45_000, instrument: true },
);

localWorkItemTest(
  'native transitions reordered and whitespace journal preimages',
  async () => {
    const fixture = await createLocalWorkItemFixture();
    const native = fixture.binding.access;
    let rewrittenRaw: string | undefined;
    let consumedExpectedHash: string | undefined;
    let journalWrites = 0;
    const binding = withAccess(fixture.binding, {
      writeExclusiveAtomicAsync: async (target, contents, label) => {
        await native.writeExclusiveAtomicAsync(target, contents, label);
        if (target === journalPath('c15-create') && rewrittenRaw === undefined) {
          journalWrites += 1;
          const raw = native.readText(target, 'C15 initial raw journal');
          rewrittenRaw = reorderJson(raw);
          await native.replaceAtomicAsync(target, digest(raw), rewrittenRaw, 'C15 real raw-preimage CAS');
        }
      },
      replaceAtomicAsync: async (target, expectedHash, contents, label) => {
        if (target === journalPath('c15-create') && consumedExpectedHash === undefined)
          consumedExpectedHash = expectedHash;
        await native.replaceAtomicAsync(target, expectedHash, contents, label);
      },
    });
    const result = await createLocalWorkItem(binding, {
      operation_id: 'c15-create',
      type_code: 'TASK',
      title: 'Raw journal survives',
      description: 'actual captured preimage',
    });
    expect(result.status).toBe('applied');
    if (result.status !== 'applied') throw new Error('public create failed from reordered journal bytes');
    expect(journalWrites).toBe(1);
    expect(rewrittenRaw).toBeDefined();
    expect(consumedExpectedHash).toBe(digest(rewrittenRaw ?? ''));
    expect(result.item.description).toBe('actual captured preimage');
    const inspected = await inspectLocalWorkItemStore(binding);
    expect(inspected.status).toBe('ready');
    if (inspected.status !== 'ready') throw new Error('C15 final store is not ready');
    expect(inspected.pending_operations).toEqual([]);
    expect(await resolveLocalWorkItem(binding, { uuid: result.item.internal_id })).toMatchObject({
      internal_id: result.item.internal_id,
      number: 1,
    });
  },
  { timeout_ms: 15_000, instrument: true },
);

localWorkItemTest(
  'native refuses journal byte drift at CAS without overwrite',
  async () => {
    const fixture = await createLocalWorkItemFixture();
    const native = fixture.binding.access;
    let raced = false;
    let changedBytes: string | undefined;
    let raceError: unknown;
    const binding = withAccess(fixture.binding, {
      replaceAtomicAsync: async (target, expectedHash, contents, label) => {
        if (target === journalPath('c16-create') && !raced) {
          raced = true;
          const current = native.readText(target, 'C16 journal race capture');
          changedBytes = reorderJson(current);
          await native.replaceAtomicAsync(
            target,
            digest(current),
            changedBytes,
            'C16 deterministic native interleaving',
          );
          try {
            await native.replaceAtomicAsync(target, expectedHash, contents, label);
            throw new Error('stale journal CAS unexpectedly overwrote the interleaving');
          } catch (error) {
            if (error instanceof Error && error.message === 'stale journal CAS unexpectedly overwrote the interleaving')
              throw error;
            raceError = error;
            throw error;
          }
        }
        await native.replaceAtomicAsync(target, expectedHash, contents, label);
      },
    });
    const firstView = await inspectLocalWorkItemStore(fixture.binding);
    expect(firstView.status).toBe('absent');
    const result = await createLocalWorkItem(binding, {
      operation_id: 'c16-create',
      type_code: 'TASK',
      title: 'CAS race must remain fenced',
    });
    expect(raced).toBe(true);
    expect(raceError).toBeInstanceOf(Error);
    expect(result.status).toBe('needs_reconciliation');
    if (result.status !== 'needs_reconciliation') throw new Error('stale raw-journal CAS was not fenced');
    const id = journalItemId(native, 'c16-create');
    expect(changedBytes).toBeDefined();
    const persistedChangedBytes = changedBytes;
    if (persistedChangedBytes === undefined) throw new Error('controlled journal byte change was not captured');
    expect(native.readText(journalPath('c16-create'), 'C16 preserved changed journal')).toBe(persistedChangedBytes);
    expectRecordAbsent(native, id);
    expect(native.listFiles('work/items', 'C16 unchanged record inventory')).toEqual([]);
    const uncertain = await inspectLocalWorkItemStore(binding);
    expect(uncertain.status).toBe('needs_reconciliation');
    expect(await resolveLocalWorkItem(fixture.binding, { uuid: id })).toBeNull();
    expect(native.readText(journalPath('c16-create'), 'C16 final journal witness')).toBe(persistedChangedBytes);
  },
  { timeout_ms: 15_000, instrument: true },
);

localWorkItemTest(
  'native fences pending and ambiguous publication without replay',
  async () => {
    const fixture = await createLocalWorkItemFixture();
    const native = fixture.binding.access;
    let failBeforeRecord = true;
    const binding = withAccess(fixture.binding, {
      writeExclusiveAtomicAsync: async (target, contents, label) => {
        if (failBeforeRecord && target.startsWith('work/items/') && target.endsWith('.md')) {
          failBeforeRecord = false;
          throw new Error('controlled fault before native record publication');
        }
        await native.writeExclusiveAtomicAsync(target, contents, label);
      },
    });
    const first = await createLocalWorkItem(binding, {
      operation_id: 'c17-original',
      type_code: 'TASK',
      title: 'Publishing intent stays fenced',
    });
    expect(failBeforeRecord).toBe(false);
    expect(first.status).toBe('needs_reconciliation');
    if (first.status !== 'needs_reconciliation') throw new Error('publication fault was not retained');
    const id = journalItemId(native, 'c17-original');
    const journal = objectFromJson(native.readText(journalPath('c17-original'), 'C17 publishing journal'));
    expect(journal.phase).toBe('publishing');
    expect(journal.status).toBe('pending');
    expectRecordAbsent(native, id);
    const blocked = await createLocalWorkItem(binding, {
      operation_id: 'c17-contender',
      type_code: 'BUG',
      title: 'Must not pass the pending operation',
    });
    expect(blocked.status).toBe('needs_reconciliation');
    if (blocked.status !== 'needs_reconciliation') throw new Error('later operation passed pending publication');
    expect(blocked.operation_id).toBe('c17-original');
    const inspection = await inspectLocalWorkItemStore(binding);
    expect(inspection.status).toBe('needs_reconciliation');
    const resumed = await resumeLocalWorkItemOperation(binding, 'c17-original');
    expect(resumed.status).toBe('needs_reconciliation');
    if (resumed.status !== 'needs_reconciliation') throw new Error('publishing intent was blindly replayed');
    expect(resumed.reason).toContain('must not be replayed');
    expectRecordAbsent(native, id);
    expect(native.listFiles('work/items', 'C17 unchanged record inventory')).toEqual([]);
    expect(native.fileExists(journalPath('c17-contender'), 'C17 contender journal witness')).toBe(false);
  },
  { timeout_ms: 30_000, instrument: true },
);

localWorkItemTest(
  'native retains post-effect lock-release uncertainty',
  async () => {
    const fixture = await createLocalWorkItemFixture();
    const native = fixture.binding.access;
    let loseReleaseAck = true;
    let journalBeforeReleaseFailure: string | undefined;
    let recordBeforeReleaseFailure: string | undefined;
    const binding = withAccess(fixture.binding, {
      withExclusiveLockAsync: async <T>(target: string, label: string, operation: () => Promise<T>) => {
        const result = await native.withExclusiveLockAsync(target, label, operation);
        if (loseReleaseAck && target === 'work/.local-work-item-store-lock') {
          journalBeforeReleaseFailure = native.readText(
            journalPath('c18-create'),
            'C18 applied journal before failure',
          );
          const itemId = objectFromJson(journalBeforeReleaseFailure).item_id;
          if (typeof itemId !== 'string') throw new Error('completed callback has no item identity');
          recordBeforeReleaseFailure = native.readText(`work/items/${itemId}.md`, 'C18 applied record before failure');
          loseReleaseAck = false;
          throw new Error('injected lost acknowledgment after real lock callback and release');
        }
        return result;
      },
    });
    const first = await createLocalWorkItem(binding, {
      operation_id: 'c18-create',
      type_code: 'TASK',
      title: 'Effects completed before release acknowledgment',
      description: 'completed effect',
    });
    expect(loseReleaseAck).toBe(false);
    expect(journalBeforeReleaseFailure).toBeDefined();
    expect(objectFromJson(journalBeforeReleaseFailure ?? '')).toMatchObject({ status: 'applied', phase: 'published' });
    expect(recordBeforeReleaseFailure).toContain('completed effect');
    expect(first.status).toBe('needs_reconciliation');
    if (first.status !== 'needs_reconciliation') throw new Error('post-effect acknowledgment loss was not retained');
    const id = journalItemId(native, 'c18-create');
    const inspection = await inspectLocalWorkItemStore(binding);
    expect(inspection.status).toBe('ready');
    if (inspection.status !== 'ready') throw new Error('completed effects are not inspectable');
    expect(inspection.pending_operations).toEqual([]);
    expect(inspection.items).toHaveLength(1);
    const resumed = await resumeLocalWorkItemOperation(binding, 'c18-create');
    expect(resumed.status).toBe('already_applied');
    if (resumed.status !== 'already_applied') throw new Error('resume did not bind the existing completed identity');
    expect(resumed.item).toMatchObject({ internal_id: id, number: 1, description: 'completed effect' });
    expect(native.listFiles('work/items', 'C18 record inventory')).toEqual([`${id}.md`]);
    expect(await resolveLocalWorkItem(binding, { uuid: id })).toMatchObject({ internal_id: id, number: 1 });
  },
  { timeout_ms: 30_000, instrument: true },
);

localWorkItemTest(
  'native retry digest ignores live capabilities and unrelated mappings',
  async () => {
    const fixture = await createLocalWorkItemFixture();
    const native = fixture.binding.access;
    let liveAccess = withAccess(fixture.binding, {}).access;
    let liveRepository = fixture.binding.repository;
    let liveProduct: ProductDefinition = structuredClone(fixture.binding.product);
    const binding: LocalWorkItemBinding = {
      get access() {
        return liveAccess;
      },
      get repository() {
        return liveRepository;
      },
      get product() {
        return liveProduct;
      },
    };
    let gateStarted: () => void = () => {};
    let releaseGate: () => void = () => {};
    const started = new Promise<void>((resolve) => {
      gateStarted = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      releaseGate = resolve;
    });
    let held = false;
    liveAccess = withAccess(fixture.binding, {
      withExclusiveLockAsync: async <T>(target: string, label: string, operation: () => Promise<T>) => {
        if (!held && target === 'work/.local-work-item-store-lock') {
          held = true;
          gateStarted();
          await gate;
        }
        return native.withExclusiveLockAsync(target, label, operation);
      },
    }).access;
    const request = {
      operation_id: 'c19-create',
      type_code: 'TASK',
      title: 'Captured request title',
      description: 'captured request body',
      provider_refs: { tracker: 'C-19' },
    } satisfies CreateLocalWorkItemRequest;
    const alternateAccess = Object.freeze({
      ...native,
      writeExclusiveAtomicAsync: async (_target: string, _contents: string, _label: string) => {
        throw new Error('live replacement capability must not be used by captured operation');
      },
    });
    const creating = createLocalWorkItem(binding, request);
    await started;
    request.title = 'mutated while awaiting lock';
    request.description = 'mutated body';
    request.provider_refs = { tracker: 'changed' };
    liveRepository = { ...fixture.binding.repository, prefix: 'ALT' };
    liveProduct = {
      ...fixture.binding.product,
      code_selectors: ['src/unrelated.ts'],
      documents: {
        ...fixture.binding.product.documents,
        index: 'docs/unrelated-wiki.md',
        research: 'research/unrelated',
      },
    };
    liveAccess = alternateAccess;
    releaseGate();
    const created = await creating;
    expect(created.status).toBe('applied');
    if (created.status !== 'applied') throw new Error('captured operation failed after caller inputs changed');
    const id = created.item.internal_id;
    expect(created.item).toMatchObject({
      title: 'Captured request title',
      description: 'captured request body',
      provider_refs: { tracker: 'C-19' },
      key: 'REPO-DEMO-TASK-1',
    });
    expect(native.listFiles('work/items', 'C19 record inventory')).toEqual([`${id}.md`]);

    request.title = 'Captured request title';
    request.description = 'captured request body';
    request.provider_refs = { tracker: 'C-19' };
    const journalBeforePrefixRefusal = native.readText(journalPath('c19-create'), 'C19 journal before owner refusal');
    const recordBeforePrefixRefusal = native.readText(`work/items/${id}.md`, 'C19 record before owner refusal');
    liveProduct = {
      ...fixture.binding.product,
      code_selectors: ['src/another-unrelated.ts'],
      documents: {
        ...fixture.binding.product.documents,
        index: 'docs/another-unrelated-wiki.md',
        research: 'research/another-unrelated',
      },
    };
    const ownerRefusal = await createLocalWorkItem(binding, request);
    expect(ownerRefusal.status).toBe('needs_reconciliation');
    if (ownerRefusal.status !== 'needs_reconciliation') throw new Error('owner prefix drift did not remain enforced');
    expect(native.readText(journalPath('c19-create'), 'C19 unchanged journal')).toBe(journalBeforePrefixRefusal);
    expect(native.readText(`work/items/${id}.md`, 'C19 unchanged record')).toBe(recordBeforePrefixRefusal);

    liveRepository = fixture.binding.repository;
    liveProduct = {
      ...liveProduct,
      work_items: {
        ...liveProduct.work_items,
        hierarchy: { mode: 'custom', allowed_children: { PBI: ['BUG'], BUG: [], TASK: [] } },
      },
    };
    const policyRefusal = await createLocalWorkItem(binding, request);
    expect(policyRefusal.status).toBe('needs_reconciliation');
    if (policyRefusal.status !== 'needs_reconciliation') throw new Error('policy digest drift was not enforced');
    expect(native.readText(journalPath('c19-create'), 'C19 journal after policy refusal')).toBe(
      journalBeforePrefixRefusal,
    );
    expect(native.readText(`work/items/${id}.md`, 'C19 record after policy refusal')).toBe(recordBeforePrefixRefusal);

    liveProduct = {
      ...liveProduct,
      work_items: {
        ...liveProduct.work_items,
        hierarchy: fixture.binding.product.work_items.hierarchy,
      },
    };
    const retryWithChangedCapability = await createLocalWorkItem(binding, request);
    expect(retryWithChangedCapability.status).toBe('already_applied');
    if (retryWithChangedCapability.status !== 'already_applied')
      throw new Error('capability-only change altered retry digest');
    expect(retryWithChangedCapability.item).toMatchObject({
      internal_id: id,
      number: 1,
      title: 'Captured request title',
    });
    expect(native.listFiles('work/items', 'C19 post-retry inventory')).toEqual([`${id}.md`]);
    expect(await inspectLocalWorkItemStore(fixture.binding)).toMatchObject({ status: 'ready', pending_operations: [] });
    expect(await resolveLocalWorkItem(fixture.binding, { uuid: id })).toMatchObject({ internal_id: id, number: 1 });
  },
  { timeout_ms: 30_000, instrument: true },
);
