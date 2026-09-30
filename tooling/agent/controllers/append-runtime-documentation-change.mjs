import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadForwardPayloadRuntime } from './forward-payload-runtime.mjs';

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
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
}) {
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
  const policy = JSON.parse(access.readText(baseline.policy_path, 'documentation event policy'));
  const changelog = policy.changelog_path;
  if (sha(access.readBytes(baseline.policy_path, 'documentation event policy')) !== baseline.policy_digest)
    throw Error('documentation event policy changed');
  const target = readFileSync(path.join(payloadRoot, documentPath));
  const after = sha(target);
  if (sha(access.readBytes(documentPath, 'installed documentation event target')) !== after)
    throw Error('documentation event target not installed');
  if (before.sha256 === after) throw Error('documentation event has no logical change');
  const eventId = `documentation-event-${sha(Buffer.from(`${workId}/${sourceRevision}/${documentPath}/${after}`))}`;
  const body = {
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
      .map((line) => JSON.parse(line))
      .filter((event) => event.event_id === eventId);
    if (matches.length > 1) throw Error('documentation event duplicated');
    let event = matches[0];
    if (event) {
      if (
        Object.keys(event).length !== Object.keys(body).length + 1 ||
        Object.entries(body).some(([key, value]) => event[key] !== value) ||
        !Number.isFinite(Date.parse(event.timestamp)) ||
        Date.parse(event.timestamp) < Date.parse(baseline.created_at)
      )
        throw Error('documentation event replay differs');
    } else {
      if (!allowCreate) throw Error('documentation event missing; verification cannot append lineage');
      if (sha(raw) !== expectedChangelogSha256) throw Error('documentation changelog CAS changed');
      event = { ...body, timestamp: new Date().toISOString() };
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
      event_timestamp: event.timestamp,
      event_suffix_sha256: sha(Buffer.from(`${JSON.stringify(event)}\n`)),
    };
  });
}
