import { describe, expect, test } from 'bun:test';
import { cellHash, cellsDigest, parseCsv, rowHash } from '../scripts/csv-intake.ts';
import { checkCsvSource } from '../scripts/csv-map.ts';

const bytes = (value: string): Uint8Array => new TextEncoder().encode(value);

function fixture() {
  const parsed = parseCsv(bytes('Title,Description\nAlpha,First\n'));
  const row = parsed.rows[0]!;
  const hashes = row.cells.map(cellHash);
  const rowKey = `path=a.csv&headers=${parsed.headersDigest}&cells=${cellsDigest(row.cells)}`;
  const source = {
    rawSha256: parsed.rawSha256,
    headersDigest: parsed.headersDigest,
    columns: [
      { index: 0, header: 'Title', role: 'normative-title' },
      { index: 1, header: 'Description', role: 'normative-description' },
    ],
    rows: [{
      rowKey,
      rowHash: rowHash(rowKey, parsed.headersDigest, hashes),
      cellHashes: hashes,
      locator: row.locators[0],
      locators: row.locators,
      disposition: 'admitted',
      bindings: [{
        instructionId: 'alpha',
        cells: [
          { columnIndex: 0, columnHeader: 'Title', cellHash: hashes[0], role: 'normative-title', locator: { ...row.locators[0]!, column: 1 }, locators: [{ ...row.locators[0]!, column: 1 }] },
          { columnIndex: 1, columnHeader: 'Description', cellHash: hashes[1], role: 'normative-description', locator: { ...row.locators[0]!, column: 2 }, locators: [{ ...row.locators[0]!, column: 2 }] },
        ],
        fidelity: { path: 'fidelity.json', sha256: '0'.repeat(64) },
      }],
      resourceIds: [],
      mergedInto: null,
    }],
  };
  const receipt = {
    schema: 'H2FidelityReceipt/v1',
    instructionId: 'alpha',
    source: {
      donor: 'donor',
      path: 'a.csv',
      rowKey,
      cells: [
        { columnIndex: 0, cellHash: hashes[0], locator: { ...row.locators[0]!, column: 1 } },
        { columnIndex: 1, cellHash: hashes[1], locator: { ...row.locators[0]!, column: 2 } },
      ],
    },
    reviewer: { kind: 'human', actor: 'reviewer' },
    verdict: 'READY',
    evidence: { path: 'evidence.json', sha256: '1'.repeat(64) },
    recordedAt: '2026-11-05T00:00:00Z',
  };
  return { parsed, source, receipt, allowlistEntry: { donor: 'donor', path: 'a.csv', rawSha256: parsed.rawSha256, headersDigest: parsed.headersDigest } };
}

describe('checkCsvSource', () => {
  test('accepts a complete admitted row', () => {
    const { parsed, source, receipt, allowlistEntry } = fixture();
    const receipts = new Map([['fidelity.json', { sha256: '0'.repeat(64), value: receipt }]]);
    const issues = checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes('Title,Description\nAlpha,First\n'), source, allowlistEntry, instructionIds: new Set(['alpha']), receipts });
    expect(issues).toEqual([]);
    expect(parsed.rows).toHaveLength(1);
  });

  test('reports a missing allowlist entry and hash mismatch', () => {
    const { source, receipt, allowlistEntry } = fixture();
    const receipts = new Map([['fidelity.json', { sha256: '0'.repeat(64), value: receipt }]]);
    const missing = checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes('Title,Description\nAlpha,First\n'), source, allowlistEntry: undefined, instructionIds: new Set(['alpha']), receipts });
    expect(missing.map((issue) => issue.code)).toContain('CORPUS_CSV_ALLOWLIST_MISSING');
    const wrong = checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes('Title,Description\nAlpha,First\n'), source, allowlistEntry: { ...allowlistEntry, rawSha256: 'f'.repeat(64) }, instructionIds: new Set(['alpha']), receipts });
    expect(wrong.map((issue) => issue.code)).toContain('CORPUS_CSV_HASH_MISMATCH');
  });

  test('reports an unbound normative cell and unknown instruction', () => {
    const { source, receipt, allowlistEntry } = fixture();
    const receipts = new Map([['fidelity.json', { sha256: '0'.repeat(64), value: receipt }]]);
    const row = source.rows[0]!;
    row.bindings[0]!.instructionId = 'unknown';
    row.bindings[0]!.cells = [row.bindings[0]!.cells[0]!];
    const issues = checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes('Title,Description\nAlpha,First\n'), source, allowlistEntry, instructionIds: new Set(['alpha']), receipts });
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_BINDING');
  });

  test('reports a missing fidelity receipt', () => {
    const { source, allowlistEntry } = fixture();
    const issues = checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes('Title,Description\nAlpha,First\n'), source, allowlistEntry, instructionIds: new Set(['alpha']) });
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_FIDELITY_MISSING');
  });

  test('reports an unparseable CSV', () => {
    const { source, allowlistEntry } = fixture();
    const issues = checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: new Uint8Array([0xef, 0xbb, 0xbf, 0x41]), source, allowlistEntry, instructionIds: new Set(['alpha']) });
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_INVALID');
  });

  test('reports duplicate identity columns', () => {
    const { source, receipt, allowlistEntry } = fixture();
    source.columns[0]!.role = 'identity-entity-id';
    source.columns[1]!.role = 'identity-entity-id';
    const receipts = new Map([['fidelity.json', { sha256: '0'.repeat(64), value: receipt }]]);
    const issues = checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes('Title,Description\nAlpha,First\n'), source, allowlistEntry, instructionIds: new Set(['alpha']), receipts });
    expect(issues.some((issue) => issue.message.includes('duplicate identity-entity-id'))).toBe(true);
  });

  test('collapses identical parsed rows and keeps every locator', () => {
    const text = 'Title,Description\nAlpha,First\nAlpha,First\n';
    const parsed = parseCsv(bytes(text));
    const row = parsed.rows[0]!;
    const hashes = row.cells.map(cellHash);
    const rowKey = `path=a.csv&headers=${parsed.headersDigest}&cells=${cellsDigest(row.cells)}`;
    const source = {
      rawSha256: parsed.rawSha256,
      headersDigest: parsed.headersDigest,
      columns: [
        { index: 0, header: 'Title', role: 'normative-title' },
        { index: 1, header: 'Description', role: 'normative-description' },
      ],
      rows: [{
        rowKey,
        rowHash: rowHash(rowKey, parsed.headersDigest, hashes),
        cellHashes: hashes,
        locator: parsed.rows[0]!.locators[0],
        locators: parsed.rows.flatMap((item) => item.locators),
        disposition: 'deferred',
        reason: 'duplicate row',
        bindings: [],
        resourceIds: [],
        mergedInto: null,
      }],
    };
    const issues = checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes(text), source, allowlistEntry: { donor: 'donor', path: 'a.csv', rawSha256: parsed.rawSha256, headersDigest: parsed.headersDigest }, instructionIds: new Set(['alpha']) });
    expect(issues.map((issue) => issue.code)).not.toContain('CORPUS_CSV_LOCATOR_MISSING');
  });

  test('reports a fidelity hash mismatch', () => {
    const { source, receipt, allowlistEntry } = fixture();
    const receipts = new Map([['fidelity.json', { sha256: 'f'.repeat(64), value: receipt }]]);
    const issues = checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes('Title,Description\nAlpha,First\n'), source, allowlistEntry, instructionIds: new Set(['alpha']), receipts });
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_FIDELITY_INVALID');
  });

  test('accepts a delegated fidelity receipt with a model and rejects one without it', () => {
    const { source, receipt, allowlistEntry } = fixture();
    const delegated = { ...receipt, reviewer: { kind: 'delegated', actor: 'agent', model: 'test-model' } };
    const valid = new Map([['fidelity.json', { sha256: '0'.repeat(64), value: delegated }]]);
    expect(checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes('Title,Description\nAlpha,First\n'), source, allowlistEntry, instructionIds: new Set(['alpha']), receipts: valid })).toEqual([]);

    const missingModel = { ...delegated, reviewer: { kind: 'delegated', actor: 'agent' } };
    const invalid = new Map([['fidelity.json', { sha256: '0'.repeat(64), value: missingModel }]]);
    expect(checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes('Title,Description\nAlpha,First\n'), source, allowlistEntry, instructionIds: new Set(['alpha']), receipts: invalid }).map((issue) => issue.code)).toContain('CORPUS_CSV_FIDELITY_INVALID');
  });

  test('reports a rejected row without a reason', () => {
    const base = fixture();
    const source = {
      ...base.source,
      rows: [{ ...base.source.rows[0]!, disposition: 'rejected', bindings: [], reason: '' }],
    };
    const issues = checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes('Title,Description\nAlpha,First\n'), source, allowlistEntry: base.allowlistEntry, instructionIds: new Set(['alpha']) });
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_DISPOSITION');
  });

  test('checks merged-row targets and normative coverage', () => {
    const text = 'EntityId,Title,Description\nid1,Alpha,First\nid2,Alpha,First\n';
    const parsed = parseCsv(bytes(text));
    const hashes = parsed.rows.map((row) => row.cells.map(cellHash));
    const keys = ['entityId=id1', 'entityId=id2'];
    const columns = [
      { index: 0, header: 'EntityId', role: 'identity-entity-id' },
      { index: 1, header: 'Title', role: 'normative-title' },
      { index: 2, header: 'Description', role: 'normative-description' },
    ];
    const target = {
      rowKey: keys[0],
      rowHash: rowHash(keys[0]!, parsed.headersDigest, hashes[0]!),
      cellHashes: hashes[0],
      locator: parsed.rows[0]!.locators[0],
      locators: parsed.rows[0]!.locators,
      disposition: 'admitted',
      bindings: [{
        instructionId: 'alpha',
        cells: [{ columnIndex: 1, columnHeader: 'Title', cellHash: hashes[0]![1], role: 'normative-title', locator: { ...parsed.rows[0]!.locators[0]!, column: 2 } }],
      }],
      resourceIds: [],
      mergedInto: null,
    };
    const merged = {
      rowKey: keys[1],
      rowHash: rowHash(keys[1]!, parsed.headersDigest, hashes[1]!),
      cellHashes: hashes[1],
      locator: parsed.rows[1]!.locators[0],
      locators: parsed.rows[1]!.locators,
      disposition: 'merged',
      bindings: [],
      resourceIds: [],
      mergedInto: { rowKey: keys[0], locator: parsed.rows[0]!.locators[0] },
    };
    const allowlistEntry = { donor: 'donor', path: 'a.csv', rawSha256: parsed.rawSha256, headersDigest: parsed.headersDigest };
    const issues = checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes(text), source: { rawSha256: parsed.rawSha256, headersDigest: parsed.headersDigest, columns, rows: [target, merged] }, allowlistEntry, instructionIds: new Set(['alpha']) });
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_MERGE');

    const missing = checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes(text), source: { rawSha256: parsed.rawSha256, headersDigest: parsed.headersDigest, columns, rows: [target, { ...merged, mergedInto: { rowKey: 'missing', locator: parsed.rows[1]!.locators[0] } }] }, allowlistEntry, instructionIds: new Set(['alpha']) });
    expect(missing.map((issue) => issue.code)).toContain('CORPUS_CSV_MERGE');
  });
});
