import { afterAll, describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJECT_CONFIGURATION_PATHS as publicProjectConfigurationPaths } from '../src/config/project-configuration.ts';
import {
  INITIALIZED_PROJECT_PATHS,
  LEGACY_RUNTIME_CONFIGURATION_PATH,
  PROJECT_ACTIVATION_PATH,
  PROJECT_CONFIGURATION_PATHS,
  PROJECT_INITIALIZATION_PATH,
  PROJECT_UPGRADE_OPERATION_PATH,
  PROJECT_WORKSPACE_DATABASE_PATH,
  RUNTIME_INITIALIZATION_PATH,
  bindLoadedConfigurationSource,
  projectConfigurationRebindPath,
  projectUpgradeHistoryPath,
  runtimeConfigurationSourceFor,
  sessionBridgeDatabasePath,
  sessionBridgeDatabaseRelativePath,
  sessionHandoffDatabasePath,
  sessionHandoffDatabaseRelativePath,
} from '../src/config/project-paths.ts';
import { loadRuntimeConfig, validateRuntimeConfig } from '../src/config/runtime-config.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(packageRoot, '../../');
const publicIndex = readFileSync(path.join(packageRoot, 'src/index.ts'), 'utf8');
const temporaryRoots: string[] = [];

afterAll(() => {
  for (const root of temporaryRoots) {
    if (!path.resolve(root).startsWith(path.resolve(tmpdir()))) throw Error('fixture cleanup escaped the temp root');
    rmSync(root, { recursive: true, force: true });
  }
});

function newTemporaryRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-project-paths-'));
  temporaryRoots.push(root);
  return root;
}

const validatedConfig = validateRuntimeConfig(loadRuntimeConfig(repositoryRoot));

describe('project path constants and public contracts', () => {
  test('keeps fixed configuration, initialization, and database pointers canonical', () => {
    expect(PROJECT_CONFIGURATION_PATHS).toEqual({
      project: '.vida/project.yaml',
      agents: '.vida/agents.yaml',
      flows: '.vida/flows.yaml',
    });
    expect(publicProjectConfigurationPaths).toBe(PROJECT_CONFIGURATION_PATHS);
    expect(publicIndex).toMatch(
      /export\s*\{[^}]*\bsessionHandoffDatabasePath\b[^}]*\}\s*from\s*'\.\/orchestration\/persistent-session-handoff\.js'/u,
    );
    expect(INITIALIZED_PROJECT_PATHS).toEqual({
      sidecar: '.vida/AGENT.sidecar.md',
      instructions: '.vida/instructions',
      projectPolicy: '.vida/instructions/project-policy.md',
      documentationPolicy: '.vida/documentation-policy.v1.json',
      work: '.vida/work',
      coordination: '.vida/coordination',
      planning: '.vida/planning/agent-flow',
      temporary: '.vida/tmp',
    });
    expect(LEGACY_RUNTIME_CONFIGURATION_PATH).toBe('agent-runtime.config.v1.yaml');
    expect(RUNTIME_INITIALIZATION_PATH).toBe('.agent/runtime-initialization.v1.json');
    expect(PROJECT_UPGRADE_OPERATION_PATH).toBe('.vida/project-upgrade.v1.json');
    expect(PROJECT_WORKSPACE_DATABASE_PATH).toBe('.vida/work/workspace.v1.sqlite');
    expect(PROJECT_INITIALIZATION_PATH).toBe('.vida/runtime-initialization.v2.json');
    expect(PROJECT_ACTIVATION_PATH).toBe('.vida/activation.v1.json');
  });

  test('binds configuration source to the exact validated config object', () => {
    expect(runtimeConfigurationSourceFor(validatedConfig)).toBe(LEGACY_RUNTIME_CONFIGURATION_PATH);

    const projectConfig = validateRuntimeConfig(validatedConfig);
    bindLoadedConfigurationSource(projectConfig, PROJECT_CONFIGURATION_PATHS.project);
    expect(runtimeConfigurationSourceFor(projectConfig)).toBe(PROJECT_CONFIGURATION_PATHS.project);
    expect(runtimeConfigurationSourceFor(validatedConfig)).toBe(LEGACY_RUNTIME_CONFIGURATION_PATH);
  });
});

describe('operation-derived project paths', () => {
  test('maps supported operation identities to canonical history and rebind locations', () => {
    expect(projectUpgradeHistoryPath('a')).toBe('.vida/work/upgrade-history/a.v1.json');
    expect(projectUpgradeHistoryPath('operation-1.v2_test')).toBe(
      '.vida/work/upgrade-history/operation-1.v2_test.v1.json',
    );
    expect(projectUpgradeHistoryPath(`a${'b'.repeat(79)}`)).toBe(
      `.vida/work/upgrade-history/a${'b'.repeat(79)}.v1.json`,
    );
    expect(projectConfigurationRebindPath('a')).toBe(
      '.vida/work/configuration-rebind/a/runtime-config-rebind-operation.v1.json',
    );
    expect(projectConfigurationRebindPath('operation-1.v2_test')).toBe(
      '.vida/work/configuration-rebind/operation-1.v2_test/runtime-config-rebind-operation.v1.json',
    );
    expect(projectConfigurationRebindPath(`a${'b'.repeat(79)}`)).toBe(
      `.vida/work/configuration-rebind/a${'b'.repeat(79)}/runtime-config-rebind-operation.v1.json`,
    );
  });

  test.each(['', 'Upper', '../outside', 'has/slash', 'has space', `a${'b'.repeat(80)}`])(
    'rejects unsupported operation identity %j for both path builders',
    (operationId) => {
      expect(() => projectUpgradeHistoryPath(operationId)).toThrow(/supported operation identity/);
      expect(() => projectConfigurationRebindPath(operationId)).toThrow(/supported operation identity/);
    },
  );
});

describe('session database path mapping', () => {
  test('uses the configured work root for both legacy database files', () => {
    const config = { ...validatedConfig, control: { ...validatedConfig.control, work_root: '.agent/work' } };
    expect(sessionHandoffDatabaseRelativePath(config)).toBe('.agent/work/session-handoff.v1.sqlite');
    expect(sessionBridgeDatabaseRelativePath(config)).toBe('.agent/work/mastra-workflows.v1.sqlite');
  });

  test('omits the current-directory root prefix and keeps relative pointers canonical', () => {
    const config = { ...validatedConfig, control: { ...validatedConfig.control, work_root: '.' } };
    expect(sessionHandoffDatabaseRelativePath(config)).toBe('session-handoff.v1.sqlite');
    expect(sessionBridgeDatabaseRelativePath(config)).toBe('mastra-workflows.v1.sqlite');
    expect(sessionHandoffDatabaseRelativePath(config)).not.toMatch(/^\.\//u);
    expect(sessionBridgeDatabaseRelativePath(config)).not.toMatch(/^\.\//u);
  });

  test('routes project configuration sources to the unified workspace database', () => {
    const config = validateRuntimeConfig(validatedConfig);
    bindLoadedConfigurationSource(config, PROJECT_CONFIGURATION_PATHS.project);
    expect(sessionHandoffDatabaseRelativePath(config)).toBe(PROJECT_WORKSPACE_DATABASE_PATH);
    expect(sessionBridgeDatabaseRelativePath(config)).toBe(PROJECT_WORKSPACE_DATABASE_PATH);
  });

  test('joins native absolute roots while mapping remains free of filesystem effects', () => {
    const root = newTemporaryRoot();
    const absentRoot = path.join(root, 'not-created');
    expect(existsSync(absentRoot)).toBe(false);

    const handoff = sessionHandoffDatabasePath(absentRoot, validatedConfig);
    const bridge = sessionBridgeDatabasePath(absentRoot, validatedConfig);
    expect(path.isAbsolute(handoff)).toBe(true);
    expect(path.isAbsolute(bridge)).toBe(true);
    expect(handoff).toBe(path.join(absentRoot, '.agent/work/session-handoff.v1.sqlite'));
    expect(bridge).toBe(path.join(absentRoot, '.agent/work/mastra-workflows.v1.sqlite'));
    expect(handoff).toBe(sessionHandoffDatabasePath(absentRoot, validatedConfig));
    expect(existsSync(absentRoot)).toBe(false);
  });

  test('joins the project database pointer beneath a native absolute repository root', () => {
    const root = newTemporaryRoot();
    const config = validateRuntimeConfig(validatedConfig);
    bindLoadedConfigurationSource(config, PROJECT_CONFIGURATION_PATHS.project);
    expect(sessionHandoffDatabasePath(root, config)).toBe(path.join(root, PROJECT_WORKSPACE_DATABASE_PATH));
    expect(sessionBridgeDatabasePath(root, config)).toBe(path.join(root, PROJECT_WORKSPACE_DATABASE_PATH));
  });
});
