import { describe, expect, test } from 'bun:test';
import { CsvError, cellHash, cellsDigest, headersDigest, parseCsv, rowHash } from '../scripts/csv-intake.ts';

const bytes = (value: string): Uint8Array => new TextEncoder().encode(value);

describe('parseCsv', () => {
  test('parses headers and rows with stable locators', () => {
    const parsed = parseCsv(bytes('Title,Description\r\nAlpha,First\r\nBeta,Second\r\n'));
    expect(parsed.headers).toEqual(['Title', 'Description']);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]?.cells).toEqual(['Alpha', 'First']);
    expect(parsed.rows[0]?.locators).toEqual([{ line: 2, row: 1 }]);
    expect(parsed.rows[1]?.locators).toEqual([{ line: 3, row: 2 }]);
  });

  test('accepts quoted commas and newlines and records every physical line', () => {
    const parsed = parseCsv(bytes('Title,Description\r\nAlpha,"First, line\nsecond line"\r\n'));
    expect(parsed.rows[0]?.cells).toEqual(['Alpha', 'First, line\nsecond line']);
    expect(parsed.rows[0]?.locators).toEqual([
      { line: 2, row: 1 },
      { line: 3, row: 1 },
    ]);
  });

  test('rejects BOM, a lone CR, duplicate or empty headers and ragged rows', () => {
    const cases = [
      new Uint8Array([0xef, 0xbb, 0xbf, 0x41]),
      bytes('Title\rA\r'),
      bytes('Title,Title\nA,B\n'),
      bytes('Title,\nA,B\n'),
      bytes('Title,Other\nA\n'),
    ];
    for (const value of cases) expect(() => parseCsv(value)).toThrow(CsvError);
  });

  test('rejects an extra empty record', () => {
    expect(() => parseCsv(bytes('Title\nA\n\n'))).toThrow(CsvError);
  });

  test('hashes the raw cell value and the canonical row preimage', () => {
    const parsed = parseCsv(bytes('Title,Description\nAlpha,"First, line"\n'));
    const row = parsed.rows[0]!;
    const hashes = row.cells.map(cellHash);
    expect(hashes).toHaveLength(2);
    expect(rowHash('entityId=alpha&sourceKey=1', parsed.headersDigest, hashes)).toMatch(/^[0-9a-f]{64}$/);
    expect(cellsDigest(row.cells)).toBe(cellsDigest(['Alpha', 'First, line']));
    expect(headersDigest(parsed.headers)).toBe(parsed.headersDigest);
  });
});
