import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isEntryPoint } from '../skills/vp-mode/scripts/catalog-cli.ts';
import {
  loadCorpusMap,
  loadDonorManifest,
  loadSourceBaseline,
} from './source-updates.ts';

export type VectorIssue = Readonly<{ code: string; message: string }>;

export type VectorCheck = Readonly<{
  ok: boolean;
  issues: readonly VectorIssue[];
  counts: Readonly<{ instructions: number; mapRecords: number; baselineFiles: number }>;
  batches: number;
}>;

function countMapRecords(map: ReturnType<typeof loadCorpusMap>): number {
  let total = 0;
  for (const donor of map.values()) total += donor.files.size;
  return total;
}

function countBaselineFiles(baseline: ReturnType<typeof loadSourceBaseline>): number {
  let total = 0;
  for (const donor of baseline.donors.values()) total += donor.files.size;
  return total;
}

export function checkVector(root: string): VectorCheck {
  const issues: VectorIssue[] = [];
  const doc = readFileSync(join(root, 'docs', 'VECTOR.md'), 'utf8');
  if (!doc.includes('## Current vector')) issues.push({ code: 'VECTOR_SECTION_MISSING', message: 'VECTOR.md has no Current vector section' });
  if (!doc.includes('## Batch log')) issues.push({ code: 'VECTOR_SECTION_MISSING', message: 'VECTOR.md has no Batch log section' });

  const section = doc.split('## Batch log')[1]?.split(/\n## /)[0] ?? '';
  const rows = section
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith('|'))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 8 && /^\d+$/.test(cells[0] ?? ''));
  if (rows.length === 0) issues.push({ code: 'VECTOR_ROWS_MISSING', message: 'VECTOR.md batch table has no data rows' });

  const manifest = loadDonorManifest(root);
  const map = loadCorpusMap(root);
  const baseline = loadSourceBaseline(join(root, 'source-baseline.json'));
  const counts = {
    instructions: JSON.parse(readFileSync(join(root, 'catalog.json'), 'utf8')).instructions.length as number,
    mapRecords: countMapRecords(map),
    baselineFiles: countBaselineFiles(baseline),
  };

  for (const cells of rows) {
    const batch = cells[0] ?? '';
    const donorId = cells[1] ?? '';
    const pin = [...(cells[2] ?? '').matchAll(/[0-9a-f]{40}/g)].at(-1)?.[0];
    const donor = manifest.donors.get(donorId);
    if (donor === undefined) {
      issues.push({ code: 'VECTOR_DONOR_UNKNOWN', message: `batch ${batch} names unknown donor ${donorId}` });
    } else if (pin !== donor.headSha) {
      issues.push({ code: 'VECTOR_PIN_STALE', message: `batch ${batch} donor ${donorId} pin ${pin ?? 'missing'} does not match donors.yaml ${donor.headSha}` });
    }
  }

  const last = rows.at(-1);
  if (last !== undefined) {
    const result = last[7] ?? '';
    const numbers = [...result.matchAll(/\d[\d,]*/g)].map((match) => Number(match[0].replaceAll(',', '')));
    if (numbers.length < 3) {
      issues.push({ code: 'VECTOR_RESULT_INVALID', message: `latest batch result "${result}" is not corpus / map / baseline` });
    } else {
      const [instructions, mapRecords, baselineFiles] = numbers;
      if (instructions !== counts.instructions) issues.push({ code: 'VECTOR_COUNT_STALE', message: `latest batch corpus ${instructions} does not match catalog ${counts.instructions}` });
      if (mapRecords !== counts.mapRecords) issues.push({ code: 'VECTOR_COUNT_STALE', message: `latest batch map ${mapRecords} does not match corpus map ${counts.mapRecords}` });
      if (baselineFiles !== counts.baselineFiles) issues.push({ code: 'VECTOR_COUNT_STALE', message: `latest batch baseline ${baselineFiles} does not match source baseline ${counts.baselineFiles}` });
    }
  }

  return { ok: issues.length === 0, issues, counts, batches: rows.length };
}

function flag(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  return args[index + 1];
}

function packageRoot(): string {
  return resolve(fileURLToPath(new URL('..', import.meta.url)));
}

export function runCheckVectorCli(args: readonly string[], print: (text: string) => void = console.log): number {
  try {
    const root = resolve(flag(args, '--root') ?? packageRoot());
    const result = checkVector(root);
    if (args.includes('--json')) {
      print(JSON.stringify(result, null, 2));
    } else {
      print(`vector check: ${result.batches} batches, ${result.counts.instructions} instructions, ${result.counts.mapRecords} map records, ${result.counts.baselineFiles} baseline files`);
      for (const issue of result.issues) print(`${issue.code}: ${issue.message}`);
    }
    return result.ok ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (args.includes('--json')) print(JSON.stringify({ ok: false, error: message }, null, 2));
    else print(`error: ${message}`);
    return 2;
  }
}

export function startCheckVectorCli(argv: readonly string[], print?: (text: string) => void): number | undefined {
  if (!isEntryPoint(import.meta.url, argv[1])) return undefined;
  const code = runCheckVectorCli(argv.slice(2), print);
  process.exitCode = code;
  return code;
}

await startCheckVectorCli(process.argv);
