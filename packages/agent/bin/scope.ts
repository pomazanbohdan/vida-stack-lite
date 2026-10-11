#!/usr/bin/env node
import { cliCommandContracts } from './cli-command-contracts.ts';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { AgentRuntimeConfig } from '../src/config/runtime-config.js';

interface ScopeArguments {
  '--project-root'?: string;
  '--repository'?: string;
  projects: string[];
  paths: string[];
  repositoryPaths: string[];
}

const scopeOptionsByName = new Map(cliCommandContracts.scope.options.map((option) => [option.name, option]));
const scopeRepeatedValues = new Set(
  cliCommandContracts.scope.options.filter((option) => option.repeatable).map((option) => option.name),
);
const scopeUsage = cliCommandContracts.scope.syntax;

function recordScopeOption(values: ScopeArguments, key: string, value: string) {
  if (Object.hasOwn(values, key)) throw new Error('duplicate scope option');
  if (key === '--project-root' || key === '--repository') values[key] = value;
  else throw new Error(scopeUsage);
}

function appendRepeatedScopeValue(key: string, repeatedValues: Map<string, string[]>, value: string) {
  const repeated = repeatedValues.get(key);
  if (!repeated) throw new Error(scopeUsage);
  repeated.push(value);
}

function assertRequiredScopeArguments(values: ScopeArguments, repeatedValues: Map<string, string[]>) {
  for (const option of scopeOptionsByName.values()) {
    if (option.required && !(repeatedValues.get(option.name)?.length || Object.hasOwn(values, option.name)))
      throw new Error(scopeUsage);
  }
}

function parseScopeArguments(args: readonly string[]): ScopeArguments {
  const values: ScopeArguments = { projects: [], paths: [], repositoryPaths: [] };
  const repeatedValues = new Map([
    ['--project', values.projects],
    ['--path', values.paths],
    ['--repository-path', values.repositoryPaths],
  ]);
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index] ?? '';
    const value = args[index + 1] ?? '';
    const option = scopeOptionsByName.get(key);
    if (!key || !value || option?.arity !== 1) throw new Error(scopeUsage);
    if (scopeRepeatedValues.has(key)) appendRepeatedScopeValue(key, repeatedValues, value);
    else recordScopeOption(values, key, value);
  }
  assertRequiredScopeArguments(values, repeatedValues);
  return values;
}

function requireScopeRoot(suppliedRoot: string | undefined) {
  if (!suppliedRoot || !path.isAbsolute(suppliedRoot)) throw new Error('scope requires an absolute project root');
  return path.resolve(suppliedRoot);
}

async function loadScopeDependencies() {
  const { loadRuntimeConfig } = await import('../src/config/runtime-config.ts');
  const { loadProjectSetContext, projectMayScopeRepositoryPath, resolveProjectPathMembership } =
    await import('../src/config/project-context.ts');
  const { requireSafeRepositoryAccess } = await import('../src/config/safe-repository-access.ts');
  const { snapshotDeclaredSources } = await import('../src/orchestration/scoped-source-snapshot.ts');
  return {
    loadRuntimeConfig,
    loadProjectSetContext,
    projectMayScopeRepositoryPath,
    resolveProjectPathMembership,
    requireSafeRepositoryAccess,
    snapshotDeclaredSources,
  };
}

function assertProjectPaths(
  configuredProjects: AgentRuntimeConfig['projects'],
  paths: readonly string[],
  projectIds: readonly string[],
  mayScope: typeof import('../src/config/project-context.js').projectMayScopeRepositoryPath,
) {
  for (const relative of paths) {
    if (!projectIds.some((projectId) => mayScope(configuredProjects, relative, projectId)))
      throw new Error('scope path is outside selected products');
  }
}

function assertRepositoryPaths(
  configuredProjects: AgentRuntimeConfig['projects'],
  paths: readonly string[],
  membership: typeof import('../src/config/project-context.js').resolveProjectPathMembership,
) {
  for (const relative of paths) {
    if (membership(configuredProjects, relative).project_ids.length > 0)
      throw new Error('repository scope path is covered by a configured project; use --path');
  }
}

function uniqueScopePaths(projectPaths: readonly string[], repositoryPaths: readonly string[]) {
  const paths = [...projectPaths, ...repositoryPaths];
  const fold = (value: string) => (process.platform === 'win32' ? value.toLowerCase() : value);
  if (new Set(paths.map(fold)).size !== paths.length) throw new Error('duplicate scope path');
  return paths;
}

export async function inspectScope(args: readonly string[]) {
  const values = parseScopeArguments(args);
  const paths = uniqueScopePaths(values.paths, values.repositoryPaths);
  const root = requireScopeRoot(values['--project-root']);
  const dependencies = await loadScopeDependencies();
  const config = dependencies.loadRuntimeConfig(root);
  const repository = values['--repository'];
  if (!repository) throw new Error('scope requires a repository identifier');
  const context = dependencies.loadProjectSetContext(root, config, repository, values.projects);
  assertProjectPaths(config.projects, values.paths, context.project_ids, dependencies.projectMayScopeRepositoryPath);
  assertRepositoryPaths(config.projects, values.repositoryPaths, dependencies.resolveProjectPathMembership);
  return dependencies.snapshotDeclaredSources(dependencies.requireSafeRepositoryAccess(root), paths);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (typeof Bun === 'undefined') {
      const { runPinnedBun } = await import('./bun.ts');
      process.exitCode = runPinnedBun([fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
        root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
        cwd: process.cwd(),
      });
    } else process.stdout.write(`${JSON.stringify(await inspectScope(process.argv.slice(2)))}\n`);
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({ schema: 'VidaAgentCommandResult/v1', status: 'blocked', code: 'GAP-VIDA-SCOPE-001', message: error instanceof Error ? error.message : String(error) })}\n`,
    );
    process.exitCode = 1;
  }
}
