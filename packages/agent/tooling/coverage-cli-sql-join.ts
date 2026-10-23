import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';

type RecordValue = Record<string, unknown>;
const maxOperations = 4096;
const maxSerializedBytes = 4 * 1024 * 1024;
const methods = new Set([
  'Database.query',
  'Database.prepare',
  'Database.exec',
  'Database.run',
  'Statement.get',
  'Statement.all',
  'Statement.run',
]);
const sha256 = (value: string | Uint8Array): string => createHash('sha256').update(value).digest('hex');
const record = (value: unknown): value is RecordValue =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string';
const digest = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const jsonRecord = (value: unknown, label: string): RecordValue => {
  assert(record(value), `${label} must be an object`);
  return value;
};

function parseArgs(argv: readonly string[]): Map<string, string> {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index];
    if (typeof key !== 'string' || !key.startsWith('--')) continue;
    const value = argv[index + 1];
    assert(text(value) && !value.startsWith('--'), `missing value for ${key}`);
    assert(!values.has(key), `duplicate argument ${key}`);
    values.set(key, value);
    index++;
  }
  return values;
}

function payloadsById(raw: RecordValue): Map<number, Uint8Array> {
  assert(Array.isArray(raw.payloads), 'payloads must be an array');
  const payloads = new Map<number, Uint8Array>();
  for (const entryValue of raw.payloads) {
    const entry = jsonRecord(entryValue, 'payload');
    assert(Number.isSafeInteger(entry.payload_id) && Number(entry.payload_id) > 0, 'payload id invalid');
    assert(
      typeof entry.byte_length === 'number' && Number.isSafeInteger(entry.byte_length) && entry.byte_length >= 0,
      'payload byte length invalid',
    );
    assert(
      text(entry.base64) && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(entry.base64),
      'payload base64 invalid',
    );
    const bytes = Buffer.from(entry.base64, 'base64');
    assert(
      bytes.byteLength === entry.byte_length && bytes.toString('base64') === entry.base64,
      'payload bytes differ from declared length',
    );
    assert(!payloads.has(Number(entry.payload_id)), 'duplicate payload id');
    payloads.set(Number(entry.payload_id), bytes);
  }
  assert(
    [...payloads.keys()].every((id, index) => id === index + 1),
    'payload ids are not contiguous',
  );
  return payloads;
}

function checkBlobRefs(value: unknown, payloads: Map<number, Uint8Array>, depth = 0): void {
  assert(depth <= 16, 'captured value nesting exceeds limit');
  if (Array.isArray(value)) {
    for (const entry of value) checkBlobRefs(entry, payloads, depth + 1);
    return;
  }
  if (!record(value)) return;
  if (value.type === 'blob') {
    assert(Number.isSafeInteger(value.ref) && typeof value.ref === 'number', 'blob reference id invalid');
    const bytes = payloads.get(value.ref as number);
    assert(
      bytes !== undefined && value.byte_length === bytes.byteLength,
      'blob reference is missing or has wrong length',
    );
    assert(Object.keys(value).length === 3, 'blob reference has unexpected fields');
    return;
  }
  for (const child of Object.values(value)) checkBlobRefs(child, payloads, depth + 1);
}

function blobBytes(value: unknown, payloads: Map<number, Uint8Array>): Uint8Array {
  const ref = jsonRecord(value, 'raw payload bytes');
  assert(ref.type === 'blob' && typeof ref.ref === 'number', 'raw payload bytes must be a blob reference');
  const bytes = payloads.get(ref.ref);
  assert(bytes && ref.byte_length === bytes.byteLength, 'raw payload blob is unavailable');
  return bytes;
}

function exactRow(value: unknown, payloads: Map<number, Uint8Array>, label: string): RecordValue {
  const row = jsonRecord(value, `${label} row`);
  assert(text(row.payload) && digest(row.digest) && Number.isSafeInteger(row.revision), `${label} row fields invalid`);
  const bytes = blobBytes(row.raw_payload_bytes, payloads);
  assert(Buffer.from(bytes).toString('utf8') === row.payload, `${label} raw payload bytes differ from SQL text`);
  assert(sha256(row.payload) === row.digest, `${label} digest differs from raw payload`);
  const decoded: unknown = JSON.parse(row.payload);
  assert(record(decoded), `${label} payload is not an object`);
  return { ...row, decoded };
}

function resultRows(operation: RecordValue): unknown[] {
  if (operation.method === 'Statement.get') return operation.result === null ? [] : [operation.result];
  return Array.isArray(operation.result) ? operation.result : [];
}

function whereRead(operation: RecordValue, table: string, keys: readonly string[]): boolean {
  const sql = String(operation.sql).replace(/\s+/gu, ' ').trim().toLowerCase();
  return (
    /^select\b/u.test(sql) &&
    sql.includes(` from ${table} `) &&
    keys.every((key) => new RegExp(`\\b${key}\\s*=\\s*\\?`, 'u').test(sql))
  );
}

function readRows(
  operations: RecordValue[],
  payloads: Map<number, Uint8Array>,
  connections: Map<string, RecordValue>,
  hostConnectionIds: ReadonlySet<string>,
  hostPhysical: string,
  table: string,
  keys: readonly string[],
  label: string,
): RecordValue[] {
  const found: RecordValue[] = [];
  for (const op of operations) {
    if (
      !['Statement.get', 'Statement.all'].includes(String(op.method)) ||
      op.outcome !== 'returned' ||
      !whereRead(op, table, keys)
    )
      continue;
    const connectionId = String(op.connection_id);
    const connection = connections.get(connectionId);
    const identity = connection?.file_identity;
    if (
      !hostConnectionIds.has(connectionId) ||
      !record(identity) ||
      !text(identity.dev) ||
      !text(identity.ino) ||
      `${identity.dev}:${identity.ino}` !== hostPhysical
    )
      continue;
    for (const value of resultRows(op))
      found.push({
        ...exactRow(value, payloads, label),
        __query_args: op.arguments,
        __query_sql: op.sql,
        __connection_id: connectionId,
      });
  }
  return found;
}

function storedRowsFor(rows: RecordValue[], key: (row: RecordValue) => boolean, label: string): RecordValue {
  const matches = rows.filter(key);
  assert(matches.length > 0, `no exact ${label} read row observed`);
  const fingerprints = new Set(
    matches.map((row) => `${String(row.revision)}:${String(row.digest)}:${String(row.payload)}`),
  );
  assert(fingerprints.size === 1, `${label} read rows disagree within the child`);
  return matches[matches.length - 1]!;
}

function assertHostIdentity(
  raw: RecordValue,
  root: string,
  connections: Map<string, RecordValue>,
): { physical: string; connectionIds: Set<string> } {
  assert(Array.isArray(raw.host_opens) && raw.host_opens.length === 2, 'exactly two Host open witnesses required');
  const identities = new Set<string>();
  const connectionIds = new Set<string>();
  let physical = '';
  for (const value of raw.host_opens) {
    const host = jsonRecord(value, 'Host open');
    assert(text(host.database_path) && path.isAbsolute(host.database_path), 'Host database path invalid');
    const relative = path.relative(path.resolve(root), path.resolve(host.database_path));
    assert(
      relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
      'Host database escapes project root',
    );
    assert(
      host.owner_returned_database === true && host.identity_verified === true,
      'Host owner return is not verified',
    );
    assert(text(host.connection_id) && !identities.has(host.connection_id), 'Host connection id missing or repeated');
    identities.add(host.connection_id);
    connectionIds.add(host.connection_id);
    const connection = connections.get(host.connection_id);
    assert(connection && record(connection.file_identity), 'Host connection has no native file identity');
    const identity = connection.file_identity;
    assert(
      text(identity.dev) && text(identity.ino) && identity.dev.length > 0 && identity.ino.length > 0,
      'Host device/inode identity missing',
    );
    const pair = `${identity.dev}:${identity.ino}`;
    if (physical) assert(physical === pair, 'Host connections do not identify one physical database');
    physical = pair;
    assert(
      Array.isArray(host.stat_observations) && host.stat_observations.length === 2,
      'Host needs two stat observations',
    );
    for (const statValue of host.stat_observations) {
      const stat = jsonRecord(statValue, 'Host stat');
      assert(
        stat.path === host.database_path && stat.dev === identity.dev && stat.ino === identity.ino,
        'Host stat identity differs',
      );
      assert(
        stat.nlink === '1' &&
          stat.bigint === true &&
          typeof stat.mode === 'number' &&
          (stat.mode & 0o170000) === 0o100000,
        'Host stat is not a single-link regular file',
      );
    }
    const pragma = host.pragma_database_list;
    assert(Array.isArray(pragma), 'Host PRAGMA database_list missing');
    const mains = pragma.filter((row: unknown): row is RecordValue => record(row) && row.name === 'main');
    assert(mains.length === 1 && mains[0]!.file === host.database_path, 'Host PRAGMA main path differs');
  }
  return { physical, connectionIds };
}

function checkPreparedContracts(work: RecordValue, preparedInputs: readonly RecordValue[]): void {
  const contracts = jsonRecord(work.contracts, 'Work contracts');
  for (const key of ['scope', 'acceptance']) {
    const ref = jsonRecord(contracts[key], `Work ${key} contract`);
    assert(text(ref.path) && digest(ref.sha256), `Work ${key} contract reference invalid`);
    const matches = preparedInputs.filter(
      (row) => row.role === key && row.path === ref.path && row.sha256 === ref.sha256,
    );
    assert(matches.length === 1, `Work ${key} contract does not match one parent-preparation metadata row`);
  }
}

function checkCurrentIntakeArtifact(
  work: RecordValue,
  observedIntake: RecordValue,
  root: string,
  workId: string,
): void {
  const relativePath = `.agent/work/${workId}/local-session-intake.v1.json`;
  const canonicalPath = path.join(root, '.agent', 'work', workId, 'local-session-intake.v1.json');
  assert.equal(observedIntake.role, 'intake');
  assert.equal(observedIntake.path, canonicalPath, 'Observed issue intake path is not the canonical work artifact.');
  assert.equal(observedIntake.realpath, canonicalPath);
  assert(Number.isSafeInteger(observedIntake.bytes) && Number(observedIntake.bytes) > 0);
  assert(digest(observedIntake.sha256));
  const identity = jsonRecord(observedIntake.identity, 'Observed issue intake identity');
  assert(
    identity.nlink === '1' && identity.size === String(observedIntake.bytes),
    'Observed issue intake is not the same bounded single-link file.',
  );
  assert(Array.isArray(work.artifacts), 'Work artifact list is missing from the observed SQL row.');
  const intakeArtifacts = work.artifacts.filter(
    (value: unknown) => record(value) && value.artifact_id === 'local-session-intake',
  );
  assert(intakeArtifacts.length === 1, 'Work must contain exactly one current local-session-intake artifact.');
  const artifact = jsonRecord(intakeArtifacts[0], 'Work local-session-intake artifact');
  assert(
    artifact.schema === 'VidaLocalSessionIntake/v1' &&
      artifact.path === relativePath &&
      path.resolve(root, String(artifact.path)) === canonicalPath &&
      artifact.sha256 === observedIntake.sha256,
    'Work local-session-intake artifact differs from the observed issue input.',
  );
}

function checkJournalCas(
  operations: RecordValue[],
  payloads: Map<number, Uint8Array>,
  args: Map<string, string>,
  workId: string,
  attempt: number,
  workspaceId: string,
  output: RecordValue,
  initial: RecordValue,
  journalConnectionId: string,
  readyActionIds: ReadonlySet<string>,
): RecordValue {
  const expectedRevision = Number(args.get('--expected-revision'));
  let expectedDigest = args.get('--expected-digest');
  assert(
    Number.isSafeInteger(expectedRevision) && expectedRevision > 0 && digest(expectedDigest),
    'initial journal version missing from argv',
  );
  assert(
    initial.revision === expectedRevision && initial.digest === expectedDigest,
    'initial raw Journal row differs from argv version',
  );
  const firstState = initial.decoded as RecordValue;
  assert(
    firstState.schema === 'MastraSessionLedger/v1' &&
      firstState.workspace_id === workspaceId &&
      firstState.work_id === workId &&
      firstState.attempt === attempt,
    'initial Journal payload identity differs',
  );
  assert(sha256(String(initial.payload)) === initial.digest, 'initial Journal digest differs from raw payload');
  const sql =
    'UPDATE agent_host_mastra_session_ledger SET revision=?,payload=?,digest=? WHERE workspace_id=? AND work_id=? AND attempt=? AND revision=? AND digest=?';
  const updates = operations.filter((op) => op.method === 'Statement.run' && op.sql === sql);
  assert(updates.length > 0, 'native Journal CAS updates missing');
  assert(
    updates.every((operation) => operation.connection_id === journalConnectionId),
    'Journal CAS changed connection from its initial Host Journal read',
  );
  let revision = expectedRevision;
  let currentPayload: RecordValue | null = null;
  let previous = firstState;
  const newlyIssued = new Map<string, string>();
  for (const op of updates) {
    assert(
      op.outcome === 'returned' && record(op.result) && op.result.changes === 1,
      'Journal CAS did not return one changed row',
    );
    const bindings = op.arguments;
    assert(Array.isArray(bindings) && bindings.length === 8, 'Journal CAS bindings invalid');
    const [nextRevision, payload, nextDigest, boundWorkspace, boundWork, boundAttempt, priorRevision, priorDigest] =
      bindings as unknown[];
    assert(
      nextRevision === revision + 1 && priorRevision === revision && priorDigest === expectedDigest,
      'Journal CAS chain is discontinuous',
    );
    assert(
      typeof payload === 'string' && digest(nextDigest) && sha256(payload) === nextDigest,
      'Journal CAS payload or digest invalid',
    );
    assert(
      boundWorkspace === workspaceId && boundWork === workId && boundAttempt === attempt,
      'Journal CAS identity differs',
    );
    const decoded: unknown = JSON.parse(payload);
    assert(
      record(decoded) &&
        decoded.schema === 'MastraSessionLedger/v1' &&
        decoded.workspace_id === workspaceId &&
        decoded.work_id === workId &&
        decoded.attempt === attempt,
      'Journal CAS payload identity differs',
    );
    assert(
      decoded.run_id === firstState.run_id && decoded.step_id === firstState.step_id,
      'Journal CAS changed run or step identity',
    );
    assert(
      Array.isArray(previous.items) && Array.isArray(decoded.items) && previous.items.length === decoded.items.length,
      'Journal CAS changed the item set',
    );
    const oldItems = previous.items as unknown[];
    const newItems = decoded.items as unknown[];
    for (let index = 0; index < oldItems.length; index++) {
      const before = jsonRecord(oldItems[index], 'prior Journal item');
      const after = jsonRecord(newItems[index], 'next Journal item');
      assert(JSON.stringify(before.request) === JSON.stringify(after.request), 'Journal CAS changed an issued request');
      assert(before.issue_id === null || before.issue_id === after.issue_id, 'Journal CAS replaced an issued id');
      assert(
        before.issue_id !== null || after.issue_id === null || (text(after.issue_id) && after.issue_id.length > 0),
        'Journal issue id invalid',
      );
      const request = jsonRecord(after.request, 'Journal action request');
      if (before.issue_id === null && after.issue_id !== null) {
        assert(
          text(request.action_id) && readyActionIds.has(request.action_id),
          'Journal CAS issued an action outside the prepared ready wave',
        );
        assert(
          text(after.issue_id) && !newlyIssued.has(request.action_id),
          'Journal CAS repeated a newly issued action',
        );
        newlyIssued.set(request.action_id, after.issue_id);
      }
    }
    previous = decoded;
    currentPayload = decoded;
    revision = Number(nextRevision);
    expectedDigest = String(nextDigest);
  }
  const version = jsonRecord(output.state_version, 'output state_version');
  assert(
    version.revision === revision && version.digest === expectedDigest,
    'output state_version differs from native Journal CAS tail',
  );
  assert(currentPayload, 'Journal CAS chain has no final payload');
  assert(Array.isArray(currentPayload.items), 'final Journal items missing');
  assert(
    newlyIssued.size === readyActionIds.size && [...readyActionIds].every((actionId) => newlyIssued.has(actionId)),
    'Journal CAS did not issue exactly the prepared ready wave',
  );
  const issued = currentPayload.items
    .map((entry) => jsonRecord(entry, 'final Journal item'))
    .filter((entry) => entry.issue_id !== null);
  const finalActionIds = new Set(
    issued.map((entry) => String(jsonRecord(entry.request, 'final issued request').action_id)),
  );
  assert(
    [...readyActionIds].every((actionId) => finalActionIds.has(actionId)),
    'Final Journal omits a newly issued ready-wave action',
  );
  const outputIssued = output.issued_actions;
  assert(
    Array.isArray(outputIssued) && outputIssued.length === issued.length,
    'CLI issued actions differ from final Journal issues',
  );
  const finalByAction = new Map<string, string>();
  for (const entry of issued) {
    const request = jsonRecord(entry.request, 'final issued request');
    assert(
      text(request.action_id) && text(entry.issue_id) && !finalByAction.has(request.action_id),
      'final Journal issue mapping invalid',
    );
    finalByAction.set(request.action_id, entry.issue_id);
  }
  for (const value of outputIssued) {
    const action = jsonRecord(value, 'CLI issued action');
    const request = jsonRecord(action.request, 'CLI issued request');
    assert(
      text(request.action_id) && text(action.issue_id) && finalByAction.get(request.action_id) === action.issue_id,
      'CLI issue differs from final Journal payload',
    );
    finalByAction.delete(request.action_id);
  }
  assert(finalByAction.size === 0, 'final Journal has issues absent from CLI output');
  return currentPayload;
}

export function validateIssueSqlConsumption(
  rawValue: unknown,
  input: {
    argv: readonly string[];
    output: Record<string, unknown>;
    preparedOutput: Record<string, unknown>;
    root: string;
    preparedInputs: readonly Record<string, unknown>[];
    intakeInput: Record<string, unknown>;
  },
): void {
  const raw = jsonRecord(rawValue, 'SQLite capture');
  const output = jsonRecord(input.output, 'CLI output');
  const preparedOutput = jsonRecord(input.preparedOutput, 'prepared CLI output');
  const args = parseArgs(input.argv);
  assert(
    raw.schema === 'VidaCliSqliteConsumed/v1' && raw.complete === true,
    'SQLite capture is incomplete or has a foreign schema',
  );
  assert(Array.isArray(raw.issues) && raw.issues.length === 0, 'SQLite capture has issues');
  assert(raw.descriptor_restoration_exact === true, 'SQLite descriptors were not restored exactly');
  assert(
    Array.isArray(raw.unsupported_methods) && raw.unsupported_methods.length === 0,
    'SQLite capture contains unsupported methods',
  );
  assert(
    Array.isArray(raw.operations) && raw.operations.length > 0 && raw.operations.length <= maxOperations,
    'SQLite operation count outside bound',
  );
  let serialized: string;
  try {
    serialized = JSON.stringify(raw);
  } catch {
    assert.fail('SQLite capture cannot be serialized');
  }
  assert(
    Buffer.byteLength(serialized!) <= maxSerializedBytes,
    'SQLite capture exceeds the shared serialized-byte bound',
  );
  const payloads = payloadsById(raw);
  const operations = raw.operations.map((value) => jsonRecord(value, 'SQLite operation'));
  operations.forEach((op, index) => {
    assert(op.sequence === index + 1 && methods.has(String(op.method)), 'SQLite operation sequence or method invalid');
    assert(
      text(op.sql) && text(op.connection_id) && (op.outcome === 'returned' || op.outcome === 'threw'),
      'SQLite operation envelope invalid',
    );
    assert(Array.isArray(op.arguments), 'SQLite operation arguments invalid');
    if (op.outcome === 'returned')
      assert(Object.hasOwn(op, 'result') && !Object.hasOwn(op, 'error'), 'returned operation lacks exclusive result');
    else assert(Object.hasOwn(op, 'error') && !Object.hasOwn(op, 'result'), 'thrown operation lacks exclusive error');
    checkBlobRefs(op.arguments, payloads);
    if (Object.hasOwn(op, 'result')) checkBlobRefs(op.result, payloads);
    if (Object.hasOwn(op, 'error')) checkBlobRefs(op.error, payloads);
  });
  assert(Array.isArray(raw.connections), 'connection list missing');
  const connections = new Map<string, RecordValue>();
  for (const value of raw.connections) {
    const connection = jsonRecord(value, 'connection');
    assert(
      text(connection.connection_id) && !connections.has(connection.connection_id),
      'connection id missing or repeated',
    );
    assert(
      record(connection.file_identity) && text(connection.file_identity.dev) && text(connection.file_identity.ino),
      'connection device/inode identity missing',
    );
    connections.set(connection.connection_id, connection);
  }
  assert(
    operations.every((op) => connections.has(String(op.connection_id))),
    'operation refers to an unknown connection',
  );
  const host = assertHostIdentity(raw, input.root, connections);
  assert(
    path.resolve(args.get('--project-root') ?? '') === path.resolve(input.root),
    'argv project root differs from bound root',
  );
  const workId = args.get('--work-id');
  const attempt = Number(args.get('--attempt'));
  const scopeDigest = args.get('--scope-digest');
  assert(
    text(workId) && Number.isSafeInteger(attempt) && attempt > 0 && digest(scopeDigest),
    'Work argv identity invalid',
  );

  const workRows = readRows(
    operations,
    payloads,
    connections,
    host.connectionIds,
    host.physical,
    'agent_host_state',
    ['workspace_id', 'kind', 'id'],
    'Work',
  );
  const ledgerRows = readRows(
    operations,
    payloads,
    connections,
    host.connectionIds,
    host.physical,
    'agent_host_state',
    ['workspace_id', 'kind', 'id'],
    'CoordinationLedger',
  );
  const journalRows = readRows(
    operations,
    payloads,
    connections,
    host.connectionIds,
    host.physical,
    'agent_host_mastra_session_ledger',
    ['workspace_id', 'work_id', 'attempt'],
    'Journal',
  );
  const stateRows = [...workRows, ...ledgerRows];
  const matchingWork = storedRowsFor(
    stateRows,
    (row) => {
      const decoded = row.decoded as RecordValue;
      return (
        decoded.schema === 'WorkState/v1' &&
        decoded.binding !== null &&
        record(decoded.binding) &&
        decoded.binding.lifecycle_work_id === workId
      );
    },
    'Work',
  );
  const workspaceId = String(matchingWork.workspace_id);
  const workArgs = matchingWork.__query_args;
  assert(
    Array.isArray(workArgs) && workArgs[0] === workspaceId && workArgs[1] === 'work' && workArgs[2] === matchingWork.id,
    'Work query does not bind the exact returned row key',
  );
  assert(
    digest(workspaceId) && matchingWork.kind === 'work' && text(matchingWork.id),
    'Work SQL row key differs from its query',
  );
  const work = matchingWork.decoded as RecordValue;
  assert(
    work.workspace_id === workspaceId && work.revision === matchingWork.revision,
    'Work row payload identity/revision differs',
  );
  assert(
    record(work.binding) && work.binding.scope_contract_digest === scopeDigest,
    'Work scope binding differs from argv',
  );
  checkPreparedContracts(work, input.preparedInputs);
  checkCurrentIntakeArtifact(work, input.intakeInput, input.root, workId);
  assert(
    record(work.lease) && text(work.lease.ticket_id) && text(work.lease.thread_id),
    'Work has no current lease binding',
  );

  const matchingLedger = storedRowsFor(
    stateRows,
    (row) => {
      const decoded = row.decoded as RecordValue;
      return decoded.schema === 'CoordinationLedger/v1' && decoded.workspace_id === workspaceId;
    },
    'CoordinationLedger',
  );
  const ledgerArgs = matchingLedger.__query_args;
  assert(
    Array.isArray(ledgerArgs) &&
      ledgerArgs[0] === workspaceId &&
      ledgerArgs[1] === 'ledger' &&
      ledgerArgs[2] === 'shared' &&
      matchingLedger.kind === 'ledger' &&
      matchingLedger.id === 'shared',
    'CoordinationLedger SQL key differs',
  );
  const coordination = matchingLedger.decoded as RecordValue;
  assert(record(coordination) && Array.isArray(coordination.tickets), 'CoordinationLedger ticket list missing');
  const lease = jsonRecord(work.lease, 'Work lease');
  const tickets = coordination.tickets.filter((ticket) => record(ticket) && ticket.ticket_id === lease.ticket_id);
  assert(tickets.length === 1, 'Work lease does not join one current ticket');
  const ticket = tickets[0] as RecordValue;
  assert(
    ticket.work_id === workId &&
      ticket.thread_id === lease.thread_id &&
      ticket.generation === lease.generation &&
      ticket.status === 'active',
    'current ticket differs from Work lease',
  );
  assert(
    Array.isArray(ticket.claim_ids) && ticket.claim_ids.length > 0 && Array.isArray(coordination.claims),
    'current ticket has no claim binding',
  );
  const claimIdValues: unknown[] = ticket.claim_ids;
  const claimIds = claimIdValues.filter(text);
  assert(
    claimIds.length === claimIdValues.length && new Set(claimIds).size === claimIds.length,
    'current ticket claim ids are missing or repeated',
  );
  const ledgerClaims: unknown[] = coordination.claims;
  for (const claimId of claimIds) {
    const matches = ledgerClaims.filter((claim: unknown) => record(claim) && claim.claim_id === claimId);
    assert(matches.length === 1, 'current ticket claim does not join exactly one active ledger row');
    const claim = matches[0] as RecordValue;
    assert(
      claim.ticket_id === ticket.ticket_id &&
        claim.work_id === workId &&
        claim.thread_id === ticket.thread_id &&
        claim.generation === ticket.generation &&
        claim.status === 'active',
      'current ticket claim differs from the active ledger row',
    );
  }

  const initialRevision = Number(args.get('--expected-revision'));
  const initialDigest = args.get('--expected-digest');
  const initialMatches = journalRows.filter(
    (row) =>
      row.workspace_id === workspaceId &&
      row.work_id === workId &&
      row.attempt === attempt &&
      row.revision === initialRevision &&
      row.digest === initialDigest,
  );
  assert(initialMatches.length > 0, 'no exact initial Journal version was read');
  const initialJournal = initialMatches[0]!;
  const initial = initialJournal.decoded as RecordValue;
  const journalArgs = initialJournal.__query_args;
  assert(
    Array.isArray(journalArgs) &&
      journalArgs[0] === workspaceId &&
      journalArgs[1] === workId &&
      journalArgs[2] === attempt,
    'Journal query does not bind the exact returned row',
  );
  assert(record(work.execution) && initial.run_id === work.execution.run_id, 'Journal run does not join current Work');
  assert(
    initialJournal.revision === Number(args.get('--expected-revision')) &&
      initialJournal.digest === args.get('--expected-digest'),
    'initial Journal row differs from CLI CAS base',
  );
  const preparedVersion = jsonRecord(preparedOutput.state_version, 'prepared output state_version');
  assert(
    preparedOutput.schema === 'VidaAgentRunResult/v1' && preparedOutput.status === 'prepared',
    'prepared CLI output is not the admitted preparation result',
  );
  assert(
    preparedVersion.revision === initialJournal.revision && preparedVersion.digest === initialJournal.digest,
    'current Journal base differs from the completed prepared CLI output',
  );
  assert(
    Array.isArray(preparedOutput.next_actions) && preparedOutput.next_actions.length > 0,
    'prepared CLI output has no ready-wave actions',
  );
  const readyActionIds = new Set<string>();
  for (const value of preparedOutput.next_actions) {
    const action = jsonRecord(value, 'prepared ready-wave action');
    const request = jsonRecord(action.request, 'prepared ready-wave request');
    assert(
      text(request.action_id) && !readyActionIds.has(request.action_id),
      'prepared ready-wave action id missing or repeated',
    );
    readyActionIds.add(request.action_id);
  }
  assert(Array.isArray(initial.items), 'initial Journal item set missing');
  const initialReadyActionIds = new Set<string>();
  for (const value of initial.items) {
    const item = jsonRecord(value, 'initial ready-wave Journal item');
    const request = jsonRecord(item.request, 'initial ready-wave Journal request');
    assert(
      text(request.action_id) && !initialReadyActionIds.has(request.action_id),
      'initial Journal action id missing or repeated',
    );
    if (item.issue_id === null) initialReadyActionIds.add(request.action_id);
    else assert(!readyActionIds.has(request.action_id), 'prepared ready wave already contains a persisted issue id');
  }
  assert(
    initialReadyActionIds.size === readyActionIds.size &&
      [...readyActionIds].every((actionId) => initialReadyActionIds.has(actionId)),
    'initial Journal unissued action set differs from the prepared ready wave',
  );
  assert(text(initialJournal.__connection_id), 'initial Journal Host connection id missing');
  const finalJournal = checkJournalCas(
    operations,
    payloads,
    args,
    workId,
    attempt,
    workspaceId,
    output,
    initialJournal,
    initialJournal.__connection_id,
    readyActionIds,
  );
  assert(
    record(work.execution) && finalJournal.run_id === work.execution.run_id,
    'final Journal run does not join current Work',
  );
}
