import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { lstat } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendFindingEvent, findFindingCandidates } from './findings.ts';
import { appendArtifactEvent, indexArtifacts, verifyArtifact } from './artifacts.ts';
import type { SemanticJudgment } from './artifacts.ts';
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
  parseApproachSelectors,
  evaluateApproaches,
  tagTokens,
  stemToken,
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

const commandNames = ['tags', 'search', 'explain', 'get', 'compose', 'evaluate', 'browse', 'findings', 'artifacts'] as const;
type Command = typeof commandNames[number];
type FindingsOperation = 'append' | 'candidates';
type ArtifactsOperation = 'append' | 'index' | 'verify';
type ParsedArgs = { kind: 'help'; command?: Command }
  | { kind: 'run'; command: Exclude<Command, 'findings' | 'artifacts'>; flags: Map<string, string[]> }
  | { kind: 'findings'; subcommand: FindingsOperation; flags: Map<string, string[]> }
  | { kind: 'artifacts'; subcommand: ArtifactsOperation; flags: Map<string, string[]> };
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

type ArtifactErrorCode =
  | 'ARTIFACT_INVALID'
  | 'ARTIFACT_PATH_INVALID'
  | 'ARTIFACT_STORE_MISSING'
  | 'ARTIFACT_STORE_INVALID'
  | 'ARTIFACT_NOT_FOUND'
  | 'ARTIFACT_REVISION_CONFLICT'
  | 'ARTIFACT_ROOT_INVALID'
  | 'ARTIFACT_OPERATION_FAILED';

class ArtifactsCliError extends Error {
  readonly code: ArtifactErrorCode;

  constructor(code: ArtifactErrorCode) {
    super(code === 'ARTIFACT_OPERATION_FAILED' ? 'artifacts operation failed' : code);
    this.name = 'ArtifactsCliError';
    this.code = code;
  }
}

const artifactErrorCodes = new Set<ArtifactErrorCode>([
  'ARTIFACT_INVALID', 'ARTIFACT_PATH_INVALID', 'ARTIFACT_STORE_MISSING', 'ARTIFACT_STORE_INVALID',
  'ARTIFACT_NOT_FOUND', 'ARTIFACT_REVISION_CONFLICT', 'ARTIFACT_ROOT_INVALID',
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
      '--for': { arity: 'list', value: 'TERM', description: 'Resolve a capability and its most frequent pattern from free-text terms, then search.' },
      '--id': { arity: 'list', value: 'ID', description: 'Restrict to instruction IDs.' },
      '--roles': { arity: 'list', value: 'ROLE', description: 'Filter roles; empty instruction role lists remain universal.' },
      '--product': { arity: 'list', value: 'PRODUCT', description: 'Filter products.' },
      '--condition': { arity: 'list', value: 'TOKEN', description: 'Filter applicability conditions.' },
      '--form': { arity: 'list', value: 'FORM', description: 'OR within supported instruction forms.' },
      '--domain': { arity: 'list', value: 'DOMAIN', description: 'OR within supported domains.' },
      '--classification-status': { arity: 'list', value: 'STATUS', description: 'Select classified or unclassified records.' },
      '--approach': { arity: 'repeat-list', value: 'DIMENSION=VALUE', description: 'Select one value per approach dimension.' },
      '--profile': { arity: 'scalar', value: 'PATH', description: 'Filter to the current resolved effective profile.' },
      '--limit': { arity: 'scalar', value: 'N', description: 'Return at most N rows.' },
      '--offset': { arity: 'scalar', value: 'N', description: 'Skip N rows after deduplication.' },
      '--all': { arity: 'switch', description: 'Return every row instead of the default first page of 10.' },
    },
    examples: ['search --capability test-design acceptance-design', 'search --domain engineering operations --form procedure checklist'],
  },
  explain: {
    description: 'Explain approach decisions for discovery candidates; metadata is not authority.',
    flags: {
      '--catalog': { arity: 'scalar', value: 'PATH', description: 'Use this exact catalog snapshot.' },
      '--capability': { arity: 'list', value: 'TAG', description: 'Filter capability tags.' },
      '--pattern': { arity: 'list', value: 'TAG', description: 'Filter pattern tags.' },
      '--id': { arity: 'list', value: 'ID', description: 'Filter instruction IDs.' },
      '--roles': { arity: 'list', value: 'ROLE', description: 'Filter roles.' },
      '--product': { arity: 'list', value: 'PRODUCT', description: 'Filter products.' },
      '--condition': { arity: 'list', value: 'TOKEN', description: 'Filter conditions.' },
      '--form': { arity: 'list', value: 'FORM', description: 'Filter forms.' },
      '--domain': { arity: 'list', value: 'DOMAIN', description: 'Filter domains.' },
      '--classification-status': { arity: 'list', value: 'STATUS', description: 'Filter classification status.' },
      '--approach': { arity: 'repeat-list', value: 'DIMENSION=VALUE', description: 'Select one value per approach dimension.' },
      '--profile': { arity: 'scalar', value: 'PATH', description: 'Use the effective profile.' },
    },
    examples: ['explain --approach execution=solo'],
  },
  get: {
    description: 'Compose required instructions with dependencies and print their source bodies and obligations as text.',
    flags: {
      '--catalog': { arity: 'scalar', value: 'PATH', description: 'Use this exact catalog snapshot.' },
      '--id': { arity: 'list', value: 'ID', description: 'Required instruction IDs; all must compose.' },
      '--approach': { arity: 'repeat-list', value: 'DIMENSION=VALUE', description: 'Select one value per approach dimension.' },
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
      '--approach': { arity: 'repeat-list', value: 'DIMENSION=VALUE', description: 'Select one value per approach dimension.' },
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
      '--approach': { arity: 'repeat-list', value: 'DIMENSION=VALUE', description: 'Select one value per approach dimension.' },
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
  artifacts: {
    description: 'Append, index or verify artifact references and their separate mechanical and semantic checks.',
    flags: {
      '--store': { arity: 'scalar', value: 'PATH', description: 'Required absolute artifacts.jsonl path.' },
      '--event-file': { arity: 'scalar', value: 'PATH', description: 'Required absolute artifact event path for append.' },
      '--id': { arity: 'scalar', value: 'ID', description: 'Artifact ID for verify.' },
      '--root': { arity: 'scalar', value: 'PATH', description: 'Product root that resolves the artifact locator for verify.' },
      '--semantic-file': { arity: 'scalar', value: 'PATH', description: 'Optional absolute semantic judgment path for verify.' },
    },
    examples: ['artifacts append --store PATH --event-file EVENT.json', 'artifacts index --store PATH', 'artifacts verify --store PATH --id VP-6 --root ROOT'],
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
  if (command === 'search' && flag === '--query') {
    throw invalid('flag --query is not valid for search; free-text discovery uses tags --query, search filters by --capability or --pattern', { command, flag });
  }
  const knownElsewhere = Object.values(commandDefinitions).some((item) => Object.prototype.hasOwnProperty.call(item.flags, flag));
  if (knownElsewhere) throw invalid(`flag ${flag} is not valid for ${command}`, { command, flag });
  if (command === 'findings') throw invalid('unknown findings flag');
  if (command === 'artifacts') throw invalid('unknown artifacts flag');
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
  const artifactsCommand = command === 'artifacts';
  const nestedCommand = findingsCommand || artifactsCommand;
  const hasSubcommand = nestedCommand && argv[1] !== undefined && !argv[1].startsWith('--');
  const subcommand = hasSubcommand ? argv[1] : undefined;
  const operations: readonly string[] = findingsCommand ? ['append', 'candidates'] : ['append', 'index', 'verify'];
  if (nestedCommand && hasSubcommand && !operations.includes(subcommand ?? '')) {
    throw invalid(`unknown ${command} operation`, { command, usage });
  }
  const firstFlagIndex = hasSubcommand ? 2 : 1;
  const flags = new Map<string, string[]>();
  for (let index = firstFlagIndex; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === undefined || !flag.startsWith('--')) {
      if (nestedCommand) throw invalid(`unexpected ${command} argument`);
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
  if (command === 'artifacts') {
    if (subcommand !== 'append' && subcommand !== 'index' && subcommand !== 'verify') throw invalid('unknown artifacts operation', { command, usage });
    return { kind: 'artifacts', subcommand, flags };
  }
  return { kind: 'run', command, flags };
}

function renderHelp(command?: Command): string {
  const commands = command === undefined ? commandNames : [command];
  const lines = ['usage: bun catalog-cli.ts <command> [flags]', 'Use --help or <command> --help.'];
  if (command === undefined) {
    lines.push(
      '',
      'workflow:',
      '  1. tags --query "<terms>"                      -> capability:/pattern: matches',
      '  2. search --capability <tag> [--pattern <tag>]  -> candidates, 10 per page',
      '  3. get --id <id...> --profile <path>            -> full text + obligations',
      'notes: search takes bare tags (review-code, not capability:review-code);',
      '       first pass: search --for "<terms>" resolves a capability and its top pattern;',
      '       multi-intent task: one focused --for per intent, 3-6 terms each;',
      '       --offset 20 gets the next page; --all lists every row;',
      '       a page is a sample, not a ranking; page again when an intent is missing.',
    );
  }
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
      const invocation = name === 'findings' ? 'findings <append|candidates>' : name === 'artifacts' ? 'artifacts <append|index|verify>' : name;
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

async function dispatchArtifacts(
  subcommand: ArtifactsOperation,
  flags: Map<string, string[]>,
): Promise<unknown> {
  try {
    const storePath = required(flags, '--store');
    if (subcommand === 'append') return await appendArtifactEvent(storePath, await eventFromFile(required(flags, '--event-file')));
    if (subcommand === 'index') return await indexArtifacts(storePath);
    const semanticPath = one(flags, '--semantic-file');
    const semantic = semanticPath === undefined ? undefined : await eventFromFile(semanticPath) as SemanticJudgment;
    return await verifyArtifact(storePath, required(flags, '--id'), {
      root: required(flags, '--root'),
      ...(semantic === undefined ? {} : { semantic }),
    });
  } catch (error) {
    if (error instanceof CatalogError) throw error;
    if (error instanceof FindingsCliError) throw new ArtifactsCliError(error.code.replace('FINDING_', 'ARTIFACT_') as ArtifactErrorCode);
    if (error instanceof Error && artifactErrorCodes.has(error.message as ArtifactErrorCode)) {
      throw new ArtifactsCliError(error.message as ArtifactErrorCode);
    }
    throw new ArtifactsCliError('ARTIFACT_OPERATION_FAILED');
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

function tagListValues(flags: Map<string, string[]>, name: string, dimension: 'capability' | 'pattern'): string[] | undefined {
  const values = listValues(flags, name);
  if (values === undefined) return undefined;
  return values.map((value) => {
    const match = /^(capability|pattern):(.+)$/u.exec(value);
    if (match === null) return value;
    if (match[1] !== dimension) throw invalid(`flag ${name} expects a ${dimension} tag`, { flag: name, value });
    return match[2] as string;
  });
}

function topPatternFor(instructions: Map<string, LoadedInstruction>, capability: string): string | undefined {
  const counts = new Map<string, number>();
  for (const instruction of instructions.values()) {
    if (!instruction.capability_tags.includes(capability)) continue;
    for (const tag of instruction.pattern_tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0))[0]?.[0];
}

const RESOLVER_STOPWORDS = new Set(['a', 'an', 'the', 'for', 'to', 'of', 'and', 'or', 'with', 'on', 'in', 'by', 'vs', 'versus', 'after', 'before', 'from', 'into', 'over', 'under', 'this', 'that']);

function resolveFor(instructions: Map<string, LoadedInstruction>, terms: readonly string[]): { capability: string; pattern?: string } | undefined {
  const query = [...new Set(terms.flatMap(tagTokens).map(stemToken))].filter((token) => !RESOLVER_STOPWORDS.has(token));
  if (query.length === 0) return undefined;
  const counts = new Map<string, number>();
  const nameSets = new Map<string, Set<string>>();
  for (const instruction of instructions.values()) {
    for (const capability of instruction.capability_tags) {
      counts.set(capability, (counts.get(capability) ?? 0) + 1);
      if (!nameSets.has(capability)) nameSets.set(capability, new Set(tagTokens(capability).map(stemToken)));
    }
  }
  const ranked = [...nameSets.entries()]
    .map(([capability, names]) => ({ capability, names, score: 0 }))
    .filter((item) => query.some((token) => item.names.has(token)));
  const documentFrequency = new Map<string, number>();
  for (const { names } of ranked) for (const token of names) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
  for (const item of ranked) {
    item.score = query.reduce((total, token) => total + (item.names.has(token) ? 1 / (documentFrequency.get(token) ?? 1) : 0), 0);
  }
  ranked.sort((left, right) => right.score - left.score
    || (counts.get(right.capability) ?? 0) - (counts.get(left.capability) ?? 0)
    || (left.capability < right.capability ? -1 : left.capability > right.capability ? 1 : 0));
  const best = ranked[0]?.capability;
  if (best === undefined) return undefined;
  const pattern = topPatternFor(instructions, best);
  return { capability: best, ...(pattern === undefined ? {} : { pattern }) };
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
  if (flags.has('--approach')) parseApproachSelectors(listValues(flags, '--approach'));
  if (command === 'search' || command === 'explain') {
    allowedListValues(flags, '--form', isInstructionForm);
    allowedListValues(flags, '--domain', isInstructionDomain);
    allowedListValues(flags, '--classification-status', isClassificationStatus);
  }
}

type CompactRow = { id: string; description: string };
type CompactResult = { kind: 'compact'; text: string; pagination?: string; notes?: string };
type JsonResult = { kind: 'json'; value: unknown };
type TextResult = { kind: 'text'; text: string; stats?: string };
type DispatchResult = CompactResult | JsonResult | TextResult;

function compactRows(rows: CompactRow[], flags: Map<string, string[]>, defaultLimit?: number, refine?: string): CompactResult {
  const offset = nonnegativeInteger(flags, '--offset', 0);
  const limit = flags.has('--limit') ? nonnegativeInteger(flags, '--limit', 0) : flags.has('--all') ? undefined : defaultLimit;
  const page = rows.slice(offset, limit === undefined ? undefined : offset + limit);
  const text = page.map((row) => `${escapeField(row.id)}\t${escapeField(row.description)}`).join('\n');
  const remaining = Math.max(0, rows.length - offset - page.length);
  const paginated = page.length < rows.length || offset > 0;
  const lines = paginated
    ? [`pagination: showing ${page.length} of ${rows.length}${remaining > 0 ? `; next: --offset ${offset + page.length} (${remaining} remaining; same search, not a new query)` : '; no more rows'}`]
    : [];
  if (remaining > 0 && refine !== undefined) lines.push(refine);
  return {
    kind: 'compact',
    text,
    ...(lines.length > 0 ? { pagination: lines.join('\n') } : {}),
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

async function dispatch(command: Exclude<Command, 'findings' | 'artifacts'>, flags: Map<string, string[]>, catalogPath: string): Promise<DispatchResult> {
  const directory = dirname(resolve(catalogPath));
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../');
  const digest = async (path: string): Promise<string> => createHash('sha256').update(await readFile(path)).digest('hex');
  const bindingPaths: Record<string, string> = command === 'explain' ? {
    catalog_sha256: catalogPath,
    catalog_schema_sha256: resolve(directory, 'config/vpcatalog.v1.schema.json'),
    instruction_schema_sha256: resolve(directory, 'config/vpinstruction.v1.2.schema.json'),
    policy_sha256: resolve(packageRoot, 'config/methodology-profile.json'),
    policy_schema_sha256: resolve(packageRoot, 'config/vpmethodologyprofile.v1.schema.json'),
    ...(one(flags, '--profile') === undefined ? {} : { profile_sha256: required(flags, '--profile'), profile_schema_sha256: resolve(directory, 'config/vpeffectiveprofile.v1.schema.json') }),
  } : {};
  const bindings: Record<string, string> = {};
  for (const [key, path] of Object.entries(bindingPaths)) bindings[key] = await digest(path);
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
      const rows = browseRows(catalogBrowse(catalog, instructions, listValues(flags, '--approach')), axis);
      return compactRows(rows, flags);
    }
    case 'search':
    case 'explain': {
      const query: SearchQuery = {};
      let capabilityTags = tagListValues(flags, '--capability', 'capability');
      let patternTags = tagListValues(flags, '--pattern', 'pattern');
      let resolved: string | undefined;
      const forTerms = listValues(flags, '--for');
      if (forTerms !== undefined) {
        if (forTerms.length > 8) throw invalid('--for accepts at most 8 terms; run one focused --for per intent (3-6 terms)', { terms: forTerms });
        const resolvedTags = resolveFor(instructions, forTerms);
        const capability = capabilityTags?.[0] ?? resolvedTags?.capability;
        if (capability === undefined) throw invalid('no capability matched --for; run tags --query with canonical nouns', { terms: forTerms });
        const pattern = patternTags?.[0] ?? topPatternFor(instructions, capability);
        capabilityTags = capabilityTags ?? [capability];
        if (pattern !== undefined) patternTags = patternTags ?? [pattern];
        resolved = `resolved: capability=${capabilityTags.join(',')}${patternTags === undefined ? '' : ` pattern=${patternTags.join(',')}`} (from --for)`;
      }
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
      const approaches = listValues(flags, '--approach');
      if (command === 'explain') {
        const selectors = parseApproachSelectors(approaches);
        const ordinaryCandidates = catalogSearch(catalog, instructions, query);
        const included = profile === undefined ? ordinaryCandidates : catalogSearchWithProfile(catalog, instructions, { ...query, ...(approaches === undefined ? {} : { approaches }) }, profile);
        const includedIds = new Set(included.map(item => item.instruction_id));
        const candidates = profile === undefined ? ordinaryCandidates : ordinaryCandidates.filter(({ instruction_id }) => {
          const instruction = instructions.get(instruction_id);
          if (instruction === undefined) throw invalid('candidate missing', { instruction_id });
          return includedIds.has(instruction_id) || !evaluateApproaches(instruction, selectors).included;
        });
        for (const [key, path] of Object.entries(bindingPaths)) if (bindings[key] !== await digest(path)) throw invalid('explain input changed during evaluation', { input: key });
        for (const entry of catalog.instructions) if (entry.sha256 !== await digest(resolve(directory, entry.path))) throw invalid('instruction changed during explanation', { instruction_id: entry.instruction_id });
        return { kind: 'json', value: { bindings, selectors, candidates: candidates.map(({ instruction_id }) => {
          const instruction = instructions.get(instruction_id);
          if (instruction === undefined) throw invalid('candidate missing', { instruction_id });
          return { instruction_id, source_sha256: catalog.instructions.find((entry) => entry.instruction_id === instruction_id)?.sha256, body_sha256: createHash('sha256').update(instruction.content, 'utf8').digest('hex'), ...evaluateApproaches(instruction, selectors) };
        }) } };
      }
      if (approaches !== undefined) query.approaches = approaches;
      const matches = profile === undefined
        ? catalogSearch(catalog, instructions, query)
        : catalogSearchWithProfile(catalog, instructions, query, profile);
      const rows = matches.map(({ instruction_id, summary }) => ({ id: instruction_id, description: summary }));
      const compact = compactRows(rows, flags, 20, 'refine: narrow with --pattern <tag> or --query <terms>, or pass --all');
      return resolved === undefined ? compact : { ...compact, notes: resolved };
    }
    case 'get': {
      const ids = listValues(flags, '--id');
      if (ids === undefined) throw invalid('missing required flag --id', { flag: '--id' });
      for (const id of ids) {
        if (instructions.has(id)) continue;
        const dimension = Object.prototype.hasOwnProperty.call(catalog.tag_dictionary.capability, id)
          ? 'capability'
          : Object.prototype.hasOwnProperty.call(catalog.tag_dictionary.pattern, id)
          ? 'pattern'
          : catalog.tag_aliases[id] !== undefined ? 'tag alias' : undefined;
        if (dimension !== undefined) {
          throw invalid(`unknown instruction id: ${id}; ${id} is a ${dimension}, not an instruction`, {
            instruction_id: id,
            hint: `search --query ${id}`,
          });
        }
      }
      const profile = await profileAt(required(flags, '--profile'), dirname(resolve(catalogPath)));
      const approaches = listValues(flags, '--approach');
      const bundle = catalogCompose(catalog, instructions, { required_ids: ids, profile, ...(approaches === undefined ? {} : { approaches }) });
      const bytes = bundle.instructions.reduce((total, instruction) => total + Buffer.byteLength(instruction.content, 'utf8'), 0);
      return {
        kind: 'text',
        text: renderGet(bundle, catalog, instructions),
        stats: `bundle: ${bundle.instructions.length} instructions, ${bytes} of 64000 bytes (max 20 instructions)`,
      };
    }
    case 'compose': {
      const profile = await profileAt(one(flags, '--profile'), dirname(resolve(catalogPath)));
      const query: ComposeQuery = {};
      const approaches = listValues(flags, '--approach');
      if (approaches !== undefined) query.approaches = approaches;
      const capabilityTags = tagListValues(flags, '--capability', 'capability');
      const patternTags = tagListValues(flags, '--pattern', 'pattern');
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
    if (parsed.kind === 'artifacts') {
      const result = await dispatchArtifacts(parsed.subcommand, parsed.flags);
      output.stdout(`${JSON.stringify(result)}\n`);
      return 0;
    }
    const command = parsed.command;
    const catalogPath = one(parsed.flags, '--catalog') ?? defaultCatalogPath(import.meta.url);
    const result = await dispatch(command, parsed.flags, catalogPath);
    if (result.kind === 'compact') {
      if (result.notes !== undefined) output.stderr(`${result.notes}\n`);
      if (result.pagination !== undefined) output.stderr(`${result.pagination}\n`);
      if (result.text !== '') output.stdout(`${result.text}\n`);
      return 0;
    }
    if (result.kind === 'text') {
      if (result.stats !== undefined) output.stderr(`${result.stats}\n`);
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
      : error instanceof ArtifactsCliError
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
