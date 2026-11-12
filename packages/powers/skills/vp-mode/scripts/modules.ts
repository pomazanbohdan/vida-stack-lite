import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { parseFrontmatter } from './frontmatter.ts';

export type ModuleSource = { donor: string; path: string };
export type ModuleAtomRecord = { atom_id: string; file_sha256: string; content_sha256: string; file_bytes: number; body_bytes: number };
export type ModuleRecord = {
  schema: 'VPInstructionModule/v1';
  instruction_id: string;
  title: string;
  summary: string;
  source: string;
  atom_ids: string[];
  atom_count: number;
  atoms: string;
  carrier_sha256: string;
  carrier_bytes: number;
  revision: number;
  status: 'active' | 'disabled';
};
export type ParsedModuleAtom = {
  atom_id: string;
  file: string;
  frontmatter: Record<string, unknown>;
  body: string;
  file_sha256: string;
  content_sha256: string;
  file_bytes: number;
  body_bytes: number;
};
export type ParsedModule = { record: ModuleRecord; source: ModuleSource; atoms: ModuleAtomRecord[]; members: ParsedModuleAtom[]; body: string };

export type ModuleErrorCode =
  | 'MODULE_SOURCE_INVALID'
  | 'MODULE_ATOMS_INVALID'
  | 'MODULE_RECORD_INVALID'
  | 'MODULE_SECTION_INVALID'
  | 'MODULE_HASH_MISMATCH'
  | 'MODULE_ATOM_INVALID';

export class ModuleError extends Error {
  readonly code: ModuleErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: ModuleErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ModuleError';
    this.code = code;
    this.details = details;
  }
}

const atomIdPattern = /^(?!module-|family-)[a-z0-9]+(?:-[a-z0-9]+)*$/;
const moduleIdPattern = /^module-[a-z0-9]+(?:-[a-z0-9]+)*-c[0-9]{2}$/;
const sha256Pattern = /^[0-9a-f]{64}$/;
const sourceKeys = ['donor', 'path'];
const atomKeys = ['atom_id', 'file_sha256', 'content_sha256', 'file_bytes', 'body_bytes'];
const recordKeys = ['schema', 'instruction_id', 'title', 'summary', 'source', 'atom_ids', 'atom_count', 'atoms', 'carrier_sha256', 'carrier_bytes', 'revision', 'status'];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, expected: string[]): boolean => {
  const actual = Object.keys(value);
  return actual.length === expected.length && expected.every((key) => Object.prototype.hasOwnProperty.call(value, key));
};
const compactJson = (raw: string, code: ModuleErrorCode, label: string): unknown => {
  try {
    const value = JSON.parse(raw) as unknown;
    if (JSON.stringify(value) !== raw) throw new Error('JSON must use compact canonical serialization');
    return value;
  } catch (error) {
    throw new ModuleError(code, `${label} must be compact JSON`, { message: error instanceof Error ? error.message : String(error) });
  }
};
const hash = (text: string): string => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
const byteLength = (text: string): number => Buffer.byteLength(text, 'utf8');

export function extractModuleBody(text: string): string {
  const source = text.startsWith('\uFEFF') ? text.slice(1) : text;
  let cursor = 0;
  let lineNumber = 0;
  while (cursor < source.length) {
    const newline = source.indexOf('\n', cursor);
    const end = newline < 0 ? source.length : newline;
    const line = source.slice(cursor, end).replace(/\r$/u, '');
    if (lineNumber === 0 && line.trimEnd() !== '---') throw new ModuleError('MODULE_RECORD_INVALID', 'module frontmatter opening delimiter is missing');
    if (lineNumber > 0 && line.trimEnd() === '---') return newline < 0 ? '' : source.slice(newline + 1);
    if (newline < 0) break;
    cursor = newline + 1;
    lineNumber += 1;
  }
  throw new ModuleError('MODULE_RECORD_INVALID', 'module frontmatter closing delimiter is missing');
}

export function parseModuleSource(raw: string): ModuleSource {
  const value = compactJson(raw, 'MODULE_SOURCE_INVALID', 'module source');
  if (!isRecord(value) || !exactKeys(value, sourceKeys)
    || typeof value.donor !== 'string' || value.donor.trim() === ''
    || typeof value.path !== 'string' || value.path.trim() === ''
    || value.donor !== value.donor.trim() || value.path !== value.path.trim()
    || value.path.startsWith('/') || value.path.includes('\\')
    || value.path.split('/').some((part) => part === '' || part === '.' || part === '..')) {
    throw new ModuleError('MODULE_SOURCE_INVALID', 'module source must contain a donor and a relative slash path', { value });
  }
  return { donor: value.donor, path: value.path };
}

export function parseModuleAtoms(raw: string): ModuleAtomRecord[] {
  const value = compactJson(raw, 'MODULE_ATOMS_INVALID', 'module atoms');
  if (!Array.isArray(value) || value.length < 2 || value.length > 8) {
    throw new ModuleError('MODULE_ATOMS_INVALID', 'module atoms must contain 2..8 records', { count: Array.isArray(value) ? value.length : undefined });
  }
  const ids = new Set<string>();
  return value.map((item, index): ModuleAtomRecord => {
    if (!isRecord(item) || !exactKeys(item, atomKeys)
      || typeof item.atom_id !== 'string' || !atomIdPattern.test(item.atom_id)
      || typeof item.file_sha256 !== 'string' || !sha256Pattern.test(item.file_sha256)
      || typeof item.content_sha256 !== 'string' || !sha256Pattern.test(item.content_sha256)
      || !Number.isSafeInteger(item.file_bytes) || (item.file_bytes as number) < 1
      || !Number.isSafeInteger(item.body_bytes) || (item.body_bytes as number) < 0) {
      throw new ModuleError('MODULE_ATOMS_INVALID', 'module atom record has invalid shape, id, hash, or byte count', { index, item });
    }
    const atomId = item.atom_id;
    if (ids.has(atomId)) throw new ModuleError('MODULE_ATOMS_INVALID', 'module atoms contain a duplicate atom id', { atom_id: atomId, index });
    ids.add(atomId);
    return {
      atom_id: atomId,
      file_sha256: item.file_sha256,
      content_sha256: item.content_sha256,
      file_bytes: item.file_bytes as number,
      body_bytes: item.body_bytes as number,
    };
  });
}

export function validateModuleRecord(value: unknown, moduleId: string): ModuleRecord {
  if (!isRecord(value) || !exactKeys(value, recordKeys)
    || value.schema !== 'VPInstructionModule/v1'
    || typeof value.instruction_id !== 'string' || value.instruction_id !== moduleId || !moduleIdPattern.test(moduleId)
    || typeof value.title !== 'string' || value.title.trim() === ''
    || typeof value.summary !== 'string' || value.summary.trim() === ''
    || typeof value.source !== 'string'
    || !Array.isArray(value.atom_ids) || value.atom_ids.length < 2 || value.atom_ids.length > 8
    || value.atom_ids.some((id) => typeof id !== 'string' || !atomIdPattern.test(id))
    || new Set(value.atom_ids).size !== value.atom_ids.length
    || !Number.isSafeInteger(value.atom_count) || (value.atom_count as number) < 2 || (value.atom_count as number) > 8
    || typeof value.atoms !== 'string'
    || typeof value.carrier_sha256 !== 'string' || !sha256Pattern.test(value.carrier_sha256)
    || !Number.isSafeInteger(value.carrier_bytes) || (value.carrier_bytes as number) < 0
    || !Number.isSafeInteger(value.revision) || (value.revision as number) < 1
    || (value.status !== 'active' && value.status !== 'disabled')) {
    throw new ModuleError('MODULE_RECORD_INVALID', 'module frontmatter has invalid closed shape, identity, or counts', { module_id: moduleId });
  }
  const source = parseModuleSource(value.source);
  const atoms = parseModuleAtoms(value.atoms);
  const atomIds = value.atom_ids as string[];
  if ((value.atom_count as number) !== atomIds.length || atoms.length !== atomIds.length || atoms.some((atom, index) => atom.atom_id !== atomIds[index])) {
    throw new ModuleError('MODULE_RECORD_INVALID', 'module atom_ids, atoms, and atom_count must agree in order', { module_id: moduleId, atom_ids: atomIds, record_ids: atoms.map((atom) => atom.atom_id), atom_count: value.atom_count });
  }
  return {
    schema: 'VPInstructionModule/v1', instruction_id: moduleId, title: value.title, summary: value.summary,
    source: value.source, atom_ids: [...atomIds], atom_count: value.atom_count as number, atoms: value.atoms,
    carrier_sha256: value.carrier_sha256, carrier_bytes: value.carrier_bytes as number,
    revision: value.revision as number, status: value.status,
  };
}

export function parseModuleSections(body: string, records: ModuleAtomRecord[], moduleId: string): ParsedModuleAtom[] {
  if (body.includes('\r')) throw new ModuleError('MODULE_SECTION_INVALID', 'module sections must use LF line endings only', { module_id: moduleId });
  if (records.length < 2 || records.length > 8) throw new ModuleError('MODULE_SECTION_INVALID', 'module sections require 2..8 declared atoms', { module_id: moduleId, count: records.length });
  const members: ParsedModuleAtom[] = [];
  let cursor = 0;
  for (const [index, record] of records.entries()) {
    const begin = `<!-- vpmodule:atom:begin ${record.atom_id} -->`;
    const end = `<!-- vpmodule:atom:end ${record.atom_id} -->`;
    if (!body.startsWith(`${begin}\n`, cursor)) throw new ModuleError('MODULE_SECTION_INVALID', 'module begin marker is missing, out of order, or has surrounding text', { module_id: moduleId, atom_id: record.atom_id, index });
    const payloadStart = cursor + begin.length + 1;
    const endAt = body.indexOf(end, payloadStart);
    if (endAt < 0 || (endAt > 0 && body[endAt - 1] !== '\n')) throw new ModuleError('MODULE_SECTION_INVALID', 'module end marker is missing or is not on its own line', { module_id: moduleId, atom_id: record.atom_id, index });
    const payload = body.slice(payloadStart, endAt);
    if (!payload.endsWith('\n')) throw new ModuleError('MODULE_SECTION_INVALID', 'module atom payload must end with LF', { module_id: moduleId, atom_id: record.atom_id });
    if (/<!--\s*(?:vpmodule:|sbvf:variant:)/u.test(payload)) throw new ModuleError('MODULE_SECTION_INVALID', 'module atom payload contains a nested module or variant marker', { module_id: moduleId, atom_id: record.atom_id });
    const actualFileHash = hash(payload);
    if (actualFileHash !== record.file_sha256) throw new ModuleError('MODULE_HASH_MISMATCH', 'module atom file hash does not match payload', { module_id: moduleId, atom_id: record.atom_id, expected: record.file_sha256, actual: actualFileHash });
    if (byteLength(payload) !== record.file_bytes) throw new ModuleError('MODULE_HASH_MISMATCH', 'module atom file byte count does not match payload', { module_id: moduleId, atom_id: record.atom_id, expected: record.file_bytes, actual: byteLength(payload) });
    let parsed: ReturnType<typeof parseFrontmatter>;
    try { parsed = parseFrontmatter(payload); }
    catch (error) { throw new ModuleError('MODULE_ATOM_INVALID', 'module atom payload has invalid nested frontmatter', { module_id: moduleId, atom_id: record.atom_id, message: error instanceof Error ? error.message : String(error) }); }
    if ((parsed.data.schema !== 'VPInstruction/v1.2' && parsed.data.schema !== 'VPInstruction/v2') || parsed.data.instruction_id !== record.atom_id) {
      throw new ModuleError('MODULE_ATOM_INVALID', 'module atom nested schema or instruction_id is invalid', { module_id: moduleId, atom_id: record.atom_id, schema: parsed.data.schema, actual_id: parsed.data.instruction_id });
    }
    const actualContentHash = hash(parsed.body);
    if (actualContentHash !== record.content_sha256) throw new ModuleError('MODULE_HASH_MISMATCH', 'module atom content hash does not match nested body', { module_id: moduleId, atom_id: record.atom_id, expected: record.content_sha256, actual: actualContentHash });
    if (byteLength(parsed.body) !== record.body_bytes) throw new ModuleError('MODULE_HASH_MISMATCH', 'module atom body byte count does not match nested body', { module_id: moduleId, atom_id: record.atom_id, expected: record.body_bytes, actual: byteLength(parsed.body) });
    members.push({ atom_id: record.atom_id, file: payload, frontmatter: parsed.data, body: parsed.body, file_sha256: actualFileHash, content_sha256: actualContentHash, file_bytes: record.file_bytes, body_bytes: record.body_bytes });
    const afterEnd = endAt + end.length;
    if (index + 1 < records.length) {
      if (body[afterEnd] !== '\n') throw new ModuleError('MODULE_SECTION_INVALID', 'module section markers must be adjacent without outside text', { module_id: moduleId, atom_id: record.atom_id });
      cursor = afterEnd + 1;
    } else if (afterEnd !== body.length && !(afterEnd === body.length - 1 && body[afterEnd] === '\n')) {
      throw new ModuleError('MODULE_SECTION_INVALID', 'module has text after its final atom section', { module_id: moduleId, atom_id: record.atom_id });
    }
  }
  return members;
}

export function parseModule(recordValue: unknown, body: string, moduleId: string): ParsedModule {
  const record = validateModuleRecord(recordValue, moduleId);
  const source = parseModuleSource(record.source);
  const atoms = parseModuleAtoms(record.atoms);
  const members = parseModuleSections(body, atoms, moduleId);
  const actualBodyHash = hash(body);
  if (actualBodyHash !== record.carrier_sha256) throw new ModuleError('MODULE_HASH_MISMATCH', 'module carrier body hash does not match', { module_id: moduleId, expected: record.carrier_sha256, actual: actualBodyHash });
  if (byteLength(body) !== record.carrier_bytes) throw new ModuleError('MODULE_HASH_MISMATCH', 'module carrier body byte count does not match', { module_id: moduleId, expected: record.carrier_bytes, actual: byteLength(body) });
  return { record, source, atoms, members, body };
}
