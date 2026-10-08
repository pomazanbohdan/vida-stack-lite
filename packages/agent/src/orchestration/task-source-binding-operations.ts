import { lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { deriveWorkspaceId } from '../workspace-identity.js';
import { loadProjectSetContext } from '../config/project-context.js';
import { loadRuntimeConfig, runtimeConfigDigest } from '../config/runtime-config.js';
import { requireSafeRepositoryAccess } from '../config/safe-repository-access.js';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import { compareScopedSourceSnapshots, type ScopedSourceSnapshot } from './scoped-source-snapshot.js';
import {
  HostStateStore,
  createTaskSourceMutationPolicyRequest as createHostTaskSourceMutationPolicyRequest,
  openHostStateDatabase,
  type HostStateSnapshot,
  type StateVersion,
  type WorkIdentity,
} from '../host-state.js';
import { readLocalSourceWriteAuthorization } from './local-source-authorization.js';
import { openConfiguredMastraSessionLedger, sessionHandoffDatabasePath } from './persistent-session-handoff.js';
import { validateTaskSourceBindingRequest, type TaskSourceBindingRequest } from './task-source-binding.js';
import type { TaskSourceMutationPolicyRequest } from './source-preflight-operations.js';
import { acceptedSourceAuthorizationRevision } from './admitted-development-packet.js';
import type { InitialSourceContinuationReceipt } from './initial-source-continuation.js';

export type TaskSourceBindingOperationMode = 'prepare' | 'inspect' | 'issue' | 'report' | 'recover';

/** Fresh Host-validated working directory for the current admitted Source tree. */
export interface SourceExecutionContextV1 {
  readonly schema: 'SourceExecutionContext/v1';
  readonly canonical_host_root: string;
  readonly source_root: string;
  readonly cwd: string;
  readonly binding_ref: {
    readonly operation_id: string;
    readonly request_id: string;
    readonly work_id: string;
    readonly attempt: number;
    readonly thread_id: string;
    readonly source_scope_digest: string;
  } | null;
}

export function readSourceExecutionContext(input: {
  readonly store: HostStateStore;
  readonly identity: WorkIdentity;
  readonly threadId: string;
  readonly attempt: number;
  readonly canonicalHostRoot: string;
}): SourceExecutionContextV1 {
  const binding = input.store.readCurrentTaskSourceBinding(input.identity, input.threadId, input.attempt);
  return Object.freeze({
    schema: 'SourceExecutionContext/v1',
    canonical_host_root: input.canonicalHostRoot,
    source_root: binding?.source_root ?? input.canonicalHostRoot,
    cwd: binding?.cwd ?? input.canonicalHostRoot,
    binding_ref: binding
      ? Object.freeze({
          operation_id: binding.operation_id,
          request_id: binding.request_id,
          work_id: binding.work_id,
          attempt: binding.attempt,
          thread_id: binding.thread_id,
          source_scope_digest: binding.source_scope.digest,
        })
      : null,
  });
}

/** Build the exact policy DTO from a prepared Host operation and its current CAS. */
export function createTaskSourceMutationPolicyRequest(input: {
  readonly repositoryRoot: string;
  readonly operation: Readonly<Record<string, unknown>>;
  readonly preparedStateVersion: StateVersion;
  readonly hostSnapshot: HostStateSnapshot;
}): TaskSourceMutationPolicyRequest {
  return createHostTaskSourceMutationPolicyRequest(input);
}

function requireOperation(condition: unknown, message: string): asserts condition {
  if (!condition) {
    const error = new Error(message) as Error & { code: string };
    error.code = 'GAP-VIDA-RUN-TASK-SOURCE-001';
    throw error;
  }
}

function validDigest(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

export function assertExistingTaskSourceHostDatabase(repositoryRoot: string, databasePath: string): void {
  requireOperation(
    path.isAbsolute(databasePath) && path.resolve(databasePath) === databasePath,
    'canonical Host database path is invalid',
  );
  let stats;
  try {
    stats = lstatSync(databasePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      requireOperation(
        false,
        'canonical Host database is missing; task source operation denied before storage creation',
      );
    throw error;
  }
  requireOperation(stats.isFile() && !stats.isSymbolicLink() && stats.nlink === 1, 'canonical Host database is unsafe');
  requireOperation(
    realpathSync.native(databasePath) === databasePath && databasePath.startsWith(repositoryRoot + path.sep),
    'canonical Host database is outside the configured Host root',
  );
}

function readRequest(repositoryRoot: string, relativePath: string): TaskSourceBindingRequest {
  requireOperation(
    typeof relativePath === 'string' &&
      relativePath.length > 0 &&
      relativePath.length <= 512 &&
      !path.isAbsolute(relativePath) &&
      !relativePath.includes('\\') &&
      !relativePath.split('/').some((part) => !part || part === '.' || part === '..') &&
      relativePath.startsWith('.agent/work/'),
    'task source request path must be a canonical path under .agent/work',
  );
  const bytes = requireSafeRepositoryAccess(repositoryRoot).readBytes(relativePath, 'task source binding request');
  requireOperation(bytes.length <= 65536, 'task source binding request exceeds the bounded size');
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    requireOperation(false, 'task source binding request is not valid JSON');
  }
  return validateTaskSourceBindingRequest(value);
}

function readReport(
  repositoryRoot: string,
  relativePath: string,
): {
  readonly expected_action_state_version: StateVersion;
  readonly report: import('./task-source-binding.js').TaskSourceBindingReport;
} {
  requireOperation(
    typeof relativePath === 'string' &&
      relativePath.length > 0 &&
      relativePath.length <= 512 &&
      !path.isAbsolute(relativePath) &&
      !relativePath.includes('\\') &&
      !relativePath.split('/').some((part) => !part || part === '.' || part === '..') &&
      relativePath.startsWith('.agent/work/'),
    'task source report path must be canonical under .agent/work',
  );
  const bytes = requireSafeRepositoryAccess(repositoryRoot).readBytes(relativePath, 'task source report');
  requireOperation(bytes.length <= 65536, 'task source report exceeds the bounded size');
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch {
    requireOperation(false, 'task source report envelope is not valid JSON');
  }
  requireOperation(
    value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).sort().join(',') === 'expected_action_state_version,report',
    'task source report envelope fields are invalid',
  );
  return value as {
    readonly expected_action_state_version: StateVersion;
    readonly report: import('./task-source-binding.js').TaskSourceBindingReport;
  };
}

function currentSourceAuthority(
  repositoryRoot: string,
  request: TaskSourceBindingRequest,
  currentWork: NonNullable<HostStateSnapshot['work']>,
  journal: Readonly<Record<string, unknown>>,
  config: ReturnType<typeof loadRuntimeConfig>,
  identity: WorkIdentity,
  initialContinuation: InitialSourceContinuationReceipt | null,
): { readonly source_authorization_sha256: string; readonly source_scope_digest: string } {
  const work = currentWork;
  requireOperation(
    request.canonical_host_root === repositoryRoot &&
      request.repository_id === config.repository.repository_id &&
      request.config_digest === runtimeConfigDigest(config) &&
      request.config_digest === work.binding.config_digest &&
      request.repository_id === work.binding.repository_id &&
      canonicalJsonDigest(request.project_ids) === canonicalJsonDigest(work.binding.project_ids) &&
      request.project_context_digest ===
        loadProjectSetContext(repositoryRoot, config, request.repository_id, request.project_ids)
          .project_context_digest &&
      identity.integrations_digest === work.binding.integrations_digest &&
      request.thread_id === work.lease?.thread_id &&
      request.work_id === work.binding.lifecycle_work_id &&
      request.attempt === request.expected_host.journal.attempt &&
      request.attempt === (journal.attempt as number),
    'task source request does not match the current Host configuration, ProjectContext or owner',
  );
  const sourceScope = journal.source_scope as
    | { readonly schema?: unknown; readonly digest?: unknown; readonly entries?: unknown }
    | null
    | undefined;
  requireOperation(
    sourceScope?.schema === 'ScopedSourceSnapshot/v1' &&
      validDigest(sourceScope.digest) &&
      Array.isArray(sourceScope.entries),
    'task source request has no valid current durable Host source scope',
  );
  try {
    compareScopedSourceSnapshots(sourceScope as ScopedSourceSnapshot, sourceScope as ScopedSourceSnapshot);
  } catch {
    requireOperation(false, 'task source current durable Host source scope integrity differs');
  }
  const allowedPaths = new Set([...work.lifecycle.scope.allowed_paths, ...work.lifecycle.scope.implementation_paths]);
  requireOperation(
    sourceScope.entries.every((entry) => {
      const relative = (entry as { path?: unknown })?.path;
      return (
        typeof relative === 'string' &&
        !relative.includes('\\') &&
        !relative.startsWith('/') &&
        !/^[A-Za-z]:/.test(relative) &&
        relative.split('/').every((part) => part && part !== '.' && part !== '..') &&
        [...allowedPaths].some(
          (allowed) => relative === allowed || relative.startsWith(allowed.replace(/\/$/, '') + '/'),
        )
      );
    }),
    'task source journal scope exceeds the current Work scope',
  );
  const approval = work.lifecycle.references.filter(
    (reference) =>
      reference.kind === 'execution_approval' &&
      reference.disposition === 'current' &&
      reference.decision === 'approved',
  );
  requireOperation(approval.length === 1, 'task source operation requires one current scoped human authorization');
  const reference = approval[0]!;
  const { authorization, sha256 } = readLocalSourceWriteAuthorization(repositoryRoot, reference.path);
  const authorizationSourceRevision = acceptedSourceAuthorizationRevision(
    work,
    journal,
    reference,
    initialContinuation,
  );
  requireOperation(
    reference.artifact_schema === 'LocalSourceWriteAuthorization/v1' &&
      reference.scope_id === work.binding.scope_id &&
      reference.source_revision === authorizationSourceRevision,
    'task source operation authorization reference is stale or foreign',
  );
  const implementationPaths = [...work.binding.implementation_paths].sort();
  requireOperation(
    validDigest(reference.sha256) &&
      sha256 === reference.sha256 &&
      authorization.schema === 'LocalSourceWriteAuthorization/v1' &&
      authorization.action === 'source.write' &&
      authorization.user_instruction_ref === reference.record_id &&
      reference.principal === 'local-session:' + canonicalJsonDigest(authorization.native_session_handle) &&
      authorization.work_id === request.work_id &&
      authorization.attempt === request.attempt &&
      authorization.scope_digest === authorizationSourceRevision &&
      authorization.config_digest === request.config_digest &&
      authorization.workflow_id === work.binding.workflow_id &&
      authorization.native_session_handle === request.thread_id &&
      canonicalJsonDigest([...authorization.implementation_paths].sort()) ===
        canonicalJsonDigest(implementationPaths) &&
      authorization.stage_ids.every((stageId) => {
        const stage = config.workflows[authorization.workflow_id]?.stages.find((item) => item.id === stageId);
        return stage?.assignments.some(
          (assignment) => config.agents.profiles[assignment.profile]?.mutation_scope === 'repository_source',
        );
      }),
    'task source operation local authorization differs from current Work scope',
  );
  return { source_authorization_sha256: sha256, source_scope_digest: work.binding.work_source_revision };
}

/** Prepare or inspect a typed operation in the canonical Host database; this stage never invokes Git. */
export async function executeTaskSourceBindingOperation(input: {
  readonly repositoryRoot: string;
  readonly mode: TaskSourceBindingOperationMode;
  readonly requestPath: string;
  readonly reportPath?: string;
}): Promise<Readonly<Record<string, unknown>>> {
  requireOperation(
    input !== null &&
      typeof input === 'object' &&
      (Object.keys(input).sort().join(',') === 'mode,repositoryRoot,requestPath' ||
        Object.keys(input).sort().join(',') === 'mode,reportPath,repositoryRoot,requestPath') &&
      ['prepare', 'inspect', 'issue', 'report', 'recover'].includes(input.mode) &&
      (input.mode === 'report' ? typeof input.reportPath === 'string' : input.reportPath === undefined) &&
      path.isAbsolute(input.repositoryRoot) &&
      path.resolve(input.repositoryRoot) === input.repositoryRoot,
    'task source operation CLI input is invalid',
  );
  const root = input.repositoryRoot,
    config = loadRuntimeConfig(root),
    request = readRequest(root, input.requestPath);
  requireOperation(
    request.canonical_host_root === root,
    'task source request canonical Host root differs from --project-root',
  );
  const project = loadProjectSetContext(root, config, request.repository_id, request.project_ids),
    identity: WorkIdentity = {
      repository_id: project.repository_id,
      project_ids: project.project_ids,
      integrations_digest: project.integrations_digest,
      work_id: request.work_id,
    },
    databasePath = sessionHandoffDatabasePath(root, config);
  assertExistingTaskSourceHostDatabase(root, databasePath);
  if (input.mode === 'issue') {
    const ledger = openConfiguredMastraSessionLedger(root);
    try {
      return await ledger.hostState.issueTaskSourceBindingOperation({ request, identity });
    } finally {
      ledger.close();
    }
  }
  const database = openHostStateDatabase(databasePath);
  try {
    const store = new HostStateStore(
        database,
        deriveWorkspaceId(config.repository.repository_id, root),
        undefined,
        undefined,
        undefined,
        undefined,
        root,
      ),
      initialContinuation = store.readInitialSourceContinuationReceipt(identity, request.attempt),
      verifyCurrent = (context: {
        readonly work: NonNullable<HostStateSnapshot['work']>;
        readonly ledger: NonNullable<HostStateSnapshot['ledger']>;
        readonly journal: Readonly<Record<string, unknown>>;
      }) => {
        const currentConfig = loadRuntimeConfig(root),
          currentProject = loadProjectSetContext(root, currentConfig, request.repository_id, request.project_ids);
        requireOperation(
          runtimeConfigDigest(currentConfig) === request.config_digest &&
            currentProject.project_context_digest === request.project_context_digest,
          'task source configuration or ProjectContext changed during preparation',
        );
        return currentSourceAuthority(
          root,
          request,
          context.work,
          context.journal,
          currentConfig,
          identity,
          initialContinuation,
        );
      };
    if (input.mode === 'prepare') return store.prepareTaskSourceBindingOperation({ request, identity, verifyCurrent });
    if (input.mode === 'inspect') {
      const operation = store.inspectTaskSourceBindingOperation({ request, identity, verifyCurrent });
      return Object.freeze({
        ...operation,
        source_execution_context: readSourceExecutionContext({
          store,
          identity,
          threadId: request.thread_id,
          attempt: request.attempt,
          canonicalHostRoot: root,
        }),
      });
    }
    if (input.mode === 'recover') return store.inspectTaskSourceBindingAction({ request, identity, verifyCurrent });
    const report = readReport(root, input.reportPath!);
    return store.reportTaskSourceBindingOperation({
      request,
      identity,
      expectedActionStateVersion: report.expected_action_state_version,
      report: report.report,
    });
  } finally {
    database.close(true);
  }
}
