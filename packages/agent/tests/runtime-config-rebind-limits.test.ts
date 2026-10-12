import { test, expect } from 'bun:test';
import type { Database } from 'bun:sqlite';
import { currentState } from '../bin/runtime-config-rebind.ts';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { canonicalJsonDigest, MAX_CANONICAL_BYTES } from '../src/contracts/public-ingress.ts';
import { MAX_CANONICAL_DEPTH } from '../src/contracts/canonical-json-core.ts';
import {
  checkedFixtureWork,
  checkedRecord,
  checkedSqliteInteger,
  checkedString,
  databaseState,
  fence,
  fixture,
  json,
  parseFixtureJson,
  readHostStateSqlRow,
  requiredElement,
  requiredSqliteRow,
  runReconcileArtifacts,
  seedManyReadonlyWorks,
  seedState,
  withDatabase,
  registerRuntimeConfigFixtureCleanup,
  type HostStateRawPayloadRow,
  type HostStateRowId,
  type HostStateRowIdPayload,
} from './helpers/runtime-config-rebind-fixture.ts';

registerRuntimeConfigFixtureCleanup();

test('compact config binding handles over ten thousand readonly row nodes and rejects raw-payload-only plan drift', async () => {
  const f = fixture({ sourceMode: true });
  const identities = seedManyReadonlyWorks(f, 128);
  const config = loadRuntimeConfig(f.root);
  const originalDigest = withDatabase(f, (db) => currentState(db, f.workspace, f.root, config));
  expect(originalDigest).toMatch(/^[a-f0-9]{64}$/);
  expect((await runReconcileArtifacts(f.args('plan'))).status).toBe('planned');
  const beforeDrift = databaseState(f);
  const changedRow = withDatabase(f, (db) => {
    const identity = requiredElement(identities, 0, 'readonly work identity'),
      row = readHostStateSqlRow(
        db,
        "SELECT * FROM agent_host_state WHERE workspace_id=? AND kind='work' AND id=?",
        f.workspace,
        JSON.stringify([identity.repository_id, identity.project_ids, identity.integrations_digest, identity.work_id]),
      );
    const originalPayload = checkedString(row.payload, 'selected work payload'),
      rowId = checkedString(row.id, 'selected work row id'),
      payload = originalPayload + '\n';
    expect(parseFixtureJson(payload)).toEqual(parseFixtureJson(originalPayload));
    expect(
      db
        .query('UPDATE agent_host_state SET payload=? WHERE workspace_id=? AND kind=? AND id=?')
        .run(payload, f.workspace, 'work', rowId).changes,
    ).toBe(1);
    return { ...row, payload };
  });
  const originalChangedRow = beforeDrift.agent_host_state.find((row) => row.id === changedRow.id);
  if (originalChangedRow === undefined) throw Error('Changed readonly work row is absent from the baseline');
  expect(changedRow.digest).toBe(checkedString(originalChangedRow.digest, 'baseline work digest'));
  const driftDigest = withDatabase(f, (db) => currentState(db, f.workspace, f.root, config));
  expect(driftDigest).not.toBe(originalDigest);
  const driftedState = databaseState(f);
  await Promise.resolve(
    expect(runReconcileArtifacts(f.args('apply'))).rejects.toThrow(
      /current selector\/schema\/global state differs from plan/,
    ),
  );
  expect(databaseState(f)).toEqual(driftedState);
  expect(fence(f)).toBeNull();
});

test('compact config binding includes row metadata and retains per-row digest denial', async () => {
  const metadataFixture = fixture({ sourceMode: true });
  seedState(metadataFixture);
  const metadataConfig = loadRuntimeConfig(metadataFixture.root);
  const metadataDigest = withDatabase(metadataFixture, (db) =>
    currentState(db, metadataFixture.workspace, metadataFixture.root, metadataConfig),
  );
  await runReconcileArtifacts(metadataFixture.args('plan'));
  withDatabase(metadataFixture, (db) => {
    db.query("UPDATE agent_host_state SET revision=revision+1 WHERE workspace_id=? AND kind='work'").run(
      metadataFixture.workspace,
    );
  });
  const metadataDriftDigest = withDatabase(metadataFixture, (db) =>
    currentState(db, metadataFixture.workspace, metadataFixture.root, metadataConfig),
  );
  expect(metadataDriftDigest).not.toBe(metadataDigest);
  const metadataDrift = databaseState(metadataFixture);
  await Promise.resolve(
    expect(runReconcileArtifacts(metadataFixture.args('apply'))).rejects.toThrow(
      /current selector\/schema\/global state differs from plan/,
    ),
  );
  expect(databaseState(metadataFixture)).toEqual(metadataDrift);
  expect(fence(metadataFixture)).toBeNull();

  const digestFixture = fixture({ sourceMode: true });
  seedState(digestFixture);
  await runReconcileArtifacts(digestFixture.args('plan'));
  withDatabase(digestFixture, (db) => {
    db.query("UPDATE agent_host_state SET digest=? WHERE workspace_id=? AND kind='work'").run(
      '0'.repeat(64),
      digestFixture.workspace,
    );
  });
  const digestDrift = databaseState(digestFixture);
  await Promise.resolve(
    expect(runReconcileArtifacts(digestFixture.args('apply'))).rejects.toThrow(
      /agent_host_state row integrity differs/,
    ),
  );
  expect(databaseState(digestFixture)).toEqual(digestDrift);
  expect(fence(digestFixture)).toBeNull();
});

test('compact config binding rejects malformed UTF-8 payload bytes with unchanged decoded text', () => {
  const f = fixture({ sourceMode: true });
  seedState(f);
  const config = loadRuntimeConfig(f.root);
  withDatabase(f, (db) => {
    const row = requiredSqliteRow(
        db
          .query<HostStateRowIdPayload, [string]>(
            "SELECT rowid,payload FROM agent_host_state WHERE workspace_id=? AND kind='work'",
          )
          .get(f.workspace),
        'work row for UTF-8 case',
      ),
      work = checkedRecord(parseFixtureJson(checkedString(row.payload, 'work payload')), 'work payload'),
      replacement = String.fromCharCode(0xfffd),
      rowId = checkedSqliteInteger(row.rowid, 'work rowid');
    const lifecycle = checkedRecord(work.lifecycle, 'work lifecycle');
    lifecycle.next_action = `Trace ${replacement} the accepted work request.`;
    work.lifecycle = lifecycle;
    const payload = json(work),
      validBytes = Buffer.from(payload, 'utf8'),
      replacementBytes = Buffer.from(replacement, 'utf8'),
      replacementIndex = validBytes.indexOf(replacementBytes);
    expect(replacementIndex).toBeGreaterThanOrEqual(0);
    const malformedBytes = Buffer.concat([
      validBytes.subarray(0, replacementIndex),
      Buffer.from([0xff]),
      validBytes.subarray(replacementIndex + replacementBytes.length),
    ]);
    expect(new TextDecoder('utf-8').decode(malformedBytes)).toBe(payload);
    db.query('UPDATE agent_host_state SET payload=CAST(? AS TEXT),digest=? WHERE rowid=?').run(
      malformedBytes,
      canonicalJsonDigest(work),
      rowId,
    );
    const stored = requiredSqliteRow(
      db
        .query<HostStateRawPayloadRow, [number]>(
          'SELECT payload,CAST(payload AS BLOB) AS raw_payload_bytes FROM agent_host_state WHERE rowid=?',
        )
        .get(rowId),
      'stored UTF-8 work row',
    );
    expect(stored.payload).toBe(payload);
    expect(Buffer.from(stored.raw_payload_bytes)).toEqual(malformedBytes);
    expect(Buffer.from(stored.payload, 'utf8')).not.toEqual(malformedBytes);
  });
  const before = databaseState(f);
  withDatabase(f, (db) =>
    expect(() => currentState(db, f.workspace, f.root, config)).toThrow(/payload UTF-8 is invalid/),
  );
  expect(databaseState(f)).toEqual(before);
});

test('compact config binding rejects one persisted row beyond the JSON depth budget before digest validation', () => {
  const f = fixture({ sourceMode: true });
  seedState(f);
  const config = loadRuntimeConfig(f.root),
    payload = '['.repeat(MAX_CANONICAL_DEPTH + 1) + '0' + ']'.repeat(MAX_CANONICAL_DEPTH + 1);
  expect(Buffer.byteLength(payload, 'utf8')).toBeLessThanOrEqual(MAX_CANONICAL_BYTES);
  withDatabase(f, (db) => {
    const row = requiredSqliteRow(
      db
        .query<HostStateRowIdPayload, [string]>(
          "SELECT rowid,payload FROM agent_host_state WHERE workspace_id=? AND kind='work'",
        )
        .get(f.workspace),
      'work row for JSON depth case',
    );
    // Keep the row's original digest as authentic stored metadata. The altered payload deliberately does not claim
    // a matching digest: structural preflight must reject it before ordinary JSON parsing and digest validation.
    db.query('UPDATE agent_host_state SET payload=CAST(? AS TEXT) WHERE rowid=?').run(payload, row.rowid);
    const raw = requiredSqliteRow(
      db
        .query<HostStateRawPayloadRow, [number]>(
          'SELECT payload,CAST(payload AS BLOB) AS raw_payload_bytes FROM agent_host_state WHERE rowid=?',
        )
        .get(row.rowid),
      'stored over-depth work row',
    );
    expect(raw.payload).toBe(payload);
    expect(Buffer.from(raw.raw_payload_bytes)).toEqual(Buffer.from(payload, 'utf8'));
  });
  const beforeRead = databaseState(f);
  withDatabase(f, (db) =>
    expect(() => currentState(db, f.workspace, f.root, config)).toThrow(
      'workspace SQL agent_host_state JSON structural budget exceeded',
    ),
  );
  expect(databaseState(f)).toEqual(beforeRead);
});

test('compact config binding accepts a row just below the canonical byte budget', () => {
  const f = fixture({ sourceMode: true });
  seedState(f);
  const config = loadRuntimeConfig(f.root);
  withDatabase(f, (db) => {
    const row = requiredSqliteRow(
        db
          .query<HostStateRowIdPayload, [string]>(
            "SELECT rowid,payload FROM agent_host_state WHERE workspace_id=? AND kind='work'",
          )
          .get(f.workspace),
        'work row for canonical byte case',
      ),
      originalWork = checkedFixtureWork(parseFixtureJson(checkedString(row.payload, 'work payload')), f),
      rowId = checkedSqliteInteger(row.rowid, 'work rowid');
    const targetBytes = MAX_CANONICAL_BYTES - 1024,
      baseWork = originalWork,
      baselinePayloadBytes = Buffer.byteLength(JSON.stringify(baseWork), 'utf8'),
      existingResources = [...baseWork.binding.allowed_resources],
      targetAdditionBytes = targetBytes - baselinePayloadBytes,
      fullResourceCount = Math.floor(targetAdditionBytes / 2051),
      fullResourceCost = fullResourceCount * 2051 - (existingResources.length === 0 ? 1 : 0),
      remainingAdditionBytes = targetAdditionBytes - fullResourceCost,
      fullResources = Array.from({ length: fullResourceCount }, (_, index) => {
        const prefix = `fixture-resource-${index}-`;
        return prefix + 'x'.repeat(2048 - prefix.length);
      }),
      partialPrefix = `fixture-resource-tail-${fullResourceCount}-`,
      partialLength = remainingAdditionBytes - 3,
      partialResource =
        partialLength >= partialPrefix.length ? [partialPrefix + 'x'.repeat(partialLength - partialPrefix.length)] : [],
      work = checkedFixtureWork(
        {
          ...baseWork,
          binding: {
            ...baseWork.binding,
            allowed_resources: [...existingResources, ...fullResources, ...partialResource],
          },
        },
        f,
      ),
      payload = JSON.stringify(work),
      payloadBytes = Buffer.byteLength(payload, 'utf8');
    expect(payloadBytes).toBeGreaterThan(MAX_CANONICAL_BYTES - 2048);
    expect(payloadBytes).toBeLessThanOrEqual(MAX_CANONICAL_BYTES);
    db.query('UPDATE agent_host_state SET payload=?,digest=? WHERE rowid=?').run(
      payload,
      canonicalJsonDigest(work),
      rowId,
    );
  });
  const digest = withDatabase(f, (db) => currentState(db, f.workspace, f.root, config));
  expect(digest).toMatch(/^[a-f0-9]{64}$/);
});

test('compact config binding rejects an oversized row before fetching its payload', () => {
  const f = fixture({ sourceMode: true });
  seedState(f);
  const config = loadRuntimeConfig(f.root),
    observedQueries: string[] = [];
  withDatabase(f, (db) => {
    const row = requiredSqliteRow(
      db
        .query<HostStateRowId, [string]>("SELECT rowid FROM agent_host_state WHERE workspace_id=? AND kind='work'")
        .get(f.workspace),
      'oversized work row',
    );
    db.query('UPDATE agent_host_state SET payload=zeroblob(?) WHERE rowid=?').run(MAX_CANONICAL_BYTES + 1, row.rowid);
    const observedDatabase = new Proxy(db, {
      get(target, property) {
        if (property === 'query') {
          const observedQuery: Database['query'] = (sql) => {
            observedQueries.push(sql);
            return target.query(sql);
          };
          return observedQuery;
        }
        const value: unknown = Reflect.get(target, property, target);
        if (typeof value === 'function') return (...args: unknown[]): unknown => Reflect.apply(value, target, args);
        return value;
      },
    });
    expect(() => currentState(observedDatabase, f.workspace, f.root, config)).toThrow(
      /row payload exceeds canonical byte budget/,
    );
    expect(observedQueries.some((sql) => sql.includes('SELECT *, CAST(payload AS BLOB)'))).toBe(false);
  });
});
