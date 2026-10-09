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

export const INITIALIZED_PROJECT_PATHS = Object.freeze({
  sidecar: '.vida/AGENT.sidecar.md',
  instructions: '.vida/instructions',
  documentationPolicy: '.vida/documentation-policy.v1.json',
  work: '.vida/work',
  coordination: '.vida/coordination',
  planning: '.vida/planning/agent-flow',
  temporary: '.vida/tmp',
});

export const RUNTIME_INITIALIZATION_PATH = '.agent/runtime-initialization.v1.json';

function controlWorkPath(config: AgentRuntimeConfig, file: string): string {
  const root = config.control.work_root;
  return root === '.' ? file : `${root}/${file}`;
}

/** Pure layout mapping for validated configuration. Callers retain filesystem and Host checks. */
export function sessionHandoffDatabaseRelativePath(config: AgentRuntimeConfig): string {
  return controlWorkPath(config, 'session-handoff.v1.sqlite');
}

export function sessionBridgeDatabaseRelativePath(config: AgentRuntimeConfig): string {
  return controlWorkPath(config, 'mastra-workflows.v1.sqlite');
}

export function sessionHandoffDatabasePath(repositoryRoot: string, config: AgentRuntimeConfig): string {
  return path.join(repositoryRoot, sessionHandoffDatabaseRelativePath(config));
}

export function sessionBridgeDatabasePath(repositoryRoot: string, config: AgentRuntimeConfig): string {
  return path.join(repositoryRoot, sessionBridgeDatabaseRelativePath(config));
}
