import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE_BASELINE_SCHEMA = 'VPSourceBaseline/v1';
export const SOURCE_UPDATE_REPORT_SCHEMA = 'VPSourceUpdateReport/v1';
export const SOURCE_BASELINE_BASIS = 'pinned-donor-files';

export type DonorRecord = Readonly<{
  id: string;
  localPath: string;
  contentPath: string;
  headSha: string;
}>;

export type DonorManifest = Readonly<{
  localRoot: string;
  donors: ReadonlyMap<string, DonorRecord>;
}>;

export type MapFile = Readonly<{
  status: string;
  instructionIds: readonly string[];
}>;

export type MapDonor = Readonly<{
  revision: string;
  files: ReadonlyMap<string, MapFile>;
}>;

export type CorpusMap = ReadonlyMap<string, MapDonor>;

export type BaselineFile = Readonly<{
  sha256: string;
  bytes: number;
}>;

export type BaselineDonor = Readonly<{
  revision: string;
  files: ReadonlyMap<string, BaselineFile>;
}>;

export type SourceBaseline = Readonly<{
  schema: typeof SOURCE_BASELINE_SCHEMA;
  basis: string;
  donors: ReadonlyMap<string, BaselineDonor>;
}>;

export type UpdateStatus = 'current' | 'pin-stale' | 'stale' | 'missing' | 'unknown';

export type FileFinding = Readonly<{
  donor: string;
  path: string;
  status: UpdateStatus;
  instructions: readonly string[];
  baselineSha256: string | null;
  currentSha256: string | null;
}>;

export type DonorReport = Readonly<{
  donor: string;
  baselineRevision: string;
  currentRevision: string;
  observedHead: string | null;
  status: UpdateStatus;
  files: readonly FileFinding[];
}>;

export type UpdateSummary = Readonly<{
  donors: number;
  files: number;
  coveredInstructions: number;
  affectedInstructions: number;
  current: number;
  'pin-stale': number;
  stale: number;
  missing: number;
  unknown: number;
}>;

export type UpdateReport = Readonly<{
  schema: typeof SOURCE_UPDATE_REPORT_SCHEMA;
  donors: readonly DonorReport[];
  summary: UpdateSummary;
}>;

export class SourceUpdateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceUpdateError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new SourceUpdateError(`${label} must be a non-empty string`);
  return value;
}

function sha256Hex(value: unknown, label: string): string {
  const text = requiredString(value, label);
  if (!/^[0-9a-f]{64}$/.test(text)) throw new SourceUpdateError(`${label} must be a lowercase SHA-256`);
  return text;
}

function revisionHex(value: unknown, label: string): string {
  const text = requiredString(value, label);
  if (!/^[0-9a-f]{40}$/.test(text)) throw new SourceUpdateError(`${label} must be a lowercase 40-character revision`);
  return text;
}

function stringList(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) throw new SourceUpdateError(`${label} must be a string array`);
  return value as string[];
}

export function parseDonorManifest(value: unknown, root: string): DonorManifest {
  if (!isRecord(value)) throw new SourceUpdateError('donors.yaml must be an object');
  const entries = Array.isArray(value.donors) ? value.donors : [];
  const donors = new Map<string, DonorRecord>();
  for (const [index, item] of entries.entries()) {
    if (!isRecord(item)) throw new SourceUpdateError(`donors[${index}] must be an object`);
    const id = requiredString(item.id, `donors[${index}].id`);
    const localPath = requiredString(item.local_path, `donors[${index}].local_path`);
    const headSha = revisionHex(item.head_sha, `donors[${index}].head_sha`);
    const contentPath = item.content_path === undefined ? '' : requiredString(item.content_path, `donors[${index}].content_path`);
    donors.set(id, { id, localPath, contentPath, headSha });
  }
  const declared = typeof value.local_root === 'string' ? value.local_root : '';
  const localRoot = declared.startsWith('packages/powers/')
    ? resolve(root, '..', '..', declared)
    : resolve(root, declared);
  return { localRoot, donors };
}

export function loadDonorManifest(root: string): DonorManifest {
  const text = readFileSync(join(root, 'donors.yaml'), 'utf8');
  return parseDonorManifest(Bun.YAML.parse(text) as unknown, root);
}

export function parseCorpusMap(value: unknown): CorpusMap {
  if (!isRecord(value) || !isRecord(value.donors)) throw new SourceUpdateError('corpus-map.json must contain a donors object');
  const donors = new Map<string, MapDonor>();
  for (const [donorId, donorValue] of Object.entries(value.donors)) {
    if (!isRecord(donorValue) || !isRecord(donorValue.files)) throw new SourceUpdateError(`corpus-map donor ${donorId} must contain a files object`);
    const revision = revisionHex(donorValue.source_revision, `corpus-map donor ${donorId} source_revision`);
    const files = new Map<string, MapFile>();
    for (const [path, fileValue] of Object.entries(donorValue.files)) {
      if (!isRecord(fileValue)) throw new SourceUpdateError(`corpus-map file ${donorId}:${path} must be an object`);
      const status = typeof fileValue.status === 'string' ? fileValue.status : 'unknown';
      const instructionIds = fileValue.instruction_ids === undefined ? [] : stringList(fileValue.instruction_ids, `corpus-map file ${donorId}:${path} instruction_ids`);
      files.set(path, { status, instructionIds });
    }
    donors.set(donorId, { revision, files });
  }
  return donors;
}

export function loadCorpusMap(root: string): CorpusMap {
  return parseCorpusMap(JSON.parse(readFileSync(join(root, 'corpus-map.json'), 'utf8')) as unknown);
}

export function parseSourceBaseline(value: unknown): SourceBaseline {
  if (!isRecord(value)) throw new SourceUpdateError('source baseline must be an object');
  if (value.schema !== SOURCE_BASELINE_SCHEMA) throw new SourceUpdateError(`source baseline schema must be ${SOURCE_BASELINE_SCHEMA}`);
  const basis = requiredString(value.basis, 'source baseline basis');
  if (!isRecord(value.donors)) throw new SourceUpdateError('source baseline must contain a donors object');
  const donors = new Map<string, BaselineDonor>();
  for (const [donorId, donorValue] of Object.entries(value.donors)) {
    if (!isRecord(donorValue)) throw new SourceUpdateError(`source baseline donor ${donorId} must be an object`);
    const revision = revisionHex(donorValue.revision, `source baseline donor ${donorId} revision`);
    if (!isRecord(donorValue.files)) throw new SourceUpdateError(`source baseline donor ${donorId} must contain a files object`);
    const files = new Map<string, BaselineFile>();
    for (const [path, fileValue] of Object.entries(donorValue.files)) {
      if (!isRecord(fileValue)) throw new SourceUpdateError(`source baseline file ${donorId}:${path} must be an object`);
      const digest = sha256Hex(fileValue.sha256, `source baseline file ${donorId}:${path} sha256`);
      if (typeof fileValue.bytes !== 'number' || !Number.isInteger(fileValue.bytes) || fileValue.bytes < 0) {
        throw new SourceUpdateError(`source baseline file ${donorId}:${path} bytes must be a non-negative integer`);
      }
      files.set(path, { sha256: digest, bytes: fileValue.bytes });
    }
    donors.set(donorId, { revision, files });
  }
  return { schema: SOURCE_BASELINE_SCHEMA, basis, donors };
}

export function loadSourceBaseline(path: string): SourceBaseline {
  return parseSourceBaseline(JSON.parse(readFileSync(path, 'utf8')) as unknown);
}

export function serializeSourceBaseline(baseline: SourceBaseline): string {
  const donors: Record<string, unknown> = {};
  for (const [donorId, donor] of [...baseline.donors].sort(([left], [right]) => left.localeCompare(right))) {
    const files: Record<string, unknown> = {};
    for (const [path, file] of [...donor.files].sort(([left], [right]) => left.localeCompare(right))) {
      files[path] = { sha256: file.sha256, bytes: file.bytes };
    }
    donors[donorId] = { revision: donor.revision, files };
  }
  return `${JSON.stringify({ schema: baseline.schema, basis: baseline.basis, donors }, null, 2)}\n`;
}

function donorRoots(manifest: DonorManifest, donor: DonorRecord): { cloneRoot: string; contentRoot: string } {
  const cloneRoot = resolve(manifest.localRoot, donor.localPath);
  const contentRoot = resolve(cloneRoot, donor.contentPath);
  return { cloneRoot, contentRoot };
}

function resolveSourceFile(contentRoot: string, path: string): string {
  const sourceFile = resolve(contentRoot, path);
  if (sourceFile === contentRoot || !sourceFile.startsWith(`${contentRoot}${sep}`)) {
    throw new SourceUpdateError(`source path escapes donor content root: ${path}`);
  }
  return sourceFile;
}

function readCloneHead(cloneRoot: string): string | undefined {
  let head: string;
  try {
    head = readFileSync(join(cloneRoot, '.git', 'HEAD'), 'utf8').trim();
  } catch {
    return undefined;
  }
  if (/^[0-9a-f]{40}$/.test(head)) return head;
  const match = /^ref:\s+(.+)$/.exec(head);
  const ref = match?.[1]?.trim();
  if (ref === undefined || ref === '') return undefined;
  try {
    const value = readFileSync(join(cloneRoot, '.git', ref), 'utf8').trim();
    if (/^[0-9a-f]{40}$/.test(value)) return value;
  } catch {
    // packed refs below
  }
  try {
    for (const line of readFileSync(join(cloneRoot, '.git', 'packed-refs'), 'utf8').split(/\r?\n/)) {
      const [sha, name] = line.trim().split(/\s+/);
      if (name === ref && sha !== undefined && /^[0-9a-f]{40}$/.test(sha)) return sha;
    }
  } catch {
    // an unreadable packed refs file means the head cannot be resolved
  }
  return undefined;
}

function assertCloneHead(cloneRoot: string, expected: string, donorId: string): void {
  const head = readCloneHead(cloneRoot);
  if (head === undefined) throw new SourceUpdateError(`cannot read clone HEAD for donor ${donorId} at ${cloneRoot}`);
  if (head !== expected) throw new SourceUpdateError(`donor ${donorId} clone HEAD ${head} does not match donors.yaml ${expected}`);
}

export function hashSourceFile(path: string): BaselineFile {
  const bytes = readFileSync(path);
  return { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
}

export function buildSourceBaseline(root: string, options: Readonly<{ verifyCloneHead?: boolean }> = {}): SourceBaseline {
  const manifest = loadDonorManifest(root);
  const map = loadCorpusMap(root);
  const donors = new Map<string, BaselineDonor>();
  for (const [donorId, mapDonor] of [...map].sort(([left], [right]) => left.localeCompare(right))) {
    const donor = manifest.donors.get(donorId);
    if (donor === undefined) throw new SourceUpdateError(`corpus map references unknown donor ${donorId}`);
    if (mapDonor.revision !== donor.headSha) {
      throw new SourceUpdateError(`donor ${donorId} corpus revision ${mapDonor.revision} does not match donors.yaml ${donor.headSha}`);
    }
    const roots = donorRoots(manifest, donor);
    if (options.verifyCloneHead !== false) assertCloneHead(roots.cloneRoot, donor.headSha, donorId);
    const files = new Map<string, BaselineFile>();
    for (const [path, file] of [...mapDonor.files].sort(([left], [right]) => left.localeCompare(right))) {
      if (file.instructionIds.length === 0) continue;
      const sourceFile = resolveSourceFile(roots.contentRoot, path);
      let stat;
      try {
        stat = statSync(sourceFile);
      } catch (error) {
        throw new SourceUpdateError(`source file ${donorId}:${path} is not readable: ${String(error)}`);
      }
      if (!stat.isFile()) throw new SourceUpdateError(`source path ${donorId}:${path} is not a regular file`);
      files.set(path, hashSourceFile(sourceFile));
    }
    if (files.size > 0) donors.set(donorId, { revision: mapDonor.revision, files });
  }
  return { schema: SOURCE_BASELINE_SCHEMA, basis: SOURCE_BASELINE_BASIS, donors };
}

function worstStatus(statuses: readonly UpdateStatus[]): UpdateStatus {
  if (statuses.includes('missing')) return 'missing';
  if (statuses.includes('stale')) return 'stale';
  if (statuses.includes('unknown')) return 'unknown';
  if (statuses.includes('pin-stale')) return 'pin-stale';
  return 'current';
}

export function checkSourceUpdates(
  root: string,
  baseline: SourceBaseline,
  options: Readonly<{ donor?: string }> = {},
): UpdateReport {
  const manifest = loadDonorManifest(root);
  const map = loadCorpusMap(root);
  const reports: DonorReport[] = [];
  const baselineDonors = new Set(baseline.donors.keys());
  const mapDonors = new Set(map.keys());
  for (const donorId of [...new Set([...baselineDonors, ...mapDonors])].sort((left, right) => left.localeCompare(right))) {
    if (options.donor !== undefined && donorId !== options.donor) continue;
    const baselineDonor = baseline.donors.get(donorId);
    const mapDonor = map.get(donorId);
    const donor = manifest.donors.get(donorId);
    const baselineRevision = baselineDonor?.revision ?? '';
    const currentRevision = donor?.headSha ?? '';
    if (mapDonor !== undefined && baselineDonor !== undefined && mapDonor.revision !== baselineRevision) {
      throw new SourceUpdateError(`baseline revision ${baselineRevision} for donor ${donorId} does not match corpus map ${mapDonor.revision}`);
    }
    const mapFiles = mapDonor?.files ?? new Map<string, MapFile>();
    const roots = donor === undefined ? undefined : donorRoots(manifest, donor);
    const observedHead = roots === undefined ? undefined : readCloneHead(roots.cloneRoot);
    const findings: FileFinding[] = [];
    const seen = new Set<string>();
    for (const [path, baselineFile] of [...(baselineDonor?.files ?? new Map<string, BaselineFile>())].sort(([left], [right]) => left.localeCompare(right))) {
      seen.add(path);
      const instructions = mapFiles.get(path)?.instructionIds ?? [];
      let status: UpdateStatus = 'unknown';
      let currentSha256: string | null = null;
      if (roots === undefined) {
        status = 'unknown';
      } else {
        const sourceFile = resolveSourceFile(roots.contentRoot, path);
        try {
          const current = hashSourceFile(sourceFile);
          currentSha256 = current.sha256;
          if (current.sha256 !== baselineFile.sha256) status = 'stale';
          else if (observedHead === undefined || (observedHead !== currentRevision && observedHead !== baselineRevision)) status = 'unknown';
          else if (baselineRevision !== currentRevision) status = 'pin-stale';
          else status = 'current';
        } catch (error) {
          if (isRecord(error) && error.code === 'ENOENT') status = 'missing';
          else throw new SourceUpdateError(`cannot read source ${donorId}:${path}: ${String(error)}`);
        }
      }
      findings.push({
        donor: donorId,
        path,
        status,
        instructions,
        baselineSha256: baselineFile.sha256,
        currentSha256,
      });
    }
    for (const [path, file] of [...mapFiles].sort(([left], [right]) => left.localeCompare(right))) {
      if (file.instructionIds.length === 0 || seen.has(path)) continue;
      findings.push({
        donor: donorId,
        path,
        status: 'unknown',
        instructions: file.instructionIds,
        baselineSha256: null,
        currentSha256: null,
      });
    }
    if (findings.length === 0) continue;
    reports.push({
      donor: donorId,
      baselineRevision,
      currentRevision,
      observedHead: observedHead ?? null,
      status: worstStatus(findings.map((finding) => finding.status)),
      files: findings,
    });
  }
  const summaryCounts: Record<UpdateStatus, number> = {
    current: 0,
    'pin-stale': 0,
    stale: 0,
    missing: 0,
    unknown: 0,
  };
  for (const report of reports) {
    for (const file of report.files) summaryCounts[file.status] += 1;
  }
  const summary: UpdateSummary = {
    donors: reports.length,
    files: reports.reduce((total, report) => total + report.files.length, 0),
    coveredInstructions: new Set(reports.flatMap((report) => report.files.flatMap((file) => file.instructions))).size,
    affectedInstructions: new Set(reports.flatMap((report) => report.files.filter((file) => file.status !== 'current').flatMap((file) => file.instructions))).size,
    ...summaryCounts,
  };
  return { schema: SOURCE_UPDATE_REPORT_SCHEMA, donors: reports, summary };
}

function flag(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  return args[index + 1];
}

export function packageRoot(): string {
  return resolve(fileURLToPath(new URL('..', import.meta.url)));
}

export function runBuildBaselineCli(args: readonly string[], print: (text: string) => void = console.log): number {
  try {
    const root = resolve(flag(args, '--root') ?? packageRoot());
    const out = resolve(flag(args, '--out') ?? join(root, 'source-baseline.json'));
    const baseline = buildSourceBaseline(root);
    writeFileSync(out, serializeSourceBaseline(baseline), 'utf8');
    const files = [...baseline.donors.values()].reduce((total, donor) => total + donor.files.size, 0);
    if (args.includes('--json')) {
      print(JSON.stringify({ ok: true, root, out, donors: baseline.donors.size, files }, null, 2));
    } else {
      print(`source baseline: ${baseline.donors.size} donors, ${files} files`);
      print(`written: ${out}`);
    }
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (args.includes('--json')) print(JSON.stringify({ ok: false, error: message }, null, 2));
    else print(`error: ${message}`);
    return 2;
  }
}

export function runCheckSourceUpdatesCli(args: readonly string[], print: (text: string) => void = console.log): number {
  try {
    const root = resolve(flag(args, '--root') ?? packageRoot());
    const baselinePath = resolve(flag(args, '--baseline') ?? join(root, 'source-baseline.json'));
    const baseline = loadSourceBaseline(baselinePath);
    const report = checkSourceUpdates(root, baseline, { ...(flag(args, '--donor') === undefined ? {} : { donor: flag(args, '--donor') as string }) });
    if (args.includes('--json')) {
      print(JSON.stringify({ ok: report.summary.current === report.summary.files && report.summary.files > 0, baseline: baselinePath, ...report }, null, 2));
    } else {
      print(`source update check: ${report.summary.donors} donors, ${report.summary.files} files, ${report.summary.coveredInstructions} instructions covered, ${report.summary.affectedInstructions} affected`);
      for (const status of ['current', 'pin-stale', 'stale', 'missing', 'unknown'] as const) {
        print(`${status}: ${report.summary[status]}`);
      }
      for (const donor of report.donors) {
        for (const file of donor.files) {
          if (file.status === 'current') continue;
          const ids = file.instructions.length > 0 ? ` instructions=${file.instructions.length} (${file.instructions.slice(0, 5).join(', ')}${file.instructions.length > 5 ? ', ...' : ''})` : '';
          print(`${file.status} ${file.donor}:${file.path}${ids}`);
        }
      }
    }
    return report.summary.current === report.summary.files && report.summary.files > 0 ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (args.includes('--json')) print(JSON.stringify({ ok: false, error: message }, null, 2));
    else print(`error: ${message}`);
    return 2;
  }
}
