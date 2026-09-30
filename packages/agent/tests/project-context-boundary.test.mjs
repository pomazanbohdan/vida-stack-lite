import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  loadProjectContext,
  loadProjectSetContext,
  normalizeProjectIds,
  issueTestTrustedPathProfileOverride,
  PathProfileError,
  pathProfileGap,
  requireAbsoluteRepositoryRoot,
  resolvePathProfile,
  resolveProjectForRepositoryPath,
  validateProjectContext,
  validateProjectContextBinding,
  validateResolvedPathProfile,
} from '../src/config/project-context.ts';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { linkSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const repositoryRoot = process.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT ?? path.resolve(process.cwd(), '..');
const config = loadRuntimeConfig(repositoryRoot);
const project = loadProjectContext(repositoryRoot, config, config.repository.repository_id, '3mob');
function binding(context, projectId) {
  return context.project_bindings.find((entry) => entry.project_id === projectId);
}
const scopeId = binding(project, '3mob').path_profile.scope_id;
const temporaryRoots = [];

function relative(value) {
  return path.relative(repositoryRoot, value).split(path.sep).join('/');
}
function options(paths = {}) {
  return {
    processing_scope: 'selected_project',
    repository_id: config.repository.repository_id,
    project_id: '3mob',
    trusted_override: issueTestTrustedPathProfileOverride({
      schema: 'TrustedPathProfileOverride/v1',
      scope_id: scopeId,
      paths,
    }),
  };
}
function resolve(paths = {}) {
  return resolvePathProfile(repositoryRoot, config, options(paths));
}
function tempRoot() {
  const value = realpathSync(
    mkdtempSync(path.join(repositoryRoot, '.agent', 'work', 'agent-runtime-project-context-')),
  );
  temporaryRoots.push(value);
  return value;
}
function expectPathFailure(value) {
  expect(() => resolve({ work_root: value }), 'unsafe path accepted: ' + JSON.stringify(value)).toThrow();
}

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('../src/config/runtime-config.ts');
  while (temporaryRoots.length) rmSync(temporaryRoots.pop(), { recursive: true, force: true });
});

describe('project context path boundary', () => {
  test('resolves the longest unique project root and blocks equal-depth ambiguity', () => {
    const projects = [
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
    expect(() =>
      resolveProjectForRepositoryPath(
        [
          { project_id: 'aa', project_root: 'packages/a' },
          { project_id: 'bb', project_root: 'packages/a' },
        ],
        'packages/a/src',
      ),
    ).toThrow(/ambiguous project roots/);
    expect(() => resolveProjectForRepositoryPath(projects, 'outside/../root')).toThrow(/unsafe path segment/);
  });

  test('canonicalizes task project ids without changing project identity', () => {
    expect(normalizeProjectIds(['billing', 'root', 'billing'])).toEqual(['billing', 'root']);
    expect(() => normalizeProjectIds([])).toThrow(/project ids must be non-empty/);
    expect(() => normalizeProjectIds(['billing', ''])).toThrow(/project id is invalid/);
  });

  test('binds an exact multi-project context without a primary project', () => {
    const first = loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, [
      'refactoring',
      '3mob',
    ]);
    const reordered = loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, [
      '3mob',
      'refactoring',
    ]);
    expect(first.project_ids).toEqual(['3mob', 'refactoring']);
    expect(
      loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, ['3mob', '3mob']).project_ids,
    ).toEqual(['3mob']);
    expect(first.project_context_digest).toBe(reordered.project_context_digest);
    expect(first.integrations_digest).toBe(reordered.integrations_digest);
    expect(first.path_bindings_digest).toBe(reordered.path_bindings_digest);
    expect(first.project_bindings.map((entry) => entry.project_id)).toEqual(['3mob', 'refactoring']);
    expect(first.integration_bindings.map((entry) => entry.project_id)).toEqual(['3mob', 'refactoring']);
    expect(first).not.toHaveProperty('integration_binding');
    expect(() => loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, [])).toThrow(
      /project ids must be non-empty/,
    );
    expect(() =>
      loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, ['3mob', 'missing']),
    ).toThrow(/project identity is not configured/);
    expect(() =>
      loadProjectSetContext(repositoryRoot, config, config.repository.repository_id, ['3mob'], {
        trusted_overrides: {
          refactoring: issueTestTrustedPathProfileOverride({
            schema: 'TrustedPathProfileOverride/v1',
            scope_id: 'repository:' + config.repository.repository_id + '/project:refactoring',
            paths: {},
          }),
        },
      }),
    ).toThrow(/exactly the selected project set/);
  });

  test('rejects unsafe repository-relative path forms', () => {
    expect(() => resolve({ work_root: '' })).toThrow(/work_root must be a non-empty relative path/);
    expect(() => resolve({ work_root: null })).toThrow(/work_root must be a non-empty relative path/);
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
    const forged = {
      schema: 'TrustedPathProfileOverride/v1',
      scope_id: binding(project, '3mob').path_profile.scope_id,
      paths: { work_root: 'agent-runtime-new' },
    };
    expect(() => resolvePathProfile(repositoryRoot, config, { ...options(), trusted_override: forged })).toThrow(
      /capability/,
    );
    expect(() =>
      loadProjectContext(repositoryRoot, config, config.repository.repository_id, '3mob', { trusted_override: forged }),
    ).toThrow(/capability/);
  });
  test('rejects selector and snapshot violations', () => {
    expect(() =>
      resolvePathProfile(repositoryRoot, config, {
        processing_scope: 'selected_project',
        repository_id: undefined,
        project_id: '3mob',
      }),
    ).toThrow(/repository id is invalid/);
    expect(() =>
      resolvePathProfile(repositoryRoot, config, {
        processing_scope: 'selected_project',
        repository_id: 'bad!',
        project_id: '3mob',
      }),
    ).toThrow(/repository id is invalid/);
    expect(() =>
      resolvePathProfile(repositoryRoot, config, {
        processing_scope: 'selected_project',
        repository_id: '!crmbx',
        project_id: '3mob',
      }),
    ).toThrow(/repository id is invalid/);
    expect(() =>
      resolvePathProfile(repositoryRoot, config, {
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
    ).toThrow('project identity is not configured: creatio-sample-repository/missing');
    expect(
      resolvePathProfile(repositoryRoot, config, {
        processing_scope: 'selected_project',
        repository_id: config.repository.repository_id,
        project_id: 'refactoring',
      }).scope_id,
    ).toContain('project:refactoring');
    expect(
      resolvePathProfile(repositoryRoot, config, {
        processing_scope: 'selected_project',
        repository_id: config.repository.repository_id,
        project_id: '3mob',
      }).scope_id,
    ).toContain('project:3mob');
    expect(() =>
      resolvePathProfile(repositoryRoot, config, {
        processing_scope: 'selected_project',
        repository_id: 'missing',
        project_id: '3mob',
      }),
    ).toThrow('repository identity is not configured: missing');
    expect(() =>
      resolvePathProfile(repositoryRoot, config, {
        processing_scope: 'whole_repository',
        repository_id: config.repository.repository_id,
      }),
    ).toThrow(/whole_repository scope cannot include project identity/);
    expect(() =>
      resolvePathProfile(repositoryRoot, config, { processing_scope: 'whole_repository', project_id: '3mob' }),
    ).toThrow(/whole_repository scope cannot include project identity/);
    const stale = structuredClone(config);
    stale.config_revision += 1;
    expect(() => resolvePathProfile(repositoryRoot, stale, {})).toThrow(/runtime config snapshot is stale or forged/);
    expect(() => loadProjectContext(repositoryRoot, config, 'missing', '3mob')).toThrow(
      'project context repository identity is invalid',
    );
    expect(() => loadProjectContext(repositoryRoot, config, config.repository.repository_id, 'missing')).toThrow(
      'project identity is not configured: creatio-sample-repository/missing',
    );
    expect(loadProjectContext(repositoryRoot, config, 'creatio-sample-repository', '3mob').project_ids).toEqual([
      '3mob',
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
    for (const key of ['documentation_policy_path', 'documentation_map_path', 'documentation_index_path']) {
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
    const whole = resolvePathProfile(repositoryRoot, config);
    expect(whole.schema).toBe('ResolvedPathProfile/v1');
    expect(whole.scope_id).toBe('repository:' + config.config_id);
    expect(whole.processing_scope).toBe('whole_repository');
    expect(whole.path_identities.repository_root).not.toBeNull();
    const project3 = binding(project, '3mob');
    expect(project3.path_bindings.schema).toBe('ProjectPathBindings/v1');
    expect(project3.path_bindings.repository_root).toBe(repositoryRoot);
    expect(project3.path_bindings.contour).toBe(project3.path_profile.scope_id);
    expect(project3.path_bindings.provider).toBe('agent-runtime.config.v1.yaml');
    expect(project3.path_bindings.paths.find((entry) => entry.kind === 'wiki_path').expected_type).toBe('file-parent');
    expect(project3.path_bindings.paths.find((entry) => entry.kind === 'documentation_policy_path').expected_type).toBe(
      'file',
    );
    expect(project3.path_bindings.paths.find((entry) => entry.kind === 'work_root').expected_type).toBe('directory');
    const overridden = resolve({ work_root: '.' });
    expect(overridden.provenance.work_root).toEqual({
      layer: 'trusted-override',
      pointer: '$trusted_override.paths.work_root',
    });
    expect(validateResolvedPathProfile(project3.path_profile, repositoryRoot)).toBe(project3.path_profile);
    expect(validateResolvedPathProfile(whole, repositoryRoot)).toBe(whole);
    expect(validateProjectContextBinding(project, repositoryRoot)).toBe(project);
    expect(validateProjectContext(project, repositoryRoot)).toBe(project);
    const second = loadProjectContext(repositoryRoot, config, 'creatio-sample-repository', 'refactoring');
    const secondBinding = binding(second, 'refactoring');
    expect(secondBinding.integration_binding.tenant_id).toBe('agentsustem');
    expect(project.repository_title).toBe(config.repository.title);
    expect(second.repository_title).toBe(config.repository.title);
    expect(second.repository_title).not.toBe(secondBinding.project_title);
    expect(secondBinding.project_title).toBe('АгентСустем refactoring');
    expect(secondBinding.code_selectors).toEqual(
      config.projects.find((entry) => entry.project_id === 'refactoring').code_selectors,
    );
    expect(secondBinding.path_profile.provenance.wiki_root).toEqual({
      layer: 'project-config',
      pointer: '$.projects[refactoring].wiki_root',
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
      validateResolvedPathProfile(project3.path_profile, path.join(repositoryRoot, 'agent-runtime-new')),
    ).toThrow('resolved path profile identity is invalid');
    expect(() => requireAbsoluteRepositoryRoot(null)).toThrow('trusted repository root must be absolute');
    expect(() => requireAbsoluteRepositoryRoot('.')).toThrow('trusted repository root must be absolute');
    expect(() => requireAbsoluteRepositoryRoot(repositoryRoot + path.sep + '.')).toThrow(
      'trusted repository root must be canonical',
    );
    try {
      resolve({ work_root: 'a/../b' });
    } catch (error) {
      expect(error).toBeInstanceOf(PathProfileError);
      expect(error.name).toBe('PathProfileError');
      expect(error.code).toBe(pathProfileGap);
    }
  });
  test('resolves standalone repository contours', async () => {
    const standaloneConfig = structuredClone(config);
    standaloneConfig.paths.repository_mode = 'standalone';
    standaloneConfig.paths.processing_scope = 'whole_repository';
    standaloneConfig.paths.standalone_identity = { repository_id: 'standalone', project_id: 'standalone' };
    standaloneConfig.paths.defaults.work_root = '.';
    let activeConfig = standaloneConfig;
    vi.doMock('../src/config/runtime-config.ts', async () => ({
      ...(await vi.importActual('../src/config/runtime-config.ts')),
      loadRuntimeConfig: () => activeConfig,
    }));
    const isolated = await import('../src/config/project-context.ts?standalone-boundary');
    const resolved = isolated.resolvePathProfile(repositoryRoot, standaloneConfig);
    expect(resolved.scope_id).toBe('repository:creatio-sample');
    expect(resolved.registry_hash).toBeNull();
    return;
    const standaloneRoot = isolated.resolvePathProfile(repositoryRoot, standaloneConfig, {
      trusted_override: isolated.issueTestTrustedPathProfileOverride({
        schema: 'TrustedPathProfileOverride/v1',
        scope_id: 'standalone:standalone/standalone',
        paths: { work_root: '.' },
      }),
    });
    expect(standaloneRoot.paths.work_root).toBe('.');
    expect(isolated.validateResolvedPathProfile(standaloneRoot, repositoryRoot)).toBe(standaloneRoot);
    expect(() => isolated.loadProjectContext(repositoryRoot, standaloneConfig, 'crmbx', '3mob')).toThrow(
      'project context requires monorepo mode',
    );
    expect(() =>
      isolated.resolvePathProfile(repositoryRoot, standaloneConfig, {
        processing_scope: 'selected_project',
        repository_id: config.repository.repository_id,
        project_id: '3mob',
      }),
    ).toThrow('standalone repositories support whole_repository only');
    const partialConfig = structuredClone(config);
    delete partialConfig.projects.projects.find((entry) => entry.project_id === '3mob' && entry.project_id === '3mob')
      .path_overrides;
    activeConfig = partialConfig;
    const partialProfile = isolated.resolvePathProfile(repositoryRoot, partialConfig, {
      processing_scope: 'selected_project',
      repository_id: config.repository.repository_id,
      project_id: '3mob',
    });
    expect(partialProfile.paths.project_root).toBe('.');
    activeConfig = structuredClone(config);
    const context = isolated.loadProjectContext(repositoryRoot, activeConfig, 'crmbx', '3mob');
    const overrideRoot = tempRoot();
    activeConfig.projects.projects.find(
      (entry) => entry.project_id === '3mob' && entry.project_id === '3mob',
    ).path_overrides = { work_root: relative(overrideRoot) };
    const overriddenContext = isolated.loadProjectContext(repositoryRoot, activeConfig, 'crmbx', '3mob');
    expect(overriddenContext.path_profile.paths.work_root).toBe(relative(overrideRoot));
    expect(overriddenContext.path_profile.resolved_paths.work_root).toBe(overrideRoot);
    expect(overriddenContext.path_profile.provenance.work_root.layer).toBe('project-config');
    activeConfig.paths.defaults.work_root += '/changed';
    expect(() => isolated.validateProjectContextBinding(context, repositoryRoot)).toThrow(
      'resolved path profile config is stale',
    );
    activeConfig = structuredClone(config);
    activeConfig.control.checkpoint_name += '-changed';
    expect(() => isolated.validateProjectContext(context, repositoryRoot)).toThrow(
      'project context configuration is stale',
    );
    const profileRoot = tempRoot();
    activeConfig = structuredClone(config);
    activeConfig.projects.projects.find(
      (entry) => entry.project_id === '3mob' && entry.project_id === '3mob',
    ).path_overrides = { work_root: relative(profileRoot) };
    const profile = isolated.resolvePathProfile(repositoryRoot, activeConfig, {
      processing_scope: 'selected_project',
      repository_id: config.repository.repository_id,
      project_id: '3mob',
    });
    rmSync(profileRoot, { recursive: true, force: true });
    expect(() => isolated.validateResolvedPathProfile(profile, repositoryRoot)).toThrow(
      'resolved path profile is stale or forged',
    );
  });
});
