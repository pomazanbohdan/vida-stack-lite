import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cellHash, parseCsv, type CsvRecord } from './csv-intake.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { parseApplicability, parseVersionRange } from '../skills/vp-mode/scripts/applicability.ts';
import type { VariantSource } from '../skills/vp-mode/scripts/variants.ts';

type Dict = Record<string, unknown>;
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sha = (value: Uint8Array | string): string => createHash('sha256').update(value).digest('hex');
const isRecord = (value: unknown): value is Dict => typeof value === 'object' && value !== null && !Array.isArray(value);

export const ADMISSION_REVIEWER = { kind: 'delegated', actor: 'agent:t3-delegate', model: 'acpRegistry_devin/swe-2-flash-medium' } as const;
export const ADMISSION_CLASSIFICATION_REASON = 'h2-csv-pilot-not-classified';
export const DNA_PLATFORM_DEFAULT = 'A context where the platform convention or the stated exception makes the rule unsafe.';

// ---------- variant ID derivation ----------

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 60)
    .replace(/-+$/gu, '');
}

export function stackNameFor(file: string): string {
  const base = basename(file).replace(/\.csv$/u, '');
  if (file.startsWith('stacks/')) return base;
  if (base === 'ux-guidelines') return 'ux';
  return base;
}

export function deriveVariantId(file: string, title: string, used: ReadonlySet<string>): string {
  const base = `uupm-${stackNameFor(file)}-${slugify(title)}`;
  if (base === `uupm-${stackNameFor(file)}-` || slugify(title) === '') throw new Error(`cannot derive variant ID from title: ${title}`);
  let candidate = base;
  let counter = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  return candidate;
}

// ---------- applicability ----------

// Strict label form is "<framework> <version range>". UUPM stacks rows also carry
// non-range labels ("winui current windows app sdk", "uwp legacy"); per D56 a
// framework fact without versionRange is satisfied by a normalized name match,
// so those degrade to a name-only fact that preserves the label verbatim.
export function deriveVariantApplicability(sourceLabel: string): Dict {
  const clean = sourceLabel.replace(/\s*\([^()]*\)\s*$/u, '').trim();
  const match = /^([A-Za-z][A-Za-z0-9-]*)\s+(.+)$/u.exec(clean);
  if (match !== null) {
    const name = (match[1] ?? '').toLowerCase();
    try {
      const versionRange = parseVersionRange((match[2] ?? '').trim());
      const result = { frameworks: [{ name, versionRange, sourceLabel }], requiredContext: [`framework:${name}`] };
      return parseApplicability(JSON.stringify(result)) as unknown as Dict;
    } catch {
      // fall through to the name-only form
    }
  }
  const nameMatch = /^([A-Za-z][A-Za-z0-9-]*)/u.exec(clean);
  if (nameMatch === null) throw new Error(`unparseable applicability label: ${sourceLabel}`);
  const name = nameMatch[1]!.toLowerCase();
  const result = { frameworks: [{ name, sourceLabel }], requiredContext: [`framework:${name}`] };
  return parseApplicability(JSON.stringify(result)) as unknown as Dict;
}

// ---------- admitted-sibling conventions (category tags, per-stack DNA) ----------

export type TagPair = { capability: string[]; pattern: string[] };
export type AdmissionContext = {
  categoryTags: Map<string, Map<string, { value: TagPair; count: number }>>;
  dnaByInstruction: Map<string, string>;
};

export function createAdmissionContext(root: string): AdmissionContext {
  const categoryTags = new Map<string, Map<string, { value: TagPair; count: number }>>();
  const dnaByInstruction = new Map<string, string>();
  const instructionsDir = join(root, 'instructions');
  let files: string[] = [];
  try { files = readdirSync(instructionsDir).filter(name => name.endsWith('.md')).sort(); }
  catch { files = []; }
  for (const file of files) {
    let data: Dict;
    try { data = parseFrontmatter(readFileSync(join(instructionsDir, file), 'utf8')).data; }
    catch { continue; }
    if (data.classification_reason !== ADMISSION_CLASSIFICATION_REASON) continue;
    const appliesWhen = typeof data.conditions_applies_when === 'string' ? data.conditions_applies_when : '';
    const categoryMatch = /^(.+?) guidance for /u.exec(appliesWhen);
    const capability = Array.isArray(data.capability_tags) ? data.capability_tags.filter((v): v is string => typeof v === 'string') : [];
    const pattern = Array.isArray(data.pattern_tags) ? data.pattern_tags.filter((v): v is string => typeof v === 'string') : [];
    if (categoryMatch !== null) {
      const category = categoryMatch[1]!;
      const key = JSON.stringify({ capability, pattern });
      const bucket = categoryTags.get(category) ?? new Map<string, { value: TagPair; count: number }>();
      const entry = bucket.get(key) ?? { value: { capability: [...capability], pattern: [...pattern] }, count: 0 };
      entry.count += 1;
      bucket.set(key, entry);
      categoryTags.set(category, bucket);
    }
    const dna = typeof data.conditions_does_not_apply_when === 'string' ? data.conditions_does_not_apply_when : '';
    if (dna !== '' && file.startsWith('uupm-')) dnaByInstruction.set(file, dna);
  }
  return { categoryTags, dnaByInstruction };
}

export function categoryTagPair(ctx: AdmissionContext, category: string): TagPair {
  const bucket = ctx.categoryTags.get(category);
  if (bucket === undefined || bucket.size === 0) throw new Error(`no admitted sibling tags for category: ${category}`);
  const sorted = [...bucket.values()].sort((a, b) => b.count - a.count || JSON.stringify(a.value).localeCompare(JSON.stringify(b.value)));
  const top = sorted[0]!;
  if (sorted.length > 1 && sorted[1]!.count === top.count) throw new Error(`ambiguous admitted sibling tags for category: ${category}`);
  return { capability: [...top.value.capability], pattern: [...top.value.pattern] };
}

export function stackDoesNotApplyWhen(ctx: AdmissionContext, file: string): string {
  const prefix = `uupm-${stackNameFor(file)}-`;
  const values = new Set<string>();
  for (const [name, value] of ctx.dnaByInstruction) if (name.startsWith(prefix)) values.add(value);
  return values.size === 1 ? [...values][0]! : DNA_PLATFORM_DEFAULT;
}

// ---------- donors.yaml / CSV resolution ----------

function parseScalar(value: string): string {
  const text = value.trim();
  if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith('"') && text.endsWith('"'))) return text.slice(1, -1);
  return text;
}

export function uupmContentRoot(root: string): string {
  const donorsPath = join(root, 'donors.yaml');
  const text = readFileSync(donorsPath, 'utf8');
  const localRootLine = /^local_root:\s*(.+)\s*$/m.exec(text)?.[1];
  if (localRootLine === undefined) throw new Error(`donors.yaml has no local_root: ${donorsPath}`);
  const local = parseScalar(localRootLine);
  const repoRoot = local.startsWith('packages/powers/') ? resolve(dirname(donorsPath), '..', '..') : dirname(donorsPath);
  const localRoot = resolve(repoRoot, local);
  const chunks = text.split(/^\s{2}-\s+id:\s*/m).slice(1);
  for (const chunk of chunks) {
    const lines = chunk.split(/\r?\n/);
    if (parseScalar(lines[0] ?? '') !== 'uupm') continue;
    const get = (key: string): string => parseScalar(new RegExp(`^\\s{4}${key}:\\s*(.+)\\s*$`, 'm').exec(chunk)?.[1] ?? '');
    const localPath = get('local_path');
    const contentPath = get('content_path');
    if (localPath === '' || contentPath === '') throw new Error('donors.yaml uupm record is missing local_path/content_path');
    return resolve(localRoot, localPath, contentPath);
  }
  throw new Error('donors.yaml has no uupm donor record');
}

export function fidelityDirFor(file: string): string {
  if (file.startsWith('stacks/')) return 'stacks';
  if (file === 'ux-guidelines.csv') return 'ux-guidelines';
  throw new Error(`unsupported UUPM CSV layout for family admission: ${file}`);
}

// ---------- CSV record / binding cells ----------

function cellLineBreaks(cell: string): number {
  let count = 0;
  for (let i = 0; i < cell.length; i += 1) if (cell.charCodeAt(i) === 10) count += 1;
  return count;
}

export function cellLocators(record: CsvRecord, columnIndex: number): Array<{ line: number; row: number; column: number }> {
  let start = record.line;
  for (let i = 0; i < columnIndex; i += 1) start += cellLineBreaks(record.cells[i] ?? '');
  const breaks = cellLineBreaks(record.cells[columnIndex] ?? '');
  const locators: Array<{ line: number; row: number; column: number }> = [];
  for (let line = start; line <= start + breaks; line += 1) locators.push({ line, row: record.row, column: columnIndex + 1 });
  return locators;
}

export type ColumnSpec = { index: number; header: string; role: string };

export function columnSpecs(source: Dict): ColumnSpec[] {
  const columns = Array.isArray(source.columns) ? source.columns.filter(isRecord) : [];
  return columns.map(column => ({ index: Number(column.index), header: String(column.header ?? ''), role: String(column.role ?? '') }));
}

export function normativeColumns(columns: ColumnSpec[]): ColumnSpec[] {
  return columns.filter(column => column.role.startsWith('normative-')).sort((a, b) => a.index - b.index);
}

export function singleColumn(columns: ColumnSpec[], role: string, file: string): ColumnSpec {
  const matches = columns.filter(column => column.role === role);
  if (matches.length !== 1) throw new Error(`expected exactly one ${role} column in ${file}; observed ${matches.length}`);
  return matches[0]!;
}

export function categoryColumn(columns: ColumnSpec[], file: string): ColumnSpec {
  const matches = columns.filter(column => column.header === 'Category');
  if (matches.length !== 1) throw new Error(`expected exactly one Category column in ${file}; observed ${matches.length}`);
  return matches[0]!;
}

export function exampleColumns(columns: ColumnSpec[], file: string): { good: ColumnSpec; bad: ColumnSpec } {
  const examples = columns.filter(column => column.role === 'normative-example');
  const good = examples.filter(column => /good/iu.test(column.header));
  const bad = examples.filter(column => /bad/iu.test(column.header));
  if (examples.length !== 2 || good.length !== 1 || bad.length !== 1) throw new Error(`expected Good/Bad normative-example columns in ${file}`);
  return { good: good[0]!, bad: bad[0]! };
}

export function buildBindingCells(record: CsvRecord, cellHashes: string[], headers: string[], columns: ColumnSpec[]): Dict[] {
  if (JSON.stringify(record.cells.map(cellHash)) !== JSON.stringify(cellHashes)) throw new Error(`CSV cells do not match corpus-map cellHashes at ${record.line}`);
  return normativeColumns(columns).map(column => {
    const locators = cellLocators(record, column.index);
    return {
      columnIndex: column.index,
      columnHeader: headers[column.index] ?? column.header,
      cellHash: cellHashes[column.index]!,
      role: column.role,
      locator: locators[0]!,
      locators,
    };
  });
}

// ---------- body / metadata generation ----------

function codeBlock(value: string): string {
  const fence = value.includes('```') ? '````' : '```';
  return `${fence}text\n${value}\n${fence}`;
}

export type BodyColumns = {
  title: number; description: number; direction: number; exception: number;
  good: number; bad: number; severity: number; applicability: number;
};

export function bodyColumnsFor(columns: ColumnSpec[], file: string): BodyColumns {
  const title = singleColumn(columns, 'normative-title', file);
  const description = singleColumn(columns, 'normative-description', file);
  const direction = singleColumn(columns, 'normative-direction', file);
  const exception = singleColumn(columns, 'normative-exception', file);
  const examples = exampleColumns(columns, file);
  const severity = singleColumn(columns, 'metadata-severity', file);
  const applicability = singleColumn(columns, 'metadata-applicability', file);
  return { title: title.index, description: description.index, direction: direction.index, exception: exception.index, good: examples.good.index, bad: examples.bad.index, severity: severity.index, applicability: applicability.index };
}

export function buildVariantBody(cells: string[], cols: BodyColumns, domain: 'stack' | 'ux', file: string): string {
  const problems: string[] = [];
  const cell = (index: number): string => cells[index] ?? '';
  for (const [label, index] of [['title', cols.title], ['description', cols.description], ['direction', cols.direction], ['applicability', cols.applicability], ['severity', cols.severity]] as const) {
    if (cell(index).length === 0) problems.push(`required cell ${label} (col${index}) is empty`);
  }
  for (const [label, index] of [['title', cols.title], ['description', cols.description], ['direction', cols.direction], ['exception', cols.exception], ['applicability', cols.applicability], ['severity', cols.severity]] as const) {
    if (/[\r\n]/u.test(cell(index))) problems.push(`single-line cell ${label} (col${index}) contains a newline`);
  }
  if (problems.length > 0) throw new Error(`admission body template assumptions failed for ${file}: ${problems.join('; ')}`);
  const appliesLabel = domain === 'ux' ? 'Platform' : 'Applies To';
  const lines = [
    `# ${cell(cols.title)}`,
    '',
    cell(cols.description),
    '',
    `**Do:** ${cell(cols.direction)}`,
    '',
  ];
  if (cell(cols.exception).length > 0) lines.push(`**Don't:** ${cell(cols.exception)}`, '');
  lines.push(`**${appliesLabel}:** ${cell(cols.applicability)}`, '', `**Severity:** ${cell(cols.severity)}`, '');
  if (cell(cols.good).length > 0) lines.push('**Good example:**', '', codeBlock(cell(cols.good)), '');
  if (cell(cols.bad).length > 0) lines.push('**Bad example:**', '', codeBlock(cell(cols.bad)), '');
  const body = lines.join('\n');
  if (!body.endsWith('\n')) throw new Error(`admission body must end with LF: ${file}`);
  return body;
}

export type AdmissionRequest = {
  variantId: string;
  familyId: string;
  file: string;
  rowKey: string;
  unit: {
    file: string; rowKey: string; locator: { line: number; row: number };
    title: string; applicabilityLabel: string | null; domain: 'stack' | 'ux';
    disposition: string; status: string;
  };
  mapRow: Dict;
  csvSource: Dict;
  admission: Dict;
  sourceRevision: string;
  asOf: string;
};

export type GeneratedAdmission = {
  variantId: string;
  familyId: string;
  file: string;
  rowKey: string;
  locator: { line: number; row: number };
  disposition: string;
  metadata: Dict;
  body: string;
  contentSha256: string;
  source: VariantSource;
  sourceLabel: string;
  applicability: Dict;
  bindingCells: Dict[];
  evidenceRow: Dict;
};

export function generateAdmission(root: string, ctx: AdmissionContext, request: AdmissionRequest): GeneratedAdmission {
  const { variantId, familyId, file, rowKey, unit, mapRow, csvSource, admission, sourceRevision, asOf } = request;
  if (unit.disposition !== 'deferred' || unit.status !== 'deferred') throw new Error(`admission source row is not deferred: ${file}:${rowKey}`);
  if (unit.applicabilityLabel === null || unit.applicabilityLabel === '') throw new Error(`admission source row has no applicability label: ${file}:${rowKey}`);
  const sourcePath = join(uupmContentRoot(root), file);
  if (!existsSync(sourcePath)) throw new Error(`UUPM CSV missing: ${file}`);
  const bytes = readFileSync(sourcePath);
  const parsed = parseCsv(new Uint8Array(bytes));
  const rawSha256 = String(csvSource.rawSha256 ?? '');
  if (rawSha256 === '' || rawSha256 !== parsed.rawSha256) throw new Error(`UUPM CSV raw hash mismatch: ${file}`);
  const record = parsed.rows.find(item => item.line === unit.locator.line);
  if (record === undefined) throw new Error(`CSV record missing for map row: ${file}:${rowKey}`);
  const cellHashes = Array.isArray(mapRow.cellHashes) ? mapRow.cellHashes.filter((v): v is string => typeof v === 'string') : [];
  const headers = parsed.headers;
  const columns = columnSpecs(csvSource);
  const cols = bodyColumnsFor(columns, file);
  const domain = unit.domain === 'ux' ? 'ux' : 'stack';
  const body = buildVariantBody(record.cells, cols, domain, file);
  const contentSha256 = sha(body);
  const bindingCells = buildBindingCells(record, cellHashes, headers, columns);

  const title = record.cells[cols.title] ?? '';
  const description = record.cells[cols.description] ?? '';
  const category = record.cells[categoryColumn(columns, file).index] ?? '';
  if (category === '') throw new Error(`admission row has empty Category cell: ${file}:${rowKey}`);
  const tags = categoryTagPair(ctx, category);
  const appliesTo = record.cells[cols.applicability] ?? '';
  if (unit.applicabilityLabel !== appliesTo) throw new Error(`applicability label disagrees with CSV row: ${file}:${rowKey}`);
  const applicability = deriveVariantApplicability(unit.applicabilityLabel);
  const source: VariantSource = { donor: 'uupm', path: file, rowKey, rawSha256 };
  const metadata: Dict = {
    title,
    summary: description,
    capability_tags: tags.capability,
    pattern_tags: tags.pattern,
    conditions_applies_when: `${category} guidance for ${appliesTo}.`,
    conditions_does_not_apply_when: stackDoesNotApplyWhen(ctx, file),
    artifact_contract_output_type: 'none',
    artifact_contract_required_data: [],
    artifact_contract_verified_by: 'The interface applies the stated rule and the result is checked against the source guideline.',
    compatibility_excludes: [],
    compatibility_requires: [],
    // No per-row locator here by contract: check-corpus rejects repeated
    // donor+revision+path provenance keys inside one instruction
    // (CORPUS_PROVENANCE_DUPLICATE) and requires every variant provenance
    // string verbatim in the family frontmatter, so variants admitted from the
    // same CSV must share one byte-identical source string. Row traceability
    // lives in variant.source.rowKey, the map binding cells and the receipts;
    // sbvf-plan.ts strips locator= from migrated variants' provenance for the
    // same reason.
    provenance: [`donor=uupm; license=MIT; revision=${sourceRevision}; path=${file}; sha256=${rawSha256}`],
    status: 'active',
    revision: 1,
    classification_status: 'unclassified',
    classification_reason: ADMISSION_CLASSIFICATION_REASON,
  };
  const evidenceRow = {
    variantId,
    familyId,
    rowKey,
    locator: { line: unit.locator.line, row: unit.locator.row },
    disposition: String(admission.disposition ?? 'family-held'),
    verdict: 'READY',
    notes: `Family-held row ${file} L${unit.locator.line} admitted as SBVF variant ${variantId} of ${familyId}; whole-cell verbatim template body (cols ${normativeColumns(columns).map(c => c.index).join(',')}), H2FidelityReceipt/v2 per D58/P6.`,
  };
  return {
    variantId, familyId, file, rowKey,
    locator: { line: unit.locator.line, row: unit.locator.row },
    disposition: String(admission.disposition ?? 'family-held'),
    metadata, body, contentSha256, source,
    sourceLabel: unit.applicabilityLabel,
    applicability,
    bindingCells,
    evidenceRow,
  };
}

// ---------- evidence documents + receipts (sealed after all rows known) ----------

export function batchTagForManifest(manifestPath: string): string {
  const base = basename(manifestPath).replace(/\.json$/u, '');
  const match = /^sbvf-admissions-(.+)$/u.exec(base);
  const tag = (match?.[1] ?? 'admission').toLowerCase().replace(/[^a-z0-9-]+/gu, '-').replace(/^-+|-+$/gu, '');
  return tag === '' ? 'admission' : tag;
}

export type SealedAdmission = {
  variantId: string;
  familyId: string;
  file: string;
  rowKey: string;
  locator: { line: number; row: number };
  disposition: string;
  receiptPath: string;
  receiptSha256: string;
  evidencePath: string;
  evidenceSha256: string;
  contentSha256: string;
  bodySha256: string;
  binding: Dict;
};

export function sealFamilyAdmissions(items: GeneratedAdmission[], options: { asOf: string; batchTag: string; sourceRevision: string; rawSha256ByFile: Map<string, string> }): {
  admissions: SealedAdmission[];
  targets: Array<{ path: string; bytes: Buffer }>;
} {
  const byFile = new Map<string, GeneratedAdmission[]>();
  for (const item of items) {
    const list = byFile.get(item.file) ?? [];
    list.push(item);
    byFile.set(item.file, list);
  }
  const evidenceByFile = new Map<string, { path: string; sha256: string }>();
  const targets: Array<{ path: string; bytes: Buffer }> = [];
  for (const [file, rows] of [...byFile.entries()].sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    const dir = fidelityDirFor(file);
    const fileBase = basename(file).replace(/\.csv$/u, '');
    const path = `fidelity/uupm/${dir}/${fileBase}-${options.batchTag}-admission-evidence.json`;
    const doc = {
      schema: 'H2FamilyAdmissionEvidence/v1',
      batch: options.batchTag,
      recordedAt: options.asOf,
      source: { donor: 'uupm', path: file, revision: options.sourceRevision, rawSha256: options.rawSha256ByFile.get(file) ?? '' },
      decision: 'Admit family-held deferred UUPM CSV rows as SBVF family variants inside one prepared batch per D58/P6: whole-cell verbatim template bodies, whole-cell bindings over every normative column, and H2FidelityReceipt/v2 per admitted row.',
      rows: rows.map(row => row.evidenceRow).sort((a, b) => String(a.variantId).localeCompare(String(b.variantId), 'en')),
    };
    const bytes = Buffer.from(`${JSON.stringify(doc, null, 2)}\n`, 'utf8');
    targets.push({ path, bytes });
    evidenceByFile.set(file, { path, sha256: sha(bytes) });
  }
  const admissions: SealedAdmission[] = [];
  for (const item of items) {
    const dir = fidelityDirFor(item.file);
    const receiptPath = `fidelity/uupm/${dir}/${item.variantId}.json`;
    const evidence = evidenceByFile.get(item.file)!;
    const receipt = {
      schema: 'H2FidelityReceipt/v2',
      instructionId: item.variantId,
      variantId: item.variantId,
      variantBodySha256: item.contentSha256,
      source: {
        donor: 'uupm',
        path: item.file,
        rowKey: item.rowKey,
        cells: item.bindingCells.map(cell => ({
          columnIndex: cell.columnIndex,
          columnHeader: cell.columnHeader,
          cellHash: cell.cellHash,
          role: cell.role,
          locator: cell.locator,
          locators: cell.locators,
        })),
      },
      reviewer: { ...ADMISSION_REVIEWER },
      verdict: 'READY',
      evidence: { path: evidence.path, sha256: evidence.sha256 },
      recordedAt: options.asOf,
    };
    const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
    targets.push({ path: receiptPath, bytes: receiptBytes });
    admissions.push({
      variantId: item.variantId,
      familyId: item.familyId,
      file: item.file,
      rowKey: item.rowKey,
      locator: item.locator,
      disposition: item.disposition,
      receiptPath,
      receiptSha256: sha(receiptBytes),
      evidencePath: evidence.path,
      evidenceSha256: evidence.sha256,
      contentSha256: item.contentSha256,
      bodySha256: item.contentSha256,
      binding: {
        instructionId: item.familyId,
        variantId: item.variantId,
        cells: item.bindingCells,
        fidelity: { path: receiptPath, sha256: sha(receiptBytes) },
      },
    });
  }
  return { admissions, targets };
}

export function admissionManifestSchemaPath(): string {
  return join(packageRoot, 'config', 'sbvf-admissions.v1.schema.json');
}
