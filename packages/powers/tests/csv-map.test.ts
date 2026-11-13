import { describe, expect, test } from 'bun:test';
import { cellHash, cellsDigest, parseCsv, rowHash, sha256Bytes } from '../scripts/csv-intake.ts';
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
        { columnIndex: 0, cellHash: hashes[0], locator: { ...row.locators[0]!, column: 1 }, locators: [{ ...row.locators[0]!, column: 1 }] },
        { columnIndex: 1, cellHash: hashes[1], locator: { ...row.locators[0]!, column: 2 }, locators: [{ ...row.locators[0]!, column: 2 }] },
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
  test('accepts v3 family and singleton bindings with v1 and v2 receipts', () => {
    const { source, receipt, allowlistEntry } = fixture();
    const binding = source.rows[0]!.bindings[0]!;
    const cells = binding.cells.map((cell) => ({ columnIndex: cell.columnIndex, cellHash: cell.cellHash, locator: cell.locator }));
    binding.instructionId = 'family-alpha';
    Object.assign(binding, { variantId: 'alpha' });
    const familyReceipt = { ...receipt, instructionId: 'alpha' };
    const issues = checkCsvSource({
      donor: 'donor', path: 'a.csv', bytes: bytes('Title,Description\nAlpha,First\n'), source, allowlistEntry,
      instructionIds: new Set(['family-alpha']), familyIds: new Set(['family-alpha']), variantFamilies: new Map([['alpha', 'family-alpha']]),
      variantBodyHashes: new Map([['alpha', 'b'.repeat(64)]]),
      receipts: new Map([['fidelity.json', { sha256: '0'.repeat(64), value: familyReceipt }]]),
    });
    expect(issues).toEqual([]);

    const v2 = { ...familyReceipt, schema: 'H2FidelityReceipt/v2', variantId: 'alpha', variantBodySha256: 'b'.repeat(64) };
    expect(checkCsvSource({
      donor: 'donor', path: 'a.csv', bytes: bytes('Title,Description\nAlpha,First\n'), source, allowlistEntry,
      instructionIds: new Set(['family-alpha']), familyIds: new Set(['family-alpha']), variantFamilies: new Map([['alpha', 'family-alpha']]),
      variantBodyHashes: new Map([['alpha', 'b'.repeat(64)]]),
      receipts: new Map([['fidelity.json', { sha256: '0'.repeat(64), value: v2 }]]),
    })).toEqual([]);
    binding.instructionId = 'alpha';
    Object.assign(binding, { variantId: 'alpha' });
    expect(checkCsvSource({
      donor: 'donor', path: 'a.csv', bytes: bytes('Title,Description\nAlpha,First\n'), source, allowlistEntry,
      instructionIds: new Set(['family-alpha', 'alpha']), familyIds: new Set(['family-alpha']), variantFamilies: new Map([['alpha', 'family-alpha']]),
      receipts: new Map([['fidelity.json', { sha256: '0'.repeat(64), value: receipt }]]),
    })).toEqual([]);
    expect(cells).toHaveLength(2);
    expect(checkCsvSource({
      donor: 'donor', path: 'a.csv', bytes: bytes('Title,Description\nAlpha,First\n'), source, allowlistEntry,
      instructionIds: new Set(['family-alpha']), familyIds: new Set(['family-alpha']), variantFamilies: new Map([['alpha', 'family-alpha']]),
    }).map((item) => item.code)).toContain('CORPUS_CSV_FIDELITY_MISSING');
  });
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

});

function multiLineCase() {
  const text = 'Title,Description\nAlpha,"First\nline"\n';
  const parsed = parseCsv(bytes(text));
  const row = parsed.rows[0]!;
  const hashes = row.cells.map(cellHash);
  const rowKey = `path=a.csv&headers=${parsed.headersDigest}&cells=${cellsDigest(row.cells)}`;
  const cellLocators = row.locators.map((item) => ({ ...item, column: 2 }));
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
          { columnIndex: 1, columnHeader: 'Description', cellHash: hashes[1], role: 'normative-description', locator: { ...row.locators[0]!, column: 2 }, locators: cellLocators },
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
        { columnIndex: 0, cellHash: hashes[0], locator: { ...row.locators[0]!, column: 1 }, locators: [{ ...row.locators[0]!, column: 1 }] },
        { columnIndex: 1, cellHash: hashes[1], locator: { ...row.locators[0]!, column: 2 }, locators: cellLocators.map((item) => ({ ...item })) },
      ],
    },
    reviewer: { kind: 'human', actor: 'reviewer' },
    verdict: 'READY',
    evidence: { path: 'evidence.json', sha256: '1'.repeat(64) },
    recordedAt: '2026-11-05T00:00:00Z',
  };
  const allowlistEntry = { donor: 'donor', path: 'a.csv', rawSha256: parsed.rawSha256, headersDigest: parsed.headersDigest };
  const receipts = new Map([['fidelity.json', { sha256: '0'.repeat(64), value: receipt }]]);
  return {
    source, receipt, receipts, allowlistEntry,
    input: () => ({ donor: 'donor', path: 'a.csv', bytes: bytes(text), source, allowlistEntry, instructionIds: new Set(['alpha']), receipts }),
  };
}

describe('binding cell locators', () => {
  test('accepts locators entries that resolve to the owning parsed row', () => {
    expect(checkCsvSource(multiLineCase().input())).toEqual([]);
  });

  test('reports a locators entry that does not resolve to the owning row', () => {
    const testCase = multiLineCase();
    testCase.source.rows[0]!.bindings[0]!.cells[1]!.locators = [
      { line: 2, row: 1, column: 2 },
      { line: 3, row: 2, column: 2 },
    ];
    const issues = checkCsvSource(testCase.input());
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_LOCATOR_MISSING');
  });

  test('reports a non-record locators entry', () => {
    const testCase = multiLineCase();
    testCase.source.rows[0]!.bindings[0]!.cells[1]!.locators = ['bad' as unknown as { line: number; row: number; column: number }];
    const issues = checkCsvSource(testCase.input());
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_LOCATOR_MISSING');
  });

  test('reports a locators entry that resolves to a different cell', () => {
    const testCase = multiLineCase();
    testCase.source.rows[0]!.bindings[0]!.cells[1]!.locators = [
      { line: 2, row: 1, column: 2 },
      { line: 3, row: 1, column: 1 },
    ];
    const issues = checkCsvSource(testCase.input());
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_LOCATOR_MISSING');
  });

  test('reports a locators entry on a line the cell does not occupy', () => {
    const testCase = multiLineCase();
    testCase.source.rows[0]!.bindings[0]!.cells[0]!.locators = [{ line: 3, row: 1, column: 1 }];
    const issues = checkCsvSource(testCase.input());
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_LOCATOR_MISSING');
  });

  test('reports a locators entry with a string or non-integer column', () => {
    const testCase = multiLineCase();
    testCase.source.rows[0]!.bindings[0]!.cells[1]!.locators = [
      { line: 2, row: 1, column: '2' },
      { line: 3, row: 1, column: 2.5 },
    ] as unknown as Array<{ line: number; row: number; column: number }>;
    const issues = checkCsvSource(testCase.input());
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_LOCATOR_MISSING');
  });

  test('reports an empty locators list', () => {
    const testCase = multiLineCase();
    testCase.source.rows[0]!.bindings[0]!.cells[1]!.locators = [];
    const issues = checkCsvSource(testCase.input());
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_LOCATOR_MISSING');
  });

  test('reports a fidelity receipt locator list that does not mirror the binding', () => {
    const testCase = multiLineCase();
    testCase.receipt.source.cells[1]!.locators.pop();
    const issues = checkCsvSource(testCase.input());
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_FIDELITY_INVALID');
  });
});

type Subspan = { startCodePoint: number; endCodePoint: number; textSha256: string };
type BindingCellFixture = {
  columnIndex: number;
  columnHeader: string;
  cellHash: string;
  role: string;
  locator: { line: number; row: number; column: number };
  locators: Array<{ line: number; row: number; column: number }>;
  subspans?: Subspan[];
};
type BindingFixture = { instructionId: string; cells: BindingCellFixture[]; fidelity: { path: string; sha256: string } };

function splitCase(options: {
  firstSpans?: Subspan[];
  secondSpans?: Subspan[];
  mixingSecond?: boolean;
  receiptSchema?: 'H2FidelityReceipt/v1' | 'H2FidelityReceipt/v2';
  receiptFirstSpans?: Subspan[];
  receiptSecondSpans?: Subspan[];
} = {}) {
  const doText = 'Keep tab order and test without a pointer';
  const gapStart = doText.indexOf(' and ');
  const gapEnd = gapStart + ' and '.length;
  const text = `Title,Do\nKeyboard,${doText}\n`;
  const parsed = parseCsv(bytes(text));
  const row = parsed.rows[0]!;
  const hashes = row.cells.map(cellHash);
  const rowKey = `path=a.csv&headers=${parsed.headersDigest}&cells=${cellsDigest(row.cells)}`;
  const locator = row.locators[0]!;
  const first: Subspan = { startCodePoint: 0, endCodePoint: gapStart, textSha256: sha256Bytes(doText.slice(0, gapStart)) };
  const second: Subspan = { startCodePoint: gapEnd, endCodePoint: doText.length, textSha256: sha256Bytes(doText.slice(gapEnd)) };
  const firstSpans = options.firstSpans ?? [first];
  const secondSpans = options.secondSpans ?? [second];
  const titleCell = (): BindingCellFixture => ({
    columnIndex: 0, columnHeader: 'Title', cellHash: hashes[0]!, role: 'normative-title',
    locator: { ...locator, column: 1 }, locators: [{ ...locator, column: 1 }],
  });
  const doCell = (subspans: Subspan[]): BindingCellFixture => ({
    columnIndex: 1, columnHeader: 'Do', cellHash: hashes[1]!, role: 'normative-direction',
    locator: { ...locator, column: 2 }, locators: [{ ...locator, column: 2 }], subspans,
  });
  const wholeDoCell = (): BindingCellFixture => {
    const cell = doCell([]);
    delete cell.subspans;
    return cell;
  };
  const bindings: BindingFixture[] = [
    { instructionId: 'keyboard-order', cells: [titleCell(), doCell(firstSpans)], fidelity: { path: 'order.json', sha256: '0'.repeat(64) } },
    { instructionId: 'keyboard-pointer', cells: [titleCell(), options.mixingSecond === true ? wholeDoCell() : doCell(secondSpans)], fidelity: { path: 'pointer.json', sha256: '1'.repeat(64) } },
  ];
  const source = {
    rawSha256: parsed.rawSha256,
    headersDigest: parsed.headersDigest,
    columns: [
      { index: 0, header: 'Title', role: 'normative-title' },
      { index: 1, header: 'Do', role: 'normative-direction' },
    ],
    rows: [{
      rowKey,
      rowHash: rowHash(rowKey, parsed.headersDigest, hashes),
      cellHashes: hashes,
      locator,
      locators: row.locators,
      disposition: 'admitted',
      bindings,
      resourceIds: [],
      mergedInto: null,
    }],
  };
  const schema = options.receiptSchema ?? 'H2FidelityReceipt/v2';
  const receiptsFor = (instructionId: string, bodyHash: string, spans: Subspan[]) => ({
    schema,
    instructionId,
    ...(schema === 'H2FidelityReceipt/v2' ? { variantId: instructionId, variantBodySha256: bodyHash } : {}),
    source: {
      donor: 'donor', path: 'a.csv', rowKey,
      cells: [
        { columnIndex: 0, cellHash: hashes[0]!, locator: { ...locator, column: 1 }, locators: [{ ...locator, column: 1 }] },
        { columnIndex: 1, cellHash: hashes[1]!, locator: { ...locator, column: 2 }, locators: [{ ...locator, column: 2 }], ...(schema === 'H2FidelityReceipt/v2' && spans.length > 0 ? { subspans: spans } : {}) },
      ],
    },
    reviewer: { kind: 'human', actor: 'reviewer' },
    verdict: 'READY',
    evidence: { path: 'evidence.json', sha256: '2'.repeat(64) },
    recordedAt: '2026-11-10T00:00:00Z',
  });
  const receiptFirstSpans = options.receiptFirstSpans ?? firstSpans;
  const receiptSecondSpans = options.receiptSecondSpans ?? (options.mixingSecond === true ? [] : secondSpans);
  const receipts = new Map([
    ['order.json', { sha256: '0'.repeat(64), value: receiptsFor('keyboard-order', 'a'.repeat(64), receiptFirstSpans) }],
    ['pointer.json', { sha256: '1'.repeat(64), value: receiptsFor('keyboard-pointer', 'b'.repeat(64), receiptSecondSpans) }],
  ]);
  const allowlistEntry = { donor: 'donor', path: 'a.csv', rawSha256: parsed.rawSha256, headersDigest: parsed.headersDigest };
  return {
    doText, gapStart, gapEnd, first, second, text, parsed, source, receipts, allowlistEntry, firstSpans, secondSpans,
    input: () => ({
      donor: 'donor', path: 'a.csv', bytes: bytes(text), source, allowlistEntry,
      instructionIds: new Set(['keyboard-order', 'keyboard-pointer']),
      variantBodyHashes: new Map([['keyboard-order', 'a'.repeat(64)], ['keyboard-pointer', 'b'.repeat(64)]]),
      receipts,
    }),
  };
}

describe('subspan binding', () => {
  test('accepts exact subspans whose union leaves only separators', () => {
    expect(checkCsvSource(splitCase().input())).toEqual([]);
  });

  test('requires the receipt to mirror the binding subspans', () => {
    const testCase = splitCase();
    const mismatched = {
      ...testCase.second,
      endCodePoint: testCase.doText.length - 1,
      textSha256: sha256Bytes(testCase.doText.slice(testCase.gapEnd, testCase.doText.length - 1)),
    };
    const issues = checkCsvSource(splitCase({ receiptSecondSpans: [mismatched] }).input());
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_FIDELITY_INVALID');
  });

  test('requires a v2 receipt for a subspan binding', () => {
    const testCase = splitCase({ receiptSchema: 'H2FidelityReceipt/v1' });
    expect(checkCsvSource(testCase.input()).map((issue) => issue.code)).toContain('CORPUS_CSV_FIDELITY_INVALID');
  });

  test('rejects a subspan hash that does not match the source text', () => {
    const testCase = splitCase();
    const bad = { ...testCase.first, textSha256: 'f'.repeat(64) };
    const issues = checkCsvSource(splitCase({ firstSpans: [bad] }).input());
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_HASH_MISMATCH');
  });

  test('rejects a subspan outside the cell bounds', () => {
    const testCase = splitCase();
    const bad = { startCodePoint: 0, endCodePoint: testCase.doText.length + 1, textSha256: sha256Bytes(testCase.doText) };
    const issues = checkCsvSource(splitCase({ firstSpans: [bad] }).input());
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_BINDING');
  });

  test('rejects overlapping or out-of-order subspans in one binding cell', () => {
    const testCase = splitCase();
    const overlap = { startCodePoint: testCase.gapStart - 2, endCodePoint: testCase.gapStart + 2, textSha256: sha256Bytes(testCase.doText.slice(testCase.gapStart - 2, testCase.gapStart + 2)) };
    const issues = checkCsvSource(splitCase({ firstSpans: [testCase.first, overlap] }).input());
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_BINDING');
  });

  test('rejects unbound non-separator text', () => {
    const testCase = splitCase();
    const shifted = { startCodePoint: testCase.gapEnd + 1, endCodePoint: testCase.doText.length, textSha256: sha256Bytes(testCase.doText.slice(testCase.gapEnd + 1)) };
    const issues = checkCsvSource(splitCase({ secondSpans: [shifted] }).input());
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_BINDING');
  });

  test('rejects mixing whole-cell and subspan binding in one column', () => {
    const issues = checkCsvSource(splitCase({ mixingSecond: true }).input());
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_BINDING');
  });

  test('rejects a receipt that omits binding subspans', () => {
    const testCase = splitCase({ receiptSecondSpans: [] });
    expect(checkCsvSource(testCase.input()).map((issue) => issue.code)).toContain('CORPUS_CSV_FIDELITY_INVALID');
  });

  test('rejects malformed subspan shapes', () => {
    const nonArray = splitCase();
    nonArray.source.rows[0]!.bindings[0]!.cells[1]!.subspans = 'bad' as unknown as Subspan[];
    expect(checkCsvSource(nonArray.input()).map((issue) => issue.code)).toContain('CORPUS_CSV_BINDING');

    const empty = splitCase();
    empty.source.rows[0]!.bindings[0]!.cells[1]!.subspans = [];
    expect(checkCsvSource(empty.input()).map((issue) => issue.code)).toContain('CORPUS_CSV_BINDING');

    const nonRecord = splitCase();
    nonRecord.source.rows[0]!.bindings[0]!.cells[1]!.subspans = [null as unknown as Subspan];
    expect(checkCsvSource(nonRecord.input()).map((issue) => issue.code)).toContain('CORPUS_CSV_BINDING');

    const badField = splitCase();
    badField.source.rows[0]!.bindings[0]!.cells[1]!.subspans = [{ startCodePoint: 0, endCodePoint: 'x', textSha256: 'f'.repeat(64) } as unknown as Subspan];
    expect(checkCsvSource(badField.input()).map((issue) => issue.code)).toContain('CORPUS_CSV_BINDING');
  });

  test('rejects a non-array receipt subspan field', () => {
    const testCase = splitCase();
    const receipt = testCase.receipts.get('order.json')!.value;
    const source = receipt.source as { cells: Array<Record<string, unknown>> };
    source.cells[1]!.subspans = 'bad';
    expect(checkCsvSource(testCase.input()).map((issue) => issue.code)).toContain('CORPUS_CSV_FIDELITY_INVALID');
  });
});

describe('checkCsvSource merged rows', () => {
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

describe('checkCsvSource resource rows', () => {
  function resourceFixture(text: string, row: Record<string, unknown>, columns: Array<{ index: number; header: string; role: string }>) {
    const parsed = parseCsv(bytes(text));
    const parsedRow = parsed.rows[0]!;
    const hashes = parsedRow.cells.map(cellHash);
    const rowKey = `path=a.csv&headers=${parsed.headersDigest}&cells=${cellsDigest(parsedRow.cells)}`;
    const mapRow = {
      rowKey,
      rowHash: rowHash(rowKey, parsed.headersDigest, hashes),
      cellHashes: hashes,
      locator: parsedRow.locators[0],
      locators: parsedRow.locators,
      disposition: 'admitted',
      bindings: [],
      resourceIds: [],
      mergedInto: null,
      ...row,
    };
    const source = { rawSha256: parsed.rawSha256, headersDigest: parsed.headersDigest, columns, rows: [mapRow] };
    const allowlistEntry = { donor: 'donor', path: 'a.csv', rawSha256: parsed.rawSha256, headersDigest: parsed.headersDigest };
    return { source, allowlistEntry };
  }

  const metaColumns = [
    { index: 0, header: 'Name', role: 'metadata-other' },
    { index: 1, header: 'Value', role: 'metadata-other' },
  ];
  const text = 'Name,Value\nAlpha,1\n';

  test('accepts an admitted resource-only row', () => {
    const { source, allowlistEntry } = resourceFixture(text, { resourceIds: [{ id: 'res-a', disposition: 'admitted', reason: 'pilot' }] }, metaColumns);
    const issues = checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes(text), source, allowlistEntry, instructionIds: new Set(), resourceIds: new Set(['res-a']) });
    expect(issues).toEqual([]);
  });

  test('rejects an admitted resource absent from the catalog', () => {
    const { source, allowlistEntry } = resourceFixture(text, { resourceIds: [{ id: 'res-missing', disposition: 'admitted', reason: 'pilot' }] }, metaColumns);
    const issues = checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes(text), source, allowlistEntry, instructionIds: new Set(), resourceIds: new Set() });
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_RESOURCE_UNKNOWN');
  });

  test('rejects a non-admitted row that admits a resource', () => {
    const { source, allowlistEntry } = resourceFixture(text, { disposition: 'deferred', resourceIds: [{ id: 'res-a', disposition: 'admitted', reason: 'pilot' }] }, metaColumns);
    const issues = checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes(text), source, allowlistEntry, instructionIds: new Set(), resourceIds: new Set(['res-a']) });
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_RESOURCE');
  });

  test('rejects an admitted row with neither bindings nor resources', () => {
    const { source, allowlistEntry } = resourceFixture(text, {}, metaColumns);
    const issues = checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes(text), source, allowlistEntry, instructionIds: new Set(), resourceIds: new Set() });
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_BINDING');
  });

  test('rejects bindings on a source without normative columns', () => {
    const { source, allowlistEntry } = resourceFixture(text, {}, metaColumns);
    const row = source.rows[0] as Record<string, unknown>;
    row.bindings = [{ instructionId: 'alpha', cells: [] }];
    row.disposition = 'admitted';
    const issues = checkCsvSource({ donor: 'donor', path: 'a.csv', bytes: bytes(text), source, allowlistEntry, instructionIds: new Set(['alpha']), resourceIds: new Set() });
    expect(issues.map((issue) => issue.code)).toContain('CORPUS_CSV_COLUMNS');
  });
});
