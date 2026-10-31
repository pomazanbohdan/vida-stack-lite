import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import { canonicalJsonDigest } from '../src/contracts/public-ingress.ts';
import { parseConsumerProjectMoves } from './consumer-project-relocation.ts';
import { planConsumerConfiguration, type ConsumerConfigurationRequest } from './init-configuration.ts';
import {
  applyConsumerConfiguration,
  inspectConsumerConfigurationOperation,
  resumeConsumerConfiguration,
} from './consumer-configuration-operation.ts';

type Parsed =
  | { mode: 'inspect'; projectRoot: string }
  | { mode: 'apply'; projectRoot: string; plan: string }
  | ({ mode: 'plan' } & ConsumerConfigurationRequest)
  | ({ mode: 'resume'; operation: string } & ConsumerConfigurationRequest);

export function configureArguments(args: readonly string[]): Parsed {
  const mode = args[0];
  if (mode !== 'plan' && mode !== 'inspect' && mode !== 'apply' && mode !== 'resume')
    throw Error('Invalid configure mode');
  const scalars = new Map<string, string>();
  const projects: string[] = [];
  const grants: string[] = [];
  const moves: string[] = [];
  const allowed =
    mode === 'inspect'
      ? ['--project-root']
      : mode === 'apply'
        ? ['--project-root', '--plan']
        : [
            '--project-root',
            '--repository',
            '--project',
            '--allow-project',
            '--move-project',
            ...(mode === 'resume' ? ['--operation'] : []),
          ];
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    if (!key || !allowed.includes(key) || !value || value.startsWith('--')) throw Error('Invalid configure option');
    if (key === '--project') projects.push(value);
    else if (key === '--allow-project') grants.push(value);
    else if (key === '--move-project') moves.push(value);
    else if (scalars.has(key)) throw Error('Duplicate configure option');
    else scalars.set(key, value);
  }
  const required = (key: string): string => {
    const value = scalars.get(key);
    if (!value) throw Error(`Missing ${key}`);
    return value;
  };
  const projectRoot = required('--project-root');
  if (!path.isAbsolute(projectRoot)) throw Error('Project root must be absolute');
  if (mode === 'inspect') return { mode, projectRoot };
  if (mode === 'apply') return { mode, projectRoot, plan: required('--plan') };
  if (!projects.length) throw Error('Missing --project');
  const request = {
    projectRoot,
    repository: required('--repository'),
    projectMappings: projects,
    teamProjectGrants: grants,
    ...(moves.length ? { projectMoves: moves } : {}),
  };
  return mode === 'plan' ? { mode, ...request } : { mode, ...request, operation: required('--operation') };
}

function object(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((x) => typeof x === 'string' && x.length > 0);

export function requestFromPlan(
  value: unknown,
  projectRoot: string,
): { request: ConsumerConfigurationRequest; binding: string; operationId: string } {
  if (
    !object(value, ['schema', 'request', 'operation_id', 'binding', 'changes']) ||
    value.schema !== 'ConsumerConfigurationPlan/v1' ||
    typeof value.binding !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.binding) ||
    value.operation_id !== `config-${value.binding}` ||
    !(
      object(value.request, ['repository', 'projects', 'team_project_grants']) ||
      object(value.request, ['repository', 'projects', 'team_project_grants', 'project_moves'])
    ) ||
    typeof value.request.repository !== 'string' ||
    !value.request.repository ||
    !Array.isArray(value.request.projects) ||
    !value.request.projects.length ||
    !strings(value.request.team_project_grants) ||
    !object(value.changes, ['added_projects', 'team_project_grants', 'relocation']) ||
    !strings(value.changes.added_projects) ||
    !strings(value.changes.team_project_grants)
  )
    throw Error('Invalid public configuration plan');
  const mappings = value.request.projects.map((entry: unknown) => {
    if (
      !object(entry, ['id', 'root']) ||
      typeof entry.id !== 'string' ||
      !entry.id ||
      typeof entry.root !== 'string' ||
      !entry.root ||
      entry.id.includes('=') ||
      entry.root.includes('=')
    )
      throw Error('Invalid public configuration plan');
    return `${entry.id}=${entry.root}`;
  });
  let projectMoves: string[] | undefined;
  if (Object.hasOwn(value.request, 'project_moves')) {
    const moves = value.request.project_moves;
    if (!Array.isArray(moves) || !moves.length) throw Error('Invalid public configuration plan');
    projectMoves = moves.map((entry: unknown) => {
      if (
        !object(entry, ['id', 'oldRoot', 'newRoot']) ||
        typeof entry.id !== 'string' ||
        !entry.id ||
        /[=:]/.test(entry.id) ||
        typeof entry.oldRoot !== 'string' ||
        !entry.oldRoot ||
        /[=:]/.test(entry.oldRoot) ||
        typeof entry.newRoot !== 'string' ||
        !entry.newRoot ||
        /[=:]/.test(entry.newRoot)
      )
        throw Error('Invalid public configuration plan');
      return `${entry.id}=${entry.oldRoot}:${entry.newRoot}`;
    });
    const current = new Map<string, string>();
    const desired = mappings.map((mapping) => {
      const [id, root] = mapping.split('=');
      if (!id || !root) throw Error('Invalid public configuration plan');
      current.set(id, root);
      return { id, root };
    });
    for (const move of projectMoves) {
      const [id, roots] = move.split('=');
      const [oldRoot] = roots?.split(':') ?? [];
      if (!id || !oldRoot) throw Error('Invalid public configuration plan');
      current.set(id, oldRoot);
    }
    parseConsumerProjectMoves(projectMoves, current, desired);
    const relocation = value.changes.relocation;
    if (
      !object(relocation, [
        'files',
        'directories',
        'source_directories_retained',
        'source_empty_directories_retained',
        'projection',
      ]) ||
      relocation.projection !== 'plan_only' ||
      !['files', 'directories', 'source_directories_retained', 'source_empty_directories_retained'].every(
        (key) =>
          typeof relocation[key] === 'number' &&
          Number.isSafeInteger(relocation[key]) &&
          relocation[key] >= 0 &&
          relocation[key] <= 10000 * moves.length,
      ) ||
      typeof relocation.files !== 'number' ||
      typeof relocation.directories !== 'number' ||
      typeof relocation.source_empty_directories_retained !== 'number' ||
      relocation.directories < moves.length ||
      relocation.files + relocation.directories > 10000 * moves.length ||
      relocation.source_directories_retained !== relocation.directories ||
      relocation.source_empty_directories_retained > relocation.directories
    )
      throw Error('Invalid public configuration plan');
  } else if (value.changes.relocation !== 'none') throw Error('Invalid public configuration plan');
  return {
    request: {
      projectRoot,
      repository: value.request.repository,
      projectMappings: mappings,
      teamProjectGrants: value.request.team_project_grants,
      ...(projectMoves ? { projectMoves } : {}),
    },
    binding: value.binding,
    operationId: value.operation_id,
  };
}

function readPlan(file: string): unknown {
  const absolute = path.resolve(file);
  const bytes = requireSafeRepositoryAccess(path.dirname(absolute)).readCapturedBytes(
    path.basename(absolute),
    'configuration plan',
    32768,
  );
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

export async function configure(args: readonly string[]): Promise<unknown> {
  const parsed = configureArguments(args);
  if (parsed.mode === 'inspect') return inspectConsumerConfigurationOperation(parsed.projectRoot);
  if (parsed.mode === 'apply') {
    const supplied = readPlan(parsed.plan);
    const { request, binding, operationId } = requestFromPlan(supplied, parsed.projectRoot);
    const fresh = planConsumerConfiguration(request);
    if (canonicalJsonDigest(supplied) !== canonicalJsonDigest(fresh)) throw Error('Public configuration plan changed');
    return await applyConsumerConfiguration(request, binding, operationId);
  }
  const { projectRoot, repository, projectMappings, teamProjectGrants, projectMoves } = parsed;
  const request = {
    projectRoot,
    repository,
    projectMappings,
    ...(teamProjectGrants ? { teamProjectGrants } : {}),
    ...(projectMoves ? { projectMoves } : {}),
  };
  return parsed.mode === 'plan'
    ? planConsumerConfiguration(request)
    : await resumeConsumerConfiguration(request, parsed.operation);
}

export async function main(
  args = process.argv.slice(2),
  io: Pick<Console, 'log' | 'error'> = console,
  exit: Pick<NodeJS.Process, 'exitCode'> = process,
  bunRuntime = typeof Bun !== 'undefined',
  run = configure,
): Promise<void> {
  try {
    if (args[0] === '--help') {
      const { cliMetadataResult } = await import('./cli-metadata.ts');
      io.log(JSON.stringify(cliMetadataResult(['configure', ...args], {})));
    } else if (!bunRuntime) {
      const { runPinnedBun } = await import('./bun.ts');
      exit.exitCode = runPinnedBun([fileURLToPath(import.meta.url), ...args]);
    } else io.log(JSON.stringify(await run(args)));
  } catch (error: unknown) {
    io.error(error instanceof Error ? error.message : 'Configuration failed');
    exit.exitCode = 1;
  }
}

if (import.meta.main) await main();
