import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv';
import runtimeSchema from '../../schemas/agent-runtime-config.v1.schema.json' with { type: 'json' };
import runtimeSchemaV2 from '../../schemas/agent-runtime-config.v2.schema.json' with { type: 'json' };
import componentsSchema from '../../schemas/project-configuration.v1.schema.json' with { type: 'json' };
import componentsSchemaV2 from '../../schemas/project-configuration.v2.schema.json' with { type: 'json' };
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
  type AgentRuntimeConfigV1,
  type AgentRuntimeConfigV2,
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

interface ProjectConfigurationV1 {
  readonly project: Omit<AgentRuntimeConfigV1, PartitionedField> & {
    readonly schema: 'VidaProjectConfig/v1';
    readonly revision: number;
    readonly components: typeof COMPONENT_REFERENCES;
  };
  readonly agents: Pick<AgentRuntimeConfigV1, 'agents' | 'teams' | 'config_id'> & {
    readonly schema: 'VidaAgentsConfig/v1';
    readonly revision: number;
  };
  readonly flows: Pick<AgentRuntimeConfigV1, 'workflows' | 'workflow_bindings' | 'config_id'> & {
    readonly schema: 'VidaFlowsConfig/v1';
    readonly revision: number;
  };
}

interface ProjectConfigurationV2 {
  readonly project: Omit<AgentRuntimeConfigV2, PartitionedField> & {
    readonly schema: 'VidaProjectConfig/v2';
    readonly revision: number;
    readonly components: typeof COMPONENT_REFERENCES;
  };
  readonly agents: ProjectConfigurationV1['agents'];
  readonly flows: ProjectConfigurationV1['flows'];
}
export type ProjectConfiguration = ProjectConfigurationV1 | ProjectConfigurationV2;

interface ComposedProjectConfiguration {
  readonly documents: ProjectConfiguration;
  readonly config: AgentRuntimeConfig;
}
interface ProjectConfigurationComposition extends ComposedProjectConfiguration {
  readonly captured: Readonly<Record<ComponentKey, string>>;
}
export interface ParsedProjectConfiguration extends ComposedProjectConfiguration {
  /** Binds every fixed input path and exact UTF-8 text, including schema and revision. */
  readonly input_digest: string;
}

/** Hash the bounded fixed inputs without parsing YAML, for a validated loader-cache lookup. */
export function projectConfigurationInputDigest(inputs: unknown): string {
  const sources = snapshotRuntimeConfig(inputs);
  const keys = Object.keys(PROJECT_CONFIGURATION_PATHS) as ComponentKey[];
  if (!isPlainRecord(sources) || Object.keys(sources).length !== keys.length)
    throw new RuntimeConfigError('Project configuration requires exactly project, agents and flows text inputs.');
  const captured = sources as Record<ComponentKey, unknown>;
  const binding = new Bun.CryptoHasher('sha256').update('VidaProjectConfigurationInputs/v1\0');
  let bytes = 0;
  for (const key of keys) {
    const raw = captured[key];
    if (typeof raw !== 'string') throw new RuntimeConfigError('Project configuration input must be UTF-8 text.');
    const size = Buffer.byteLength(raw, 'utf8');
    bytes += size;
    if (bytes > MAX_CONFIG_BYTES) throw new RuntimeConfigError('Project configuration inputs exceed the byte budget.');
    if (Buffer.from(raw, 'utf8').toString('utf8') !== raw)
      throw new RuntimeConfigError('Project configuration input contains invalid Unicode.');
    binding.update(PROJECT_CONFIGURATION_PATHS[key]).update('\0').update(String(size)).update('\0').update(raw);
  }
  return binding.digest('hex');
}

type AjvConstructor = new (options: Record<string, unknown>) => {
  addSchema(schema: object): unknown;
  compile<T>(schema: object): ValidateFunction<T>;
};
const AjvConstructor = Ajv2020 as unknown as AjvConstructor;
let componentValidator: ValidateFunction<ProjectConfiguration> | undefined;
let componentValidatorV2: ValidateFunction<ProjectConfiguration> | undefined;

function validator(version: 1 | 2): ValidateFunction<ProjectConfiguration> {
  if (version === 2) {
    if (componentValidatorV2 === undefined) {
      const ajv = new AjvConstructor({ strict: true, allErrors: false, ownProperties: true });
      ajv.addSchema(runtimeSchema);
      ajv.addSchema(runtimeSchemaV2);
      componentValidatorV2 = ajv.compile<ProjectConfiguration>(componentsSchemaV2);
    }
    return componentValidatorV2;
  }
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
  const projectDocument = documents.project;
  const version = isPlainRecord(projectDocument) && projectDocument.schema === 'VidaProjectConfig/v2' ? 2 : 1;
  if (!validator(version)(documents))
    throw new RuntimeConfigError('Project configuration component schema is invalid; use a supported upgrade.');
  const checkedDocuments = documents as ProjectConfiguration;
  if (
    checkedDocuments.project.config_id !== checkedDocuments.agents.config_id ||
    checkedDocuments.project.config_id !== checkedDocuments.flows.config_id
  )
    throw new RuntimeConfigError('Project configuration component identities differ.');
  const { schema: _schema, revision, components: _components, ...settings } = checkedDocuments.project;
  const config = validateRuntimeConfig(
    {
      ...settings,
      schema: version === 1 ? 'AgentRuntimeConfig/v1' : 'AgentRuntimeConfig/v2',
      version,
      config_revision: revision,
      agents: checkedDocuments.agents.agents,
      teams: checkedDocuments.agents.teams,
      workflows: checkedDocuments.flows.workflows,
      workflow_bindings: checkedDocuments.flows.workflow_bindings,
    },
    repositoryRoot,
    source,
  );
  return Object.freeze({ documents: freezeJsonValue(documents), config });
}

/** @internal Parse and compose one captured file set without calculating its input digest. */
export function composeProjectConfigurationInputs(
  inputs: unknown,
  repositoryRoot?: string,
  source: RuntimeConfigurationSource = LEGACY_RUNTIME_CONFIGURATION_PATH,
): ProjectConfigurationComposition {
  const sources = snapshotRuntimeConfig(inputs);
  const keys = Object.keys(PROJECT_CONFIGURATION_PATHS) as ComponentKey[];
  if (!isPlainRecord(sources) || Object.keys(sources).length !== keys.length)
    throw new RuntimeConfigError('Project configuration requires exactly project, agents and flows text inputs.');
  const { project, agents, flows } = sources;
  if (typeof project !== 'string' || typeof agents !== 'string' || typeof flows !== 'string')
    throw new RuntimeConfigError('Project configuration input must be UTF-8 text.');
  const captured = Object.freeze({ project, agents, flows });
  return Object.freeze({
    ...compose(
      parseRuntimeConfigDocument(project),
      parseRuntimeConfigDocument(agents),
      parseRuntimeConfigDocument(flows),
      repositoryRoot,
      source,
    ),
    captured,
  });
}

/** Parse one captured file set. Filesystem snapshot/activation remains the upgrade owner's job. */
export function parseProjectConfiguration(
  inputs: unknown,
  repositoryRoot?: string,
  source: RuntimeConfigurationSource = LEGACY_RUNTIME_CONFIGURATION_PATH,
): ParsedProjectConfiguration {
  const { config, documents, captured } = composeProjectConfigurationInputs(inputs, repositoryRoot, source);
  return Object.freeze({
    documents,
    config,
    input_digest: projectConfigurationInputDigest(captured),
  });
}

/** Migration-only pure conversion. Preserve configured values and paths; perform no writes. */
export function splitRuntimeConfig(
  value: unknown,
  source: RuntimeConfigurationSource = LEGACY_RUNTIME_CONFIGURATION_PATH,
): ProjectConfiguration {
  const config = validateRuntimeConfig(value, undefined, source);
  if (config.schema === 'AgentRuntimeConfig/v2') {
    const {
      schema: _schema,
      version: _version,
      config_revision,
      agents,
      teams,
      workflows,
      workflow_bindings,
      ...operational
    } = config;
    const project = {
      ...operational,
      schema: 'VidaProjectConfig/v2' as const,
      revision: config_revision,
      components: COMPONENT_REFERENCES,
    };
    const split = {
      project,
      agents: { schema: 'VidaAgentsConfig/v1', config_id: config.config_id, revision: 1, agents, teams },
      flows: { schema: 'VidaFlowsConfig/v1', config_id: config.config_id, revision: 1, workflows, workflow_bindings },
    } satisfies ProjectConfigurationV2;
    return freezeJsonValue(split);
  }
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
