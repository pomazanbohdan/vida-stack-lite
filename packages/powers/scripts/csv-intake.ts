import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';

export type CsvErrorCode = 'invalid-format' | 'invalid-schema';

export class CsvError extends Error {
  readonly code: CsvErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: CsvErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'CsvError';
    this.code = code;
    this.details = details;
  }
}

export type CsvLocator = { line: number; row: number };
export type CsvRecord = { cells: string[]; line: number; row: number; locators: CsvLocator[] };
export type ParsedCsv = { headers: string[]; rows: CsvRecord[]; headersDigest: string; rawSha256: string };

const MAX_BYTES = 16 * 1024 * 1024;
const MAX_ROWS = 100_000;
const MAX_COLUMNS = 512;
const MAX_CELL_BYTES = 1024 * 1024;

function fail(message: string, details: Record<string, unknown> = {}): never {
  throw new CsvError('invalid-format', message, details);
}

export function sha256Bytes(value: Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function headersDigest(headers: string[]): string {
  return sha256Bytes(JSON.stringify(headers));
}

export function cellHash(value: string): string {
  return sha256Bytes(Buffer.from(value, 'utf8'));
}

export function cellsDigest(cells: string[]): string {
  return sha256Bytes(JSON.stringify(cells));
}

export function rowHash(rowKey: string, headers: string, cellHashes: string[]): string {
  return sha256Bytes(JSON.stringify([rowKey, headers, cellHashes]));
}

function decode(bytes: Uint8Array): string {
  if (bytes.length > MAX_BYTES) fail(`CSV exceeds ${MAX_BYTES} bytes`, { bytes: bytes.length });
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) fail('CSV must not start with a BOM');
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    fail('CSV is not valid UTF-8');
  }
}

export function parseCsv(bytes: Uint8Array): ParsedCsv {
  const text = decode(bytes);
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '\r' && text[index + 1] !== '\n') fail('a lone CR is not allowed', { offset: index });
  }
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let field = '';
  let inQuotes = false;
  let quoted = false;
  let line = 1;
  let recordLine = 1;
  let locators: CsvLocator[] = [{ line: 1, row: 0 }];
  let started = false;
  let index = 0;
  const pushField = (): void => {
    if (field.length > MAX_CELL_BYTES) fail('a cell exceeds 1 MiB', { line, bytes: field.length });
    if (quoted && field === '' && cells.length === 0) fail('empty quoted header', { line });
    cells.push(field);
    field = '';
    quoted = false;
  };
  const pushRecord = (): void => {
    if (cells.length === 0 && field === '' && !quoted) fail('empty CSV record', { line });
    pushField();
    records.push({ cells, line: recordLine, row: records.length, locators });
    cells = [];
    field = '';
    quoted = false;
    started = false;
    recordLine = line + 1;
    locators = [{ line: recordLine, row: records.length }];
  };
  while (index < text.length) {
    const character = text[index]!;
    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }
      if (character === '\n') {
        line += 1;
        locators.push({ line, row: records.length });
        field += '\n';
        index += 1;
        continue;
      }
      if (character === '\r' && text[index + 1] === '\n') {
        line += 1;
        locators.push({ line, row: records.length });
        field += '\r\n';
        index += 2;
        continue;
      }
      field += character;
      index += 1;
      continue;
    }
    if (character === '"') {
      if (field !== '') fail('a quote may only start a quoted field', { line });
      inQuotes = true;
      quoted = true;
      started = true;
      index += 1;
      continue;
    }
    if (character === ',') {
      pushField();
      started = true;
      index += 1;
      continue;
    }
    if (character === '\n') {
      pushRecord();
      line += 1;
      index += 1;
      continue;
    }
    if (character === '\r' && text[index + 1] === '\n') {
      pushRecord();
      line += 1;
      index += 2;
      continue;
    }
    if (character === '\r') fail('a lone CR is not allowed', { line });
    field += character;
    started = true;
    index += 1;
  }
  if (inQuotes) fail('unterminated quoted field', { line });
  if (started) pushRecord();
  if (records.length === 0) fail('CSV has no header');
  const headers = records[0]!.cells;
  if (headers.length === 0) fail('CSV has no header');
  if (headers.length > MAX_COLUMNS) fail(`CSV exceeds ${MAX_COLUMNS} columns`, { columns: headers.length });
  const seen = new Set<string>();
  for (const header of headers) {
    if (header.trim() === '') fail('CSV contains an empty header', { header });
    if (seen.has(header)) fail('CSV contains duplicate headers', { header });
    seen.add(header);
  }
  const rows = records.slice(1);
  if (rows.length > MAX_ROWS) fail(`CSV exceeds ${MAX_ROWS} data rows`, { rows: rows.length });
  for (const row of rows) {
    if (row.cells.length !== headers.length) fail('row width does not match the header', { line: row.line, expected: headers.length, actual: row.cells.length });
  }
  return { headers, rows, headersDigest: headersDigest(headers), rawSha256: sha256Bytes(bytes) };
}
