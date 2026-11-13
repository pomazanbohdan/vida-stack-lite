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
const CSV_PATH = 'typography.csv';
const LICENSES_PATH = 'google-font-licenses.json';
const RESOURCE_SCHEMA_PATH = join(packageRoot, 'config', 'vpreference-resource.v1.schema.json');
const CATALOG_SCHEMA_PATH = join(packageRoot, 'config', 'vpcatalog.v1.schema.json');
const MAP_SCHEMA_PATH = join(packageRoot, 'config', 'vpcorpusmap.v3.schema.json');
const STAGING_DIR = join(packageRoot, '.tmp', 'h3-materialize-staging');

type Dict = Record<string, unknown>;
type DonorRecord = { id: string; local_path?: string; content_path?: string; head_sha?: string; license?: string };
type LicenseFamily = { name: string; license: string };
type LicensesFile = {
  source: { repository: string; revision: string };
  families: LicenseFamily[];
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

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const stageIndex = process.argv.indexOf('--stage');
  const stageDir = stageIndex >= 0 && process.argv[stageIndex + 1] !== undefined ? resolve(process.argv[stageIndex + 1] as string) : STAGING_DIR;

  const donor = await readDonor();
  const contentDir = join(packageRoot, '.tmp', 'donors', donor.local_path as string, donor.content_path as string);
  const csvPath = join(contentDir, CSV_PATH);
  const licensesPath = join(contentDir, LICENSES_PATH);
  const csvBytes = await readFile(csvPath);
  const licensesBytes = await readFile(licensesPath);
  const csvSha = sha256Bytes(csvBytes);
  const licensesSha = sha256Bytes(licensesBytes);
  const parsed = parseCsv(csvBytes);
  const licenses = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(licensesBytes)) as LicensesFile;
  if (!Array.isArray(licenses.families)) fail(`${LICENSES_PATH} has no families array`);
  const licenseByName = new Map(licenses.families.map((family) => [family.name, family.license]));
  const familyLocation = familyLines(new TextDecoder('utf-8', { fatal: true }).decode(licensesBytes));

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
  if (Object.prototype.hasOwnProperty.call(uupm.csvSources, CSV_PATH)) fail(`corpus-map.json already maps ${DONOR}:${CSV_PATH}`);
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
    const key = `path=${encodePath(CSV_PATH)}&headers=${parsed.headersDigest}&cells=${cellsDigest(record.cells)}`;
    const group = groups.get(key);
    if (group === undefined) groups.set(key, { cells: record.cells, hashes, records: [record] });
    else group.records.push(record);
  }

  const usedSlugs = new Set<string>();
  const resources: Array<{ id: string; record: Dict; bytes: Uint8Array }> = [];
  const rowPlans: Array<{ key: string; group: { cells: string[]; hashes: string[]; records: CsvRecord[] }; admittedId?: string }> = [];
  let admitted = 0;
  let skippedIneligible = 0;

  for (const [key, group] of groups) {
    const first = group.records[0] as CsvRecord;
    const heading = cell(first, 'Heading Font');
    const body = cell(first, 'Body Font');
    const headingLicense = licenseByName.get(heading);
    const bodyLicense = licenseByName.get(body);
    const eligible = headingLicense !== undefined && bodyLicense !== undefined;
    let admittedId: string | undefined;
    if (eligible && admitted < PILOT_LIMIT) {
      admitted += 1;
      const base = `uupm-font-pairing-${slugify(cell(first, 'Font Pairing Name'))}`;
      let id = base;
      for (let suffix = 2; usedSlugs.has(id) || existingIds.has(id); suffix += 1) id = `${base}-${suffix}`;
      usedSlugs.add(id);
      const name = cell(first, 'Font Pairing Name');
      const provenance: Dict[] = group.records.map((record) => ({
        donor: DONOR,
        license: donor.license as string,
        revision: donor.head_sha as string,
        path: `src/ui-ux-pro-max/data/${CSV_PATH}`,
        sha256: csvSha,
        locator: { line: record.line, row: record.row },
      }));
      const fontLicenses: Record<string, string> = {};
      for (const font of [...new Set([heading, body])]) {
        const license = licenseByName.get(font);
        if (license === undefined) fail(`font ${font} lost its license during materialization`);
        fontLicenses[font] = license;
        const location = familyLocation.get(font);
        if (location === undefined) fail(`font ${font} has no line in ${LICENSES_PATH}`);
        provenance.push({
          donor: DONOR,
          license: donor.license as string,
          revision: donor.head_sha as string,
          path: `src/ui-ux-pro-max/data/${LICENSES_PATH}`,
          sha256: licensesSha,
          locator: { line: location.line, row: location.index },
        });
      }
      const record: Dict = {
        schema: 'VPReferenceResource/v1',
        resource_id: id,
        resource_type: 'font-pairing',
        revision: 1,
        status: 'active',
        provenance,
        payload: {
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
            path: `src/ui-ux-pro-max/data/${LICENSES_PATH}`,
            upstream_repository: licenses.source.repository,
            upstream_revision: licenses.source.revision,
          },
        },
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
    rowPlans.push({ key, group, ...(admittedId === undefined ? {} : { admittedId }) });
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
      resourceIds: admittedId === undefined ? [] : [{ id: admittedId, disposition: 'admitted', reason: 'materialized as VPReferenceResource/v1 font-pairing record' }],
      mergedInto: null,
    };
    if (admittedId === undefined) {
      const eligibleGroup = licenseByName.has(cell(plan.group.records[0] as CsvRecord, 'Heading Font')) && licenseByName.has(cell(plan.group.records[0] as CsvRecord, 'Body Font'));
      return { ...base, reason: eligibleGroup ? 'outside the approved 25-record H3 font-pairing pilot' : 'font license unresolved in google-font-licenses.json; deferred pending license evidence' };
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
  for (const key of [...Object.keys(nextSources), CSV_PATH].sort()) {
    sortedSources[key] = key === CSV_PATH ? csvSource : nextSources[key];
  }
  nextUupm.csvSources = sortedSources;
  nextDonors[DONOR] = nextUupm;
  nextMap.donors = nextDonors;
  nextMap.revision = Number(map.revision) + 1;
  nextMap.updated_at = now;

  const catalogText = `${JSON.stringify(nextCatalog, null, 2)}\n`;
  const mapText = `${JSON.stringify(nextMap, null, 2)}\n`;
  const allowlistText = `${JSON.stringify([{ donor: DONOR, path: CSV_PATH, rawSha256: parsed.rawSha256, headersDigest: parsed.headersDigest }], null, 2)}\n`;

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
    if (!existsSync(join(packageRoot, 'config', 'h3-csv-allowlist.json'))) {
      await writeAtomic(join(packageRoot, 'config', 'h3-csv-allowlist.json'), allowlistText);
    } else {
      const existing = await readFile(join(packageRoot, 'config', 'h3-csv-allowlist.json'), 'utf8');
      if (existing !== allowlistText) fail('config/h3-csv-allowlist.json already exists with different content');
    }
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
