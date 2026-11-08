import { cliCommandContracts } from './cli-command-contracts.ts';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeProjectFromBundle } from './init-core.ts';
import { readCliErrorProperty } from './cli-error-properties.ts';
import {
  initializationRequestForSetup,
  mergeSetupInput,
  readSetupInput,
  resolveCliSetup,
  SetupInputError,
  setupExitCode,
} from './init-cli-input.ts';
import type { SetupPromptPort } from './init-prompt.ts';

type InitializationRequest = Parameters<typeof initializeProjectFromBundle>[0];
type InitOption = (typeof cliCommandContracts.init.options)[number];
type InitScalarOption = Extract<InitOption, { arity: 1 }>['name'];
interface InitOptions {
  projects: string[];
  reconcileExisting?: boolean;
  '--project-root'?: string;
  '--repository'?: string;
  '--product-model'?: string;
  '--input'?: string;
}
interface InitIo {
  log(message: string): unknown;
  error(message: unknown): unknown;
}
type InitExit = Pick<NodeJS.Process, 'exitCode'>;
type InitDelegate = (args: string[]) => number;
type InitInitializer = (request: InitializationRequest) => unknown;

const isBunRuntime = typeof Bun !== 'undefined';
const bundleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function initializeProject(
  request: InitializationRequest,
): Promise<Awaited<ReturnType<typeof initializeProjectFromBundle>>> {
  return initializeProjectFromBundle(request, bundleRoot);
}

const usage = `Usage: ${cliCommandContracts.init.syntax}`;
const initScalarOptions: ReadonlySet<string> = new Set(
  cliCommandContracts.init.options.filter((option) => option.arity === 1).map((option) => option.name),
);
const initRepeatableOptions: ReadonlySet<string> = new Set(
  cliCommandContracts.init.options
    .filter((option: { name: string; repeatable?: boolean }) => option.repeatable)
    .map((option) => option.name),
);
const initHelpOption = cliCommandContracts.init.options.find((option) => option.arity === 0)?.name;

function isValidInitOption(key: string, value: string, values: InitOptions): key is InitScalarOption {
  const duplicate = !initRepeatableOptions.has(key) && Object.hasOwn(values, key);
  return initScalarOptions.has(key) && !!value && !duplicate;
}

function recordOption(values: InitOptions, key: InitScalarOption, value: string): void {
  if (key === '--project') values.projects.push(value);
  else values[key] = value;
}

function parseInitArguments(args: string[]): InitOptions {
  const values: InitOptions = { projects: [] };
  for (let index = 0; index < args.length;) {
    const key = args[index];
    if (key === initHelpOption) {
      if (values.reconcileExisting) throw new Error(usage);
      values.reconcileExisting = true;
      index += 1;
      continue;
    }
    const pair = initOptionPair(args, index, values);
    recordOption(values, pair.key, pair.value);
    index += 2;
  }
  return values;
}

function legacyInitializationRequest(values: InitOptions): InitializationRequest {
  const projectRoot = requiredInitOption(values['--project-root']);
  const repository = requiredInitOption(values['--repository']);
  if (!values.projects.length) throw new Error('Projects must be a non-empty explicit project mapping set');
  return {
    projectRoot,
    repository,
    projectMappings: values.projects,
    ...(values.reconcileExisting ? { reconcileExisting: true } : {}),
  };
}

function initOptionPair(args: string[], index: number, values: InitOptions): { key: InitScalarOption; value: string } {
  const key = args[index];
  const value = args[index + 1];
  if (typeof key !== 'string' || typeof value !== 'string' || !isValidInitOption(key, value, values))
    throw new Error(usage);
  return { key, value };
}

function requiredInitOption(value: unknown): string {
  if (typeof value !== 'string') throw new Error(usage);
  return value;
}

function reportInitFailure(error: unknown, io: InitIo, exit: InitExit, preserveExitCode: boolean): void {
  io.error(readCliErrorProperty(error, 'message'));
  const code = preserveExitCode ? readCliErrorProperty(error, 'exitCode') : 1;
  exit.exitCode = preserveExitCode && typeof code === 'number' ? code : 1;
}

interface RunCliOptions {
  args: string[];
  io: InitIo;
  exit: InitExit;
}

async function runNodeCli({ args, io, exit, delegate }: RunNodeCliOptions): Promise<void> {
  try {
    const runPinnedBun = delegate ?? (await import('./bun.ts')).runPinnedBun;
    exit.exitCode = runPinnedBun([fileURLToPath(import.meta.url), ...args]);
  } catch (error: unknown) {
    reportInitFailure(error, io, exit, true);
  }
}

interface RunNodeCliOptions extends RunCliOptions {
  delegate?: InitDelegate | undefined;
}

interface RunBunCliOptions extends RunCliOptions {
  initialize: InitInitializer;
  setupPort?: SetupPromptPort | undefined;
}

function setupFile(values: InitOptions): string | undefined {
  if (values['--product-model'] !== undefined && values['--input'] !== undefined) {
    throw new SetupInputError('explicit_value_changed', '/input', 'Choose either --product-model or --input.');
  }
  return values['--product-model'] ?? values['--input'];
}

async function runBunCli({ args, io, exit, initialize, setupPort }: RunBunCliOptions): Promise<void> {
  try {
    const values = parseInitArguments(args),
      file = setupFile(values);
    if (values['--repository'] !== undefined || values.projects.length) {
      if (file !== undefined)
        throw new SetupInputError(
          'explicit_value_changed',
          '/model',
          'Do not mix legacy repository/project flags with a model input file.',
        );
      io.log(JSON.stringify(await initialize(legacyInitializationRequest(values))));
      return;
    }
    const draft = mergeSetupInput(file === undefined ? {} : readSetupInput(file), {
      projectRoot: values['--project-root'],
      reconcile: values.reconcileExisting,
    });
    const resolved = await resolveCliSetup(draft, setupPort);
    if (resolved.status !== 'ready') {
      io.log(JSON.stringify(resolved));
      exit.exitCode = setupExitCode(resolved) ?? 1;
      return;
    }
    io.log(JSON.stringify(await initialize(initializationRequestForSetup(resolved.input))));
  } catch (error: unknown) {
    if (error instanceof SetupInputError) {
      io.log(JSON.stringify(error.result));
      exit.exitCode = 1;
    } else reportInitFailure(error, io, exit, false);
  }
}

export interface InitMainOptions {
  isMain?: boolean;
  bunRuntime?: boolean;
  args?: string[];
  io?: InitIo;
  exit?: InitExit;
  initialize?: InitInitializer;
  delegate?: InitDelegate;
  setupPort?: SetupPromptPort;
}

export async function main({
  isMain = import.meta.main,
  bunRuntime = isBunRuntime,
  args = process.argv.slice(2),
  io = console,
  exit = process,
  initialize = initializeProject,
  delegate,
  setupPort,
}: InitMainOptions = {}): Promise<void> {
  if (!isMain) return;
  if (args[0] === '--help') {
    await printHelp(args, io, 'init');
    return;
  }
  if (!bunRuntime) {
    await runNodeCli({ args, io, exit, delegate });
    return;
  }
  await runBunCli({ args, io, exit, initialize, setupPort });
}

async function printHelp(args: string[], io: InitIo, command: string): Promise<void> {
  const { cliMetadataResult } = await import('./cli-metadata.ts');
  io.log(JSON.stringify(cliMetadataResult([command, ...args], {})));
}

await main();
