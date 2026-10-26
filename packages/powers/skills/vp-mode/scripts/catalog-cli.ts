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
  catalogFindTags,
  catalogGet,
  catalogSearch,
  catalogSearchWithProfile,
  catalogTags,
  decisionEvaluate,
  loadCatalog,
  loadInstructions,
  readSchema,
} from './catalog.ts';
import type { Catalog, ComposedBundle, ComposeQuery, EffectiveProfile, LoadedInstruction, SearchQuery } from './catalog.ts';
import { validateAgainstSchema } from './schema.ts';
import {
  INSTRUCTION_DOMAINS,
  INSTRUCTION_FORMS,
  INSTRUCTION_FORM_DESCRIPTIONS,
  isClassificationStatus,
  isInstructionDomain,
  isInstructionForm,
} from './instruction-facets.ts';
import type { ClassificationStatus, InstructionDomain, InstructionForm } from './instruction-facets.ts';

const commandNames = ['tags', 'search', 'get', 'compose', 'evaluate', 'browse', 'findings'] as const;
type Command = typeof commandNames[number];
type FindingsOperation = 'append' | 'candidates';
type ParsedArgs = { kind: 'help'; command?: Command }
  | { kind: 'run'; command: Exclude<Command, 'findings'>; flags: Map<string, string[]> }
  | { kind: 'findings'; subcommand: FindingsOperation; flags: Map<string, string[]> };
type CliOutput = { stdout: (text: string) => void; stderr: (text: string) => void };
type FlagArity = 'scalar' | 'list' | 'repeat-list' | 'switch';
type FlagDefinition = { arity: FlagArity; value?: string; description: string };
type CommandDefinition = { description: string; flags: Record<string, FlagDefinition>; examples: readonly string[] };
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

const commandDefinitions: Record<Command, CommandDefinition> = {
  tags: {
    description: 'Search canonical capability/pattern tags and aliases; omitting --query lists the vocabulary.',
    flags: {
      '--catalog': { arity: 'scalar', value: 'PATH', description: 'Use this exact catalog snapshot.' },
      '--query': { arity: 'list', value: 'TERM', description: 'Literal words; ANY by default.' },
      '--match': { arity: 'scalar', value: 'any|all', description: 'Require any or all query tokens.' },
      '--limit': { arity: 'scalar', value: 'N', description: 'Return at most N rows.' },
      '--offset': { arity: 'scalar', value: 'N', description: 'Skip N rows after deduplication.' },
    },
    examples: ['tags --query pr review', 'tags --query tdd --match all'],
  },
  search: {
    description: 'List active instruction candidates by selectors; without --profile this is discovery only.',
    flags: {
      '--catalog': { arity: 'scalar', value: 'PATH', description: 'Use this exact catalog snapshot.' },
      '--capability': { arity: 'list', value: 'TAG', description: 'OR within capability tags.' },
      '--pattern': { arity: 'list', value: 'TAG', description: 'OR within pattern tags.' },
      '--id': { arity: 'list', value: 'ID', description: 'Restrict to instruction IDs.' },
      '--roles': { arity: 'list', value: 'ROLE', description: 'Filter roles; empty instruction role lists remain universal.' },
      '--product': { arity: 'list', value: 'PRODUCT', description: 'Filter products.' },
      '--condition': { arity: 'list', value: 'TOKEN', description: 'Filter applicability conditions.' },
      '--form': { arity: 'list', value: 'FORM', description: 'OR within supported instruction forms.' },
      '--domain': { arity: 'list', value: 'DOMAIN', description: 'OR within supported domains.' },
      '--classification-status': { arity: 'list', value: 'STATUS', description: 'Select classified or unclassified records.' },
      '--profile': { arity: 'scalar', value: 'PATH', description: 'Filter to the current resolved effective profile.' },
      '--limit': { arity: 'scalar', value: 'N', description: 'Return at most N rows.' },
      '--offset': { arity: 'scalar', value: 'N', description: 'Skip N rows after deduplication.' },
    },
    examples: ['search --capability test-design acceptance-design', 'search --domain engineering operations --form procedure checklist'],
  },
  get: {
    description: 'Compose required instructions with dependencies and print their source bodies and obligations as text.',
    flags: {
      '--catalog': { arity: 'scalar', value: 'PATH', description: 'Use this exact catalog snapshot.' },
      '--id': { arity: 'list', value: 'ID', description: 'Required instruction IDs; all must compose.' },
      '--profile': { arity: 'scalar', value: 'PATH', description: 'Required effective profile from this snapshot.' },
    },
    examples: ['get --id alpha beta --profile .tmp/effective-profile.json'],
  },
  compose: {
    description: 'Compose checked instructions and return the existing structured JSON bundle.',
    flags: {
      '--catalog': { arity: 'scalar', value: 'PATH', description: 'Use this exact catalog snapshot.' },
      '--capability': { arity: 'list', value: 'TAG', description: 'OR within capability tags.' },
      '--pattern': { arity: 'list', value: 'TAG', description: 'OR within pattern tags.' },
      '--id': { arity: 'list', value: 'ID', description: 'Restrict candidate IDs.' },
      '--required': { arity: 'list', value: 'ID', description: 'Require these instruction IDs.' },
      '--role': { arity: 'scalar', value: 'ROLE', description: 'Set compose execution context.' },
      '--roles': { arity: 'list', value: 'ROLE', description: 'Filter instruction roles; distinct from --role.' },
      '--product': { arity: 'list', value: 'PRODUCT', description: 'Filter products.' },
      '--condition': { arity: 'list', value: 'TOKEN', description: 'Filter applicability conditions.' },
      '--profile': { arity: 'scalar', value: 'PATH', description: 'Use a resolved effective profile from this snapshot.' },
      '--json': { arity: 'switch', description: 'Accepted; JSON remains the default output.' },
    },
    examples: ['compose --required alpha --role engineer'],
  },
  evaluate: {
    description: 'Evaluate caller-supplied candidates and return the existing structured JSON result.',
    flags: {
      '--catalog': { arity: 'scalar', value: 'PATH', description: 'Use this exact catalog snapshot.' },
      '--operation': { arity: 'scalar', value: 'TEXT', description: 'Required operation description.' },
      '--context': { arity: 'scalar', value: 'TEXT', description: 'Optional context.' },
      '--product': { arity: 'scalar', value: 'PRODUCT', description: 'Optional product.' },
      '--tag': { arity: 'repeat-list', value: 'TAG', description: 'Repeat or provide several tags.' },
      '--candidate': { arity: 'repeat-list', value: 'ID', description: 'Repeat or provide several candidate IDs.' },
      '--json': { arity: 'switch', description: 'Accepted; JSON remains the default output.' },
    },
    examples: ['evaluate --operation plan --candidate alpha beta --tag tdd'],
  },
  browse: {
    description: 'Navigate current domain/form groups and the unclassified group.',
    flags: {
      '--catalog': { arity: 'scalar', value: 'PATH', description: 'Use this exact catalog snapshot.' },
      '--axis': { arity: 'scalar', value: 'domain|form', description: 'Show one facet axis; default shows both.' },
      '--limit': { arity: 'scalar', value: 'N', description: 'Return at most N rows.' },
      '--offset': { arity: 'scalar', value: 'N', description: 'Skip N rows after deduplication.' },
    },
    examples: ['browse --axis domain', 'browse --axis form'],
  },
  findings: {
    description: 'Append or query the existing findings JSON store.',
    flags: {
      '--store': { arity: 'scalar', value: 'PATH', description: 'Required absolute findings-store path.' },
      '--event-file': { arity: 'scalar', value: 'PATH', description: 'Required absolute input-event path.' },
    },
    examples: ['findings append --store PATH --event-file EVENT.json', 'findings candidates --store PATH --event-file EVENT.json'],
  },
} satisfies Record<Command, CommandDefinition>;

const helpFlag = { description: 'Show command help without loading catalog or instruction files; supplied arguments still validate.' };
const usage = 'usage: bun catalog-cli.ts <command> [flags]; run --help or <command> --help';

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

function isCommand(value: string): value is Command {
  return Object.prototype.hasOwnProperty.call(commandDefinitions, value);
}

function flagDefinition(command: Command, flag: string): FlagDefinition {
  const definition = commandDefinitions[command].flags[flag];
  if (definition !== undefined) return definition;
  const knownElsewhere = Object.values(commandDefinitions).some((item) => Object.prototype.hasOwnProperty.call(item.flags, flag));
  if (knownElsewhere) throw invalid(`flag ${flag} is not valid for ${command}`, { command, flag });
  if (command === 'findings') throw invalid('unknown findings flag');
  throw invalid(`unknown flag ${flag}`, { flag });
}

function parseArgs(argv: string[]): ParsedArgs {
  if (argv.length === 1 && argv[0] === '--help') return { kind: 'help' };
  const commandName = argv[0] ?? '';
  if (commandName === '') throw invalid('command is required', { usage });
  if (!isCommand(commandName)) throw invalid(`unknown command ${commandName}`, { command: commandName, usage });
  const command = commandName;
  if (argv.slice(1).includes('--help')) {
    if (argv.slice(1).filter((argument) => argument === '--help').length > 1) throw invalid('flag --help may only be supplied once', { flag: '--help' });
    const supplied = argv.filter(argument => argument !== '--help');
    if (supplied.length > 1) parseArgs(supplied);
    return { kind: 'help', command };
  }
  const findingsCommand = command === 'findings';
  const hasFindingsSubcommand = findingsCommand && argv[1] !== undefined && !argv[1].startsWith('--');
  const subcommand = hasFindingsSubcommand ? argv[1] : undefined;
  if (findingsCommand && hasFindingsSubcommand && subcommand !== 'append' && subcommand !== 'candidates') {
    throw invalid('unknown findings operation', { command, usage });
  }
  const firstFlagIndex = hasFindingsSubcommand ? 2 : 1;
  const flags = new Map<string, string[]>();
  for (let index = firstFlagIndex; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === undefined || !flag.startsWith('--')) {
      if (findingsCommand) throw invalid('unexpected findings argument');
      throw invalid(`unexpected argument ${flag ?? ''}`, { argument: flag });
    }
    const definition = flagDefinition(command, flag);
    if (definition.arity !== 'repeat-list' && flags.has(flag)) throw invalid(`flag ${flag} may only be supplied once`, { flag });
    if (definition.arity === 'switch') {
      flags.set(flag, []);
      continue;
    }
    const values: string[] = [];
    if (definition.arity === 'scalar') {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) throw invalid(`missing value for ${flag}`, { flag });
      values.push(value);
      index += 1;
    } else {
      while (argv[index + 1] !== undefined && !argv[index + 1]?.startsWith('--')) {
        const value = argv[index + 1];
        if (value === undefined) break;
        values.push(value);
        index += 1;
      }
      if (values.length === 0) throw invalid(`missing value for ${flag}`, { flag });
    }
    flags.set(flag, [...(flags.get(flag) ?? []), ...values]);
  }
  validateStaticFlags(command, flags);
  if (command === 'findings') {
    if (subcommand !== 'append' && subcommand !== 'candidates') throw invalid('unknown findings operation', { command, usage });
    return { kind: 'findings', subcommand, flags };
  }
  return { kind: 'run', command, flags };
}

function renderHelp(command?: Command): string {
  const commands = command === undefined ? commandNames : [command];
  const lines = ['usage: bun catalog-cli.ts <command> [flags]', 'Use --help or <command> --help.'];
  for (const name of commands) {
    const definition = commandDefinitions[name];
    lines.push('', `${name}: ${definition.description}`);
    if (name === 'tags' || name === 'search' || name === 'browse') {
      lines.push('  output: ID<TAB>description; escaped field controls; dedup before ordering and pagination.');
      lines.push(name === 'tags' ? '  dedup identity: dimension and canonical tag.' : name === 'search' ? '  dedup identity: selected catalog and instruction ID.' : '  dedup identity: dimension and value; includes unclassified.');
      lines.push('  errors: nonzero exit with empty stdout; diagnostics and pagination use stderr.');
    } else if (name === 'get') {
      lines.push('  output: instruction text only, with missing source applicability and output obligations.');
      lines.push('  dedup identity: selected catalog and instruction ID; includes required dependency closure.');
      lines.push('  errors: nonzero exit with empty stdout for any ID, source, profile, conflict or bundle-limit failure.');
    }
    for (const [flag, spec] of Object.entries(definition.flags)) {
      const value = spec.arity === 'switch' ? '' : ` <${spec.value ?? 'VALUE'}${spec.arity === 'list' || spec.arity === 'repeat-list' ? '...' : ''}>`;
      const invocation = name === 'findings' ? 'findings <append|candidates>' : name;
      lines.push(`  ${invocation} ${flag}${value}: ${spec.description}`);
    }
    lines.push(`  --help: ${helpFlag.description}`);
    lines.push('  examples:');
    for (const example of definition.examples) lines.push(`    ${example}`);
    if (name === 'browse') {
      lines.push(`  axes: domain (${INSTRUCTION_DOMAINS.join(', ')}); form (${INSTRUCTION_FORMS.join(', ')}); unclassified is included.`);
    } else if (name === 'search') {
      lines.push(`  facet values: domains (${INSTRUCTION_DOMAINS.join(', ')}); forms (${INSTRUCTION_FORMS.join(', ')}); status (classified, unclassified).`);
    }
  }
  return `${lines.join('\n')}\n`;
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

function listValues(flags: Map<string, string[]>, name: string): string[] | undefined {
  const values = flags.get(name);
  if (values === undefined) return undefined;
  const parsed = values.flatMap((value) => value.split(',')).map((value) => value.trim());
  if (parsed.some((value) => value === '')) throw invalid(`flag ${name} must contain non-empty values`, { flag: name });
  return [...new Set(parsed)];
}

function allowedListValues<T extends string>(
  flags: Map<string, string[]>,
  name: string,
  isAllowed: (value: unknown) => value is T,
): T[] | undefined {
  const values = listValues(flags, name);
  if (values === undefined) return undefined;
  const parsed: T[] = [];
  for (const value of values) {
    if (!isAllowed(value)) throw invalid(`flag ${name} contains an unsupported value`, { flag: name, value });
    parsed.push(value);
  }
  return parsed;
}

function nonnegativeInteger(flags: Map<string, string[]>, name: string, fallback: number): number {
  const value = one(flags, name);
  if (value === undefined) return fallback;
  if (!/^\d+$/u.test(value)) throw invalid(`flag ${name} must be a non-negative integer`, { flag: name, value });
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw invalid(`flag ${name} must be a non-negative integer`, { flag: name, value });
  return parsed;
}

function tagMatch(flags: Map<string, string[]>): 'any' | 'all' {
  const value = one(flags, '--match');
  if (value !== undefined && value !== 'any' && value !== 'all') throw invalid('flag --match must be any or all', { flag: '--match', value });
  if (value !== undefined && !flags.has('--query')) throw invalid('flag --match requires --query', { flag: '--match' });
  return value ?? 'any';
}

function browseAxis(flags: Map<string, string[]>): 'domain' | 'form' | undefined {
  const value = one(flags, '--axis');
  if (value !== undefined && value !== 'domain' && value !== 'form') throw invalid('flag --axis must be domain or form', { flag: '--axis', value });
  return value;
}

function validateStaticFlags(command: Command, flags: Map<string, string[]>): void {
  for (const [name, definition] of Object.entries(commandDefinitions[command].flags)) {
    if (definition.arity === 'list' || definition.arity === 'repeat-list') listValues(flags, name);
  }
  if (flags.has('--limit')) nonnegativeInteger(flags, '--limit', 0);
  if (flags.has('--offset')) nonnegativeInteger(flags, '--offset', 0);
  if (command === 'tags') tagMatch(flags);
  if (command === 'browse') browseAxis(flags);
  if (command === 'search') {
    allowedListValues(flags, '--form', isInstructionForm);
    allowedListValues(flags, '--domain', isInstructionDomain);
    allowedListValues(flags, '--classification-status', isClassificationStatus);
  }
}

type CompactRow = { id: string; description: string };
type CompactResult = { kind: 'compact'; text: string; pagination?: string };
type JsonResult = { kind: 'json'; value: unknown };
type TextResult = { kind: 'text'; text: string };
type DispatchResult = CompactResult | JsonResult | TextResult;

function compactRows(rows: CompactRow[], flags: Map<string, string[]>): CompactResult {
  const offset = nonnegativeInteger(flags, '--offset', 0);
  const limit = flags.has('--limit') ? nonnegativeInteger(flags, '--limit', 0) : undefined;
  const page = rows.slice(offset, limit === undefined ? undefined : offset + limit);
  const text = page.map((row) => `${escapeField(row.id)}\t${escapeField(row.description)}`).join('\n');
  const hasPagination = flags.has('--limit') || flags.has('--offset');
  const remaining = Math.max(0, rows.length - offset - page.length);
  return {
    kind: 'compact',
    text,
    ...(hasPagination ? { pagination: `pagination: returned ${page.length}/${rows.length}; ${remaining} remaining after offset ${offset}.` } : {}),
  };
}

function escapeField(value: string): string {
  return value.replace(/\\/gu, '\\\\').replace(/\t/gu, '\\t').replace(/\r/gu, '\\r').replace(/\n/gu, '\\n');
}

function browseRows(result: ReturnType<typeof catalogBrowse>, axis: 'domain' | 'form' | undefined): CompactRow[] {
  const rows: CompactRow[] = [];
  if (axis === undefined || axis === 'domain') {
    for (const group of result.domains) {
      rows.push({ id: `domain:${group.value}`, description: `Domain ${group.value}; ${group.count} active instructions.` });
    }
  }
  if (axis === undefined || axis === 'form') {
    for (const group of result.forms) {
      rows.push({ id: `form:${group.value}`, description: `${INSTRUCTION_FORM_DESCRIPTIONS[group.value]} ${group.count} active instructions.` });
    }
  }
  rows.push({
    id: 'classification_status:unclassified',
    description: `${result.unclassified.count} active instructions are unclassified.`,
  });
  return rows;
}

async function profileAt(path: string, catalogDirectory: string): Promise<EffectiveProfile>;
async function profileAt(path: string | undefined, catalogDirectory: string): Promise<ComposeQuery['profile']>;
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
  return profile as EffectiveProfile;
}

function renderGet(bundle: ComposedBundle, catalog: Catalog, instructions: Map<string, LoadedInstruction>): string {
  const sections = bundle.instructions.map((composed) => {
    const source = catalogGet(catalog, instructions, composed.instruction_id);
    const body = composed.content;
    const bodyLines = new Set(body.split(/\r?\n/u).map(line => line.trim()));
    const obligations: string[] = [];
    const present = (label: string, value: string): boolean => bodyLines.has(value.trim()) || bodyLines.has((label + ': ' + value).trim());
    const appendWhenAbsent = (label: string, value: string): void => {
      if (value.trim() !== '' && !present(label, value)) obligations.push(label + ': ' + value);
    };
    appendWhenAbsent('Applies when', source.conditions.applies_when);
    appendWhenAbsent('Does not apply when', source.conditions.does_not_apply_when);
    appendWhenAbsent('Output type', source.artifact_contract.output_type);
    const requiredData = bodyLines.has('Required data: ' + source.artifact_contract.required_data.join(', ')) ? []
      : source.artifact_contract.required_data.filter(value => value.trim() !== '' && !present('Required data', value));
    if (requiredData.length > 0) obligations.push('Required data: ' + requiredData.join(', '));
    appendWhenAbsent('Verified by', source.artifact_contract.verified_by);
    if (obligations.length === 0) return body;
    return body + (body.endsWith('\n') ? '\n' : '\n\n') + obligations.join('\n');
  });
  return sections.reduce((output, section) => output + (output === '' ? '' : output.endsWith('\n') ? '\n' : '\n\n') + section, '');
}

async function dispatch(command: Exclude<Command, 'findings'>, flags: Map<string, string[]>, catalogPath: string): Promise<DispatchResult> {
  const catalog = await loadCatalog(catalogPath);
  if (command === 'tags') {
    const terms = listValues(flags, '--query');
    const match = tagMatch(flags);
    const entries = terms === undefined
      ? catalogTags(catalog)
      : undefined;
    const rows: CompactRow[] = terms === undefined
      ? [
        ...(entries?.capability.map(({ tag, description }) => ({ id: `capability:${tag}`, description })) ?? []),
        ...(entries?.pattern.map(({ tag, description }) => ({ id: `pattern:${tag}`, description })) ?? []),
      ]
      : catalogFindTags(catalog, terms, match).map(({ dimension, tag, description }) => ({ id: `${dimension}:${tag}`, description }));
    return compactRows(rows, flags);
  }
  const instructions = await loadInstructions(catalog, dirname(resolve(catalogPath)));
  switch (command) {
    case 'browse': {
      const axis = browseAxis(flags);
      const rows = browseRows(catalogBrowse(catalog, instructions), axis);
      return compactRows(rows, flags);
    }
    case 'search': {
      const query: SearchQuery = {};
      const capabilityTags = listValues(flags, '--capability');
      const patternTags = listValues(flags, '--pattern');
      const roles = listValues(flags, '--roles');
      const instructionIds = listValues(flags, '--id');
      const products = listValues(flags, '--product');
      const conditions = listValues(flags, '--condition');
      const instructionForms = allowedListValues<InstructionForm>(flags, '--form', isInstructionForm);
      const domains = allowedListValues<InstructionDomain>(flags, '--domain', isInstructionDomain);
      const classificationStatuses = allowedListValues<ClassificationStatus>(flags, '--classification-status', isClassificationStatus);
      if (capabilityTags !== undefined) query.capability_tags = capabilityTags;
      if (patternTags !== undefined) query.pattern_tags = patternTags;
      if (instructionIds !== undefined) query.instruction_ids = instructionIds;
      if (roles !== undefined) query.roles = roles;
      if (products !== undefined) query.products = products;
      if (conditions !== undefined) query.conditions = conditions;
      if (instructionForms !== undefined) query.instruction_forms = instructionForms;
      if (domains !== undefined) query.domains = domains;
      if (classificationStatuses !== undefined) query.classification_statuses = classificationStatuses;
      const profile = await profileAt(one(flags, '--profile'), dirname(resolve(catalogPath)));
      const matches = profile === undefined
        ? catalogSearch(catalog, instructions, query)
        : catalogSearchWithProfile(catalog, instructions, query, profile);
      const rows = matches.map(({ instruction_id, summary }) => ({ id: instruction_id, description: summary }));
      return compactRows(rows, flags);
    }
    case 'get': {
      const ids = listValues(flags, '--id');
      if (ids === undefined) throw invalid('missing required flag --id', { flag: '--id' });
      const profile = await profileAt(required(flags, '--profile'), dirname(resolve(catalogPath)));
      const bundle = catalogCompose(catalog, instructions, { required_ids: ids, profile });
      return { kind: 'text', text: renderGet(bundle, catalog, instructions) };
    }
    case 'compose': {
      const profile = await profileAt(one(flags, '--profile'), dirname(resolve(catalogPath)));
      const query: ComposeQuery = {};
      const capabilityTags = listValues(flags, '--capability');
      const patternTags = listValues(flags, '--pattern');
      const instructionIds = listValues(flags, '--id');
      const requiredIds = listValues(flags, '--required');
      const role = one(flags, '--role');
      const roles = listValues(flags, '--roles');
      const products = listValues(flags, '--product');
      const conditions = listValues(flags, '--condition');
      if (capabilityTags !== undefined) query.capability_tags = capabilityTags;
      if (patternTags !== undefined) query.pattern_tags = patternTags;
      if (instructionIds !== undefined) query.instruction_ids = instructionIds;
      if (requiredIds !== undefined) query.required_ids = requiredIds;
      if (role !== undefined) query.role = role;
      if (roles !== undefined) query.roles = roles;
      if (products !== undefined) query.products = products;
      if (conditions !== undefined) query.conditions = conditions;
      if (profile !== undefined) query.profile = profile;
      return { kind: 'json', value: catalogCompose(catalog, instructions, query) };
    }
    case 'evaluate':
      {
        const tags = listValues(flags, '--tag');
        return { kind: 'json', value: decisionEvaluate(catalog, instructions, {
          operation: required(flags, '--operation'),
          candidates: listValues(flags, '--candidate') ?? [],
          ...(one(flags, '--product') === undefined ? {} : { product: one(flags, '--product') as string }),
          ...(one(flags, '--context') === undefined ? {} : { context: one(flags, '--context') as string }),
          ...(tags === undefined ? {} : { tags }),
        }) };
      }
  }
}

async function main(argv: string[], output: CliOutput): Promise<number> {
  try {
    const parsed = parseArgs(argv);
    if (parsed.kind === 'help') {
      output.stdout(renderHelp(parsed.command));
      return 0;
    }
    if (parsed.kind === 'findings') {
      const result = await dispatchFindings(parsed.subcommand, parsed.flags);
      output.stdout(`${JSON.stringify(result)}\n`);
      return 0;
    }
    const command = parsed.command;
    const catalogPath = one(parsed.flags, '--catalog') ?? defaultCatalogPath(import.meta.url);
    const result = await dispatch(command, parsed.flags, catalogPath);
    if (result.kind === 'compact') {
      if (result.pagination !== undefined) output.stderr(`${result.pagination}\n`);
      if (result.text !== '') output.stdout(`${result.text}\n`);
      return 0;
    }
    if (result.kind === 'text') {
      if (result.text !== '') output.stdout(result.text + '\n');
      return 0;
    }
    output.stdout(`${JSON.stringify(result.value)}\n`);
    return 0;
  } catch (error) {
    if (argv[0] === 'tags' || argv[0] === 'search' || argv[0] === 'browse' || argv[0] === 'get') {
      output.stderr(`${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }
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
