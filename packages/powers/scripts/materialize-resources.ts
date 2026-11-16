import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cellHash, cellsDigest, parseCsv, rowHash, sha256Bytes, type CsvRecord } from './csv-intake.ts';
import { canonicalJson, validateAgainstSchema, type Schema } from '../skills/vp-mode/scripts/schema.ts';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PILOT_LIMIT = 25;
const RESOURCE_MAX_BYTES = 65_536;
const DONOR = 'uupm';
const RESOURCE_SCHEMA_PATH = join(packageRoot, 'config', 'vpreference-resource.v1.schema.json');
const CATALOG_SCHEMA_PATH = join(packageRoot, 'config', 'vpcatalog.v1.schema.json');
const MAP_SCHEMA_PATH = join(packageRoot, 'config', 'vpcorpusmap.v3.schema.json');
const ALLOWLIST_PATH = join(packageRoot, 'config', 'h3-csv-allowlist.json');
const STAGING_DIR = join(packageRoot, '.tmp', 'h3-materialize-staging');

type Dict = Record<string, unknown>;
type DonorRecord = { id: string; local_path?: string; content_path?: string; head_sha?: string; license?: string };
type LicenseFamily = { name: string; license: string };
type LicensesFile = {
  source: { repository: string; revision: string };
  families: LicenseFamily[];
};

type FamilyName = 'font-pairing' | 'palette' | 'style' | 'icon-list';
type Family = {
  csvPath: string;
  licensesPath?: string;
  resourceType: string;
  idPrefix: string;
  pilotScope: string;
  ineligibleReason: string;
};

// H3 palette pilot payload contract (VPReferenceResource/v1, resource_type
// "palette"): palette_name is the Product Type cell verbatim; colors maps each
// colors.csv color column to its snake_case key with the exact hex string;
// notes is the Notes cell verbatim. Resource IDs are
// uupm-palette-<slug of Product Type>. Provenance carries one entry per source
// row (donor, license, pinned revision, colors.csv path, raw-file SHA-256,
// line/row locator); colors.csv has no license companion, so there is no
// license-file join.
const PALETTE_COLOR_COLUMNS: ReadonlyArray<readonly [string, string]> = [
  ['Primary', 'primary'],
  ['On Primary', 'on_primary'],
  ['Secondary', 'secondary'],
  ['On Secondary', 'on_secondary'],
  ['Accent', 'accent'],
  ['On Accent', 'on_accent'],
  ['Background', 'background'],
  ['Foreground', 'foreground'],
  ['Card', 'card'],
  ['Card Foreground', 'card_foreground'],
  ['Muted', 'muted'],
  ['Muted Foreground', 'muted_foreground'],
  ['Border', 'border'],
  ['Destructive', 'destructive'],
  ['On Destructive', 'on_destructive'],
  ['Ring', 'ring'],
];

// H3 style pilot payload contract (VPReferenceResource/v1, resource_type
// "style"): every styles.csv column except `No` is admitted verbatim as a
// snake_case string; `No` is excluded because it duplicates
// provenance.locator.row. Resource IDs are uupm-style-<slug of Style ID>.
// Provenance carries one entry per source row (donor, license, pinned
// revision, styles.csv path, raw-file SHA-256, line/row locator); styles.csv
// has no license companion, so there is no license-file join.
const STYLE_COLUMNS: ReadonlyArray<readonly [string, string]> = [
  ['Style Category', 'style_category'],
  ['Type', 'type'],
  ['Keywords', 'keywords'],
  ['Primary Colors', 'primary_colors'],
  ['Secondary Colors', 'secondary_colors'],
  ['Effects & Animation', 'effects_and_animation'],
  ['Best For', 'best_for'],
  ['Do Not Use For', 'do_not_use_for'],
  ['Light Mode ✓', 'light_mode'],
  ['Dark Mode ✓', 'dark_mode'],
  ['Performance', 'performance'],
  ['Accessibility', 'accessibility'],
  ['Mobile-Friendly', 'mobile_friendly'],
  ['Conversion-Focused', 'conversion_focused'],
  ['Framework Compatibility', 'framework_compatibility'],
  ['Era/Origin', 'era_origin'],
  ['Complexity', 'complexity'],
  ['AI Prompt Keywords', 'ai_prompt_keywords'],
  ['CSS/Technical Keywords', 'css_technical_keywords'],
  ['Implementation Checklist', 'implementation_checklist'],
  ['Design System Variables', 'design_system_variables'],
  ['Style ID', 'style_id'],
  ['Aliases', 'aliases'],
  ['Status', 'status'],
  ['Parent Style ID', 'parent_style_id'],
  ['Replacement Domain', 'replacement_domain'],
  ['Replacement ID', 'replacement_id'],
  ['Preferred Mode', 'preferred_mode'],
];

// H3 icon-list pilot payload contract (VPReferenceResource/v1, resource_type
// "icon-list"): every icons.csv column except `No` is admitted verbatim as a
// snake_case string; `No` is excluded because it duplicates
// provenance.locator.row. Resource IDs are uupm-icon-<slug of Icon Name>.
// Provenance carries one entry per source row (donor, license, pinned
// revision, icons.csv path, raw-file SHA-256, line/row locator); icons.csv
// has no license companion, so there is no license-file join.
const ICON_LIST_COLUMNS: ReadonlyArray<readonly [string, string]> = [
  ['Category', 'category'],
  ['Icon Name', 'icon_name'],
  ['Keywords', 'keywords'],
  ['Library', 'library'],
  ['Import Code', 'import_code'],
  ['Usage', 'usage'],
  ['Best For', 'best_for'],
  ['Style', 'style'],
  ['Semantic Role', 'semantic_role'],
  ['Allowed Contexts', 'allowed_contexts'],
];

const FAMILIES: Record<FamilyName, Family> = {
  'font-pairing': {
    csvPath: 'typography.csv',
    licensesPath: 'google-font-licenses.json',
    resourceType: 'font-pairing',
    idPrefix: 'uupm-font-pairing',
    pilotScope: 'font-pairing',
    ineligibleReason: 'font license unresolved in google-font-licenses.json; deferred pending license evidence',
  },
  palette: {
    csvPath: 'colors.csv',
    resourceType: 'palette',
    idPrefix: 'uupm-palette',
    pilotScope: 'palette',
    ineligibleReason: 'palette row outside the approved 25-record H3 palette pilot',
  },
  style: {
    csvPath: 'styles.csv',
    resourceType: 'style',
    idPrefix: 'uupm-style',
    pilotScope: 'style',
    ineligibleReason: 'style row is not admissible for materialization',
  },
  'icon-list': {
    csvPath: 'icons.csv',
    resourceType: 'icon-list',
    idPrefix: 'uupm-icon',
    pilotScope: 'icon-list',
    ineligibleReason: 'icon-list row is not admissible for materialization',
  },
};

function fail(message: string): never {
  throw new Error(message);
}

function isRecord(value: unknown): value is Dict {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '');
}

function splitList(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter((item) => item !== '');
}

function familyFromArgv(argv: string[]): FamilyName {
  const index = argv.indexOf('--family');
  if (index < 0) return 'font-pairing';
  const value = argv[index + 1];
  if (value === 'font-pairing' || value === 'palette' || value === 'style' || value === 'icon-list') return value;
  fail(`unknown --family ${String(value)}; expected font-pairing, palette, style or icon-list`);
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

async function readDonor(): Promise<DonorRecord> {
  const parsed = Bun.YAML.parse(await readFile(join(packageRoot, 'donors.yaml'), 'utf8')) as unknown;
  if (!isRecord(parsed) || !Array.isArray(parsed.donors)) fail('donors.yaml has no donors list');
  const donor = parsed.donors.find((item): item is Dict => isRecord(item) && item.id === DONOR);
  if (donor === undefined) fail(`donors.yaml has no ${DONOR} donor`);
  const record: DonorRecord = { id: DONOR };
  for (const key of ['local_path', 'content_path', 'head_sha', 'license'] as const) {
    const value = donor[key];
    if (typeof value === 'string') record[key] = value;
  }
  if (record.local_path === undefined || record.content_path === undefined || record.head_sha === undefined || record.license === undefined) {
    fail(`donors.yaml ${DONOR} record is missing local_path, content_path, head_sha or license`);
  }
  return record;
}

function familyLines(text: string): Map<string, { line: number; index: number }> {
  const lines = text.split(/\r?\n/u);
  const result = new Map<string, { line: number; index: number }>();
  lines.forEach((line, index) => {
    const match = /^\s*"name":\s*"((?:[^"\\]|\\.)*)",?\s*$/u.exec(line);
    if (match === null) return;
    const name = JSON.parse(`"${match[1]}"`) as string;
    if (!result.has(name)) result.set(name, { line: index + 1, index: result.size });
  });
  return result;
}

async function writeAtomic(path: string, content: string | Uint8Array): Promise<void> {
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, content);
  await rename(temporary, path);
}

async function readAllowlist(): Promise<Dict[]> {
  if (!existsSync(ALLOWLIST_PATH)) return [];
  const raw = await readJson(ALLOWLIST_PATH);
  if (!Array.isArray(raw)) fail('config/h3-csv-allowlist.json is not an array');
  return raw.filter(isRecord);
}

function mergeAllowlistEntry(entries: Dict[], entry: Dict): Dict[] {
  const existing = entries.find((item) => item.donor === entry.donor && item.path === entry.path);
  if (existing !== undefined) {
    if (existing.rawSha256 !== entry.rawSha256 || existing.headersDigest !== entry.headersDigest) {
      fail(`config/h3-csv-allowlist.json already maps ${String(entry.donor)}:${String(entry.path)} to different digests`);
    }
    return entries;
  }
  return [...entries, entry];
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const familyName = familyFromArgv(process.argv);
  const family = FAMILIES[familyName];
  const stageIndex = process.argv.indexOf('--stage');
  const stageDir = stageIndex >= 0 && process.argv[stageIndex + 1] !== undefined ? resolve(process.argv[stageIndex + 1] as string) : STAGING_DIR;

  const donor = await readDonor();
  const contentDir = join(packageRoot, '.tmp', 'donors', donor.local_path as string, donor.content_path as string);
  const csvPath = join(contentDir, family.csvPath);
  const csvBytes = await readFile(csvPath);
  const csvSha = sha256Bytes(csvBytes);
  const parsed = parseCsv(csvBytes);
  let licenses: LicensesFile | undefined;
  let licensesSha: string | undefined;
  const licenseByName = new Map<string, string>();
  const familyLocation = new Map<string, { line: number; index: number }>();
  if (family.licensesPath !== undefined) {
    const licensesPath = join(contentDir, family.licensesPath);
    const licensesBytes = await readFile(licensesPath);
    licensesSha = sha256Bytes(licensesBytes);
    licenses = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(licensesBytes)) as LicensesFile;
    if (!Array.isArray(licenses.families)) fail(`${family.licensesPath} has no families array`);
    for (const item of licenses.families) licenseByName.set(item.name, item.license);
    for (const [name, location] of familyLines(new TextDecoder('utf-8', { fatal: true }).decode(licensesBytes))) {
      familyLocation.set(name, location);
    }
  }

  const headerIndex = new Map(parsed.headers.map((header, index) => [header, index]));
  const cell = (record: CsvRecord, header: string): string => record.cells[headerIndex.get(header) ?? -1] ?? '';

  const catalogBytes = await readFile(join(packageRoot, 'catalog.json'));
  const mapBytes = await readFile(join(packageRoot, 'corpus-map.json'));
  const catalog = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(catalogBytes)) as Dict;
  const map = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(mapBytes)) as Dict;
  if (catalog.schema !== 'VPCatalog/v1') fail(`catalog.json schema is ${String(catalog.schema)}, expected VPCatalog/v1`);
  if (map.schema !== 'VPCorpusMap/v3') fail(`corpus-map.json schema is ${String(map.schema)}, expected VPCorpusMap/v3`);
  const catalogSchemaErrors = validateAgainstSchema(catalog, JSON.parse(await readFile(CATALOG_SCHEMA_PATH, 'utf8')) as Schema);
  if (catalogSchemaErrors.length > 0) fail(`catalog.json failed schema validation: ${catalogSchemaErrors.join('; ')}`);
  const mapSchemaErrors = validateAgainstSchema(map, JSON.parse(await readFile(MAP_SCHEMA_PATH, 'utf8')) as Schema);
  if (mapSchemaErrors.length > 0) fail(`corpus-map.json failed schema validation: ${mapSchemaErrors.join('; ')}`);
  const resourceSchema = JSON.parse(await readFile(RESOURCE_SCHEMA_PATH, 'utf8')) as Schema;
  const donors = isRecord(map.donors) ? map.donors : fail('corpus-map.json has no donors object');
  const uupm = isRecord(donors[DONOR]) ? donors[DONOR] : fail('corpus-map.json has no uupm donor');
  if (!isRecord(uupm.csvSources)) fail('corpus-map.json uupm donor has no csvSources');
  if (Object.prototype.hasOwnProperty.call(uupm.csvSources, family.csvPath)) fail(`corpus-map.json already maps ${DONOR}:${family.csvPath}`);
  const existingResources = Array.isArray(catalog.resources) ? catalog.resources.filter(isRecord) : [];
  const existingIds = new Set(existingResources.map((entry) => String(entry.resource_id ?? '')));

  const encode = (value: string): string => [...Buffer.from(value, 'utf8')]
    .map((byte) => {
      const character = String.fromCharCode(byte);
      return /[A-Za-z0-9._~-]/u.test(character) ? character : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
    })
    .join('');
  const encodePath = (value: string): string => value.split('/').map(encode).join('/');

  const groups = new Map<string, { cells: string[]; hashes: string[]; records: CsvRecord[] }>();
  for (const record of parsed.rows) {
    const hashes = record.cells.map(cellHash);
    const key = `path=${encodePath(family.csvPath)}&headers=${parsed.headersDigest}&cells=${cellsDigest(record.cells)}`;
    const group = groups.get(key);
    if (group === undefined) groups.set(key, { cells: record.cells, hashes, records: [record] });
    else group.records.push(record);
  }

  const usedSlugs = new Set<string>();
  const resources: Array<{ id: string; record: Dict; bytes: Uint8Array }> = [];
  const rowPlans: Array<{ key: string; group: { cells: string[]; hashes: string[]; records: CsvRecord[] }; eligible: boolean; admittedId?: string }> = [];
  let admitted = 0;
  let skippedIneligible = 0;

  for (const [key, group] of groups) {
    const first = group.records[0] as CsvRecord;
    let eligible = true;
    if (familyName === 'font-pairing') {
      const headingLicense = licenseByName.get(cell(first, 'Heading Font'));
      const bodyLicense = licenseByName.get(cell(first, 'Body Font'));
      eligible = headingLicense !== undefined && bodyLicense !== undefined;
    }
    const admissible = familyName === 'palette' || familyName === 'style' || familyName === 'icon-list' ? first.row <= PILOT_LIMIT : true;
    let admittedId: string | undefined;
    if (eligible && admissible && admitted < PILOT_LIMIT) {
      admitted += 1;
      const name = familyName === 'palette' ? cell(first, 'Product Type') : familyName === 'style' ? cell(first, 'Style ID') : familyName === 'icon-list' ? cell(first, 'Icon Name') : cell(first, 'Font Pairing Name');
      const base = `${family.idPrefix}-${slugify(name)}`;
      let id = base;
      for (let suffix = 2; usedSlugs.has(id) || existingIds.has(id); suffix += 1) id = `${base}-${suffix}`;
      if (id !== base) console.log(`slug disambiguation: ${base} -> ${id}`);
      usedSlugs.add(id);
      const provenance: Dict[] = group.records.map((record) => ({
        donor: DONOR,
        license: donor.license as string,
        revision: donor.head_sha as string,
        path: `src/ui-ux-pro-max/data/${family.csvPath}`,
        sha256: csvSha,
        locator: { line: record.line, row: record.row },
      }));
      let payload: Dict;
      if (familyName === 'palette') {
        const colors: Dict = {};
        for (const [header, colorKey] of PALETTE_COLOR_COLUMNS) colors[colorKey] = cell(first, header);
        payload = { palette_name: name, colors, notes: cell(first, 'Notes') };
      } else if (familyName === 'style') {
        const stylePayload: Dict = {};
        for (const [header, styleKey] of STYLE_COLUMNS) stylePayload[styleKey] = cell(first, header);
        payload = stylePayload;
      } else if (familyName === 'icon-list') {
        const iconPayload: Dict = {};
        for (const [header, iconKey] of ICON_LIST_COLUMNS) iconPayload[iconKey] = cell(first, header);
        payload = iconPayload;
      } else {
        const heading = cell(first, 'Heading Font');
        const body = cell(first, 'Body Font');
        const fontLicenses: Record<string, string> = {};
        for (const font of [...new Set([heading, body])]) {
          const license = licenseByName.get(font);
          if (license === undefined) fail(`font ${font} lost its license during materialization`);
          fontLicenses[font] = license;
          const location = familyLocation.get(font);
          if (location === undefined) fail(`font ${font} has no line in ${family.licensesPath ?? ''}`);
          provenance.push({
            donor: DONOR,
            license: donor.license as string,
            revision: donor.head_sha as string,
            path: `src/ui-ux-pro-max/data/${family.licensesPath ?? ''}`,
            sha256: licensesSha,
            locator: { line: location.line, row: location.index },
          });
        }
        payload = {
          name,
          category: cell(first, 'Category'),
          heading_font: heading,
          body_font: body,
          mood_keywords: splitList(cell(first, 'Mood/Style Keywords')),
          best_for: splitList(cell(first, 'Best For')),
          google_fonts_url: cell(first, 'Google Fonts URL'),
          css_import: cell(first, 'CSS Import'),
          tailwind_config: cell(first, 'Tailwind Config'),
          notes: cell(first, 'Notes'),
          font_licenses: fontLicenses,
          license_source: {
            path: `src/ui-ux-pro-max/data/${family.licensesPath ?? ''}`,
            upstream_repository: licenses?.source.repository,
            upstream_revision: licenses?.source.revision,
          },
        };
      }
      const record: Dict = {
        schema: 'VPReferenceResource/v1',
        resource_id: id,
        resource_type: family.resourceType,
        revision: 1,
        status: 'active',
        provenance,
        payload,
      };
      const unsigned = canonicalJson(record);
      if (unsigned === undefined) fail(`resource ${id} is not canonically serializable`);
      record.digest = `sha256:${createHash('sha256').update(unsigned, 'utf8').digest('hex')}`;
      const text = `${canonicalJson(record) ?? fail(`resource ${id} is not canonically serializable`)}\n`;
      const bytes = new TextEncoder().encode(text);
      if (bytes.length > RESOURCE_MAX_BYTES) fail(`resource ${id} exceeds ${RESOURCE_MAX_BYTES} bytes`);
      const schemaErrors = validateAgainstSchema(record, resourceSchema);
      if (schemaErrors.length > 0) fail(`resource ${id} failed schema validation: ${schemaErrors.join('; ')}`);
      resources.push({ id, record, bytes });
      admittedId = id;
    } else if (!eligible) {
      skippedIneligible += 1;
    }
    rowPlans.push({ key, group, eligible, ...(admittedId === undefined ? {} : { admittedId }) });
  }

  if (admitted !== PILOT_LIMIT) fail(`only ${admitted} eligible rows found; pilot requires ${PILOT_LIMIT}`);

  const rows = rowPlans.map((plan) => {
    const locators = plan.group.records
      .flatMap((record) => record.locators)
      .sort((left, right) => left.line - right.line || left.row - right.row)
      .filter((locator, index, all) => all.findIndex((item) => item.line === locator.line && item.row === locator.row) === index);
    const admittedId = plan.admittedId;
    const base = {
      rowKey: plan.key,
      rowHash: rowHash(plan.key, parsed.headersDigest, plan.group.hashes),
      cellHashes: plan.group.hashes,
      locator: locators[0] as { line: number; row: number },
      locators,
      disposition: admittedId === undefined ? 'deferred' : 'admitted',
      bindings: [],
      resourceIds: admittedId === undefined ? [] : [{ id: admittedId, disposition: 'admitted', reason: `materialized as VPReferenceResource/v1 ${family.resourceType} record` }],
      mergedInto: null,
    };
    if (admittedId === undefined) {
      return { ...base, reason: plan.eligible ? `outside the approved 25-record H3 ${family.pilotScope} pilot` : family.ineligibleReason };
    }
    return base;
  });

  const csvSource = {
    rawSha256: parsed.rawSha256,
    headersDigest: parsed.headersDigest,
    columns: parsed.headers.map((header, index) => ({ index, header, role: 'metadata-other' })),
    rows,
  };

  const now = new Date().toISOString();
  const nextCatalog: Dict = {
    ...catalog,
    revision: Number(catalog.revision) + 1,
    updated_at: now,
    resources: [
      ...existingResources.map((entry) => ({ resource_id: entry.resource_id, path: entry.path, sha256: entry.sha256 })),
      ...resources.map((resource) => ({
        resource_id: resource.id,
        path: `resources/${resource.id}.json`,
        sha256: createHash('sha256').update(resource.bytes).digest('hex'),
      })),
    ].sort((left, right) => String(left.resource_id).localeCompare(String(right.resource_id))),
  };
  const nextMap: Dict = JSON.parse(JSON.stringify(map)) as Dict;
  const nextDonors = nextMap.donors as Dict;
  const nextUupm = JSON.parse(JSON.stringify(uupm)) as Dict;
  const nextSources = nextUupm.csvSources as Dict;
  const sortedSources: Dict = {};
  for (const key of [...Object.keys(nextSources), family.csvPath].sort()) {
    sortedSources[key] = key === family.csvPath ? csvSource : nextSources[key];
  }
  nextUupm.csvSources = sortedSources;
  nextDonors[DONOR] = nextUupm;
  nextMap.donors = nextDonors;
  nextMap.revision = Number(map.revision) + 1;
  nextMap.updated_at = now;

  const catalogText = `${JSON.stringify(nextCatalog, null, 2)}\n`;
  const mapText = `${JSON.stringify(nextMap, null, 2)}\n`;
  const allowlistEntry = { donor: DONOR, path: family.csvPath, rawSha256: parsed.rawSha256, headersDigest: parsed.headersDigest };
  const allowlistText = `${JSON.stringify(mergeAllowlistEntry(await readAllowlist(), allowlistEntry), null, 2)}\n`;

  const outputs: Array<{ path: string; content: string | Uint8Array }> = [
    { path: join(stageDir, 'catalog.json'), content: catalogText },
    { path: join(stageDir, 'corpus-map.json'), content: mapText },
    { path: join(stageDir, 'config', 'h3-csv-allowlist.json'), content: allowlistText },
    { path: join(stageDir, 'beforeimages.json'), content: `${JSON.stringify({ catalog_sha256: createHash('sha256').update(catalogBytes).digest('hex'), map_sha256: createHash('sha256').update(mapBytes).digest('hex') }, null, 2)}\n` },
    ...resources.map((resource) => ({ path: join(stageDir, 'resources', `${resource.id}.json`), content: resource.bytes })),
  ];

  if (apply) {
    const before = await readJson(join(stageDir, 'beforeimages.json')) as Dict;
    const liveCatalogSha = createHash('sha256').update(await readFile(join(packageRoot, 'catalog.json'))).digest('hex');
    const liveMapSha = createHash('sha256').update(await readFile(join(packageRoot, 'corpus-map.json'))).digest('hex');
    if (liveCatalogSha !== before.catalog_sha256 || liveMapSha !== before.map_sha256) {
      fail('live catalog.json or corpus-map.json changed since staging; rebuild the stage');
    }
    const mergedAllowlistText = `${JSON.stringify(mergeAllowlistEntry(await readAllowlist(), allowlistEntry), null, 2)}\n`;
    const existingAllowlistText = existsSync(ALLOWLIST_PATH) ? await readFile(ALLOWLIST_PATH, 'utf8') : undefined;
    if (existingAllowlistText !== mergedAllowlistText) await writeAtomic(ALLOWLIST_PATH, mergedAllowlistText);
    await mkdir(join(packageRoot, 'resources'), { recursive: true });
    for (const resource of resources) {
      await writeAtomic(join(packageRoot, 'resources', `${resource.id}.json`), resource.bytes);
    }
    await writeAtomic(join(packageRoot, 'catalog.json'), catalogText);
    await writeAtomic(join(packageRoot, 'corpus-map.json'), mapText);
    console.log(`applied ${resources.length} resources; catalog revision ${String(catalog.revision)} -> ${String(nextCatalog.revision)}; map revision ${String(map.revision)} -> ${String(nextMap.revision)}`);
    return;
  }

  for (const output of outputs) {
    await mkdir(dirname(output.path), { recursive: true });
    await writeFile(output.path, output.content);
  }
  console.log(`staged ${resources.length} resources at ${stageDir}`);
  console.log(`admitted rows: ${admitted}; deferred: ${rows.length - admitted - skippedIneligible}; ineligible: ${skippedIneligible}`);
  console.log(`catalog revision ${String(catalog.revision)} -> ${String(nextCatalog.revision)}; map revision ${String(map.revision)} -> ${String(nextMap.revision)}`);
  for (const resource of resources) console.log(`  ${resource.id} (${Buffer.byteLength(resource.bytes)} bytes)`);
}

await main();
