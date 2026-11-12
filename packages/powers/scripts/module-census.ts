import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { parseModuleAtoms, parseModuleSections } from '../skills/vp-mode/scripts/modules.ts';

type Dict = Record<string, unknown>;
type Atom = {
  id: string;
  file: string;
  source: { donor: string; path: string };
  pathOnly: string;
  fileBytes: number;
  bodyBytes: number;
  fileSha256: string;
  contentSha256: string;
};
type Pilot = { source: string; expectedAtoms: number; observedAtoms: number; carrierBytesEstimate: number; members: Atom[] };
type RuleResult = {
  groups: number;
  carriers: number;
  singletonAtomFiles: number;
  currentEntries: number;
  allIn: number;
  groupSizeDistribution: Record<string, number>;
  groupsOverCap: number;
  largestGroups: Array<{ source: string; atoms: number; carriers: number }>;
  pilots: Record<string, Pilot>;
};
export type ModuleCensus = {
  cap: number;
  catalogInstructions: number;
  csvAtoms: number;
  nonCsvAtoms: number;
  pendingNonCsvAtoms: number;
  rules: Record<'map-primary' | 'first-provenance-donor-path' | 'first-provenance-path-only', RuleResult>;
};

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isRecord = (value: unknown): value is Dict => typeof value === 'object' && value !== null && !Array.isArray(value);
const compare = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
const sha256 = (bytes: Uint8Array | string): string => createHash('sha256').update(bytes).digest('hex');
const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8')) as unknown;
function fail(message: string): never { throw new Error(message); }

function contained(root: string, relativePath: string, label: string): string {
  if (isAbsolute(relativePath)) fail(`${label} path must be relative: ${relativePath}`);
  const absolute = resolve(root, relativePath);
  const rel = relative(root, absolute);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail(`${label} path escapes root: ${relativePath}`);
  return absolute;
}

function provenanceSource(value: unknown, instructionId: string): { donor: string; path: string } {
  const first = Array.isArray(value) ? value[0] : undefined;
  if (typeof first !== 'string') fail(`instruction ${instructionId} has invalid first provenance entry`);
  const fields = new Map<string, string>(first.split(';').map((part): [string, string] => {
    const separator = part.indexOf('=');
    return separator < 0 ? ['', ''] : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  }));
  const donor = fields.get('donor');
  const path = fields.get('path');
  if (donor === undefined || donor === '' || path === undefined || path === '') fail(`instruction ${instructionId} has invalid first provenance donor/path`);
  return { donor, path };
}

function csvInstructionIds(map: Dict): Set<string> {
  if (!isRecord(map.donors)) fail('corpus-map.json has no donors object');
  const result = new Set<string>();
  for (const donor of Object.values(map.donors)) {
    if (!isRecord(donor) || donor.csvSources === undefined) continue;
    if (!isRecord(donor.csvSources)) fail('corpus-map.json csvSources must be an object');
    for (const source of Object.values(donor.csvSources)) {
      const rows = isRecord(source) ? source.rows : undefined;
      if (!Array.isArray(rows)) fail('corpus-map.json csvSources row list is invalid');
      for (const row of rows) {
        const bindings = isRecord(row) ? row.bindings : undefined;
        if (!Array.isArray(bindings)) fail('corpus-map.json CSV row bindings are invalid');
        for (const binding of bindings) {
          const instructionId = isRecord(binding) ? binding.instructionId : undefined;
          if (typeof instructionId !== 'string' || instructionId === '') fail('corpus-map.json CSV binding has invalid instructionId');
          result.add(instructionId);
        }
      }
    }
  }
  return result;
}

function mapSources(map: Dict): Map<string, string[]> {
  if (!isRecord(map.donors)) fail('corpus-map.json has no donors object');
  const result = new Map<string, string[]>();
  for (const [donorId, donor] of Object.entries(map.donors)) {
    if (!isRecord(donor) || !isRecord(donor.files)) continue;
    for (const [path, sourceFile] of Object.entries(donor.files)) {
      if (!isRecord(sourceFile) || !Array.isArray(sourceFile.instruction_ids)) continue;
      for (const id of sourceFile.instruction_ids) {
        if (typeof id !== 'string') fail(`corpus-map.json has non-string instruction ID at ${donorId}:${path}`);
        const sources = result.get(id) ?? [];
        sources.push(`${donorId}:${path}`);
        result.set(id, sources);
      }
    }
  }
  for (const sources of result.values()) sources.sort(compare);
  return result;
}

function toAtoms(root: string, entry: Dict): Atom[] {
  if (typeof entry.instruction_id !== 'string' || entry.instruction_id === '' || typeof entry.path !== 'string') fail('catalog.json contains an invalid instruction entry');
  const file = contained(root, entry.path, `instruction ${entry.instruction_id}`);
  const bytes = readFileSync(file);
  let parsed: ReturnType<typeof parseFrontmatter>;
  try { parsed = parseFrontmatter(bytes.toString('utf8')); }
  catch (error) { return fail(`instruction ${entry.instruction_id} frontmatter invalid: ${String(error)}`); }
  if (!isRecord(parsed.data) || parsed.data.instruction_id !== entry.instruction_id) fail(`instruction ${entry.instruction_id} frontmatter identity mismatch`);
  const relativeFile = relative(root, file).split(sep).join('/');
  if (parsed.data.schema === 'VPInstructionModule/v1') {
    const records = parseModuleAtoms(String(parsed.data.atoms));
    const members = parseModuleSections(parsed.body, records, entry.instruction_id);
    return members.map((member) => {
      const source = provenanceSource(member.frontmatter.provenance, member.atom_id);
      return {
        id: member.atom_id,
        file: relativeFile,
        source,
        pathOnly: source.path,
        fileBytes: member.file_bytes,
        bodyBytes: Buffer.byteLength(member.body, 'utf8'),
        fileSha256: member.file_sha256,
        contentSha256: member.content_sha256,
      };
    });
  }
  const source = provenanceSource(parsed.data.provenance, entry.instruction_id);
  const body = Buffer.from(parsed.body, 'utf8');
  return [{
    id: entry.instruction_id,
    file: relativeFile,
    source,
    pathOnly: source.path,
    fileBytes: bytes.length,
    bodyBytes: body.length,
    fileSha256: sha256(bytes),
    contentSha256: sha256(body),
  }];
}

function keyFor(rule: 'map-primary' | 'first-provenance-donor-path' | 'first-provenance-path-only', atom: Atom, mapped: Map<string, string[]>): string {
  if (rule === 'map-primary') return mapped.get(atom.id)?.[0] ?? `${atom.source.donor}:${atom.source.path}`;
  if (rule === 'first-provenance-donor-path') return `${atom.source.donor}:${atom.source.path}`;
  return atom.pathOnly;
}

function ruleCounts(atoms: Atom[], rule: 'map-primary' | 'first-provenance-donor-path' | 'first-provenance-path-only', mapped: Map<string, string[]>, cap: number, csvCount: number): RuleResult {
  const groups = new Map<string, Atom[]>();
  for (const atom of atoms) {
    const key = keyFor(rule, atom, mapped);
    const group = groups.get(key) ?? [];
    group.push(atom);
    groups.set(key, group);
  }
  const orderedGroups = [...groups.entries()].sort(([a], [b]) => compare(a, b));
  const distribution: Record<string, number> = {};
  const largestGroups: RuleResult['largestGroups'] = [];
  const pilots: RuleResult['pilots'] = {};
  const pilotSources: Array<[string, string[], Record<'map-primary' | 'first-provenance-donor-path' | 'first-provenance-path-only', string>, number]> = [
    ['gsd-security-auditor', [
      'a-check-in-the-wrong-layer-does-not-close-the-threat',
      'count-only-the-findings-above-the-blocking-threshold',
      'verify-a-transferred-risk-by-its-transfer-record-not-by-assumption',
    ], {
      'map-primary': 'gsd-core:agents/gsd-security-auditor.md',
      'first-provenance-donor-path': 'gsd-core:agents/gsd-security-auditor.md',
      'first-provenance-path-only': 'agents/gsd-security-auditor.md',
    }, 3],
    ['security-auditor', ['audit-authentication-and-authorization'], {
      'map-primary': 'addy-skills:agents/security-auditor.md',
      'first-provenance-donor-path': 'addy-skills:agents/security-auditor.md',
      'first-provenance-path-only': 'agents/security-auditor.md',
    }, 8],
  ];
  let carriers = 0;
  let singletons = 0;
  let groupsOverCap = 0;
  for (const [source, members] of orderedGroups) {
    members.sort((a, b) => compare(a.id, b.id));
    const size = members.length;
    distribution[String(size)] = (distribution[String(size)] ?? 0) + 1;
    const groupCarriers = Math.ceil(size / cap);
    carriers += groupCarriers;
    if (size > cap) groupsOverCap += 1;
    singletons += Math.max(0, groupCarriers * cap - size) === cap - 1 ? 1 : 0;
    largestGroups.push({ source, atoms: size, carriers: groupCarriers });
  }
  for (const [name, pilotIds, fallback, expectedAtoms] of pilotSources) {
    const anchor = pilotIds[0]!;
    const pilotEntry = orderedGroups.find(([, members]) => members.some((atom) => atom.id === anchor))
      ?? orderedGroups.find(([source]) => source === fallback[rule]);
    const target = pilotEntry?.[0] ?? '';
    const members = pilotEntry?.[1] ?? [];
    const carrierBytesEstimate = members.reduce((total, atom) => total + atom.fileBytes +
      Buffer.byteLength(`<!-- vpmodule:atom:begin ${atom.id} -->\n<!-- vpmodule:atom:end ${atom.id} -->\n`, 'utf8'), 0);
    pilots[name] = { source: target, expectedAtoms, observedAtoms: members.length, carrierBytesEstimate, members };
  }
  largestGroups.sort((a, b) => b.atoms - a.atoms || compare(a.source, b.source));
  return {
    groups: groups.size,
    carriers,
    singletonAtomFiles: singletons,
    currentEntries: carriers + csvCount,
    allIn: carriers + csvCount + 935,
    groupSizeDistribution: Object.fromEntries(Object.entries(distribution).sort(([a], [b]) => Number(a) - Number(b))),
    groupsOverCap,
    largestGroups: largestGroups.slice(0, 20),
    pilots: Object.fromEntries(Object.entries(pilots).sort(([a], [b]) => compare(a, b))),
  };
}

export function buildModuleCensus(rootInput = packageRoot, cap = 8): ModuleCensus {
  if (!Number.isInteger(cap) || cap < 2 || cap > 99) fail('cap must be an integer from 2 through 99');
  const root = resolve(rootInput);
  const catalog = readJson(join(root, 'catalog.json'));
  const map = readJson(join(root, 'corpus-map.json'));
  if (!isRecord(catalog) || !Array.isArray(catalog.instructions)) fail('catalog.json is missing or malformed');
  if (!isRecord(map) || !isRecord(map.donors)) fail('corpus-map.json is missing or malformed');
  const instructionEntries = catalog.instructions;
  const ids = new Set<string>();
  const entries: Dict[] = [];
  for (const raw of instructionEntries) {
    if (!isRecord(raw) || typeof raw.instruction_id !== 'string') fail('catalog.json contains an invalid instruction entry');
    const instructionId = raw.instruction_id;
    if (ids.has(instructionId)) fail(`catalog.json has duplicate instruction ID: ${instructionId}`);
    ids.add(instructionId);
    entries.push(raw);
  }
  const csvIds = csvInstructionIds(map);
  const atomIds = new Set<string>();
  const allAtoms: Atom[] = [];
  for (const entry of entries) {
    for (const atom of toAtoms(root, entry)) {
      if (atomIds.has(atom.id)) fail(`catalog.json has duplicate atom ID: ${atom.id}`);
      atomIds.add(atom.id);
      allAtoms.push(atom);
    }
  }
  for (const id of csvIds) if (!atomIds.has(id)) fail(`CSV binding references unknown catalog instruction: ${id}`);
  const atoms = allAtoms.filter((atom) => !csvIds.has(atom.id));
  const mapped = mapSources(map);
  const nonCsvAtoms = atoms.length;
  return {
    cap,
    catalogInstructions: entries.length,
    csvAtoms: csvIds.size,
    nonCsvAtoms,
    pendingNonCsvAtoms: 935,
    rules: {
      'map-primary': ruleCounts(atoms, 'map-primary', mapped, cap, csvIds.size),
      'first-provenance-donor-path': ruleCounts(atoms, 'first-provenance-donor-path', mapped, cap, csvIds.size),
      'first-provenance-path-only': ruleCounts(atoms, 'first-provenance-path-only', mapped, cap, csvIds.size),
    },
  };
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (!isRecord(value)) return JSON.stringify(value);
  return `{${Object.keys(value).sort(compare).map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
}

export function renderModuleCensusJson(census: ModuleCensus): string { return `${JSON.stringify(JSON.parse(stable(census)), null, 2)}\n`; }

export function renderModuleCensusSummary(census: ModuleCensus, runtimeMs?: number): string {
  const ruleRows = Object.entries(census.rules).map(([name, result]) => `| ${name} | ${result.groups} | ${result.carriers} | ${result.singletonAtomFiles} | ${result.currentEntries} | ${result.allIn} | ${result.groupsOverCap} |`).join('\n');
  const pilotRows = Object.entries(census.rules).flatMap(([rule, result]) => Object.entries(result.pilots).map(([name, pilot]) => {
    const members = pilot.members.map((atom) => `${atom.id} (${atom.file}, ${atom.fileBytes} B file / ${atom.bodyBytes} B body, file ${atom.fileSha256}, content ${atom.contentSha256})`).join('; ');
    return `* ${rule} / ${name}: expected ${pilot.expectedAtoms}, observed ${pilot.observedAtoms}; carrier estimate ${pilot.carrierBytesEstimate} B; ${members}`;
  })).join('\n');
  const runtime = runtimeMs === undefined ? '' : `\nRuntime: ${runtimeMs} ms.\n`;
  return `# Module census\n\nCatalog: ${census.catalogInstructions}; CSV atoms: ${census.csvAtoms}; non-CSV atoms: ${census.nonCsvAtoms}; pending non-CSV: ${census.pendingNonCsvAtoms}; cap: ${census.cap}.\n\n| Rule | Groups | Carriers | Singleton atom files | Current entries | All-in | Groups over cap |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: |\n${ruleRows}\n\n## Pilot cohorts\n\n${pilotRows}\n${runtime}`;
}

function parseArgs(args: string[]): { root: string; cap: number; out?: string; summary?: string; json: boolean } {
  let root = packageRoot;
  let cap = 8;
  let out: string | undefined;
  let summary: string | undefined;
  let json = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--json') { json = true; continue; }
    if (arg !== '--root' && arg !== '--cap' && arg !== '--out' && arg !== '--summary') fail(`unknown argument: ${arg}`);
    const value = args[i + 1];
    if (value === undefined || value.startsWith('--')) fail(`${arg} requires a value`);
    i += 1;
    if (arg === '--root') root = value;
    else if (arg === '--cap') {
      cap = Number(value);
      if (!Number.isInteger(cap)) fail('--cap requires an integer');
    } else if (arg === '--out') out = value;
    else summary = value;
  }
  return { root, cap, ...(out === undefined ? {} : { out }), ...(summary === undefined ? {} : { summary }), json };
}

type OutputSink = { write(chunk: string): unknown };

export function runModuleCensusCli(
  args = process.argv.slice(2),
  stdout: OutputSink = process.stdout,
  stderr: OutputSink = process.stderr,
): number {
  try {
    const options = parseArgs(args);
    const started = Date.now();
    const census = buildModuleCensus(options.root, options.cap);
    const runtimeMs = Date.now() - started;
    const json = renderModuleCensusJson(census);
    const summary = renderModuleCensusSummary(census, runtimeMs);
    if (options.out !== undefined) {
      const path = resolve(options.out);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, json, 'utf8');
    }
    if (options.summary !== undefined) {
      const path = resolve(options.summary);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, summary, 'utf8');
    }
    stdout.write(options.json ? json : summary);
    return 0;
  } catch (error) {
    stderr.write(`${String(error instanceof Error ? error.message : error)}\n`);
    return 1;
  }
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = runModuleCensusCli();
