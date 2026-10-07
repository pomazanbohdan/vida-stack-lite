import path from 'node:path';
import { canonicalJsonDigest } from '../contracts/public-ingress.js';
import type { HostStateSnapshot, HostStateStore, StateVersion, WorkIdentity } from '../host-state.js';

/** Exact HostState compare-and-swap references observed before a task-source operation. */
export interface TaskSourceExpectedHost {
  readonly work: StateVersion;
  readonly ledger: StateVersion;
  readonly journal: { readonly attempt: number; readonly version: StateVersion };
  readonly maintenance_generation: number;
}

/** Project identity is bound to the current configuration and ProjectContext digests. */
export interface TaskSourceContextBinding {
  readonly config_digest: string;
  readonly project_context_digest: string;
}

/** A source checkout observation bound to its canonical host and admitted work identity. */
export interface TaskSourceBinding {
  readonly schema: 'TaskSourceBinding/v1';
  readonly operation: TaskSourceBindingRequest['operation'];
  readonly operation_id: string;
  readonly request_id: string;
  readonly branch_ref?: string;
  readonly expected_host: TaskSourceExpectedHost;
  readonly work_id: string;
  readonly attempt: number;
  readonly thread_id: string;
  readonly repository_id: string;
  readonly project_ids: readonly string[];
  readonly canonical_host_root: string;
  readonly source_root: string;
  readonly config_digest: string;
  readonly project_context_digest: string;
  readonly source_scope: TaskSourceScope;
  readonly branch: string | null;
  readonly canonical_host_common_dir: string;
  readonly common_dir: string;
  readonly head: string;
  readonly cwd: string;
}

export interface TaskSourceScope {
  readonly schema: 'ScopedSourceSnapshot/v1';
  readonly entries: readonly {
    readonly path: string;
    readonly exists: boolean;
    readonly bytes: number | null;
    readonly sha256: string | null;
  }[];
  readonly digest: string;
}

export interface TaskSourceGitObservation {
  readonly source_root: string;
  readonly common_dir: string;
  readonly branch: string | null;
  readonly head: string;
  readonly cwd: string;
}

/** Creating this typed request is the explicit opt-in; no request means no separate source tree. */
export interface TaskSourceBindingRequest extends TaskSourceContextBinding {
  readonly schema: 'TaskSourceBindingRequest/v1';
  readonly operation: 'inspect' | 'propose-create' | 'propose-adopt';
  readonly operation_id: string;
  readonly request_id: string;
  readonly branch_ref?: string;
  readonly expected_host: TaskSourceExpectedHost;
  readonly canonical_host_root: string;
  readonly source_root?: string;
  readonly work_id: string;
  readonly attempt: number;
  readonly thread_id: string;
  readonly repository_id: string;
  readonly project_ids: readonly string[];
}

/** A report is cooperative consistency data. It does not authenticate a tool call or grant rights. */
export interface TaskSourceBindingReport {
  readonly schema: 'TaskSourceBindingReport/v1';
  readonly operation: TaskSourceBindingRequest['operation'];
  readonly operation_id: string;
  readonly request_id: string;
  readonly report_id: string;
  readonly expected_host: TaskSourceExpectedHost;
  readonly status: 'observed' | 'proposed' | 'denied' | 'unknown';
  readonly binding: TaskSourceBinding | null;
  readonly reason?: string;
}

const digestPattern = /^[a-f0-9]{64}$/;
const operationPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function validateTaskSourceBindingRequest(candidate: unknown): TaskSourceBindingRequest {
  requireBinding(candidate !== null && typeof candidate === 'object', 'task source request must be an object');
  const value = candidate as TaskSourceBindingRequest;
  requireBinding(value.schema === 'TaskSourceBindingRequest/v1', 'task source request schema is invalid');
  requireOperation(value.operation);
  const operationId = validateOperationId(value.operation_id, 'operation ID');
  const requestId = validateOperationId(value.request_id, 'request ID');
  const branchRef = value.branch_ref === undefined ? undefined : validateCanonicalBranchRef(value.branch_ref);
  requireBinding(value.operation === 'inspect' || branchRef !== undefined, 'branch ref is required for create and adopt proposals');
  const expectedHost = validateExpectedHost(value.expected_host);
  const canonicalHostRoot = canonicalAbsolutePath(value.canonical_host_root, 'canonical host root');
  const sourceRoot = value.source_root === undefined
    ? undefined
    : canonicalAbsolutePath(value.source_root, 'task source root');
  requireBinding(typeof value.work_id === 'string' && value.work_id.length > 0 && value.work_id.length <= 128, 'work ID is invalid');
  requireBinding(Number.isSafeInteger(value.attempt) && value.attempt > 0, 'attempt is invalid');
  requireBinding(expectedHost.journal.attempt === value.attempt, 'Host journal attempt does not match the task attempt');
  requireBinding(typeof value.thread_id === 'string' && value.thread_id.length > 0 && value.thread_id.length <= 256, 'thread ID is invalid');
  requireBinding(typeof value.repository_id === 'string' && /^[a-z0-9][a-z0-9._-]{0,127}$/.test(value.repository_id), 'repository ID is invalid');
  const projectIds = canonicalProjectIds(value.project_ids);
  const context = validateTaskSourceContext(value);
  const request: TaskSourceBindingRequest = Object.freeze({
    schema: value.schema,
    operation: value.operation,
    operation_id: operationId,
    request_id: requestId,
    ...(branchRef === undefined ? {} : { branch_ref: branchRef }),
    expected_host: expectedHost,
    canonical_host_root: canonicalHostRoot,
    ...(sourceRoot === undefined ? {} : { source_root: sourceRoot }),
    work_id: value.work_id,
    attempt: value.attempt,
    thread_id: value.thread_id,
    repository_id: value.repository_id,
    project_ids: projectIds,
    ...context,
  });
  requireBinding(canonicalJsonDigest(request) === canonicalJsonDigest(value), 'task source request contains unexpected or noncanonical fields');
  return request;
}

export function validateTaskSourceBindingReport(candidate: unknown): TaskSourceBindingReport {
  requireBinding(candidate !== null && typeof candidate === 'object', 'task source report must be an object');
  const value = candidate as TaskSourceBindingReport;
  requireBinding(value.schema === 'TaskSourceBindingReport/v1', 'task source report schema is invalid');
  requireOperation(value.operation);
  const operationId = validateOperationId(value.operation_id, 'operation ID');
  const requestId = validateOperationId(value.request_id, 'request ID');
  const reportId = validateOperationId(value.report_id, 'report ID');
  const expectedHost = validateExpectedHost(value.expected_host);
  requireBinding(
    value.status === 'observed' || value.status === 'proposed' || value.status === 'denied' || value.status === 'unknown',
    'task source report status is invalid',
  );
  requireBinding(value.binding === null || (value.binding !== undefined && typeof value.binding === 'object'), 'task source report binding is invalid');
  requireBinding(
    (value.status === 'observed') === (value.binding !== null),
    'observed reports require a binding and other outcomes must not contain one',
  );
  const binding = value.binding === null ? null : validateTaskSourceBinding(value.binding);
  requireBinding(value.reason === undefined || (typeof value.reason === 'string' && value.reason.length <= 512), 'task source report reason is invalid');
  const report: TaskSourceBindingReport = Object.freeze({
    schema: value.schema,
    operation: value.operation,
    operation_id: operationId,
    request_id: requestId,
    report_id: reportId,
    expected_host: expectedHost,
    status: value.status,
    binding,
    ...(value.reason === undefined ? {} : { reason: value.reason }),
  });
  requireBinding(canonicalJsonDigest(report) === canonicalJsonDigest(value), 'task source report contains unexpected or noncanonical fields');
  return report;
}

/** Check exact cooperative request/report identity and binding correspondence. */
export function validateTaskSourceBindingExchange(
  requestCandidate: unknown,
  reportCandidate: unknown,
): TaskSourceBindingReport {
  const request = validateTaskSourceBindingRequest(requestCandidate);
  const report = validateTaskSourceBindingReport(reportCandidate);
  requireBinding(report.operation === request.operation, 'task source report operation does not match its request');
  requireBinding(report.operation_id === request.operation_id, 'task source report operation ID does not match its request');
  requireBinding(report.request_id === request.request_id, 'task source report request ID does not match its request');
  requireBinding(
    canonicalJsonDigest(report.expected_host) === canonicalJsonDigest(request.expected_host),
    'task source report Host CAS references do not match its request',
  );
  if (report.binding !== null) {
    const binding = report.binding;
    requireBinding(binding.operation === request.operation, 'task source binding operation does not match its request');
    requireBinding(binding.operation_id === request.operation_id, 'task source binding operation ID does not match its request');
    requireBinding(binding.request_id === request.request_id, 'task source binding request ID does not match its request');
    requireBinding(binding.branch_ref === request.branch_ref, 'task source binding branch ref does not match its request');
    requireBinding(
      canonicalJsonDigest(binding.expected_host) === canonicalJsonDigest(request.expected_host),
      'task source binding Host CAS references do not match its request',
    );
    requireBinding(binding.work_id === request.work_id, 'task source binding work ID does not match its request');
    requireBinding(binding.attempt === request.attempt, 'task source binding attempt does not match its request');
    requireBinding(binding.thread_id === request.thread_id, 'task source binding thread ID does not match its request');
    requireBinding(binding.repository_id === request.repository_id, 'task source binding repository ID does not match its request');
    requireBinding(
      canonicalJsonDigest(binding.project_ids) === canonicalJsonDigest(request.project_ids),
      'task source binding project set does not match its request',
    );
    requireBinding(binding.canonical_host_root === request.canonical_host_root, 'task source binding host root does not match its request');
    requireBinding(
      binding.source_root === resolveTaskSourceRoot(request.canonical_host_root, request.source_root),
      'task source binding source root does not match its request',
    );
    requireBinding(binding.config_digest === request.config_digest, 'task source binding configuration does not match its request');
    requireBinding(
      binding.project_context_digest === request.project_context_digest,
      'task source binding ProjectContext does not match its request',
    );
  }
  return report;
}

function requireBinding(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function validateOperationId(value: unknown, label: string): string {
  requireBinding(typeof value === 'string' && operationPattern.test(value), `${label} is invalid`);
  return value;
}

function requireOperation(value: unknown): asserts value is TaskSourceBindingRequest['operation'] {
  requireBinding(
    value === 'inspect' || value === 'propose-create' || value === 'propose-adopt',
    'task source request operation is invalid',
  );
}

function validateCanonicalBranchRef(value: unknown): string {
  requireBinding(typeof value === 'string' && value.startsWith('refs/heads/'), 'branch ref must use canonical refs/heads/<name> form');
  requireBinding(value.length <= 1024, 'branch ref is too long');
  const name = value.slice('refs/heads/'.length);
  const components = name.split('/');
  const hasForbiddenCharacter = [...name].some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code < 0x21 || code === 0x7f || '~^:?*['.includes(character) || character === '\\';
  });
  requireBinding(
    name.length > 0 &&
      !name.startsWith('/') &&
      !name.endsWith('/') &&
      !name.includes('//') &&
      !name.includes('..') &&
      !name.includes('@{') &&
      !hasForbiddenCharacter &&
      !name.endsWith('.') &&
      components.every((component) => component.length > 0 && !component.startsWith('.') && !component.endsWith('.lock')),
    'branch ref is not a canonical Git head reference',
  );
  return value;
}

function canonicalAbsolutePath(value: unknown, label: string): string {
  requireBinding(typeof value === 'string' && value.length > 0 && path.isAbsolute(value), `${label} must be absolute`);
  const resolved = path.resolve(value);
  requireBinding(resolved === value, `${label} must be canonical`);
  return resolved;
}

function validateStateVersion(candidate: unknown, label: string): StateVersion {
  requireBinding(candidate !== null && typeof candidate === 'object', `${label} must be an object`);
  const value = candidate as StateVersion;
  requireBinding(
    Object.keys(value).sort().join(',') === 'digest,revision',
    `${label} contains unexpected fields`,
  );
  requireBinding(Number.isSafeInteger(value.revision) && value.revision > 0, `${label} revision is invalid`);
  requireBinding(typeof value.digest === 'string' && digestPattern.test(value.digest), `${label} digest is invalid`);
  return Object.freeze({ revision: value.revision, digest: value.digest });
}

function validateExpectedHost(candidate: unknown): TaskSourceExpectedHost {
  requireBinding(candidate !== null && typeof candidate === 'object', 'expected Host state is invalid');
  const value = candidate as TaskSourceExpectedHost;
  requireBinding(
    Object.keys(value).sort().join(',') === 'journal,ledger,maintenance_generation,work',
    'expected Host state contains unexpected fields',
  );
  requireBinding(value.journal !== null && typeof value.journal === 'object', 'expected Host journal reference is invalid');
  requireBinding(
    Object.keys(value.journal).sort().join(',') === 'attempt,version',
    'expected Host journal reference contains unexpected fields',
  );
  requireBinding(Number.isSafeInteger(value.journal.attempt) && value.journal.attempt > 0, 'expected Host journal attempt is invalid');
  requireBinding(Number.isSafeInteger(value.maintenance_generation) && value.maintenance_generation >= 0, 'maintenance generation is invalid');
  return Object.freeze({
    work: validateStateVersion(value.work, 'expected work version'),
    ledger: validateStateVersion(value.ledger, 'expected ledger version'),
    journal: Object.freeze({
      attempt: value.journal.attempt,
      version: validateStateVersion(value.journal.version, 'expected journal version'),
    }),
    maintenance_generation: value.maintenance_generation,
  });
}

function validateTaskSourceContext(value: TaskSourceContextBinding): TaskSourceContextBinding {
  requireBinding(typeof value.config_digest === 'string' && digestPattern.test(value.config_digest), 'configuration digest is invalid');
  requireBinding(
    typeof value.project_context_digest === 'string' && digestPattern.test(value.project_context_digest),
    'ProjectContext digest is invalid',
  );
  return Object.freeze({
    config_digest: value.config_digest,
    project_context_digest: value.project_context_digest,
  });
}

/** An omitted task source keeps the current host repository root. This function performs no I/O. */
export function resolveTaskSourceRoot(canonicalHostRoot: string, sourceRoot?: string): string {
  const host = canonicalAbsolutePath(canonicalHostRoot, 'canonical host root');
  return sourceRoot === undefined ? host : canonicalAbsolutePath(sourceRoot, 'task source root');
}

/** Resolve source-file access from a typed Host binding; null preserves canonical-root behavior. */
export function resolveTaskSourceFileRoot(input: {
  readonly canonicalHostRoot: string;
  readonly binding: TaskSourceBinding | null;
  readonly identity: WorkIdentity;
  readonly attempt: number;
  readonly threadId: string;
  readonly configDigest: string;
  readonly projectContextDigest: string;
  readonly sourceScopeDigest: string;
}): string {
  const hostRoot = canonicalAbsolutePath(input.canonicalHostRoot, 'canonical Host root');
  if (input.binding === null) return hostRoot;
  const binding = validateTaskSourceBinding(input.binding);
  requireBinding(
    binding.canonical_host_root === hostRoot &&
      binding.work_id === input.identity.work_id && binding.repository_id === input.identity.repository_id &&
      canonicalJsonDigest(binding.project_ids) === canonicalJsonDigest(input.identity.project_ids) &&
      binding.attempt === input.attempt && binding.thread_id === input.threadId &&
      binding.config_digest === input.configDigest &&
      binding.project_context_digest === input.projectContextDigest &&
      binding.source_scope.digest === input.sourceScopeDigest,
    'current Host task-source binding differs from the admitted file context',
  );
  return binding.source_root;
}

/** Resolve the current task root from a Host-validated binding; an unconfigured Host keeps the canonical root. */
export function resolveCurrentTaskSourceFileRoot(input: {
  readonly store: Pick<HostStateStore, 'readCurrentTaskSourceBinding'>;
  readonly host: HostStateSnapshot;
  readonly canonicalHostRoot: string;
  readonly attempt?: number;
}): string {
  const hostRoot = canonicalAbsolutePath(input.canonicalHostRoot, 'canonical Host root');
  const work = input.host.work;
  requireBinding(
    work !== null && work !== undefined && work.lease !== null,
    'current Host lease is required for task source root',
  );
  const identity: WorkIdentity = {
    repository_id: work.binding.repository_id,
    project_ids: work.binding.project_ids,
    integrations_digest: work.binding.integrations_digest,
    work_id: work.binding.lifecycle_work_id,
  };
  let binding: TaskSourceBinding | null;
  try {
    binding = input.store.readCurrentTaskSourceBinding(identity, work.lease.thread_id, input.attempt);
  } catch (error) {
    // A Host store without a configured repository root cannot contain a TaskSource operation.
    if (error instanceof Error && error.message === 'task source binding read context is invalid') return hostRoot;
    throw error;
  }
  return resolveTaskSourceRoot(hostRoot, binding?.source_root);
}

/** Exact fixed Git invocations. The caller invokes native Git and retains the actual observations. */
export function taskSourceGitArgv(sourceRoot: string): readonly (readonly string[])[] {
  const root = canonicalAbsolutePath(sourceRoot, 'task source root');
  return Object.freeze([
    Object.freeze(['-C', root, 'rev-parse', '--show-toplevel']),
    Object.freeze(['-C', root, 'rev-parse', '--path-format=absolute', '--git-common-dir']),
    Object.freeze(['-C', root, 'branch', '--show-current']),
    Object.freeze(['-C', root, 'rev-parse', 'HEAD']),
  ]);
}

function oneLine(value: unknown, label: string): string {
  requireBinding(typeof value === 'string', `${label} output must be text`);
  const line = value.endsWith('\r\n') ? value.slice(0, -2) : value.endsWith('\n') ? value.slice(0, -1) : value;
  requireBinding(line.length > 0 && !/[\r\n\0]/.test(line), `${label} output must contain exactly one nonempty line`);
  return line;
}

/** Parse fixed Git outputs. Lexical path agreement is not proof of physical path identity. */
export function parseTaskSourceGitObservation(
  sourceRoot: string,
  outputs: readonly [string, string, string, string],
  cwd: string,
): TaskSourceGitObservation {
  const root = canonicalAbsolutePath(sourceRoot, 'task source root');
  const topLevel = path.resolve(oneLine(outputs[0], 'Git top-level'));
  requireBinding(topLevel === root, 'Git top-level does not match the task source root');
  const commonOutput = oneLine(outputs[1], 'Git common directory');
  const commonDir = canonicalAbsolutePath(path.resolve(root, commonOutput), 'Git common directory');
  const rawBranch = outputs[2] === '' || outputs[2] === '\n' || outputs[2] === '\r\n'
    ? ''
    : oneLine(outputs[2], 'Git branch');
  const head = oneLine(outputs[3], 'Git HEAD').toLowerCase();
  requireBinding(/^[0-9a-f]{40}(?:[0-9a-f]{24})?$/.test(head), 'Git HEAD must be a full object ID');
  return Object.freeze({
    source_root: root,
    common_dir: commonDir,
    branch: rawBranch || null,
    head,
    cwd: canonicalAbsolutePath(cwd, 'caller working directory'),
  });
}

function canonicalProjectIds(projectIds: readonly string[]): readonly string[] {
  requireBinding(Array.isArray(projectIds) && projectIds.length > 0 && projectIds.length <= 128, 'project set is invalid');
  const sorted = [...projectIds].sort();
  requireBinding(
    sorted.every((id) => typeof id === 'string' && /^[a-z0-9][a-z0-9._-]{0,63}$/.test(id)) &&
      new Set(sorted).size === sorted.length,
    'project set must contain unique canonical project IDs',
  );
  return Object.freeze(sorted);
}

function validateScope(scope: TaskSourceScope): TaskSourceScope {
  requireBinding(
    Object.keys(scope).sort().join(',') === ['digest', 'entries', 'schema'].join(','),
    'source scope contains unexpected fields',
  );
  requireBinding(scope?.schema === 'ScopedSourceSnapshot/v1', 'source scope schema is invalid');
  requireBinding(Array.isArray(scope.entries) && scope.entries.length > 0 && scope.entries.length <= 512, 'source scope entries are invalid');
  let previous = '';
  for (const entry of scope.entries) {
    requireBinding(
      entry !== null &&
        typeof entry === 'object' &&
        Object.keys(entry).sort().join(',') === ['bytes', 'exists', 'path', 'sha256'].join(','),
      'source scope entry contains unexpected fields',
    );
    requireBinding(
      typeof entry.path === 'string' &&
        entry.path.length > 0 &&
        entry.path.length <= 512 &&
        !entry.path.includes('\\') &&
        !entry.path.startsWith('/') &&
        !/^[A-Za-z]:/.test(entry.path) &&
        !/[\u0000-\u001f]/.test(entry.path) &&
        entry.path.split('/').every((part: string) => part && part !== '.' && part !== '..') &&
        entry.path > previous,
      'source scope paths must be canonical, sorted, and unique',
    );
    previous = entry.path;
    requireBinding(typeof entry.exists === 'boolean', 'source scope existence flag is invalid');
    if (entry.exists) {
      requireBinding(Number.isSafeInteger(entry.bytes) && (entry.bytes as number) >= 0, 'source scope byte count is invalid');
      requireBinding(typeof entry.sha256 === 'string' && digestPattern.test(entry.sha256), 'source scope digest is invalid');
    } else {
      requireBinding(entry.bytes === null && entry.sha256 === null, 'absent source entries must have null content fields');
    }
  }
  const body = { schema: scope.schema, entries: scope.entries };
  requireBinding(scope.digest === canonicalJsonDigest(body), 'source scope digest does not match its entries');
  return Object.freeze({
    schema: scope.schema,
    entries: Object.freeze(scope.entries.map((entry) => Object.freeze({
      path: entry.path,
      exists: entry.exists,
      bytes: entry.bytes,
      sha256: entry.sha256,
    }))),
    digest: scope.digest,
  });
}

export interface CreateTaskSourceBindingInput {
  readonly request: TaskSourceBindingRequest;
  readonly source_scope: TaskSourceScope;
  /** Fixed Git observation of `canonical_host_root` from the trusted caller. */
  readonly canonical_host_common_dir: string;
  /** Fixed Git observation of the requested task source root. */
  readonly git: TaskSourceGitObservation;
}

export function createTaskSourceBinding(input: CreateTaskSourceBindingInput): TaskSourceBinding {
  const request = validateTaskSourceBindingRequest(input.request);
  const sourceScope = validateScope(input.source_scope);
  const sourceRoot = resolveTaskSourceRoot(request.canonical_host_root, request.source_root);
  const canonicalHostCommonDir = canonicalAbsolutePath(input.canonical_host_common_dir, 'canonical host Git common directory');
  const git = input.git;
  requireBinding(canonicalAbsolutePath(git.source_root, 'task source root') === sourceRoot, 'Git observation does not match the requested task source root');
  const commonDir = canonicalAbsolutePath(git.common_dir, 'task source Git common directory');
  requireBinding(
    commonDir === canonicalHostCommonDir,
    'task source Git common directory does not match the canonical host repository',
  );
  const cwd = canonicalAbsolutePath(git.cwd, 'caller working directory');
  requireBinding(
    git.branch === null || (typeof git.branch === 'string' && git.branch.length > 0 && !/[\u0000-\u001f\u007f]/.test(git.branch)),
    'Git branch is invalid',
  );
  if (request.branch_ref !== undefined) {
    requireBinding(
      git.branch === request.branch_ref.slice('refs/heads/'.length),
      'observed Git branch does not match the requested branch ref',
    );
  }
  requireBinding(typeof git.head === 'string' && /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/.test(git.head), 'Git HEAD is invalid');
  return Object.freeze({
    schema: 'TaskSourceBinding/v1',
    operation: request.operation,
    operation_id: request.operation_id,
    request_id: request.request_id,
    ...(request.branch_ref === undefined ? {} : { branch_ref: request.branch_ref }),
    expected_host: request.expected_host,
    work_id: request.work_id,
    attempt: request.attempt,
    thread_id: request.thread_id,
    repository_id: request.repository_id,
    project_ids: request.project_ids,
    canonical_host_root: request.canonical_host_root,
    source_root: sourceRoot,
    config_digest: request.config_digest,
    project_context_digest: request.project_context_digest,
    source_scope: sourceScope,
    branch: git.branch,
    canonical_host_common_dir: canonicalHostCommonDir,
    common_dir: commonDir,
    head: git.head,
    cwd,
  });
}

/** Validate persisted or received bindings without granting authority or performing effects. */
export function validateTaskSourceBinding(candidate: unknown): TaskSourceBinding {
  requireBinding(candidate !== null && typeof candidate === 'object', 'task source binding must be an object');
  const value = candidate as TaskSourceBinding;
  requireBinding(value.schema === 'TaskSourceBinding/v1', 'task source binding schema is invalid');
  requireOperation(value.operation);
  const request: TaskSourceBindingRequest = {
    schema: 'TaskSourceBindingRequest/v1',
    operation: value.operation,
    operation_id: value.operation_id,
    request_id: value.request_id,
    ...(value.branch_ref === undefined ? {} : { branch_ref: value.branch_ref }),
    expected_host: value.expected_host,
    canonical_host_root: value.canonical_host_root,
    source_root: value.source_root,
    work_id: value.work_id,
    attempt: value.attempt,
    thread_id: value.thread_id,
    repository_id: value.repository_id,
    project_ids: value.project_ids,
    config_digest: value.config_digest,
    project_context_digest: value.project_context_digest,
  };
  const binding = createTaskSourceBinding({
    request,
    source_scope: value.source_scope,
    canonical_host_common_dir: value.canonical_host_common_dir,
    git: {
      source_root: value.source_root,
      common_dir: value.common_dir,
      branch: value.branch,
      head: value.head,
      cwd: value.cwd,
    },
  });
  requireBinding(canonicalJsonDigest(binding) === canonicalJsonDigest(value), 'task source binding contains unexpected or noncanonical fields');
  return binding;
}
