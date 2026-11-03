import { createHash, randomUUID } from 'node:crypto';
import { WORK_ITEM_TYPES, getWorkItemType, type WorkItemCode, type WorkItemKind } from './catalog.js';
import { formatWorkItemKey } from './key.js';
import {
  productModelSchema,
  validateProductHierarchy,
  type ProductDefinition,
  type ProductModelDefinition,
} from '../config/product-model.js';
import {
  readRepositoryTextImage,
  SafeRepositoryLockContentionError,
  type SafeRepositoryAccess,
} from '../config/safe-repository-access.js';
import { parse, stringify } from 'yaml';
import { z } from 'zod';

const workItemCodeSchema = z.enum(WORK_ITEM_TYPES.map((item) => item.code));
const counterSchema = z.strictObject({
  schema: z.literal('LocalWorkItemCounter/v1'),
  owner_digest: z.string(),
  next_number: z.number().int().positive().safe(),
});
const recordSchema = z.strictObject({
  type: z.literal('Work Item'),
  schema: z.literal('LocalWorkItem/v1'),
  version: z.literal(1),
  internal_id: z.string().uuid(),
  repository_id: z.string().min(1),
  project_id: z.string().min(1),
  number: z.number().int().positive().safe(),
  canonical_kind: z.enum(WORK_ITEM_TYPES.map((item) => item.kind)),
  type_code: workItemCodeSchema,
  key: z.string().min(1),
  aliases: z
    .array(z.string().min(1))
    .refine((values) => new Set(values).size === values.length, 'aliases must be unique'),
  parent_id: z.string().uuid().nullable(),
  revision: z.number().int().positive().safe(),
  title: z.string().min(1),
  provider_refs: z.record(z.string(), z.string()),
});
const createRequestSchema = z.strictObject({
  operation_id: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/),
  type_code: workItemCodeSchema,
  title: z
    .string()
    .min(1)
    .refine((value) => value.trim().length > 0, 'title must not be empty'),
  description: z.string().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  provider_refs: z.record(z.string(), z.string()).optional(),
});
const reclassifyRequestSchema = z.strictObject({
  operation_id: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/),
  internal_id: z.string().uuid(),
  expected_revision: z.number().int().positive().safe(),
  type_code: workItemCodeSchema,
});
const reparentRequestSchema = z.strictObject({
  operation_id: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/),
  internal_id: z.string().uuid(),
  expected_revision: z.number().int().positive().safe(),
  parent_id: z.string().uuid().nullable(),
});

export type LocalWorkItemRecord = z.infer<typeof recordSchema> & { readonly description: string };
export interface LocalWorkItemBinding {
  readonly access: SafeRepositoryAccess;
  readonly repository: ProductModelDefinition['repository'];
  readonly product: ProductDefinition;
}
export interface CreateLocalWorkItemRequest {
  readonly operation_id: string;
  readonly type_code: WorkItemCode;
  readonly title: string;
  readonly description?: string;
  readonly parent_id?: string | null;
  readonly provider_refs?: Readonly<Record<string, string>>;
}
export interface ReclassifyLocalWorkItemRequest {
  readonly operation_id: string;
  readonly internal_id: string;
  readonly expected_revision: number;
  readonly type_code: WorkItemCode;
}
export interface ReparentLocalWorkItemRequest {
  readonly operation_id: string;
  readonly internal_id: string;
  readonly expected_revision: number;
  readonly parent_id: string | null;
}
export type LocalWorkItemRequest =
  | CreateLocalWorkItemRequest
  | ReclassifyLocalWorkItemRequest
  | ReparentLocalWorkItemRequest;
export type LocalWorkItemOutcome<T = LocalWorkItemRecord> =
  | { readonly status: 'applied' | 'already_applied'; readonly item: T }
  | { readonly status: 'rejected'; readonly reason: string }
  | { readonly status: 'busy'; readonly operation_id?: string }
  | { readonly status: 'needs_reconciliation'; readonly operation_id: string; readonly reason: string };
export type LocalWorkItemReference = { readonly uuid: string } | { readonly key: string } | { readonly alias: string };
export type LocalWorkItemInspection =
  | { readonly status: 'absent' }
  | {
      readonly status: 'ready';
      readonly items: readonly LocalWorkItemRecord[];
      readonly pending_operations: readonly string[];
    }
  | { readonly status: 'needs_reconciliation'; readonly reason: string; readonly operation_id?: string };

interface Owner {
  schema: 'LocalWorkItemStore/v1';
  repository_id: string;
  repository_prefix: string;
  project_id: string;
  project_prefix: string;
  storage_root: string;
}
interface Journal {
  schema: 'LocalWorkItemOperation/v1';
  operation_id: string;
  operation: 'create' | 'reclassify' | 'reparent';
  request_digest: string;
  request: LocalWorkItemRequest;
  policy_digest: string;
  owner_digest: string;
  status: 'pending' | 'applied';
  phase: 'reserved' | 'publishing' | 'published';
  item_id: string;
  before_hash: string | null;
  after_hash: string;
  record_text: string;
}

const hash = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');
const join = (...parts: string[]): string =>
  parts
    .filter((part) => part !== '.')
    .join('/')
    .replace(/\/+/g, '/') || '.';
const operationIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const json = (value: unknown): string => JSON.stringify(value);
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function paths(binding: LocalWorkItemBinding) {
  const root = binding.product.work_items.storage_root;
  return {
    root,
    items: join(root, 'items'),
    owner: join(root, '.local-work-item-owner.v1.json'),
    counter: join(root, '.local-work-item-counter.v1.json'),
    lock: join(root, '.local-work-item-store-lock'),
    journal: (id: string) => join(root, '.local-work-item-operations', `${encodeURIComponent(id)}.json`),
    record: (id: string) => join(root, 'items', `${id}.md`),
    index: join(root, 'index.md'),
  };
}
function bindingOwner(binding: LocalWorkItemBinding): Owner {
  const model = productModelSchema.parse({
    schema: 'ProductModel/v1',
    version: 1,
    repository: binding.repository,
    projects: [binding.product],
  });
  return {
    schema: 'LocalWorkItemStore/v1',
    repository_id: model.repository.repository_id,
    repository_prefix: model.repository.prefix,
    project_id: binding.product.project_id,
    project_prefix: binding.product.prefix,
    storage_root: binding.product.work_items.storage_root,
  };
}
function ownerDigest(owner: Owner): string {
  return hash(json(owner));
}
function codeFor(code: string): { code: WorkItemCode; kind: WorkItemKind } {
  const entry = getWorkItemType(code);
  if (!entry || entry.code !== code) throw new TypeError('type_code must be an exact supported uppercase code');
  return entry;
}
function recordText(record: LocalWorkItemRecord): string {
  const { description, ...frontmatter } = record;
  return `---\n${stringify(frontmatter).trimEnd()}\n---\n${description}`;
}
function decodeRecord(text: string): LocalWorkItemRecord {
  if (!text.startsWith('---\n')) throw new TypeError('record has no YAML frontmatter');
  const end = text.indexOf('\n---\n', 4);
  if (end < 0) throw new TypeError('record frontmatter is unterminated');
  const parsed = recordSchema.parse(parse(text.slice(4, end)));
  const type = getWorkItemType(parsed.canonical_kind);
  if (!type || type.kind !== parsed.canonical_kind || type.code !== parsed.type_code)
    throw new TypeError('record kind and code do not match the catalog');
  return { ...parsed, description: text.slice(end + 5) };
}
function read(access: SafeRepositoryAccess, target: string): string | null {
  return readRepositoryTextImage(access, target, 'local work item store');
}
async function writeNew(access: SafeRepositoryAccess, target: string, value: string): Promise<void> {
  await access.writeExclusiveAtomicAsync(target, value, 'local work item store');
}
async function replace(access: SafeRepositoryAccess, target: string, before: string, after: string): Promise<void> {
  await access.replaceAtomicAsync(target, hash(before), after, 'local work item store');
}
function validateBinding(binding: LocalWorkItemBinding): {
  owner: Owner;
  ownerHash: string;
  p: ReturnType<typeof paths>;
} {
  binding.access.assertAvailable();
  if (!binding.access.repository_root) throw new TypeError('safe repository access has no captured root');
  const owner = bindingOwner(binding);
  return { owner, ownerHash: ownerDigest(owner), p: paths(binding) };
}
function captureBinding(input: LocalWorkItemBinding): LocalWorkItemBinding {
  const access = Object.freeze({ ...input.access });
  access.assertAvailable();
  if (!access.repository_root) throw new TypeError('safe repository access has no captured root');
  const model = productModelSchema.parse({
    schema: 'ProductModel/v1',
    version: 1,
    repository: structuredClone(input.repository),
    projects: [structuredClone(input.product)],
  });
  const product = model.projects[0];
  if (!product) throw new TypeError('product binding is missing');
  return Object.freeze({ access, repository: model.repository, product });
}
function captureRequest(operation: Journal['operation'], input: LocalWorkItemRequest): LocalWorkItemRequest {
  if (operation === 'create') return createRequestSchema.parse(structuredClone(input)) as CreateLocalWorkItemRequest;
  if (operation === 'reclassify')
    return reclassifyRequestSchema.parse(structuredClone(input)) as ReclassifyLocalWorkItemRequest;
  return reparentRequestSchema.parse(structuredClone(input)) as ReparentLocalWorkItemRequest;
}
function readItems(binding: LocalWorkItemBinding, p: ReturnType<typeof paths>): LocalWorkItemRecord[] {
  if (!binding.access.fileExists(p.items, 'local work item store')) return [];
  const names = binding.access.listFiles(p.items, 'local work item store');
  const records: LocalWorkItemRecord[] = [];
  for (const name of names) {
    if (!name.endsWith('.md')) throw new TypeError(`foreign item entry: ${name}`);
    const text = read(binding.access, join(p.items, name));
    if (text === null) throw new TypeError(`item disappeared during inspection: ${name}`);
    const item = decodeRecord(text);
    if (`${item.internal_id}.md` !== name) throw new TypeError(`item filename does not match internal_id: ${name}`);
    if (item.repository_id !== binding.repository.repository_id || item.project_id !== binding.product.project_id)
      throw new TypeError(`foreign item owner: ${name}`);
    const expectedKey = formatWorkItemKey({
      repository_prefix: binding.repository.prefix,
      project_prefix: binding.product.prefix,
      type_code: item.type_code,
      number: item.number,
    });
    if (item.key !== expectedKey || item.aliases.includes(item.key))
      throw new TypeError(`item key does not match its bound identity: ${name}`);
    assertUniqueKey(records, item);
    records.push(item);
  }
  return records;
}
function findRecord(records: readonly LocalWorkItemRecord[], id: string): LocalWorkItemRecord | undefined {
  return records.find((entry) => entry.internal_id === id);
}
function digestRequest(
  binding: LocalWorkItemBinding,
  operation: Journal['operation'],
  request: LocalWorkItemRequest,
): string {
  const work = binding.product.work_items;
  const policy =
    work.hierarchy.mode === 'any'
      ? { mode: 'any' }
      : {
          mode: 'custom',
          allowed_children: Object.fromEntries(
            Object.entries(work.hierarchy.allowed_children)
              .sort(([left], [right]) => left.localeCompare(right))
              .map(([key, values]) => [key, [...values].sort((left, right) => left.localeCompare(right))]),
          ),
        };
  const stable = {
    operation,
    request,
    repository_id: binding.repository.repository_id,
    repository_prefix: binding.repository.prefix,
    project_id: binding.product.project_id,
    project_prefix: binding.product.prefix,
    storage_root: work.storage_root,
    enabled_types: [...work.enabled_types].sort((left, right) => left.localeCompare(right)),
    hierarchy: policy,
  };
  return hash(canonicalJson(stable));
}
function policyDigest(binding: LocalWorkItemBinding): string {
  const work = binding.product.work_items;
  return hash(
    json({
      enabled_types: [...work.enabled_types].sort((left, right) => left.localeCompare(right)),
      hierarchy:
        work.hierarchy.mode === 'any'
          ? { mode: 'any' }
          : {
              mode: 'custom',
              allowed_children: Object.fromEntries(
                Object.entries(work.hierarchy.allowed_children)
                  .sort(([left], [right]) => left.localeCompare(right))
                  .map(([key, values]) => [key, [...values].sort((left, right) => left.localeCompare(right))]),
              ),
            },
    }),
  );
}
function ensureEnabled(binding: LocalWorkItemBinding, code: WorkItemCode): void {
  if (!binding.product.work_items.enabled_types.includes(code))
    throw new TypeError(`work item type is disabled: ${code}`);
}
function assertEdge(
  binding: LocalWorkItemBinding,
  parent: LocalWorkItemRecord | null,
  childCode: WorkItemCode,
  policy = validateProductHierarchy(binding.product.work_items.hierarchy, binding.product.work_items.enabled_types),
): void {
  if (!parent) return;
  if (parent.repository_id !== binding.repository.repository_id || parent.project_id !== binding.product.project_id)
    throw new TypeError('parent belongs to a different product');
  if (!policy.ok) throw new TypeError('product hierarchy policy is invalid');
  const parentCode = getWorkItemType(parent.canonical_kind)?.code;
  if (!parentCode) throw new TypeError('parent has an unknown catalog kind');
  const allowed =
    policy.value.mode === 'any' || policy.value.allowed_children[parentCode]?.includes(childCode) === true;
  if (!allowed) throw new TypeError(`product hierarchy disallows ${parentCode} -> ${childCode}`);
}
function assertAcyclic(records: readonly LocalWorkItemRecord[], childId: string, parentId: string | null): void {
  let cursor = parentId;
  const visited = new Set<string>([childId]);
  while (cursor) {
    if (visited.has(cursor)) throw new TypeError('parent relation would create a cycle');
    visited.add(cursor);
    cursor = findRecord(records, cursor)?.parent_id ?? null;
  }
}
function assertUniqueKey(
  records: readonly LocalWorkItemRecord[],
  candidate: LocalWorkItemRecord,
  ownId?: string,
): void {
  for (const item of records) {
    if (item.internal_id === ownId) continue;
    if (
      item.key === candidate.key ||
      item.aliases.includes(candidate.key) ||
      candidate.aliases.includes(item.key) ||
      item.aliases.some((alias) => candidate.aliases.includes(alias))
    ) {
      throw new TypeError(`work item key or alias collision: ${candidate.key}`);
    }
  }
}
function makeIndex(records: readonly LocalWorkItemRecord[]): string {
  const rows = [...records]
    .sort((a, b) => a.number - b.number)
    .map((item) => {
      const title = item.title.replace(/[\r\n\u2028\u2029]+/g, ' ').replace(/[\\`*_[\]{}()<>#!|&]/g, '\\$&');
      return `- [${item.key}](items/${item.internal_id}.md) — ${title}`;
    });
  return `# Local work items\n\n${rows.length ? rows.join('\n') : '_No work items._'}\n`;
}
function readOwner(binding: LocalWorkItemBinding, p: ReturnType<typeof paths>): Owner | null {
  const text = read(binding.access, p.owner);
  return text === null
    ? null
    : z
        .strictObject({
          schema: z.literal('LocalWorkItemStore/v1'),
          repository_id: z.string(),
          repository_prefix: z.string(),
          project_id: z.string(),
          project_prefix: z.string(),
          storage_root: z.string(),
        })
        .parse(JSON.parse(text));
}
async function ensureOwner(binding: LocalWorkItemBinding, owner: Owner, p: ReturnType<typeof paths>): Promise<void> {
  const existing = readOwner(binding, p);
  if (existing) {
    if (ownerDigest(existing) !== ownerDigest(owner))
      throw new TypeError('store ownership or prefix drift requires explicit adoption');
    return;
  }
  const hasAny =
    binding.access.fileExists(p.index, 'local work item store') ||
    binding.access.fileExists(p.counter, 'local work item store') ||
    (binding.access.fileExists(p.items, 'local work item store') &&
      binding.access.listFiles(p.items, 'local work item store').length > 0);
  if (hasAny) throw new TypeError('unowned or legacy work item data is preserved; explicit adoption is required');
  await binding.access.ensureDirectoryAsync(p.root, 'local work item store');
  await binding.access.ensureDirectoryAsync(p.items, 'local work item store');
  await binding.access.ensureDirectoryAsync(join(p.root, '.local-work-item-operations'), 'local work item store');
  await writeNew(binding.access, p.owner, `${json(owner)}\n`);
  await writeNew(
    binding.access,
    p.counter,
    `${json({ schema: 'LocalWorkItemCounter/v1', owner_digest: ownerDigest(owner), next_number: 1 })}\n`,
  );
}
async function publishIndex(binding: LocalWorkItemBinding, p: ReturnType<typeof paths>): Promise<void> {
  const next = makeIndex(readItems(binding, p));
  const before = read(binding.access, p.index);
  if (before === null) await writeNew(binding.access, p.index, next);
  else if (before !== next) await replace(binding.access, p.index, before, next);
}
function parseJournal(text: string): Journal {
  const parsed = z
    .strictObject({
      schema: z.literal('LocalWorkItemOperation/v1'),
      operation_id: z.string(),
      operation: z.enum(['create', 'reclassify', 'reparent']),
      request_digest: z.string(),
      request: z.union([createRequestSchema, reclassifyRequestSchema, reparentRequestSchema]),
      owner_digest: z.string(),
      policy_digest: z.string(),
      status: z.enum(['pending', 'applied']),
      phase: z.enum(['reserved', 'publishing', 'published']),
      item_id: z.string().uuid(),
      before_hash: z.string().nullable(),
      after_hash: z.string(),
      record_text: z.string(),
    })
    .parse(JSON.parse(text));
  const request = captureRequest(parsed.operation, parsed.request as LocalWorkItemRequest);
  if (request.operation_id !== parsed.operation_id)
    throw new TypeError('journal operation id differs from its request');
  return { ...parsed, request };
}
async function saveJournal(
  binding: LocalWorkItemBinding,
  path: string,
  currentRaw: string | null,
  next: Journal,
): Promise<string> {
  const text = `${json(next)}\n`;
  if (currentRaw === null) await writeNew(binding.access, path, text);
  else await replace(binding.access, path, currentRaw, text);
  return text;
}
function sameRecordExcept(
  left: LocalWorkItemRecord,
  right: LocalWorkItemRecord,
  excluded: readonly (keyof LocalWorkItemRecord)[],
): boolean {
  const omit = (record: LocalWorkItemRecord): Record<string, unknown> =>
    Object.fromEntries(Object.entries(record).filter(([key]) => !excluded.includes(key as keyof LocalWorkItemRecord)));
  return canonicalJson(omit(left)) === canonicalJson(omit(right));
}
function isJournalTransition(
  binding: LocalWorkItemBinding,
  prior: LocalWorkItemRecord,
  nextJournal: Journal,
  next: LocalWorkItemRecord,
  ownerHash: string,
): boolean {
  if (
    nextJournal.status !== 'applied' ||
    nextJournal.owner_digest !== ownerHash ||
    nextJournal.policy_digest !== policyDigest(binding) ||
    nextJournal.item_id !== prior.internal_id ||
    nextJournal.before_hash !== hash(recordText(prior)) ||
    nextJournal.after_hash !== hash(nextJournal.record_text) ||
    next.internal_id !== prior.internal_id ||
    next.number !== prior.number ||
    next.repository_id !== prior.repository_id ||
    next.project_id !== prior.project_id ||
    next.revision !== prior.revision + 1 ||
    nextJournal.request_digest !== digestRequest(binding, nextJournal.operation, nextJournal.request)
  )
    return false;
  if (nextJournal.operation === 'reclassify') {
    const request = nextJournal.request as ReclassifyLocalWorkItemRequest;
    const type = getWorkItemType(request.type_code);
    const expectedKey = formatWorkItemKey({
      repository_prefix: binding.repository.prefix,
      project_prefix: binding.product.prefix,
      type_code: request.type_code,
      number: prior.number,
    });
    const expectedAliases = [...new Set([...prior.aliases, prior.key])].filter((alias) => alias !== expectedKey);
    return (
      request.internal_id === prior.internal_id &&
      request.expected_revision === prior.revision &&
      type?.kind === next.canonical_kind &&
      next.type_code === request.type_code &&
      next.key === expectedKey &&
      canonicalJson(next.aliases) === canonicalJson(expectedAliases) &&
      sameRecordExcept(prior, next, ['canonical_kind', 'type_code', 'key', 'aliases', 'revision'])
    );
  }
  if (nextJournal.operation === 'reparent') {
    const request = nextJournal.request as ReparentLocalWorkItemRequest;
    return (
      request.internal_id === prior.internal_id &&
      request.expected_revision === prior.revision &&
      request.parent_id === next.parent_id &&
      sameRecordExcept(prior, next, ['parent_id', 'revision'])
    );
  }
  return false;
}
function hasAppliedJournalContinuation(
  binding: LocalWorkItemBinding,
  ownerHash: string,
  p: ReturnType<typeof paths>,
  original: Journal,
  liveText: string,
  liveRecords: readonly LocalWorkItemRecord[],
): boolean {
  if (original.status !== 'applied') return false;
  const live = findRecord(liveRecords, original.item_id);
  if (!live || hash(recordText(live)) !== hash(liveText)) return false;
  const names = binding.access.listFiles(join(p.root, '.local-work-item-operations'), 'local work item history');
  const candidates: Journal[] = [];
  for (const name of names) {
    if (!name.endsWith('.json')) return false;
    const text = read(binding.access, join(p.root, '.local-work-item-operations', name));
    if (!text) continue;
    const entry = parseJournal(text);
    if (entry.owner_digest === ownerHash && entry.item_id === original.item_id) candidates.push(entry);
  }
  let expectedHash = original.after_hash;
  let prior = decodeRecord(original.record_text);
  const visited = new Set<string>([expectedHash]);
  for (let count = 0; count < candidates.length + 1; count++) {
    if (expectedHash === hash(liveText)) return true;
    const successors = candidates.filter(
      (entry) =>
        entry.operation !== 'create' &&
        entry.status === 'applied' &&
        entry.before_hash === expectedHash &&
        entry.after_hash === hash(entry.record_text),
    );
    if (successors.length !== 1) return false;
    const successor = successors[0];
    if (!successor) return false;
    const next = decodeRecord(successor.record_text);
    if (!isJournalTransition(binding, prior, successor, next, ownerHash)) return false;
    expectedHash = successor.after_hash;
    if (visited.has(expectedHash)) return false;
    visited.add(expectedHash);
    prior = next;
  }
  return false;
}
async function recoverJournal(
  binding: LocalWorkItemBinding,
  ownerHash: string,
  p: ReturnType<typeof paths>,
  journalPath: string,
  expectedDigest?: string,
): Promise<LocalWorkItemOutcome> {
  const raw = read(binding.access, journalPath);
  if (raw === null) return { status: 'rejected', reason: 'operation not found' };
  let journalRaw = raw;
  const journal = parseJournal(raw);
  if (journal.owner_digest !== ownerHash)
    return { status: 'needs_reconciliation', operation_id: journal.operation_id, reason: 'operation owner changed' };
  if (journal.policy_digest !== policyDigest(binding))
    return {
      status: 'needs_reconciliation',
      operation_id: journal.operation_id,
      reason: 'hierarchy policy or enabled types changed',
    };
  if (journal.request_digest !== digestRequest(binding, journal.operation, journal.request))
    return {
      status: 'needs_reconciliation',
      operation_id: journal.operation_id,
      reason: 'journal request digest does not match its persisted semantic request',
    };
  if (expectedDigest && journal.request_digest !== expectedDigest)
    return { status: 'rejected', reason: 'operation_id was reused with different input' };
  const path = p.record(journal.item_id);
  if (journal.operation === 'create') {
    const counterRaw = read(binding.access, p.counter);
    if (counterRaw === null)
      return {
        status: 'needs_reconciliation',
        operation_id: journal.operation_id,
        reason: 'product counter is missing',
      };
    try {
      const counter = counterSchema.parse(JSON.parse(counterRaw));
      const item = decodeRecord(journal.record_text);
      if (counter.owner_digest !== ownerHash)
        return { status: 'needs_reconciliation', operation_id: journal.operation_id, reason: 'counter owner changed' };
      if (counter.next_number <= item.number)
        await replace(binding.access, p.counter, counterRaw, `${json({ ...counter, next_number: item.number + 1 })}\n`);
    } catch {
      return {
        status: 'needs_reconciliation',
        operation_id: journal.operation_id,
        reason: 'counter reservation outcome is uncertain',
      };
    }
  }
  const current = read(binding.access, path);
  if (current === null) {
    if (journal.before_hash !== null || journal.status === 'applied')
      return {
        status: 'needs_reconciliation',
        operation_id: journal.operation_id,
        reason: 'updated record is missing',
      };
    if (journal.phase === 'publishing')
      return {
        status: 'needs_reconciliation',
        operation_id: journal.operation_id,
        reason: 'record publication remains unknown and must not be replayed',
      };
    if (journal.phase === 'reserved') {
      const publishing = { ...journal, phase: 'publishing' as const };
      try {
        journalRaw = await saveJournal(binding, journalPath, journalRaw, publishing);
      } catch {
        return {
          status: 'needs_reconciliation',
          operation_id: journal.operation_id,
          reason: 'publication intent transition is uncertain',
        };
      }
      journal.phase = 'publishing';
    }
    try {
      await writeNew(binding.access, path, journal.record_text);
    } catch {
      return {
        status: 'needs_reconciliation',
        operation_id: journal.operation_id,
        reason: 'record publication outcome is uncertain',
      };
    }
  } else if (journal.before_hash !== null && hash(current) === journal.before_hash) {
    if (journal.phase === 'publishing')
      return {
        status: 'needs_reconciliation',
        operation_id: journal.operation_id,
        reason: 'record replacement remains unknown and must not be replayed',
      };
    if (journal.phase === 'reserved') {
      const publishing = { ...journal, phase: 'publishing' as const };
      try {
        journalRaw = await saveJournal(binding, journalPath, journalRaw, publishing);
      } catch {
        return {
          status: 'needs_reconciliation',
          operation_id: journal.operation_id,
          reason: 'replacement intent transition is uncertain',
        };
      }
      journal.phase = 'publishing';
    }
    try {
      await replace(binding.access, path, current, journal.record_text);
    } catch {
      return {
        status: 'needs_reconciliation',
        operation_id: journal.operation_id,
        reason: 'record replacement outcome is uncertain',
      };
    }
  } else if (hash(current) !== journal.after_hash) {
    let records: LocalWorkItemRecord[];
    try {
      records = readItems(binding, p);
    } catch {
      return {
        status: 'needs_reconciliation',
        operation_id: journal.operation_id,
        reason: 'current records or key aliases are not valid for replay inspection',
      };
    }
    if (!hasAppliedJournalContinuation(binding, ownerHash, p, journal, current, records))
      return {
        status: 'needs_reconciliation',
        operation_id: journal.operation_id,
        reason: 'record differs from its postimage without a verified applied-operation chain',
      };
    try {
      await publishIndex(binding, p);
    } catch {
      return {
        status: 'needs_reconciliation',
        operation_id: journal.operation_id,
        reason: 'derived index repair after verified replay is uncertain',
      };
    }
    return { status: 'already_applied', item: decodeRecord(current) };
  }
  try {
    await publishIndex(binding, p);
    if (journal.status !== 'applied')
      journalRaw = await saveJournal(binding, journalPath, journalRaw, {
        ...journal,
        status: 'applied',
        phase: 'published',
      });
  } catch {
    return {
      status: 'needs_reconciliation',
      operation_id: journal.operation_id,
      reason: 'index or journal publication outcome is uncertain',
    };
  }
  const itemText = read(binding.access, path);
  if (itemText === null || hash(itemText) !== journal.after_hash)
    return {
      status: 'needs_reconciliation',
      operation_id: journal.operation_id,
      reason: 'record changed during recovery',
    };
  return { status: journal.status === 'applied' ? 'already_applied' : 'applied', item: decodeRecord(itemText) };
}
async function applyOperation(
  inputBinding: LocalWorkItemBinding,
  operation: Journal['operation'],
  inputRequest: LocalWorkItemRequest,
  build: (
    binding: LocalWorkItemBinding,
    items: LocalWorkItemRecord[],
    number: number,
    request: LocalWorkItemRequest,
    policy: ReturnType<typeof validateProductHierarchy>,
  ) => LocalWorkItemRecord,
): Promise<LocalWorkItemOutcome> {
  let effectUnknown = false;
  let binding: LocalWorkItemBinding;
  let request: LocalWorkItemRequest;
  let validated: ReturnType<typeof validateBinding>;
  let policy: ReturnType<typeof validateProductHierarchy>;
  try {
    binding = captureBinding(inputBinding);
    request = captureRequest(operation, inputRequest);
    validated = validateBinding(binding);
    policy = validateProductHierarchy(binding.product.work_items.hierarchy, binding.product.work_items.enabled_types);
    if (!policy.ok) throw new TypeError('product hierarchy policy is invalid');
    if (operation === 'create' || operation === 'reclassify') {
      const typed = request as CreateLocalWorkItemRequest | ReclassifyLocalWorkItemRequest;
      const type = codeFor(typed.type_code);
      ensureEnabled(binding, type.code);
    }
    if (operation === 'create') {
      const createRequest = request as CreateLocalWorkItemRequest;
      if (!createRequest.title.trim()) throw new TypeError('title must not be empty');
    }
  } catch (error) {
    return { status: 'rejected', reason: error instanceof Error ? error.message : 'invalid binding or operation id' };
  }
  const { owner, ownerHash, p } = validated;
  const requestDigest = digestRequest(binding, operation, request);
  try {
    const preexistingOwner = readOwner(binding, p);
    if (operation !== 'create') {
      if (!preexistingOwner) {
        const foreignState =
          binding.access.fileExists(p.index, 'local work item preflight') ||
          binding.access.fileExists(p.counter, 'local work item preflight') ||
          (binding.access.fileExists(p.items, 'local work item preflight') &&
            binding.access.listFiles(p.items, 'local work item preflight').length > 0);
        return foreignState
          ? { status: 'needs_reconciliation', operation_id: request.operation_id, reason: 'unowned data is present' }
          : { status: 'rejected', reason: 'store is absent; mutation did not initialize it' };
      }
      if (ownerDigest(preexistingOwner) !== ownerHash)
        return {
          status: 'needs_reconciliation',
          operation_id: request.operation_id,
          reason: 'store owner or prefixes drifted',
        };
    }
    const parentWasRequested =
      operation === 'create'
        ? (request as CreateLocalWorkItemRequest).parent_id != null
        : operation === 'reparent'
          ? (request as ReparentLocalWorkItemRequest).parent_id !== null
          : false;
    if (operation === 'create' && !preexistingOwner && parentWasRequested)
      return { status: 'rejected', reason: 'parent does not exist in an absent store' };
    await binding.access.ensureDirectoryAsync(p.root, 'local work item store');
    const outcome = await binding.access.withExclusiveLockAsync<LocalWorkItemOutcome>(
      p.lock,
      'local work item store',
      async () => {
        effectUnknown = true;
        await ensureOwner(binding, owner, p);
        effectUnknown = preexistingOwner === null;
        const journalPath = p.journal(request.operation_id);
        const previousText = read(binding.access, journalPath);
        if (previousText !== null) {
          effectUnknown = true;
          return recoverJournal(binding, ownerHash, p, journalPath, requestDigest);
        }
        for (const name of binding.access.listFiles(
          join(p.root, '.local-work-item-operations'),
          'local work item store',
        )) {
          if (!name.endsWith('.json')) throw new TypeError(`foreign operation entry: ${name}`);
          const pendingText = read(binding.access, join(p.root, '.local-work-item-operations', name));
          if (!pendingText) continue;
          const pending = parseJournal(pendingText);
          if (pending.status === 'pending')
            return {
              status: 'needs_reconciliation',
              operation_id: pending.operation_id,
              reason: 'an earlier operation must be resumed first',
            };
        }
        const items = readItems(binding, p);
        const counterRaw = read(binding.access, p.counter);
        if (counterRaw === null) throw new TypeError('owned store counter is missing');
        const counter = counterSchema.parse(JSON.parse(counterRaw));
        if (counter.owner_digest !== ownerHash) throw new TypeError('counter is bound to another store owner');
        const number = operation === 'create' ? counter.next_number : 0;
        const item = build(binding, items, number, request, policy);
        const afterText = recordText(item);
        const target = p.record(item.internal_id);
        const before = read(binding.access, target);
        if ((operation === 'create') !== (before === null))
          throw new TypeError('record existence does not match mutation kind');
        const journal: Journal = {
          schema: 'LocalWorkItemOperation/v1',
          operation_id: request.operation_id,
          operation,
          request_digest: requestDigest,
          request,
          policy_digest: policyDigest(binding),
          owner_digest: ownerHash,
          status: 'pending',
          phase: 'reserved',
          item_id: item.internal_id,
          before_hash: before === null ? null : hash(before),
          after_hash: hash(afterText),
          record_text: afterText,
        };
        effectUnknown = true;
        await writeNew(binding.access, journalPath, `${json(journal)}\n`);
        if (operation === 'create')
          await replace(binding.access, p.counter, counterRaw, `${json({ ...counter, next_number: number + 1 })}\n`);
        const result = await recoverJournal(binding, ownerHash, p, journalPath, requestDigest);
        return result;
      },
    );
    effectUnknown = false;
    return outcome;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'operation failed';
    const lockWasNotAcquired =
      error instanceof SafeRepositoryLockContentionError ||
      (error instanceof Error && 'code' in error && error.code === 'file_lock_timeout');
    if (!effectUnknown && lockWasNotAcquired) return { status: 'busy', operation_id: request.operation_id };
    if (effectUnknown) return { status: 'needs_reconciliation', operation_id: request.operation_id, reason: msg };
    return { status: 'rejected', reason: msg };
  }
}

export function createLocalWorkItem(
  binding: LocalWorkItemBinding,
  request: CreateLocalWorkItemRequest,
): Promise<LocalWorkItemOutcome> {
  return applyOperation(binding, 'create', request, (capturedBinding, items, number, captured, policy) => {
    const requested = captured as CreateLocalWorkItemRequest;
    const type = codeFor(requested.type_code);
    if (!Number.isSafeInteger(number) || number <= 0 || number === Number.MAX_SAFE_INTEGER)
      throw new RangeError('product work item number exhausted');
    if (items.some((item) => item.number >= number))
      throw new TypeError('product work item counter does not exceed allocated numbers');
    const id = randomUUID();
    const parentId = requested.parent_id ?? null;
    const parent = parentId ? (findRecord(items, parentId) ?? null) : null;
    if (parentId && !parent) throw new TypeError('parent does not exist in this product');
    assertEdge(capturedBinding, parent, type.code, policy);
    const key = formatWorkItemKey({
      repository_prefix: capturedBinding.repository.prefix,
      project_prefix: capturedBinding.product.prefix,
      type_code: type.code,
      number,
    });
    const item: LocalWorkItemRecord = {
      type: 'Work Item',
      schema: 'LocalWorkItem/v1',
      version: 1,
      internal_id: id,
      repository_id: capturedBinding.repository.repository_id,
      project_id: capturedBinding.product.project_id,
      number,
      canonical_kind: type.kind,
      type_code: type.code,
      key,
      aliases: [],
      parent_id: parentId,
      revision: 1,
      title: requested.title.trim(),
      provider_refs: { ...(requested.provider_refs ?? {}) },
      description: requested.description ?? '',
    };
    assertUniqueKey(items, item);
    return item;
  });
}
export function reclassifyLocalWorkItem(
  binding: LocalWorkItemBinding,
  request: ReclassifyLocalWorkItemRequest,
): Promise<LocalWorkItemOutcome> {
  return applyOperation(binding, 'reclassify', request, (capturedBinding, items, _number, captured, policy) => {
    const requested = captured as ReclassifyLocalWorkItemRequest;
    const prior = findRecord(items, requested.internal_id);
    if (!prior) throw new TypeError('work item does not exist');
    if (prior.revision !== requested.expected_revision) throw new TypeError('stale work item revision');
    const type = codeFor(requested.type_code);
    const parent = prior.parent_id ? findRecord(items, prior.parent_id) : null;
    if (prior.parent_id && !parent) throw new TypeError('existing parent relation is missing');
    assertEdge(capturedBinding, parent ?? null, type.code, policy);
    for (const child of items.filter((item) => item.parent_id === prior.internal_id))
      assertEdge(
        capturedBinding,
        { ...prior, canonical_kind: type.kind, type_code: type.code },
        getWorkItemType(child.canonical_kind)!.code,
        policy,
      );
    const key = formatWorkItemKey({
      repository_prefix: capturedBinding.repository.prefix,
      project_prefix: capturedBinding.product.prefix,
      type_code: type.code,
      number: prior.number,
    });
    const aliases = [...new Set([...prior.aliases, prior.key])].filter((alias) => alias !== key);
    const next: LocalWorkItemRecord = {
      ...prior,
      canonical_kind: type.kind,
      type_code: type.code,
      key,
      aliases,
      revision: prior.revision + 1,
    };
    assertUniqueKey(items, next, prior.internal_id);
    return next;
  });
}
export function reparentLocalWorkItem(
  binding: LocalWorkItemBinding,
  request: ReparentLocalWorkItemRequest,
): Promise<LocalWorkItemOutcome> {
  return applyOperation(binding, 'reparent', request, (capturedBinding, items, _number, captured, policy) => {
    const requested = captured as ReparentLocalWorkItemRequest;
    const prior = findRecord(items, requested.internal_id);
    if (!prior) throw new TypeError('work item does not exist');
    if (prior.revision !== requested.expected_revision) throw new TypeError('stale work item revision');
    const parent = requested.parent_id ? (findRecord(items, requested.parent_id) ?? null) : null;
    if (requested.parent_id && !parent) throw new TypeError('parent does not exist in this product');
    assertEdge(capturedBinding, parent, prior.type_code, policy);
    assertAcyclic(items, prior.internal_id, requested.parent_id);
    return { ...prior, parent_id: requested.parent_id, revision: prior.revision + 1 };
  });
}

export async function resolveLocalWorkItem(
  binding: LocalWorkItemBinding,
  reference: LocalWorkItemReference,
): Promise<LocalWorkItemRecord | null> {
  const { ownerHash, p } = validateBinding(binding);
  const owner = readOwner(binding, p);
  if (!owner) {
    const foreignState =
      binding.access.fileExists(p.items, 'local work item lookup') ||
      binding.access.fileExists(p.index, 'local work item lookup') ||
      binding.access.fileExists(p.counter, 'local work item lookup');
    if (foreignState) throw new TypeError('unowned work item data is present');
    return null;
  }
  if (ownerDigest(owner) !== ownerHash) throw new TypeError('store owner or prefixes drifted');
  if (!binding.access.fileExists(p.items, 'local work item lookup'))
    throw new TypeError('owned store item directory is missing');
  const items = readItems(binding, p);
  if ('uuid' in reference) return findRecord(items, reference.uuid) ?? null;
  const value = 'key' in reference ? reference.key : reference.alias;
  return items.find((item) => item.key === value || item.aliases.includes(value)) ?? null;
}
export async function inspectLocalWorkItemStore(binding: LocalWorkItemBinding): Promise<LocalWorkItemInspection> {
  try {
    const { ownerHash, p } = validateBinding(binding);
    if (!binding.access.fileExists(p.owner, 'local work item inspection')) {
      const foreignState =
        binding.access.fileExists(p.index, 'local work item inspection') ||
        binding.access.fileExists(p.counter, 'local work item inspection') ||
        (binding.access.fileExists(p.items, 'local work item inspection') &&
          binding.access.listFiles(p.items, 'local work item inspection').length > 0);
      return foreignState
        ? { status: 'needs_reconciliation', reason: 'unowned work item data is present' }
        : { status: 'absent' };
    }
    const stored = readOwner(binding, p);
    if (!stored || ownerDigest(stored) !== ownerHash)
      return { status: 'needs_reconciliation', reason: 'store owner or prefixes drifted' };
    if (
      !binding.access.fileExists(p.counter, 'local work item inspection') ||
      !binding.access.fileExists(p.items, 'local work item inspection') ||
      !binding.access.fileExists(p.index, 'local work item inspection')
    ) {
      return {
        status: 'needs_reconciliation',
        reason: 'owned store is missing its counter, items directory or derived index',
      };
    }
    const counterText = read(binding.access, p.counter);
    const counter = counterSchema.parse(JSON.parse(counterText ?? 'null'));
    if (counter.owner_digest !== ownerHash) return { status: 'needs_reconciliation', reason: 'counter owner drifted' };
    const records = readItems(binding, p);
    if (records.some((record) => record.number >= counter.next_number))
      return { status: 'needs_reconciliation', reason: 'counter does not exceed allocated numbers' };
    const pending: string[] = [];
    for (const name of binding.access.listFiles(
      join(p.root, '.local-work-item-operations'),
      'local work item inspection',
    )) {
      if (!name.endsWith('.json'))
        return { status: 'needs_reconciliation', reason: `foreign operation entry: ${name}` };
      const raw = read(binding.access, join(p.root, '.local-work-item-operations', name));
      if (!raw) continue;
      const op = parseJournal(raw);
      if (op.owner_digest !== ownerHash)
        return { status: 'needs_reconciliation', operation_id: op.operation_id, reason: 'operation owner drifted' };
      if (op.status === 'pending') pending.push(op.operation_id);
    }
    const indexText = read(binding.access, p.index);
    if (indexText !== makeIndex(records))
      return {
        status: 'needs_reconciliation',
        ...(pending[0] ? { operation_id: pending[0] } : {}),
        reason: 'derived index does not match current records',
      };
    return { status: 'ready', items: records, pending_operations: pending };
  } catch (error) {
    return {
      status: 'needs_reconciliation',
      reason: error instanceof Error ? error.message : 'store inspection failed',
    };
  }
}
export async function resumeLocalWorkItemOperation(
  binding: LocalWorkItemBinding,
  operation_id: string,
): Promise<LocalWorkItemOutcome> {
  try {
    const { ownerHash, p } = validateBinding(binding);
    operationIdSchema.parse(operation_id);
    return await binding.access.withExclusiveLockAsync(p.lock, 'local work item recovery', async () =>
      recoverJournal(binding, ownerHash, p, p.journal(operation_id)),
    );
  } catch (error) {
    if (error instanceof SafeRepositoryLockContentionError) return { status: 'busy', operation_id };
    return {
      status: 'needs_reconciliation',
      operation_id,
      reason: error instanceof Error ? error.message : 'recovery failed',
    };
  }
}
