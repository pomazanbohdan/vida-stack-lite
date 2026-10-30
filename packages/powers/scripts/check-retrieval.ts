import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog, loadInstructions } from '../skills/vp-mode/scripts/catalog.ts';
import type { LoadedInstruction } from '../skills/vp-mode/scripts/catalog.ts';
import { resolveIntent } from '../skills/vp-mode/scripts/retrieval.ts';
import { isEntryPoint } from '../skills/vp-mode/scripts/catalog-cli.ts';

export type RetrievalReportIntent = { name: string; terms: string[]; ids: string[]; capability?: string; pattern?: string };
export type RetrievalReport = { intents: RetrievalReportIntent[] };

export type RetrievalIssue = { code: string; message: string; intent?: string; instruction_id?: string };

export type RetrievalCheck = {
  ok: boolean;
  intents: Array<{
    name: string;
    status: string;
    capability: string | null;
    pattern: string | null;
    weak: boolean;
    ids: string[];
  }>;
  alias_coverage: { reachable: number; total: number };
  issues: RetrievalIssue[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strings(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  if (!value.every((item) => typeof item === 'string' && item.trim() !== '')) return undefined;
  return value as string[];
}

export function parseReport(value: unknown): { report?: RetrievalReport; issues: RetrievalIssue[] } {
  if (!isRecord(value) || !Array.isArray(value.intents)) {
    return { issues: [{ code: 'RETRIEVAL_REPORT_INVALID', message: 'report must be an object with an intents array' }] };
  }
  const issues: RetrievalIssue[] = [];
  const intents: RetrievalReportIntent[] = [];
  for (const [index, raw] of value.intents.entries()) {
    if (!isRecord(raw)) {
      issues.push({ code: 'RETRIEVAL_REPORT_INVALID', message: `intent ${index} is not an object` });
      continue;
    }
    const name = typeof raw.name === 'string' && raw.name.trim() !== '' ? raw.name : undefined;
    const terms = strings(raw.terms);
    const ids = strings(raw.ids);
    const capability = typeof raw.capability === 'string' && raw.capability.trim() !== '' ? raw.capability : undefined;
    const pattern = typeof raw.pattern === 'string' && raw.pattern.trim() !== '' ? raw.pattern : undefined;
    if (raw.capability !== undefined && capability === undefined) issues.push({ code: 'RETRIEVAL_REPORT_INVALID', message: `intent ${index} has an empty capability`, ...(name === undefined ? {} : { intent: name }) });
    if (raw.pattern !== undefined && pattern === undefined) issues.push({ code: 'RETRIEVAL_REPORT_INVALID', message: `intent ${index} has an empty pattern`, ...(name === undefined ? {} : { intent: name }) });
    if (name === undefined) issues.push({ code: 'RETRIEVAL_REPORT_INVALID', message: `intent ${index} has no name` });
    if (terms === undefined || terms.length === 0) issues.push({ code: 'RETRIEVAL_REPORT_INVALID', message: `intent ${index} has no terms`, ...(name === undefined ? {} : { intent: name }) });
    if (ids === undefined || ids.length === 0) issues.push({ code: 'RETRIEVAL_INTENT_EMPTY', message: `intent ${index} has no instruction ids`, ...(name === undefined ? {} : { intent: name }) });
    if (name !== undefined && terms !== undefined && ids !== undefined && terms.length > 0 && ids.length > 0) {
      intents.push({ name, terms, ids, ...(capability === undefined ? {} : { capability }), ...(pattern === undefined ? {} : { pattern }) });
    }
  }
  if (value.intents.length === 0) issues.push({ code: 'RETRIEVAL_REPORT_INVALID', message: 'report has no intents' });
  return issues.length === 0 ? { report: { intents }, issues } : { issues };
}

export function checkReport(
  catalog: Awaited<ReturnType<typeof loadCatalog>>,
  instructions: Map<string, LoadedInstruction>,
  report: RetrievalReport,
): RetrievalCheck {
  const aliases = new Map(Object.entries(catalog.tag_aliases));
  const issues: RetrievalIssue[] = [];
  const seen = new Map<string, string>();
  const intents: RetrievalCheck['intents'] = [];
  const tags = new Set<string>();
  for (const instruction of instructions.values()) {
    for (const tag of instruction.capability_tags) tags.add(tag);
    for (const tag of instruction.pattern_tags) tags.add(tag);
  }
  for (const intent of report.intents) {
    const declared = intent.capability !== undefined || intent.pattern !== undefined;
    const resolution: { status: string; capability?: string; pattern?: string } = declared
      ? {
        status: 'declared',
        ...(intent.capability === undefined ? {} : { capability: intent.capability }),
        ...(intent.pattern === undefined ? {} : { pattern: intent.pattern }),
      }
      : resolveIntent(instructions, intent.terms, aliases);
    if (intent.capability !== undefined && !tags.has(intent.capability)) {
      issues.push({ code: 'RETRIEVAL_TAG_UNKNOWN', message: `declared capability ${intent.capability} carries no instruction`, intent: intent.name });
    }
    if (intent.pattern !== undefined && !tags.has(intent.pattern)) {
      issues.push({ code: 'RETRIEVAL_TAG_UNKNOWN', message: `declared pattern ${intent.pattern} carries no instruction`, intent: intent.name });
    }
    for (const id of intent.ids) {
      const instruction = instructions.get(id);
      if (instruction === undefined) {
        issues.push({ code: 'RETRIEVAL_ID_UNKNOWN', message: `unknown instruction id ${id}`, intent: intent.name, instruction_id: id });
        continue;
      }
      if (seen.has(id)) {
        issues.push({ code: 'RETRIEVAL_ID_REUSED', message: `instruction ${id} is used by ${String(seen.get(id))} and ${intent.name}`, intent: intent.name, instruction_id: id });
      } else {
        seen.set(id, intent.name);
      }
    }
    if (resolution.status === 'unresolved') {
      issues.push({ code: 'RETRIEVAL_INTENT_UNRESOLVED', message: `terms "${intent.terms.join(' ')}" resolve no capability or pattern`, intent: intent.name });
    } else {
      const supported = intent.ids.some((id) => {
        const instruction = instructions.get(id);
        if (instruction === undefined) return false;
        return (resolution.capability !== undefined && instruction.capability_tags.includes(resolution.capability))
          || (resolution.pattern !== undefined && instruction.pattern_tags.includes(resolution.pattern));
      });
      if (!supported) {
        issues.push({
          code: 'RETRIEVAL_ID_NOT_IN_INTENT',
          message: `no selected instruction carries ${String(resolution.capability)}/${String(resolution.pattern)}`,
          intent: intent.name,
        });
      }
    }
    intents.push({
      name: intent.name,
      status: resolution.status,
      capability: resolution.capability ?? null,
      pattern: resolution.pattern ?? null,
      weak: resolution.status === 'weak',
      ids: intent.ids,
    });
  }
  const reachable = new Set<string>();
  for (const target of aliases.values()) if (tags.has(target)) reachable.add(target);
  return {
    ok: issues.length === 0,
    intents,
    alias_coverage: { reachable: reachable.size, total: tags.size },
    issues,
  };
}

export function parseReportText(text: string): { report?: RetrievalReport; issues: RetrievalIssue[] } {
  return parseReport(JSON.parse(text) as unknown);
}

const readReportText = (path: string): string => readFileSync(path === '-' ? 0 : path, 'utf8');

export async function checkRetrievalReport(
  catalogPath: string,
  reportPath: string,
  read: (path: string) => string = readReportText,
): Promise<RetrievalCheck> {
  const parsed = parseReportText(read(reportPath));
  if (parsed.report === undefined) return { ok: false, intents: [], alias_coverage: { reachable: 0, total: 0 }, issues: parsed.issues };
  const catalog = await loadCatalog(catalogPath);
  const instructions = await loadInstructions(catalog, dirname(resolve(catalogPath)));
  return checkReport(catalog, instructions, parsed.report);
}

function flag(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

export type RetrievalIo = { out: (text: string) => void; err: (text: string) => void };

export async function runRetrievalCli(argv: readonly string[], io: RetrievalIo): Promise<number> {
  const catalogPath = flag(argv, '--catalog');
  const reportPath = flag(argv, '--report');
  if (catalogPath === undefined || reportPath === undefined) {
    io.err('usage: check-retrieval.ts --catalog <catalog.json> --report <report.json|->\n');
    return 2;
  }
  let result: RetrievalCheck;
  try {
    result = await checkRetrievalReport(catalogPath, reportPath);
  } catch (error) {
    io.err(`RETRIEVAL_CHECK_FAILED: ${error instanceof Error ? error.message : String(error)}\n`);
    return 2;
  }
  io.out(`${JSON.stringify(result, null, 2)}\n`);
  return result.ok ? 0 : 1;
}

export async function startRetrievalCli(argv: readonly string[], io?: RetrievalIo): Promise<number | undefined> {
  if (!isEntryPoint(import.meta.url, argv[1])) return undefined;
  const target = io ?? { out: (text: string) => process.stdout.write(text), err: (text: string) => process.stderr.write(text) };
  const code = await runRetrievalCli(argv.slice(2), target);
  process.exitCode = code;
  return code;
}

await startRetrievalCli(process.argv);
