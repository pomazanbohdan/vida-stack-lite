import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CatalogError,
  catalogCompose,
  catalogGet,
  catalogSearch,
  catalogTags,
  decisionEvaluate,
  loadCatalog,
  loadInstructions,
  readSchema,
} from './catalog.ts';
import type { ComposeQuery, SearchQuery } from './catalog.ts';
import { validateAgainstSchema } from './schema.ts';

type Command = 'tags' | 'search' | 'get' | 'compose' | 'evaluate';
type ParsedArgs = { command: string; flags: Map<string, string[]> };
type CliOutput = { stdout: (text: string) => void; stderr: (text: string) => void };

const knownFlags = new Set([
  '--catalog', '--capability', '--pattern', '--id', '--required', '--role', '--roles', '--product',
  '--condition', '--profile', '--operation', '--context', '--tag', '--candidate', '--json',
]);
const repeatedFlags = new Set(['--tag', '--candidate']);
const usage = 'usage: bun catalog-cli.ts <tags|search|get|compose|evaluate> [flags]; --roles <r1,r2> filters search/compose; --role <r> sets compose execution context';

function invalid(message: string, details: Record<string, unknown> = {}): CatalogError {
  return new CatalogError('CATALOG_INVALID', message, details);
}

function samePath(left: string, right: string): boolean {
  return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;
}

export function isEntryPoint(scriptUrl: string, argvPath: string | undefined): boolean {
  if (argvPath === undefined) return false;
  const scriptPath = fileURLToPath(scriptUrl);
  try {
    return samePath(realpathSync(scriptPath), realpathSync(argvPath));
  } catch {
    return samePath(scriptPath, argvPath);
  }
}

export function defaultCatalogPath(scriptUrl: string): string {
  return resolve(dirname(fileURLToPath(scriptUrl)), '../../../catalog.json');
}

function parseArgs(argv: string[]): ParsedArgs {
  const command = argv[0] ?? '';
  if (command === '') throw invalid('command is required');
  const flags = new Map<string, string[]>();
  for (let index = 1; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === undefined || !flag.startsWith('--')) throw invalid(`unexpected argument ${flag ?? ''}`, { argument: flag });
    if (!knownFlags.has(flag)) throw invalid(`unknown flag ${flag}`, { flag });
    const values = flags.get(flag) ?? [];
    if (!repeatedFlags.has(flag) && flags.has(flag)) throw invalid(`flag ${flag} may only be supplied once`, { flag });
    if (flag === '--json') {
      flags.set(flag, []);
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw invalid(`missing value for ${flag}`, { flag });
    index += 1;
    values.push(value);
    flags.set(flag, values);
  }
  return { command, flags };
}

function allowedFlags(command: string): Set<string> {
  const common = ['--catalog', '--json'];
  const commandFlags: Record<string, string[]> = {
    tags: [],
    search: ['--capability', '--pattern', '--id', '--roles', '--product', '--condition'],
    get: ['--id'],
    compose: ['--capability', '--pattern', '--id', '--required', '--role', '--roles', '--product', '--condition', '--profile'],
    evaluate: ['--operation', '--context', '--product', '--tag', '--candidate'],
  };
  const specific = commandFlags[command];
  if (specific === undefined) throw invalid(`unknown command ${command}`, { command, usage });
  return new Set([...common, ...specific]);
}

function validateFlags(command: string, flags: Map<string, string[]>): void {
  const allowed = allowedFlags(command);
  for (const flag of flags.keys()) if (!allowed.has(flag)) throw invalid(`flag ${flag} is not valid for ${command}`, { command, flag });
}

function one(flags: Map<string, string[]>, name: string): string | undefined {
  return flags.get(name)?.[0];
}

function required(flags: Map<string, string[]>, name: string): string {
  const value = one(flags, name);
  if (value === undefined || value.trim() === '') throw invalid(`missing required flag ${name}`, { flag: name });
  return value;
}

function commaList(flags: Map<string, string[]>, name: string): string[] | undefined {
  const value = one(flags, name);
  if (value === undefined) return undefined;
  const values = value.split(',').map((item) => item.trim());
  if (values.some((item) => item === '')) throw invalid(`flag ${name} must contain non-empty comma-separated values`, { flag: name });
  return values;
}

async function profileAt(path: string | undefined, catalogDirectory: string): Promise<ComposeQuery['profile']> {
  if (path === undefined) return undefined;
  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch (error) {
    throw invalid('cannot read profile JSON', { path, error: error instanceof Error ? error.message : String(error) });
  }
  let profile: unknown;
  try {
    profile = JSON.parse(text) as unknown;
  } catch (error) {
    throw invalid('profile JSON is malformed', { path, error: error instanceof Error ? error.message : String(error) });
  }
  const schema = await readSchema(catalogDirectory, 'vpeffectiveprofile.v1.schema.json');
  const schemaErrors = validateAgainstSchema(profile, schema);
  if (schemaErrors.length > 0) throw new CatalogError('CATALOG_INVALID', 'profile schema validation failed', { schemaErrors });
  return profile as ComposeQuery['profile'];
}

async function dispatch(command: Command, flags: Map<string, string[]>, catalogPath: string): Promise<unknown> {
  const catalog = await loadCatalog(catalogPath);
  const instructions = await loadInstructions(catalog, dirname(resolve(catalogPath)));
  switch (command) {
    case 'tags':
      return catalogTags(catalog);
    case 'search': {
      const query: SearchQuery = {};
      const capabilityTags = commaList(flags, '--capability');
      const patternTags = commaList(flags, '--pattern');
      const roles = commaList(flags, '--roles');
      const instructionIds = commaList(flags, '--id');
      const products = commaList(flags, '--product');
      const conditions = commaList(flags, '--condition');
      if (capabilityTags !== undefined) query.capability_tags = capabilityTags;
      if (patternTags !== undefined) query.pattern_tags = patternTags;
      if (instructionIds !== undefined) query.instruction_ids = instructionIds;
      if (roles !== undefined) query.roles = roles;
      if (products !== undefined) query.products = products;
      if (conditions !== undefined) query.conditions = conditions;
      return { results: catalogSearch(catalog, instructions, query) };
    }
    case 'get':
      return { instruction: catalogGet(catalog, instructions, required(flags, '--id')) };
    case 'compose': {
      const profile = await profileAt(one(flags, '--profile'), dirname(resolve(catalogPath)));
      const query: ComposeQuery = {};
      const capabilityTags = commaList(flags, '--capability');
      const patternTags = commaList(flags, '--pattern');
      const instructionIds = commaList(flags, '--id');
      const requiredIds = commaList(flags, '--required');
      const role = one(flags, '--role');
      const roles = commaList(flags, '--roles');
      const products = commaList(flags, '--product');
      const conditions = commaList(flags, '--condition');
      if (capabilityTags !== undefined) query.capability_tags = capabilityTags;
      if (patternTags !== undefined) query.pattern_tags = patternTags;
      if (instructionIds !== undefined) query.instruction_ids = instructionIds;
      if (requiredIds !== undefined) query.required_ids = requiredIds;
      if (role !== undefined) query.role = role;
      if (roles !== undefined) query.roles = roles;
      if (products !== undefined) query.products = products;
      if (conditions !== undefined) query.conditions = conditions;
      if (profile !== undefined) query.profile = profile;
      return catalogCompose(catalog, instructions, query);
    }
    case 'evaluate':
      return decisionEvaluate(catalog, instructions, {
        operation: required(flags, '--operation'),
        candidates: flags.get('--candidate') ?? [],
        ...(one(flags, '--product') === undefined ? {} : { product: one(flags, '--product') as string }),
        ...(one(flags, '--context') === undefined ? {} : { context: one(flags, '--context') as string }),
        ...(flags.get('--tag') === undefined ? {} : { tags: flags.get('--tag') as string[] }),
      });
  }
}

async function main(argv: string[], output: CliOutput): Promise<number> {
  try {
    const parsed = parseArgs(argv);
    validateFlags(parsed.command, parsed.flags);
    const command = parsed.command as Command;
    const catalogPath = one(parsed.flags, '--catalog') ?? defaultCatalogPath(import.meta.url);
    const result = await dispatch(command, parsed.flags, catalogPath);
    output.stdout(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (error) {
    const payload = error instanceof CatalogError
      ? { code: error.code, message: error.message, details: error.details }
      : { code: 'CATALOG_INVALID', message: error instanceof Error ? error.message : String(error), details: {} };
    output.stderr(`${JSON.stringify(payload)}\n`);
    return 1;
  }
}

export function runCatalogCli(
  argv: string[],
  output: CliOutput,
  setExitCode: (code: number) => void = (code) => { process.exitCode = code; },
): Promise<number | undefined> {
  if (!isEntryPoint(import.meta.url, argv[1])) return Promise.resolve(undefined);
  return main(argv.slice(2), output).then((code) => {
    setExitCode(code);
    return code;
  });
}

await runCatalogCli(process.argv, {
  stdout: process.stdout.write.bind(process.stdout),
  stderr: process.stderr.write.bind(process.stderr),
});
