import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadForwardPayloadRuntime } from './forward-payload-runtime.ts';

type DocumentationBaseline = {
  readonly work_id: string;
  readonly source_revision: string;
  readonly policy_path: string;
  readonly policy_digest: string;
  readonly created_at: string;
  readonly documents: readonly {
    readonly path: string;
    readonly sha256: string;
    readonly document_id?: string;
  }[];
};

type DocumentationScope = {
  readonly work_id: string;
  readonly source_revision: string;
  readonly allowed_paths: readonly string[];
  readonly owner: string;
  readonly attribution: { readonly pointer: string };
};

type DocumentationEvent = {
  readonly schema: 'DocumentationChangeEvent/v1';
  readonly event_id: string;
  readonly logical_edit_id: string;
  readonly work_id: string;
  readonly source_revision: string;
  readonly operation: 'finalize';
  readonly document_id: string;
  readonly path_before: string;
  readonly path_after: string;
  readonly before_sha256: string;
  readonly after_sha256: string;
  readonly actor: string;
  readonly pointer: string;
};

type DocumentationPolicy = { readonly changelog_path: string };
type JsonRecord = Record<string, unknown>;

type AppendRuntimeDocumentationChangeOptions = {
  readonly root: string;
  readonly workId: string;
  readonly sourceRevision: string;
  readonly baseline: DocumentationBaseline;
  readonly scope: DocumentationScope;
  readonly documentPath: string;
  readonly payloadRoot: string;
  readonly successorManifest: string;
  readonly expectedChangelogSha256?: string;
  readonly allowCreate?: boolean;
};

type AppendRuntimeDocumentationChangeResult = {
  readonly status: 'already_applied' | 'applied';
  readonly event_id: string;
  readonly event_timestamp: unknown;
  readonly event_suffix_sha256: string;
};

const sha = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const parseJson = (line: string): unknown => JSON.parse(line);
const dateParse = (value: unknown): number => Date.parse(String(value));

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function changelogEventId(value: unknown): unknown {
  if (value === null) throw new TypeError("Cannot read properties of null (reading 'event_id')");
  return isRecord(value) ? value.event_id : undefined;
}

function parsePolicy(value: unknown): DocumentationPolicy {
  if (!isRecord(value) || typeof value.changelog_path !== 'string') throw Error('documentation event policy invalid');
  return { changelog_path: value.changelog_path };
}

function matchesBody(value: unknown, body: DocumentationEvent): value is JsonRecord {
  if (!isRecord(value)) return false;
  return (
    Object.keys(value).length === Object.keys(body).length + 1 &&
    Object.entries(body).every(([key, field]) => value[key] === field) &&
    Number.isFinite(dateParse(value.timestamp))
  );
}

/** Append lineage only for the genuine new work baseline and observed installed target. */
export async function appendRuntimeDocumentationChange({
  root,
  workId,
  sourceRevision,
  baseline,
  scope,
  documentPath,
  payloadRoot,
  successorManifest,
  expectedChangelogSha256,
  allowCreate = false,
}: AppendRuntimeDocumentationChangeOptions): Promise<AppendRuntimeDocumentationChangeResult> {
  const { requireSafeRepositoryAccess } = await loadForwardPayloadRuntime(root, payloadRoot, successorManifest);
  const access = requireSafeRepositoryAccess(root);
  if (
    baseline.work_id !== workId ||
    baseline.source_revision !== sourceRevision ||
    scope.work_id !== workId ||
    scope.source_revision !== sourceRevision ||
    !scope.allowed_paths.includes(documentPath)
  )
    throw Error('documentation event work/scope binding differs');
  const before = baseline.documents.find((entry) => entry.path === documentPath);
  if (!before || !/^[a-f0-9]{64}$/u.test(expectedChangelogSha256 ?? ''))
    throw Error('documentation event requires genuine baseline and changelog preimage');
  const policy = parsePolicy(parseJson(access.readText(baseline.policy_path, 'documentation event policy')));
  const changelog = policy.changelog_path;
  if (sha(access.readBytes(baseline.policy_path, 'documentation event policy')) !== baseline.policy_digest)
    throw Error('documentation event policy changed');
  const target = readFileSync(path.join(payloadRoot, documentPath));
  const after = sha(target);
  if (sha(access.readBytes(documentPath, 'installed documentation event target')) !== after)
    throw Error('documentation event target not installed');
  if (before.sha256 === after) throw Error('documentation event has no logical change');
  const eventId = `documentation-event-${sha(Buffer.from(`${workId}/${sourceRevision}/${documentPath}/${after}`))}`;
  const body: DocumentationEvent = {
    schema: 'DocumentationChangeEvent/v1',
    event_id: eventId,
    logical_edit_id: `forward-${eventId.slice(-16)}`,
    work_id: workId,
    source_revision: sourceRevision,
    operation: 'finalize',
    document_id: before.document_id ?? documentPath,
    path_before: documentPath,
    path_after: documentPath,
    before_sha256: before.sha256,
    after_sha256: after,
    actor: scope.owner,
    pointer: scope.attribution.pointer,
  };
  return access.withExclusiveLockAsync(`${changelog}.lock`, 'forward documentation changelog', async () => {
    const raw = access.readBytes(changelog, 'forward documentation changelog');
    if (raw.length && raw.at(-1) !== 10) throw Error('documentation changelog incomplete');
    const matches = raw
      .toString('utf8')
      .trim()
      .split(/\r?\n/u)
      .filter(Boolean)
      .map(parseJson)
      .filter((event) => changelogEventId(event) === eventId);
    if (matches.length > 1) throw Error('documentation event duplicated');
    let event = matches[0];
    let eventTimestamp: unknown;
    if (event !== undefined) {
      if (!matchesBody(event, body)) throw Error('documentation event replay differs');
      if (dateParse(event.timestamp) < Date.parse(baseline.created_at))
        throw Error('documentation event replay differs');
      eventTimestamp = event.timestamp;
    } else {
      if (!allowCreate) throw Error('documentation event missing; verification cannot append lineage');
      if (sha(raw) !== expectedChangelogSha256) throw Error('documentation changelog CAS changed');
      const timestamp = new Date().toISOString();
      eventTimestamp = timestamp;
      event = { ...body, timestamp };
      await access.replaceAtomicAsync(
        changelog,
        expectedChangelogSha256,
        Buffer.concat([raw, Buffer.from(`${JSON.stringify(event)}\n`)]).toString('utf8'),
        'forward documentation changelog',
      );
    }
    return {
      status: matches.length ? 'already_applied' : 'applied',
      event_id: eventId,
      event_timestamp: eventTimestamp,
      event_suffix_sha256: sha(Buffer.from(`${JSON.stringify(event)}\n`)),
    };
  });
}
