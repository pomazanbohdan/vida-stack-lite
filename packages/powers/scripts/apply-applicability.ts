import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { parseApplicability } from '../skills/vp-mode/scripts/applicability.ts';
import { parseFrontmatter } from '../skills/vp-mode/scripts/frontmatter.ts';

export type ApplyApplicabilityOptions = {
  root: string;
  instructionId: string;
  applicability: unknown;
  catalogPath?: string;
  now?: () => string;
};

export type ApplyApplicabilityResult = { path: string; sha256: string; catalogRevision: number };

function encodeScalar(value: unknown): string {
  const compact = JSON.stringify(value);
  parseApplicability(compact);
  return `"${compact.replace(/\\/gu, '\\\\').replace(/"/gu, '\\"')}"`;
}

function rewriteHeader(text: string, line: string): string {
  const start = text.indexOf('---\n');
  if (start < 0) throw new Error('instruction frontmatter is missing');
  const end = text.indexOf('\n---', start + 4);
  if (end < 0) throw new Error('instruction frontmatter is not terminated');
  const header = text.slice(start + 4, end).split('\n');
  const schemaIndex = header.findIndex((item) => item.startsWith('schema:'));
  if (schemaIndex < 0) throw new Error('instruction schema marker is missing');
  header[schemaIndex] = 'schema: VPInstruction/v2';
  const applicabilityIndex = header.findIndex((item) => item.startsWith('applicability:'));
  if (applicabilityIndex >= 0) header[applicabilityIndex] = `applicability: ${line}`;
  else header.splice(schemaIndex + 1, 0, `applicability: ${line}`);
  return `${text.slice(0, start + 4)}${header.join('\n')}${text.slice(end)}`;
}

export async function applyApplicability(options: ApplyApplicabilityOptions): Promise<ApplyApplicabilityResult> {
  const root = resolve(options.root);
  const catalogPath = resolve(options.catalogPath ?? join(root, 'catalog.json'));
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8')) as Record<string, any>;
  const entry = Array.isArray(catalog.instructions)
    ? catalog.instructions.find((item: Record<string, unknown>) => item.instruction_id === options.instructionId)
    : undefined;
  if (entry === undefined) throw new Error(`instruction ${options.instructionId} is not in the catalog`);
  const instructionPath = resolve(root, String(entry.path));
  const source = await readFile(instructionPath, 'utf8');
  const parsed = parseFrontmatter(source);
  if (parsed.data.schema !== 'VPInstruction/v1.2' && parsed.data.schema !== 'VPInstruction/v2') {
    throw new Error(`instruction ${options.instructionId} has an unsupported schema marker`);
  }
  const encoded = encodeScalar(options.applicability);
  const next = rewriteHeader(source, encoded);
  const front = parseFrontmatter(next);
  if (front.data.schema !== 'VPInstruction/v2') throw new Error('failed to set the v2 marker');
  if (typeof front.data.applicability !== 'string') throw new Error('failed to write applicability');
  parseApplicability(front.data.applicability);
  const sha256 = createHash('sha256').update(next).digest('hex');
  await writeFile(instructionPath, next, 'utf8');
  entry.sha256 = sha256;
  catalog.revision = Number(catalog.revision) + 1;
  catalog.updated_at = (options.now ?? (() => new Date().toISOString()))();
  await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  return { path: instructionPath, sha256, catalogRevision: catalog.revision };
}

function usage(): never {
  throw new Error('usage: apply-applicability.ts --root <root> --id <instruction-id> (--applicability <json> | --applicability-file <path>) [--catalog <path>]');
}

export type ApplyApplicabilityCliOutput = {
  stdout: (text: string) => void;
  stderr: (text: string) => void;
};

export function isEntryPoint(moduleUrl: string, argv1: string | undefined): boolean {
  return argv1 !== undefined && resolve(argv1) === fileURLToPath(moduleUrl);
}

export async function runApplyApplicabilityCli(
  argv: string[],
  output: ApplyApplicabilityCliOutput,
  setExitCode: (code: number) => void = (code) => { process.exitCode = code; },
): Promise<number | undefined> {
  if (!isEntryPoint(import.meta.url, argv[1])) return undefined;
  try {
    const flags = new Map<string, string>();
    for (let index = 2; index < argv.length; index += 1) {
      const flag = argv[index];
      if (!flag?.startsWith('--')) usage();
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) usage();
      flags.set(flag, value);
      index += 1;
    }
    const root = flags.get('--root') ?? usage();
    const instructionId = flags.get('--id') ?? usage();
    const inline = flags.get('--applicability');
    const file = flags.get('--applicability-file');
    if ((inline === undefined) === (file === undefined)) usage();
    const applicability = inline !== undefined ? JSON.parse(inline) as unknown : JSON.parse(await readFile(resolve(file as string), 'utf8')) as unknown;
    const result = await applyApplicability({
      root,
      instructionId,
      applicability,
      ...(flags.get('--catalog') === undefined ? {} : { catalogPath: flags.get('--catalog') as string }),
    });
    output.stdout(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (error) {
    output.stderr(`${error instanceof Error ? error.message : String(error)}\n`);
    setExitCode(1);
    return 1;
  }
}

await runApplyApplicabilityCli(process.argv, {
  stdout: process.stdout.write.bind(process.stdout),
  stderr: process.stderr.write.bind(process.stderr),
});
