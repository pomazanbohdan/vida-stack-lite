import { lstatSync } from 'node:fs';
import path from 'node:path';
import { stringify } from 'yaml';
import { canonicalJsonDigest, freezeJsonValue } from '../contracts/public-ingress.js';
import { validateDocumentationPolicy, type DocumentationPolicy } from '../documentation/policy.js';
import { migratedProjectLayoutPath, prepareVidaProjectConfiguration } from './project-layout.js';
import {
  INITIALIZED_PROJECT_PATHS,
  LEGACY_RUNTIME_CONFIGURATION_PATH,
  PROJECT_CONFIGURATION_PATHS,
  RUNTIME_INITIALIZATION_PATH,
  PROJECT_INITIALIZATION_PATH,
  PROJECT_WORKSPACE_DATABASE_PATH,
} from './project-paths.js';
import type { AgentRuntimeConfig } from './runtime-config.js';
import { readRepositoryTextImage, type SafeRepositoryAccess } from './safe-repository-access.js';
import { validateProjectInitializationReceipt } from './project-initialization-record.js';
import { runtimeConfigDigest } from './runtime-config.js';

const instructionRoot = 'docs/agent-instructions';
const label = 'VIDA project upgrade artifacts';
const metadataPath = '.vida/layout.v1.json';
const projectPolicyPath = INITIALIZED_PROJECT_PATHS.projectPolicy;
export interface ProjectUpgradeArtifactContext {
  readonly operation_id: string;
  readonly created_at: string;
  readonly bundle_digest: string;
  readonly workspace_id: string;
}
export interface ProjectUpgradeDependency {
  readonly path: string;
  readonly bytes: string | null;
}
export interface PreparedProjectUpgradeArtifact {
  readonly path: string;
  readonly after: string;
}

function requireArtifact(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(label + ': ' + message);
}

function instructionFiles(
  access: SafeRepositoryAccess,
  directory = instructionRoot,
  depth = 0,
  files: string[] = [],
): string[] {
  requireArtifact(depth <= 32, 'instruction inventory exceeds the depth bound');
  if (!access.fileExists(directory, label)) return files;
  access.assertDirectory(directory, label);
  for (const name of access.listFiles(directory, label).slice().sort()) {
    const file = directory + '/' + name;
    const info = lstatSync(path.join(access.repository_root, file));
    requireArtifact(!info.isSymbolicLink(), 'instruction inventory contains a link');
    if (info.isDirectory()) instructionFiles(access, file, depth + 1, files);
    else {
      requireArtifact(info.isFile() && info.nlink === 1, 'instruction inventory contains an unsupported file');
      requireArtifact(
        /\.(?:md|json|jsonl|yaml|yml)$/u.test(name),
        'instruction inventory contains unsupported code or data',
      );
      files.push(file);
      requireArtifact(files.length <= 250, 'instruction inventory exceeds the file bound');
    }
  }
  return files;
}

/** A missing or added local instruction is a conflict; package instruction Source is outside this inventory. */
function dependencyPaths(config: AgentRuntimeConfig, instructions: readonly string[]): string[] {
  return [
    ...new Set([
      LEGACY_RUNTIME_CONFIGURATION_PATH,
      config.repository.policy,
      config.repository.sidecar,
      config.paths.defaults.documentation_policy_path,
      RUNTIME_INITIALIZATION_PATH,
      ...instructions,
    ]),
  ].sort();
}

export function projectUpgradeDependencyPaths(access: SafeRepositoryAccess, config: AgentRuntimeConfig): string[] {
  return dependencyPaths(config, instructionFiles(access));
}

function validateDependencyInventory(
  config: AgentRuntimeConfig,
  dependencies: readonly ProjectUpgradeDependency[],
): void {
  const paths = dependencies.map((entry) => entry.path);
  const expected = dependencyPaths(
    config,
    paths.filter((file) => file.startsWith(instructionRoot + '/')),
  );
  requireArtifact(
    canonicalJsonDigest(paths) === canonicalJsonDigest(expected),
    'dependency inventory is not exact and sorted',
  );
}

export function captureProjectUpgradeDependencies(
  access: SafeRepositoryAccess,
  config: AgentRuntimeConfig,
): ProjectUpgradeDependency[] {
  return projectUpgradeDependencyPaths(access, config).map((file) => ({
    path: file,
    bytes: readRepositoryTextImage(access, file, label),
  }));
}

function source(dependencies: readonly ProjectUpgradeDependency[], file: string): string {
  const entry = dependencies.find((entry) => entry.path === file);
  requireArtifact(entry?.bytes !== undefined && entry.bytes !== null, 'required project source is missing: ' + file);
  return entry.bytes;
}

/** Wrap a supported legacy instance without replacing any owner-authored body text. */
function instruction(bytes: string, sourcePath: string, schema: string): string {
  requireArtifact(
    !/^(?:\uFEFF)?---(?:\r?\n|$)/u.test(bytes),
    'versioned Markdown requires a supported migration reader',
  );
  return (
    '---\n' +
    stringify({ schema, id: 'project-' + canonicalJsonDigest(sourcePath), revision: 1, source_path: sourcePath }) +
    '---\n' +
    bytes
  );
}

function policyPath(file: string): string {
  return file === 'AGENTS.md' ? projectPolicyPath : migratedProjectLayoutPath(file);
}

function policyExclusions(policy: DocumentationPolicy): string[] {
  const roots = new Set(policy.excluded_roots.map(migratedProjectLayoutPath));
  requireArtifact(!roots.has('.vida'), 'documentation policy excludes managed VIDA configuration');
  for (const directory of [
    INITIALIZED_PROJECT_PATHS.work,
    INITIALIZED_PROJECT_PATHS.coordination,
    INITIALIZED_PROJECT_PATHS.planning,
    INITIALIZED_PROJECT_PATHS.temporary,
  ])
    roots.add(directory);
  return [...roots].sort();
}

function preparedPolicy(config: AgentRuntimeConfig, dependencies: readonly ProjectUpgradeDependency[]): string {
  const originalPath = config.paths.defaults.documentation_policy_path;
  const value: unknown = JSON.parse(source(dependencies, originalPath));
  const policy = validateDocumentationPolicy(value, originalPath);
  const after = validateDocumentationPolicy(
    {
      ...policy,
      source_path: INITIALIZED_PROJECT_PATHS.documentationPolicy,
      canonical_roots: [
        ...new Set([...policy.canonical_roots.map(policyPath), INITIALIZED_PROJECT_PATHS.instructions]),
      ],
      map_paths: [
        ...new Set([
          ...policy.map_paths.map(policyPath),
          ...Object.values(PROJECT_CONFIGURATION_PATHS),
          INITIALIZED_PROJECT_PATHS.sidecar,
          projectPolicyPath,
          'AGENTS.md',
          metadataPath,
        ]),
      ],
      excluded_roots: policyExclusions(policy),
      ...(typeof policy.changelog_path === 'string' ? { changelog_path: policyPath(policy.changelog_path) } : {}),
    },
    INITIALIZED_PROJECT_PATHS.documentationPolicy,
  );
  return JSON.stringify(after, null, 2) + '\n';
}

function localInstructions(
  config: AgentRuntimeConfig,
  dependencies: readonly ProjectUpgradeDependency[],
): PreparedProjectUpgradeArtifact[] {
  return dependencies
    .filter(
      (entry) =>
        entry.path.startsWith(instructionRoot + '/') && entry.path !== config.paths.defaults.documentation_policy_path,
    )
    .map((entry) => {
      requireArtifact(entry.bytes !== null, 'captured local instruction is missing');
      requireArtifact(
        entry.path.endsWith('.md'),
        'unsupported structured local instruction format at ' +
          entry.path +
          '; preserve the owner-authored bytes and migrate it with an explicitly supported schema reader',
      );
      return {
        path: migratedProjectLayoutPath(entry.path),
        after: instruction(entry.bytes, entry.path, 'VidaProjectInstruction/v1'),
      };
    });
}

/** Complete deterministic staging closure. Its metadata is not an activation or workspace authorization. */
export function prepareProjectUpgradeArtifacts(
  config: AgentRuntimeConfig,
  dependencies: readonly ProjectUpgradeDependency[],
  context: ProjectUpgradeArtifactContext,
) {
  validateDependencyInventory(config, dependencies);
  const prepared = prepareVidaProjectConfiguration(config);
  const files: PreparedProjectUpgradeArtifact[] = [
    ...(Object.keys(PROJECT_CONFIGURATION_PATHS) as (keyof typeof PROJECT_CONFIGURATION_PATHS)[]).map((key) => ({
      path: PROJECT_CONFIGURATION_PATHS[key],
      after: prepared.inputs[key],
    })),
    {
      path: INITIALIZED_PROJECT_PATHS.sidecar,
      after: instruction(
        source(dependencies, config.repository.sidecar),
        config.repository.sidecar,
        'VidaProjectSourceMap/v1',
      ),
    },
    {
      path: projectPolicyPath,
      after: instruction(
        source(dependencies, config.repository.policy),
        config.repository.policy,
        'VidaProjectInstruction/v1',
      ),
    },
    { path: INITIALIZED_PROJECT_PATHS.documentationPolicy, after: preparedPolicy(config, dependencies) },
    ...localInstructions(config, dependencies),
    {
      path: 'AGENTS.md',
      after:
        '# VIDA agent entry\n\nRead `.vida/AGENT.sidecar.md`, then `.vida/instructions/project-policy.md`.\n' +
        'Project configuration is `.vida/project.yaml`, `.vida/agents.yaml` and `.vida/flows.yaml`.\n' +
        'Use the installed VIDA bundle instructions; `vida-agent instructions --path development-lifecycle` locates the lifecycle owner.\n',
    },
  ];
  requireArtifact(new Set(files.map((file) => file.path)).size === files.length, 'prepared artifact paths collide');
  const originalInitialization = dependencies.find((entry) => entry.path === RUNTIME_INITIALIZATION_PATH);
  requireArtifact(originalInitialization !== undefined, 'original initialization dependency missing');
  files.push({
    path: metadataPath,
    after:
      JSON.stringify(
        {
          schema: 'VidaProjectLayout/v1',
          revision: 1,
          status: 'prepared',
          configuration_inputs: PROJECT_CONFIGURATION_PATHS,
          input_digest: prepared.input_digest,
          package_instruction_root: config.runtime.instruction_root,
          dependencies_digest: canonicalJsonDigest(dependencies),
          original_initialization:
            originalInitialization.bytes === null
              ? null
              : { path: RUNTIME_INITIALIZATION_PATH, digest: canonicalJsonDigest(originalInitialization.bytes) },
          files: files.map((file) => ({ path: file.path, digest: canonicalJsonDigest(file.after) })),
        },
        null,
        2,
      ) + '\n',
  });
  const receipt = validateProjectInitializationReceipt({
    schema: 'RuntimeInitialization/v2',
    version: 2,
    provenance: 'project-upgrade',
    repository_id: config.repository.repository_id,
    project_ids: config.projects.map((entry) => entry.project_id).sort(),
    workspace_id: context.workspace_id,
    workspace_binding_status: 'pending',
    bundle: config.runtime.bundle,
    bundle_digest: context.bundle_digest,
    config_digest: runtimeConfigDigest(prepared.config),
    input_digest: prepared.input_digest,
    current_config_digest: runtimeConfigDigest(prepared.config),
    current_input_digest: prepared.input_digest,
    configuration_rebind_id: null,
    operation_id: context.operation_id,
    database_path: PROJECT_WORKSPACE_DATABASE_PATH,
    configuration_inputs: PROJECT_CONFIGURATION_PATHS,
    prepared_artifacts: files.map((file) => ({
      path: file.path,
      sha256: new Bun.CryptoHasher('sha256').update(file.after).digest('hex'),
    })),
    created_at: context.created_at,
  });
  files.push({ path: PROJECT_INITIALIZATION_PATH, after: JSON.stringify(receipt, null, 2) + '\n' });
  return freezeJsonValue({ input_digest: prepared.input_digest, files });
}
