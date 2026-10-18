import path from 'node:path';
import type { AgentRuntimeConfig } from './runtime-config.js';

export const PROJECT_CONFIGURATION_PATHS = Object.freeze({
  project: '.vida/project.yaml',
  agents: '.vida/agents.yaml',
  flows: '.vida/flows.yaml',
});

/** Fixed source identities; selection never probes a fallback directory. */
export const LEGACY_RUNTIME_CONFIGURATION_PATH = 'agent-runtime.config.v1.yaml';
export type RuntimeConfigurationSource =
  | typeof LEGACY_RUNTIME_CONFIGURATION_PATH
  | typeof PROJECT_CONFIGURATION_PATHS.project;

const loadedConfigurationSources = new WeakMap<object, RuntimeConfigurationSource>();

/** Bind a validated loaded config to its selected storage layout. */
export function bindLoadedConfigurationSource(config: AgentRuntimeConfig, source: RuntimeConfigurationSource): void {
  loadedConfigurationSources.set(config, source);
}

/** Return the layout captured by the authorized loader; unbound SDK values retain v1 routing. */
export function runtimeConfigurationSourceFor(config: AgentRuntimeConfig): RuntimeConfigurationSource {
  return loadedConfigurationSources.get(config) ?? LEGACY_RUNTIME_CONFIGURATION_PATH;
}

export const INITIALIZED_PROJECT_PATHS = Object.freeze({
  sidecar: '.vida/AGENT.sidecar.md',
  instructions: '.vida/instructions',
  projectPolicy: '.vida/instructions/project-policy.md',
  documentationPolicy: '.vida/documentation-policy.v1.json',
  work: '.vida/work',
  coordination: '.vida/coordination',
  planning: '.vida/planning/agent-flow',
  temporary: '.vida/tmp',
});

export const RUNTIME_INITIALIZATION_PATH = '.agent/runtime-initialization.v1.json';
/** Current upgrade intent is a reader barrier until its owner retires the active slot. */
export const PROJECT_UPGRADE_OPERATION_PATH = '.vida/project-upgrade.v1.json';
export const STORAGE_ADMISSION_GATE_FILE = 'storage-admission.v1.sqlite';
/** Prepared unified storage; active consumers switch only after the upgrade closure is ready. */
export const PROJECT_WORKSPACE_DATABASE_PATH = '.vida/work/workspace.v1.sqlite';
export const PROJECT_INITIALIZATION_PATH = '.vida/runtime-initialization.v2.json';
export const PROJECT_ACTIVATION_PATH = '.vida/activation.v1.json';

export function projectUpgradeHistoryPath(operationId: string): string {
  if (typeof operationId !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,79}$/u.test(operationId))
    throw new Error('Project upgrade history requires a supported operation identity.');
  return '.vida/work/upgrade-history/' + operationId + '.v1.json';
}

export function projectConfigurationRebindPath(operationId: string): string {
  if (typeof operationId !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,79}$/u.test(operationId))
    throw new Error('Project configuration rebind requires a supported operation identity.');
  return (
    INITIALIZED_PROJECT_PATHS.work + '/configuration-rebind/' + operationId + '/runtime-config-rebind-operation.v1.json'
  );
}

function controlWorkPath(config: AgentRuntimeConfig, file: string): string {
  const root = config.control.work_root;
  return root === '.' ? file : `${root}/${file}`;
}

function sessionDatabaseRelativePath(config: AgentRuntimeConfig, legacyFile: string): string {
  const source = runtimeConfigurationSourceFor(config);
  return source === PROJECT_CONFIGURATION_PATHS.project
    ? PROJECT_WORKSPACE_DATABASE_PATH
    : controlWorkPath(config, legacyFile);
}

/** Pure layout mapping for validated configuration. Callers retain filesystem and Host checks. */
export function sessionHandoffDatabaseRelativePath(config: AgentRuntimeConfig): string {
  return sessionDatabaseRelativePath(config, 'session-handoff.v1.sqlite');
}

export function sessionBridgeDatabaseRelativePath(config: AgentRuntimeConfig): string {
  return sessionDatabaseRelativePath(config, 'mastra-workflows.v1.sqlite');
}

export function sessionHandoffDatabasePath(repositoryRoot: string, config: AgentRuntimeConfig): string {
  return path.join(repositoryRoot, sessionHandoffDatabaseRelativePath(config));
}

export function sessionBridgeDatabasePath(repositoryRoot: string, config: AgentRuntimeConfig): string {
  return path.join(repositoryRoot, sessionBridgeDatabaseRelativePath(config));
}
