import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test';
import {
  loadProjectContext,
  loadProjectSetContext,
  normalizeProjectIds,
  issueTestTrustedPathProfileOverride,
  PathProfileError,
  pathProfileGap,
  requireAbsoluteRepositoryRoot,
  projectMayScopeRepositoryPath,
  resolvePathProfile,
  resolveProjectPathMembership,
  resolveProjectForRepositoryPath,
  resolveSelectedProjectForRepositoryPath,
  validateProjectContext,
  validateProjectContextBinding,
  validateResolvedPathProfile,
  type ProjectContext,
  type ProjectContextProjectBinding,
  type PathProfileResolutionOptions,
} from '../src/config/project-context.ts';
import * as projectContext from '../src/config/project-context.ts';
import {
  loadRuntimeConfig,
  type AgentRuntimeConfig,
  type PathProfileKey,
  type PathProfileOverride,
} from '../src/config/runtime-config.ts';
import { initializeProject } from '../bin/init.ts';
import {
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const projectId = 'sample';
const secondProjectId = 'second';
type PathProfileResolutionEntry = Parameters<typeof resolveProjectPathMembership>[0][number];
let repositoryRoot: string;
let config: AgentRuntimeConfig;
let project: ProjectContext;
let scopeId: string;
let runtimeConfigPath: string;
let initialRuntimeConfig: string;
const temporaryRoots: string[] = [];

function binding(context: ProjectContext, selectedProjectId: string): ProjectContextProjectBinding {
  const result = context.project_bindings.find((entry) => entry.project_id === selectedProjectId);
  if (result === undefined) throw new Error('project binding fixture is missing: ' + selectedProjectId);
  return result;
}
function required<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(label + ' fixture is missing');
  return value;
}

beforeAll(async () => {
  repositoryRoot = mkdtempSync(path.join(tmpdir(), 'project-context-boundary-'));
  mkdirSync(path.join(repositoryRoot, 'products', projectId), { recursive: true });
  mkdirSync(path.join(repositoryRoot, 'products', secondProjectId), { recursive: true });
  await initializeProject({
    projectRoot: repositoryRoot,
    repository: 'project-context-fixture',
    projectMappings: [`${projectId}=products/${projectId}`, `${secondProjectId}=products/${secondProjectId}`],
  });
  runtimeConfigPath = path.join(repositoryRoot, 'agent-runtime.config.v1.yaml');
  initialRuntimeConfig = readFileSync(runtimeConfigPath, 'utf8');
  mkdirSync(path.join(repositoryRoot, '.agent', 'work'), { recursive: true });
  config = loadRuntimeConfig(repositoryRoot);
  project = loadProjectContext(repositoryRoot, config, config.repository.repository_id, projectId);
  scopeId = binding(project, projectId).path_profile.scope_id;
});

function relative(value: string): string {
  return path.relative(repositoryRoot, value).split(path.sep).join('/');
}
function options(paths: PathProfileOverride = {}): PathProfileResolutionOptions {
  return {
    processing_scope: 'selected_project',
    repository_id: config.repository.repository_id,
    project_id: projectId,
    trusted_override: issueTestTrustedPathProfileOverride({
      schema: 'TrustedPathProfileOverride/v1',
      scope_id: scopeId,
      paths,
    }),
  };
}
function resolve(paths: PathProfileOverride = {}) {
  return resolvePathProfile(repositoryRoot, config, options(paths));
}
function resolveUntrustedOptions(value: unknown): void {
  Reflect.apply(resolvePathProfile, undefined, [repositoryRoot, config, value]);
}
function loadConfigFixture(value: AgentRuntimeConfig): AgentRuntimeConfig {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error('runtime config fixture could not be serialized');
  // JSON is valid YAML and keeps the fixture bytes deterministic.
  writeFileSync(runtimeConfigPath, serialized + '\n');
  return loadRuntimeConfig(repositoryRoot);
}
function tempRoot(): string {
  const value = realpathSync(
    mkdtempSync(path.join(repositoryRoot, '.agent', 'work', 'agent-runtime-project-context-')),
  );
  temporaryRoots.push(value);
  return value;
}
function expectPathFailure(value: unknown): void {
  const override = issueTestTrustedPathProfileOverride({
    schema: 'TrustedPathProfileOverride/v1',
    scope_id: scopeId,
    paths: { work_root: value },
  });
  expect(
    () => {
      Reflect.apply(resolvePathProfile, undefined, [
        repositoryRoot,
        config,
        {
          processing_scope: 'selected_project',
          repository_id: config.repository.repository_id,
          project_id: projectId,
          trusted_override: override,
        },
      ]);
    },
    'unsafe path accepted: ' + JSON.stringify(value),
  ).toThrow();
}

afterEach(() => {
  writeFileSync(runtimeConfigPath, initialRuntimeConfig);
  while (temporaryRoots.length) {
    const root = temporaryRoots.pop();
    if (root !== undefined) rmSync(root, { recursive: true, force: true });
  }
});

afterAll(() => {
  if (repositoryRoot) rmSync(repositoryRoot, { recursive: true, force: true });
});

describe('project context path boundary', () => {
  test('resolves deepest project membership and requires a selected member for shared roots', () => {
    const projects: PathProfileResolutionEntry[] = [
      { project_id: 'root', project_root: '.' },
      { project_id: 'services', project_root: 'services' },
      { project_id: 'billing', project_root: 'services/billing' },
    ];
    expect(resolveProjectForRepositoryPath(projects, '.')).toMatchObject({ project_id: 'root', specificity: 0 });
    expect(resolveProjectForRepositoryPath(projects, 'services/billing/src')).toMatchObject({
      project_id: 'billing',
      project_root: 'services/billing',
      specificity: 2,
    });
    expect(resolveProjectForRepositoryPath(projects, 'services/other')).toMatchObject({ project_id: 'services' });
    const equalRoots: PathProfileResolutionEntry[] = [
      { project_id: 'aa', project_root: 'packages/a' },
      { project_id: 'bb', project_root: 'packages/a' },
    ];
    expect(resolveProjectPathMembership(equalRoots, 'packages/a/src')).toEqual({
      project_ids: ['aa', 'bb'],
      project_root: 'packages/a',
      specificity: 2,
    });
    expect(() => resolveProjectForRepositoryPath(equalRoots, 'packages/a/src')).toThrow(/ambiguous project roots/);
    expect(resolveProjectForRepositoryPath(equalRoots, 'packages/a/src', { selected_project_id: 'bb' })).toMatchObject({
      project_id: 'bb',
      project_root: 'packages/a',
      specificity: 2,
    });
    expect(projectMayScopeRepositoryPath(equalRoots, 'packages/a/src', 'aa')).toBe(true);
    expect(projectMayScopeRepositoryPath(equalRoots, 'packages/a/src', 'bb')).toBe(true);
    expect(projectMayScopeRepositoryPath(equalRoots, 'wiki/skills/guide.md', 'aa')).toBe(true);
    expect(resolveSelectedProjectForRepositoryPath(equalRoots, 'wiki/skills/guide.md', ['aa'])).toMatchObject({
      project_id: 'aa',
      specificity: -1,
    });
    expect(() => resolveSelectedProjectForRepositoryPath(equalRoots, 'wiki/skills/guide.md', ['aa', 'bb'])).toThrow(
      /ambiguous selected project membership/,
    );
    expect(() => resolveSelectedProjectForRepositoryPath(equalRoots, 'packages/a/src', ['aa', 'ghost'])).toThrow(
      /selected project is not configured/,
    );
    const nestedRoots: PathProfileResolutionEntry[] = [
      { project_id: 'parent', project_root: 'products' },
      { project_id: 'foreign', project_root: 'products/foreign' },
    ];
    expect(resolveProjectPathMembership(nestedRoots, 'products/foreign/src/main.ts').project_ids).toEqual(['foreign']);
    expect(projectMayScopeRepositoryPath(nestedRoots, 'products/foreign/src/main.ts', 'parent')).toBe(false);
    expect(projectMayScopeRepositoryPath(nestedRoots, 'products/foreign/src/main.ts', 'foreign')).toBe(true);
    expect(
      resolveProjectPathMembership(nestedRoots, 'products/foreign/src/main.ts', { platform: 'win32' }).project_ids,
    ).toEqual(['foreign']);
    expect(
      resolveProjectPathMembership(nestedRoots, 'PRODUCTS/FOREIGN/src/main.ts', { platform: 'win32' }).project_ids,
    ).toEqual(['foreign']);
    expect(
      resolveProjectPathMembership(nestedRoots, 'PRODUCTS/FOREIGN/src/main.ts', { platform: 'posix' }).project_ids,
    ).toEqual([]);
    expect(() => resolveProjectForRepositoryPath(projects, 'outside/../root')).toThrow(/unsafe path segment/);
    expect(() => resolveProjectPathMembership(equalRoots, 'packages/a/../foreign')).toThrow(/unsafe path segment/);
  });

  test('canonicalizes task project ids without changing project identity', () => {
    expect(normalizeProjectIds(['billing', 'root', 'billing'])).toEqual(['billing', 'root']);
    expect(() => normalizeProjectIds([])).toThrow(/project ids must be non-empty/);
    expect(() => normalizeProjectIds(['billing', ''])).toThrow(/project id is invalid/);
  });

  test('binds an exact multi-project context without a primary project', () => {
    const first = loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, [
      secondProjectId,
      projectId,
    ]);
    const reordered = loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, [
      projectId,
      secondProjectId,
    ]);
    expect(first.project_ids).toEqual([projectId, secondProjectId]);
    expect(
      loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, [projectId, projectId])
        .project_ids,
    ).toEqual([projectId]);
    expect(first.project_context_digest).toBe(reordered.project_context_digest);
    expect(first.integrations_digest).toBe(reordered.integrations_digest);
    expect(first.path_bindings_digest).toBe(reordered.path_bindings_digest);
    expect(first.project_bindings.map((entry) => entry.project_id)).toEqual([projectId, secondProjectId]);
    expect(first.integration_bindings.map((entry) => entry.project_id)).toEqual([projectId, secondProjectId]);
    expect(first).not.toHaveProperty('integration_binding');
    expect(() => loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, [])).toThrow(
      /project ids must be non-empty/,
    );
    expect(() =>
      loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, [projectId, 'missing']),
    ).toThrow(/project identity is not configured/);
    expect(() =>
      loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, [projectId], {
        trusted_overrides: {
          [secondProjectId]: issueTestTrustedPathProfileOverride({
            schema: 'TrustedPathProfileOverride/v1',
            scope_id: 'repository:' + config.repository.repository_id + '/project:' + secondProjectId,
            paths: {},
          }),
        },
      }),
    ).toThrow(/exactly the selected project set/);
  });

  test('rejects unsafe repository-relative path forms', () => {
    expect(() => resolve({ work_root: '' })).toThrow(/work_root must be a non-empty relative path/);
    expect(() =>
      resolveUntrustedOptions({
        ...options(),
        trusted_override: issueTestTrustedPathProfileOverride({
          schema: 'TrustedPathProfileOverride/v1',
          scope_id: scopeId,
          paths: { work_root: null },
        }),
      }),
    ).toThrow(/work_root must be a non-empty relative path/);
    for (const value of [1, {}, true]) expectPathFailure(value);
    for (const value of [
      'a/\u0000b',
      'a/*',
      '/absolute',
      '\\\\server',
      'a\\b',
      'C:relative',
      'a/..',
      'a/.',
      'a//b',
      'a:b',
      'a/b.',
      'a/b ',
      'a/~1',
      'a/~12.txt',
      'a/con',
      'a/con.txt',
      'a/prn',
      'a/aux',
      'a/nul',
      'a/clock$',
      'a/conin$',
      'a/conout$',
      'a/com1',
      'a/com1.txt',
      'a/lpt1',
      'a/lpt1.txt',
      'a/com¹',
      'a/lpt³',
    ])
      expectPathFailure(value);
    expect(() => resolve({ work_root: '/absolute' })).toThrow(/not a safe repository-relative path/);
    for (const value of ['.git', '.GIT', 'a/.GIT/hooks'])
      expect(() => resolve({ work_root: value })).toThrow(/may not target .git/);
    expect(() => resolve({ work_root: 'a/..' })).toThrow(/work_root contains an unsafe path segment/);
    expect(resolve({ work_root: 'a/~1x' }).paths.work_root).toBe('a/~1x');
    expect(resolve({ work_root: 'a/conx' }).paths.work_root).toBe('a/conx');
    expect(resolve({ work_root: 'a/xcon' }).paths.work_root).toBe('a/xcon');
  });
  test('rejects unissued caller path overrides', () => {
    const forged: unknown = {
      schema: 'TrustedPathProfileOverride/v1',
      scope_id: binding(project, projectId).path_profile.scope_id,
      paths: { work_root: 'agent-runtime-new' },
    };
    expect(() => resolveUntrustedOptions({ ...options(), trusted_override: forged })).toThrow(/capability/);
    expect(() => {
      Reflect.apply(loadProjectContext, undefined, [
        repositoryRoot,
        config,
        config.repository.repository_id,
        projectId,
        { trusted_override: forged },
      ]);
    }).toThrow(/capability/);
  });
  test('rejects selector and snapshot violations', () => {
    expect(() =>
      resolveUntrustedOptions({
        processing_scope: 'selected_project',
        repository_id: undefined,
        project_id: projectId,
      }),
    ).toThrow(/repository id is invalid/);
    expect(() =>
      resolvePathProfile(repositoryRoot, config, {
        processing_scope: 'selected_project',
        repository_id: 'bad!',
        project_id: projectId,
      }),
    ).toThrow(/repository id is invalid/);
    expect(() =>
      resolvePathProfile(repositoryRoot, config, {
        processing_scope: 'selected_project',
        repository_id: '!crmbx',
        project_id: projectId,
      }),
    ).toThrow(/repository id is invalid/);
    expect(() =>
      resolveUntrustedOptions({
        processing_scope: 'selected_project',
        repository_id: config.repository.repository_id,
        project_id: undefined,
      }),
    ).toThrow(/project id is invalid/);
    expect(() =>
      resolvePathProfile(repositoryRoot, config, {
        processing_scope: 'selected_project',
        repository_id: config.repository.repository_id,
        project_id: 'bad!',
      }),
    ).toThrow(/project id is invalid/);
    expect(() =>
      resolvePathProfile(repositoryRoot, config, {
        processing_scope: 'selected_project',
        repository_id: config.repository.repository_id,
        project_id: 'a',
      }),
    ).toThrow(/project identity is not configured/);
    expect(() =>
      resolvePathProfile(repositoryRoot, config, {
        processing_scope: 'selected_project',
        repository_id: config.repository.repository_id,
        project_id: 'missing',
      }),
    ).toThrow('project identity is not configured: ' + config.repository.repository_id + '/missing');
    expect(
      resolvePathProfile(repositoryRoot, config, {
        processing_scope: 'selected_project',
        repository_id: config.repository.repository_id,
        project_id: secondProjectId,
      }).scope_id,
    ).toContain('project:' + secondProjectId);
    expect(
      resolvePathProfile(repositoryRoot, config, {
        processing_scope: 'selected_project',
        repository_id: config.repository.repository_id,
        project_id: projectId,
      }).scope_id,
    ).toContain('project:' + projectId);
    expect(() =>
      resolvePathProfile(repositoryRoot, config, {
        processing_scope: 'selected_project',
        repository_id: 'missing',
        project_id: projectId,
      }),
    ).toThrow('repository identity is not configured: missing');
    expect(() =>
      resolvePathProfile(repositoryRoot, config, {
        processing_scope: 'whole_repository',
        repository_id: config.repository.repository_id,
      }),
    ).toThrow(/whole_repository scope cannot include project identity/);
    expect(() =>
      resolvePathProfile(repositoryRoot, config, { processing_scope: 'whole_repository', project_id: projectId }),
    ).toThrow(/whole_repository scope cannot include project identity/);
    const stale: AgentRuntimeConfig = { ...structuredClone(config), config_revision: config.config_revision + 1 };
    expect(() => resolvePathProfile(repositoryRoot, stale, {})).toThrow(/runtime config snapshot is stale or forged/);
    expect(() => loadProjectContext(repositoryRoot, config, 'missing', projectId)).toThrow(
      'project context repository identity is invalid',
    );
    expect(() => loadProjectContext(repositoryRoot, config, config.repository.repository_id, 'missing')).toThrow(
      'project identity is not configured: ' + config.repository.repository_id + '/missing',
    );
    expect(loadProjectContext(repositoryRoot, config, config.repository.repository_id, projectId).project_ids).toEqual([
      projectId,
    ]);
  });

  test('rejects wrong target types, hard links, blocked ancestors, and reparses', () => {
    const root = tempRoot();
    const directory = path.join(root, 'directory');
    const file = path.join(root, 'file.txt');
    const hardLink = path.join(root, 'hard-link.txt');
    const blocked = path.join(root, 'blocked.txt');
    const symlink = path.join(root, 'directory-link');
    rmSync(directory, { recursive: true, force: true });
    mkdirSync(directory, { recursive: true });
    writeFileSync(file, 'file');
    writeFileSync(blocked, 'blocked');
    linkSync(file, hardLink);
    expect(() => resolve({ work_root: relative(file) })).toThrow(/directory/);
    expect(() => resolve({ documentation_policy_path: relative(directory) })).toThrow(/file/);
    expect(() => resolve({ wiki_path: relative(directory) })).toThrow(/file/);
    expect(() => resolve({ documentation_policy_path: relative(hardLink) })).toThrow(
      'path documentation_policy_path must not be hard-linked',
    );
    expect(() => resolve({ wiki_path: relative(hardLink) })).toThrow('path wiki_path must not be hard-linked');
    expect(() => resolve({ work_root: relative(blocked) + '/child' })).toThrow(/reparse|non-directory/);
    const missing = relative(path.join(root, 'missing.txt'));
    const requiredFilePaths: PathProfileKey[] = [
      'documentation_policy_path',
      'documentation_map_path',
      'documentation_index_path',
    ];
    for (const key of requiredFilePaths) {
      expect(() => resolve({ [key]: missing })).toThrow('path ' + key + ' is unavailable: ' + missing);
    }
    expect(resolve({ wiki_path: missing }).path_identities.wiki_path).toBeNull();
    expect(resolve({ work_root: missing + '/nested' }).path_identities.work_root).toBeNull();
    try {
      symlinkSync(directory, symlink, 'junction');
      expect(() => resolve({ work_root: relative(symlink) })).toThrow(
        'path work_root contains a reparse or non-directory ancestor',
      );
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });

  test('issues canonical profiles and validates bindings, identities, and path kinds', () => {
    const whole = resolvePathProfile(repositoryRoot, config, { processing_scope: 'whole_repository' });
    expect(whole.schema).toBe('ResolvedPathProfile/v1');
    expect(whole.scope_id).toBe('repository:' + config.config_id);
    expect(whole.processing_scope).toBe('whole_repository');
    expect(whole.path_identities.repository_root).not.toBeNull();
    const primaryBinding = binding(project, projectId);
    expect(primaryBinding.path_bindings.schema).toBe('ProjectPathBindings/v1');
    expect(primaryBinding.path_bindings.repository_root).toBe(repositoryRoot);
    expect(primaryBinding.path_bindings.contour).toBe(primaryBinding.path_profile.scope_id);
    expect(primaryBinding.path_bindings.provider).toBe('agent-runtime.config.v1.yaml');
    expect(
      required(
        primaryBinding.path_bindings.paths.find((entry) => entry.kind === 'wiki_path'),
        'wiki path',
      ).expected_type,
    ).toBe('file-parent');
    expect(
      required(
        primaryBinding.path_bindings.paths.find((entry) => entry.kind === 'documentation_policy_path'),
        'documentation policy path',
      ).expected_type,
    ).toBe('file');
    expect(
      required(
        primaryBinding.path_bindings.paths.find((entry) => entry.kind === 'work_root'),
        'work root',
      ).expected_type,
    ).toBe('directory');
    const overridden = resolve({ work_root: '.' });
    expect(overridden.provenance.work_root).toEqual({
      layer: 'trusted-override',
      pointer: '$trusted_override.paths.work_root',
    });
    expect(validateResolvedPathProfile(primaryBinding.path_profile, repositoryRoot)).toBe(primaryBinding.path_profile);
    expect(validateResolvedPathProfile(whole, repositoryRoot)).toBe(whole);
    expect(validateProjectContextBinding(project, repositoryRoot)).toBe(project);
    expect(validateProjectContext(project, repositoryRoot)).toBe(project);
    const second = loadProjectContext(repositoryRoot, config, config.repository.repository_id, secondProjectId);
    const secondBinding = binding(second, secondProjectId);
    const secondProjectConfig = required(
      config.projects.find((entry) => entry.project_id === secondProjectId),
      'second project config',
    );
    expect(secondBinding.integration_binding.tenant_id).toBe(
      required(
        config.integrations.providers.find((entry) => entry.project_id === secondProjectId),
        'second project integration provider',
      ).tenant_id,
    );
    expect(project.repository_title).toBe(config.repository.title);
    expect(second.repository_title).toBe(config.repository.title);
    expect(second.repository_title).not.toBe(secondBinding.project_title);
    expect(secondBinding.project_title).toBe(secondProjectConfig.title);
    expect(secondBinding.code_selectors).toEqual(secondProjectConfig.code_selectors);
    expect(secondBinding.path_profile.provenance.wiki_root).toEqual({
      layer: 'project-config',
      pointer: '$.projects[' + secondProjectId + '].wiki_root',
    });
    expect(secondBinding.path_bindings.schema).toBe('ProjectPathBindings/v1');
    expect(secondBinding.path_bindings.paths).toHaveLength(21);
    expect(
      secondBinding.path_bindings.paths.every(
        (entry) =>
          typeof entry.kind === 'string' &&
          typeof entry.relative === 'string' &&
          typeof entry.resolved === 'string' &&
          typeof entry.source === 'string' &&
          typeof entry.source_pointer === 'string',
      ),
    ).toBe(true);
    for (const value of [[], {}, () => undefined, 1, null])
      expect(() => validateResolvedPathProfile(value, repositoryRoot)).toThrow(
        'resolved path profile must be issued by resolvePathProfile',
      );
    expect(() => validateProjectContextBinding([], repositoryRoot)).toThrow(
      'project context must be issued by loadProjectSetContext',
    );
    expect(() => validateProjectContext({ ...project }, repositoryRoot)).toThrow(
      'project context must be issued by loadProjectSetContext',
    );
    expect(() =>
      validateResolvedPathProfile(primaryBinding.path_profile, path.join(repositoryRoot, 'agent-runtime-new')),
    ).toThrow('resolved path profile identity is invalid');
    expect(() => {
      Reflect.apply(requireAbsoluteRepositoryRoot, undefined, [null]);
    }).toThrow('trusted repository root must be absolute');
    expect(() => requireAbsoluteRepositoryRoot('.')).toThrow('trusted repository root must be absolute');
    expect(() => requireAbsoluteRepositoryRoot(repositoryRoot + path.sep + '.')).toThrow(
      'trusted repository root must be canonical',
    );
    try {
      resolve({ work_root: 'a/../b' });
    } catch (error) {
      if (!(error instanceof PathProfileError)) throw error;
      expect(error).toBeInstanceOf(PathProfileError);
      expect(error.name).toBe('PathProfileError');
      expect(error.code).toBe(pathProfileGap);
    }
  });
  test('binds current-v1 repository and project contours', async () => {
    expect.assertions(13);
    const repositoryConfig = loadConfigFixture({
      ...structuredClone(config),
      paths: {
        ...config.paths,
        processing_scope: 'whole_repository',
        defaults: { ...config.paths.defaults, work_root: '.' },
      },
    });
    let activeConfig: AgentRuntimeConfig = repositoryConfig;
    const isolated = projectContext;
    const resolved = isolated.resolvePathProfile(repositoryRoot, repositoryConfig);
    expect(resolved.scope_id).toBe('repository:' + config.config_id);
    expect(resolved.registry_hash).toMatch(/^[a-f0-9]{64}$/);
    const repositoryProfile = isolated.resolvePathProfile(repositoryRoot, repositoryConfig, {
      trusted_override: isolated.issueTestTrustedPathProfileOverride({
        schema: 'TrustedPathProfileOverride/v1',
        scope_id: 'repository:' + config.config_id,
        paths: { work_root: '.' },
      }),
    });
    expect(repositoryProfile.paths.work_root).toBe('.');
    expect(isolated.validateResolvedPathProfile(repositoryProfile, repositoryRoot)).toBe(repositoryProfile);
    expect(() =>
      isolated.loadProjectContext(repositoryRoot, repositoryConfig, 'unconfigured-repository', projectId),
    ).toThrow('project context repository identity is invalid');
    expect(() =>
      isolated.resolvePathProfile(repositoryRoot, repositoryConfig, {
        processing_scope: 'selected_project',
        repository_id: config.repository.repository_id,
        project_id: projectId,
        trusted_override: isolated.issueTestTrustedPathProfileOverride({
          schema: 'TrustedPathProfileOverride/v1',
          scope_id: 'repository:' + config.config_id,
          paths: { work_root: '.' },
        }),
      }),
    ).toThrow();
    const partialConfig = loadConfigFixture({
      ...structuredClone(config),
      projects: config.projects.map(({ path_overrides, ...entry }) =>
        entry.project_id === projectId
          ? entry
          : { ...entry, ...(path_overrides === undefined ? {} : { path_overrides }) },
      ),
    });
    activeConfig = partialConfig;
    const partialProfile = isolated.resolvePathProfile(repositoryRoot, partialConfig, {
      processing_scope: 'selected_project',
      repository_id: config.repository.repository_id,
      project_id: projectId,
    });
    expect(partialProfile.paths.project_root).toBe(partialConfig.paths.defaults.project_root);
    activeConfig = loadConfigFixture(structuredClone(config));
    const context = isolated.loadProjectContext(
      repositoryRoot,
      activeConfig,
      config.repository.repository_id,
      projectId,
    );
    const overrideRoot = tempRoot();
    activeConfig = loadConfigFixture({
      ...activeConfig,
      projects: activeConfig.projects.map((entry) =>
        entry.project_id === projectId
          ? { ...entry, path_overrides: { ...entry.path_overrides, work_root: relative(overrideRoot) } }
          : entry,
      ),
    });
    const overriddenContext = isolated.loadProjectContext(
      repositoryRoot,
      activeConfig,
      config.repository.repository_id,
      projectId,
    );
    expect(binding(overriddenContext, projectId).path_profile.paths.work_root).toBe(relative(overrideRoot));
    expect(binding(overriddenContext, projectId).path_profile.resolved_paths.work_root).toBe(overrideRoot);
    expect(binding(overriddenContext, projectId).path_profile.provenance.work_root.layer).toBe('project-config');
    activeConfig = loadConfigFixture({
      ...activeConfig,
      paths: {
        ...activeConfig.paths,
        defaults: { ...activeConfig.paths.defaults, work_root: activeConfig.paths.defaults.work_root + '/changed' },
      },
    });
    expect(() => isolated.validateProjectContextBinding(context, repositoryRoot)).toThrow(
      'resolved path profile config is stale',
    );
    activeConfig = loadConfigFixture({
      ...config,
      control: { ...activeConfig.control, checkpoint_name: activeConfig.control.checkpoint_name + '-changed' },
    });
    expect(() => isolated.validateProjectContext(context, repositoryRoot)).toThrow(
      'project context configuration is stale',
    );
    const profileRoot = tempRoot();
    activeConfig = loadConfigFixture({
      ...config,
      projects: activeConfig.projects.map((entry) =>
        entry.project_id === projectId
          ? { ...entry, path_overrides: { ...entry.path_overrides, work_root: relative(profileRoot) } }
          : entry,
      ),
    });
    const profile = isolated.resolvePathProfile(repositoryRoot, activeConfig, {
      processing_scope: 'selected_project',
      repository_id: config.repository.repository_id,
      project_id: projectId,
    });
    rmSync(profileRoot, { recursive: true, force: true });
    expect(() => isolated.validateResolvedPathProfile(profile, repositoryRoot)).toThrow(
      'resolved path profile is stale or forged',
    );
  });
});
