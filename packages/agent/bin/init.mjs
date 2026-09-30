import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeProjectFromBundle } from './init-core.mjs';

const isBunRuntime = typeof Bun !== 'undefined';
const bundleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function initializeProject({ projectRoot, repository, projectMappings, reconcileExisting = false }) {
  return initializeProjectFromBundle({ projectRoot, repository, projectMappings, reconcileExisting }, bundleRoot);
}

const usage =
  'Usage: init.mjs --project-root ABSOLUTE_PATH --repository SLUG --project PROJECT_ID=RELATIVE_ROOT [--project PROJECT_ID=RELATIVE_ROOT] [--reconcile-existing]';

function invalidOption(key, value, values) {
  const duplicate = key !== '--project' && Object.hasOwn(values, key);
  return !['--project-root', '--repository', '--project'].includes(key) || !value || duplicate;
}

function recordOption(values, key, value) {
  if (key === '--project') values.projects.push(value);
  else values[key] = value;
}

function parseInitArguments(args) {
  const values = { projects: [] };
  for (let index = 0; index < args.length;) {
    const key = args[index];
    if (key === '--reconcile-existing') {
      if (values.reconcileExisting) throw new Error(usage);
      values.reconcileExisting = true;
      index += 1;
      continue;
    }
    const value = args[index + 1];
    if (invalidOption(key, value, values)) throw new Error(usage);
    recordOption(values, key, value);
    index += 2;
  }
  return {
    projectRoot: values['--project-root'],
    repository: values['--repository'],
    projectMappings: values.projects,
    ...(values.reconcileExisting ? { reconcileExisting: true } : {}),
  };
}

async function runNodeCli({ args, io, exit, delegate }) {
  try {
    const runPinnedBun = delegate ?? (await import('./bun.mjs')).runPinnedBun;
    exit.exitCode = runPinnedBun([fileURLToPath(import.meta.url), ...args]);
  } catch (error) {
    io.error(error.message);
    exit.exitCode = error.exitCode ?? 1;
  }
}

async function runBunCli({ args, io, exit, initialize }) {
  try {
    io.log(JSON.stringify(await initialize(parseInitArguments(args))));
  } catch (error) {
    io.error(error.message);
    exit.exitCode = 1;
  }
}

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

await main();
