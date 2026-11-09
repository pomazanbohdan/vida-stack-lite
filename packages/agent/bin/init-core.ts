import { projectMappings } from './project-mapping-contract.ts';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isBunRuntime = typeof Bun !== 'undefined';
const executingPackageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** @type {typeof import('ajv/dist/2020.js').Ajv2020 | null} */
const Ajv2020 = isBunRuntime ? (await import('ajv/dist/2020.js')).Ajv2020 : null;
const runtimeConfig = isBunRuntime ? await import('../src/config/runtime-config.ts') : null;
const publicIngress = isBunRuntime ? await import('../src/contracts/public-ingress.ts') : null;
const repositoryAccess = isBunRuntime ? await import('../src/config/safe-repository-access.ts') : null;
const workspaceIdentity = isBunRuntime ? await import('../src/workspace-identity.ts') : null;
const yaml = isBunRuntime ? await import('yaml') : null;
const initializationRecord = isBunRuntime ? await import('../src/config/initialization-record.ts') : null;
const projectPaths = isBunRuntime ? await import('../src/config/project-paths.ts') : null;
const documentationPolicy = isBunRuntime ? await import('../src/documentation/policy.ts') : null;
const storageAdmission = isBunRuntime ? await import('../src/config/storage-read-admission.ts') : null;
const productModel = isBunRuntime ? await import('../src/config/product-model.ts') : null;
const cleanInitializationCodec = isBunRuntime ? await import('./consumer-clean-initialization-v2.ts') : null;

type AgentRuntimeConfig = import('../src/config/runtime-config.ts').AgentRuntimeConfig;
type SafeRepositoryAccess = import('../src/config/safe-repository-access.ts').SafeRepositoryAccess;
type SafeRepositoryObservation = import('../src/config/safe-repository-access.ts').SafeRepositoryObservation;
type InitializationReferenceAccess = Pick<SafeRepositoryAccess, 'assertDirectory' | 'fileExists' | 'readText'>;
type RuntimeInitializationReceipt = import('../src/config/initialization-record.ts').RuntimeInitializationReceipt;
type DocumentationPolicy = ReturnType<typeof import('../src/documentation/policy.ts').validateDocumentationPolicy>;
type ProjectMapping = ReturnType<typeof projectMappings>[number];
type RenderedTemplate = {
  template: string;
  template_sha256: string;
  output: string;
  output_sha256: string;
  content: string;
};
type TemplateEvidence = Omit<RenderedTemplate, 'content'>;
type CleanInitializationPreservedFile =
  import('./consumer-clean-initialization-v2.ts').ConsumerCleanInitializationOperationV2['preserved'][number];
type InitializationObservation = SafeRepositoryObservation & Pick<SafeRepositoryAccess, 'assertDirectory'>;
type InitializationRequest = {
  readonly projectRoot: string;
  readonly repository: string;
  readonly projectMappings: readonly string[];
  readonly reconcileExisting?: boolean;
  readonly productModel?: import('../src/config/product-model.ts').ProductModelDefinition;
  readonly legacyProjectIdMap?: Readonly<Record<string, string>>;
};
type InitializationContext = {
  readonly access: SafeRepositoryAccess;
  readonly packageAccess: SafeRepositoryAccess;
  readonly bundle: string;
  readonly canonicalRoot: string;
  readonly selectedProjects: ProjectMapping[];
};

/** @template T @param {T | null} module @returns {T} */
function requireRuntimeModule<T>(module: T | null): T {
  if (module === null) throw new Error('Project initialization requires the pinned Bun runtime.');
  return module;
}

/** @returns {string} */
function initializationReceiptPath(): string {
  return requireRuntimeModule(projectPaths).RUNTIME_INITIALIZATION_PATH;
}
const pendingReceiptPath = '.agent/runtime-initialization.pending.v1.json';
const outputs: readonly (readonly [string, string])[] = [
  ['AGENTS.template.md', 'AGENTS.md'],
  ['AGENT.sidecar.template.md', 'AGENT.sidecar.md'],
  ['agent-runtime.config.template.v1.yaml', 'agent-runtime.config.v1.yaml'],
  ['documentation-policy.template.v1.json', 'docs/agent-instructions/documentation-policy.v1.json'],
];
const requiredInstructions = [
  'development-lifecycle.md',
  'agent-allocation.md',
  'request-clarification.md',
  'adaptive-reporting.md',
  'requirement-routing.md',
  'knowledge-graph.md',
];
/** @template T @param {readonly T[]} values @param {number} index @param {string} label @returns {T} */
function requireEntry<T>(values: readonly T[], index: number, label: string): T {
  const entry = values[index];
  if (entry === undefined) throw new Error(`${label} is missing`);
  return entry;
}
/** @param {string | Uint8Array} bytes */
const hash = (bytes: string | Uint8Array): string => new Bun.CryptoHasher('sha256').update(bytes).digest('hex');

function assertPreservedOutput(access: SafeRepositoryAccess, entry: CleanInitializationPreservedFile): Buffer {
  const identify = access.observeReadOnlyFileIdentity ?? access.observeFileIdentity;
  const capture = access.readVerifiedCaptureBytes;
  if (!identify || !capture) throw new Error('Preserved initialization output requires verified file capture');
  const parent = path.posix.dirname(entry.path);
  const parentIdentity = access.directoryIdentity(parent, 'preserved initialization output parent');
  const identity = identify(entry.path, 'preserved initialization output');
  const bytes = capture(entry.path, 'preserved initialization output', 8 * 1024 * 1024);
  if (
    identity !== entry.identity ||
    identify(entry.path, 'preserved initialization output') !== entry.identity ||
    bytes.length !== entry.size ||
    hash(bytes) !== entry.sha256 ||
    access.directoryIdentity(parent, 'preserved initialization output parent') !== parentIdentity
  )
    throw new Error('Preserved initialization output changed: ' + entry.path);
  return bytes;
}

function applyPreservedOutputs(
  access: SafeRepositoryAccess,
  rendered: RenderedTemplate[],
  preserved: readonly CleanInitializationPreservedFile[] = [],
): void {
  const allowed = new Set(['AGENT.sidecar.md', 'AGENTS.md', 'docs/agent-instructions/documentation-policy.v1.json']);
  const byPath = new Map(preserved.map((entry) => [entry.path, entry]));
  if (byPath.size !== preserved.length || [...byPath.keys()].some((item) => !allowed.has(item)))
    throw new Error('Unsupported preserved initialization output');
  for (const entry of rendered) {
    const before = byPath.get(entry.output);
    if (!before) continue;
    const bytes = assertPreservedOutput(access, before);
    entry.content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    entry.output_sha256 = hash(bytes);
  }
  if ([...byPath.keys()].some((output) => !rendered.some((entry) => entry.output === output)))
    throw new Error('Preserved initialization output is not produced by this runtime');
}

/** @param {string} raw @param {Record<string, string>} values */
function render(raw: string, values: Record<string, string>): string {
  const replaceTemplateValue = (_match: string, key: string): string => {
    const descriptor = Object.getOwnPropertyDescriptor(values, key);
    if (typeof descriptor?.value !== 'string') throw new Error('Unknown template parameter: ' + key);
    return descriptor.value;
  };
  const text = raw.replace(/\{\{([A-Z_]+)\}\}/g, replaceTemplateValue);
  if (/\{\{|\}\}/.test(text)) throw new Error('Malformed template parameter');
  return text;
}

/** @param {string} root @param {string} relative */
function withinProject(root: string, relative: string): string {
  return root === '.' ? relative : relative === '.' ? root : `${root}/${relative}`;
}

/** @param {AgentRuntimeConfig} config @param {readonly ProjectMapping[]} mappings @returns {AgentRuntimeConfig} */
function expandProjectSet(config: AgentRuntimeConfig, mappings: readonly ProjectMapping[]): AgentRuntimeConfig {
  if (config.schema !== 'AgentRuntimeConfig/v1')
    throw new Error('Project mapping expansion requires a legacy neutral template');
  const projectTemplate = config.projects[0];
  const integrationTemplate = config.integrations.providers[0];
  if (!projectTemplate || !integrationTemplate) throw new Error('Neutral template must define one project integration');
  const projects = mappings.map(({ id: project, root }) => ({
    ...structuredClone(projectTemplate),
    project_id: project,
    title: project,
    delivery_group: project,
    project_root: root,
    wiki_root: withinProject(root, projectTemplate.wiki_root),
    wiki_path: withinProject(root, projectTemplate.wiki_path),
    wiki_output_root: withinProject(root, projectTemplate.wiki_output_root),
    internal_root: withinProject(root, projectTemplate.internal_root),
    ledger_root: withinProject(root, projectTemplate.ledger_root),
    code_selectors: projectTemplate.code_selectors.map((selector) => withinProject(root, selector)),
  }));
  const providers = mappings.map(({ id: project }) => ({
      ...structuredClone(integrationTemplate),
      id: `local-${project}`,
      project_id: project,
      namespace: project,
    })),
    teams = Object.fromEntries(
      Object.entries(config.teams).map(([name, team]) => [
        name,
        {
          ...structuredClone(team),
          allowed_projects: mappings.map((entry) => entry.id),
        },
      ]),
    );
  return {
    ...structuredClone(config),
    projects,
    integrations: { ...config.integrations, providers },
    teams,
  };
}

/** @param {unknown} value @param {string} label */
function requireCanonicalAbsolute(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !path.isAbsolute(value) || path.resolve(value) !== value)
    throw new Error(`Initialization requires an explicit canonical absolute ${label}`);
}

/** @param {unknown} repository */
function requireRepositorySlug(repository: unknown): asserts repository is string {
  if (typeof repository !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(repository))
    throw new Error('Repository must be a lowercase slug of 1–64 characters');
}

/** @param {unknown} value @returns {value is { readonly name: string }} */
function isPackageManifest(value: unknown): value is { readonly name: string } {
  return typeof value === 'object' && value !== null && 'name' in value && typeof value.name === 'string';
}

/** @param {string} projectRoot @param {string} bundleRoot */
function portableBundlePath(projectRoot: string, bundleRoot: string): string {
  const bundle = path.relative(projectRoot, bundleRoot).replaceAll(path.sep, '/');
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(bundle) ||
    bundle.split('/').some((part) => !part || part === '..' || part === '.')
  ) {
    return 'vida-agent';
  }
  return bundle;
}

function requireInitializationRuntime(): void {
  if (!isBunRuntime) throw new Error('Project initialization requires the pinned Bun runtime.');
}

function readInitializationConfig(_access: InitializationObservation, root: string): AgentRuntimeConfig {
  return requireRuntimeModule(runtimeConfig).readRuntimeConfigurationForObservation(root).config;
}

/** @param {{ readonly projectRoot: string; readonly repository: string; readonly mappings: readonly string[]; readonly bundleRoot: string }} request @returns {InitializationContext} */
function initializationContext({
  projectRoot,
  repository,
  mappings,
  bundleRoot,
}: {
  readonly projectRoot: string;
  readonly repository: string;
  readonly mappings: readonly string[];
  readonly bundleRoot: string;
}): InitializationContext {
  requireInitializationRuntime();
  requireCanonicalAbsolute(projectRoot, 'project root');
  requireRepositorySlug(repository);
  requireCanonicalAbsolute(bundleRoot, 'runtime bundle root');
  const selectedProjects = projectMappings(mappings);
  const bundle = portableBundlePath(projectRoot, bundleRoot);
  const access = requireRuntimeModule(repositoryAccess).requireSafeRepositoryAccess(projectRoot);
  const selectedPackageAccess = requireRuntimeModule(repositoryAccess).requireSafeRepositoryAccess(bundleRoot);
  // Explicit copied bundles remain selected inputs; only the executing package
  // uses its immutable-resource reader. Consumer access keeps its own CAS owner.
  const packageAccess: SafeRepositoryAccess =
    bundleRoot === executingPackageRoot
      ? {
          ...selectedPackageAccess,
          readBytes(target: string, label: string): Buffer {
            return requireRuntimeModule(runtimeConfig).readRuntimePackageResourceBytes(
              selectedPackageAccess,
              target,
              label,
            );
          },
          readText(target: string, label: string): string {
            return requireRuntimeModule(runtimeConfig).readRuntimePackageResourceText(
              selectedPackageAccess,
              target,
              label,
            );
          },
        }
      : selectedPackageAccess;
  /** @type {unknown} */
  const packageManifest: unknown = JSON.parse(packageAccess.readText('package.json', 'runtime package identity'));
  if (!isPackageManifest(packageManifest) || packageManifest.name !== 'vida-agent')
    throw new Error('Runtime package identity differs');
  const canonicalRoot = requireRuntimeModule(workspaceIdentity).canonicalRepositoryRoot(projectRoot);
  if (canonicalRoot !== projectRoot)
    throw new Error('Initialization requires an explicit canonical physical project root');
  access.directoryIdentity('.', 'project root');
  packageAccess.assertDirectory('.', 'runtime package');
  return { access, packageAccess, bundle, canonicalRoot, selectedProjects };
}

/** Observation-only initialization context; the executing package is the only bundle authority. */
export function initializationObservationContext(request: {
  readonly projectRoot: string;
  readonly repository: string;
  readonly projectMappings: readonly string[];
}) {
  const context = initializationContext({
    projectRoot: request.projectRoot,
    repository: request.repository,
    mappings: request.projectMappings,
    bundleRoot: executingPackageRoot,
  });
  const observation = requireRuntimeModule(repositoryAccess).repositoryReadOnlyObservation(context.access);
  return {
    observation,
    bundle: context.bundle,
    canonicalRoot: context.canonicalRoot,
    selectedProjects: context.selectedProjects,
    assertProjectDirectory: (root: string) => context.access.assertDirectory(root, 'configured project root'),
    projectDirectoryIdentity: (root: string) => context.access.directoryIdentity(root, 'configured project root'),
    readPackageBytes: (target: string) => context.packageAccess.readBytes(target, 'executing package resource'),
    packageCodePaths: () =>
      requireRuntimeModule(runtimeConfig)
        .runtimePackageCodePaths('runtime-package', context.packageAccess)
        .map((entry) => entry.slice('runtime-package/'.length)),
    validatePolicy: (config: AgentRuntimeConfig, content: string) =>
      validateProjectDocumentationPolicy(context.packageAccess, config, content),
    describePolicy: (config: AgentRuntimeConfig, content: string) => {
      const policy = validateProjectDocumentationPolicy(context.packageAccess, config, content);
      return {
        policy_sha256: hash(content),
        canonical_roots: [...policy.canonical_roots],
        map_paths: [...policy.map_paths],
        excluded_roots: [...policy.excluded_roots],
        changelog_path: policy.changelog_path ?? null,
      };
    },
    validateReferences: (
      config: AgentRuntimeConfig,
      projection?: readonly {
        readonly oldRoot: string;
        readonly newRoot: string;
        readonly directories: readonly { readonly path: string }[];
        readonly files: readonly { readonly destination: string; readonly bytes: Buffer }[];
      }[],
    ) => {
      const under = (value: string, root: string) => value === root || value.startsWith(root + '/');
      const hidden = (value: string) => projection?.some((move) => under(value, move.oldRoot)) ?? false;
      const file = (value: string) =>
        projection?.flatMap((move) => move.files).find((entry) => entry.destination === value);
      const directory = (value: string) =>
        projection?.some((move) =>
          move.directories.some((entry) => move.newRoot + entry.path.slice(move.oldRoot.length) === value),
        ) ?? false;
      validateGeneratedReferences(
        {
          fileExists: (target, label) =>
            file(target) ? true : hidden(target) ? false : observation.fileExists(target, label),
          readText: (target, label) => {
            const entry = file(target);
            if (entry) return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(entry.bytes);
            if (hidden(target)) throw new Error('Projected source path is unavailable');
            return observation.readText(target, label);
          },
          assertDirectory: (target, label) => {
            if (directory(target)) return;
            if (hidden(target)) throw new Error('Projected source directory is unavailable');
            context.access.assertDirectory(target, label);
          },
        },
        config,
        [],
        context.packageAccess,
      );
    },
    defaultConfig: () => {
      const rendered = renderTemplates(
        context.packageAccess,
        context.bundle,
        request.repository,
        context.selectedProjects,
        '1970-01-01T00:00:00.000Z',
      );
      return configureRenderedTemplates(rendered, context.selectedProjects).validatedConfig;
    },
  };
}

/** @param {SafeRepositoryAccess} access */
function existingInitialization(
  access: Pick<SafeRepositoryAccess, 'fileExists'>,
): { status: string; existing: string[]; next_action: string } | null {
  const required = [...outputs.map(([, output]) => output), initializationReceiptPath()];
  const existing = required.filter((output) => access.fileExists(output, 'initialization output'));
  if (
    (existing.length > 0 && existing.length < required.length) ||
    access.fileExists(pendingReceiptPath, 'pending initialization intent')
  )
    throw new Error(
      JSON.stringify({
        status: 'partial_not_ready',
        ready: false,
        existing,
        missing: required.filter((output) => !existing.includes(output)),
        next_action: access.fileExists(pendingReceiptPath, 'pending initialization intent')
          ? 'Use explicit reconciliation to resume the matching recorded initialization intent.'
          : 'Complete the project-owned integration files, then use explicit reconciliation.',
      }),
    );
  return existing.length
    ? {
        status: 'existing',
        existing,
        next_action: 'Use explicit reconciliation for any partial or existing initialization.',
      }
    : null;
}

/** @param {SafeRepositoryAccess} packageAccess @param {string} bundle @param {string} repository @param {readonly ProjectMapping[]} selectedProjects @param {string} [createdAt] @returns {RenderedTemplate[]} */
function renderTemplates(
  packageAccess: SafeRepositoryAccess,
  bundle: string,
  repository: string,
  selectedProjects: readonly ProjectMapping[],
  createdAt = new Date().toISOString(),
): RenderedTemplate[] {
  const values = {
    REPOSITORY: repository,
    PROJECTS: selectedProjects.map((entry) => entry.id).join(', '),
    PROJECT: requireEntry(selectedProjects, 0, 'Project mapping').id,
    BUNDLE: bundle,
    CREATED_AT: createdAt,
  };
  return outputs.map(([template, output]) => {
    const raw = packageAccess.readBytes(`templates/${template}`, 'initialization template');
    const content = render(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw), values);
    return {
      template: `templates/${template}`,
      template_sha256: hash(raw),
      output,
      output_sha256: hash(content),
      content,
    };
  });
}

/** @param {RenderedTemplate[]} rendered @param {readonly ProjectMapping[]} selectedProjects @returns {{ readonly config: AgentRuntimeConfig; readonly validatedConfig: AgentRuntimeConfig }} */
function configureRenderedTemplates(
  rendered: RenderedTemplate[],
  selectedProjects: readonly ProjectMapping[],
  request?: InitializationRequest,
): { readonly config: AgentRuntimeConfig; readonly validatedConfig: AgentRuntimeConfig } {
  const configTemplate = requireEntry(rendered, 2, 'Runtime configuration template');
  const templateConfig = requireRuntimeModule(runtimeConfig).parseRuntimeConfigYaml(configTemplate.content);
  const expanded = expandProjectSet(templateConfig, selectedProjects);
  const config = request?.productModel
    ? requireRuntimeModule(runtimeConfig).applyProductModelToRuntimeConfig(
        expanded,
        request.productModel,
        request.legacyProjectIdMap === undefined ? {} : { legacy_project_id_map: request.legacyProjectIdMap },
      )
    : expanded;
  configTemplate.content = requireRuntimeModule(yaml).stringify(config);
  configTemplate.output_sha256 = hash(configTemplate.content);
  return {
    config,
    validatedConfig: requireRuntimeModule(runtimeConfig).parseRuntimeConfigYaml(configTemplate.content),
  };
}

/** @param {SafeRepositoryAccess} packageAccess */
function projectDocumentationPolicySchema(packageAccess: SafeRepositoryAccess): object {
  /** @type {unknown} */
  const schema: unknown = JSON.parse(
    packageAccess.readText('schemas/documentation-policy.v1.schema.json', 'documentation policy schema'),
  );
  if (typeof schema !== 'object' || schema === null || Array.isArray(schema))
    throw new Error('Documentation policy schema is invalid');
  return schema;
}

/** @param {SafeRepositoryAccess} packageAccess @param {AgentRuntimeConfig} config @param {string} content @returns {DocumentationPolicy} */
function validateProjectDocumentationPolicy(
  packageAccess: SafeRepositoryAccess,
  config: AgentRuntimeConfig,
  content: string,
): DocumentationPolicy {
  const relative = config.paths.defaults.documentation_policy_path;
  if (relative !== requireEntry(outputs, 3, 'Documentation policy output')[1])
    throw new Error('Generated documentation policy path differs from the configured default');
  const schema = projectDocumentationPolicySchema(packageAccess);
  const selectedSchemaValidator = new (requireRuntimeModule(Ajv2020))({
    strict: true,
    allErrors: true,
    formats: { 'date-time': true },
  }).compile(schema);
  /** @type {unknown} */
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    throw new Error('Documentation policy is not JSON');
  }
  if (!selectedSchemaValidator(value)) throw new Error('Documentation policy does not satisfy selected v1 schema');
  const policy = requireRuntimeModule(documentationPolicy).validateDocumentationPolicy(value, relative);
  if (![config.config_id, config.repository.repository_id].includes(policy.project_id))
    throw new Error('Documentation policy identity differs from the configured repository');
  return policy;
}

/** @param {AgentRuntimeConfig} validatedConfig @param {string} bundle @param {string} repository @param {readonly ProjectMapping[]} selectedProjects */
function validateGeneratedBindings(
  validatedConfig: AgentRuntimeConfig,
  bundle: string,
  repository: string,
  selectedProjects: readonly ProjectMapping[],
): void {
  if (
    [
      validatedConfig.runtime.bundle !== bundle,
      validatedConfig.repository.repository_id !== repository,
      validatedConfig.projects
        .map((entry) => entry.project_id)
        .sort()
        .join(',') !== selectedProjects.map((entry) => entry.id).join(','),
      validatedConfig.integrations.providers.some(
        (provider) => provider.provider !== 'local' || provider.tenant_id !== 'local',
      ),
    ].some(Boolean)
  ) {
    throw new Error('Generated configuration does not match the requested repository, projects and bundle');
  }
  if (validatedConfig.repository.policy !== 'AGENTS.md' || validatedConfig.repository.sidecar !== 'AGENT.sidecar.md') {
    throw new Error('Generated configuration must use the fixed project integration files');
  }
}

/** @param {AgentRuntimeConfig} validatedConfig @param {string} bundle @param {string} repository @param {readonly ProjectMapping[]} selectedProjects */
function validateExistingBindings(
  validatedConfig: AgentRuntimeConfig,
  bundle: string,
  repository: string,
  selectedProjects: readonly ProjectMapping[],
): void {
  const configured = validatedConfig.projects
    .map((entry) => ({ id: entry.project_id, root: entry.project_root }))
    .sort((left, right) => left.id.localeCompare(right.id));
  if (
    validatedConfig.runtime.bundle !== bundle ||
    validatedConfig.repository.repository_id !== repository ||
    JSON.stringify(configured) !== JSON.stringify(selectedProjects) ||
    validatedConfig.repository.policy !== 'AGENTS.md' ||
    validatedConfig.repository.sidecar !== 'AGENT.sidecar.md'
  ) {
    throw new Error('Existing configuration does not match the requested repository, projects and bundle');
  }
}

/** @param {SafeRepositoryAccess} access @param {AgentRuntimeConfig} validatedConfig @param {SafeRepositoryAccess} packageAccess */
function requireConfiguredDirectories(
  access: InitializationReferenceAccess,
  validatedConfig: AgentRuntimeConfig,
  packageAccess: SafeRepositoryAccess,
): void {
  for (const project of validatedConfig.projects)
    access.assertDirectory(project.project_root, 'configured project root ' + project.project_id);
  for (const instruction of requiredInstructions)
    packageAccess.readText(`instructions/${instruction}`, 'configured runtime instruction');
}

/** @param {SafeRepositoryAccess} access @param {AgentRuntimeConfig} validatedConfig @param {readonly RenderedTemplate[]} rendered @returns {Set<string>} */
function requireConfiguredMarkers(
  access: InitializationReferenceAccess,
  validatedConfig: AgentRuntimeConfig,
  rendered: readonly RenderedTemplate[],
): Set<string> {
  const generatedPaths = new Set(rendered.map((entry) => entry.output));
  for (const marker of validatedConfig.repository.root_markers) {
    if (!generatedPaths.has(marker) && !access.fileExists(marker, 'configured root marker'))
      throw new Error('Missing configured root marker');
  }
  return generatedPaths;
}

/** @param {SafeRepositoryAccess} access @param {AgentRuntimeConfig} validatedConfig @param {ReadonlySet<string>} generatedPaths @param {SafeRepositoryAccess} packageAccess */
function requireConfiguredKnowledge(
  access: InitializationReferenceAccess,
  validatedConfig: AgentRuntimeConfig,
  generatedPaths: ReadonlySet<string>,
  packageAccess: SafeRepositoryAccess,
): void {
  for (const source of validatedConfig.knowledge.sources.filter((entry) => entry.kind === 'local')) {
    if (!generatedPaths.has(source.location)) {
      const prefix = validatedConfig.runtime.bundle + '/';
      if (source.location.startsWith(prefix))
        packageAccess.readText(source.location.slice(prefix.length), 'configured package source');
      else access.readText(source.location, 'configured local source');
    }
  }
}

/** @param {SafeRepositoryAccess} access @param {AgentRuntimeConfig} validatedConfig @param {readonly RenderedTemplate[]} rendered @param {SafeRepositoryAccess} packageAccess */
function validateGeneratedReferences(
  access: InitializationReferenceAccess,
  validatedConfig: AgentRuntimeConfig,
  rendered: readonly RenderedTemplate[],
  packageAccess: SafeRepositoryAccess,
): void {
  requireConfiguredDirectories(access, validatedConfig, packageAccess);
  const generatedPaths = requireConfiguredMarkers(access, validatedConfig, rendered);
  requireConfiguredKnowledge(access, validatedConfig, generatedPaths, packageAccess);
}

/**
 * @param {SafeRepositoryAccess} packageAccess @param {string} bundle @param {string} canonicalRoot
 * @param {AgentRuntimeConfig} config @param {AgentRuntimeConfig} validatedConfig
 * @param {readonly (RenderedTemplate | TemplateEvidence)[]} rendered
 * @param {'generated' | 'adopted_existing'} [provenance] @param {string} [createdAt]
 * @returns {{ readonly rawSchema: string; readonly receipt: RuntimeInitializationReceipt }}
 */
function buildReceipt(
  packageAccess: SafeRepositoryAccess,
  bundle: string,
  canonicalRoot: string,
  config: AgentRuntimeConfig,
  validatedConfig: AgentRuntimeConfig,
  rendered: readonly (RenderedTemplate | TemplateEvidence)[],
  provenance: 'generated' | 'adopted_existing' = 'generated',
  createdAt: string = new Date().toISOString(),
): { readonly rawSchema: string; readonly receipt: RuntimeInitializationReceipt } {
  const rawSchema = packageAccess.readText('schemas/runtime-initialization.v1.schema.json', 'initialization schema');
  const receipt: RuntimeInitializationReceipt = {
    schema: 'RuntimeInitialization/v1',
    version: 1,
    provenance,
    repository_id: validatedConfig.repository.repository_id,
    project_ids: validatedConfig.projects.map((entry) => entry.project_id).sort(),
    integrations_digest: requireRuntimeModule(publicIngress).canonicalJsonDigest(validatedConfig.integrations),
    workspace_id: requireRuntimeModule(workspaceIdentity).deriveWorkspaceId(
      validatedConfig.repository.repository_id,
      canonicalRoot,
    ),
    workspace_binding_status: 'pending',
    bundle,
    config_digest: requireRuntimeModule(runtimeConfig).runtimeConfigDigest(config),
    schema_sha256: hash(rawSchema),
    templates: rendered.map(({ template, template_sha256, output, output_sha256 }) => ({
      template,
      template_sha256,
      output,
      output_sha256,
    })),
    created_at: createdAt,
  };
  return { rawSchema, receipt };
}

/** @param {SafeRepositoryAccess} access @param {SafeRepositoryAccess} packageAccess @returns {TemplateEvidence[]} */
function existingOutputEvidence(
  access: Pick<SafeRepositoryAccess, 'readBytes'>,
  packageAccess: SafeRepositoryAccess,
): TemplateEvidence[] {
  return outputs.map(([template, output]) => {
    const templateBytes = packageAccess.readBytes(`templates/${template}`, 'initialization template');
    const outputBytes = access.readBytes(output, 'existing project integration file');
    if (outputBytes.length === 0) throw new Error(`Existing project integration file is empty: ${output}`);
    return {
      template: `templates/${template}`,
      template_sha256: hash(templateBytes),
      output,
      output_sha256: hash(outputBytes),
    };
  });
}

/** @param {SafeRepositoryAccess} access @param {readonly TemplateEvidence[]} evidence @param {string} configDigest @param {string} projectRoot */
function requireUnchangedExistingOutputs(
  access: SafeRepositoryAccess,
  evidence: readonly TemplateEvidence[],
  configDigest: string,
  projectRoot: string,
): void {
  for (const entry of evidence) {
    if (hash(access.readBytes(entry.output, 'existing project integration file')) !== entry.output_sha256)
      throw new Error(`Project integration file changed during reconciliation: ${entry.output}`);
  }
  if (
    requireRuntimeModule(runtimeConfig).runtimeConfigDigest(
      requireRuntimeModule(runtimeConfig).loadRuntimeConfig(projectRoot),
    ) !== configDigest
  )
    throw new Error('Project configuration changed during reconciliation');
}

/** @param {SafeRepositoryAccess} access @param {string} projectRoot @param {string} bundle @param {string} canonicalRoot @param {string} repository @param {readonly ProjectMapping[]} selectedProjects @param {SafeRepositoryAccess} packageAccess @returns {RuntimeInitializationReceipt} */
function validateExistingReceipt(
  access: InitializationObservation,
  projectRoot: string,
  bundle: string,
  canonicalRoot: string,
  repository: string,
  selectedProjects: readonly ProjectMapping[],
  packageAccess: SafeRepositoryAccess,
  preparedIntent?: string,
): RuntimeInitializationReceipt {
  const rawSchema = packageAccess.readText('schemas/runtime-initialization.v1.schema.json', 'initialization schema');
  const receipt = validateReceipt(
    rawSchema,
    JSON.parse(access.readText(initializationReceiptPath(), 'existing initialization receipt')),
  );
  const config = preparedIntent
    ? readPreparedInitializationConfig(
        access,
        projectRoot,
        validateReceipt(rawSchema, JSON.parse(preparedIntent)),
        bundle,
        repository,
        selectedProjects,
      )
    : readInitializationConfig(access, projectRoot);
  validateExistingBindings(config, bundle, repository, selectedProjects);
  const evidence = existingOutputEvidence(access, packageAccess);
  if (
    receipt.workspace_id !== requireRuntimeModule(workspaceIdentity).deriveWorkspaceId(repository, canonicalRoot) ||
    receipt.repository_id !== repository ||
    receipt.bundle !== bundle ||
    JSON.stringify(receipt.project_ids) !== JSON.stringify(selectedProjects.map((entry) => entry.id)) ||
    receipt.config_digest !== requireRuntimeModule(runtimeConfig).runtimeConfigDigest(config) ||
    receipt.integrations_digest !== requireRuntimeModule(publicIngress).canonicalJsonDigest(config.integrations) ||
    JSON.stringify(receipt.templates) !== JSON.stringify(evidence)
  )
    throw new Error('Existing initialization receipt differs; reconciliation cannot replace it');
  return receipt;
}

function readPreparedInitializationConfig(
  access: InitializationObservation,
  projectRoot: string,
  intent: RuntimeInitializationReceipt,
  bundle: string,
  repository: string,
  selectedProjects: readonly ProjectMapping[],
): AgentRuntimeConfig {
  const configPath = requireEntry(outputs, 2, 'Runtime configuration output')[1];
  const expected = intent.templates.find((entry) => entry.output === configPath);
  if (!expected) throw new Error('Prepared initialization has no runtime configuration evidence');
  const bytes = access.readBytes(configPath, 'prepared runtime configuration');
  if (hash(bytes) !== expected.output_sha256) throw new Error('Prepared runtime configuration bytes differ');
  const config = requireRuntimeModule(runtimeConfig).validateRuntimeConfigRepairTargetBytes(bytes, projectRoot);
  if (requireRuntimeModule(runtimeConfig).runtimeConfigDigest(config) !== intent.config_digest)
    throw new Error('Prepared runtime configuration digest differs');
  validateExistingBindings(config, bundle, repository, selectedProjects);
  return config;
}

/** @param {SafeRepositoryAccess} access @param {Buffer} bytes @param {RuntimeInitializationReceipt} receipt */
async function archivePendingIntent(
  access: SafeRepositoryAccess,
  bytes: Buffer,
  receipt: RuntimeInitializationReceipt,
  assertActive: () => void,
): Promise<void> {
  const archive = `.agent/initialization-provenance/${receipt.created_at.replace(/[^0-9]/g, '')}.v1.json`;
  assertActive();
  await access.ensureDirectoryAsync('.agent/initialization-provenance', 'inactive initialization provenance');
  assertActive();
  await access.moveNoReplaceAsync(pendingReceiptPath, archive, hash(bytes), 'archive completed initialization intent');
  assertActive();
}

/** @param {SafeRepositoryAccess} access @param {string} projectRoot @param {string} bundle @param {string} canonicalRoot @param {string} repository @param {readonly ProjectMapping[]} selectedProjects @param {SafeRepositoryAccess} packageAccess */
function preparePendingInitialization(
  access: InitializationObservation,
  bundle: string,
  canonicalRoot: string,
  repository: string,
  selectedProjects: readonly ProjectMapping[],
  packageAccess: SafeRepositoryAccess,
  preparedResume?: ExactPreparedResumeContext,
  productRequest?: InitializationRequest,
): {
  pendingBytes: Buffer;
  intent: RuntimeInitializationReceipt;
  rawSchema: string;
  rendered: RenderedTemplate[];
  existing: { output: string; output_sha256: string }[];
  existingReceipt: RuntimeInitializationReceipt | null;
} {
  const pendingBytes = access.readBytes(pendingReceiptPath, 'pending initialization intent');
  /** @type {unknown} */
  const parsedIntent: unknown = JSON.parse(pendingBytes.toString('utf8'));
  if (
    typeof parsedIntent === 'object' &&
    parsedIntent !== null &&
    'schema' in parsedIntent &&
    (parsedIntent.schema === 'ConsumerConfigurationOperation/v1' ||
      parsedIntent.schema === 'ConsumerConfigurationOperation/v2')
  )
    throw new Error('Pending consumer configuration requires its own recovery');
  const rawSchema = packageAccess.readText('schemas/runtime-initialization.v1.schema.json', 'initialization schema');
  const intent = validateReceipt(rawSchema, parsedIntent);
  if (preparedResume) {
    if (
      !pendingBytes.equals(Buffer.from(preparedResume.intent)) ||
      preparedResume.receipt.provenance !== (preparedResume.preserved.length === 0 ? 'generated' : 'adopted_existing')
    )
      throw new Error('Prepared initialization resume context differs from witnessed intent');
  } else if (intent.provenance !== 'generated' || intent.workspace_binding_status !== 'pending') {
    throw new Error('Pending initialization intent is not a generated recovery intent');
  }
  if (intent.workspace_binding_status !== 'pending')
    throw new Error('Pending initialization intent has no pending workspace binding');
  const rendered = renderTemplates(packageAccess, bundle, repository, selectedProjects, intent.created_at);
  if (preparedResume) applyPreservedOutputs(preparedResume.access, rendered, preparedResume.preserved);
  const { config, validatedConfig } = configureRenderedTemplates(rendered, selectedProjects, productRequest);
  const planned = buildReceipt(
    packageAccess,
    bundle,
    canonicalRoot,
    config,
    validatedConfig,
    rendered,
    preparedResume?.preserved.length ? 'adopted_existing' : 'generated',
    intent.created_at,
  ).receipt;
  if (
    JSON.stringify(intent) !== JSON.stringify(planned) ||
    (preparedResume && JSON.stringify(planned, null, 2) + '\n' !== preparedResume.intent)
  )
    throw new Error('Pending initialization intent differs from the requested identity or current templates');
  if (access.fileExists('agent-runtime.config.v1.yaml', 'owner runtime configuration'))
    requireRuntimeModule(runtimeConfig).assertProjectUpgradeInactive(access);
  if (access.fileExists(initializationReceiptPath(), 'initialization receipt')) {
    const receipt = validateExistingReceipt(
      access,
      canonicalRoot,
      bundle,
      canonicalRoot,
      repository,
      selectedProjects,
      packageAccess,
      preparedResume?.intent,
    );
    if (
      preparedResume &&
      !access
        .readBytes(initializationReceiptPath(), 'existing initialization receipt')
        .equals(Buffer.from(preparedResume.intent))
    )
      throw new Error('Existing initialization receipt differs from witnessed prepared intent');
    if (receipt.created_at !== intent.created_at)
      throw new Error('Canonical receipt belongs to a different initialization operation');
    return { pendingBytes, intent, rawSchema, rendered, existing: [], existingReceipt: receipt };
  }
  const existing = rendered
    .filter((entry) => access.fileExists(entry.output, 'initialization output'))
    .map((entry) => {
      const bytes = access.readBytes(entry.output, 'existing initialization output');
      if (!bytes.length || (entry.output === 'AGENTS.md' && hash(bytes) !== entry.output_sha256))
        throw new Error('Managed AGENTS or empty owner output requires explicit diff resolution');
      return { output: entry.output, output_sha256: hash(bytes) };
    });
  const effectiveConfig = access.fileExists(
    requireEntry(outputs, 2, 'Runtime configuration output')[1],
    'owner runtime configuration',
  )
    ? preparedResume
      ? readPreparedInitializationConfig(
          access,
          canonicalRoot,
          preparedResume.receipt,
          bundle,
          repository,
          selectedProjects,
        )
      : readInitializationConfig(access, canonicalRoot)
    : validatedConfig;
  validateExistingBindings(effectiveConfig, bundle, repository, selectedProjects);
  const policyTemplate = requireEntry(rendered, 3, 'Documentation policy template');
  const policyOutput = requireEntry(outputs, 3, 'Documentation policy output')[1];
  const policy = access.fileExists(policyOutput, 'owner documentation policy')
    ? access.readText(policyOutput, 'owner documentation policy')
    : policyTemplate.content;
  validateProjectDocumentationPolicy(packageAccess, effectiveConfig, policy);
  const missing = rendered.filter((entry) => !existing.some((before) => before.output === entry.output));
  validateGeneratedReferences(access, effectiveConfig, missing, packageAccess);
  return { pendingBytes, intent, rawSchema, rendered, existing, existingReceipt: null };
}

async function resumePendingInitialization(
  access: SafeRepositoryAccess,
  projectRoot: string,
  bundle: string,
  canonicalRoot: string,
  repository: string,
  selectedProjects: readonly ProjectMapping[],
  packageAccess: SafeRepositoryAccess,
  assertActive: () => void,
  preparedResume?: ExactPreparedResumeContext,
  productRequest?: InitializationRequest,
): Promise<{ status: string; receipt: string; config_digest: string }> {
  const observation = requireRuntimeModule(repositoryAccess).repositoryReadOnlyObservation(access);
  const { pendingBytes, intent, rawSchema, rendered, existing, existingReceipt } = preparePendingInitialization(
    { ...observation, assertDirectory: access.assertDirectory },
    bundle,
    canonicalRoot,
    repository,
    selectedProjects,
    packageAccess,
    preparedResume,
    productRequest,
  );
  if (existingReceipt) {
    await archivePendingIntent(access, pendingBytes, intent, assertActive);
    return {
      status: 'resumed_initialization',
      receipt: initializationReceiptPath(),
      config_digest: existingReceipt.config_digest,
    };
  }
  const requireUnchanged = () => {
    if (!access.readBytes(pendingReceiptPath, 'pending initialization intent').equals(pendingBytes))
      throw new Error('Pending initialization intent changed during resume');
    for (const entry of existing)
      if (hash(access.readBytes(entry.output, 'owner initialization output')) !== entry.output_sha256)
        throw new Error('Owner initialization output changed during resume: ' + entry.output);
  };
  assertActive();
  const creator = await access.prepareExclusiveCreation();
  for (const entry of rendered) {
    assertActive();
    requireUnchanged();
    if (existing.some((before) => before.output === entry.output)) continue;
    if (entry.output === requireEntry(outputs, 3, 'Documentation policy output')[1]) {
      await creator.ensureDirectory('docs', 'documentation directory');
      assertActive();
      await creator.ensureDirectory('docs/agent-instructions', 'documentation policy directory');
    }
    assertActive();
    await creator.writeExclusive(entry.output, entry.content, 'known missing initialization output');
    existing.push({ output: entry.output, output_sha256: entry.output_sha256 });
  }
  const configPath = requireEntry(outputs, 2, 'Runtime configuration output')[1];
  const installed = requireRuntimeModule(runtimeConfig).validateRuntimeConfigRepairTargetBytes(
    access.readBytes(configPath, 'newly initialized runtime configuration'),
    projectRoot,
  );
  const evidence = existingOutputEvidence(access, packageAccess);
  const provenance = preparedResume
    ? preparedResume.receipt.provenance
    : evidence.every(
          (entry, index) =>
            entry.output_sha256 ===
            requireEntry(intent.templates, index, 'Initialization template evidence').output_sha256,
        )
      ? 'generated'
      : 'adopted_existing';
  const receipt = buildReceipt(
    packageAccess,
    bundle,
    canonicalRoot,
    installed,
    installed,
    evidence,
    provenance,
    intent.created_at,
  ).receipt;
  if (preparedResume && JSON.stringify(receipt, null, 2) + '\n' !== preparedResume.intent)
    throw new Error('Completed initialization receipt differs from witnessed prepared intent');
  validateReceipt(rawSchema, receipt);
  requireUnchanged();
  assertActive();
  await creator.writeExclusive(
    initializationReceiptPath(),
    JSON.stringify(receipt, null, 2) + '\n',
    'initialization receipt',
  );
  await archivePendingIntent(access, pendingBytes, intent, assertActive);
  return {
    status: 'resumed_initialization',
    receipt: initializationReceiptPath(),
    config_digest: receipt.config_digest,
  };
}

function prepareExistingReconciliation(
  access: InitializationObservation,
  projectRoot: string,
  bundle: string,
  canonicalRoot: string,
  repository: string,
  selectedProjects: readonly ProjectMapping[],
  packageAccess: SafeRepositoryAccess,
  productRequest?: InitializationRequest,
): { receipt: RuntimeInitializationReceipt; existing: boolean; evidence: TemplateEvidence[] } {
  const present = outputs
    .map(([, output]) => output)
    .filter((output) => access.fileExists(output, 'existing project integration file'));
  if (access.fileExists('agent-runtime.config.v1.yaml', 'existing project configuration'))
    requireRuntimeModule(runtimeConfig).assertProjectUpgradeInactive(access);
  if (productRequest?.productModel) {
    const actual = requireRuntimeModule(runtimeConfig).productModelForRuntimeConfig(
      readInitializationConfig(access, projectRoot),
    );
    if (
      requireRuntimeModule(publicIngress).canonicalJsonDigest(actual ?? null) !==
      requireRuntimeModule(publicIngress).canonicalJsonDigest(productRequest.productModel)
    )
      throw new Error('Existing product model differs from initialization request');
  }
  if (access.fileExists(initializationReceiptPath(), 'initialization receipt')) {
    const receipt = validateExistingReceipt(
      access,
      projectRoot,
      bundle,
      canonicalRoot,
      repository,
      selectedProjects,
      packageAccess,
    );
    return { receipt, existing: true, evidence: [] };
  }
  if (present.length !== outputs.length)
    throw new Error('Reconciliation requires all existing project integration files');
  const validatedConfig = readInitializationConfig(access, projectRoot);
  validateExistingBindings(validatedConfig, bundle, repository, selectedProjects);
  validateProjectDocumentationPolicy(
    packageAccess,
    validatedConfig,
    access.readText(requireEntry(outputs, 3, 'Documentation policy output')[1], 'existing documentation policy'),
  );
  validateGeneratedReferences(access, validatedConfig, [], packageAccess);
  const evidence = existingOutputEvidence(access, packageAccess);
  const { rawSchema, receipt } = buildReceipt(
    packageAccess,
    bundle,
    canonicalRoot,
    validatedConfig,
    validatedConfig,
    evidence,
    'adopted_existing',
  );
  validateReceipt(rawSchema, receipt);
  return { receipt, existing: false, evidence };
}

async function reconcileExistingInitialization(
  access: SafeRepositoryAccess,
  projectRoot: string,
  bundle: string,
  canonicalRoot: string,
  repository: string,
  selectedProjects: readonly ProjectMapping[],
  packageAccess: SafeRepositoryAccess,
  assertActive: () => void,
  productRequest?: InitializationRequest,
): Promise<{ status: string; receipt: string; config_digest: string }> {
  const observation = requireRuntimeModule(repositoryAccess).repositoryReadOnlyObservation(access);
  if (observation.fileExists(pendingReceiptPath, 'pending initialization intent'))
    return resumePendingInitialization(
      access,
      projectRoot,
      bundle,
      canonicalRoot,
      repository,
      selectedProjects,
      packageAccess,
      assertActive,
      undefined,
      productRequest,
    );
  const { receipt, existing, evidence } = prepareExistingReconciliation(
    { ...observation, assertDirectory: access.assertDirectory },
    projectRoot,
    bundle,
    canonicalRoot,
    repository,
    selectedProjects,
    packageAccess,
    productRequest,
  );
  if (existing)
    return { status: 'existing', receipt: initializationReceiptPath(), config_digest: receipt.config_digest };
  assertActive();
  const creator = await access.prepareExclusiveCreation();
  requireUnchangedExistingOutputs(access, evidence, receipt.config_digest, projectRoot);
  assertActive();
  await creator.ensureDirectory('.agent', 'initialization receipt directory');
  assertActive();
  await creator.writeExclusive(
    initializationReceiptPath(),
    JSON.stringify(receipt, null, 2) + '\n',
    'initialization receipt',
  );
  return { status: 'reconciled_existing', receipt: initializationReceiptPath(), config_digest: receipt.config_digest };
}

/** @param {string} rawSchema @param {unknown} receipt @returns {RuntimeInitializationReceipt} */
function validateReceipt(rawSchema: string, receipt: unknown): RuntimeInitializationReceipt {
  return requireRuntimeModule(initializationRecord).validateRuntimeInitializationReceipt(receipt, rawSchema);
}

function reportCleanInitializationPhase(phase: string, startedAt: number, details?: Record<string, unknown>): void {
  if (process.env.VIDA_CLEAN_INIT_PHASE_TIMING === '1')
    console.error(
      'C3 initializer phase',
      JSON.stringify({ phase, elapsed_ms: Number((performance.now() - startedAt).toFixed(2)), ...details }),
    );
}

/** @param {SafeRepositoryAccess} access @param {string} projectRoot @param {readonly RenderedTemplate[]} rendered @param {RuntimeInitializationReceipt} receipt */
async function publishInitialization(
  access: SafeRepositoryAccess,
  projectRoot: string,
  rendered: readonly RenderedTemplate[],
  receipt: RuntimeInitializationReceipt,
  assertActive: () => void,
  preserved: readonly CleanInitializationPreservedFile[] = [],
): Promise<{ status: string; receipt: string; config_digest: string }> {
  const startedAt = performance.now();
  assertActive();
  const creator = await access.prepareExclusiveCreation();
  assertActive();
  await creator.ensureDirectory('.agent', 'pending initialization directory');
  const intent = JSON.stringify(receipt, null, 2) + '\n';
  assertActive();
  await creator.writeExclusive(pendingReceiptPath, intent, 'pending initialization intent');
  reportCleanInitializationPhase('publish-pending-receipt', startedAt);
  const preservedPaths = new Set(preserved.map((entry) => entry.path));
  for (const entry of rendered) {
    assertActive();
    if (preservedPaths.has(entry.output)) continue;
    if (entry.output === requireEntry(outputs, 3, 'Documentation policy output')[1]) {
      await creator.ensureDirectory('docs', 'documentation directory');
      assertActive();
      await creator.ensureDirectory('docs/agent-instructions', 'documentation policy directory');
    }
    assertActive();
    reportCleanInitializationPhase('publish-output-write-start', startedAt, {
      output: entry.output,
      output_bytes: Buffer.byteLength(entry.content, 'utf8'),
    });
    await creator.writeExclusive(entry.output, entry.content, 'project integration file');
    reportCleanInitializationPhase('publish-output-write-complete', startedAt, { output: entry.output });
  }
  reportCleanInitializationPhase('publish-rendered-files', startedAt, {
    output_count: rendered.length,
    output_bytes: rendered.reduce((total, entry) => total + Buffer.byteLength(entry.content, 'utf8'), 0),
  });
  assertActive();
  const configPath = requireEntry(outputs, 2, 'Runtime configuration output')[1];
  const installed = requireRuntimeModule(runtimeConfig).validateRuntimeConfigRepairTargetBytes(
    access.readBytes(configPath, 'newly initialized runtime configuration'),
    projectRoot,
  );
  if (requireRuntimeModule(runtimeConfig).runtimeConfigDigest(installed) !== receipt.config_digest)
    throw new Error('Project configuration changed during initialization');
  reportCleanInitializationPhase('publish-config-readback', startedAt);
  assertActive();
  await creator.ensureDirectory('.agent', 'initialization receipt directory');
  assertActive();
  await creator.writeExclusive(
    initializationReceiptPath(),
    JSON.stringify(receipt, null, 2) + '\n',
    'initialization receipt',
  );
  reportCleanInitializationPhase('publish-terminal-receipt', startedAt);
  await archivePendingIntent(access, Buffer.from(intent), receipt, assertActive);
  reportCleanInitializationPhase('publish-archive-pending', startedAt);
  return {
    status: 'initialized',
    receipt: initializationReceiptPath(),
    config_digest: receipt.config_digest,
  };
}

function prepareNewInitialization(
  request: InitializationRequest,
  context: InitializationContext,
): {
  existing: ReturnType<typeof existingInitialization>;
  rendered?: RenderedTemplate[];
  receipt?: RuntimeInitializationReceipt;
} {
  const { access, packageAccess, bundle, canonicalRoot, selectedProjects } = context;
  const observation = requireRuntimeModule(repositoryAccess).repositoryReadOnlyObservation(access);
  if (observation.fileExists(pendingReceiptPath, 'pending initialization intent'))
    preparePendingInitialization(
      { ...observation, assertDirectory: access.assertDirectory },
      bundle,
      canonicalRoot,
      request.repository,
      selectedProjects,
      packageAccess,
      undefined,
      request,
    );
  const existing = existingInitialization(observation);
  if (existing) return { existing };
  return { existing: null, ...renderFreshInitialization(request, context, new Date().toISOString()) };
}

function renderFreshInitialization(
  request: InitializationRequest,
  context: InitializationContext,
  createdAt: string,
  preserved: readonly CleanInitializationPreservedFile[] = [],
) {
  const startedAt = performance.now();
  const { access, packageAccess, bundle, canonicalRoot, selectedProjects } = context;
  const observation = requireRuntimeModule(repositoryAccess).repositoryReadOnlyObservation(access);
  const rendered = renderTemplates(packageAccess, bundle, request.repository, selectedProjects, createdAt);
  reportCleanInitializationPhase('render-templates', startedAt, { output_count: rendered.length });
  applyPreservedOutputs(access, rendered, preserved);
  const { config, validatedConfig } = configureRenderedTemplates(rendered, selectedProjects, request);
  reportCleanInitializationPhase('render-configure', startedAt);
  validateGeneratedBindings(validatedConfig, bundle, request.repository, selectedProjects);
  reportCleanInitializationPhase('render-bindings', startedAt);
  validateProjectDocumentationPolicy(
    packageAccess,
    validatedConfig,
    requireEntry(rendered, 3, 'Documentation policy template').content,
  );
  reportCleanInitializationPhase('render-doc-policy', startedAt);
  validateGeneratedReferences(
    { ...observation, assertDirectory: access.assertDirectory },
    validatedConfig,
    rendered,
    packageAccess,
  );
  reportCleanInitializationPhase('render-references', startedAt);
  const { rawSchema, receipt } = buildReceipt(
    packageAccess,
    bundle,
    canonicalRoot,
    config,
    validatedConfig,
    rendered,
    preserved.length === 0 ? 'generated' : 'adopted_existing',
    createdAt,
  );
  validateReceipt(rawSchema, receipt);
  reportCleanInitializationPhase('render-receipt', startedAt);
  return { rendered, receipt, validatedConfig };
}

async function initializeProjectUnderAdmission(
  request: InitializationRequest,
  bundleRoot: string,
  assertActive: () => void,
): Promise<{ status: string; receipt?: string; config_digest?: string; existing?: string[]; next_action?: string }> {
  const context = initializationContext({
    projectRoot: request.projectRoot,
    repository: request.repository,
    mappings: request.projectMappings,
    bundleRoot,
  });
  const { access, packageAccess, bundle, canonicalRoot, selectedProjects } = context;
  assertActive();
  if (request.reconcileExisting)
    return reconcileExistingInitialization(
      access,
      request.projectRoot,
      bundle,
      canonicalRoot,
      request.repository,
      selectedProjects,
      packageAccess,
      assertActive,
      request,
    );
  const prepared = prepareNewInitialization(request, context);
  if (prepared.existing) return prepared.existing;
  if (!prepared.rendered || !prepared.receipt) throw new Error('Initialization preparation is incomplete');
  return publishInitialization(access, request.projectRoot, prepared.rendered, prepared.receipt, assertActive);
}

type InitConfigAdmissionProof = import('../src/config/storage-read-admission.ts').InitConfigAdmissionProof;
export type PreparedInitialization = Readonly<{
  intent: string;
  rootIdentity: string;
  bundleIdentity: string;
  projectIdentities: readonly string[];
  resourceDigest: string;
  preserved?: readonly CleanInitializationPreservedFile[];
}>;

type ExactPreparedResumeContext = Readonly<{
  access: SafeRepositoryAccess;
  intent: string;
  receipt: RuntimeInitializationReceipt;
  preserved: readonly CleanInitializationPreservedFile[];
}>;

function snapshotInitializationRequest(input: InitializationRequest): InitializationRequest {
  const { projectRoot, repository, projectMappings: mappings, reconcileExisting } = input;
  const model =
    input.productModel === undefined
      ? undefined
      : requireRuntimeModule(productModel).productModelSchema.parse(input.productModel);
  if (input.legacyProjectIdMap !== undefined && model === undefined)
    throw new Error('Legacy project identity mapping requires a complete product model');
  if (model) {
    const selected = requireRuntimeModule(publicIngress).canonicalJsonDigest(projectMappings(mappings));
    const expected = requireRuntimeModule(publicIngress).canonicalJsonDigest(
      model.projects
        .map((project) => ({ id: project.project_id, root: project.project_root }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    );
    if (model.repository.repository_id !== repository || selected !== expected)
      throw new Error('Initialization product model differs from explicit project mappings');
  }
  return Object.freeze({
    projectRoot,
    repository,
    projectMappings: Object.freeze([...mappings]),
    ...(reconcileExisting === undefined ? {} : { reconcileExisting }),
    ...(model === undefined ? {} : { productModel: requireRuntimeModule(publicIngress).freezeJsonValue(model) }),
    ...(input.legacyProjectIdMap === undefined
      ? {}
      : { legacyProjectIdMap: Object.freeze({ ...input.legacyProjectIdMap }) }),
  });
}

function snapshotPreparedInitialization(input: PreparedInitialization): PreparedInitialization {
  const { intent, rootIdentity, bundleIdentity, projectIdentities, resourceDigest, preserved = [] } = input;
  return Object.freeze({
    intent,
    rootIdentity,
    bundleIdentity,
    projectIdentities: Object.freeze([...projectIdentities]),
    resourceDigest,
    preserved: Object.freeze(preserved.map((entry) => Object.freeze({ ...entry }))),
  });
}

function samePreparedInitialization(left: PreparedInitialization, right: PreparedInitialization): boolean {
  return (
    left.intent === right.intent &&
    left.rootIdentity === right.rootIdentity &&
    left.bundleIdentity === right.bundleIdentity &&
    left.resourceDigest === right.resourceDigest &&
    left.projectIdentities.length === right.projectIdentities.length &&
    left.projectIdentities.every((identity, index) => identity === right.projectIdentities[index]) &&
    JSON.stringify(left.preserved ?? []) === JSON.stringify(right.preserved ?? [])
  );
}

/** Capture executing package facts without inspecting any consumer project directory. */
export function captureInitializationRuntimeBinding(): Readonly<{
  version: string;
  bundle_identity: string;
  resource_digest: string;
}> {
  const packageReader = requireRuntimeModule(runtimeConfig);
  const packageAccess = packageReader.runtimePackageAccess();
  const livePackage = requireRuntimeModule(repositoryAccess).requireSafeRepositoryAccess(executingPackageRoot);
  const liveObservation = requireRuntimeModule(repositoryAccess).repositoryReadOnlyObservation(livePackage);
  const resources = [
    'package.json',
    'schemas/runtime-initialization.v1.schema.json',
    'schemas/documentation-policy.v1.schema.json',
    ...outputs.map(([template]) => `templates/${template}`),
    ...requiredInstructions.map((instruction) => `instructions/${instruction}`),
  ];
  let manifestBytes: Buffer | undefined;
  const resourceDigest = hash(
    JSON.stringify(
      resources.map((name) => {
        const fresh = liveObservation.readBytes(name, 'live initialization resource');
        const digest = hash(fresh);
        if (
          digest !== hash(packageReader.readRuntimePackageResourceBytes(packageAccess, name, 'initialization resource'))
        )
          throw new Error('Executing initialization resource changed');
        if (name === 'package.json') manifestBytes = fresh;
        return [name, digest];
      }),
    ),
  );
  if (!manifestBytes) throw new Error('Executing initialization manifest is missing');
  const manifest: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes));
  if (
    !isPackageManifest(manifest) ||
    manifest.name !== 'vida-agent' ||
    !('version' in manifest) ||
    typeof manifest.version !== 'string' ||
    !manifest.version
  )
    throw new Error('Executing initialization package version is invalid');
  return Object.freeze({
    version: manifest.version,
    bundle_identity: livePackage.directoryIdentity('.', 'runtime package'),
    resource_digest: resourceDigest,
  });
}

/** Bind the inputs that the initializer reads, using uncached package observations. */
function preparedInputs(
  request: InitializationRequest,
  createdAt: string,
  preserved: readonly CleanInitializationPreservedFile[] = [],
): PreparedInitialization {
  if (request.reconcileExisting) throw new Error('Prepared initialization requires a fresh request');
  const context = initializationContext({
    projectRoot: request.projectRoot,
    repository: request.repository,
    mappings: request.projectMappings,
    bundleRoot: executingPackageRoot,
  });
  const { receipt } = renderFreshInitialization(request, context, createdAt, preserved);
  const bindings = preparedInitializationBindings(context, preserved);
  return Object.freeze({ intent: JSON.stringify(receipt, null, 2) + '\n', ...bindings });
}

function preparedInitializationBindings(
  context: InitializationContext,
  preserved: readonly CleanInitializationPreservedFile[],
): Omit<PreparedInitialization, 'intent'> {
  const runtime = captureInitializationRuntimeBinding();
  const projectIdentities = context.selectedProjects.map(({ id, root }) =>
    JSON.stringify([id, root, context.access.directoryIdentity(root, 'configured project root')]),
  );
  const rootIdentity = context.access.directoryIdentity('.', 'project root');
  const bundleIdentity = requireRuntimeModule(repositoryAccess)
    .requireSafeRepositoryAccess(executingPackageRoot)
    .directoryIdentity('.', 'runtime package');
  if (bundleIdentity !== runtime.bundle_identity) throw new Error('Executing initialization package changed');
  return Object.freeze({
    rootIdentity,
    bundleIdentity,
    projectIdentities: Object.freeze(projectIdentities),
    resourceDigest: runtime.resource_digest,
    preserved: Object.freeze(preserved.map((entry) => Object.freeze({ ...entry }))),
  });
}

function assertPreparedAdmission(proof: InitConfigAdmissionProof, request: InitializationRequest): void {
  const workspace = requireRuntimeModule(workspaceIdentity).deriveWorkspaceId(request.repository, request.projectRoot);
  requireRuntimeModule(storageAdmission).assertInitConfigAdmission(proof, request.projectRoot, workspace);
}

function assertCleanWitness(
  access: SafeRepositoryObservation,
  expectedHash: string,
  request: InitializationRequest,
  expectedPrepared?: PreparedInitialization,
): Buffer {
  if (!/^[a-f0-9]{64}$/u.test(expectedHash)) throw new Error('Invalid clean pending witness');
  const bytes = access.readBytes(
    requireRuntimeModule(projectPaths).CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH,
    'clean initialization intent',
  );
  const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (hash(bytes) !== expectedHash || typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Clean initialization pending witness differs');
  const record = value as Record<string, unknown>;
  const workspace = requireRuntimeModule(workspaceIdentity).deriveWorkspaceId(request.repository, request.projectRoot);
  if (
    record.schema === 'ConsumerCleanInitializationOperation/v1' &&
    record.version === 1 &&
    record.phase === 'initializing' &&
    record.root === request.projectRoot &&
    record.workspace_id === workspace &&
    request.productModel === undefined &&
    (!expectedPrepared || (expectedPrepared.preserved ?? []).length === 0)
  )
    return bytes;
  const operationRequest = record.request;
  if (
    record.schema === 'ConsumerCleanInitializationOperation/v2' &&
    record.version === 2 &&
    record.root === request.projectRoot &&
    record.workspace_id === workspace &&
    typeof operationRequest === 'object' &&
    operationRequest !== null &&
    !Array.isArray(operationRequest) &&
    (operationRequest as Record<string, unknown>).projectRoot === request.projectRoot &&
    (operationRequest as Record<string, unknown>).repository === request.repository &&
    JSON.stringify((operationRequest as Record<string, unknown>).projectMappings) ===
      JSON.stringify(request.projectMappings) &&
    Array.isArray(record.preserved)
  ) {
    if (request.productModel !== undefined) {
      const operation = requireRuntimeModule(cleanInitializationCodec).validateCleanInitializationOperationV2(record);
      const original = operation.inventory.find((entry) => entry.path === 'agent-runtime.config.v1.yaml');
      const move = operation.moves.find((entry) => entry.source === 'agent-runtime.config.v1.yaml');
      if (!original || !move || move.state !== 'completed')
        throw new Error('Product initialization requires the completed original configuration archive');
      const archived = access.readBytes(move.target, 'archived product configuration witness');
      if (archived.length !== original.size || hash(archived) !== original.sha256)
        throw new Error('Archived product configuration witness changed');
      const config = requireRuntimeModule(runtimeConfig).parseRuntimeConfigYaml(
        new TextDecoder('utf-8', { fatal: true }).decode(archived),
      );
      const model = requireRuntimeModule(runtimeConfig).productModelForRuntimeConfig(config);
      if (
        requireRuntimeModule(publicIngress).canonicalJsonDigest(model ?? null) !==
        requireRuntimeModule(publicIngress).canonicalJsonDigest(request.productModel)
      )
        throw new Error('Product initialization differs from the clean operation configuration');
    }
    if (
      !expectedPrepared &&
      record.phase === 'archive_complete' &&
      record.prepared === null &&
      record.initialization === 'not-started'
    )
      return bytes;
    const stored = record.prepared;
    if (
      expectedPrepared &&
      ((record.phase === 'initializing' &&
        (record.initialization === 'issued' || record.initialization === 'completed')) ||
        (record.phase === 'complete' && record.initialization === 'completed')) &&
      typeof stored === 'object' &&
      stored !== null &&
      !Array.isArray(stored) &&
      (stored as Record<string, unknown>).intent === expectedPrepared.intent &&
      (stored as Record<string, unknown>).rootIdentity === expectedPrepared.rootIdentity &&
      (stored as Record<string, unknown>).bundleIdentity === expectedPrepared.bundleIdentity &&
      (stored as Record<string, unknown>).resourceDigest === expectedPrepared.resourceDigest &&
      JSON.stringify((stored as Record<string, unknown>).projectIdentities) ===
        JSON.stringify(expectedPrepared.projectIdentities) &&
      JSON.stringify(record.preserved) === JSON.stringify(expectedPrepared.preserved ?? [])
    )
      return bytes;
  }
  throw new Error('Clean initialization pending witness differs');
}

/** Read-only. The caller owns the clean journal and must supply its current pending-byte hash. */
export function prepareInitializationUnderAdmission(
  proof: InitConfigAdmissionProof,
  inputRequest: InitializationRequest,
  cleanPendingHash: string,
): PreparedInitialization {
  const request = snapshotInitializationRequest(inputRequest);
  assertPreparedAdmission(proof, request);
  const access = requireRuntimeModule(repositoryAccess).repositoryReadOnlyObservation(
    requireRuntimeModule(repositoryAccess).requireSafeRepositoryAccess(request.projectRoot),
  );
  const bytes = assertCleanWitness(access, cleanPendingHash, request);
  if (access.fileExists(pendingReceiptPath, 'pending initialization intent'))
    throw new Error('Legacy initialization intent already exists');
  const cleanRecord = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as {
    schema?: string;
    preserved?: readonly CleanInitializationPreservedFile[];
  };
  const preserved =
    cleanRecord.schema === 'ConsumerCleanInitializationOperation/v2' ? (cleanRecord.preserved ?? []) : [];
  const preservedPaths = new Set(preserved.map((entry) => entry.path));
  for (const [, output] of outputs)
    if (access.fileExists(output, 'initialization output') && !preservedPaths.has(output))
      throw new Error('Fresh initialization output already exists');
  if (access.fileExists(initializationReceiptPath(), 'initialization receipt'))
    throw new Error('Fresh initialization receipt already exists');
  const prepared = preparedInputs(request, new Date().toISOString(), preserved);
  assertPreparedAdmission(proof, request);
  if (
    !assertCleanWitness(access, cleanPendingHash, request).equals(bytes) ||
    access.fileExists(pendingReceiptPath, 'pending initialization intent')
  )
    throw new Error('Clean initialization pending witness changed');
  return prepared;
}

/** Resume only the exact journaled legacy intent; a matching archived receipt is a read-only lost-ack result. */
export async function finishPreparedInitializationUnderAdmission(
  proof: InitConfigAdmissionProof,
  inputRequest: InitializationRequest,
  inputPrepared: PreparedInitialization,
  cleanPendingHash: string,
): Promise<{ status: string; receipt: string; config_digest: string }> {
  const phaseStartedAt = performance.now();
  const request = snapshotInitializationRequest(inputRequest);
  assertPreparedAdmission(proof, request);
  if (request.reconcileExisting) throw new Error('Prepared initialization requires a fresh request');
  const prepared = snapshotPreparedInitialization(inputPrepared);
  const parsed: unknown = JSON.parse(prepared.intent);
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('created_at' in parsed) ||
    typeof parsed.created_at !== 'string'
  )
    throw new Error('Invalid prepared initialization intent');
  const createdAt = parsed.created_at;
  const context = initializationContext({
    projectRoot: request.projectRoot,
    repository: request.repository,
    mappings: request.projectMappings,
    bundleRoot: executingPackageRoot,
  });
  const beforeRendering = {
    ...preparedInitializationBindings(context, prepared.preserved ?? []),
    intent: prepared.intent,
  };
  if (!samePreparedInitialization(beforeRendering, prepared)) throw new Error('Prepared initialization inputs changed');
  assertCleanWitness(
    requireRuntimeModule(repositoryAccess).repositoryReadOnlyObservation(context.access),
    cleanPendingHash,
    request,
    prepared,
  );
  const regenerated = renderFreshInitialization(request, context, createdAt, prepared.preserved ?? []);
  const expectedIntent = JSON.stringify(regenerated.receipt, null, 2) + '\n';
  if (expectedIntent !== prepared.intent) throw new Error('Prepared initialization inputs changed');
  const assertCurrent = () => {
    assertPreparedAdmission(proof, request);
    const currentContext = initializationContext({
      projectRoot: request.projectRoot,
      repository: request.repository,
      mappings: request.projectMappings,
      bundleRoot: executingPackageRoot,
    });
    const current = {
      ...preparedInitializationBindings(currentContext, prepared.preserved ?? []),
      intent: expectedIntent,
    };
    if (!samePreparedInitialization(current, prepared)) throw new Error('Prepared initialization inputs changed');
    const expected = JSON.parse(current.intent) as RuntimeInitializationReceipt;
    const access = requireRuntimeModule(repositoryAccess).repositoryReadOnlyObservation(currentContext.access);
    assertCleanWitness(access, cleanPendingHash, request, prepared);
    for (const entry of prepared.preserved ?? []) assertPreservedOutput(currentContext.access, entry);
    validateGeneratedReferences(
      { ...access, assertDirectory: currentContext.access.assertDirectory },
      regenerated.validatedConfig,
      regenerated.rendered,
      currentContext.packageAccess,
    );
    for (const entry of expected.templates)
      if (
        access.fileExists(entry.output, 'initialization output') &&
        hash(access.readBytes(entry.output, 'initialization output')) !== entry.output_sha256
      )
        throw new Error('Prepared initialization output differs');
    if (
      access.fileExists(initializationReceiptPath(), 'initialization receipt') &&
      !access.readBytes(initializationReceiptPath(), 'initialization receipt').equals(Buffer.from(current.intent))
    )
      throw new Error('Prepared initialization receipt differs');
  };
  assertCurrent();
  reportCleanInitializationPhase('finish-initial-current', phaseStartedAt);
  reportCleanInitializationPhase('finish-context', phaseStartedAt);
  const access = context.access;
  if (!access.fileExists(pendingReceiptPath, 'pending initialization intent')) {
    const archive = `.agent/initialization-provenance/${parsed.created_at.replace(/[^0-9]/g, '')}.v1.json`;
    const hasArchive = access.fileExists(archive, 'archived initialization intent');
    const hasReceipt = access.fileExists(initializationReceiptPath(), 'initialization receipt');
    if (hasArchive || hasReceipt) {
      if (
        !hasArchive ||
        !hasReceipt ||
        !access.readBytes(archive, 'archived initialization intent').equals(Buffer.from(prepared.intent)) ||
        !access.readBytes(initializationReceiptPath(), 'initialization receipt').equals(Buffer.from(prepared.intent))
      )
        throw new Error('Prepared initialization completion is unknown');
      const observation = requireRuntimeModule(repositoryAccess).repositoryReadOnlyObservation(access);
      const receipt = validateExistingReceipt(
        { ...observation, assertDirectory: access.assertDirectory },
        request.projectRoot,
        context.bundle,
        context.canonicalRoot,
        request.repository,
        context.selectedProjects,
        context.packageAccess,
        prepared.intent,
      );
      assertCurrent();
      return {
        status: 'already_completed',
        receipt: initializationReceiptPath(),
        config_digest: receipt.config_digest,
      };
    }

    reportCleanInitializationPhase('finish-render', phaseStartedAt, { output_count: regenerated.rendered.length });
    const preservedPaths = new Set((prepared.preserved ?? []).map((entry) => entry.path));
    for (const entry of regenerated.rendered)
      if (access.fileExists(entry.output, 'initialization output') && !preservedPaths.has(entry.output))
        throw new Error('Unjournaled initialization output appeared before prepared publication');
    assertCurrent();
    const result = await publishInitialization(
      access,
      request.projectRoot,
      regenerated.rendered,
      regenerated.receipt,
      assertCurrent,
      prepared.preserved ?? [],
    );
    reportCleanInitializationPhase('finish-publish', phaseStartedAt);
    return result;
  }
  if (!access.readBytes(pendingReceiptPath, 'pending initialization intent').equals(Buffer.from(prepared.intent)))
    throw new Error('Pending initialization intent differs from prepared bytes');
  const preparedResume: ExactPreparedResumeContext = Object.freeze({
    access,
    intent: prepared.intent,
    receipt: regenerated.receipt,
    preserved: Object.freeze((prepared.preserved ?? []).map((entry) => Object.freeze({ ...entry }))),
  });
  const archive = `.agent/initialization-provenance/${parsed.created_at.replace(/[^0-9]/g, '')}.v1.json`;
  if (access.fileExists(archive, 'archived initialization intent'))
    throw new Error('Pending and archived initialization intents conflict');
  const result = await resumePendingInitialization(
    access,
    request.projectRoot,
    context.bundle,
    context.canonicalRoot,
    request.repository,
    context.selectedProjects,
    context.packageAccess,
    assertCurrent,
    preparedResume,
    request,
  );
  assertCurrent();
  return result;
}

/** All legacy initialization effects share the configuration admission gate. */
export async function initializeProjectFromBundle(
  inputRequest: InitializationRequest,
  bundleRoot: string,
): Promise<{ status: string; receipt?: string; config_digest?: string; existing?: string[]; next_action?: string }> {
  const request = snapshotInitializationRequest(inputRequest);
  const initial = initializationContext({
    projectRoot: request.projectRoot,
    repository: request.repository,
    mappings: request.projectMappings,
    bundleRoot,
  });
  requireRuntimeModule(projectPaths).assertConsumerCleanInitializationInactive(
    requireRuntimeModule(repositoryAccess).repositoryReadOnlyObservation(initial.access),
  );
  if (request.reconcileExisting) {
    const observation = requireRuntimeModule(repositoryAccess).repositoryReadOnlyObservation(initial.access);
    if (observation.fileExists(pendingReceiptPath, 'pending initialization intent'))
      preparePendingInitialization(
        { ...observation, assertDirectory: initial.access.assertDirectory },
        initial.bundle,
        initial.canonicalRoot,
        request.repository,
        initial.selectedProjects,
        initial.packageAccess,
        undefined,
        request,
      );
    else {
      const prepared = prepareExistingReconciliation(
        { ...observation, assertDirectory: initial.access.assertDirectory },
        request.projectRoot,
        initial.bundle,
        initial.canonicalRoot,
        request.repository,
        initial.selectedProjects,
        initial.packageAccess,
        request,
      );
      if (prepared.existing)
        return {
          status: 'existing',
          receipt: initializationReceiptPath(),
          config_digest: prepared.receipt.config_digest,
        };
    }
  } else {
    const prepared = prepareNewInitialization(request, initial);
    if (prepared.existing) return prepared.existing;
  }
  const rootIdentity = initial.access.directoryIdentity('.', 'project root');
  const bundleIdentity = initial.packageAccess.directoryIdentity('.', 'runtime package');
  const workspaceId = requireRuntimeModule(workspaceIdentity).deriveWorkspaceId(
    request.repository,
    initial.canonicalRoot,
  );
  return requireRuntimeModule(storageAdmission).withExclusiveInitConfigAdmission(
    initial.canonicalRoot,
    workspaceId,
    async ({ assertActive }) => {
      assertActive();
      requireRuntimeModule(projectPaths).assertConsumerCleanInitializationInactive(
        requireRuntimeModule(repositoryAccess).repositoryReadOnlyObservation(initial.access),
      );
      const current = initializationContext({
        projectRoot: request.projectRoot,
        repository: request.repository,
        mappings: request.projectMappings,
        bundleRoot,
      });
      if (
        current.canonicalRoot !== initial.canonicalRoot ||
        current.access.directoryIdentity('.', 'project root') !== rootIdentity ||
        current.packageAccess.directoryIdentity('.', 'runtime package') !== bundleIdentity
      )
        throw new Error('Initialization root or executing bundle changed before admission');
      const result = await initializeProjectUnderAdmission(request, bundleRoot, assertActive);
      assertActive();
      return result;
    },
  );
}

/** Internal receipt preparation only; the caller owns admission, journal and CAS. */
export async function derivePendingConfigurationReceipt(
  request: import('./init-configuration.ts').VersionedConsumerConfigurationRequest,
  assertActive: () => void,
  recovery?: import('./init-configuration.ts').ConfigurationRecovery,
): Promise<{
  readonly plan: import('./init-configuration.ts').ConsumerConfigurationPlan;
  readonly beforeReceipt: Buffer;
  readonly targetReceipt: string;
}> {
  assertActive();
  const {
    captureConsumerConfiguration,
    captureConsumerConfigurationForRecovery,
    consumerConfigurationProjectMappings,
  } = await import('./init-configuration.ts');
  assertActive();
  const capture = recovery
    ? captureConsumerConfigurationForRecovery(request, recovery)
    : captureConsumerConfiguration(request);
  if (!capture.receipt) throw new Error('A pending initialization receipt is required');
  const context = initializationContext({
    projectRoot: request.projectRoot,
    repository: request.repository,
    mappings: consumerConfigurationProjectMappings(request),
    bundleRoot: executingPackageRoot,
  });
  const currentBytes = capture.before[2];
  const policyBytes = capture.before[3];
  if (!currentBytes || !policyBytes) throw new Error('Existing initialization outputs are incomplete');
  const decode = (bytes: Uint8Array) => new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  const oldReceipt = validateReceipt(
    context.packageAccess.readText('schemas/runtime-initialization.v1.schema.json', 'initialization schema'),
    JSON.parse(decode(capture.receipt)),
  );
  if (oldReceipt.workspace_binding_status !== 'pending') throw new Error('Initialization receipt workspace is bound');
  const target = requireRuntimeModule(runtimeConfig).parseRuntimeConfigYaml(capture.targetConfig);
  validateExistingBindings(target, context.bundle, request.repository, context.selectedProjects);
  validateProjectDocumentationPolicy(context.packageAccess, target, capture.targetPolicy);
  const evidence = outputs.map(([template, output], index) => ({
    template: `templates/${template}`,
    template_sha256: hash(context.packageAccess.readBytes(`templates/${template}`, 'initialization template')),
    output,
    output_sha256:
      index === 2
        ? hash(capture.targetConfig)
        : index === 3
          ? hash(capture.targetPolicy)
          : hash(capture.before[index]!),
  }));
  const built = buildReceipt(
    context.packageAccess,
    context.bundle,
    context.canonicalRoot,
    target,
    target,
    evidence,
    request.schema === 'ConsumerConfigurationRequest/v3' ? 'adopted_existing' : oldReceipt.provenance,
    oldReceipt.created_at,
  );
  const receipt =
    oldReceipt.provenance === undefined && request.schema !== 'ConsumerConfigurationRequest/v3'
      ? Object.fromEntries(Object.entries(built.receipt).filter(([key]) => key !== 'provenance'))
      : built.receipt;
  validateReceipt(built.rawSchema, receipt);
  assertActive();
  const checked = recovery
    ? captureConsumerConfigurationForRecovery(request, recovery)
    : captureConsumerConfiguration(request);
  if (
    checked.plan.binding !== capture.plan.binding ||
    !checked.receipt?.equals(capture.receipt) ||
    checked.targetConfig !== capture.targetConfig ||
    checked.targetPolicy !== capture.targetPolicy
  )
    throw new Error('Receipt inputs changed during derivation');
  return { plan: capture.plan, beforeReceipt: capture.receipt, targetReceipt: JSON.stringify(receipt, null, 2) + '\n' };
}
