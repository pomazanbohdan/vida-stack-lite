import { lstatSync } from 'node:fs';
import path from 'node:path';
import {
  PATH_PROFILE_KEYS,
  loadRuntimeConfig,
  runtimeConfigDigest,
  type AgentRuntimeConfig,
  type PathProfileKey,
  type PathProfileOverride,
  type ProcessingScope,
  type RepositoryMode,
  type TrustedPathProfileOverride,
} from './runtime-config.js';
import { canonicalJsonDigest, freezeJsonValue } from '../contracts/public-ingress.js';

export const pathProfileGap = 'GAP-RTNEW-PATH-PROFILE-001' as const;
export class PathProfileError extends Error {
  readonly code = pathProfileGap;
  constructor(message: string) {
    super(message);
    this.name = 'PathProfileError';
  }
}
export type PathProfileLayer = 'root-config' | 'tenant-config' | 'project-config' | 'trusted-override';
export interface PathProfileProvenance {
  readonly layer: PathProfileLayer;
  readonly pointer: string;
}
export interface ResolvedPathProfile {
  readonly schema: 'ResolvedPathProfile/v1';
  readonly repository_root: string;
  readonly repository_mode: RepositoryMode;
  readonly processing_scope: ProcessingScope;
  readonly scope_id: string;
  readonly registry_hash: string | null;
  readonly path_config_hash: string;
  readonly path_identities: Readonly<Record<PathProfileKey, string | null>>;
  readonly paths: Readonly<Record<PathProfileKey, string>>;
  readonly resolved_paths: Readonly<Record<PathProfileKey, string>>;
  readonly provenance: Readonly<Record<PathProfileKey, PathProfileProvenance>>;
  readonly digest: string;
}
export interface ProjectPathBindings {
  readonly schema: 'ProjectPathBindings/v1';
  readonly repository_root: string;
  readonly contour: string;
  readonly provider: 'agent-runtime.config.v1.yaml';
  readonly repository_mode: RepositoryMode;
  readonly processing_scope: ProcessingScope;
  readonly digest: string;
  readonly paths: readonly {
    readonly kind: PathProfileKey;
    readonly relative: string;
    readonly resolved: string;
    readonly expected_type: 'directory' | 'file' | 'file-parent';
    readonly source: PathProfileLayer;
    readonly source_pointer: string;
  }[];
}
export interface ProjectContext {
  readonly schema: 'ProjectContext/v1';
  readonly source: 'runtime-config';
  readonly config_digest: string;
  readonly registry_hash: string;
  readonly integrations_digest: string;
  readonly repository_id: string;
  readonly project_ids: readonly string[];
  readonly repository_title: string;
  /** Every selected project is represented; there is no implicit primary project. */
  readonly project_bindings: readonly ProjectContextProjectBinding[];
  readonly integration_bindings: readonly ProjectIntegrationBinding[];
  readonly path_profiles: readonly ResolvedPathProfile[];
  readonly path_bindings: readonly ProjectPathBindings[];
  readonly project_context_digest: string;
  readonly path_bindings_digest: string;
}
export interface ProjectContextProjectBinding {
  readonly schema: 'ProjectContextProjectBinding/v1';
  readonly project_id: string;
  readonly project_title: string;
  readonly task_prefix: string;
  readonly code_selectors: readonly string[];
  readonly delivery_group: string;
  readonly project_root: string;
  readonly integration_binding: ProjectIntegrationBinding;
  readonly path_profile: ResolvedPathProfile;
  readonly path_bindings: ProjectPathBindings;
}
export interface ProjectIntegrationBinding {
  readonly schema: 'ProjectIntegrationBinding/v1';
  readonly project_id: string;
  readonly provider_id: string;
  readonly provider: string;
  readonly tenant_id: string;
  readonly namespace: string;
  readonly digest: string;
}
export interface PathProfileResolutionOptions {
  readonly processing_scope?: ProcessingScope;
  readonly repository_id?: string;
  readonly project_id?: string;
  readonly trusted_override?: TrustedPathProfileOverride | undefined;
}
export interface ProjectSetContextOptions {
  readonly trusted_overrides?: Readonly<Record<string, TrustedPathProfileOverride | undefined>>;
}

/**
 * The project registry is deliberately path based.  Provider tenant or
 * namespace values do not participate in repository project identity.
 */
export interface ProjectPathResolutionEntry {
  readonly project_id: string;
  readonly project_root?: string;
  readonly path_overrides?: Readonly<{ project_root?: string }>;
}

export interface ProjectPathResolutionOptions {
  readonly platform?: 'win32' | 'posix';
}

export interface ProjectPathResolution {
  readonly project_id: string;
  readonly project_root: string;
  readonly specificity: number;
}

const PATH_KEYS = PATH_PROFILE_KEYS;
const HARD_LINK_CHECK_KINDS = new Set(['file', 'file-parent']);
const TRUSTED_PROJECT_CONTEXTS = new WeakSet<object>();
const TRUSTED_PATH_PROFILE_OVERRIDES = new WeakSet<object>();
const TRUSTED_PATH_PROFILES = new WeakSet<object>();
type AncestorState = { readonly current: string };
type SelectedProject = { readonly repositoryId?: string; readonly projectId?: string };
const noop = (): void => undefined;
function all(...conditions: readonly boolean[]): boolean {
  return conditions.every(Boolean);
}
function any(...conditions: readonly boolean[]): boolean {
  return conditions.some(Boolean);
}
function choose<T>(condition: boolean, whenTrue: () => T, whenFalse: () => T): T {
  return condition ? whenTrue() : whenFalse();
}
function invalidPathSegment(segment: string): boolean {
  return [
    !segment,
    segment.includes(':'),
    /[. ]$/.test(segment),
    /~[0-9]+(?:[.][^/]*)?$/i.test(segment),
    /^(?:con|prn|aux|nul|clock\$|conin\$|conout\$|com[1-9¹²³]|lpt[1-9¹²³])(?:\..*)?$/i.test(segment),
  ].some(Boolean);
}

function failPath(message: string): never {
  throw new PathProfileError(pathProfileGap + ': ' + message);
}

function normalizeProjectRoot(value: string | undefined, label: string): string {
  const root = value === undefined ? '.' : value;
  enforce(typeof root === 'string' && root.length > 0, label + ' must be a non-empty relative path');
  enforce(root !== '.' || value === undefined || value === '.', label + ' must use a stable relative root');
  enforce(!path.posix.isAbsolute(root) && !root.includes('\\'), label + ' must be repository-relative');
  const normalized = root === '.' ? '.' : root.replace(/\/+$/, '');
  enforce(
    normalized === '.' ||
      normalized.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..'),
    label + ' contains an unsafe path segment',
  );
  enforce(
    normalized === '.' ||
      normalized.split('/').every((segment) => !invalidPathSegment(segment) && !/\p{Cc}/u.test(segment)),
    label + ' contains an unsafe path segment',
  );
  return normalized;
}

function normalizeRepositoryPath(value: string): string {
  enforce(typeof value === 'string' && value.length > 0, 'repository path must be a non-empty relative path');
  enforce(!path.posix.isAbsolute(value) && !value.includes('\\'), 'repository path must be relative');
  const normalized = value.replace(/\/+$/, '') || '.';
  enforce(
    normalized === '.' ||
      normalized.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..'),
    'repository path contains an unsafe path segment',
  );
  return normalized;
}

/** Resolve the deepest configured project root, blocking equal-depth ambiguity. */
export function resolveProjectForRepositoryPath(
  projects: readonly ProjectPathResolutionEntry[],
  repositoryPath: string,
  options: ProjectPathResolutionOptions = {},
): ProjectPathResolution {
  enforce(projects.length > 0, 'projects must be non-empty');
  const platform = options.platform ?? process.platform;
  const fold = (value: string): string => (platform === 'win32' ? value.toLowerCase() : value);
  const ids = new Set<string>();
  const candidates = projects.map((project) => {
    enforce(
      typeof project.project_id === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(project.project_id),
      'project id is invalid',
    );
    enforce(!ids.has(project.project_id), 'project id is duplicated: ' + project.project_id);
    ids.add(project.project_id);
    enforce(
      project.project_root !== undefined || project.path_overrides?.project_root !== undefined || projects.length === 1,
      'multi-project entries require explicit project roots',
    );
    const root = normalizeProjectRoot(project.project_root ?? project.path_overrides?.project_root, 'project root');
    return {
      project_id: project.project_id,
      project_root: root,
      specificity: root === '.' ? 0 : root.split('/').length,
    };
  });
  const target = normalizeRepositoryPath(repositoryPath);
  const matches = candidates.filter(
    (candidate) =>
      candidate.project_root === '.' ||
      fold(target) === fold(candidate.project_root) ||
      fold(target).startsWith(fold(candidate.project_root) + '/'),
  );
  enforce(matches.length > 0, 'repository path is not covered by a configured project');
  const deepest = Math.max(...matches.map((candidate) => candidate.specificity));
  const selected = matches.filter((candidate) => candidate.specificity === deepest);
  enforce(selected.length === 1, 'repository path has ambiguous project roots at equal specificity');
  return Object.freeze(selected[0]!);
}

/** Canonical project membership for task and maintenance bindings. */
export function normalizeProjectIds(projectIds: readonly string[]): readonly string[] {
  enforce(Array.isArray(projectIds) && projectIds.length > 0, 'project ids must be non-empty');
  const values = projectIds.map((id) => {
    enforce(typeof id === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(id), 'project id is invalid');
    return id;
  });
  return Object.freeze([...new Set(values)].sort());
}
function enforce(condition: boolean, message: string): void {
  choose(condition, noop, () => failPath(message));
}
function issueTrustedPathProfileOverride(input: TrustedPathProfileOverride): TrustedPathProfileOverride {
  const issuedOverride = freezeJsonValue(input) as TrustedPathProfileOverride;
  TRUSTED_PATH_PROFILE_OVERRIDES.add(issuedOverride as object);
  return issuedOverride;
}

/** @internal Test-only capability issuer; never re-export from the package root. */
export function issueTestTrustedPathProfileOverride(input: unknown): TrustedPathProfileOverride {
  enforce(objectLike(input), 'trusted path override must be an object');
  return issueTrustedPathProfileOverride(input as TrustedPathProfileOverride);
}
function objectLike(value: unknown): value is object {
  return all(typeof value === 'object', value !== null, !Array.isArray(value));
}
function issued(value: unknown, registry: WeakSet<object>): boolean {
  return registry.has(value as object);
}

export function requireAbsoluteRepositoryRoot(repositoryRoot: string): string {
  enforce(typeof repositoryRoot === 'string', 'trusted repository root must be absolute');
  enforce(path.isAbsolute(repositoryRoot), 'trusted repository root must be absolute');
  const resolved = path.resolve(repositoryRoot);
  enforce(resolved === repositoryRoot, 'trusted repository root must be canonical');
  return resolved;
}

function normalizeRelativePath(value: unknown, label: string): string {
  enforce(typeof value === 'string' && value.length > 0, label + ' must be a non-empty relative path');
  const relative = value as string;
  enforce(
    !any(/\p{Cc}/u.test(relative), /[<>"|?*]/.test(relative), path.isAbsolute(relative), relative.includes('\\')),
    label + ' is not a safe repository-relative path',
  );
  const normalized = path.posix.normalize(relative.replaceAll('\\', '/'));
  const parts = relative === '.' ? [] : relative.split('/');
  enforce(!parts.some((part) => part.toLowerCase() === '.git'), label + ' may not target .git');
  enforce(
    all(normalized !== '..', !normalized.startsWith('../'), relative === '.' || normalized !== '.'),
    label + ' contains an unsafe path segment',
  );
  enforce(!parts.some((part) => invalidPathSegment(part)), label + ' contains an unsafe path segment');
  return normalized;
}

function containedPath(repositoryRoot: string, relative: string): string {
  const root = requireAbsoluteRepositoryRoot(repositoryRoot);
  return path.resolve(root, relative);
}

function inspectAncestor(state: AncestorState, segment: string, target: string, label: string): AncestorState {
  const current = path.join(state.current, segment);
  const stat = lstatSync(current, { throwIfNoEntry: false });
  return choose<AncestorState>(
    stat === undefined,
    () => ({ current }),
    () => {
      enforce(
        all(!stat!.isSymbolicLink(), any(current === target, stat!.isDirectory())),
        label + ' contains a reparse or non-directory ancestor',
      );
      return { current };
    },
  );
}

function assertNoReparseAncestors(repositoryRoot: string, target: string, label: string): void {
  const root = requireAbsoluteRepositoryRoot(repositoryRoot);
  const relative = path.relative(root, target);
  const segments = relative.split(path.sep);
  segments.unshift('');
  segments.reduce((state, segment) => inspectAncestor(state, segment, target, label), { current: root });
}

function expectedType(key: PathProfileKey): 'directory' | 'file' | 'file-parent' {
  const file = any(
    key === 'documentation_policy_path',
    key === 'documentation_map_path',
    key === 'documentation_index_path',
  );
  return choose(
    key === 'wiki_path',
    () => 'file-parent' as const,
    () =>
      choose(
        file,
        () => 'file' as const,
        () => 'directory' as const,
      ),
  );
}

function validatePresentTarget(
  target: string,
  kind: 'directory' | 'file' | 'file-parent',
  label: string,
  stat: NonNullable<ReturnType<typeof lstatSync>>,
): { readonly resolved: string; readonly identity: string } {
  enforce(
    choose(
      kind === 'directory',
      () => stat.isDirectory(),
      () => stat.isFile(),
    ),
    choose(
      kind === 'directory',
      () => label + ' must be a directory',
      () => label + ' must be a file',
    ),
  );
  enforce(!HARD_LINK_CHECK_KINDS.has(kind) || !(stat.nlink > 1), label + ' must not be hard-linked');
  return { resolved: target, identity: String(stat.dev) + ':' + String(stat.ino) };
}

function validatePathTarget(
  repositoryRoot: string,
  relative: string,
  kind: 'directory' | 'file' | 'file-parent',
  required: boolean,
  label: string,
): { readonly resolved: string; readonly identity: string | null } {
  const target = containedPath(repositoryRoot, relative);
  assertNoReparseAncestors(repositoryRoot, target, label);
  const stat = lstatSync(target, { throwIfNoEntry: false });
  return choose<{ readonly resolved: string; readonly identity: string | null }>(
    stat === undefined,
    () =>
      choose(
        required,
        () => failPath(label + ' is unavailable: ' + relative),
        () => ({ resolved: target, identity: null }),
      ),
    () => validatePresentTarget(target, kind, label, stat!),
  );
}

function currentConfig(repositoryRoot: string, supplied: AgentRuntimeConfig): AgentRuntimeConfig {
  const current = loadRuntimeConfig(repositoryRoot);
  enforce(runtimeConfigDigest(current) === runtimeConfigDigest(supplied), 'runtime config snapshot is stale or forged');
  return current;
}
function projectCatalogDigest(config: AgentRuntimeConfig): string {
  return canonicalJsonDigest(config.projects);
}
function pathConfigurationHash(config: AgentRuntimeConfig): string {
  return canonicalJsonDigest({
    schema: 'PathProfileConfig/v1',
    config_id: config.config_id,
    config_revision: config.config_revision,
    paths: config.paths,
    projects: config.projects,
  });
}
function identity(value: unknown, label: string): string {
  enforce(all(typeof value === 'string', /^[a-z0-9][a-z0-9-]{0,63}$/.test(value as string)), label + ' is invalid');
  return value as string;
}

function assignPath(
  values: Record<PathProfileKey, string>,
  provenance: Record<PathProfileKey, PathProfileProvenance>,
  key: PathProfileKey,
  value: unknown,
  layer: PathProfileLayer,
  pointer: string,
): void {
  values[key] = normalizeRelativePath(value, pointer);
  provenance[key] = { layer, pointer };
}
function applyOverrides(
  values: Record<PathProfileKey, string>,
  provenance: Record<PathProfileKey, PathProfileProvenance>,
  override: unknown,
  layer: PathProfileLayer,
  pointer: string,
): void {
  enforce(any(override === undefined, objectLike(override)), pointer + ' must be an object');
  Object.entries(
    choose(
      override === undefined,
      () => ({}),
      () => override,
    ) as Record<string, unknown>,
  ).forEach(([key, value]) => {
    enforce(
      all(key !== 'repository_root', PATH_KEYS.includes(key as PathProfileKey)),
      pointer + ' contains an unknown path key: ' + key,
    );
    assignPath(values, provenance, key as PathProfileKey, value, layer, pointer + '.' + key);
  });
}
function applyTrustedOverride(
  values: Record<PathProfileKey, string>,
  provenance: Record<PathProfileKey, PathProfileProvenance>,
  override: TrustedPathProfileOverride | undefined,
  scope: string,
): void {
  choose(override === undefined, noop, () => {
    const trusted = override as TrustedPathProfileOverride;
    enforce(TRUSTED_PATH_PROFILE_OVERRIDES.has(trusted as object), 'trusted path override capability is invalid');
    enforce(
      all(trusted.schema === 'TrustedPathProfileOverride/v1', trusted.scope_id === scope),
      'trusted path override is not bound to the selected scope',
    );
    applyOverrides(values, provenance, trusted.paths, 'trusted-override', '$trusted_override.paths');
  });
}
function applyProjectFields(
  values: Record<PathProfileKey, string>,
  provenance: Record<PathProfileKey, PathProfileProvenance>,
  source: {
    readonly wiki_root: string;
    readonly wiki_output_root: string;
    readonly internal_root: string;
    readonly ledger_root: string;
    readonly wiki_path?: string;
    readonly path_overrides?: unknown;
  },
  layer: 'tenant-config' | 'project-config',
  pointer: string,
): void {
  assignPath(values, provenance, 'wiki_root', source.wiki_root, layer, pointer + '.wiki_root');
  assignPath(values, provenance, 'documentation_root', source.wiki_root, layer, pointer + '.wiki_root');
  assignPath(values, provenance, 'wiki_output_root', source.wiki_output_root, layer, pointer + '.wiki_output_root');
  assignPath(values, provenance, 'internal_root', source.internal_root, layer, pointer + '.internal_root');
  assignPath(values, provenance, 'ledger_root', source.ledger_root, layer, pointer + '.ledger_root');
  choose(
    Boolean(source.wiki_path),
    () => assignPath(values, provenance, 'wiki_path', source.wiki_path, layer, pointer + '.wiki_path'),
    noop,
  );
  applyOverrides(values, provenance, source.path_overrides, layer, pointer + '.path_overrides');
}

function configuredProject(config: AgentRuntimeConfig, repositoryId: string, projectId: string) {
  const project = config.projects.find((entry) => entry.project_id === projectId);
  enforce(project !== undefined, 'project identity is not configured: ' + repositoryId + '/' + projectId);
  return project!;
}
function selectProject(
  config: AgentRuntimeConfig,
  processingScope: ProcessingScope,
  options: PathProfileResolutionOptions,
  values: Record<PathProfileKey, string>,
  provenance: Record<PathProfileKey, PathProfileProvenance>,
): SelectedProject {
  return choose(
    processingScope === 'selected_project',
    () => {
      const repositoryId = identity(options.repository_id, 'repository id');
      const projectId = identity(options.project_id, 'project id');
      enforce(
        repositoryId === config.repository.repository_id,
        'repository identity is not configured: ' + repositoryId,
      );
      const project = configuredProject(config, repositoryId, projectId);
      applyProjectFields(values, provenance, project, 'project-config', '$.projects[' + projectId + ']');
      return { repositoryId, projectId };
    },
    () => ({}),
  );
}
function scopeId(
  config: AgentRuntimeConfig,
  processingScope: ProcessingScope,
  repositoryId?: string,
  projectId?: string,
): string {
  const repositoryScope = 'repository:' + config.config_id;
  return [repositoryScope, 'repository:' + repositoryId + '/project:' + projectId][
    Number(processingScope === 'selected_project')
  ]!;
}
function profileDigest(
  repositoryRoot: string,
  repositoryMode: RepositoryMode,
  processingScope: ProcessingScope,
  scope: string,
  registryHash: string | null,
  pathConfigHash: string,
  values: Readonly<Record<PathProfileKey, string>>,
  identities: Readonly<Record<PathProfileKey, string | null>>,
  provenance: Readonly<Record<PathProfileKey, PathProfileProvenance>>,
): string {
  return canonicalJsonDigest({
    schema: 'ResolvedPathProfile/v1',
    repository_root: repositoryRoot,
    repository_mode: repositoryMode,
    processing_scope: processingScope,
    scope_id: scope,
    registry_hash: registryHash,
    path_config_hash: pathConfigHash,
    path_identities: identities,
    paths: values,
    provenance,
  });
}
function buildBindings(profile: ResolvedPathProfile): ProjectPathBindings {
  const paths = PATH_KEYS.map((key) => ({
    kind: key,
    relative: profile.paths[key],
    resolved: profile.resolved_paths[key],
    expected_type: expectedType(key),
    source: profile.provenance[key].layer,
    source_pointer: profile.provenance[key].pointer,
  }));
  return freezeJsonValue({
    schema: 'ProjectPathBindings/v1' as const,
    repository_root: profile.repository_root,
    contour: profile.scope_id,
    provider: 'agent-runtime.config.v1.yaml' as const,
    repository_mode: profile.repository_mode,
    processing_scope: profile.processing_scope,
    digest: canonicalJsonDigest(paths),
    paths,
  });
}

export function resolvePathProfile(
  repositoryRoot: string,
  suppliedConfig: AgentRuntimeConfig,
  options: PathProfileResolutionOptions = {},
): ResolvedPathProfile {
  const root = requireAbsoluteRepositoryRoot(repositoryRoot);
  const config = currentConfig(root, suppliedConfig);
  const processingScope = choose(
    options.processing_scope === undefined,
    () => config.paths.processing_scope,
    () => options.processing_scope!,
  );
  enforce(['whole_repository', 'selected_project'].includes(processingScope), 'processing_scope is invalid');
  enforce(
    any(
      processingScope !== 'whole_repository',
      all(options.repository_id === undefined, options.project_id === undefined),
    ),
    'whole_repository scope cannot include project identity',
  );
  const values = {} as Record<PathProfileKey, string>;
  const provenance = {} as Record<PathProfileKey, PathProfileProvenance>;
  PATH_KEYS.forEach((key) =>
    assignPath(values, provenance, key, config.paths.defaults[key], 'root-config', '$.paths.defaults.' + key),
  );
  const selected = selectProject(config, processingScope, options, values, provenance);
  const scope = scopeId(config, processingScope, selected.repositoryId, selected.projectId);
  applyTrustedOverride(values, provenance, options.trusted_override, scope);
  const resolved = {} as Record<PathProfileKey, string>;
  const identities = {} as Record<PathProfileKey, string | null>;
  PATH_KEYS.forEach((key) => {
    const required = any(
      key === 'documentation_policy_path',
      key === 'documentation_map_path',
      key === 'documentation_index_path',
    );
    const checked = validatePathTarget(root, values[key], expectedType(key), required, 'path ' + key);
    resolved[key] = checked.resolved;
    identities[key] = checked.identity;
  });
  const registryHash = [null, projectCatalogDigest(config)][Number(config.paths.repository_mode === 'monorepo')]!;
  const pathConfigHash = pathConfigurationHash(config);
  const digest = profileDigest(
    root,
    config.paths.repository_mode,
    processingScope,
    scope,
    registryHash,
    pathConfigHash,
    values,
    identities,
    provenance,
  );
  const profile = freezeJsonValue({
    schema: 'ResolvedPathProfile/v1' as const,
    repository_root: root,
    repository_mode: config.paths.repository_mode,
    processing_scope: processingScope,
    scope_id: scope,
    registry_hash: registryHash,
    path_config_hash: pathConfigHash,
    path_identities: identities,
    paths: values,
    resolved_paths: resolved,
    provenance,
    digest,
  });
  TRUSTED_PATH_PROFILES.add(profile);
  return profile;
}
function selectedProfileOptions(profile: ResolvedPathProfile): PathProfileResolutionOptions {
  const base = choose(
    profile.processing_scope === 'selected_project',
    () => {
      const [repositoryPart, projectId] = profile.scope_id.split('/project:') as [string, string];
      return {
        processing_scope: profile.processing_scope,
        repository_id: repositoryPart.replace(/^repository:/, ''),
        project_id: projectId,
      };
    },
    () => ({}),
  );
  const trustedPaths = {} as PathProfileOverride;
  PATH_KEYS.filter(
    (key): key is Exclude<PathProfileKey, 'repository_root'> =>
      key !== 'repository_root' && profile.provenance[key].layer === 'trusted-override',
  ).forEach((key) => {
    trustedPaths[key] = profile.paths[key];
  });
  return choose(
    Object.keys(trustedPaths).length === 0,
    () => base,
    () => ({
      ...base,
      trusted_override: issueTrustedPathProfileOverride({
        schema: 'TrustedPathProfileOverride/v1',
        scope_id: profile.scope_id,
        paths: trustedPaths,
      }),
    }),
  );
}
export function validateResolvedPathProfile(input: unknown, trustedRepositoryRoot: string): ResolvedPathProfile {
  enforce(issued(input, TRUSTED_PATH_PROFILES), 'resolved path profile must be issued by resolvePathProfile');
  const profile = input as ResolvedPathProfile;
  const root = requireAbsoluteRepositoryRoot(trustedRepositoryRoot);
  enforce(profile.repository_root === root, 'resolved path profile identity is invalid');
  const config = loadRuntimeConfig(root);
  enforce(profile.path_config_hash === pathConfigurationHash(config), 'resolved path profile config is stale');
  const expected = resolvePathProfile(root, config, selectedProfileOptions(profile));
  enforce(expected.digest === profile.digest, 'resolved path profile is stale or forged');
  return profile;
}
function integrationBinding(config: AgentRuntimeConfig, projectId: string): ProjectIntegrationBinding {
  const provider = config.integrations.providers.find((entry) => entry.project_id === projectId);
  enforce(provider !== undefined, 'project integration binding is not configured: ' + projectId);
  return freezeJsonValue({
    schema: 'ProjectIntegrationBinding/v1' as const,
    project_id: projectId,
    provider_id: provider!.id,
    provider: provider!.provider,
    tenant_id: provider!.tenant_id,
    namespace: provider!.namespace,
    digest: canonicalJsonDigest(provider),
  });
}

function projectContextDigest(
  config: AgentRuntimeConfig,
  repositoryId: string,
  projectIds: readonly string[],
  integrationsDigest: string,
  pathBindingsDigest: string,
): string {
  return canonicalJsonDigest({
    schema: 'ProjectContext/v1',
    repository_id: repositoryId,
    project_ids: projectIds,
    config_digest: runtimeConfigDigest(config),
    registry_hash: projectCatalogDigest(config),
    integrations_digest: integrationsDigest,
    path_bindings_digest: pathBindingsDigest,
  });
}

/**
 * Binds an exact configured project set.  The caller cannot widen a context by
 * passing a path, a tenant, or a duplicate project id: membership is normalized
 * first and every selected project receives an independent path profile.
 */
export function loadProjectSetContext(
  repositoryRoot: string,
  suppliedConfig: AgentRuntimeConfig,
  repositoryId: string,
  projectIds: readonly string[],
  options: ProjectSetContextOptions = {},
): ProjectContext {
  const root = requireAbsoluteRepositoryRoot(repositoryRoot);
  const config = currentConfig(root, suppliedConfig);
  enforce(repositoryId === config.repository.repository_id, 'project context repository identity is invalid');
  enforce(config.paths.repository_mode === 'monorepo', 'project context requires monorepo mode');
  const ids = normalizeProjectIds(projectIds);
  const overrideKeys = Object.keys(options.trusted_overrides ?? {}).sort();
  enforce(
    overrideKeys.length === 0 || canonicalJsonDigest(overrideKeys) === canonicalJsonDigest(ids),
    'trusted project overrides must bind exactly the selected project set',
  );
  const project_bindings = ids.map((projectId) => {
    const project = configuredProject(config, repositoryId, projectId);
    const integration_binding = integrationBinding(config, projectId);
    const trustedOverride = options.trusted_overrides?.[projectId];
    const profile = resolvePathProfile(root, config, {
      processing_scope: 'selected_project',
      repository_id: repositoryId,
      project_id: projectId,
      ...(trustedOverride === undefined ? {} : { trusted_override: trustedOverride }),
    });
    return freezeJsonValue({
      schema: 'ProjectContextProjectBinding/v1' as const,
      project_id: projectId,
      project_title: project.title,
      task_prefix: project.task_prefix,
      code_selectors: [...project.code_selectors],
      delivery_group: project.delivery_group,
      project_root: project.project_root,
      integration_binding,
      path_profile: profile,
      path_bindings: buildBindings(profile),
    });
  });
  const integration_bindings = project_bindings.map((binding) => binding.integration_binding);
  const path_profiles = project_bindings.map((binding) => binding.path_profile);
  const path_bindings = project_bindings.map((binding) => binding.path_bindings);
  const integrations_digest = canonicalJsonDigest(integration_bindings);
  const path_bindings_digest = canonicalJsonDigest(path_bindings.map((binding) => binding.digest));
  const registryHash = projectCatalogDigest(config);
  const context = freezeJsonValue({
    schema: 'ProjectContext/v1' as const,
    source: 'runtime-config' as const,
    config_digest: runtimeConfigDigest(config),
    registry_hash: registryHash,
    repository_id: config.repository.repository_id,
    project_ids: ids,
    integrations_digest,
    repository_title: config.repository.title,
    project_bindings,
    integration_bindings,
    path_profiles,
    path_bindings,
    path_bindings_digest,
    project_context_digest: projectContextDigest(config, repositoryId, ids, integrations_digest, path_bindings_digest),
  });
  TRUSTED_PROJECT_CONTEXTS.add(context);
  return context;
}

/** Single-project compatibility entrypoint implemented through the exact-set factory. */
export function loadProjectContext(
  repositoryRoot: string,
  suppliedConfig: AgentRuntimeConfig,
  repositoryId: string,
  projectId: string,
  options: Omit<PathProfileResolutionOptions, 'processing_scope' | 'repository_id' | 'project_id'> = {},
): ProjectContext {
  return loadProjectSetContext(repositoryRoot, suppliedConfig, repositoryId, [projectId], {
    trusted_overrides: options.trusted_override === undefined ? {} : { [projectId]: options.trusted_override },
  });
}

export function projectBindingFor(context: ProjectContext, projectId: string): ProjectContextProjectBinding | null {
  return context.project_bindings.find((binding) => binding.project_id === projectId) ?? null;
}
export function validateProjectContextBinding(value: unknown, trustedRepositoryRoot: string): ProjectContext {
  enforce(issued(value, TRUSTED_PROJECT_CONTEXTS), 'project context must be issued by loadProjectSetContext');
  const context = value as ProjectContext;
  enforce(
    canonicalJsonDigest(context.project_ids) === canonicalJsonDigest(normalizeProjectIds(context.project_ids)),
    'project context project set is not canonical',
  );
  enforce(
    context.project_bindings.length === context.project_ids.length,
    'project context project bindings are incomplete',
  );
  enforce(
    context.integration_bindings.length === context.project_ids.length,
    'project context integrations are incomplete',
  );
  enforce(context.path_profiles.length === context.project_ids.length, 'project context path profiles are incomplete');
  enforce(context.path_bindings.length === context.project_ids.length, 'project context path bindings are incomplete');
  for (const projectId of context.project_ids) {
    const binding = projectBindingFor(context, projectId);
    enforce(binding !== null, 'project context project binding is unavailable: ' + projectId);
    enforce(binding!.integration_binding.project_id === projectId, 'project context integration membership is invalid');
    validateResolvedPathProfile(binding!.path_profile, trustedRepositoryRoot);
  }
  return context;
}
export function validateProjectContext(value: unknown, trustedRepositoryRoot: string): ProjectContext {
  const context = validateProjectContextBinding(value, trustedRepositoryRoot);
  const root = requireAbsoluteRepositoryRoot(trustedRepositoryRoot);
  const config = loadRuntimeConfig(root);
  enforce(context.config_digest === runtimeConfigDigest(config), 'project context configuration is stale');
  const trusted_overrides = Object.fromEntries(
    context.project_bindings.map((binding) => [
      binding.project_id,
      selectedProfileOptions(binding.path_profile).trusted_override,
    ]),
  );
  const expected = loadProjectSetContext(root, config, context.repository_id, context.project_ids, {
    trusted_overrides,
  });
  enforce(context.integrations_digest === expected.integrations_digest, 'project context integrations are stale');
  enforce(context.path_bindings_digest === expected.path_bindings_digest, 'project context paths are stale');
  enforce(context.project_context_digest === expected.project_context_digest, 'project context binding is stale');
  return context;
}
