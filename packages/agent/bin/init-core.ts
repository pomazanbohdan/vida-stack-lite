import { projectMappings } from './project-mapping-contract.ts';
import { createHash } from 'node:crypto';
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

type AgentRuntimeConfig = import('../src/config/runtime-config.ts').AgentRuntimeConfig;
type SafeRepositoryAccess = import('../src/config/safe-repository-access.ts').SafeRepositoryAccess;
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
type InitializationRequest = {
  readonly projectRoot: string;
  readonly repository: string;
  readonly projectMappings: readonly string[];
  readonly reconcileExisting?: boolean;
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
const hash = (bytes: string | Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

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

/** @param {SafeRepositoryAccess} access */
function existingInitialization(
  access: SafeRepositoryAccess,
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
): { readonly config: AgentRuntimeConfig; readonly validatedConfig: AgentRuntimeConfig } {
  const configTemplate = requireEntry(rendered, 2, 'Runtime configuration template');
  const templateConfig = requireRuntimeModule(runtimeConfig).parseRuntimeConfigYaml(configTemplate.content);
  const config = expandProjectSet(templateConfig, selectedProjects);
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
  access: SafeRepositoryAccess,
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
  access: SafeRepositoryAccess,
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
  access: SafeRepositoryAccess,
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
  access: SafeRepositoryAccess,
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

/** @param {SafeRepositoryAccess} access @param {string} bundle @param {SafeRepositoryAccess} packageAccess @returns {TemplateEvidence[]} */
function existingOutputEvidence(
  access: SafeRepositoryAccess,
  bundle: string,
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
  access: SafeRepositoryAccess,
  projectRoot: string,
  bundle: string,
  canonicalRoot: string,
  repository: string,
  selectedProjects: readonly ProjectMapping[],
  packageAccess: SafeRepositoryAccess,
): RuntimeInitializationReceipt {
  const rawSchema = packageAccess.readText('schemas/runtime-initialization.v1.schema.json', 'initialization schema');
  const receipt = validateReceipt(
    rawSchema,
    JSON.parse(access.readText(initializationReceiptPath(), 'existing initialization receipt')),
  );
  const config = requireRuntimeModule(runtimeConfig).loadRuntimeConfig(projectRoot);
  validateExistingBindings(config, bundle, repository, selectedProjects);
  const evidence = existingOutputEvidence(access, bundle, packageAccess);
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

/** @param {SafeRepositoryAccess} access @param {Buffer} bytes @param {RuntimeInitializationReceipt} receipt */
async function archivePendingIntent(
  access: SafeRepositoryAccess,
  bytes: Buffer,
  receipt: RuntimeInitializationReceipt,
): Promise<void> {
  const archive = `.agent/initialization-provenance/${receipt.created_at.replace(/[^0-9]/g, '')}.v1.json`;
  await access.ensureDirectoryAsync('.agent/initialization-provenance', 'inactive initialization provenance');
  await access.moveNoReplaceAsync(pendingReceiptPath, archive, hash(bytes), 'archive completed initialization intent');
}

/** @param {SafeRepositoryAccess} access @param {string} projectRoot @param {string} bundle @param {string} canonicalRoot @param {string} repository @param {readonly ProjectMapping[]} selectedProjects @param {SafeRepositoryAccess} packageAccess */
async function resumePendingInitialization(
  access: SafeRepositoryAccess,
  projectRoot: string,
  bundle: string,
  canonicalRoot: string,
  repository: string,
  selectedProjects: readonly ProjectMapping[],
  packageAccess: SafeRepositoryAccess,
): Promise<{ status: string; receipt: string; config_digest: string }> {
  const pendingBytes = access.readBytes(pendingReceiptPath, 'pending initialization intent');
  /** @type {unknown} */
  const parsedIntent: unknown = JSON.parse(pendingBytes.toString('utf8'));
  const rawSchema = packageAccess.readText('schemas/runtime-initialization.v1.schema.json', 'initialization schema');
  const intent = validateReceipt(rawSchema, parsedIntent);
  if (intent.provenance !== 'generated' || intent.workspace_binding_status !== 'pending')
    throw new Error('Pending initialization intent is not a generated recovery intent');
  const rendered = renderTemplates(packageAccess, bundle, repository, selectedProjects, intent.created_at);
  const { config, validatedConfig } = configureRenderedTemplates(rendered, selectedProjects);
  const planned = buildReceipt(
    packageAccess,
    bundle,
    canonicalRoot,
    config,
    validatedConfig,
    rendered,
    'generated',
    intent.created_at,
  ).receipt;
  if (JSON.stringify(intent) !== JSON.stringify(planned))
    throw new Error('Pending initialization intent differs from the requested identity or current templates');
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
    if (receipt.created_at !== intent.created_at)
      throw new Error('Canonical receipt belongs to a different initialization operation');
    await archivePendingIntent(access, pendingBytes, intent);
    return {
      status: 'resumed_initialization',
      receipt: initializationReceiptPath(),
      config_digest: receipt.config_digest,
    };
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
    ? requireRuntimeModule(runtimeConfig).loadRuntimeConfig(projectRoot)
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
  const requireUnchanged = () => {
    if (!access.readBytes(pendingReceiptPath, 'pending initialization intent').equals(pendingBytes))
      throw new Error('Pending initialization intent changed during resume');
    for (const entry of existing)
      if (hash(access.readBytes(entry.output, 'owner initialization output')) !== entry.output_sha256)
        throw new Error('Owner initialization output changed during resume: ' + entry.output);
  };
  const creator = await access.prepareExclusiveCreation();
  for (const entry of rendered) {
    requireUnchanged();
    if (existing.some((before) => before.output === entry.output)) continue;
    if (entry.output === requireEntry(outputs, 3, 'Documentation policy output')[1]) {
      await creator.ensureDirectory('docs', 'documentation directory');
      await creator.ensureDirectory('docs/agent-instructions', 'documentation policy directory');
    }
    await creator.writeExclusive(entry.output, entry.content, 'known missing initialization output');
    existing.push({ output: entry.output, output_sha256: entry.output_sha256 });
  }
  const installed = requireRuntimeModule(runtimeConfig).loadRuntimeConfig(projectRoot);
  const evidence = existingOutputEvidence(access, bundle, packageAccess);
  const provenance = evidence.every(
    (entry, index) =>
      entry.output_sha256 === requireEntry(intent.templates, index, 'Initialization template evidence').output_sha256,
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
  validateReceipt(rawSchema, receipt);
  requireUnchanged();
  await creator.writeExclusive(
    initializationReceiptPath(),
    JSON.stringify(receipt, null, 2) + '\n',
    'initialization receipt',
  );
  await archivePendingIntent(access, pendingBytes, intent);
  return {
    status: 'resumed_initialization',
    receipt: initializationReceiptPath(),
    config_digest: receipt.config_digest,
  };
}

/** @param {SafeRepositoryAccess} access @param {string} projectRoot @param {string} bundle @param {string} canonicalRoot @param {string} repository @param {readonly ProjectMapping[]} selectedProjects @param {SafeRepositoryAccess} packageAccess */
async function reconcileExistingInitialization(
  access: SafeRepositoryAccess,
  projectRoot: string,
  bundle: string,
  canonicalRoot: string,
  repository: string,
  selectedProjects: readonly ProjectMapping[],
  packageAccess: SafeRepositoryAccess,
): Promise<{ status: string; receipt: string; config_digest: string }> {
  if (access.fileExists(pendingReceiptPath, 'pending initialization intent'))
    return resumePendingInitialization(
      access,
      projectRoot,
      bundle,
      canonicalRoot,
      repository,
      selectedProjects,
      packageAccess,
    );
  const present = outputs
    .map(([, output]) => output)
    .filter((output) => access.fileExists(output, 'existing project integration file'));
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
    return { status: 'existing', receipt: initializationReceiptPath(), config_digest: receipt.config_digest };
  }
  if (present.length !== outputs.length)
    throw new Error('Reconciliation requires all existing project integration files');
  const validatedConfig = requireRuntimeModule(runtimeConfig).loadRuntimeConfig(projectRoot);
  validateExistingBindings(validatedConfig, bundle, repository, selectedProjects);
  validateProjectDocumentationPolicy(
    packageAccess,
    validatedConfig,
    access.readText(requireEntry(outputs, 3, 'Documentation policy output')[1], 'existing documentation policy'),
  );
  validateGeneratedReferences(access, validatedConfig, [], packageAccess);
  const evidence = existingOutputEvidence(access, bundle, packageAccess);
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
  const creator = await access.prepareExclusiveCreation();
  requireUnchangedExistingOutputs(access, evidence, receipt.config_digest, projectRoot);
  await creator.ensureDirectory('.agent', 'initialization receipt directory');
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

/** @param {SafeRepositoryAccess} access @param {string} projectRoot @param {readonly RenderedTemplate[]} rendered @param {RuntimeInitializationReceipt} receipt */
async function publishInitialization(
  access: SafeRepositoryAccess,
  projectRoot: string,
  rendered: readonly RenderedTemplate[],
  receipt: RuntimeInitializationReceipt,
): Promise<{ status: string; receipt: string; config_digest: string }> {
  const creator = await access.prepareExclusiveCreation();
  await creator.ensureDirectory('.agent', 'pending initialization directory');
  const intent = JSON.stringify(receipt, null, 2) + '\n';
  await creator.writeExclusive(pendingReceiptPath, intent, 'pending initialization intent');
  for (const entry of rendered) {
    if (entry.output === requireEntry(outputs, 3, 'Documentation policy output')[1]) {
      await creator.ensureDirectory('docs', 'documentation directory');
      await creator.ensureDirectory('docs/agent-instructions', 'documentation policy directory');
    }
    await creator.writeExclusive(entry.output, entry.content, 'project integration file');
  }
  const installed = requireRuntimeModule(runtimeConfig).loadRuntimeConfig(projectRoot);
  if (requireRuntimeModule(runtimeConfig).runtimeConfigDigest(installed) !== receipt.config_digest)
    throw new Error('Project configuration changed during initialization');
  await creator.ensureDirectory('.agent', 'initialization receipt directory');
  await creator.writeExclusive(
    initializationReceiptPath(),
    JSON.stringify(receipt, null, 2) + '\n',
    'initialization receipt',
  );
  await archivePendingIntent(access, Buffer.from(intent), receipt);
  return {
    status: 'initialized',
    receipt: initializationReceiptPath(),
    config_digest: receipt.config_digest,
  };
}

/** @param {InitializationRequest} request @param {string} bundleRoot */
export async function initializeProjectFromBundle(
  request: InitializationRequest,
  bundleRoot: string,
): Promise<{ status: string; receipt?: string; config_digest?: string; existing?: string[]; next_action?: string }> {
  const { projectRoot, repository, projectMappings: mappings, reconcileExisting = false } = request;
  const { access, packageAccess, bundle, canonicalRoot, selectedProjects } = initializationContext({
    projectRoot,
    repository,
    mappings,
    bundleRoot,
  });
  if (reconcileExisting)
    return reconcileExistingInitialization(
      access,
      projectRoot,
      bundle,
      canonicalRoot,
      repository,
      selectedProjects,
      packageAccess,
    );
  const existing = existingInitialization(access);
  if (existing) return existing;
  const createdAt = new Date().toISOString();
  const rendered = renderTemplates(packageAccess, bundle, repository, selectedProjects, createdAt);
  const { config, validatedConfig } = configureRenderedTemplates(rendered, selectedProjects);
  validateGeneratedBindings(validatedConfig, bundle, repository, selectedProjects);
  validateProjectDocumentationPolicy(
    packageAccess,
    validatedConfig,
    requireEntry(rendered, 3, 'Documentation policy template').content,
  );
  validateGeneratedReferences(access, validatedConfig, rendered, packageAccess);
  const { rawSchema, receipt } = buildReceipt(
    packageAccess,
    bundle,
    canonicalRoot,
    config,
    validatedConfig,
    rendered,
    'generated',
    createdAt,
  );
  validateReceipt(rawSchema, receipt);
  return publishInitialization(access, projectRoot, rendered, receipt);
}
