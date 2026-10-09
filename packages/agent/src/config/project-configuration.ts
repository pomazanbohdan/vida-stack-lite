import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import runtimeSchema from '../../schemas/agent-runtime-config.v1.schema.json' with { type: 'json' };
import componentsSchema from '../../schemas/project-configuration.v1.schema.json' with { type: 'json' };
import { freezeJsonValue, isPlainRecord } from '../contracts/public-ingress.js';
import {
  LEGACY_RUNTIME_CONFIGURATION_PATH,
  PROJECT_CONFIGURATION_PATHS,
  type RuntimeConfigurationSource,
} from './project-paths.js';
export { PROJECT_CONFIGURATION_PATHS } from './project-paths.js';
import {
  MAX_CONFIG_BYTES,
  RuntimeConfigError,
  parseRuntimeConfigDocument,
  snapshotRuntimeConfig,
  validateRuntimeConfig,
  type AgentRuntimeConfig,
} from './runtime-config.js';

const COMPONENT_REFERENCES = Object.freeze({ agents: 'agents.yaml', flows: 'flows.yaml' });
type ComponentKey = keyof typeof PROJECT_CONFIGURATION_PATHS;
type PartitionedField =
  | 'schema'
  | 'version'
  | 'config_revision'
  | 'agents'
  | 'teams'
  | 'workflows'
  | 'workflow_bindings';

export interface ProjectConfiguration {
  readonly project: Omit<AgentRuntimeConfig, PartitionedField> & {
    readonly schema: 'VidaProjectConfig/v1';
    readonly revision: number;
    readonly components: typeof COMPONENT_REFERENCES;
  };
  readonly agents: Pick<AgentRuntimeConfig, 'agents' | 'teams' | 'config_id'> & {
    readonly schema: 'VidaAgentsConfig/v1';
    readonly revision: number;
  };
  readonly flows: Pick<AgentRuntimeConfig, 'workflows' | 'workflow_bindings' | 'config_id'> & {
    readonly schema: 'VidaFlowsConfig/v1';
    readonly revision: number;
  };
}

interface ComposedProjectConfiguration {
  readonly documents: ProjectConfiguration;
  readonly config: AgentRuntimeConfig;
}
export interface ParsedProjectConfiguration extends ComposedProjectConfiguration {
  /** Binds every fixed input path and exact UTF-8 text, including schema and revision. */
  readonly input_digest: string;
}

type AjvConstructor = new (options: Record<string, unknown>) => {
  addSchema(schema: object): unknown;
  compile<T>(schema: object): ValidateFunction<T>;
};
const AjvConstructor = Ajv2020 as unknown as AjvConstructor;
let componentValidator: ValidateFunction<ProjectConfiguration> | undefined;

function validator(): ValidateFunction<ProjectConfiguration> {
  if (componentValidator === undefined) {
    const ajv = new AjvConstructor({ strict: true, allErrors: false, ownProperties: true });
    ajv.addSchema(runtimeSchema);
    componentValidator = ajv.compile<ProjectConfiguration>(componentsSchema);
  }
  return componentValidator;
}

/** Internal composition grants no loaded-config brand, admission or filesystem authority. */
function compose(
  project: unknown,
  agents: unknown,
  flows: unknown,
  repositoryRoot?: string,
  source: RuntimeConfigurationSource = LEGACY_RUNTIME_CONFIGURATION_PATH,
): ComposedProjectConfiguration {
  const documents = {
    project: snapshotRuntimeConfig(project),
    agents: snapshotRuntimeConfig(agents),
    flows: snapshotRuntimeConfig(flows),
  };
  if (!validator()(documents))
    throw new RuntimeConfigError('Project configuration component schema is invalid; use a supported upgrade.');
  if (
    documents.project.config_id !== documents.agents.config_id ||
    documents.project.config_id !== documents.flows.config_id
  )
    throw new RuntimeConfigError('Project configuration component identities differ.');
  const { schema: _schema, revision, components: _components, ...settings } = documents.project;
  const config = validateRuntimeConfig(
    {
      ...settings,
      schema: 'AgentRuntimeConfig/v1',
      version: 1,
      config_revision: revision,
      agents: documents.agents.agents,
      teams: documents.agents.teams,
      workflows: documents.flows.workflows,
      workflow_bindings: documents.flows.workflow_bindings,
    },
    repositoryRoot,
    source,
  );
  return Object.freeze({ documents: freezeJsonValue(documents), config });
}

/** Parse one captured file set. Filesystem snapshot/activation remains the upgrade owner's job. */
export function parseProjectConfiguration(
  inputs: unknown,
  repositoryRoot?: string,
  source: RuntimeConfigurationSource = LEGACY_RUNTIME_CONFIGURATION_PATH,
): ParsedProjectConfiguration {
  const sources = snapshotRuntimeConfig(inputs);
  const keys = Object.keys(PROJECT_CONFIGURATION_PATHS) as ComponentKey[];
  if (!isPlainRecord(sources) || Object.keys(sources).length !== keys.length)
    throw new RuntimeConfigError('Project configuration requires exactly project, agents and flows text inputs.');
  const { project, agents, flows } = sources;
  if (typeof project !== 'string' || typeof agents !== 'string' || typeof flows !== 'string')
    throw new RuntimeConfigError('Project configuration input must be UTF-8 text.');
  const captured = { project, agents, flows };
  const binding = new Bun.CryptoHasher('sha256').update('VidaProjectConfigurationInputs/v1\0');
  let bytes = 0;
  for (const key of keys) {
    const raw = captured[key];
    const size = Buffer.byteLength(raw, 'utf8');
    bytes += size;
    if (bytes > MAX_CONFIG_BYTES) throw new RuntimeConfigError('Project configuration inputs exceed the byte budget.');
    if (Buffer.from(raw, 'utf8').toString('utf8') !== raw)
      throw new RuntimeConfigError('Project configuration input contains invalid Unicode.');
    binding.update(PROJECT_CONFIGURATION_PATHS[key]).update('\0').update(String(size)).update('\0').update(raw);
  }
  return Object.freeze({
    ...compose(
      parseRuntimeConfigDocument(project),
      parseRuntimeConfigDocument(agents),
      parseRuntimeConfigDocument(flows),
      repositoryRoot,
      source,
    ),
    input_digest: binding.digest('hex'),
  });
}

/** Migration-only pure conversion. Preserve configured values and paths; perform no writes. */
export function splitRuntimeConfig(
  value: unknown,
  source: RuntimeConfigurationSource = LEGACY_RUNTIME_CONFIGURATION_PATH,
): ProjectConfiguration {
  const config = validateRuntimeConfig(value, undefined, source);
  const {
    schema: _schema,
    version: _version,
    config_revision,
    agents,
    teams,
    workflows,
    workflow_bindings,
    ...project
  } = config;
  const result = compose(
    { ...project, schema: 'VidaProjectConfig/v1', revision: config_revision, components: COMPONENT_REFERENCES },
    { schema: 'VidaAgentsConfig/v1', config_id: config.config_id, revision: 1, agents, teams },
    { schema: 'VidaFlowsConfig/v1', config_id: config.config_id, revision: 1, workflows, workflow_bindings },
    undefined,
    source,
  );
  if (!Bun.deepEquals(config, result.config, true))
    throw new RuntimeConfigError('Project configuration conversion changed runtime values.');
  return result.documents;
}
