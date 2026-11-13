import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { cellsDigest, cellHash, headersDigest, parseCsv, rowHash } from './csv-intake.ts';
import { deriveVariantId, slugify } from './sbvf-admission.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { validateAgainstSchema, type Schema } from '../skills/vp-mode/scripts/schema.ts';

type Dict = Record<string, unknown>;
type Donor = { id: string; local_path: string; head_sha: string; content_path: string };
type MapBinding = { instructionId: string; variantId: string; cells: Dict[]; receiptPath: string; receiptSha256: string };
type MapRow = { rowKey: string; rowHash: string; cellHashes: string[]; disposition: string; reason: string; bindings: MapBinding[]; locators: Dict[]; resourceIds: Dict[] };
type Unit = {
  donor: string; file: string; ordinal: number; locator: { line: number; row: number }; rowKey: string;
  disposition: string; status: string; sourceStatus: string | null; instructionId: string | null; instructionIds: string[]; applicabilityLabel: string | null;
  instructionApplicability: string | null; normativeCells: Record<string, string>; title: string; description: string;
  direction: string; exception: string; reason: string; domain: 'stack' | 'ux'; proposedVariantId?: string; _tokens: string[]; _titleKey: string;
};
type Candidate = {
  familyId: string; match: 'exact-title' | 'near-title-directions'; score: number; members: Array<{
    donor: string; file: string; ordinal: number; locator: { line: number; row: number }; rowKey: string;
    status: string; sourceStatus: string | null; disposition: string; instructionId: string | null; instructionIds: string[]; applicabilityLabel: string | null;
  }>; byteEstimate: number; conflicts: string[]; everyMemberAdmitted: boolean; eligibility: 'eligible' | 'proposed-not-eligible';
  ineligibilityReasons: string[];
};

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Terminal H2-A2 baseline (post-admission): all 1,434 UUPM rows dispositioned.
const expected = {
  corpusInstructions: 2402,
  admittedRows: 1414,
  deferredRows: 0,
  uxDeferredRows: 0,
  stackSplitDeferredRows: 0,
  stackKeepAtomicDeferredRows: 0,
  rejectedRows: 20,
  // 0 deferred = 0 KEEP_ATOMIC + 0 SPLIT remaining.
  stackRowsNotAdmitted: 0,
  provisionalKeepAtomicRows: 850,
  reviewRows: 93,
  splitRowsInsideStackNotAdmitted: 8,
  naiveAllKeepAtomicCeiling: 2402,
};

function record(value: unknown): value is Dict { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function compareText(left: string, right: string): number { return left < right ? -1 : left > right ? 1 : 0; }
function sha256(bytes: Uint8Array | string): string { return createHash('sha256').update(bytes).digest('hex'); }
function readJson(path: string): unknown { return JSON.parse(readFileSync(path, 'utf8')) as unknown; }
function fail(message: string): never { throw new Error(message); }

function parseScalar(value: string): string {
  const text = value.trim();
  if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith('"') && text.endsWith('"'))) return text.slice(1, -1);
  return text;
}

function readDonors(path: string): { localRoot: string; donors: Map<string, Donor> } {
  const text = readFileSync(path, 'utf8');
  const localRoot = /^local_root:\s*(.+)\s*$/m.exec(text)?.[1];
  if (localRoot === undefined) fail(`donors.yaml has no local_root: ${path}`);
  const donors = new Map<string, Donor>();
  const chunks = text.split(/^\s{2}-\s+id:\s*/m).slice(1);
  for (const chunk of chunks) {
    const lines = chunk.split(/\r?\n/);
    const id = parseScalar(lines[0] ?? '');
    const get = (key: string): string => {
      const value = new RegExp(`^\\s{4}${key}:\\s*(.+)\\s*$`, 'm').exec(chunk)?.[1];
      return value === undefined ? '' : parseScalar(value);
    };
    if (id !== '') donors.set(id, { id, local_path: get('local_path'), head_sha: get('head_sha'), content_path: get('content_path') });
  }
  const local = parseScalar(localRoot);
  const repoRoot = local.startsWith('packages/powers/') ? resolve(dirname(path), '..', '..') : dirname(path);
  return { localRoot: resolve(repoRoot, local), donors };
}

function containedPath(root: string, rel: string, label: string): string {
  const absolute = resolve(root, rel);
  const fromRoot = relative(root, absolute);
  if (isAbsolute(rel) || fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) fail(`${label} escapes its root: ${rel}`);
  return absolute;
}

// realpath containment under the product root: catches symlink escapes even
// when an intermediate directory (e.g. fidelity/ or .tmp/h2a2-stack-review/)
// is itself a symlink pointing outside the root.
function realContainedUnderRoot(root: string, absolute: string, label: string, rel: string): void {
  if (!existsSync(absolute)) return;
  const realRoot = realpathSync(root);
  const realRel = relative(realRoot, realpathSync(absolute));
  if (realRel === '..' || realRel.startsWith(`..${sep}`) || isAbsolute(realRel)) fail(`${label} escapes the product root via link: ${rel}`);
}

// Admission review evidence must live under <root>/.tmp/h2a2-stack-review/
// and must not escape the product root through a symlink (realpath comparison).
function reviewEvidencePath(root: string, rel: string, label: string): string {
  const dir = resolve(root, '.tmp', 'h2a2-stack-review');
  const absolute = containedPath(root, rel, label);
  const dirRel = relative(dir, absolute);
  if (dirRel === '' || dirRel === '..' || dirRel.startsWith(`..${sep}`) || isAbsolute(dirRel)) fail(`${label} must live under .tmp/h2a2-stack-review: ${rel}`);
  if (!existsSync(dir)) fail(`${label} directory missing: .tmp/h2a2-stack-review`);
  realContainedUnderRoot(root, absolute, label, rel);
  if (!existsSync(absolute)) return absolute;
  const realDir = realpathSync(dir);
  const realRel = relative(realDir, realpathSync(absolute));
  if (realRel === '..' || realRel.startsWith(`..${sep}`) || isAbsolute(realRel)) fail(`${label} escapes .tmp/h2a2-stack-review via link: ${rel}`);
  return absolute;
}

// Fidelity receipts must live under <root>/fidelity/ and must not escape
// the product root through a symlink (realpath comparison).
function fidelityReceiptPath(root: string, rel: string, label: string): string {
  const dir = resolve(root, 'fidelity');
  const absolute = containedPath(root, rel, label);
  const dirRel = relative(dir, absolute);
  if (dirRel === '' || dirRel === '..' || dirRel.startsWith(`..${sep}`) || isAbsolute(dirRel)) fail(`${label} must live under fidelity/: ${rel}`);
  if (!existsSync(dir)) fail(`${label} directory missing: fidelity`);
  realContainedUnderRoot(root, absolute, label, rel);
  if (!existsSync(absolute)) return absolute;
  const realDir = realpathSync(dir);
  const realRel = relative(realDir, realpathSync(absolute));
  if (realRel === '..' || realRel.startsWith(`..${sep}`) || isAbsolute(realRel)) fail(`${label} escapes fidelity/ via link: ${rel}`);
  return absolute;
}

function normalize(value: string): string {
  return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}
function tokens(value: string): string[] { return [...new Set(normalize(value).split(' ').filter(Boolean))].sort(); }
function jaccard(left: string[], right: string[]): number {
  const a = new Set(left); const b = new Set(right);
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}
function slug(value: string): string {
  const out = normalize(value).replace(/ /g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return out || 'unnamed';
}
function deepSorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(deepSorted);
  if (record(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, deepSorted(value[key])]));
  return value;
}
function stableJson(value: unknown): string { return `${JSON.stringify(deepSorted(value), null, 2)}\n`; }

function rowKeyFor(file: string, parsedHeadersDigest: string, columns: Dict[], cells: string[]): string {
  const encode = (value: string): string => [...Buffer.from(value, 'utf8')].map((byte) => {
    const char = String.fromCharCode(byte); return /[A-Za-z0-9._~-]/.test(char) ? char : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
  }).join('');
  const encodePath = (value: string): string => value.split('/').map(encode).join('/');
  const identity = new Map<string, number>();
  for (const [index, column] of columns.entries()) {
    if (column.role === 'identity-entity-id' || column.role === 'identity-source-key') identity.set(String(column.role), index);
  }
  const entityIndex = identity.get('identity-entity-id'); const sourceIndex = identity.get('identity-source-key');
  const entityId = entityIndex === undefined ? undefined : cells[entityIndex];
  const sourceKey = sourceIndex === undefined ? undefined : cells[sourceIndex];
  if (entityId !== undefined && sourceKey !== undefined) return `entityId=${encode(entityId)}&sourceKey=${encode(sourceKey)}`;
  if (entityId !== undefined) return `entityId=${encode(entityId)}`;
  if (sourceKey !== undefined) return `sourceKey=${encode(sourceKey)}`;
  return `path=${encodePath(file)}&headers=${parsedHeadersDigest}&cells=${cellsDigest(cells)}`;
}

function verifyReceipt(root: string, binding: MapBinding, source: { donor: string; file: string; rowKey: string }): boolean {
  if (binding.receiptPath === '' || binding.receiptSha256 === '') fail(`admitted row ${source.donor}:${source.file}:${source.rowKey} has no fidelity receipt`);
  const path = fidelityReceiptPath(root, binding.receiptPath, 'fidelity receipt');
  if (!existsSync(path)) fail(`fidelity receipt missing: ${binding.receiptPath}`);
  const bytes = readFileSync(path);
  const actualHash = sha256(bytes);
  if (actualHash !== binding.receiptSha256) fail(`fidelity receipt hash mismatch: ${binding.receiptPath} expected ${binding.receiptSha256}, observed ${actualHash}`);
  const receipt = readJson(path);
  if (!record(receipt) || receipt.verdict !== 'READY') fail(`fidelity receipt is not READY: ${binding.receiptPath}`);
  const expectedVariant = binding.variantId;
  if (receipt.instructionId !== expectedVariant) fail(`fidelity receipt instructionId mismatch: ${binding.receiptPath}`);
  if (receipt.schema === 'H2FidelityReceipt/v2' && receipt.variantId !== expectedVariant) fail(`fidelity receipt variantId mismatch: ${binding.receiptPath}`);
  const review = record(receipt.reviewer) ? receipt.reviewer : {};
  if (review.kind !== 'human' && review.kind !== 'delegated') fail(`fidelity receipt reviewer kind invalid: ${binding.receiptPath}`);
  if (review.kind === 'delegated' && (typeof review.model !== 'string' || review.model.trim() === '')) fail(`fidelity receipt delegated reviewer model missing: ${binding.receiptPath}`);
  const sourceRecord = record(receipt.source) ? receipt.source : {};
  if (sourceRecord.donor !== source.donor || sourceRecord.path !== source.file || sourceRecord.rowKey !== source.rowKey) fail(`fidelity receipt source mismatch: ${binding.receiptPath}`);
  const receiptCells = Array.isArray(sourceRecord.cells) ? sourceRecord.cells : [];
  if (receiptCells.length !== binding.cells.length) fail(`fidelity receipt cell count mismatch: ${binding.receiptPath}`);
  binding.cells.forEach((expectedCell, index) => {
    const actual = receiptCells[index];
    if (!record(actual) || actual.columnIndex !== expectedCell.columnIndex || actual.cellHash !== expectedCell.cellHash ||
      !record(actual.locator) || !record(expectedCell.locator) || actual.locator.line !== expectedCell.locator.line ||
      actual.locator.row !== expectedCell.locator.row || actual.locator.column !== expectedCell.locator.column) {
      fail(`fidelity receipt cell mismatch: ${binding.receiptPath} cell ${index}`);
    }
  });
  return true;
}

function loadRoot(root: string): { units: Unit[]; mapRows: Map<string, { donor: string; file: string; row: MapRow }>; catalogById: Map<string, Dict>; receiptReady: Set<string>; catalogCount: number; map: Dict } {
  const catalog = readJson(join(root, 'catalog.json'));
  const map = readJson(join(root, 'corpus-map.json'));
  if (!record(catalog) || !Array.isArray(catalog.instructions)) fail('catalog.json is missing or malformed');
  if (!record(map) || !record(map.donors)) fail('corpus-map.json is missing or malformed');
  const mapSchemaName = map.schema === 'VPCorpusMap/v3' ? 'vpcorpusmap.v3.schema.json' : map.schema === 'VPCorpusMap/v2' ? 'vpcorpusmap.v2.schema.json' : map.schema === 'VPCorpusMap/v1' ? 'vpcorpusmap.v1.schema.json' : '';
  if (mapSchemaName === '') fail(`unsupported corpus-map schema: ${String(map.schema)}`);
  const mapSchema = readJson(join(packageRoot, 'config', mapSchemaName)) as Schema;
  const mapSchemaErrors = validateAgainstSchema(map, mapSchema);
  if (mapSchemaErrors.length > 0) fail(`corpus-map schema validation failed: ${mapSchemaErrors.join('; ')}`);
  const donorManifest = readDonors(join(root, 'donors.yaml'));
  const allowlistRaw = readJson(join(root, 'config', 'h2-csv-allowlist.json'));
  if (!Array.isArray(allowlistRaw)) fail('config/h2-csv-allowlist.json must contain an array');
  const allowlist: unknown[] = [...allowlistRaw];
  const h3AllowlistPath = join(root, 'config', 'h3-csv-allowlist.json');
  if (existsSync(h3AllowlistPath)) {
    const h3Raw = readJson(h3AllowlistPath);
    if (Array.isArray(h3Raw)) allowlist.push(...h3Raw);
  }
  const catalogById = new Map<string, Dict>();
  for (const raw of catalog.instructions) {
    if (!record(raw) || typeof raw.instruction_id !== 'string') fail('catalog.json contains an invalid instruction entry');
    if (catalogById.has(raw.instruction_id)) fail(`duplicate catalog instruction ID: ${raw.instruction_id}`);
    catalogById.set(raw.instruction_id, raw);
  }
  const units: Unit[] = [];
  const mapRows = new Map<string, { donor: string; file: string; row: MapRow }>();
  const receiptReady = new Set<string>();
  const seenAllowlist = new Set<string>();
  const uupm = record(map.donors.uupm) ? map.donors.uupm : undefined;
  if (uupm === undefined || !record(uupm.csvSources)) fail('corpus-map.json has no UUPM csvSources');
  const donor = donorManifest.donors.get('uupm');
  if (donor === undefined) fail('donors.yaml has no uupm donor record');
  const donorClone = resolve(donorManifest.localRoot, donor.local_path);
  if (!existsSync(donorClone)) fail(`UUPM donor clone missing: ${donorClone}`);
  const gitHead = spawnSync('git', ['-C', donorClone, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (gitHead.status !== 0) fail(`cannot inspect UUPM donor clone HEAD: ${gitHead.stderr.trim()}`);
  const observedHead = gitHead.stdout.trim();
  if (donor.head_sha === '' || observedHead !== donor.head_sha) fail(`UUPM donor clone pin mismatch: expected ${donor.head_sha || '(missing)'}, observed ${observedHead}`);
  if (uupm.source_revision !== donor.head_sha) fail(`corpus map UUPM source_revision mismatch: expected ${donor.head_sha}, observed ${String(uupm.source_revision)}`);
  const contentRoot = resolve(donorClone, donor.content_path);
  const csvSources = uupm.csvSources;
  const allowByPath = new Map<string, Dict>();
  for (const raw of allowlist) {
    if (!record(raw) || raw.donor !== 'uupm' || typeof raw.path !== 'string') continue;
    if (allowByPath.has(raw.path)) fail(`duplicate UUPM CSV allowlist path: ${raw.path}`);
    allowByPath.set(raw.path, raw);
  }
  const sourcePaths = Object.keys(csvSources).sort();
  for (const csvPath of sourcePaths) {
    const source = csvSources[csvPath];
    if (!record(source) || !Array.isArray(source.columns) || !Array.isArray(source.rows)) fail(`invalid corpus-map CSV source: uupm:${csvPath}`);
    const allow = allowByPath.get(csvPath);
    if (allow === undefined) fail(`pinned UUPM CSV allowlist entry missing: ${csvPath}`);
    seenAllowlist.add(csvPath);
    const csvFile = containedPath(contentRoot, csvPath, 'UUPM CSV');
    if (!existsSync(csvFile)) fail(`pinned UUPM CSV missing: ${csvPath}`);
    const bytes = readFileSync(csvFile);
    const parsed = parseCsv(bytes);
    const digest = sha256(bytes);
    const parsedHeaders = headersDigest(parsed.headers);
    if (source.rawSha256 !== digest || allow.rawSha256 !== digest) fail(`UUPM CSV raw hash mismatch: ${csvPath}`);
    if (source.headersDigest !== parsedHeaders || allow.headersDigest !== parsedHeaders) fail(`UUPM CSV header hash mismatch: ${csvPath}`);
    const columns = source.columns.filter(record);
    if (columns.length !== parsed.headers.length || columns.some((column, index) => column.index !== index || column.header !== parsed.headers[index])) fail(`UUPM CSV/map columns mismatch: ${csvPath}`);
    const rowsByKey = new Map<string, MapRow>();
    for (const rawRow of source.rows) {
      if (!record(rawRow) || typeof rawRow.rowKey !== 'string' || !Array.isArray(rawRow.cellHashes) || !Array.isArray(rawRow.locators)) fail(`invalid UUPM map row: ${csvPath}`);
      const row: MapRow = {
        rowKey: rawRow.rowKey,
        rowHash: String(rawRow.rowHash ?? ''),
        cellHashes: rawRow.cellHashes.filter((value): value is string => typeof value === 'string'),
        disposition: String(rawRow.disposition ?? ''),
        reason: typeof rawRow.reason === 'string' ? rawRow.reason : '',
        bindings: [],
        locators: rawRow.locators.filter(record),
        resourceIds: (Array.isArray(rawRow.resourceIds) ? rawRow.resourceIds.filter(record) : []),
      };
      if (rowsByKey.has(row.rowKey)) fail(`duplicate UUPM map row key: ${csvPath}:${row.rowKey}`);
      rowsByKey.set(row.rowKey, row);
      mapRows.set(`${csvPath}\0${row.rowKey}`, { donor: 'uupm', file: csvPath, row });
      row.bindings = (Array.isArray(rawRow.bindings) ? rawRow.bindings.filter(record) : []).map((binding): MapBinding => ({
        instructionId: String(binding.instructionId ?? ''),
        variantId: typeof binding.variantId === 'string' ? binding.variantId : String(binding.instructionId ?? ''),
        cells: Array.isArray(binding.cells) ? binding.cells.filter(record) : [],
        receiptPath: record(binding.fidelity) && typeof binding.fidelity.path === 'string' ? binding.fidelity.path : '',
        receiptSha256: record(binding.fidelity) && typeof binding.fidelity.sha256 === 'string' ? binding.fidelity.sha256 : '',
      }));
    }
    const locatorRows = new Map<string, MapRow>();
    for (const row of rowsByKey.values()) for (const locator of row.locators) {
      const key = `${String(locator.line)}\0${String(locator.row)}`;
      if (locatorRows.has(key)) fail(`duplicate UUPM map row locator: ${csvPath}:${key}`);
      locatorRows.set(key, row);
    }
    const usedRowKeys = new Set<string>();
    for (const parsedRow of parsed.rows) {
      const actualRowKey = rowKeyFor(csvPath, parsedHeaders, columns, parsedRow.cells);
      const row = rowsByKey.get(actualRowKey);
      if (row === undefined) fail(`UUPM map row missing for ${csvPath}:${parsedRow.line} (${actualRowKey})`);
      usedRowKeys.add(actualRowKey);
      const hashes = parsedRow.cells.map(cellHash);
      if (JSON.stringify(row.cellHashes) !== JSON.stringify(hashes) || row.rowHash !== rowHash(actualRowKey, parsedHeaders, hashes)) fail(`UUPM row/cell hash mismatch: ${csvPath}:${actualRowKey}`);
      if (!row.locators.some((locator) => locator.line === parsedRow.line && locator.row === parsedRow.row)) fail(`UUPM map locator missing: ${csvPath}:${parsedRow.line}`);
      const locatorKey = `${parsedRow.line}\0${parsedRow.row}`;
      if (locatorRows.get(locatorKey) !== row) fail(`UUPM locator does not resolve to its row: ${csvPath}:${parsedRow.line}`);
      const roleValues = new Map<string, Array<{ header: string; value: string; index: number }>>();
      columns.forEach((column, index) => {
        const role = String(column.role ?? '');
        const list = roleValues.get(role) ?? [];
        list.push({ header: String(column.header), value: parsedRow.cells[index] ?? '', index }); roleValues.set(role, list);
      });
      const normative = Object.fromEntries((roleValues.get('normative-title') ?? []).concat(roleValues.get('normative-description') ?? [], roleValues.get('normative-direction') ?? [], roleValues.get('normative-exception') ?? [], roleValues.get('normative-example') ?? [])
        .sort((a, b) => a.index - b.index).map((entry) => [entry.header, entry.value]));
      const pick = (role: string): string => (roleValues.get(role) ?? []).map((entry) => entry.value).filter(Boolean).join('\n');
      const normativeIndices = columns.filter((column) => typeof column.role === 'string' && column.role.startsWith('normative-')).map((column) => Number(column.index)).sort((a, b) => a - b);
      const boundIndices = new Set<number>();
      const instructionIds: string[] = [];
      let instructionApplicability: string | null = null;
      let instructionId: string | null = null;
      let resourceOnlyRow = false;
      if (row.disposition === 'admitted') {
        if (row.bindings.length === 0) {
          const resourceEntries = row.resourceIds;
          if (!resourceEntries.some((item) => item.disposition === 'admitted')) fail(`admitted row has no bindings or admitted resources: ${csvPath}:${actualRowKey}`);
          resourceOnlyRow = true;
        } else {
        for (const binding of row.bindings) {
          for (const cell of binding.cells) {
            const columnIndex = Number(cell.columnIndex);
            boundIndices.add(columnIndex);
            const locator = record(cell.locator) ? cell.locator : {};
            if (!Number.isInteger(columnIndex) || columnIndex < 0 || columnIndex >= parsedRow.cells.length ||
              cell.cellHash !== hashes[columnIndex] || cell.columnHeader !== parsed.headers[columnIndex] ||
              cell.role !== columns[columnIndex]?.role || locator.column !== columnIndex + 1 ||
              !row.locators.some((item) => item.line === locator.line && item.row === locator.row)) fail(`admitted row binding cell disagrees with CSV/map: ${csvPath}:${actualRowKey} column ${columnIndex}`);
          }
          const catalogEntry = catalogById.get(binding.instructionId);
          if (catalogEntry === undefined) fail(`admitted UUPM instruction absent from catalog: ${binding.instructionId}`);
          const instructionPath = containedPath(root, String(catalogEntry.path ?? ''), 'catalog instruction path');
          if (!existsSync(instructionPath)) fail(`admitted instruction missing: ${String(catalogEntry.path)}`);
          const instructionBytes = readFileSync(instructionPath);
          const instructionHash = sha256(instructionBytes);
          if (instructionHash !== catalogEntry.sha256) fail(`admitted instruction hash mismatch: ${String(catalogEntry.path)}`);
          const frontmatter = parseFrontmatter(instructionBytes.toString('utf8')).data;
          if (frontmatter.instruction_id !== binding.instructionId) fail(`admitted instruction frontmatter ID mismatch: ${binding.instructionId}`);
          const rawApplicability = frontmatter.applicability;
          if (instructionApplicability === null) instructionApplicability = typeof rawApplicability === 'string' ? rawApplicability : null;
          instructionIds.push(binding.instructionId);
          if (verifyReceipt(root, binding, { donor: 'uupm', file: csvPath, rowKey: actualRowKey })) receiptReady.add(binding.variantId);
        }
        if (JSON.stringify(normativeIndices) !== JSON.stringify([...boundIndices].sort((a, b) => a - b))) fail(`admitted row does not bind every whole normative cell: ${csvPath}:${actualRowKey}`);
        instructionId = instructionIds[0] ?? null;
        }
      } else if (row.bindings.length > 0) fail(`non-admitted row unexpectedly has bindings: ${csvPath}:${actualRowKey}`);
      const sourceApplicability = pick('metadata-applicability');
      const statusColumn = roleValues.get('metadata-status')?.map((entry) => entry.value).join('; ') ?? '';
      const status = row.reason.toLowerCase().includes('held applicability') ? 'held' : /\bsplit\b/i.test(row.reason) ? 'SPLIT' : row.disposition;
      const title = pick('normative-title');
      const description = pick('normative-description');
      const direction = pick('normative-direction');
      const exception = pick('normative-exception');
      if (!resourceOnlyRow) units.push({ donor: 'uupm', file: csvPath, ordinal: parsedRow.row + 1, locator: { line: parsedRow.line, row: parsedRow.row }, rowKey: actualRowKey,
        disposition: row.disposition, status, sourceStatus: statusColumn || null, instructionId, instructionIds, applicabilityLabel: sourceApplicability || null, instructionApplicability,
        normativeCells: normative, title, description, direction, exception, reason: row.reason, domain: csvPath === 'ux-guidelines.csv' ? 'ux' : 'stack',
        _tokens: tokens(`${title} ${direction} ${exception}`), _titleKey: normalize(title) });
    }
    for (const rowKey of rowsByKey.keys()) if (!usedRowKeys.has(rowKey)) fail(`UUPM map contains an extra row absent from CSV: ${csvPath}:${rowKey}`);
  }
  for (const path of allowByPath.keys()) if (!seenAllowlist.has(path)) fail(`allowlisted UUPM CSV is absent from corpus-map.json: ${path}`);
  units.sort((a, b) => compareText(a.file, b.file) || a.ordinal - b.ordinal);
  const proposedUsed = new Set(catalogById.keys());
  for (const unit of units) {
    if (unit.disposition !== 'deferred' || unit.status !== 'deferred' || slugify(unit.title) === '') continue;
    const proposed = deriveVariantId(unit.file, unit.title, proposedUsed);
    proposedUsed.add(proposed);
    unit.proposedVariantId = proposed;
  }
  return { units, mapRows, catalogById, receiptReady, catalogCount: catalog.instructions.length, map };
}

function jaccardPairs(units: Unit[], threshold: number): Map<string, number> {
  const buckets = new Map<string, Set<number>>();
  units.forEach((unit, index) => {
    const titleTokenKey = tokens(unit.title).join(' ');
    for (const bucket of [`title:${titleTokenKey}`, `file:${unit.file}`]) {
      const members = buckets.get(bucket) ?? new Set<number>(); members.add(index); buckets.set(bucket, members);
    }
  });
  const pairScores = new Map<string, number>();
  const exact = new Set<string>();
  const titleGroups = new Map<string, number[]>();
  units.forEach((unit, index) => { if (unit._titleKey !== '') { const group = titleGroups.get(unit._titleKey) ?? []; group.push(index); titleGroups.set(unit._titleKey, group); } });
  for (const group of titleGroups.values()) if (group.length > 1) for (let i = 0; i < group.length; i += 1) for (let j = i + 1; j < group.length; j += 1) exact.add(`${group[i]}:${group[j]}`);
  const pairs = new Set<string>();
  for (const members of buckets.values()) {
    const list = [...members].sort((a, b) => a - b);
    for (let i = 0; i < list.length; i += 1) for (let j = i + 1; j < list.length; j += 1) pairs.add(`${list[i]}:${list[j]}`);
  }
  for (const pair of [...pairs].sort()) {
    if (exact.has(pair)) continue;
    const [leftText, rightText] = pair.split(':'); const left = Number(leftText); const right = Number(rightText);
    const score = jaccard(units[left]!._tokens, units[right]!._tokens);
    if (score >= threshold) pairScores.set(pair, score);
  }
  return pairScores;
}

function buildCandidates(units: Unit[], minScore: number): Candidate[] {
  const groups: Array<{ indices: number[]; match: Candidate['match']; score: number }> = [];
  const titleGroups = new Map<string, number[]>();
  units.forEach((unit, index) => { if (unit._titleKey !== '') { const group = titleGroups.get(unit._titleKey) ?? []; group.push(index); titleGroups.set(unit._titleKey, group); } });
  for (const indices of titleGroups.values()) if (indices.length > 1) groups.push({ indices, match: 'exact-title', score: 1 });
  const pairs = jaccardPairs(units, minScore);
  const adjacency = new Map<number, Set<number>>();
  for (const pair of pairs.keys()) {
    const [a, b] = pair.split(':').map(Number) as [number, number];
    const left = adjacency.get(a) ?? new Set<number>(); left.add(b); adjacency.set(a, left);
    const right = adjacency.get(b) ?? new Set<number>(); right.add(a); adjacency.set(b, right);
  }
  const visited = new Set<number>();
  for (const start of [...adjacency.keys()].sort((a, b) => a - b)) {
    if (visited.has(start)) continue;
    const stack = [start]; const component: number[] = []; visited.add(start);
    while (stack.length > 0) {
      const current = stack.pop()!; component.push(current);
      for (const next of [...(adjacency.get(current) ?? [])].sort((a, b) => a - b)) if (!visited.has(next)) { visited.add(next); stack.push(next); }
    }
    if (component.length > 1) {
      const set = new Set(component); const scores = [...pairs.entries()].filter(([pair]) => { const [a, b] = pair.split(':').map(Number); return set.has(a!) && set.has(b!); }).map(([, score]) => score);
      groups.push({ indices: component.sort((a, b) => a - b), match: 'near-title-directions', score: scores.length > 0 ? Math.min(...scores) : minScore });
    }
  }
  const seen = new Set<string>(); const candidates: Candidate[] = [];
  for (const group of groups) {
    const members = group.indices.map((index) => units[index]!).sort((a, b) => compareText(a.file, b.file) || a.ordinal - b.ordinal);
    const unique = members.map((unit) => `${unit.file}\0${unit.ordinal}`).join('\0');
    if (seen.has(`${group.match}\0${unique}`)) continue; seen.add(`${group.match}\0${unique}`);
    const title = members[0]?.title ?? 'unnamed';
    const base = `family-${slug(title)}`;
    const identity = sha256(members.map((unit) => `${unit.file}:${unit.ordinal}:${unit.rowKey}`).join('\n')).slice(0, 8);
    const familyId = `${base}-${identity}`;
    const dispositions = new Set(members.map((unit) => unit.disposition));
    const normalizedTitles = new Set(members.map((unit) => unit._titleKey));
    const descriptions = new Set(members.map((unit) => normalize(unit.description)));
    const conflicts: string[] = [];
    if (dispositions.size > 1) conflicts.push('mixed disposition');
    if (members.some((unit) => unit.status === 'SPLIT')) conflicts.push('SPLIT member');
    if (members.some((unit) => unit.status === 'held')) conflicts.push('held member');
    if (members.some((unit) => unit.disposition === 'rejected' || unit.status === 'rejected')) conflicts.push('rejected member');
    if (normalizedTitles.size > 1) conflicts.push('different normative titles');
    if (descriptions.size > 1) conflicts.push('different normative descriptions');
    const allAdmitted = members.every((unit) => unit.disposition === 'admitted' && unit.status === 'admitted');
    const ineligibilityReasons = [...new Set([...conflicts, ...(allAdmitted ? [] : ['not every member is admitted'])])].sort();
    const byteEstimate = members.reduce((sum, unit) => sum + Buffer.byteLength(Object.values(unit.normativeCells).join('\n'), 'utf8'), 0);
    const excluded = conflicts.some((conflict) => conflict === 'SPLIT member' || conflict === 'held member' || conflict === 'rejected member');
    candidates.push({ familyId, match: group.match, score: Number(group.score.toFixed(6)), members: members.map((unit) => ({ donor: unit.donor, file: unit.file, ordinal: unit.ordinal, locator: unit.locator, rowKey: unit.rowKey, status: unit.status, sourceStatus: unit.sourceStatus, disposition: unit.disposition, instructionId: unit.instructionId, instructionIds: unit.instructionIds, applicabilityLabel: unit.applicabilityLabel })),
      byteEstimate, conflicts: conflicts.sort(), everyMemberAdmitted: allAdmitted, eligibility: allAdmitted && !excluded ? 'eligible' : 'proposed-not-eligible', ineligibilityReasons: allAdmitted && !excluded ? [] : ineligibilityReasons });
  }
  return candidates.sort((a, b) => compareText(a.familyId, b.familyId) || compareText(a.match, b.match));
}

function makeReconciliation(units: Unit[], corpusCount: number): { observed: Dict; checks: Array<Dict>; gaps: string[] } {
  const totals = { admitted: 0, deferred: 0, rejected: 0, merged: 0 };
  const byDomain = { ux: { admitted: 0, deferred: 0, rejected: 0, merged: 0 }, stack: { admitted: 0, deferred: 0, rejected: 0, merged: 0 } };
  for (const unit of units) {
    if (unit.disposition in totals) totals[unit.disposition as keyof typeof totals] += 1;
    if (unit.disposition in byDomain[unit.domain]) byDomain[unit.domain][unit.disposition as keyof typeof totals] += 1;
  }
  const observed = { corpusInstructions: corpusCount, csvRows: units.length, dispositions: totals, byDomain,
    stackRowsNotAdmitted: byDomain.stack.deferred,
    stackDeferredRowsWithoutExplicitSplitOrHeldReason: units.filter((unit) => unit.domain === 'stack' && unit.disposition === 'deferred' && unit.status !== 'SPLIT' && unit.status !== 'held').length,
    uxDeferredRows: byDomain.ux.deferred,
    naiveAllKeepAtomicCeiling: { value: corpusCount + expected.stackKeepAtomicDeferredRows, basis: 'current catalog instruction count + corrected baseline KEEP_ATOMIC deferred count' } };
  const checks: Dict[] = [];
  const check = (name: string, expectedValue: number, observedValue: number | null): void => { checks.push({ name, expected: expectedValue, observed: observedValue, delta: observedValue === null ? null : observedValue - expectedValue, status: observedValue === null ? 'not-observable' : observedValue === expectedValue ? 'match' : 'mismatch' }); };
  check('corpusInstructions', expected.corpusInstructions, corpusCount);
  check('csvRows', 1434, units.length);
  check('admittedRows', expected.admittedRows, totals.admitted);
  check('deferredRows', expected.deferredRows, totals.deferred);
  check('uxDeferredRows', expected.uxDeferredRows, byDomain.ux.deferred);
  check('stackDeferredRows', expected.stackSplitDeferredRows + expected.stackKeepAtomicDeferredRows, byDomain.stack.deferred);
  check('stackSplitDeferredRows', expected.stackSplitDeferredRows, null);
  check('stackKeepAtomicDeferredRows', expected.stackKeepAtomicDeferredRows, null);
  check('rejectedRows', expected.rejectedRows, totals.rejected);
  check('stackRowsNotAdmitted', expected.stackRowsNotAdmitted, byDomain.stack.deferred);
  check('provisionalKeepAtomicRows', expected.provisionalKeepAtomicRows, null);
  check('reviewRows', expected.reviewRows, null);
  check('splitRowsInsideStackNotAdmitted', expected.splitRowsInsideStackNotAdmitted, null);
  check('naiveAllKeepAtomicCeiling', expected.naiveAllKeepAtomicCeiling, corpusCount + expected.stackKeepAtomicDeferredRows);
  const gaps = checks.filter((item) => item.status !== 'match').map((item) => item.status === 'not-observable'
    ? `${String(item.name)}=${String(item.expected)} is in the corrected baseline but is not encoded per row in the current CSV/map data`
    : `${String(item.name)} expected ${String(item.expected)}, observed ${String(item.observed)}, delta ${String(item.delta)}`);
  return { observed, checks, gaps };
}

function clustersFor(units: Unit[], candidates: Candidate[]): Dict[] {
  const definitions = [
    { id: 'xaml-mvvm', label: 'XAML/MVVM', files: ['avalonia', 'swiftui', 'uno', 'uwp', 'winui', 'wpf'] },
    { id: 'react-react-native', label: 'React/React Native', files: ['react', 'react-native'] },
    { id: 'vue-nuxt', label: 'Vue/Nuxt', files: ['vue', 'nuxtjs', 'nuxt-ui'] },
    { id: 'next-nuxt', label: 'Next/Nuxt', files: ['nextjs', 'nuxtjs', 'nuxt-ui'] },
  ];
  return definitions.map((definition) => {
    const fileSet = new Set(definition.files.map((name) => `stacks/${name}.csv`));
    const rows = units.filter((unit) => fileSet.has(unit.file));
    const observedFiles = [...new Set(rows.map((unit) => unit.file))].sort();
    const overlaps = candidates.filter((candidate) => {
      const files = new Set(candidate.members.map((member) => member.file));
      return [...files].filter((file) => fileSet.has(file)).length > 1;
    }).map((candidate) => candidate.familyId).sort();
    return { id: definition.id, label: definition.label, evidence: 'observed CSV units and candidate membership; not an approved family', rowCount: rows.length, files: observedFiles, crossFileCandidateIds: overlaps };
  });
}

function validateManifest(manifestPath: string, root: string, census: ReturnType<typeof loadRoot>, admissionPath?: string): Dict {
  const manifest = readJson(manifestPath);
  const schemaPath = join(packageRoot, 'config', 'sbvf-families.v1.schema.json');
  const schema = readJson(schemaPath) as Schema;
  const issues: string[] = validateAgainstSchema(manifest, schema);
  const admissionsByVariant = new Map<string, Dict>();
  if (admissionPath !== undefined) {
    const admissionManifest = readJson(admissionPath);
    const admissionSchema = readJson(join(packageRoot, 'config', 'sbvf-admissions.v1.schema.json')) as Schema;
    issues.push(...validateAgainstSchema(admissionManifest, admissionSchema).map((issue) => `admission manifest: ${issue}`));
    if (record(admissionManifest) && Array.isArray(admissionManifest.admissions)) {
      for (const raw of admissionManifest.admissions) {
        if (!record(raw) || typeof raw.variant_id !== 'string') continue;
        if (admissionsByVariant.has(raw.variant_id)) issues.push(`duplicate admission variant_id: ${raw.variant_id}`);
        admissionsByVariant.set(raw.variant_id, raw);
      }
    }
  }
  if (!record(manifest) || !Array.isArray(manifest.families)) return { valid: false, issues: [...issues, 'manifest families must be an array'].sort() };
  const familyIds = new Set<string>(); const variantOwners = new Map<string, string>();
  const referencedAdmissions = new Set<string>();
  const admittedBindings = new Map<string, Array<{ disposition: string; rowKey: string; receiptReady: boolean; subspanCells: boolean; subspanReceipt: boolean; splitRow: boolean }>>();
  const unitByRow = new Map(census.units.map((unit) => [`${unit.file}:${unit.rowKey}`, unit] as const));
  for (const source of Object.values(census.map.donors as Dict)) {
    if (!record(source) || !record(source.csvSources)) continue;
    for (const [file, rawCsv] of Object.entries(source.csvSources)) {
      if (!record(rawCsv) || !Array.isArray(rawCsv.rows)) continue;
      for (const rawRow of rawCsv.rows) {
        if (!record(rawRow)) continue;
        const disposition = String(rawRow.disposition ?? '');
        const rowKey = String(rawRow.rowKey ?? '');
        const bindings = Array.isArray(rawRow.bindings) ? rawRow.bindings.filter(record) : [];
        const splitRow = unitByRow.get(`${file}:${rowKey}`)?.status === 'SPLIT' || bindings.length > 1;
        for (const binding of bindings) {
          const variantId = typeof binding.variantId === 'string' ? binding.variantId : String(binding.instructionId ?? '');
          const fidelity = record(binding.fidelity) ? binding.fidelity : {};
          const receiptPath = typeof fidelity.path === 'string' ? fidelityReceiptPath(root, fidelity.path, 'fidelity receipt') : '';
          const bindingCells = Array.isArray(binding.cells) ? binding.cells.filter(record) : [];
          const subspanCells = bindingCells.some((cell) => Array.isArray(cell.subspans) && cell.subspans.length > 0);
          let receiptReady = false;
          let subspanReceipt = false;
          if (receiptPath !== '' && existsSync(receiptPath)) {
            const receipt = readJson(receiptPath);
            receiptReady = record(receipt) && receipt.verdict === 'READY' && receipt.instructionId === variantId && sha256(readFileSync(receiptPath)) === fidelity.sha256;
            if (record(receipt) && receipt.schema === 'H2FidelityReceipt/v2') {
              const receiptSource = record(receipt.source) ? receipt.source : {};
              const receiptCells = Array.isArray(receiptSource.cells) ? receiptSource.cells.filter(record) : [];
              subspanReceipt = receiptCells.some((cell) => Array.isArray(cell.subspans) && cell.subspans.length > 0);
            }
          }
          const list = admittedBindings.get(variantId) ?? [];
          list.push({ disposition, rowKey: `${file}:${rowKey}`, receiptReady, subspanCells, subspanReceipt, splitRow }); admittedBindings.set(variantId, list);
        }
      }
    }
  }
  for (const [index, rawFamily] of manifest.families.entries()) {
    if (!record(rawFamily)) continue;
    const familyId = typeof rawFamily.family_id === 'string' ? rawFamily.family_id : `families[${index}]`;
    if (familyIds.has(familyId)) issues.push(`duplicate family ID: ${familyId}`);
    familyIds.add(familyId);
    if (census.catalogById.has(familyId)) issues.push(`family ID collides with an existing catalog instruction: ${familyId}`);
    const variants = Array.isArray(rawFamily.variants) ? rawFamily.variants.filter((item): item is string => typeof item === 'string') : [];
    if (variants.length < 2) issues.push(`family ${familyId} has fewer than two variants`);
    const seenLocal = new Set<string>();
    const memberRows: Array<{ variantId: string; rowKey: string }> = [];
    for (const variantId of variants) {
      if (seenLocal.has(variantId)) issues.push(`duplicate variant ID in family ${familyId}: ${variantId}`);
      seenLocal.add(variantId);
      const owner = variantOwners.get(variantId);
      if (owner !== undefined) issues.push(`variant ${variantId} appears in families ${owner} and ${familyId}`);
      variantOwners.set(variantId, familyId);
      if (familyIds.has(variantId)) issues.push(`family/variant ID overlap: ${variantId}`);
      const bindings = admittedBindings.get(variantId) ?? [];
      const admission = admissionsByVariant.get(variantId);
      if (admission !== undefined) {
        referencedAdmissions.add(variantId);
        if (String(admission.family_id ?? '') !== familyId) issues.push(`admission ${variantId} declares family ${String(admission.family_id)}, not ${familyId}`);
        if (bindings.length !== 0) issues.push(`admission variant ${variantId} must have no corpus bindings; observed ${bindings.length}`);
        if (census.catalogById.has(variantId)) issues.push(`admission variant ${variantId} already exists as a catalog instruction`);
        const source = record(admission.source) ? admission.source : {};
        const unit = census.units.find((item) => item.file === String(source.path ?? '') && item.rowKey === String(source.rowKey ?? ''));
        if (unit === undefined) issues.push(`admission source row not found: ${String(source.path ?? '')}:${String(source.rowKey ?? '')}`);
        else {
          if (unit.disposition !== 'deferred' || unit.status !== 'deferred') issues.push(`admission source row is not a deferred family-held row: ${unit.file}:${unit.rowKey} (${unit.disposition}/${unit.status})`);
          if (unit.instructionId !== null || unit.instructionIds.length > 0) issues.push(`admission source row already resolves to instruction(s): ${unit.file}:${unit.rowKey}`);
          const evidence = record(admission.evidence) ? admission.evidence : {};
          const evidenceRel = typeof evidence.path === 'string' ? evidence.path : '';
          const evidenceSha = typeof evidence.sha256 === 'string' ? evidence.sha256 : '';
          if (evidenceRel === '' || evidenceSha === '') issues.push(`admission ${variantId} has no review evidence binding`);
          else {
            const evidencePath = reviewEvidencePath(root, evidenceRel, 'admission review evidence');
            if (!existsSync(evidencePath)) issues.push(`admission review evidence missing: ${evidenceRel}`);
            else {
              const evidenceBytes = readFileSync(evidencePath);
              if (sha256(evidenceBytes) !== evidenceSha) issues.push(`admission review evidence hash mismatch: ${evidenceRel}`);
              else {
                let reviewDocument: unknown;
                try { reviewDocument = JSON.parse(evidenceBytes.toString('utf8')); } catch { reviewDocument = undefined; }
                const reviewRows = Array.isArray(reviewDocument) ? reviewDocument.filter(record) : [];
                const reviewRow = reviewRows.find((item) => item.rowKey === unit.rowKey);
                if (reviewRow === undefined) issues.push(`admission source row has no entry in review evidence ${evidenceRel}: ${unit.file}:${unit.rowKey}`);
                else {
                  if (reviewRow.disposition !== 'HELD') issues.push(`admission source row review disposition is ${String(reviewRow.disposition)}, not family-held HELD: ${unit.file}:${unit.rowKey}`);
                  if (typeof reviewRow.reason !== 'string' || !reviewRow.reason.includes('SBVF family candidate')) issues.push(`admission source row is not a family-held review row: ${unit.file}:${unit.rowKey}`);
                  if (reviewRow.line !== unit.locator.line) issues.push(`admission review evidence locator mismatch: ${unit.file}:${unit.rowKey}`);
                }
              }
            }
          }
        }
        memberRows.push({ variantId, rowKey: `${String(source.path ?? '')}:${String(source.rowKey ?? '')}` });
        continue;
      }
      if (bindings.length !== 1) issues.push(`variant ${variantId} must have exactly one corpus binding; observed ${bindings.length}`);
      if (bindings.some((binding) => binding.disposition !== 'admitted')) issues.push(`variant ${variantId} is bound by a non-admitted row`);
      if (bindings.some((binding) => !binding.receiptReady) || bindings.length === 0) issues.push(`variant ${variantId} has no READY matching fidelity receipt`);
      if (bindings.some((binding) => /split|held|rejected/i.test(binding.disposition) || /split|held|rejected/i.test(binding.rowKey))) issues.push(`variant ${variantId} is SPLIT, held, or rejected`);
      if (!census.catalogById.has(variantId)) issues.push(`variant ${variantId} is not an admitted catalog instruction`);
      for (const binding of bindings) {
        memberRows.push({ variantId, rowKey: binding.rowKey });
        if (binding.subspanCells || binding.subspanReceipt) issues.push(`family variant ${variantId} uses subspan cells or a subspan fidelity receipt; D58 family bindings are whole-cell only: ${binding.rowKey}`);
        if (binding.splitRow) issues.push(`family variant ${variantId} is bound to a SPLIT row; D58/SR-105 exclude SPLIT rows from families: ${binding.rowKey}`);
      }
    }
    const rowOwners = new Map<string, string[]>();
    for (const member of memberRows) {
      const owners = rowOwners.get(member.rowKey) ?? [];
      owners.push(member.variantId);
      rowOwners.set(member.rowKey, owners);
    }
    for (const [rowKey, owners] of rowOwners) {
      const unique = [...new Set(owners)].sort();
      if (unique.length > 1) issues.push(`family ${familyId} binds multiple variants to the same CSV row: ${rowKey} (${unique.join(', ')})`);
    }
  }
  for (const familyId of familyIds) if (variantOwners.has(familyId)) issues.push(`family/variant ID overlap: ${familyId}`);
  for (const variantId of admissionsByVariant.keys()) if (!referencedAdmissions.has(variantId)) issues.push(`admission variant is not referenced by the family manifest: ${variantId}`);
  return { valid: issues.length === 0, issues: [...new Set(issues)].sort() };
}

function summaryMarkdown(report: Dict): string {
  const counts = record(report.counts) ? report.counts : {};
  const byDisposition = record(counts.dispositions) ? counts.dispositions : {};
  const candidates = Array.isArray(report.candidates) ? report.candidates.filter(record) : [];
  const exact = candidates.filter((candidate) => candidate.match === 'exact-title');
  const near = candidates.filter((candidate) => candidate.match === 'near-title-directions');
  const top = [...candidates].sort((a, b) => Number((b.members as unknown[]).length) - Number((a.members as unknown[]).length) || compareText(String(a.familyId), String(b.familyId))).slice(0, 10);
  const eligible = candidates.filter((candidate) => candidate.eligibility === 'eligible');
  const gaps = Array.isArray(report.gaps) ? report.gaps.map(String) : [];
  const lines = ['# SBVF read-only census', '', `- CSV rows: ${String(counts.csvRows)}; catalog instructions: ${String(counts.corpusInstructions)}.`,
    `- Dispositions: admitted ${String(byDisposition.admitted ?? 0)}, deferred ${String(byDisposition.deferred ?? 0)}, rejected ${String(byDisposition.rejected ?? 0)}, merged ${String(byDisposition.merged ?? 0)}.`,
    `- Candidate groups: exact ${exact.length}, near ${near.length}; eligible pilot proposals ${eligible.length}.`, '', '## Top candidates', ''];
  for (const candidate of top) lines.push(`- ${String(candidate.familyId)} — ${(candidate.members as unknown[]).length} members; ${String(candidate.match)}; ${String(candidate.eligibility)}; score ${String(candidate.score)}.`);
  lines.push('', '## Eligible pilot candidates', '');
  if (eligible.length === 0) lines.push('- None.');
  else {
    for (const candidate of eligible.slice(0, 10)) lines.push(`- ${String(candidate.familyId)} — ${(candidate.members as unknown[]).length} members.`);
    lines.push('', 'Eligible candidates may still carry informational title/description conflicts; family membership is an owner decision, not an automatic merge.');
  }
  lines.push('', '## Gaps', '');
  if (gaps.length === 0) lines.push('- None.'); else for (const gap of gaps) lines.push(`- ${gap}`);
  if (record(report.manifestValidation)) lines.push('', `Manifest validation: ${report.manifestValidation.valid === true ? 'valid' : 'invalid'}.`);
  return `${lines.join('\n')}\n`;
}

export function buildCensus(rootInput: string, minScore = 0.7, manifestPath?: string, admissionPath?: string): Dict {
  const root = resolve(rootInput);
  const loaded = loadRoot(root);
  const candidates = buildCandidates(loaded.units, minScore);
  const reconciliation = makeReconciliation(loaded.units, loaded.catalogCount);
  const domainCounts = (domain: 'stack' | 'ux'): Dict => {
    const rows = loaded.units.filter((unit) => unit.domain === domain);
    return { rows: rows.length, admitted: rows.filter((unit) => unit.disposition === 'admitted').length,
      deferred: rows.filter((unit) => unit.disposition === 'deferred').length, rejected: rows.filter((unit) => unit.disposition === 'rejected').length,
      merged: rows.filter((unit) => unit.disposition === 'merged').length };
  };
  const counts: Dict = { corpusInstructions: loaded.catalogCount, csvRows: loaded.units.length,
    dispositions: { admitted: loaded.units.filter((unit) => unit.disposition === 'admitted').length, deferred: loaded.units.filter((unit) => unit.disposition === 'deferred').length,
      rejected: loaded.units.filter((unit) => unit.disposition === 'rejected').length, merged: loaded.units.filter((unit) => unit.disposition === 'merged').length },
    byDomain: { ux: domainCounts('ux'), stack: domainCounts('stack') } };
  const report: Dict = { schema: 'SBVFCensus/v1', minScore, counts, reconciliation: { expected, observed: reconciliation.observed, checks: reconciliation.checks },
    candidateCounts: { exact: candidates.filter((candidate) => candidate.match === 'exact-title').length, near: candidates.filter((candidate) => candidate.match === 'near-title-directions').length, eligible: candidates.filter((candidate) => candidate.eligibility === 'eligible').length },
    clusters: clustersFor(loaded.units, candidates), candidates,
    units: loaded.units.map(({ _tokens: _ignoredTokens, _titleKey: _ignoredTitle, ...unit }) => unit), gaps: reconciliation.gaps };
  if (manifestPath !== undefined) {
    const result = validateManifest(resolve(manifestPath), root, loaded, admissionPath === undefined ? undefined : resolve(admissionPath));
    report.manifestValidation = result;
    if (result.valid !== true) report.gaps = [...reconciliation.gaps, ...(Array.isArray(result.issues) ? result.issues.map(String) : [])].sort();
  }
  return report;
}

type CliOptions = { root: string; out?: string; summary?: string; manifest?: string; admissions?: string; minScore: number; json: boolean };
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = { root: packageRoot, minScore: 0.7, json: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    const value = (): string => { const next = args[index + 1]; if (next === undefined || next.startsWith('--')) fail(`missing value for ${arg}`); index += 1; return next; };
    if (arg === '--root') options.root = resolve(value());
    else if (arg === '--out') options.out = resolve(value());
    else if (arg === '--summary') options.summary = resolve(value());
    else if (arg === '--manifest') options.manifest = resolve(value());
    else if (arg === '--admissions') options.admissions = resolve(value());
    else if (arg === '--min-score') { const number = Number(value()); if (!Number.isFinite(number) || number < 0 || number > 1) fail('--min-score must be between 0 and 1'); options.minScore = number; }
    else if (arg === '--json') options.json = true;
    else fail(`unknown option: ${arg}`);
  }
  return options;
}

function main(): void {
  try {
    const options = parseArgs(process.argv.slice(2));
    const report = buildCensus(options.root, options.minScore, options.manifest, options.admissions);
    const json = stableJson(report);
    if (options.out !== undefined) { mkdirSync(dirname(options.out), { recursive: true }); writeFileSync(options.out, json, 'utf8'); }
    if (options.summary !== undefined) { mkdirSync(dirname(options.summary), { recursive: true }); writeFileSync(options.summary, summaryMarkdown(report), 'utf8'); }
    process.stdout.write(options.json ? json : summaryMarkdown(report));
    if (record(report.manifestValidation) && report.manifestValidation.valid !== true) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`sbvf-census: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 2;
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
