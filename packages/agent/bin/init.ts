import { cliCommandContracts } from './cli-command-contracts.ts';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeProjectFromBundle } from './init-core.ts';
import { readCliErrorProperty } from './cli-error-properties.ts';

type InitializationRequest = Parameters<typeof initializeProjectFromBundle>[0];
interface InitOptions {
  projects: string[];
  reconcileExisting?: boolean;
  '--project-root'?: string;
  '--repository'?: string;
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

export async function initializeProject({
  projectRoot,
  repository,
  projectMappings,
  reconcileExisting = false,
}: InitializationRequest): Promise<Awaited<ReturnType<typeof initializeProjectFromBundle>>> {
  return initializeProjectFromBundle({ projectRoot, repository, projectMappings, reconcileExisting }, bundleRoot);
}

const usage = `Usage: ${cliCommandContracts.init.syntax}`;
const initScalarOptions = new Set(
  cliCommandContracts.init.options.filter((option) => option.arity === 1).map((option) => option.name),
);
const initRepeatableOptions = new Set(
  cliCommandContracts.init.options.filter((option) => option.repeatable).map((option) => option.name),
);
const initHelpOption = cliCommandContracts.init.options.find((option) => option.arity === 0)?.name;

function invalidOption(key: string, value: string, values: InitOptions): boolean {
  const duplicate = !initRepeatableOptions.has(key) && Object.hasOwn(values, key);
  return !initScalarOptions.has(key) || !value || duplicate;
}

function recordOption(values: InitOptions, key: string, value: string): void {
  if (key === '--project') values.projects.push(value);
  else if (key === '--project-root') values['--project-root'] = value;
  else if (key === '--repository') values['--repository'] = value;
  else throw new Error(usage);
}

function parseInitArguments(args: string[]): InitializationRequest {
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
  return {
    projectRoot: requiredInitOption(values['--project-root']),
    repository: requiredInitOption(values['--repository']),
    projectMappings: values.projects,
    ...(values.reconcileExisting ? { reconcileExisting: true } : {}),
  };
}

function initOptionPair(args: string[], index: number, values: InitOptions): { key: string; value: string } {
  const key = args[index];
  const value = args[index + 1];
  if (typeof key !== 'string' || typeof value !== 'string' || invalidOption(key, value, values)) throw new Error(usage);
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
}

async function runBunCli({ args, io, exit, initialize }: RunBunCliOptions): Promise<void> {
  try {
    io.log(JSON.stringify(await initialize(parseInitArguments(args))));
  } catch (error: unknown) {
    reportInitFailure(error, io, exit, false);
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
}

export async function main({
  isMain = import.meta.main,
  bunRuntime = isBunRuntime,
  args = process.argv.slice(2),
  io = console,
  exit = process,
  initialize = initializeProject,
  delegate,
}: InitMainOptions = {}): Promise<void> {
  if (!isMain) return;
  if (!bunRuntime) {
    await runNodeCli({ args, io, exit, delegate });
    return;
  }
  await runBunCli({ args, io, exit, initialize });
}

async function printHelp(args: string[], io: InitIo, command: string): Promise<void> {
  const { cliMetadataResult } = await import('./cli-metadata.ts');
  io.log(JSON.stringify(cliMetadataResult([command, ...args], {})));
}

if (import.meta.main && process.argv[2] === '--help') await printHelp(process.argv.slice(2), console, 'init');
else await main();
