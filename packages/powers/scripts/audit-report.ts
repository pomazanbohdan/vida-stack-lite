/**
 * Read-only audit reports over the canonical corpus.
 *
 * The converter stays the single writer of the corpus files; this module only
 * reads and reports. Every report is a set of counters plus named sections of
 * rows, so the CLI can render a bounded view of a large report
 * (packages/powers/scripts/audit.ts).
 *
 * The reports check the contracts the decisions state:
 *   - map:      the processing map and the instruction provenance agree (SR-66)
 *   - pairs:    an opposing pair is declared mutually and carries a theme tag (D12)
 *   - fidelity: an instruction body carries the donor's own text (D11)
 *   - specs:    a repair specification is consistent with the corpus (D11, D13)
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';
import { CatalogError } from '../skills/vp-mode/scripts/catalog.ts';
import { parseInstructionSpec } from './convert.ts';

export type SectionKind = 'finding' | 'info';
export type Section = { name: string; kind: SectionKind; rows: string[] };
export type Counter = { label: string; value: string };
export type Report = { command: string; counters: Counter[]; sections: Section[] };

export type ProvenanceView = { donor: string; license: string; revision: string; path: string };
export type InstructionView = {
  id: string;
  body: string;
  capabilityTags: string[];
  patternTags: string[];
  excludes: string[];
  requires: string[];
  revision: number;
  provenance: ProvenanceView[];
};
export type MapRecordView = {
  donor: string;
  path: string;
  status: string;
  instructionIds: string[];
  contributedSources: string[];
};
export type CorpusView = {
  root: string;
  instructions: Map<string, InstructionView>;
  mapRecords: Map<string, MapRecordView>;
  knownTags: Set<string>;
};
export type DonorClone = { donor: string; contentRoot: string; paths: string[]; relativePaths: Set<string> };
export type DonorClones = { available: boolean; note: string; donors: Map<string, DonorClone> };
export type Carrier = { donor: string; path: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const stringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const PROVENANCE_PATTERN = /^donor=([^;]+); license=([^;]+); revision=([^;]+); path=(.+)$/;

function parseProvenanceLine(line: string): ProvenanceView | undefined {
  const match = PROVENANCE_PATTERN.exec(line.trim().replace(/^-\s*/, ''));
  if (match === null) return undefined;
  return {
    donor: (match[1] ?? '').trim(),
    license: (match[2] ?? '').trim(),
    revision: (match[3] ?? '').trim(),
    path: (match[4] ?? '').trim(),
  };
}

function readJsonFile(path: string): Record<string, unknown> {
  const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
  return isRecord(value) ? value : {};
}

/** A source of the processing map is written `donor:path`; a claim is `donor::path`. */
function normalizeSource(source: string): string {
  const separator = source.indexOf(':');
  if (separator < 0) return source;
  return `${source.slice(0, separator)}::${source.slice(separator + 1)}`;
}

/** The instruction set of a corpus root, with the frontmatter the reports read. */
export function loadCorpus(root: string): CorpusView {
  const instructions = new Map<string, InstructionView>();
  const instructionsRoot = join(root, 'instructions');
  for (const file of readdirSync(instructionsRoot).sort()) {
    if (!file.endsWith('.md')) continue;
    const raw = readFileSync(join(instructionsRoot, file), 'utf8');
    const { data, body } = parseFrontmatter(raw);
    const id = typeof data.instruction_id === 'string' ? data.instruction_id : file.replace(/\.md$/, '');
    const provenance = stringList(data.provenance)
      .map((line) => parseProvenanceLine(line))
      .filter((entry): entry is ProvenanceView => entry !== undefined);
    instructions.set(id, {
      id,
      body,
      capabilityTags: stringList(data.capability_tags),
      patternTags: stringList(data.pattern_tags),
      excludes: stringList(data.compatibility_excludes),
      requires: stringList(data.compatibility_requires),
      revision: typeof data.revision === 'number' ? data.revision : 0,
      provenance,
    });
  }

  const mapRecords = new Map<string, MapRecordView>();
  const map = readJsonFile(join(root, 'corpus-map.json'));
  const donors = isRecord(map.donors) ? map.donors : {};
  for (const [donorId, rawDonor] of Object.entries(donors)) {
    if (!isRecord(rawDonor)) continue;
    const files = isRecord(rawDonor.files) ? rawDonor.files : {};
    for (const [path, rawRecord] of Object.entries(files)) {
      if (!isRecord(rawRecord)) continue;
      mapRecords.set(`${donorId}::${path}`, {
        donor: donorId,
        path,
        status: typeof rawRecord.status === 'string' ? rawRecord.status : '',
        instructionIds: stringList(rawRecord.instruction_ids),
        contributedSources: stringList(rawRecord.contributed_sources),
      });
    }
  }

  const catalog = readJsonFile(join(root, 'catalog.json'));
  const dictionary = isRecord(catalog.tag_dictionary) ? catalog.tag_dictionary : {};
  const knownTags = new Set<string>();
  for (const dimension of ['capability', 'pattern']) {
    const entries = isRecord(dictionary[dimension]) ? dictionary[dimension] : {};
    for (const tag of Object.keys(entries)) knownTags.add(tag);
  }

  return { root, instructions, mapRecords, knownTags };
}

/** The pinned donor clones of a corpus root, as the manifest declares them. */
export function loadDonorClones(root: string): DonorClones {
  const manifestPath = join(root, 'donors.yaml');
  if (!existsSync(manifestPath)) {
    return { available: false, note: `no donor manifest at ${manifestPath}`, donors: new Map() };
  }
  const manifest = Bun.YAML.parse(readFileSync(manifestPath, 'utf8')) as unknown;
  if (!isRecord(manifest)) {
    return { available: false, note: 'the donor manifest is not an object', donors: new Map() };
  }
  const declared = typeof manifest.local_root === 'string' ? manifest.local_root : '';
  const localRoot = declared.startsWith('packages/powers/')
    ? resolve(root, '..', '..', declared)
    : resolve(root, declared);
  const donors = new Map<string, DonorClone>();
  const list = Array.isArray(manifest.donors) ? manifest.donors : [];
  for (const item of list) {
    if (!isRecord(item) || typeof item.id !== 'string') continue;
    const cloneRoot = resolve(localRoot, typeof item.local_path === 'string' ? item.local_path : '');
    const contentRoot = resolve(cloneRoot, typeof item.content_path === 'string' ? item.content_path : '');
    if (!existsSync(contentRoot)) continue;
    const paths: string[] = [];
    const visit = (directory: string): void => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        const absolute = join(directory, entry.name);
        if (entry.isDirectory()) visit(absolute);
        else if (entry.isFile() && entry.name.endsWith('.md')) paths.push(absolute);
      }
    };
    visit(contentRoot);
    const relativePaths = new Set(paths.map((path) => relative(contentRoot, path).split('\\').join('/')));
    donors.set(item.id, { donor: item.id, contentRoot, paths, relativePaths });
  }
  if (donors.size === 0) {
    return { available: false, note: `no pinned donor clone under ${localRoot}`, donors };
  }
  return { available: true, note: `${String(donors.size)} donor clones under ${localRoot}`, donors };
}

function countFindings(report: Report): number {
  return report.sections
    .filter((section) => section.kind === 'finding')
    .reduce((total, section) => total + section.rows.length, 0);
}

/** The processing map and the instruction provenance must name each other. */
export function mapReport(corpus: CorpusView): Report {
  const claims = new Map<string, Set<string>>();
  for (const instruction of corpus.instructions.values()) {
    for (const source of instruction.provenance) {
      const key = `${source.donor}::${source.path}`;
      const ids = claims.get(key) ?? new Set<string>();
      ids.add(instruction.id);
      claims.set(key, ids);
    }
  }

  const withoutRecord: string[] = [];
  const notListed: string[] = [];
  const rejectedButCited: string[] = [];
  const withoutClaim: string[] = [];
  const mergedMismatch: string[] = [];

  for (const [key, ids] of claims) {
    const record = corpus.mapRecords.get(key);
    if (record === undefined) {
      withoutRecord.push(`${key} -> ${[...ids].sort().join(', ')}`);
      continue;
    }
    if (record.status === 'rejected') {
      rejectedButCited.push(`${key} -> ${[...ids].sort().join(', ')}`);
      continue;
    }
    for (const id of [...ids].sort()) {
      if (!record.instructionIds.includes(id)) notListed.push(`${key} -> ${id}`);
    }
  }

  for (const [key, record] of corpus.mapRecords) {
    if (record.status === 'rejected') continue;
    const ids = claims.get(key) ?? new Set<string>();
    for (const id of record.instructionIds) {
      if (!ids.has(id)) withoutClaim.push(`${key} -> ${id}`);
    }
    if (record.status === 'merged') {
      const target = record.instructionIds[0];
      const targetInstruction = target === undefined ? undefined : corpus.instructions.get(target);
      if (targetInstruction === undefined) {
        mergedMismatch.push(`${key} -> target ${String(target)} is unknown`);
        continue;
      }
      const carried = new Set(targetInstruction.provenance.map((source) => `${source.donor}::${source.path}`));
      const missing = record.contributedSources
        .filter((source) => !carried.has(normalizeSource(source)))
        .map((source) => normalizeSource(source));
      if (missing.length > 0) mergedMismatch.push(`${key} -> ${missing.join(', ')}`);
    }
  }

  const report: Report = {
    command: 'map',
    counters: [
      { label: 'instructions', value: String(corpus.instructions.size) },
      { label: 'provenance claims', value: String(claims.size) },
      { label: 'map records', value: String(corpus.mapRecords.size) },
    ],
    sections: [
      { name: 'claim-without-record', kind: 'finding', rows: withoutRecord.sort() },
      { name: 'record-without-claim', kind: 'finding', rows: withoutClaim.sort() },
      { name: 'claim-missing-from-record', kind: 'finding', rows: notListed.sort() },
      { name: 'rejected-but-cited', kind: 'finding', rows: rejectedButCited.sort() },
      { name: 'merged-source-mismatch', kind: 'finding', rows: mergedMismatch.sort() },
    ],
  };
  report.counters.push({ label: 'findings', value: String(countFindings(report)) });
  return report;
}

/** An opposing pair is declared mutually and carries one shared theme tag (D12). */
export function pairsReport(corpus: CorpusView): Report {
  const carriers = new Map<string, number>();
  for (const instruction of corpus.instructions.values()) {
    for (const tag of instruction.patternTags) carriers.set(tag, (carriers.get(tag) ?? 0) + 1);
  }

  const pairs = new Map<string, { a: string; b: string; mutual: boolean }>();
  for (const instruction of corpus.instructions.values()) {
    for (const other of instruction.excludes) {
      const [a, b] = [instruction.id, other].sort();
      if (a === undefined || b === undefined) continue;
      const mutual = instruction.excludes.includes(other)
        && (corpus.instructions.get(other)?.excludes.includes(instruction.id) ?? false);
      pairs.set(`${a}|${b}`, { a, b, mutual });
    }
  }

  const rows: string[] = [];
  const oneWay: string[] = [];
  const withoutTheme: string[] = [];
  for (const entry of [...pairs.values()].sort((left, right) => {
    if (left.a !== right.a) return left.a < right.a ? -1 : 1;
    return left.b < right.b ? -1 : 1;
  })) {
    const left = corpus.instructions.get(entry.a);
    const right = corpus.instructions.get(entry.b);
    const shared = (left?.patternTags ?? []).filter((tag) => (right?.patternTags ?? []).includes(tag));
    const sharedText = shared.length === 0
      ? 'NONE'
      : shared.map((tag) => `${tag}(${String(carriers.get(tag) ?? 0)})`).join(', ');
    rows.push(`${entry.mutual ? 'mutual' : 'ONE-WAY'} ${entry.a} <-> ${entry.b} | shared: ${sharedText}`);
    if (!entry.mutual) oneWay.push(`${entry.a} <-> ${entry.b}`);
    if (shared.length === 0) withoutTheme.push(`${entry.a} <-> ${entry.b}`);
  }

  const report: Report = {
    command: 'pairs',
    counters: [
      { label: 'instructions', value: String(corpus.instructions.size) },
      { label: 'declared pairs', value: String(pairs.size) },
      { label: 'mutual pairs', value: String([...pairs.values()].filter((entry) => entry.mutual).length) },
    ],
    sections: [
      { name: 'one-way', kind: 'finding', rows: oneWay.sort() },
      { name: 'without-shared-theme', kind: 'finding', rows: withoutTheme.sort() },
      { name: 'pair', kind: 'info', rows },
    ],
  };
  report.counters.push({ label: 'findings', value: String(countFindings(report)) });
  return report;
}

export const tokenize = (text: string): string[] => text.toLowerCase().match(/[a-z0-9_]+/g) ?? [];

/**
 * An index over the token stream of every donor file.
 *
 * The stream of a file is its tokens, so a donor paragraph and a corpus line
 * that quotes it are the same token sequence. The index maps every token to
 * the positions where it occurs; a probe is a hit when one of those positions
 * starts the whole probe. The index makes the search cheap, the token list
 * makes the answer exact, and a probe is never matched across two files.
 *
 * Only the content of the declared donors is indexed — the files the donor
 * manifest names, not every Markdown file that happens to sit under the clone
 * directory.
 */
export type DonorFile = { donor: string; path: string; tokens: string[] };
export type DonorIndex = {
  files: DonorFile[];
  postings: Map<string, number[]>;
};

const POSITION_BITS = 20;
const POSITION_MASK = (1 << POSITION_BITS) - 1;

export function buildDonorIndex(clones: DonorClones, only?: Set<string>): DonorIndex {
  const files: DonorFile[] = [];
  const postings = new Map<string, number[]>();
  for (const clone of [...clones.donors.values()].sort((left, right) => (left.donor < right.donor ? -1 : 1))) {
    if (only !== undefined && !only.has(clone.donor)) continue;
    for (const path of clone.paths) {
      const tokens = tokenize(readFileSync(path, 'utf8'));
      if (tokens.length === 0) continue;
      const fileId = files.length;
      files.push({
        donor: clone.donor,
        path: relative(clone.contentRoot, path).split('\\').join('/'),
        tokens,
      });
      for (let index = 0; index < tokens.length; index += 1) {
        const word = tokens[index] as string;
        const positions = postings.get(word) ?? [];
        positions.push((fileId << POSITION_BITS) | (index & POSITION_MASK));
        postings.set(word, positions);
      }
    }
  }
  return { files, postings };
}

/** The donor file whose own text carries the probe, if there is one. */
export function carrierOf(index: DonorIndex, probe: string): Carrier | undefined {
  const words = probe.split(' ').filter((word) => word !== '');
  if (words.length === 0) return undefined;
  // The rarest word of the probe anchors the search: its positions are few, and
  // each one gives the place where the probe would start.
  let anchor = 0;
  let positions: number[] = [];
  for (let word = 0; word < words.length; word += 1) {
    const occurrences = index.postings.get(words[word] as string) ?? [];
    if (positions.length === 0 || occurrences.length < positions.length) {
      anchor = word;
      positions = occurrences;
    }
    if (positions.length === 0) return undefined;
  }
  for (const packed of positions) {
    const fileId = packed >>> POSITION_BITS;
    const offset = (packed & POSITION_MASK) - anchor;
    if (offset < 0) continue;
    const file = index.files[fileId];
    if (file === undefined) continue;
    let matches = true;
    for (let step = 0; step < words.length; step += 1) {
      if (file.tokens[offset + step] !== words[step]) { matches = false; break; }
    }
    if (matches) return { donor: file.donor, path: file.path };
  }
  return undefined;
}

/** An instruction body carries the donor's own text (D11). */
export function fidelityReport(corpus: CorpusView, clones: DonorClones, only?: string): Report {
  const report: Report = {
    command: 'fidelity',
    counters: [
      { label: 'instructions', value: String(corpus.instructions.size) },
      { label: 'donor clones', value: clones.available ? clones.note : 'unavailable' },
    ],
    sections: [
      { name: 'divergent-line', kind: 'finding', rows: [] },
      { name: 'instruction', kind: 'info', rows: [] },
    ],
  };
  if (!clones.available) {
    report.counters.push({ label: 'findings', value: '0' });
    return report;
  }
  const index = buildDonorIndex(clones);
  const divergent: string[] = [];
  const perInstruction: string[] = [];
  let checked = 0;
  let faithful = 0;
  for (const instruction of corpus.instructions.values()) {
    if (only !== undefined && instruction.id !== only) continue;
    let instructionFaithful = 0;
    let instructionChecked = 0;
    for (const line of instruction.body.split('\n')) {
      if (line.trimStart().startsWith('#')) continue;
      const probe = tokenize(line).join(' ');
      if (probe.split(' ').filter((word) => word !== '').length < 6) continue;
      instructionChecked += 1;
      checked += 1;
      const carrier = carrierOf(index, probe);
      if (carrier === undefined) divergent.push(`${instruction.id} | ${line.slice(0, 160)}`);
      else { faithful += 1; instructionFaithful += 1; }
    }
    perInstruction.push(`${String(instructionFaithful)}/${String(instructionChecked)} ${instruction.id}`);
  }
  report.sections[0]?.rows.push(...divergent.sort());
  report.sections[1]?.rows.push(...perInstruction.sort());
  report.counters.push({ label: 'body lines checked', value: String(checked) });
  report.counters.push({ label: 'token-faithful', value: String(faithful) });
  report.counters.push({ label: 'divergent', value: String(divergent.length) });
  report.counters.push({ label: 'findings', value: String(countFindings(report)) });
  return report;
}

/** A repair specification is consistent with the corpus it will be written into. */
export function specsReport(corpus: CorpusView, clones: DonorClones, files: string[]): Report {
  const problems: string[] = [];
  const accepted: string[] = [];
  const specs: { file: string; id: string; body: string; donors: Set<string> }[] = [];
  for (const file of files) {
    let value: unknown;
    try {
      value = JSON.parse(readFileSync(file, 'utf8'));
    } catch (error) {
      problems.push(`${file} | the specification is not valid JSON: ${String(error)}`);
      continue;
    }
    let spec;
    try {
      spec = parseInstructionSpec(value, file);
    } catch (error) {
      problems.push(`${file} | ${error instanceof CatalogError ? error.message : String(error)}`);
      continue;
    }
    specs.push({
      file,
      id: spec.instruction_id,
      body: spec.body,
      donors: new Set(spec.provenance.map((source) => source.donor)),
    });
    const found: string[] = [];
    const current = corpus.instructions.get(spec.instruction_id);
    const firstLine = spec.body.split('\n')[0]?.trim() ?? '';
    if (firstLine !== `# ${spec.title}`) found.push('the H1 does not carry the title');
    if (current !== undefined && spec.revision !== current.revision + 1) {
      found.push(`revision ${String(spec.revision)} does not follow ${current.revision}`);
    }
    for (const tag of [...spec.capability_tags, ...spec.pattern_tags]) {
      if (!corpus.knownTags.has(tag)) found.push(`unknown tag ${tag}`);
    }
    for (const target of [...spec.compatibility_excludes, ...spec.compatibility_requires]) {
      if (target !== spec.instruction_id && !corpus.instructions.has(target)) {
        found.push(`unknown compatibility target ${target}`);
      }
    }
    for (const source of spec.provenance) {
      const clone = clones.donors.get(source.donor);
      if (clone === undefined) {
        found.push(`donor ${source.donor} has no pinned clone`);
        continue;
      }
      if (!clone.relativePaths.has(source.path)) {
        found.push(`${source.donor}::${source.path} is not in the pinned clone`);
      }
    }
    if (found.length === 0) accepted.push(`${spec.instruction_id} ${file}`);
    else for (const problem of found) problems.push(`${file} | ${problem}`);
  }

  const donors = new Set<string>();
  for (const spec of specs) for (const donor of spec.donors) donors.add(donor);
  const index = clones.available && donors.size > 0 ? buildDonorIndex(clones, donors) : undefined;
  if (index !== undefined) {
    for (const spec of specs) {
      for (const line of spec.body.split('\n')) {
        if (line.trimStart().startsWith('#')) continue;
        const probe = tokenize(line).join(' ');
        if (probe.split(' ').filter((word) => word !== '').length < 6) continue;
        if (carrierOf(index, probe) === undefined) {
          problems.push(`${spec.file} | the line is not the donor's text: ${line.slice(0, 120)}`);
        }
      }
    }
  }

  const report: Report = {
    command: 'specs',
    counters: [
      { label: 'specifications', value: String(files.length) },
      { label: 'accepted', value: String(accepted.length) },
    ],
    sections: [
      { name: 'problem', kind: 'finding', rows: problems.sort() },
      { name: 'accepted', kind: 'info', rows: accepted.sort() },
    ],
  };
  report.counters.push({ label: 'findings', value: String(countFindings(report)) });
  return report;
}
