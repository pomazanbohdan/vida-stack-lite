import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isEntryPoint } from '../skills/vp-mode/scripts/catalog-cli.ts';
import {
  loadCorpusMap,
  loadDonorManifest,
  loadSourceBaseline,
  SourceUpdateError,
  type CorpusMap,
} from './source-updates.ts';

export const DONOR_UPDATE_TRIAGE_SCHEMA = 'VPDonorUpdateTriage/v1';

export type DiffEntry = Readonly<{
  status: string;
  path: string;
  oldPath: string | null;
}>;

export type NewFileDisposition = Readonly<{
  path: string;
  kind: 'markdown' | 'other';
  disposition: 'candidate' | 'rejected';
  reason: string;
}>;

export type UsedFileChange = Readonly<{
  path: string;
  status: 'M' | 'D';
  instructionIds: readonly string[];
}>;

export type DonorUpdateTriage = Readonly<{
  donor: string;
  baselineRevision: string;
  targetRevision: string;
  added: number;
  modified: number;
  deleted: number;
  renamed: number;
  changedUsed: number;
  deletedUsed: number;
  newCandidates: number;
  newRejected: number;
  usedChanges: readonly UsedFileChange[];
  newFiles: readonly NewFileDisposition[];
}>;

export type DonorUpdateReport = Readonly<{
  schema: typeof DONOR_UPDATE_TRIAGE_SCHEMA;
  donors: readonly DonorUpdateTriage[];
  summary: Readonly<{
    donors: number;
    added: number;
    modified: number;
    deleted: number;
    changedUsed: number;
    deletedUsed: number;
    newCandidates: number;
    newRejected: number;
  }>;
}>;

export function parseNameStatus(text: string): DiffEntry[] {
  const entries: DiffEntry[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '') continue;
    const parts = line.split('\t');
    const status = parts[0]?.trim() ?? '';
    if (status === '' || parts.length < 2) throw new SourceUpdateError(`invalid git name-status line: ${line}`);
    if (status.startsWith('R') || status.startsWith('C')) {
      if (parts.length < 3) throw new SourceUpdateError(`invalid rename/copy name-status line: ${line}`);
      entries.push({ status: status[0] as string, path: parts[2] as string, oldPath: parts[1] as string });
    } else {
      entries.push({ status: status[0] as string, path: parts.slice(1).join('\t'), oldPath: null });
    }
  }
  return entries;
}

export function activePrefixes(map: CorpusMap, donorId: string): Set<string> {
  const prefixes = new Set<string>();
  const donor = map.get(donorId);
  for (const [path, file] of donor?.files ?? []) {
    if (file.instructionIds.length === 0) continue;
    const parts = path.split('/');
    for (let index = 1; index < parts.length; index += 1) prefixes.add(parts.slice(0, index).join('/'));
  }
  return prefixes;
}

const EXCLUDED_NEW_PATH = [
  /(^|\/)\.changeset\//,
  /(^|\/)\.github\//,
  /(^|\/)(tests?|__tests__)\//,
  /(^|\/)evals\/(fixtures|plugin|cases)\//,
  /(^|\/)evals\/[^/]+\/graders\//,
  /(^|\/)harness\//,
  /(^|\/)(dist|build|coverage|node_modules)\//,
];

export function classifyNewFile(path: string, prefixes: ReadonlySet<string>): NewFileDisposition {
  if (!path.endsWith('.md')) return { path, kind: 'other', disposition: 'rejected', reason: 'non-markdown' };
  if (EXCLUDED_NEW_PATH.some((pattern) => pattern.test(path))) {
    return { path, kind: 'markdown', disposition: 'rejected', reason: 'excluded-path' };
  }
  const parts = path.split('/');
  for (let index = parts.length - 1; index >= 1; index -= 1) {
    if (prefixes.has(parts.slice(0, index).join('/'))) {
      return { path, kind: 'markdown', disposition: 'candidate', reason: 'markdown-candidate' };
    }
  }
  return { path, kind: 'markdown', disposition: 'rejected', reason: 'outside-selected-directories' };
}

function git(cwd: string, args: readonly string[]): string {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) {
    const detail = (result.stderr || result.error?.message || '').trim();
    throw new SourceUpdateError(`git ${args.join(' ')} failed in ${cwd}: ${detail}`);
  }
  return result.stdout;
}

export function triageDonor(root: string, donorId: string, targetRevision?: string): DonorUpdateTriage {
  const manifest = loadDonorManifest(root);
  const map = loadCorpusMap(root);
  const baseline = loadSourceBaseline(join(root, 'source-baseline.json'));
  const donor = manifest.donors.get(donorId);
  const baselineDonor = baseline.donors.get(donorId);
  if (donor === undefined) throw new SourceUpdateError(`unknown donor ${donorId}`);
  if (baselineDonor === undefined) throw new SourceUpdateError(`donor ${donorId} has no source baseline`);
  const cloneRoot = resolve(manifest.localRoot, donor.localPath);
  const target = targetRevision ?? git(cloneRoot, ['rev-parse', 'FETCH_HEAD']).trim();
  if (!/^[0-9a-f]{40}$/.test(target)) throw new SourceUpdateError(`invalid target revision for donor ${donorId}`);
  const entries = parseNameStatus(git(cloneRoot, ['diff', '--name-status', `${baselineDonor.revision}..${target}`]));
  const prefixes = activePrefixes(map, donorId);
  const mapFiles = map.get(donorId)?.files ?? new Map();
  const usedChanges: UsedFileChange[] = [];
  const newFiles: NewFileDisposition[] = [];
  const counts = { added: 0, modified: 0, deleted: 0, renamed: 0 };
  for (const entry of entries) {
    if (entry.status === 'A') {
      counts.added += 1;
      newFiles.push(classifyNewFile(entry.path, prefixes));
    } else if (entry.status === 'M') {
      counts.modified += 1;
      const instructions = mapFiles.get(entry.path)?.instructionIds ?? [];
      if (instructions.length > 0) usedChanges.push({ path: entry.path, status: 'M', instructionIds: instructions });
    } else if (entry.status === 'D') {
      counts.deleted += 1;
      const instructions = mapFiles.get(entry.path)?.instructionIds ?? [];
      if (instructions.length > 0) usedChanges.push({ path: entry.path, status: 'D', instructionIds: instructions });
    } else if (entry.status === 'R') {
      counts.renamed += 1;
    }
  }
  return {
    donor: donorId,
    baselineRevision: baselineDonor.revision,
    targetRevision: target,
    ...counts,
    changedUsed: usedChanges.filter((entry) => entry.status === 'M').length,
    deletedUsed: usedChanges.filter((entry) => entry.status === 'D').length,
    newCandidates: newFiles.filter((entry) => entry.disposition === 'candidate').length,
    newRejected: newFiles.filter((entry) => entry.disposition === 'rejected').length,
    usedChanges,
    newFiles,
  };
}

export function triageAll(root: string, donorIds: readonly string[], targets: ReadonlyMap<string, string> = new Map()): DonorUpdateReport {
  const donors = donorIds.map((donorId) => triageDonor(root, donorId, targets.get(donorId)));
  return {
    schema: DONOR_UPDATE_TRIAGE_SCHEMA,
    donors,
    summary: {
      donors: donors.length,
      added: donors.reduce((total, donor) => total + donor.added, 0),
      modified: donors.reduce((total, donor) => total + donor.modified, 0),
      deleted: donors.reduce((total, donor) => total + donor.deleted, 0),
      changedUsed: donors.reduce((total, donor) => total + donor.changedUsed, 0),
      deletedUsed: donors.reduce((total, donor) => total + donor.deletedUsed, 0),
      newCandidates: donors.reduce((total, donor) => total + donor.newCandidates, 0),
      newRejected: donors.reduce((total, donor) => total + donor.newRejected, 0),
    },
  };
}

function flag(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  return args[index + 1];
}

function packageRoot(): string {
  return resolve(fileURLToPath(new URL('..', import.meta.url)));
}

export function runTriageCli(args: readonly string[], print: (text: string) => void = console.log): number {
  try {
    const root = resolve(flag(args, '--root') ?? packageRoot());
    const donorFilter = flag(args, '--donor');
    const target = flag(args, '--target');
    const manifest = loadDonorManifest(root);
    const baseline = loadSourceBaseline(join(root, 'source-baseline.json'));
    const donorIds = (donorFilter === undefined ? [...manifest.donors.keys()] : [donorFilter]).filter((donorId) => baseline.donors.has(donorId));
    const targets = new Map<string, string>();
    if (target !== undefined) for (const donorId of donorIds) targets.set(donorId, target);
    const report = triageAll(root, donorIds, targets);
    const out = flag(args, '--out');
    if (out !== undefined) writeFileSync(resolve(out), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    if (args.includes('--json')) {
      print(JSON.stringify(report, null, 2));
    } else {
      print(`donor update triage: ${report.summary.donors} donors, ${report.summary.added} added, ${report.summary.modified} modified, ${report.summary.deleted} deleted`);
      print(`used changes: ${report.summary.changedUsed} modified, ${report.summary.deletedUsed} deleted`);
      print(`new files: ${report.summary.newCandidates} candidates, ${report.summary.newRejected} rejected`);
      for (const donor of report.donors) {
        print(`${donor.donor}: used=${donor.changedUsed}+${donor.deletedUsed} new=${donor.newCandidates}c/${donor.newRejected}r target=${donor.targetRevision.slice(0, 8)}`);
      }
      for (const donor of report.donors) {
        for (const entry of donor.usedChanges.slice(0, 10)) {
          print(`  ${entry.status} ${donor.donor}:${entry.path} -> ${entry.instructionIds.length} instructions`);
        }
        for (const entry of donor.newFiles.filter((file) => file.disposition === 'candidate').slice(0, 10)) {
          print(`  candidate ${donor.donor}:${entry.path}`);
        }
      }
      if (out !== undefined) print(`written: ${resolve(out)}`);
    }
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (args.includes('--json')) print(JSON.stringify({ ok: false, error: message }, null, 2));
    else print(`error: ${message}`);
    return 1;
  }
}

export function startTriageCli(argv: readonly string[], print?: (text: string) => void): number | undefined {
  if (!isEntryPoint(import.meta.url, argv[1])) return undefined;
  const code = runTriageCli(argv.slice(2), print);
  process.exitCode = code;
  return code;
}

await startTriageCli(process.argv);
