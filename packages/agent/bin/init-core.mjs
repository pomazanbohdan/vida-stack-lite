import { createHash } from 'node:crypto';
import path from 'node:path';

const isBunRuntime = typeof Bun !== 'undefined';
const Ajv2020 = isBunRuntime ? (await import('ajv/dist/2020.js')).default : null;
const runtimeConfig = isBunRuntime ? await import('../src/config/runtime-config.ts') : null;
const publicIngress = isBunRuntime ? await import('../src/contracts/public-ingress.ts') : null;
const repositoryAccess = isBunRuntime ? await import('../src/config/safe-repository-access.ts') : null;
const workspaceIdentity = isBunRuntime ? await import('../src/workspace-identity.ts') : null;
const yaml = isBunRuntime ? await import('yaml') : null;

const receiptPath = '.agent/runtime-initialization.v1.json';
const outputs = [
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
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

function render(raw, values) {
  const text = raw.replace(/\{\{([A-Z_]+)\}\}/g, (_match, key) => {
    if (!Object.hasOwn(values, key)) throw new Error('Unknown template parameter: ' + key);
    return values[key];
  });
  if (/\{\{|\}\}/.test(text)) throw new Error('Malformed template parameter');
  return text;
}

function requireRelativeProjectRoot(value) {
  if (typeof value !== 'string' || !value)
    throw new Error('Project root must be a non-empty safe repository-relative path');
}

function requirePortableProjectRoot(value) {
  if (path.posix.isAbsolute(value) || value.includes('\\'))
    throw new Error('Project root must be a non-empty safe repository-relative path');
}

function requireNormalizedProjectRoot(normalized) {
  if (
    normalized !== '.' &&
    (!normalized || normalized.split('/').some((part) => !part || part === '.' || part === '..'))
  )
    throw new Error('Project root must be a non-empty safe repository-relative path');
}

function normalizeProjectRoot(value) {
  requireRelativeProjectRoot(value);
  requirePortableProjectRoot(value);
  const normalized = value === '.' ? '.' : value.replace(/\/+$/u, '');
  requireNormalizedProjectRoot(normalized);
  return normalized;
}

function requireMappingText(entry) {
  if (typeof entry !== 'string' || !entry) throw new Error('Project mapping must be PROJECT_ID=RELATIVE_ROOT');
}

function splitProjectMapping(entry) {
  const separator = entry.indexOf('=');
  const id = separator < 0 ? entry : entry.slice(0, separator);
  const root = separator < 0 ? null : entry.slice(separator + 1);
  return { id, root };
}

function requireProjectId(id) {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) throw new Error('Project id must be a lowercase slug of 1–64 characters');
}

function normalizedMappingRoot(root) {
  return root === null ? null : normalizeProjectRoot(root);
}

function parseProjectMapping(entry) {
  requireMappingText(entry);
  const { id, root } = splitProjectMapping(entry);
  requireProjectId(id);
  return { id, root: normalizedMappingRoot(root) };
}

function requireExplicitMultiProjectRoots(mappings) {
  if (mappings.length > 1 && mappings.some((entry) => entry.root === null))
    throw new Error('Multi-project initialization requires every --project as PROJECT_ID=RELATIVE_ROOT');
}

function requireUniqueProjectRoots(mappings) {
  if (new Set(mappings.map((entry) => entry.id)).size !== mappings.length)
    throw new Error('Project ids must be unique');
  const roots = mappings.map((entry) => entry.root.toLowerCase());
  if (new Set(roots).size !== roots.length) throw new Error('Project roots must be unique');
  return roots;
}

function requireNonoverlappingProjectRoots(roots) {
  for (const root of roots) {
    if (roots.some((other) => other !== root && (root === '.' || other.startsWith(root + '/'))))
      throw new Error('Project roots must not overlap');
  }
}

function projectMappings(value) {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error('Projects must be a non-empty explicit project mapping set');
  const mappings = value.map(parseProjectMapping);
  requireExplicitMultiProjectRoots(mappings);
  const normalized = mappings.map((entry) => ({ ...entry, root: entry.root ?? '.' }));
  requireNonoverlappingProjectRoots(requireUniqueProjectRoots(normalized));
  return normalized.sort((left, right) => left.id.localeCompare(right.id));
}

function withinProject(root, relative) {
  return root === '.' ? relative : relative === '.' ? root : `${root}/${relative}`;
}

function expandProjectSet(config, mappings) {
  const [projectTemplate] = config.projects;
  const [integrationTemplate] = config.integrations.providers;
  if (!projectTemplate || !integrationTemplate) throw new Error('Neutral template must define one project integration');
  const expanded = structuredClone(config);
  expanded.projects = mappings.map(({ id: project, root }) => ({
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
  expanded.integrations.providers = mappings.map(({ id: project }) => ({
    ...structuredClone(integrationTemplate),
    id: `local-${project}`,
    project_id: project,
    namespace: project,
  }));
  expanded.teams = Object.fromEntries(
    Object.entries(config.teams).map(([name, team]) => [
      name,
      {
        ...structuredClone(team),
        allowed_projects: mappings.map((entry) => entry.id),
      },
    ]),
  );
  return expanded;
}

function requireCanonicalAbsolute(value, label) {
  if (!path.isAbsolute(value ?? '') || path.resolve(value) !== value)
    throw new Error(`Initialization requires an explicit canonical absolute ${label}`);
}

function requireRepositorySlug(repository) {
  if (typeof repository !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(repository))
    throw new Error('Repository must be a lowercase slug of 1–64 characters');
}

function portableBundlePath(projectRoot, bundleRoot) {
  const bundle = path.relative(projectRoot, bundleRoot).replaceAll(path.sep, '/');
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(bundle) ||
    bundle.split('/').some((part) => !part || part === '..' || part === '.')
  ) {
    return 'vida-agent';
  }
  return bundle;
}

function initializationContext({ projectRoot, repository, mappings, bundleRoot }) {
  if (!isBunRuntime) throw new Error('Project initialization requires the pinned Bun runtime.');
  requireCanonicalAbsolute(projectRoot, 'project root');
  requireRepositorySlug(repository);
  requireCanonicalAbsolute(bundleRoot, 'runtime bundle root');
  const selectedProjects = projectMappings(mappings);
  const bundle = portableBundlePath(projectRoot, bundleRoot);
  const access = repositoryAccess.requireSafeRepositoryAccess(projectRoot);
  const packageAccess = repositoryAccess.requireSafeRepositoryAccess(bundleRoot);
  const packageManifest = JSON.parse(packageAccess.readText('package.json', 'runtime package identity'));
  if (packageManifest.name !== 'vida-agent') throw new Error('Runtime package identity differs');
  const canonicalRoot = workspaceIdentity.canonicalRepositoryRoot(projectRoot);
  if (canonicalRoot !== projectRoot)
    throw new Error('Initialization requires an explicit canonical physical project root');
  access.directoryIdentity('.', 'project root');
  packageAccess.assertDirectory('.', 'runtime package');
  return { access, packageAccess, bundle, canonicalRoot, selectedProjects };
}

function existingInitialization(access) {
  const existing = [...outputs.map(([, output]) => output), receiptPath].filter((output) =>
    access.fileExists(output, 'initialization output'),
  );
  return existing.length
    ? {
        status: 'existing',
        existing,
        next_action: 'Use explicit reconciliation for any partial or existing initialization.',
      }
    : null;
}

function renderTemplates(packageAccess, bundle, repository, selectedProjects) {
  const values = {
    REPOSITORY: repository,
    PROJECTS: selectedProjects.map((entry) => entry.id).join(', '),
    PROJECT: selectedProjects[0].id,
    BUNDLE: bundle,
    CREATED_AT: new Date().toISOString(),
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

function configureRenderedTemplates(rendered, selectedProjects) {
  const templateConfig = runtimeConfig.parseRuntimeConfigYaml(rendered[2].content);
  const config = expandProjectSet(templateConfig, selectedProjects);
  rendered[2].content = yaml.stringify(config);
  rendered[2].output_sha256 = hash(rendered[2].content);
  return { config, validatedConfig: runtimeConfig.parseRuntimeConfigYaml(rendered[2].content) };
}

function validateProjectDocumentationPolicy(packageAccess, bundle, config, content) {
  const relative = config.paths.defaults.documentation_policy_path;
  if (relative !== outputs[3][1])
    throw new Error('Generated documentation policy path differs from the configured default');
  const schema = JSON.parse(
    packageAccess.readText('schemas/documentation-policy.v1.schema.json', 'documentation policy schema'),
  );
  const validator = new Ajv2020({ strict: true, allErrors: true, formats: { 'date-time': true } }).compile(schema);
  let policy;
  try {
    policy = JSON.parse(content);
  } catch {
    throw new Error('Documentation policy is not JSON');
  }
  if (!validator(policy)) throw new Error('Documentation policy does not satisfy current v1 schema');
  if (
    policy.source_path !== relative ||
    ![config.config_id, config.repository.repository_id].includes(policy.project_id)
  )
    throw new Error('Documentation policy identity differs from the configured repository');
  if (Number.isNaN(Date.parse(policy.updated_at))) throw new Error('Documentation policy timestamp invalid');
  return policy;
}

function validateGeneratedBindings(validatedConfig, bundle, repository, selectedProjects) {
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

function validateExistingBindings(validatedConfig, bundle, repository, selectedProjects) {
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

function requireConfiguredDirectories(access, validatedConfig, packageAccess) {
  for (const project of validatedConfig.projects)
    access.assertDirectory(project.project_root, 'configured project root ' + project.project_id);
  for (const instruction of requiredInstructions)
    packageAccess.readText(`instructions/${instruction}`, 'configured runtime instruction');
}

function requireConfiguredMarkers(access, validatedConfig, rendered) {
  const generatedPaths = new Set(rendered.map((entry) => entry.output));
  for (const marker of validatedConfig.repository.root_markers) {
    if (!generatedPaths.has(marker) && !access.fileExists(marker, 'configured root marker'))
      throw new Error('Missing configured root marker');
  }
  return generatedPaths;
}

function requireConfiguredKnowledge(access, validatedConfig, generatedPaths, packageAccess) {
  for (const source of validatedConfig.knowledge.sources.filter((entry) => entry.kind === 'local')) {
    if (!generatedPaths.has(source.location)) {
      const prefix = validatedConfig.runtime.bundle + '/';
      if (source.location.startsWith(prefix))
        packageAccess.readText(source.location.slice(prefix.length), 'configured package source');
      else access.readText(source.location, 'configured local source');
    }
  }
}

function validateGeneratedReferences(access, validatedConfig, rendered, packageAccess) {
  requireConfiguredDirectories(access, validatedConfig, packageAccess);
  const generatedPaths = requireConfiguredMarkers(access, validatedConfig, rendered);
  requireConfiguredKnowledge(access, validatedConfig, generatedPaths, packageAccess);
}

function buildReceipt(
  packageAccess,
  bundle,
  canonicalRoot,
  config,
  validatedConfig,
  rendered,
  provenance = 'generated',
) {
  const rawSchema = packageAccess.readText('schemas/runtime-initialization.v1.schema.json', 'initialization schema');
  const receipt = {
    schema: 'RuntimeInitialization/v1',
    version: 1,
    provenance,
    repository_id: validatedConfig.repository.repository_id,
    project_ids: [...validatedConfig.projects.map((entry) => entry.project_id)].sort(),
    integrations_digest: publicIngress.canonicalJsonDigest(validatedConfig.integrations),
    workspace_id: workspaceIdentity.deriveWorkspaceId(validatedConfig.repository.repository_id, canonicalRoot),
    workspace_binding_status: 'pending',
    bundle,
    config_digest: runtimeConfig.runtimeConfigDigest(config),
    schema_sha256: hash(rawSchema),
    templates: rendered.map(({ content: _content, ...entry }) => entry),
    created_at: new Date().toISOString(),
  };
  return { rawSchema, receipt };
}

function existingOutputEvidence(access, bundle, packageAccess) {
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

function requireUnchangedExistingOutputs(access, evidence, configDigest, projectRoot) {
  for (const entry of evidence) {
    if (hash(access.readBytes(entry.output, 'existing project integration file')) !== entry.output_sha256)
      throw new Error(`Project integration file changed during reconciliation: ${entry.output}`);
  }
  if (runtimeConfig.runtimeConfigDigest(runtimeConfig.loadRuntimeConfig(projectRoot)) !== configDigest)
    throw new Error('Project configuration changed during reconciliation');
}

async function reconcileExistingInitialization(
  access,
  projectRoot,
  bundle,
  canonicalRoot,
  repository,
  selectedProjects,
  packageAccess,
) {
  const present = outputs
    .map(([, output]) => output)
    .filter((output) => access.fileExists(output, 'existing project integration file'));
  if (access.fileExists(receiptPath, 'initialization receipt'))
    throw new Error(
      'Existing initialization receipt must be validated by the runtime; reconciliation cannot replace it',
    );
  if (present.length !== outputs.length)
    throw new Error('Reconciliation requires all existing project integration files');
  const validatedConfig = runtimeConfig.loadRuntimeConfig(projectRoot);
  validateExistingBindings(validatedConfig, bundle, repository, selectedProjects);
  validateProjectDocumentationPolicy(
    packageAccess,
    bundle,
    validatedConfig,
    access.readText(outputs[3][1], 'existing documentation policy'),
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
  await creator.writeExclusive(receiptPath, JSON.stringify(receipt, null, 2) + '\n', 'initialization receipt');
  return { status: 'reconciled_existing', receipt: receiptPath, config_digest: receipt.config_digest };
}

function validateReceipt(rawSchema, receipt) {
  const validate = new Ajv2020({ strict: true, allErrors: true }).compile(JSON.parse(rawSchema));
  if (!validate(receipt))
    throw new Error('Initialization receipt does not satisfy current v1: ' + JSON.stringify(validate.errors));
}

async function publishInitialization(access, projectRoot, rendered, receipt) {
  const creator = await access.prepareExclusiveCreation();
  // One exclusive root file arbitrates concurrent initializers; partial output is never silently resumed.
  for (const entry of rendered) {
    if (entry.output === outputs[3][1]) {
      await creator.ensureDirectory('docs', 'documentation directory');
      await creator.ensureDirectory('docs/agent-instructions', 'documentation policy directory');
    }
    await creator.writeExclusive(entry.output, entry.content, 'project integration file');
  }
  const installed = runtimeConfig.loadRuntimeConfig(projectRoot);
  if (runtimeConfig.runtimeConfigDigest(installed) !== receipt.config_digest)
    throw new Error('Project configuration changed during initialization');
  await creator.ensureDirectory('.agent', 'initialization receipt directory');
  await creator.writeExclusive(receiptPath, JSON.stringify(receipt, null, 2) + '\n', 'initialization receipt');
  return {
    status: 'initialized',
    receipt: receiptPath,
    config_digest: receipt.config_digest,
  };
}

export async function initializeProjectFromBundle(
  { projectRoot, repository, projectMappings: mappings, reconcileExisting = false },
  bundleRoot,
) {
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
  const rendered = renderTemplates(packageAccess, bundle, repository, selectedProjects);
  const { config, validatedConfig } = configureRenderedTemplates(rendered, selectedProjects);
  validateGeneratedBindings(validatedConfig, bundle, repository, selectedProjects);
  validateProjectDocumentationPolicy(packageAccess, bundle, validatedConfig, rendered[3].content);
  validateGeneratedReferences(access, validatedConfig, rendered, packageAccess);
  const { rawSchema, receipt } = buildReceipt(packageAccess, bundle, canonicalRoot, config, validatedConfig, rendered);
  validateReceipt(rawSchema, receipt);
  return publishInitialization(access, projectRoot, rendered, receipt);
}
