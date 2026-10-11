import { cliCommandContracts } from './cli-command-contracts.ts';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeProjectFromBundle } from './init-core.mjs';
import { readCliErrorProperty } from './cli-error-properties.ts';

const isBunRuntime = typeof Bun !== 'undefined';
const bundleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @typedef {Parameters<typeof initializeProjectFromBundle>[0]} InitializationRequest */
/** @typedef {{projects: string[], reconcileExisting?: boolean, '--project-root'?: string, '--repository'?: string, [key: string]: string|string[]|boolean|undefined}} InitOptions */
/** @typedef {{log: (message: string) => unknown, error: (message: unknown) => unknown}} InitIo */
/** @typedef {Pick<NodeJS.Process, 'exitCode'>} InitExit */
/** @typedef {(args: string[]) => number} InitDelegate */
/** @typedef {(request: InitializationRequest) => unknown} InitInitializer */
/** @param {InitializationRequest} request */
export async function initializeProject({ projectRoot, repository, projectMappings, reconcileExisting = false }) {
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

/** @param {string} key @param {string} value @param {InitOptions} values */
function invalidOption(key, value, values) {
  const duplicate = !initRepeatableOptions.has(key) && Object.hasOwn(values, key);
  return !initScalarOptions.has(key) || !value || duplicate;
}

/** @param {InitOptions} values @param {string} key @param {string} value */
function recordOption(values, key, value) {
  if (key === '--project') values.projects.push(value);
  else values[key] = value;
}

/** @param {string[]} args @returns {InitializationRequest} */
function parseInitArguments(args) {
  /** @type {InitOptions} */
  const values = { projects: [] };
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

/** @param {string[]} args @param {number} index @param {InitOptions} values */
function initOptionPair(args, index, values) {
  const key = args[index];
  const value = args[index + 1];
  if (typeof key !== 'string' || typeof value !== 'string' || invalidOption(key, value, values)) throw new Error(usage);
  return { key, value };
}

/** @param {unknown} value @returns {string} */
function requiredInitOption(value) {
  if (typeof value !== 'string') throw new Error(usage);
  return value;
}

/** @param {unknown} error @param {InitIo} io @param {InitExit} exit @param {boolean} preserveExitCode */
function reportInitFailure(error, io, exit, preserveExitCode) {
  io.error(readCliErrorProperty(error, 'message'));
  const code = preserveExitCode ? readCliErrorProperty(error, 'exitCode') : 1;
  exit.exitCode = preserveExitCode && typeof code === 'number' ? code : 1;
}

/** @param {{args: string[], io: InitIo, exit: InitExit, delegate?: InitDelegate|undefined}} input */
async function runNodeCli({ args, io, exit, delegate }) {
  try {
    const runPinnedBun = delegate ?? (await import('./bun.mjs')).runPinnedBun;
    exit.exitCode = runPinnedBun([fileURLToPath(import.meta.url), ...args]);
  } catch (error) {
    reportInitFailure(error, io, exit, true);
  }
}

/** @param {{args: string[], io: InitIo, exit: InitExit, initialize: InitInitializer}} input */
async function runBunCli({ args, io, exit, initialize }) {
  try {
    io.log(JSON.stringify(await initialize(parseInitArguments(args))));
  } catch (error) {
    reportInitFailure(error, io, exit, false);
  }
}

/** @param {{isMain?: boolean, bunRuntime?: boolean, args?: string[], io?: InitIo, exit?: InitExit, initialize?: InitInitializer, delegate?: InitDelegate}} [options] */
export async function main({
  isMain = import.meta.main,
  bunRuntime = isBunRuntime,
  args = process.argv.slice(2),
  io = console,
  exit = process,
  initialize = initializeProject,
  delegate,
} = {}) {
  if (!isMain) return;
  if (!bunRuntime) {
    await runNodeCli({ args, io, exit, delegate });
    return;
  }
  await runBunCli({ args, io, exit, initialize });
}

/** @param {string[]} args @param {InitIo} io @param {string} command */
async function printHelp(args, io, command) {
  const { cliMetadataResult } = await import('./cli-metadata.ts');
  io.log(JSON.stringify(cliMetadataResult([command, ...args], {})));
}

if (import.meta.main && process.argv[2] === '--help') await printHelp(process.argv.slice(2), console, 'init');
else await main();
