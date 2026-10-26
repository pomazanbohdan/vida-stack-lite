import { readFile } from 'node:fs/promises';
import { lstat } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendFindingEvent, findFindingCandidates } from './findings.ts';
import {
  CatalogError,
  catalogBrowse,
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
import { isClassificationStatus, isInstructionDomain, isInstructionForm } from './instruction-facets.ts';
import type { ClassificationStatus, InstructionDomain, InstructionForm } from './instruction-facets.ts';

type Command = 'tags' | 'search' | 'get' | 'compose' | 'evaluate' | 'browse';
type FindingsOperation = 'append' | 'candidates';
type ParsedArgs = { command: Command; subcommand?: never; flags: Map<string, string[]> }
  | { command: 'findings'; subcommand: FindingsOperation; flags: Map<string, string[]> };
type CliOutput = { stdout: (text: string) => void; stderr: (text: string) => void };
type FindingsErrorCode =
  | 'FINDING_INPUT_JSON_INVALID'
  | 'FINDING_INPUT_PATH_INVALID'
  | 'FINDING_INPUT_READ_FAILED'
  | 'FINDING_INVALID'
  | 'FINDING_CANDIDATE_QUERY_INVALID'
  | 'FINDING_STORE_PATH_INVALID'
  | 'FINDING_STORE_INVALID'
  | 'FINDING_ID_CONFLICT'
  | 'FINDING_MERGE_TARGET_MISSING'
  | 'FINDING_STORE_RECOVERY_REQUIRED'
  | 'FINDING_OPERATION_FAILED';

class FindingsCliError extends Error {
  readonly code: FindingsErrorCode;

  constructor(code: FindingsErrorCode) {
    super(code === 'FINDING_OPERATION_FAILED' ? 'findings operation failed' : code);
    this.name = 'FindingsCliError';
    this.code = code;
  }
}

const findingsErrorCodes = new Set<FindingsErrorCode>([
  'FINDING_INPUT_JSON_INVALID', 'FINDING_INPUT_PATH_INVALID', 'FINDING_INPUT_READ_FAILED',
  'FINDING_INVALID', 'FINDING_CANDIDATE_QUERY_INVALID', 'FINDING_STORE_PATH_INVALID',
  'FINDING_STORE_INVALID', 'FINDING_ID_CONFLICT', 'FINDING_MERGE_TARGET_MISSING', 'FINDING_STORE_RECOVERY_REQUIRED',
]);

const knownFlags = new Set([
  '--catalog', '--capability', '--pattern', '--id', '--required', '--role', '--roles', '--product',
  '--condition', '--profile', '--operation', '--context', '--tag', '--candidate', '--store', '--event-file',
  '--form', '--domain', '--classification-status', '--json',
]);
const repeatedFlags = new Set(['--tag', '--candidate', '--form', '--domain', '--classification-status']);
const usage = 'usage: bun catalog-cli.ts <tags|search|get|compose|evaluate|browse> [flags]; --roles <r1,r2> filters search/compose; repeat --form, --domain, --classification-status to filter search; --role <r> sets compose execution context; findings <append|candidates> --store <absolute-path> --event-file <absolute-path>';

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
  const findingsCommand = command === 'findings';
  const hasFindingsSubcommand = command === 'findings' && argv[1] !== undefined && !argv[1].startsWith('--');
  const subcommand = hasFindingsSubcommand ? argv[1] : undefined;
  const firstFlagIndex = hasFindingsSubcommand ? 2 : 1;
  const flags = new Map<string, string[]>();
  for (let index = firstFlagIndex; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === undefined || !flag.startsWith('--')) {
      if (findingsCommand) throw invalid('unexpected findings argument');
      throw invalid(`unexpected argument ${flag ?? ''}`, { argument: flag });
    }
    if (!knownFlags.has(flag)) {
      if (findingsCommand) throw invalid('unknown findings flag');
      throw invalid(`unknown flag ${flag}`, { flag });
    }
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
  if (command === 'findings') {
    if (subcommand !== 'append' && subcommand !== 'candidates') throw invalid('unknown findings operation', { command, usage });
    return { command, subcommand, flags };
  }
  if (command === 'tags' || command === 'search' || command === 'get' || command === 'compose' || command === 'evaluate' || command === 'browse') return { command, flags };
  throw invalid(`unknown command ${command}`, { command, usage });
}

function allowedFlags(command: ParsedArgs['command']): Set<string> {
  const common = ['--catalog', '--json'];
  if (command === 'findings') {
    return new Set(['--store', '--event-file']);
  }
  const commandFlags: Record<Command, string[]> = {
    tags: [],
    search: ['--capability', '--pattern', '--id', '--roles', '--product', '--condition', '--form', '--domain', '--classification-status'],
    get: ['--id'],
    compose: ['--capability', '--pattern', '--id', '--required', '--role', '--roles', '--product', '--condition', '--profile'],
    evaluate: ['--operation', '--context', '--product', '--tag', '--candidate'],
    browse: [],
  };
  const specific = commandFlags[command];
  return new Set([...common, ...specific]);
}

function validateFlags(command: ParsedArgs['command'], flags: Map<string, string[]>): void {
  const allowed = allowedFlags(command);
  for (const flag of flags.keys()) if (!allowed.has(flag)) throw invalid(`flag ${flag} is not valid for ${command}`, { command, flag });
}

function errnoIs(error: unknown, code: string): boolean {
  return error !== null && typeof error === 'object' && 'code' in error && error.code === code;
}

async function eventFromFile(path: string): Promise<unknown> {
  const separators = process.platform === 'win32' ? /[\\/]+/ : /\/+/;
  if (!isAbsolute(path) || path.split(separators).some((part) => part === '.' || part === '..')) {
    throw new FindingsCliError('FINDING_INPUT_PATH_INVALID');
  }
  let metadata: Awaited<ReturnType<typeof lstat>>;
  try {
    metadata = await lstat(path);
  } catch (error) {
    if (errnoIs(error, 'ENOTDIR')) throw new FindingsCliError('FINDING_INPUT_PATH_INVALID');
    throw new FindingsCliError('FINDING_INPUT_READ_FAILED');
  }
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw new FindingsCliError('FINDING_INPUT_PATH_INVALID');

  let text: string;
  try {
    text = await readFile(path, 'utf8');
  } catch {
    throw new FindingsCliError('FINDING_INPUT_READ_FAILED');
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new FindingsCliError('FINDING_INPUT_JSON_INVALID');
  }
}

async function dispatchFindings(
  subcommand: FindingsOperation,
  flags: Map<string, string[]>,
): Promise<unknown> {
  try {
    const storePath = required(flags, '--store');
    const input = await eventFromFile(required(flags, '--event-file'));
    if (subcommand === 'append') return await appendFindingEvent(storePath, input);
    return await findFindingCandidates(storePath, input);
  } catch (error) {
    if (error instanceof CatalogError || error instanceof FindingsCliError) throw error;
    if (error instanceof Error && findingsErrorCodes.has(error.message as FindingsErrorCode)) {
      throw new FindingsCliError(error.message as FindingsErrorCode);
    }
    throw new FindingsCliError('FINDING_OPERATION_FAILED');
  }
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

function repeatedFacetValues<T extends string>(
  flags: Map<string, string[]>,
  name: string,
  isAllowed: (value: unknown) => value is T,
): T[] | undefined {
  const values = flags.get(name);
  if (values === undefined) return undefined;
  const parsed: T[] = [];
  for (const value of values) {
    if (!isAllowed(value)) throw invalid(`flag ${name} contains an unsupported value`, { flag: name, value });
    if (parsed.includes(value)) throw invalid(`flag ${name} contains a duplicate value`, { flag: name, value });
    parsed.push(value);
  }
  return parsed;
}

async function profileAt(path: string | undefined): Promise<ComposeQuery['profile']> {
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
  const schema = await readSchema(dirname(defaultCatalogPath(import.meta.url)), 'vpeffectiveprofile.v1.schema.json');
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
    case 'browse':
      return catalogBrowse(catalog, instructions);
    case 'search': {
      const query: SearchQuery = {};
      const capabilityTags = commaList(flags, '--capability');
      const patternTags = commaList(flags, '--pattern');
      const roles = commaList(flags, '--roles');
      const instructionIds = commaList(flags, '--id');
      const products = commaList(flags, '--product');
      const conditions = commaList(flags, '--condition');
      const instructionForms = repeatedFacetValues<InstructionForm>(flags, '--form', isInstructionForm);
      const domains = repeatedFacetValues<InstructionDomain>(flags, '--domain', isInstructionDomain);
      const classificationStatuses = repeatedFacetValues<ClassificationStatus>(flags, '--classification-status', isClassificationStatus);
      if (capabilityTags !== undefined) query.capability_tags = capabilityTags;
      if (patternTags !== undefined) query.pattern_tags = patternTags;
      if (instructionIds !== undefined) query.instruction_ids = instructionIds;
      if (roles !== undefined) query.roles = roles;
      if (products !== undefined) query.products = products;
      if (conditions !== undefined) query.conditions = conditions;
      if (instructionForms !== undefined) query.instruction_forms = instructionForms;
      if (domains !== undefined) query.domains = domains;
      if (classificationStatuses !== undefined) query.classification_statuses = classificationStatuses;
      return { results: catalogSearch(catalog, instructions, query) };
    }
    case 'get':
      return { instruction: catalogGet(catalog, instructions, required(flags, '--id')) };
    case 'compose': {
      const profile = await profileAt(one(flags, '--profile'));
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
    if (parsed.command === 'findings') {
      const result = await dispatchFindings(parsed.subcommand, parsed.flags);
      output.stdout(`${JSON.stringify(result)}\n`);
      return 0;
    }
    const command = parsed.command;
    const catalogPath = one(parsed.flags, '--catalog') ?? defaultCatalogPath(import.meta.url);
    const result = await dispatch(command, parsed.flags, catalogPath);
    output.stdout(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (error) {
    const payload = error instanceof FindingsCliError
      ? { code: error.code, message: error.message, details: {} }
      : error instanceof CatalogError
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
