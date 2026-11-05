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
  return { parsed, source, allowlistEntry: { donor: 'donor', path: 'a.csv', rawSha256: parsed.rawSha256, headersDigest: parsed.headersDigest } };
}

describe('checkCsvSource', () => {
  test('accepts a complete admitted row', () => {
    const { parsed, source, allowlistEntry } = fixture();
    const issues = checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes('Title,Description\nAlpha,First\n'), source, allowlistEntry, instructionIds: new Set(['alpha']) });
    expect(issues).toEqual([]);
    expect(parsed.rows).toHaveLength(1);
  });

  test('reports a missing allowlist entry and hash mismatch', () => {
    const { source, allowlistEntry } = fixture();
    const missing = checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes('Title,Description\nAlpha,First\n'), source, allowlistEntry: undefined, instructionIds: new Set(['alpha']) });
    expect(missing.map((issue) => issue.code)).toContain('CORPUS_CSV_ALLOWLIST_MISSING');
    const wrong = checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes('Title,Description\nAlpha,First\n'), source, allowlistEntry: { ...allowlistEntry, rawSha256: 'f'.repeat(64) }, instructionIds: new Set(['alpha']) });
    expect(wrong.map((issue) => issue.code)).toContain('CORPUS_CSV_HASH_MISMATCH');
  });

  test('reports an unbound normative cell and unknown instruction', () => {
    const { source, allowlistEntry } = fixture();
    const row = source.rows[0]!;
    row.bindings[0]!.instructionId = 'unknown';
    row.bindings[0]!.cells = [row.bindings[0]!.cells[0]!];
    const issues = checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes('Title,Description\nAlpha,First\n'), source, allowlistEntry, instructionIds: new Set(['alpha']) });
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_BINDING');
  });
});
