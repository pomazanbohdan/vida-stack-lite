import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { lstat, open, readFile, stat, unlink } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { basename, dirname, isAbsolute, resolve } from 'node:path';

type JsonPrimitive = null | boolean | number | string;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type SourceIdentity = { origin: 'observed' | 'reported'; actor: string; reference: string };
type ObservationEvent = {
  kind: 'observation';
  finding_id: string;
  problem: string;
  evidence: string[];
  source: SourceIdentity;
  product: string;
  work_scope: string;
  blocking_impact: string;
  context: { [key: string]: JsonValue };
  provenance: string[];
};
type MergeEvent = {
  kind: 'merge';
  canonical_finding_id: string;
  duplicate_finding_id: string;
  source: SourceIdentity;
  evidence: string[];
  context: { [key: string]: JsonValue };
  provenance: string[];
};
type FindingEvent = ObservationEvent | MergeEvent;
type StoredEvent = {
  event_id: string;
  candidate_fingerprint: string | null;
  event: FindingEvent;
};
type AppendResult = {
  operation: 'append';
  outcome: 'appended' | 'replayed';
  event_id: string;
  candidate_fingerprint: string | null;
};
type CandidateReason = 'event_id' | 'finding_id' | 'candidate_fingerprint' | 'context' | 'provenance';
type CandidateMatch = {
  event_id: string;
  candidate_fingerprint: string;
  event: ObservationEvent;
  reasons: CandidateReason[];
};
type CandidateQueryResult = {
  event_id: string;
  finding_id: string;
  candidate_fingerprint: string;
  candidates: CandidateMatch[];
};
type AppendTarget = { handle: FileHandle; created: boolean; originalSize: number };

function fail(code: string): never {
  throw new Error(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isJsonValue(value: unknown, ancestors = new Set<object>()): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'object') return false;
  if (ancestors.has(value)) return false;
  const prototype = Object.getPrototypeOf(value) as object | null;
  if (prototype !== Object.prototype && prototype !== null && !Array.isArray(value)) return false;
  ancestors.add(value);
  let valid = true;
  if (Array.isArray(value)) {
    const keys = Reflect.ownKeys(value);
    valid = keys.length === value.length + 1;
    for (let index = 0; valid && index < value.length; index += 1) {
      valid = Object.prototype.hasOwnProperty.call(value, index) && isJsonValue(value[index], ancestors);
    }
  } else {
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') {
        valid = false;
        break;
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor) || !isJsonValue(descriptor.value, ancestors)) {
        valid = false;
        break;
      }
    }
  }
  ancestors.delete(value);
  return valid;
}

function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value !== 'object') {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) return fail('FINDING_INVALID');
    return serialized;
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key] as JsonValue)}`).join(',')}}`;
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function hasExactKeys(record: Record<string, unknown>, expected: string[]): boolean {
  const actual = Object.keys(record).sort();
  const required = [...expected].sort();
  return actual.length === required.length && actual.every((key, index) => key === required[index]);
}

function nonemptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function stringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(nonemptyText);
}

function validSource(value: unknown): value is SourceIdentity {
  if (!isRecord(value) || !hasExactKeys(value, ['origin', 'actor', 'reference'])) return false;
  return (value['origin'] === 'observed' || value['origin'] === 'reported')
    && nonemptyText(value['actor'])
    && nonemptyText(value['reference']);
}

function validContext(value: unknown): value is { [key: string]: JsonValue } {
  return isRecord(value) && isJsonValue(value);
}

function validateEvent(value: unknown): FindingEvent {
  if (!isRecord(value) || !isJsonValue(value)) return fail('FINDING_INVALID');
  if (value['kind'] === 'observation'
    && hasExactKeys(value, ['kind', 'finding_id', 'problem', 'evidence', 'source', 'product', 'work_scope', 'blocking_impact', 'context', 'provenance'])
    && nonemptyText(value['finding_id'])
    && nonemptyText(value['problem'])
    && stringList(value['evidence'])
    && validSource(value['source'])
    && nonemptyText(value['product'])
    && nonemptyText(value['work_scope'])
    && nonemptyText(value['blocking_impact'])
    && validContext(value['context'])
    && stringList(value['provenance'])) {
    return value as ObservationEvent;
  }
  if (value['kind'] === 'merge'
    && hasExactKeys(value, ['kind', 'canonical_finding_id', 'duplicate_finding_id', 'source', 'evidence', 'context', 'provenance'])
    && nonemptyText(value['canonical_finding_id'])
    && nonemptyText(value['duplicate_finding_id'])
    && value['canonical_finding_id'] !== value['duplicate_finding_id']
    && validSource(value['source'])
    && stringList(value['evidence'])
    && validContext(value['context'])
    && stringList(value['provenance'])) {
    return value as MergeEvent;
  }
  return fail('FINDING_INVALID');
}

function candidateFingerprint(event: FindingEvent): string | null {
  if (event.kind === 'merge') return null;
  const candidate = {
    problem: event.problem,
    source: event.source,
    product: event.product,
    work_scope: event.work_scope,
    blocking_impact: event.blocking_impact,
    provenance: event.provenance,
  };
  return sha256(canonicalJson(candidate));
}

function eventId(event: FindingEvent): string {
  return sha256(canonicalJson(event as JsonValue));
}

function errnoIs(error: unknown, code: string): boolean {
  return isRecord(error) && error['code'] === code;
}

async function validateStorePath(storePath: string): Promise<string> {
  if (typeof storePath !== 'string'
    || !isAbsolute(storePath)
    || basename(storePath) !== 'findings.jsonl'
    || storePath.split(/[\\/]+/).some((part) => part === '..' || part === '.')) {
    return fail('FINDING_STORE_PATH_INVALID');
  }
  const safePath = resolve(storePath);
  try {
    const parent = await stat(dirname(safePath));
    if (!parent.isDirectory()) return fail('FINDING_STORE_PATH_INVALID');
    const existing = await lstat(safePath);
    if (!existing.isFile() || existing.isSymbolicLink()) return fail('FINDING_STORE_PATH_INVALID');
  } catch (error) {
    if (errnoIs(error, 'ENOENT')) {
      try {
        const parent = await stat(dirname(safePath));
        if (parent.isDirectory()) return safePath;
      } catch {
        return fail('FINDING_STORE_PATH_INVALID');
      }
    }
    return fail('FINDING_STORE_PATH_INVALID');
  }
  return safePath;
}

function storedEvent(value: unknown): StoredEvent {
  if (!isRecord(value)
    || !hasExactKeys(value, ['event_id', 'candidate_fingerprint', 'event'])
    || typeof value['event_id'] !== 'string') return fail('FINDING_STORE_INVALID');
  const event = validateEvent(value['event']);
  const id = eventId(event);
  const fingerprint = candidateFingerprint(event);
  if (value['event_id'] !== id || value['candidate_fingerprint'] !== fingerprint) {
    return fail('FINDING_STORE_INVALID');
  }
  return { event_id: id, candidate_fingerprint: fingerprint, event };
}

async function readStore(storePath: string): Promise<StoredEvent[]> {
  let bytes: string;
  try {
    bytes = await readFile(storePath, 'utf8');
  } catch (error) {
    if (errnoIs(error, 'ENOENT')) return [];
    return fail('FINDING_STORE_INVALID');
  }
  if (bytes.length === 0) return [];
  if (!bytes.endsWith('\n')) return fail('FINDING_STORE_INVALID');
  const rows: StoredEvent[] = [];
  const eventIds = new Set<string>();
  const observationIds = new Set<string>();
  for (const line of bytes.slice(0, -1).split('\n')) {
    if (line.length === 0) return fail('FINDING_STORE_INVALID');
    let value: unknown;
    try {
      value = JSON.parse(line) as unknown;
    } catch {
      return fail('FINDING_STORE_INVALID');
    }
    const row = storedEvent(value);
    if (eventIds.has(row.event_id)) return fail('FINDING_STORE_INVALID');
    eventIds.add(row.event_id);
    if (row.event.kind === 'observation') {
      if (observationIds.has(row.event.finding_id)) return fail('FINDING_STORE_INVALID');
      observationIds.add(row.event.finding_id);
    }
    if (row.event.kind === 'merge'
      && (!observationIds.has(row.event.canonical_finding_id) || !observationIds.has(row.event.duplicate_finding_id))) {
      return fail('FINDING_STORE_INVALID');
    }
    rows.push(row);
  }
  return rows;
}

export async function appendFindingEvent(storePath: string, input: unknown): Promise<AppendResult> {
  const validated = validateEvent(input);
  const event = validateEvent(JSON.parse(JSON.stringify(validated)) as unknown);
  const path = await validateStorePath(storePath);
  const rows = await readStore(path);
  const id = eventId(event);
  const fingerprint = candidateFingerprint(event);
  if (rows.some((row) => row.event_id === id)) {
    return { operation: 'append', outcome: 'replayed', event_id: id, candidate_fingerprint: fingerprint };
  }

  if (event.kind === 'observation') {
    const prior = rows.find((row) => row.event.kind === 'observation' && row.event.finding_id === event.finding_id);
    if (prior !== undefined) return fail('FINDING_ID_CONFLICT');
  } else {
    const observed = new Set(rows.flatMap((row) => row.event.kind === 'observation' ? [row.event.finding_id] : []));
    if (!observed.has(event.canonical_finding_id) || !observed.has(event.duplicate_finding_id)) {
      return fail('FINDING_MERGE_TARGET_MISSING');
    }
  }

  const row: StoredEvent = { event_id: id, candidate_fingerprint: candidateFingerprint(event), event };
  const data = Buffer.from(`${JSON.stringify(row)}\n`, 'utf8');
  const target = await openAppendTarget(path);
  try {
    let offset = 0;
    while (offset < data.length) {
      const result = await target.handle.write(data, offset, data.length - offset, target.originalSize + offset);
      if (result.bytesWritten <= 0) return fail('FINDING_OPERATION_FAILED');
      offset += result.bytesWritten;
    }
    await target.handle.close();
  } catch {
    if (!await rollbackAppend(path, target)) return fail('FINDING_STORE_RECOVERY_REQUIRED');
    return fail('FINDING_OPERATION_FAILED');
  }
  return { operation: 'append', outcome: 'appended', event_id: id, candidate_fingerprint: fingerprint };
}

async function openAppendTarget(path: string): Promise<AppendTarget> {
  let handle: FileHandle;
  let created = false;
  try {
    handle = await open(path, 'r+');
  } catch (error) {
    if (!errnoIs(error, 'ENOENT')) return fail('FINDING_OPERATION_FAILED');
    try {
      handle = await open(path, 'wx');
      created = true;
    } catch {
      return fail('FINDING_OPERATION_FAILED');
    }
  }
  if (created) return { handle, created, originalSize: 0 };

  const metadata = await handle.stat().catch(() => undefined);
  if (metadata === undefined || !metadata.isFile()) {
    await handle.close().catch(() => undefined);
    return fail('FINDING_OPERATION_FAILED');
  }
  return { handle, created, originalSize: metadata.size };
}

async function rollbackAppend(path: string, target: AppendTarget): Promise<boolean> {
  let recovered = true;
  let createdIdentity: { dev: number; ino: number } | undefined;
  if (target.created) {
    const metadata = await target.handle.stat().catch(() => undefined);
    if (metadata === undefined) recovered = false;
    else createdIdentity = { dev: metadata.dev, ino: metadata.ino };
  }
  try {
    await target.handle.truncate(target.originalSize);
  } catch {
    recovered = false;
  }
  try {
    await target.handle.close();
  } catch {
    recovered = false;
  }
  if (!target.created) return recovered;
  if (!recovered || createdIdentity === undefined) return false;

  try {
    const pathMetadata = await lstat(path);
    if (!pathMetadata.isFile() || pathMetadata.isSymbolicLink()
      || pathMetadata.dev !== createdIdentity.dev || pathMetadata.ino !== createdIdentity.ino) return false;
    await unlink(path);
  } catch {
    return false;
  }
  return true;
}

export async function findFindingCandidates(storePath: string, input: unknown): Promise<CandidateQueryResult> {
  const validated = validateEvent(input);
  if (validated.kind !== 'observation') return fail('FINDING_CANDIDATE_QUERY_INVALID');
  const event = validateEvent(JSON.parse(JSON.stringify(validated)) as unknown);
  if (event.kind !== 'observation') return fail('FINDING_CANDIDATE_QUERY_INVALID');
  const path = await validateStorePath(storePath);
  const rows = await readStore(path);
  const id = eventId(event);
  const fingerprint = candidateFingerprint(event);
  if (fingerprint === null) return fail('FINDING_CANDIDATE_QUERY_INVALID');
  const context = canonicalJson(event.context);
  const provenance = canonicalJson(event.provenance);
  const candidates: CandidateMatch[] = [];

  for (const row of rows) {
    if (row.event.kind !== 'observation') continue;
    const reasons: CandidateReason[] = [];
    if (row.event_id === id) reasons.push('event_id');
    if (row.event.finding_id === event.finding_id) reasons.push('finding_id');
    if (row.candidate_fingerprint === fingerprint) reasons.push('candidate_fingerprint');
    if (canonicalJson(row.event.context) === context) reasons.push('context');
    if (canonicalJson(row.event.provenance) === provenance) reasons.push('provenance');
    if (reasons.length > 0 && row.candidate_fingerprint !== null) {
      candidates.push({
        event_id: row.event_id,
        candidate_fingerprint: row.candidate_fingerprint,
        event: row.event,
        reasons,
      });
    }
  }

  return { event_id: id, finding_id: event.finding_id, candidate_fingerprint: fingerprint, candidates };
}
