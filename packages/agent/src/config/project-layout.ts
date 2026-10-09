import { stringify } from 'yaml';
import { freezeJsonValue } from '../contracts/public-ingress.js';
import {
  parseProjectConfiguration,
  splitRuntimeConfig,
  type ParsedProjectConfiguration,
} from './project-configuration.js';
import {
  INITIALIZED_PROJECT_PATHS,
  LEGACY_RUNTIME_CONFIGURATION_PATH,
  PROJECT_CONFIGURATION_PATHS,
} from './project-paths.js';
import {
  RuntimeConfigError,
  validateRuntimeConfig,
  type AgentRuntimeConfig,
  type PathProfileKey,
  type PathProfileOverride,
} from './runtime-config.js';

const managedRoots = [
  ['.agent/work', INITIALIZED_PROJECT_PATHS.work],
  ['.agent/coordination', INITIALIZED_PROJECT_PATHS.coordination],
  ['.planning/agent-flow', INITIALIZED_PROJECT_PATHS.planning],
  ['docs/agent-instructions', INITIALIZED_PROJECT_PATHS.instructions],
] as const;
const managedFiles = new Map<string, string>([
  ['AGENT.sidecar.md', INITIALIZED_PROJECT_PATHS.sidecar],
  [LEGACY_RUNTIME_CONFIGURATION_PATH, PROJECT_CONFIGURATION_PATHS.project],
  ['docs/agent-instructions/documentation-policy.v1.json', INITIALIZED_PROJECT_PATHS.documentationPolicy],
]);
const managedProfileKeys = new Set<PathProfileKey>([
  'wiki_path',
  'wiki_output_root',
  'documentation_policy_path',
  'documentation_map_path',
  'documentation_index_path',
  'documentation_evidence_root',
  'derived_output_root',
  'coordination_root',
  'work_root',
  'delivery_root',
  'import_root',
  'ledger_root',
]);

/** Exact managed roots only. A similarly named product path is never rewritten. */
function migratedPath(value: string): string {
  const file = managedFiles.get(value);
  if (file !== undefined) return file;
  for (const [before, after] of managedRoots) {
    if (value === before || value.startsWith(before + '/')) return after + value.slice(before.length);
  }
  return value;
}

function migratedProfile<T extends PathProfileOverride>(profile: T): T {
  const result = { ...profile };
  for (const key of Object.keys(profile) as (keyof T & PathProfileKey)[]) {
    const value = profile[key];
    if (managedProfileKeys.has(key) && typeof value === 'string')
      Object.defineProperty(result, key, {
        value: migratedPath(value),
        enumerable: true,
        configurable: true,
        writable: true,
      });
  }
  return result;
}

function nextRevision(value: number): number {
  const next = value + 1;
  if (!Number.isSafeInteger(next) || next <= value)
    throw new RuntimeConfigError('Project layout upgrade cannot advance the content revision safely.');
  return next;
}

function requireManagedDestination(value: string, root: string): void {
  if (value !== root && !value.startsWith(root + '/'))
    throw new RuntimeConfigError(
      'Project layout upgrade requires an explicit mapping for custom agent storage: ' + value,
    );
}

function requireProjectLayout(config: AgentRuntimeConfig): void {
  if (config.repository.sidecar !== INITIALIZED_PROJECT_PATHS.sidecar || config.repository.policy !== 'AGENTS.md')
    throw new RuntimeConfigError('Project layout upgrade requires the managed sidecar and root discovery mapping.');
  const paths = config.paths.defaults;
  for (const key of ['work_root', 'delivery_root', 'import_root', 'documentation_evidence_root'] as const)
    requireManagedDestination(paths[key], INITIALIZED_PROJECT_PATHS.work);
  for (const key of ['derived_output_root', 'wiki_output_root'] as const)
    requireManagedDestination(paths[key], INITIALIZED_PROJECT_PATHS.planning);
  requireManagedDestination(paths.coordination_root, INITIALIZED_PROJECT_PATHS.coordination);
  if (paths.documentation_policy_path !== INITIALIZED_PROJECT_PATHS.documentationPolicy)
    throw new RuntimeConfigError('Project layout upgrade requires an explicit documentation policy mapping.');
}

function migratedProject(project: AgentRuntimeConfig['projects'][number]): AgentRuntimeConfig['projects'][number] {
  return {
    ...project,
    wiki_path: migratedPath(project.wiki_path),
    wiki_output_root: migratedPath(project.wiki_output_root),
    ledger_root: migratedPath(project.ledger_root),
    ...(project.path_overrides === undefined ? {} : { path_overrides: migratedProfile(project.path_overrides) }),
  };
}

/** Prepare current configuration bytes only. Files, databases and ownership are not changed. */
export function prepareVidaProjectConfiguration(value: unknown): ParsedProjectConfiguration & {
  readonly inputs: Readonly<Record<keyof typeof PROJECT_CONFIGURATION_PATHS, string>>;
} {
  const original = validateRuntimeConfig(value);
  const control = {
    ...original.control,
    work_root: migratedPath(original.control.work_root),
    coordination_ledger: migratedPath(original.control.coordination_ledger),
  };
  requireManagedDestination(control.work_root, INITIALIZED_PROJECT_PATHS.work);
  requireManagedDestination(control.coordination_ledger, INITIALIZED_PROJECT_PATHS.coordination);
  const research = original.research_decision;
  const config = {
    ...original,
    config_revision: nextRevision(original.config_revision),
    repository: {
      ...original.repository,
      sidecar: migratedPath(original.repository.sidecar),
      root_markers: original.repository.root_markers.map(migratedPath),
    },
    control,
    paths: { ...original.paths, defaults: migratedProfile(original.paths.defaults) },
    projects: original.projects.map(migratedProject),
    research_decision: {
      ...research,
      paths: {
        research_records: migratedPath(research.paths.research_records),
        decision_records: migratedPath(research.paths.decision_records),
        changelog: migratedPath(research.paths.changelog),
        cache: migratedPath(research.paths.cache),
        activation_history: migratedPath(research.paths.activation_history),
      },
      registry: {
        ...research.registry,
        revision: nextRevision(research.registry.revision),
        instructions: research.registry.instructions.map((instruction, index) => ({
          ...instruction,
          source_path: PROJECT_CONFIGURATION_PATHS.project + '#research_decision.registry.instructions.' + index,
        })),
      },
    },
    knowledge: {
      sources: original.knowledge.sources.map((source) => ({
        ...source,
        location: source.kind === 'local' ? migratedPath(source.location) : source.location,
      })),
    },
  };
  const documents = splitRuntimeConfig(config, PROJECT_CONFIGURATION_PATHS.project);
  const inputs = {
    project: stringify(documents.project),
    agents: stringify(documents.agents),
    flows: stringify(documents.flows),
  };
  const prepared = parseProjectConfiguration(inputs, undefined, PROJECT_CONFIGURATION_PATHS.project);
  requireProjectLayout(prepared.config);
  return freezeJsonValue({ ...prepared, inputs });
}
