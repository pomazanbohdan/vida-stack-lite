import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { appendFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, resolve } from 'node:path';

type ArtifactType = 'markdown' | 'json' | 'jsonl' | 'text';

export type ArtifactEventInput = {
  kind: 'artifact' | 'update';
  artifact_id: string;
  artifact_type: ArtifactType;
  product: string;
  work_scope: string;
  locator: string;
  revision: number;
  digest: string;
  links: string[];
  source: { origin: 'observed' | 'reported'; actor: string; reference: string };
};

export type SemanticJudgment = { verdict: 'pass' | 'fail'; actor: string; reference: string; basis: string };

export type AppendArtifactResult = {
  operation: 'append';
  outcome: 'appended' | 'replayed';
  event_id: string;
  artifact_id: string;
  revision: number;
};

export type ArtifactIndexRow = {
  artifact_id: string;
  work_scope: string;
  artifact_type: ArtifactType;
  revision: number;
  locator: string;
  digest: string;
  links: string[];
  events: number;
};

export type ArtifactReceipt = {
  artifact_id: string;
  revision: number;
  presence: { exists: boolean; regular_file: boolean; symlink: boolean };
  format: { artifact_type: ArtifactType; valid: boolean };
  digest: { declared: string; actual: string | null; match: boolean };
  mechanical_ok: boolean;
  semantic: SemanticJudgment | null;
  complete: boolean;
};

type StoredArtifactEvent = { event_id: string; event: ArtifactEventInput };

const ARTIFACT_TYPES: readonly ArtifactType[] = ['markdown', 'json', 'jsonl', 'text'];
const EVENT_KEYS = ['artifact_id', 'artifact_type', 'digest', 'kind', 'links', 'locator', 'product', 'revision', 'source', 'work_scope'];
const SOURCE_KEYS = ['actor', 'origin', 'reference'];
const DIGEST = /^[0-9a-f]{64}$/;

function fail(code: string): never {
  throw new Error(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function exactKeys(record: Record<string, unknown>, expected: string[]): boolean {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function parseEvent(value: unknown): ArtifactEventInput {
  if (!isRecord(value) || !exactKeys(value, EVENT_KEYS)) fail('ARTIFACT_INVALID');
  const source = value['source'];
  if (!isRecord(source) || !exactKeys(source, SOURCE_KEYS)) fail('ARTIFACT_INVALID');
  if (!text(source['actor']) || !text(source['reference'])) fail('ARTIFACT_INVALID');
  if (source['origin'] !== 'observed' && source['origin'] !== 'reported') fail('ARTIFACT_INVALID');
  if (!text(value['artifact_id']) || !text(value['product']) || !text(value['work_scope']) || !text(value['locator'])) fail('ARTIFACT_INVALID');
  if (!ARTIFACT_TYPES.includes(value['artifact_type'] as ArtifactType)) fail('ARTIFACT_INVALID');
  if (typeof value['revision'] !== 'number' || !Number.isInteger(value['revision']) || value['revision'] < 1) fail('ARTIFACT_INVALID');
  if (typeof value['digest'] !== 'string' || !DIGEST.test(value['digest'])) fail('ARTIFACT_INVALID');
  if (!Array.isArray(value['links']) || !value['links'].every(text)) fail('ARTIFACT_INVALID');
  if (value['kind'] !== 'artifact' && value['kind'] !== 'update') fail('ARTIFACT_INVALID');
  return value as ArtifactEventInput;
}

async function checkStorePath(storePath: string): Promise<void> {
  if (!isAbsolute(storePath) || basename(storePath) !== 'artifacts.jsonl') fail('ARTIFACT_PATH_INVALID');
  if (storePath.split(/[\\/]/).includes('.') || storePath.split(/[\\/]/).includes('..')) fail('ARTIFACT_PATH_INVALID');
  let parent;
  try {
    parent = await lstat(dirname(storePath));
  } catch {
    fail('ARTIFACT_PATH_INVALID');
  }
  if (!parent.isDirectory()) fail('ARTIFACT_PATH_INVALID');
}

async function readStore(storePath: string, allowMissing: boolean): Promise<StoredArtifactEvent[]> {
  let raw: string;
  try {
    raw = await readFile(storePath, 'utf8');
  } catch {
    if (allowMissing) return [];
    fail('ARTIFACT_STORE_MISSING');
  }
  const events: StoredArtifactEvent[] = [];
  for (const line of raw.split('\n')) {
    if (line.trim() === '') continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line) as unknown;
    } catch {
      fail('ARTIFACT_STORE_INVALID');
    }
    if (!isRecord(parsed) || !exactKeys(parsed, ['event', 'event_id']) || !text(parsed['event_id'])) fail('ARTIFACT_STORE_INVALID');
    events.push({ event_id: parsed['event_id'], event: parseEvent(parsed['event']) });
  }
  return events;
}

export async function appendArtifactEvent(storePath: string, input: unknown): Promise<AppendArtifactResult> {
  await checkStorePath(storePath);
  const event = parseEvent(input);
  const events = await readStore(storePath, true);
  const eventId = createHash('sha256').update(canonical(event), 'utf8').digest('hex');
  if (events.some((item) => item.event_id === eventId)) {
    return { operation: 'append', outcome: 'replayed', event_id: eventId, artifact_id: event.artifact_id, revision: event.revision };
  }
  const sameId = events.filter((item) => item.event.artifact_id === event.artifact_id);
  if (sameId.some((item) => item.event.revision === event.revision)) fail('ARTIFACT_REVISION_CONFLICT');
  if (event.kind === 'artifact' && sameId.length > 0) fail('ARTIFACT_REVISION_CONFLICT');
  if (event.kind === 'update' && sameId.length === 0) fail('ARTIFACT_NOT_FOUND');
  await appendFile(storePath, `${JSON.stringify({ event_id: eventId, event })}\n`, 'utf8');
  return { operation: 'append', outcome: 'appended', event_id: eventId, artifact_id: event.artifact_id, revision: event.revision };
}

export async function indexArtifacts(storePath: string): Promise<{ artifacts: ArtifactIndexRow[] }> {
  await checkStorePath(storePath);
  const events = await readStore(storePath, false);
  const byId = new Map<string, { event: ArtifactEventInput; events: number }>();
  for (const item of events) {
    const current = byId.get(item.event.artifact_id);
    const events = (current?.events ?? 0) + 1;
    if (current === undefined || item.event.revision > current.event.revision) byId.set(item.event.artifact_id, { event: item.event, events });
    else byId.set(item.event.artifact_id, { event: current.event, events });
  }
  const artifacts = [...byId.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([artifact_id, { event, events }]): ArtifactIndexRow => ({
      artifact_id,
      work_scope: event.work_scope,
      artifact_type: event.artifact_type,
      revision: event.revision,
      locator: event.locator,
      digest: event.digest,
      links: event.links,
      events,
    }));
  return { artifacts };
}

export async function verifyArtifact(storePath: string, artifactId: string, options: { root: string; semantic?: SemanticJudgment }): Promise<ArtifactReceipt> {
  await checkStorePath(storePath);
  const { root } = options;
  let rootStat;
  try {
    rootStat = await lstat(root);
  } catch {
    fail('ARTIFACT_ROOT_INVALID');
  }
  if (!rootStat.isDirectory()) fail('ARTIFACT_ROOT_INVALID');
  const events = await readStore(storePath, false);
  const matching = events.filter((item) => item.event.artifact_id === artifactId);
  if (matching.length === 0) fail('ARTIFACT_NOT_FOUND');
  const latest = matching.reduce((left, right) => (right.event.revision > left.event.revision ? right : left));
  const event = latest.event;
  const target = resolve(root, event.locator);
  let presence = { exists: false, regular_file: false, symlink: false };
  let actual: string | null = null;
  let valid = false;
  try {
    const targetStat = await lstat(target);
    presence = { exists: true, regular_file: targetStat.isFile(), symlink: targetStat.isSymbolicLink() };
    if (presence.regular_file) {
      const bytes = await readFile(target);
      actual = createHash('sha256').update(bytes).digest('hex');
      valid = checkFormat(event.artifact_type, bytes);
    }
  } catch {
    presence = { exists: false, regular_file: false, symlink: false };
  }
  if (options.semantic !== undefined && (!text(options.semantic.actor) || !text(options.semantic.reference) || !text(options.semantic.basis) || (options.semantic.verdict !== 'pass' && options.semantic.verdict !== 'fail'))) {
    fail('ARTIFACT_INVALID');
  }
  const semantic = options.semantic ?? null;
  const digestMatch = actual !== null && actual === event.digest;
  const mechanicalOk = presence.exists && presence.regular_file && !presence.symlink && valid && digestMatch;
  return {
    artifact_id: event.artifact_id,
    revision: event.revision,
    presence,
    format: { artifact_type: event.artifact_type, valid },
    digest: { declared: event.digest, actual, match: digestMatch },
    mechanical_ok: mechanicalOk,
    semantic,
    complete: mechanicalOk && semantic?.verdict === 'pass',
  };
}

function checkFormat(type: ArtifactType, bytes: Buffer): boolean {
  const raw = bytes.toString('utf8');
  if (raw.trim() === '') return false;
  if (type === 'text') return true;
  if (type === 'json') {
    try {
      JSON.parse(raw) as unknown;
      return true;
    } catch {
      return false;
    }
  }
  if (type === 'jsonl') return raw.split('\n').filter((line) => line.trim() !== '').every((line) => {
    try {
      JSON.parse(line) as unknown;
      return true;
    } catch {
      return false;
    }
  });
  if (!raw.startsWith('---')) return true;
  return raw.split('\n').slice(1).some((line) => line.trimEnd() === '---');
}
