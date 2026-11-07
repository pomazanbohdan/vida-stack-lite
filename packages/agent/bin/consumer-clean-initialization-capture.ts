import { randomUUID, createHash } from 'node:crypto';
import { lstatSync } from 'node:fs';
import path from 'node:path';
import type { AgentRuntimeConfig } from '../src/config/runtime-config.ts';
import { loadRuntimeConfig } from '../src/config/runtime-config.ts';
import { loadProjectSetContext } from '../src/config/project-context.ts';
import { repositoryReadOnlyObservation, requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
import {
  CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH,
  RUNTIME_INITIALIZATION_PENDING_PATH,
} from '../src/config/project-paths.ts';
import { canonicalRepositoryRoot, deriveWorkspaceId } from '../src/workspace-identity.ts';
import { captureInitializationRuntimeBinding } from './init-core.ts';
import { projectMappings } from './project-mapping-contract.ts';
import {
  sealCleanInitializationOperationV2,
  type ConsumerCleanInitializationOperationV2,
} from './consumer-clean-initialization-v2.ts';

const archiveSources = [
  'AGENTS.md',
  'agent-runtime.config.v1.yaml',
  'docs/agent-instructions/documentation-policy.v1.json',
  '.agent/runtime-initialization.v1.json',
] as const;
const preservedSources = [
  'AGENT.sidecar.md',
  'AGENTS.md',
  'docs/agent-instructions/documentation-policy.v1.json',
] as const;
const maxFileBytes = 8 * 1024 * 1024;

function fail(message: string): never {
  throw new Error('Clean initialization capture: ' + message);
}

function ordered(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function exactPathExists(
  root: string,
  relative: string,
  access: ReturnType<typeof requireSafeRepositoryAccess>,
  view: ReturnType<typeof repositoryReadOnlyObservation>,
): boolean {
  if (
    !relative ||
    relative.includes('\\') ||
    relative.includes(':') ||
    relative.split('/').some((part) => !part || part === '.' || part === '..')
  )
    fail('unsafe relative path');
  let parent = '.';
  const segments = relative.split('/');
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]!;
    const matches = view
      .listFiles(parent, 'clean initialization path parent')
      .filter((name) => name.toLowerCase() === segment.toLowerCase());
    if (matches.length > 1 || (matches.length === 1 && matches[0] !== segment)) fail('path case or alias collision');
    if (matches.length === 0) return false;
    parent = parent === '.' ? segment : `${parent}/${segment}`;
    if (index < segments.length - 1) access.directoryIdentity(parent, 'clean initialization path parent');
  }
  return true;
}

function fileObservation(root: string, relative: string, access: ReturnType<typeof requireSafeRepositoryAccess>) {
  const identify = access.observeFileIdentity;
  const capture = access.readVerifiedCaptureBytes;
  if (!identify || !capture) fail('native verified single-file capture is unavailable');
  const parent = path.posix.dirname(relative);
  const parentIdentity = access.directoryIdentity(parent, 'clean initialization file parent');
  const identity = identify(relative, 'clean initialization file');
  const before = lstatSync(path.join(root, ...relative.split('/')), { bigint: true });
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n) fail('source is not a private regular file');
  const bytes = capture(relative, 'clean initialization file', maxFileBytes);
  const after = lstatSync(path.join(root, ...relative.split('/')), { bigint: true });
  if (
    !after.isFile() ||
    after.isSymbolicLink() ||
    after.nlink !== 1n ||
    identify(relative, 'clean initialization file') !== identity ||
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size ||
    bytes.byteLength !== Number(after.size) ||
    access.directoryIdentity(parent, 'clean initialization file parent') !== parentIdentity
  )
    fail('file identity or parent changed during capture');
  return Object.freeze({
    type: 'file' as const,
    path: relative,
    identity,
    size: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}

function protectedPaths(config: AgentRuntimeConfig, projectRoots: readonly string[]): string[] {
  const result = [
    '.agent/coordination',
    '.agent/work',
    '.vida',
    '.git',
    '.tmp',
    config.repository.sidecar,
    config.repository.policy,
    config.runtime.schema_root,
    config.runtime.instruction_root,
    config.runtime.tooling_root,
    config.control.work_root,
    config.control.coordination_ledger,
    ...Object.entries(config.paths.defaults)
      .filter(([key]) => key !== 'repository_root')
      .map(([, value]) => value),
    config.research_decision.paths.research_records,
    config.research_decision.paths.decision_records,
    config.research_decision.paths.changelog,
    config.research_decision.paths.cache,
    config.research_decision.paths.activation_history,
    ...projectRoots,
    ...config.projects.flatMap((project) => [
      project.project_root,
      project.wiki_root,
      project.wiki_path,
      project.wiki_output_root,
      project.internal_root,
      project.ledger_root,
      ...Object.values(project.path_overrides ?? {}).filter((value): value is string => typeof value === 'string'),
    ]),
    ...config.knowledge.sources.filter((source) => source.kind === 'local').map((source) => source.location),
  ];
  for (const item of result) {
    if (
      typeof item !== 'string' ||
      !item ||
      item.includes('\\') ||
      item.includes(':') ||
      item.split('/').some((part) => part === '..' || (part === '.' && item !== '.'))
    )
      fail('configured protected path is invalid');
  }
  return ordered(result);
}

/** Re-derive the durable protection union from validated current config without adding v2 fields. */
export function consumerCleanInitializationProtectedPaths(config: AgentRuntimeConfig): string[] {
  return protectedPaths(
    config,
    config.projects.flatMap((project) => [
      project.project_root,
      project.wiki_root,
      project.wiki_path,
      project.wiki_output_root,
      project.internal_root,
      project.ledger_root,
      ...Object.values(project.path_overrides ?? {}).filter((value): value is string => typeof value === 'string'),
    ]),
  );
}

/** Capture a v2 plan from the current validated project config without publishing or creating anything. */
export function captureConsumerCleanInitializationV2(
  input: {
    readonly projectRoot: string;
    readonly repository: string;
    readonly projectMappings: readonly string[];
  },
  operationId = randomUUID(),
): ConsumerCleanInitializationOperationV2 {
  const request = structuredClone(input);
  const root = canonicalRepositoryRoot(request.projectRoot);
  if (root !== request.projectRoot) fail('project root must be canonical and physical');
  const mappings = projectMappings(request.projectMappings);
  const config = loadRuntimeConfig(root);
  if (config.repository.repository_id !== request.repository) fail('repository identity differs from validated config');
  const context = loadProjectSetContext(
    root,
    config,
    request.repository,
    mappings.map((mapping) => mapping.id),
  );
  for (const mapping of mappings) {
    const current = context.project_bindings.find((binding) => binding.project_id === mapping.id);
    if (!current || current.project_root !== mapping.root)
      fail('requested project mapping differs from current binding');
  }
  const workspace = deriveWorkspaceId(request.repository, root);
  const access = requireSafeRepositoryAccess(root);
  const view = repositoryReadOnlyObservation(access);
  const rootIdentity = access.directoryIdentity('.', 'clean initialization root');
  for (const target of [CONSUMER_CLEAN_INITIALIZATION_PENDING_PATH, RUNTIME_INITIALIZATION_PENDING_PATH])
    if (exactPathExists(root, target, access, view)) fail('an initialization operation is already pending');

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(operationId))
    fail('operation identity is invalid');
  const history = `.agent/clean-initialization-history/${operationId}`;
  if (exactPathExists(root, history, access, view)) fail('operation history path is occupied');
  const archiveRoot = `${history}/payload`;
  const preserved = preservedSources
    .filter((source) => exactPathExists(root, source, access, view))
    .map((source) => fileObservation(root, source, access));
  const inventory = archiveSources
    .filter((source) => !preserved.some((entry) => entry.path === source))
    .filter((source) => exactPathExists(root, source, access, view))
    .map((source) => fileObservation(root, source, access));
  const protected_paths = protectedPaths(
    config,
    context.path_bindings.flatMap((binding) =>
      binding.paths.filter((entry) => entry.kind !== 'repository_root').map((entry) => entry.relative),
    ),
  );
  const moves = inventory.map((entry) => ({
    kind: 'archive' as const,
    source: entry.path,
    target: `${archiveRoot}/${entry.path}`,
    source_identity: entry.identity,
    type: 'file' as const,
    state: 'not-started' as const,
  }));
  const containers = ordered(
    moves.flatMap((move) => {
      const parts = move.target.split('/');
      return parts.slice(1, -1).flatMap((_part, index) => {
        const value = parts.slice(0, index + 2).join('/');
        return value === '.agent' ? [] : [value];
      });
    }),
  ).map((containerPath) => ({ path: containerPath, state: 'not-started' as const, identity: null }));
  const runtime = captureInitializationRuntimeBinding();
  if (access.directoryIdentity('.', 'clean initialization root') !== rootIdentity)
    fail('project root changed during capture');
  return sealCleanInitializationOperationV2({
    schema: 'ConsumerCleanInitializationOperation/v2',
    version: 2,
    operation_id: operationId,
    root,
    root_identity: rootIdentity,
    workspace_id: workspace,
    request,
    runtime,
    archive_root: archiveRoot,
    inventory,
    preserved,
    protected_paths,
    moves,
    containers,
    phase: 'intent',
    prepared: null,
    initialization: 'not-started',
  });
}
