/**
 * The corpus audit CLI: one command per report, one option set for every
 * command, and a bounded view of every report by default.
 *
 *   bun packages/powers/scripts/audit.ts <map|pairs|pair-agreement|pair-table|fidelity|specs> [options]
 *
 * The reports are read-only. The converter stays the single writer of the
 * corpus files.
 *
 * The output is bounded on purpose: a report may hold thousands of rows, and
 * the terminal shows the counters and the first rows. `--all` prints every
 * row, `--out <file>` writes the whole report to a file and leaves the
 * terminal with the counters only.
 */
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  fidelityReport,
  loadCorpus,
  loadDonorClones,
  mapReport,
  pairAgreementReport,
  pairsReport,
  pairTableRows,
  specsReport,
  type Report,
  type Section,
} from './audit-report.ts';

export type AuditCommand = 'map' | 'pairs' | 'pair-agreement' | 'pair-table' | 'fidelity' | 'specs';
export type AuditOptions = {
  command: AuditCommand;
  root: string;
  limit: number;
  offset: number;
  filter: string | undefined;
  summary: boolean;
  all: boolean;
  json: boolean;
  out: string | undefined;
  instruction: string | undefined;
  specs: string[];
  specDirs: string[];
};
export type CliOutput = { stdout: (text: string) => void; stderr: (text: string) => void };

export const AUDIT_COMMANDS: AuditCommand[] = ['map', 'pairs', 'pair-agreement', 'pair-table', 'fidelity', 'specs'];
export const DEFAULT_LIMIT = 20;
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const usage = [
  'usage: audit.ts <map|pairs|pair-agreement|pair-table|fidelity|specs> [options]',
  '  --root <dir>        the corpus root (default: the package root)',
  '  --limit <n>         rows per section (default: 20)',
  '  --offset <n>        rows skipped before the first shown row',
  '  --filter <text>     only rows that contain <text>',
  '  --summary           counters only, no rows',
  '  --all               every row, without a limit',
  '  --json              the report as JSON',
  '  --out <file>        write the whole report to <file>; the terminal shows the counters',
  '  --instruction <id>  limit the fidelity report to one instruction',
  '  --spec <file>       a specification to verify (repeatable)',
  '  --spec-dir <dir>    every specification in <dir> (repeatable)',
].join('\n');

function invalid(message: string): Error {
  return new Error(`AUDIT_ARGUMENT_INVALID: ${message}\n${usage}`);
}

function numberValue(flag: string, value: string | undefined): number {
  if (value === undefined || !/^\d+$/.test(value)) throw invalid(`${flag} requires a non-negative integer`);
  return Number(value);
}

export function parseAuditArgs(argv: string[]): AuditOptions {
  const command = argv[0] as AuditCommand | undefined;
  if (command === undefined || !AUDIT_COMMANDS.includes(command)) {
    throw invalid(`unknown command ${String(argv[0] ?? '')}`);
  }
  const options: AuditOptions = {
    command,
    root: packageRoot,
    limit: DEFAULT_LIMIT,
    offset: 0,
    filter: undefined,
    summary: false,
    all: false,
    json: false,
    out: undefined,
    instruction: undefined,
    specs: [],
    specDirs: [],
  };
  for (let index = 1; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === '--summary' || flag === '--all' || flag === '--json') {
      if (flag === '--summary') options.summary = true;
      else if (flag === '--all') options.all = true;
      else options.json = true;
      continue;
    }
    if (value === undefined || value.startsWith('--')) throw invalid(`${flag} requires a value`);
    index += 1;
    if (flag === '--root') options.root = value;
    else if (flag === '--limit') options.limit = numberValue(flag, value);
    else if (flag === '--offset') options.offset = numberValue(flag, value);
    else if (flag === '--filter') options.filter = value;
    else if (flag === '--out') options.out = value;
    else if (flag === '--instruction') options.instruction = value;
    else if (flag === '--spec') options.specs.push(value);
    else if (flag === '--spec-dir') options.specDirs.push(value);
    else throw invalid(`unknown flag ${String(flag)}`);
  }
  return options;
}

function specsIn(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => join(directory, entry.name))
    .sort();
  return entries;
}

/** The specification files of a run: the named files first, then every directory. */
export function specFiles(options: AuditOptions): string[] {
  const files = options.specs.map((file) => resolve(options.root, file));
  for (const directory of options.specDirs) {
    files.push(...specsIn(resolve(options.root, directory)));
  }
  return files;
}

/** The rows of one section inside the requested window. */
export function selectRows(rows: string[], options: AuditOptions): { rows: string[]; hidden: number } {
  const needle = options.filter?.toLowerCase();
  const matching = needle === undefined
    ? rows
    : rows.filter((row) => row.toLowerCase().includes(needle));
  const window = matching.slice(options.offset);
  const selected = options.all ? window : window.slice(0, options.limit);
  return { rows: selected, hidden: matching.length - selected.length };
}

export function renderReport(report: Report, options: AuditOptions): string {
  const lines: string[] = [`== audit ${report.command} ==`, `root: ${options.root}`];
  for (const counter of report.counters) lines.push(`  ${counter.label}: ${counter.value}`);
  if (!options.summary) {
    lines.push('sections:');
    for (const section of report.sections) {
      const selected = selectRows(section.rows, options);
      lines.push(`  ${section.name} (${section.kind}, ${String(section.rows.length)})`);
      for (const row of selected.rows) lines.push(`    ${row}`);
      if (selected.hidden > 0) {
        lines.push(`    ... ${String(selected.hidden)} more rows (use --limit, --offset, --filter or --all)`);
      }
    }
  }
  return `${lines.join('\n')}\n`;
}

export function reportJson(report: Report, options: AuditOptions): string {
  const sections: Section[] = options.summary ? [] : report.sections.map((section) => {
    const selected = selectRows(section.rows, options);
    return { name: section.name, kind: section.kind, total: section.rows.length, rows: selected.rows };
  });
  return `${JSON.stringify({ command: report.command, root: options.root, counters: report.counters, sections }, null, 2)}\n`;
}

/** The report of one command, over the corpus of the chosen root. */
export function buildReport(options: AuditOptions): Report {
  if (options.command === 'specs' && specFiles(options).length === 0) {
    throw invalid('the specs command needs at least one --spec or --spec-dir');
  }
  const corpus = loadCorpus(options.root);
  if (options.command === 'map') return mapReport(corpus);
  if (options.command === 'pairs') return pairsReport(corpus);
  if (options.command === 'pair-agreement') {
    return pairAgreementReport(corpus, resolve(options.root, 'docs/decisions/D12-declared-conflicts.md'));
  }
  if (options.command === 'pair-table') {
    const rows = pairTableRows(corpus);
    return {
      command: 'pair-table',
      counters: [{ label: 'pairs', value: String(rows.length) }],
      sections: [{ name: 'row', kind: 'info', rows }],
    };
  }
  const clones = loadDonorClones(options.root);
  if (options.command === 'fidelity') return fidelityReport(corpus, clones, options.instruction);
  return specsReport(corpus, clones, specFiles(options));
}

export function runAuditCli(argv: string[], output: CliOutput): number {
  try {
    const options = parseAuditArgs(argv);
    const report = buildReport(options);
    if (options.out !== undefined) {
      const target = resolve(options.root, options.out);
      const complete = { ...options, summary: false, all: true };
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, options.json ? reportJson(report, complete) : renderReport(report, complete));
      const summary = { ...options, summary: true };
      output.stdout(options.json ? reportJson(report, summary) : renderReport(report, summary));
      if (!options.json) output.stdout(`the full report is written to ${target}\n`);
      return 0;
    }
    output.stdout(options.json ? reportJson(report, options) : renderReport(report, options));
    return 0;
  } catch (error) {
    output.stderr(`${String(error)}\n`);
    return 1;
  }
}

process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url)) &&
  (process.exitCode = runAuditCli(process.argv.slice(2), {
    stdout: process.stdout.write.bind(process.stdout),
    stderr: process.stderr.write.bind(process.stderr),
  }));
