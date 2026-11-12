import { Buffer } from 'node:buffer';
import { cellHash, cellsDigest, headersDigest, parseCsv, rowHash, sha256Bytes } from './csv-intake.ts';

export type CsvIssue = { code: string; message: string; details?: Record<string, unknown> };
export type CsvSourceInput = {
  donor: string;
  path: string;
  bytes: Uint8Array;
  source: Record<string, unknown>;
  allowlistEntry: Record<string, unknown> | undefined;
  instructionIds: Set<string>;
  variantFamilies?: Map<string, string>;
  familyIds?: Set<string>;
  variantBodyHashes?: Map<string, string>;
  receipts?: Map<string, { sha256: string; value: Record<string, unknown> }>;
};

const identityRoles = new Set(['identity-entity-id', 'identity-source-key']);
const normativePrefix = 'normative-';
const lowerHash = /^[0-9a-f]{64}$/;
const connector = /^(?:and|or)$/u;
const punctuation = /^[\p{P}\s]+$/u;

export type CsvSubspan = { startCodePoint: number; endCodePoint: number; textSha256: string };
type CsvGroup = {
  cells: string[];
  locators: { line: number; row: number }[];
  records: Array<{ cells: string[]; line: number; row: number }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cellLineBreaks(cell: string): number {
  let count = 0;
  for (let index = 0; index < cell.length; index += 1) if (cell.charCodeAt(index) === 10) count += 1;
  return count;
}

function bindingLocatorResolves(group: CsvGroup, columnIndex: number, entry: Record<string, unknown>): boolean {
  const { line, row, column } = entry;
  if (typeof line !== 'number' || !Number.isInteger(line) || typeof row !== 'number' || !Number.isInteger(row) || typeof column !== 'number' || !Number.isInteger(column)) return false;
  if (column !== columnIndex + 1) return false;
  return group.records.some((record) => {
    if (record.row !== row || columnIndex >= record.cells.length) return false;
    let start = record.line;
    for (let index = 0; index < columnIndex; index += 1) start += cellLineBreaks(record.cells[index] ?? '');
    return line >= start && line <= start + cellLineBreaks(record.cells[columnIndex] ?? '');
  });
}

function isSeparatorOnly(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === '' || connector.test(trimmed) || punctuation.test(trimmed);
}

function readSubspans(cell: Record<string, unknown>): { spans: CsvSubspan[]; malformed: boolean } {
  if (cell.subspans === undefined) return { spans: [], malformed: false };
  if (!Array.isArray(cell.subspans) || cell.subspans.length === 0) return { spans: [], malformed: true };
  const spans: CsvSubspan[] = [];
  let malformed = false;
  for (const raw of cell.subspans) {
    if (!isRecord(raw)) { malformed = true; continue; }
    const start = raw.startCodePoint;
    const end = raw.endCodePoint;
    const hash = raw.textSha256;
    if (typeof start !== 'number' || !Number.isInteger(start) || typeof end !== 'number' || !Number.isInteger(end) || typeof hash !== 'string' || !lowerHash.test(hash)) {
      malformed = true;
      continue;
    }
    spans.push({ startCodePoint: start, endCodePoint: end, textSha256: hash });
  }
  return { spans, malformed: malformed || spans.length !== cell.subspans.length };
}

function encode(value: string): string {
  return [...Buffer.from(value, 'utf8')].map((byte) => {
    const character = String.fromCharCode(byte);
    return /[A-Za-z0-9._~-]/.test(character) ? character : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
  }).join('');
}

function encodePath(value: string): string {
  return value.split('/').map(encode).join('/');
}

function rowKeyFor(input: {
  path: string;
  headersDigest: string;
  cells: string[];
  entityId?: string;
  sourceKey?: string;
  cellsDigest: string;
}): string {
  if (input.entityId !== undefined && input.sourceKey !== undefined) return `entityId=${encode(input.entityId)}&sourceKey=${encode(input.sourceKey)}`;
  if (input.entityId !== undefined) return `entityId=${encode(input.entityId)}`;
  if (input.sourceKey !== undefined) return `sourceKey=${encode(input.sourceKey)}`;
  return `path=${encodePath(input.path)}&headers=${input.headersDigest}&cells=${input.cellsDigest}`;
}

export function verifyFidelityReceipt(receipt: Record<string, unknown>, expected: {
  donor: string;
  path: string;
  rowKey: string;
  instructionId: string;
  variantId?: string;
  variantBodySha256?: string;
  cells: Array<{ columnIndex: number; cellHash: string; locator: Record<string, unknown>; locators: Array<Record<string, unknown>>; columnHeader?: string; role?: string; subspans?: CsvSubspan[] }>;
}): CsvIssue[] {
  const issues: CsvIssue[] = [];
  const issue = (code: string, message: string, details?: Record<string, unknown>): void => { issues.push(details === undefined ? { code, message } : { code, message, details }); };
  const variantId = expected.variantId ?? expected.instructionId;
  if (receipt.schema !== 'H2FidelityReceipt/v1' && receipt.schema !== 'H2FidelityReceipt/v2') issue('CORPUS_CSV_FIDELITY_INVALID', 'fidelity receipt schema marker is unsupported');
  if (receipt.instructionId !== variantId) issue('CORPUS_CSV_FIDELITY_INVALID', 'fidelity receipt instruction id does not match the bound variant', { expected: variantId, actual: receipt.instructionId });
  if (receipt.schema === 'H2FidelityReceipt/v2') {
    if (receipt.variantId !== variantId) issue('CORPUS_CSV_FIDELITY_INVALID', 'v2 fidelity receipt variantId does not match the binding', { expected: variantId, actual: receipt.variantId });
    if (expected.variantBodySha256 === undefined || receipt.variantBodySha256 !== expected.variantBodySha256) issue('CORPUS_CSV_FIDELITY_INVALID', 'v2 fidelity receipt variant body hash does not match the binding', { expected: expected.variantBodySha256, actual: receipt.variantBodySha256 });
  }
  const reviewer = isRecord(receipt.reviewer) ? receipt.reviewer : {};
  if (reviewer.kind !== 'human' && reviewer.kind !== 'delegated') issue('CORPUS_CSV_FIDELITY_INVALID', 'H2 fidelity requires reviewer.kind=human or delegated under SR-89 and D57');
  if (reviewer.kind === 'delegated' && (typeof reviewer.model !== 'string' || reviewer.model.trim() === '')) issue('CORPUS_CSV_FIDELITY_INVALID', 'delegated fidelity requires reviewer.model under D57');
  if (receipt.verdict !== 'READY') issue('CORPUS_CSV_FIDELITY_INVALID', 'fidelity receipt verdict must be READY');
  const source = isRecord(receipt.source) ? receipt.source : {};
  if (source.donor !== expected.donor || source.path !== expected.path || source.rowKey !== expected.rowKey) issue('CORPUS_CSV_FIDELITY_INVALID', 'fidelity receipt source does not match the binding');
  const cells = Array.isArray(source.cells) ? source.cells.filter(isRecord) : [];
  if (cells.length !== expected.cells.length) issue('CORPUS_CSV_FIDELITY_INVALID', 'fidelity receipt cell count does not match the binding');
  for (const [index, cell] of expected.cells.entries()) {
    const actual = cells[index];
    if (actual === undefined) continue;
    if (actual.columnIndex !== cell.columnIndex || actual.cellHash !== cell.cellHash) issue('CORPUS_CSV_FIDELITY_INVALID', `fidelity receipt cell ${index} does not match the binding`);
    if (actual.columnHeader !== undefined && cell.columnHeader !== undefined && actual.columnHeader !== cell.columnHeader) issue('CORPUS_CSV_FIDELITY_INVALID', `fidelity receipt cell ${index} column header does not match the binding`);
    if (actual.role !== undefined && cell.role !== undefined && actual.role !== cell.role) issue('CORPUS_CSV_FIDELITY_INVALID', `fidelity receipt cell ${index} role does not match the binding`);
    const locator = isRecord(actual.locator) ? actual.locator : {};
    if (locator.line !== cell.locator.line || locator.row !== cell.locator.row || locator.column !== cell.locator.column) issue('CORPUS_CSV_FIDELITY_INVALID', `fidelity receipt cell ${index} locator does not match the binding`);
    const actualLocators = Array.isArray(actual.locators) ? actual.locators.filter(isRecord) : [];
    if (actualLocators.length !== cell.locators.length) issue('CORPUS_CSV_FIDELITY_INVALID', `fidelity receipt cell ${index} locator list does not match the binding`, { expected: cell.locators.length, actual: actualLocators.length });
    else for (const [locatorIndex, expectedLocator] of cell.locators.entries()) {
      const actualLocator = actualLocators[locatorIndex]!;
      if (actualLocator.line !== expectedLocator.line || actualLocator.row !== expectedLocator.row || actualLocator.column !== expectedLocator.column) issue('CORPUS_CSV_FIDELITY_INVALID', `fidelity receipt cell ${index} locator ${locatorIndex} does not match the binding`);
    }
    const expectedSpans = cell.subspans ?? [];
    if (actual.subspans !== undefined && !Array.isArray(actual.subspans)) issue('CORPUS_CSV_FIDELITY_INVALID', `fidelity receipt cell ${index} subspans must be an array`);
    const actualSpans = Array.isArray(actual.subspans) ? actual.subspans.filter(isRecord) : [];
    if (expectedSpans.length > 0 && receipt.schema !== 'H2FidelityReceipt/v2') issue('CORPUS_CSV_FIDELITY_INVALID', `fidelity receipt cell ${index} must use H2FidelityReceipt/v2 for a subspan binding`);
    if (expectedSpans.length !== actualSpans.length) issue('CORPUS_CSV_FIDELITY_INVALID', `fidelity receipt cell ${index} subspan count does not match the binding`, { expected: expectedSpans.length, actual: actualSpans.length });
    else for (const [spanIndex, span] of expectedSpans.entries()) {
      const actualSpan = actualSpans[spanIndex]!;
      if (actualSpan.startCodePoint !== span.startCodePoint || actualSpan.endCodePoint !== span.endCodePoint || actualSpan.textSha256 !== span.textSha256) issue('CORPUS_CSV_FIDELITY_INVALID', `fidelity receipt cell ${index} subspan ${spanIndex} does not match the binding`);
    }
  }
  return issues;
}

export function checkCsvSource(input: CsvSourceInput): CsvIssue[] {
  const issues: CsvIssue[] = [];
  const issue = (code: string, message: string, details?: Record<string, unknown>): void => { issues.push(details === undefined ? { code, message } : { code, message, details }); };
  let parsed;
  try {
    parsed = parseCsv(input.bytes);
  } catch (error) {
    issue('CORPUS_CSV_INVALID', `CSV ${input.donor}:${input.path} cannot be parsed: ${error instanceof Error ? error.message : String(error)}`, { donor: input.donor, path: input.path });
    return issues;
  }
  const allowlist = input.allowlistEntry;
  if (allowlist === undefined) {
    issue('CORPUS_CSV_ALLOWLIST_MISSING', `CSV ${input.donor}:${input.path} has no allowlist entry`, { donor: input.donor, path: input.path });
  } else {
    if (allowlist.rawSha256 !== parsed.rawSha256) issue('CORPUS_CSV_HASH_MISMATCH', `CSV ${input.donor}:${input.path} raw hash does not match the allowlist`, { donor: input.donor, path: input.path });
    if (allowlist.headersDigest !== parsed.headersDigest) issue('CORPUS_CSV_HASH_MISMATCH', `CSV ${input.donor}:${input.path} header hash does not match the allowlist`, { donor: input.donor, path: input.path });
    if (input.source.rawSha256 !== parsed.rawSha256) issue('CORPUS_CSV_HASH_MISMATCH', `CSV ${input.donor}:${input.path} raw hash does not match the map`, { donor: input.donor, path: input.path });
    if (input.source.headersDigest !== parsed.headersDigest) issue('CORPUS_CSV_HASH_MISMATCH', `CSV ${input.donor}:${input.path} header hash does not match the map`, { donor: input.donor, path: input.path });
  }
  const columns = Array.isArray(input.source.columns) ? input.source.columns.filter(isRecord) : [];
  if (columns.length !== parsed.headers.length) issue('CORPUS_CSV_COLUMNS', `CSV ${input.donor}:${input.path} column count does not match the header`, { donor: input.donor, path: input.path });
  const normative = new Set<number>();
  const identity = new Map<string, number>();
  for (const [index, column] of columns.entries()) {
    if (column.index !== index || column.header !== parsed.headers[index]) issue('CORPUS_CSV_COLUMNS', `CSV ${input.donor}:${input.path} column ${index} does not match the header`, { donor: input.donor, path: input.path, index });
    const role = typeof column.role === 'string' ? column.role : '';
    if (role.startsWith(normativePrefix)) normative.add(index);
    if (identityRoles.has(role)) {
      if (identity.has(role)) issue('CORPUS_CSV_COLUMNS', `CSV ${input.donor}:${input.path} has a duplicate ${role} column`, { donor: input.donor, path: input.path, role });
      identity.set(role, index);
    }
  }
  if (normative.size === 0) issue('CORPUS_CSV_COLUMNS', `CSV ${input.donor}:${input.path} has no normative column`, { donor: input.donor, path: input.path });
  const groups = new Map<string, CsvGroup>();
  for (const row of parsed.rows) {
    const entityIndex = identity.get('identity-entity-id');
    const sourceIndex = identity.get('identity-source-key');
    const entityId = entityIndex === undefined ? undefined : row.cells[entityIndex];
    const sourceKey = sourceIndex === undefined ? undefined : row.cells[sourceIndex];
    const key = rowKeyFor({ path: input.path, headersDigest: parsed.headersDigest, cells: row.cells, cellsDigest: cellsDigest(row.cells), ...(entityId === undefined ? {} : { entityId }), ...(sourceKey === undefined ? {} : { sourceKey }) });
    const existing = groups.get(key);
    if (existing === undefined) groups.set(key, { cells: row.cells, locators: [...row.locators], records: [row] });
    else {
      existing.records.push(row);
      for (const locator of row.locators) if (!existing.locators.some((item) => item.line === locator.line && item.row === locator.row)) existing.locators.push(locator);
    }
  }
  const rows = Array.isArray(input.source.rows) ? input.source.rows.filter(isRecord) : [];
  const seenKeys = new Set<string>();
  for (const row of rows) {
    const key = typeof row.rowKey === 'string' ? row.rowKey : '';
    if (seenKeys.has(key)) issue('CORPUS_CSV_ROW_DUPLICATE', `CSV ${input.donor}:${input.path} has duplicate map row ${key}`, { donor: input.donor, path: input.path, rowKey: key });
    seenKeys.add(key);
  }
  for (const key of groups.keys()) if (!seenKeys.has(key)) issue('CORPUS_CSV_ROW_MISSING', `CSV ${input.donor}:${input.path} is missing map row ${key}`, { donor: input.donor, path: input.path, rowKey: key });
  for (const key of seenKeys) if (!groups.has(key)) issue('CORPUS_CSV_ROW_EXTRA', `CSV ${input.donor}:${input.path} has extra map row ${key}`, { donor: input.donor, path: input.path, rowKey: key });
  const byKey = new Map(rows.map((row) => [String(row.rowKey), row]));
  for (const row of rows) {
    const key = String(row.rowKey);
    const group = groups.get(key);
    if (group === undefined) continue;
    const hashes = group.cells.map(cellHash);
    if (JSON.stringify(row.cellHashes) !== JSON.stringify(hashes)) issue('CORPUS_CSV_HASH_MISMATCH', `CSV ${input.donor}:${input.path} row ${key} cell hashes do not match`, { donor: input.donor, path: input.path, rowKey: key });
    if (row.rowHash !== rowHash(key, parsed.headersDigest, hashes)) issue('CORPUS_CSV_HASH_MISMATCH', `CSV ${input.donor}:${input.path} row ${key} hash does not match`, { donor: input.donor, path: input.path, rowKey: key });
    const locators = Array.isArray(row.locators) ? row.locators.filter(isRecord) : [];
    for (const locator of group.locators) if (!locators.some((item) => item.line === locator.line && item.row === locator.row)) issue('CORPUS_CSV_LOCATOR_MISSING', `CSV ${input.donor}:${input.path} row ${key} is missing locator line ${locator.line}`, { donor: input.donor, path: input.path, rowKey: key, line: locator.line });
    const disposition = String(row.disposition);
    const bindings = Array.isArray(row.bindings) ? row.bindings.filter(isRecord) : [];
    if (disposition === 'admitted') {
      if (bindings.length === 0) issue('CORPUS_CSV_BINDING', `CSV ${input.donor}:${input.path} admitted row ${key} has no binding`, { donor: input.donor, path: input.path, rowKey: key });
      const covered = new Set<number>();
      const columnBinding = new Map<number, { whole: boolean; intervals: Array<{ start: number; end: number }>; text: string }>();
      for (const binding of bindings) {
        const instructionId = String(binding.instructionId);
        const variantId = typeof binding.variantId === 'string' ? binding.variantId : instructionId;
        if (input.variantFamilies !== undefined && typeof binding.variantId !== 'string') issue('CORPUS_CSV_BINDING', `CSV ${input.donor}:${input.path} row ${key} is missing variantId`, { donor: input.donor, path: input.path, rowKey: key, instruction_id: instructionId });
        if (!input.instructionIds.has(instructionId)) issue('CORPUS_CSV_BINDING', `CSV ${input.donor}:${input.path} row ${key} binds unknown instruction ${instructionId}`, { donor: input.donor, path: input.path, rowKey: key, instruction_id: instructionId });
        if (input.variantFamilies !== undefined) {
          const family = input.variantFamilies.get(variantId);
          const expectedFamily = input.familyIds?.has(instructionId) === true ? instructionId : undefined;
          if (expectedFamily !== undefined ? family !== expectedFamily : variantId !== instructionId) issue('CORPUS_CSV_BINDING', `CSV ${input.donor}:${input.path} row ${key} has a mismatched family/variant binding`, { donor: input.donor, path: input.path, rowKey: key, instruction_id: instructionId, variant_id: variantId });
          if (input.familyIds?.has(instructionId) !== true && variantId !== instructionId) issue('CORPUS_CSV_BINDING', `CSV ${input.donor}:${input.path} singleton binding must use the same instruction and variant id`, { donor: input.donor, path: input.path, rowKey: key, instruction_id: instructionId, variant_id: variantId });
        }
        const cells = Array.isArray(binding.cells) ? binding.cells.filter(isRecord) : [];
        for (const cell of cells) {
          const columnIndex = Number(cell.columnIndex);
          if (!normative.has(columnIndex)) issue('CORPUS_CSV_BINDING', `CSV ${input.donor}:${input.path} row ${key} binds a non-normative column ${columnIndex}`, { donor: input.donor, path: input.path, rowKey: key, column: columnIndex });
          covered.add(columnIndex);
          if (cell.cellHash !== hashes[columnIndex]) issue('CORPUS_CSV_HASH_MISMATCH', `CSV ${input.donor}:${input.path} row ${key} cell ${columnIndex} hash does not match`, { donor: input.donor, path: input.path, rowKey: key, column: columnIndex });
          const locator = isRecord(cell.locator) ? cell.locator : undefined;
          if (locator === undefined || !bindingLocatorResolves(group, columnIndex, locator)) issue('CORPUS_CSV_LOCATOR_MISSING', `CSV ${input.donor}:${input.path} row ${key} cell ${columnIndex} locator does not resolve`, { donor: input.donor, path: input.path, rowKey: key, column: columnIndex });
          const cellLocators = Array.isArray(cell.locators) ? cell.locators : [];
          if (cellLocators.length === 0) issue('CORPUS_CSV_LOCATOR_MISSING', `CSV ${input.donor}:${input.path} row ${key} cell ${columnIndex} has no locators list`, { donor: input.donor, path: input.path, rowKey: key, column: columnIndex });
          for (const item of cellLocators) {
            const entry = isRecord(item) ? item : undefined;
            if (entry === undefined || !bindingLocatorResolves(group, columnIndex, entry)) issue('CORPUS_CSV_LOCATOR_MISSING', `CSV ${input.donor}:${input.path} row ${key} cell ${columnIndex} locators entry does not resolve`, { donor: input.donor, path: input.path, rowKey: key, column: columnIndex });
          }
          const cellText = group.cells[columnIndex] ?? '';
          const points = [...cellText];
          const { spans, malformed } = readSubspans(cell);
          if (malformed) issue('CORPUS_CSV_BINDING', `CSV ${input.donor}:${input.path} row ${key} cell ${columnIndex} has malformed subspans`, { donor: input.donor, path: input.path, rowKey: key, column: columnIndex });
          const entry = columnBinding.get(columnIndex) ?? { whole: false, intervals: [], text: cellText };
          if (cell.subspans === undefined) {
            entry.whole = true;
          } else {
            let previousEnd = -1;
            for (const [spanIndex, span] of spans.entries()) {
              if (span.startCodePoint < 0 || span.endCodePoint <= span.startCodePoint || span.endCodePoint > points.length) {
                issue('CORPUS_CSV_BINDING', `CSV ${input.donor}:${input.path} row ${key} cell ${columnIndex} subspan ${spanIndex} is out of bounds`, { donor: input.donor, path: input.path, rowKey: key, column: columnIndex, startCodePoint: span.startCodePoint, endCodePoint: span.endCodePoint, codePoints: points.length });
                continue;
              }
              if (span.startCodePoint < previousEnd) issue('CORPUS_CSV_BINDING', `CSV ${input.donor}:${input.path} row ${key} cell ${columnIndex} subspan ${spanIndex} overlaps or is out of order`, { donor: input.donor, path: input.path, rowKey: key, column: columnIndex, startCodePoint: span.startCodePoint, previousEnd });
              previousEnd = Math.max(previousEnd, span.endCodePoint);
              const spanText = points.slice(span.startCodePoint, span.endCodePoint).join('');
              if (sha256Bytes(spanText) !== span.textSha256) issue('CORPUS_CSV_HASH_MISMATCH', `CSV ${input.donor}:${input.path} row ${key} cell ${columnIndex} subspan ${spanIndex} hash does not match`, { donor: input.donor, path: input.path, rowKey: key, column: columnIndex, startCodePoint: span.startCodePoint, endCodePoint: span.endCodePoint });
            }
            entry.intervals.push(...spans.map((span) => ({ start: span.startCodePoint, end: span.endCodePoint })));
          }
          columnBinding.set(columnIndex, entry);
        }
        const fidelity = isRecord(binding.fidelity) ? binding.fidelity : {};
        const receiptPath = typeof fidelity.path === 'string' ? fidelity.path : '';
        const receiptSha = typeof fidelity.sha256 === 'string' ? fidelity.sha256 : '';
        const artifact = input.receipts?.get(receiptPath);
        if (artifact === undefined) {
          issue('CORPUS_CSV_FIDELITY_MISSING', `CSV ${input.donor}:${input.path} row ${key} binding ${instructionId} has no readable fidelity receipt`, { donor: input.donor, path: input.path, rowKey: key, instruction_id: instructionId, receipt: receiptPath });
        } else if (artifact.sha256 !== receiptSha) {
          issue('CORPUS_CSV_FIDELITY_INVALID', `CSV ${input.donor}:${input.path} row ${key} binding ${instructionId} fidelity hash does not match`, { donor: input.donor, path: input.path, rowKey: key, instruction_id: instructionId });
        } else {
          const bodyHash = input.variantBodyHashes?.get(variantId);
          issues.push(...verifyFidelityReceipt(artifact.value, {
            donor: input.donor,
            path: input.path,
            rowKey: key,
            instructionId,
            ...(input.variantFamilies === undefined ? {} : { variantId }),
            ...(bodyHash === undefined ? {} : { variantBodySha256: bodyHash }),
            cells: cells.map((cell) => {
              const { spans } = readSubspans(cell);
              return {
                columnIndex: Number(cell.columnIndex),
                cellHash: String(cell.cellHash),
                locator: isRecord(cell.locator) ? cell.locator : {},
                locators: Array.isArray(cell.locators) ? cell.locators.filter(isRecord) : [],
                ...(typeof cell.columnHeader === 'string' ? { columnHeader: cell.columnHeader } : {}),
                ...(typeof cell.role === 'string' ? { role: cell.role } : {}),
                ...(cell.subspans === undefined ? {} : { subspans: spans }),
              };
            }),
          }));
        }
      }
      for (const [columnIndex, entry] of columnBinding) {
        if (entry.whole && entry.intervals.length > 0) issue('CORPUS_CSV_BINDING', `CSV ${input.donor}:${input.path} row ${key} column ${columnIndex} mixes whole-cell and subspan binding`, { donor: input.donor, path: input.path, rowKey: key, column: columnIndex });
        if (entry.intervals.length === 0) continue;
        const points = [...entry.text];
        const sorted = [...entry.intervals].sort((left, right) => left.start - right.start || left.end - right.end);
        let cursor = 0;
        for (const interval of sorted) {
          if (interval.start > cursor && !isSeparatorOnly(points.slice(cursor, interval.start).join(''))) issue('CORPUS_CSV_BINDING', `CSV ${input.donor}:${input.path} row ${key} column ${columnIndex} leaves non-separator text unbound`, { donor: input.donor, path: input.path, rowKey: key, column: columnIndex, startCodePoint: cursor, endCodePoint: interval.start });
          cursor = Math.max(cursor, interval.end);
        }
        if (cursor < points.length && !isSeparatorOnly(points.slice(cursor).join(''))) issue('CORPUS_CSV_BINDING', `CSV ${input.donor}:${input.path} row ${key} column ${columnIndex} leaves non-separator text unbound`, { donor: input.donor, path: input.path, rowKey: key, column: columnIndex, startCodePoint: cursor, endCodePoint: points.length });
      }
      for (const column of normative) if (!covered.has(column)) issue('CORPUS_CSV_BINDING', `CSV ${input.donor}:${input.path} admitted row ${key} leaves normative column ${column} unbound`, { donor: input.donor, path: input.path, rowKey: key, column });
    }
    if (disposition === 'merged') {
      const target = isRecord(row.mergedInto) ? String(row.mergedInto.rowKey) : '';
      const targetRow = byKey.get(target);
      if (targetRow === undefined || targetRow.disposition !== 'admitted') issue('CORPUS_CSV_MERGE', `CSV ${input.donor}:${input.path} merged row ${key} has no admitted target`, { donor: input.donor, path: input.path, rowKey: key, target });
      else {
        const targetCells = new Set<number>();
        for (const binding of Array.isArray(targetRow.bindings) ? targetRow.bindings.filter(isRecord) : []) {
          for (const cell of Array.isArray(binding.cells) ? binding.cells.filter(isRecord) : []) targetCells.add(Number(cell.columnIndex));
        }
        for (const column of normative) if (!targetCells.has(column)) issue('CORPUS_CSV_MERGE', `CSV ${input.donor}:${input.path} merged row ${key} target does not cover column ${column}`, { donor: input.donor, path: input.path, rowKey: key, column });
      }
    }
    if ((disposition === 'rejected' || disposition === 'deferred') && (typeof row.reason !== 'string' || row.reason.trim() === '')) {
      issue('CORPUS_CSV_DISPOSITION', `CSV ${input.donor}:${input.path} row ${key} needs a reason`, { donor: input.donor, path: input.path, rowKey: key });
    }
  }
  return issues;
}
