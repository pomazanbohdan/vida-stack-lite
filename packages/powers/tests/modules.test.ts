import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { describe, expect, test } from 'bun:test';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import {
  extractModuleBody,
  ModuleError,
  parseModule,
  parseModuleAtoms,
  parseModuleSections,
  parseModuleSource,
  validateModuleRecord,
} from '../skills/vp-mode/scripts/modules.ts';

const digest = (value: string): string => createHash('sha256').update(Buffer.from(value, 'utf8')).digest('hex');
const atomFile = (id: string, schema = 'VPInstruction/v1.2', body = `# ${id}\n`): string => `---\nschema: ${schema}\ninstruction_id: ${id}\n---\n${body}`;

function recordsFor(atomIds: string[], files: string[]) {
  return files.map((file, index) => {
    const body = parseFrontmatter(file).body;
    return {
      atom_id: atomIds[index] as string, file_sha256: digest(file), content_sha256: digest(body),
      file_bytes: Buffer.byteLength(file, 'utf8'), body_bytes: Buffer.byteLength(body, 'utf8'),
    };
  });
}

function sectionsFor(records: Array<{ atom_id: string }>, files: string[]): string {
  return records.map((record, index) => `<!-- vpmodule:atom:begin ${record.atom_id} -->\n${files[index]}<!-- vpmodule:atom:end ${record.atom_id} -->`).join('\n');
}

function fixture(atomIds = ['alpha-atom', 'beta-atom']): { record: Record<string, unknown>; body: string; files: string[] } {
  const files = atomIds.map((id) => atomFile(id));
  const atoms = recordsFor(atomIds, files);
  const body = sectionsFor(atoms, files);
  const record = {
    schema: 'VPInstructionModule/v1', instruction_id: 'module-sample-c01', title: 'Sample module', summary: 'Packaging carrier.',
    source: JSON.stringify({ donor: 'sample', path: 'agents/source.md' }), atom_ids: [...atomIds], atom_count: atomIds.length,
    atoms: JSON.stringify(atoms), carrier_sha256: digest(body), carrier_bytes: Buffer.byteLength(body, 'utf8'), revision: 1, status: 'active',
  };
  return { record, body, files };
}

function expectModuleError(action: () => unknown, code: string): void {
  expect(action).toThrow(expect.objectContaining({ code }));
}

describe('source module parser', () => {
  test('rejects non-string source and atoms payloads and malformed atom records', () => {
    expectModuleError(() => parseModuleSource(17 as unknown as string), 'MODULE_SOURCE_INVALID');
    expectModuleError(() => parseModuleAtoms({} as unknown as string), 'MODULE_ATOMS_INVALID');
    expectModuleError(() => parseModuleAtoms(JSON.stringify([
      { atom_id: 'alpha-atom', file_sha256: 'a'.repeat(64), content_sha256: 'b'.repeat(64), file_bytes: 1, body_bytes: 0 },
      { atom_id: 'beta-atom', file_sha256: 'bad', content_sha256: 'b'.repeat(64), file_bytes: 1, body_bytes: 0 },
    ])), 'MODULE_ATOMS_INVALID');
    expectModuleError(() => extractModuleBody('---\nschema: VPInstructionModule/v1\n'), 'MODULE_RECORD_INVALID');
  });

  test('parses compact packaging source and ordered atom records', () => {
    expect(parseModuleSource('{"donor":"sample","path":"agents/source.md"}')).toEqual({ donor: 'sample', path: 'agents/source.md' });
    expect(parseModuleAtoms(fixture().record.atoms as string)).toHaveLength(2);
    expect(() => parseModuleSource('{"donor": "sample", "path":"agents/source.md"}')).toThrow(ModuleError);
    expect(() => parseModuleSource('{"donor":"sample","path":"../outside.md"}')).toThrow(ModuleError);
  });

  test('rejects closed-shape, identity, hash, duplicate and count errors', () => {
    const valid = fixture();
    expect(validateModuleRecord(valid.record, 'module-sample-c01').atom_count).toBe(2);
    const extraSource = '{"donor":"sample","path":"agents/source.md","extra":1}';
    expect(() => parseModuleSource(extraSource)).toThrow(ModuleError);
    for (const atomIds of [['one-atom'], Array.from({ length: 9 }, (_, i) => `atom-${i}`), ['same-atom', 'same-atom']]) {
      const atoms = atomIds.map((atom_id) => ({ atom_id, file_sha256: 'a'.repeat(64), content_sha256: 'b'.repeat(64), file_bytes: 1, body_bytes: 0 }));
      expect(() => parseModuleAtoms(JSON.stringify(atoms))).toThrow(ModuleError);
    }
    expect(() => validateModuleRecord(valid.record, 'module-other-c01')).toThrow(ModuleError);
    expect(() => validateModuleRecord({ ...valid.record, extra: true }, 'module-sample-c01')).toThrow(ModuleError);
    expect(() => validateModuleRecord({ ...valid.record, atom_count: 3 }, 'module-sample-c01')).toThrow(ModuleError);
  });

  test('parses sections in declared order and verifies complete atom and carrier bytes', () => {
    const valid = fixture();
    const parsed = parseModule(valid.record, valid.body, 'module-sample-c01');
    expect(parsed.members.map((member) => member.atom_id)).toEqual(['alpha-atom', 'beta-atom']);
    expect(parsed.members.map((member) => member.file)).toEqual(valid.files);
    expect(parsed.members[0]?.body).toBe('# alpha-atom\n');
    expect(parsed.source).toEqual({ donor: 'sample', path: 'agents/source.md' });
  });

  test('rejects missing, duplicate, reordered, outside, CRLF, nested and malformed sections', () => {
    const valid = fixture();
    const records = parseModuleAtoms(valid.record.atoms as string);
    const reordered = sectionsFor(records.slice().reverse(), valid.files.slice().reverse());
    expectModuleError(() => parseModuleSections(`${valid.body}outside`, records, 'module-sample-c01'), 'MODULE_SECTION_INVALID');
    expectModuleError(() => parseModuleSections(reordered, records, 'module-sample-c01'), 'MODULE_SECTION_INVALID');
    expectModuleError(() => parseModuleSections(`${valid.body.replace('<!-- vpmodule:atom:end alpha-atom -->', '<!-- vpmodule:atom:end alpha-atom -->\n<!-- vpmodule:atom:end alpha-atom -->')}`, records, 'module-sample-c01'), 'MODULE_SECTION_INVALID');
    expectModuleError(() => parseModuleSections(`${valid.body.replace('<!-- vpmodule:atom:begin alpha-atom -->', '')}`, records, 'module-sample-c01'), 'MODULE_SECTION_INVALID');
    expectModuleError(() => parseModuleSections(valid.body.replaceAll('\n', '\r\n'), records, 'module-sample-c01'), 'MODULE_SECTION_INVALID');
    const nested = fixture();
    nested.files[0] = `${nested.files[0]}<!-- sbvf:variant:begin nested -->\n`;
    const badRecords = parseModuleAtoms(nested.record.atoms as string);
    expectModuleError(() => parseModuleSections(nested.body.replace(fixture().files[0]!, nested.files[0]!), badRecords, 'module-sample-c01'), 'MODULE_SECTION_INVALID');
    const nestedModule = fixture();
    nestedModule.files[0] = `${nestedModule.files[0]}<!-- vpmodule:atom:begin nested-atom -->\n`;
    const nestedRecords = recordsFor(['alpha-atom', 'beta-atom'], nestedModule.files);
    expectModuleError(() => parseModuleSections(sectionsFor(nestedRecords, nestedModule.files), nestedRecords, 'module-sample-c01'), 'MODULE_SECTION_INVALID');
  });

  test('rejects nested schema and ID mismatch, payload hash and body byte mismatches', () => {
    const valid = fixture();
    const records = parseModuleAtoms(valid.record.atoms as string);
    const missingSchema = atomFile('alpha-atom', 'VPInstruction/v9');
    const schemaFiles = [missingSchema, valid.files[1]!];
    expectModuleError(() => parseModuleSections(sectionsFor(recordsFor(['alpha-atom', 'beta-atom'], schemaFiles), schemaFiles), recordsFor(['alpha-atom', 'beta-atom'], schemaFiles), 'module-sample-c01'), 'MODULE_ATOM_INVALID');
    const wrongId = atomFile('other-atom');
    const idFiles = [wrongId, valid.files[1]!];
    expectModuleError(() => parseModuleSections(sectionsFor(recordsFor(['alpha-atom', 'beta-atom'], idFiles), idFiles), recordsFor(['alpha-atom', 'beta-atom'], idFiles), 'module-sample-c01'), 'MODULE_ATOM_INVALID');
    expectModuleError(() => parseModuleSections(valid.body, records.map((record, index) => index === 0 ? { ...record, file_sha256: '0'.repeat(64) } : record), 'module-sample-c01'), 'MODULE_HASH_MISMATCH');
    expectModuleError(() => parseModuleSections(valid.body, records.map((record, index) => index === 0 ? { ...record, content_sha256: '0'.repeat(64) } : record), 'module-sample-c01'), 'MODULE_HASH_MISMATCH');
    expectModuleError(() => parseModuleSections(valid.body, records.map((record, index) => index === 0 ? { ...record, file_bytes: record.file_bytes + 1 } : record), 'module-sample-c01'), 'MODULE_HASH_MISMATCH');
    expectModuleError(() => parseModuleSections(valid.body, records.map((record, index) => index === 0 ? { ...record, body_bytes: record.body_bytes + 1 } : record), 'module-sample-c01'), 'MODULE_HASH_MISMATCH');
    expectModuleError(() => parseModule(valid.record, `${valid.body} `, 'module-sample-c01'), 'MODULE_SECTION_INVALID');
    expectModuleError(() => parseModule(valid.record, valid.body, 'module-sample-c02'), 'MODULE_RECORD_INVALID');
    const malformedFrontmatter = fixture();
    const files = [malformedFrontmatter.files[0]!.replace('schema: VPInstruction/v1.2', 'schema VPInstruction/v1.2'), malformedFrontmatter.files[1]!];
    const malformedRecords = recordsFor(['alpha-atom', 'beta-atom'], malformedFrontmatter.files).map((record, index) => index === 0
      ? { ...record, file_sha256: digest(files[0]!), file_bytes: Buffer.byteLength(files[0]!, 'utf8') }
      : record);
    expectModuleError(() => parseModuleSections(sectionsFor(malformedRecords, files), malformedRecords, 'module-sample-c01'), 'MODULE_ATOM_INVALID');
  });
});
