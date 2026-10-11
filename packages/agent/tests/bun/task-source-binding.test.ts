import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { canonicalJsonDigest, isPlainRecord } from '../../src/contracts/public-ingress.ts';
import type {
  TaskSourceBinding,
  TaskSourceBindingReport,
  TaskSourceBindingRequest,
  TaskSourceGitObservation,
} from '../../src/orchestration/task-source-binding.ts';
import {
  createTaskSourceBinding,
  parseTaskSourceGitObservation,
  resolveTaskSourceRoot,
  taskSourceGitArgv,
  validateTaskSourceBinding,
  validateTaskSourceBindingExchange,
  validateTaskSourceBindingReport,
  validateTaskSourceBindingRequest,
} from '../../src/orchestration/task-source-binding.ts';

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

const sourceRoot = path.resolve(path.join(path.parse(process.cwd()).root, 'task-source-fixture'));
const hostRoot = path.resolve(path.join(path.parse(process.cwd()).root, 'host-fixture'));
const hostCommonDir = path.join(hostRoot, '.git');
const sourceScopeBody: Omit<TaskSourceBinding['source_scope'], 'digest'> = {
  schema: 'ScopedSourceSnapshot/v1',
  entries: [{ path: 'products/agent/src/index.ts', exists: true, bytes: 3, sha256: 'a'.repeat(64) }],
};
const sourceScope: TaskSourceBinding['source_scope'] = {
  ...sourceScopeBody,
  digest: canonicalJsonDigest(sourceScopeBody),
};
const expectedHost: TaskSourceBindingRequest['expected_host'] = {
  work: { revision: 4, digest: 'b'.repeat(64) },
  ledger: { revision: 95, digest: 'c'.repeat(64) },
  journal: { attempt: 2, version: { revision: 3, digest: 'd'.repeat(64) } },
  maintenance_generation: 0,
};

function request(overrides: Partial<TaskSourceBindingRequest> = {}): TaskSourceBindingRequest {
  return {
    schema: 'TaskSourceBindingRequest/v1',
    operation: 'inspect',
    operation_id: 'task-source-inspect-1',
    request_id: 'request-1',
    expected_host: expectedHost,
    canonical_host_root: hostRoot,
    work_id: 'work-123',
    attempt: 2,
    thread_id: 'original-thread',
    repository_id: 'vida-agent',
    project_ids: ['agent', 'plugin'],
    config_digest: 'e'.repeat(64),
    project_context_digest: 'f'.repeat(64),
    ...overrides,
  };
}

function gitObservation(
  root: string,
  commonDir: string,
  branch: string | null,
  head: string,
): TaskSourceGitObservation {
  return parseTaskSourceGitObservation(
    root,
    [root + '\n', commonDir + '\n', branch === null ? '\n' : branch + '\n', head + '\n'],
    hostRoot,
  );
}

function bindingFor(
  taskRequest: TaskSourceBindingRequest = request(),
  root: string = taskRequest.source_root ?? taskRequest.canonical_host_root,
  commonDir: string = hostCommonDir,
): TaskSourceBinding {
  return createTaskSourceBinding({
    request: taskRequest,
    source_scope: sourceScope,
    canonical_host_common_dir: hostCommonDir,
    git: gitObservation(root, commonDir, 'codex/task-source', 'b'.repeat(40)),
  });
}

describe('TaskSourceBinding/v1', () => {
  test('defaults an omitted source root to the host root and uses only fixed Git argv', () => {
    const taskRequest = request();
    expect(resolveTaskSourceRoot(taskRequest.canonical_host_root)).toBe(hostRoot);
    expect(resolveTaskSourceRoot(taskRequest.canonical_host_root, sourceRoot)).toBe(sourceRoot);
    expect(() => resolveTaskSourceRoot('.', sourceRoot)).toThrow(/absolute/);
    expect(taskSourceGitArgv(sourceRoot)).toEqual([
      ['-C', sourceRoot, 'rev-parse', '--show-toplevel'],
      ['-C', sourceRoot, 'rev-parse', '--path-format=absolute', '--git-common-dir'],
      ['-C', sourceRoot, 'branch', '--show-current'],
      ['-C', sourceRoot, 'rev-parse', 'HEAD'],
    ]);
    const slashCommonDir = hostCommonDir.replaceAll('\\', '/');
    expect(gitObservation(hostRoot, slashCommonDir, 'main', 'a'.repeat(40)).common_dir).toBe(hostCommonDir);
    const hostGit = gitObservation(hostRoot, hostCommonDir, 'main', 'a'.repeat(40));
    const defaultBinding = createTaskSourceBinding({
      request: taskRequest,
      source_scope: sourceScope,
      canonical_host_common_dir: hostGit.common_dir,
      git: hostGit,
    });
    expect(defaultBinding.source_root).toBe(hostRoot);
  });

  test('binds canonical host, current config/context, original identity and Host CAS to the same Git common directory', () => {
    const hostGit = gitObservation(hostRoot, hostCommonDir, 'main', 'a'.repeat(40));
    const sourceGit = gitObservation(sourceRoot, hostGit.common_dir, 'codex/task-source', 'b'.repeat(40));
    const taskRequest = request({ source_root: sourceRoot });
    const binding = createTaskSourceBinding({
      request: taskRequest,
      source_scope: sourceScope,
      canonical_host_common_dir: hostGit.common_dir,
      git: sourceGit,
    });

    expect(binding).toMatchObject({
      schema: 'TaskSourceBinding/v1',
      operation: 'inspect',
      operation_id: 'task-source-inspect-1',
      request_id: 'request-1',
      expected_host: taskRequest.expected_host,
      work_id: 'work-123',
      attempt: 2,
      thread_id: 'original-thread',
      repository_id: 'vida-agent',
      project_ids: ['agent', 'plugin'],
      canonical_host_root: hostRoot,
      source_root: sourceRoot,
      config_digest: taskRequest.config_digest,
      project_context_digest: taskRequest.project_context_digest,
      canonical_host_common_dir: hostCommonDir,
      common_dir: hostCommonDir,
      head: 'b'.repeat(40),
    });
    expect(validateTaskSourceBinding(binding)).toEqual(binding);
    expect(Object.isFrozen(binding)).toBe(true);
    expect(Object.isFrozen(binding.expected_host)).toBe(true);
    expect(Object.isFrozen(binding.source_scope)).toBe(true);
    expect(Object.isFrozen(binding.source_scope.entries[0])).toBe(true);
    expect(() => validateTaskSourceBinding({ ...binding, authorization: true })).toThrow(/unexpected/);
  });

  test('requires canonical branch refs for create and adopt and binds the observed branch', () => {
    const proposalOperations: readonly TaskSourceBindingRequest['operation'][] = ['propose-create', 'propose-adopt'];
    for (const operation of proposalOperations) {
      expect(() => validateTaskSourceBindingRequest(request({ operation }))).toThrow(/branch ref is required/);
      const taskRequest = request({ operation, branch_ref: 'refs/heads/codex/task-source' });
      expect(validateTaskSourceBindingRequest(taskRequest).branch_ref).toBe('refs/heads/codex/task-source');
      const binding = bindingFor(taskRequest);
      expect(binding.branch_ref).toBe('refs/heads/codex/task-source');
      expect(validateTaskSourceBinding(binding)).toEqual(binding);
      expect(() =>
        createTaskSourceBinding({
          request: taskRequest,
          source_scope: sourceScope,
          canonical_host_common_dir: hostCommonDir,
          git: gitObservation(hostRoot, hostCommonDir, 'foreign/branch', 'b'.repeat(40)),
        }),
      ).toThrow(/does not match/);
    }

    const unsupportedModeRequest: unknown = { ...request(), operation: 'unsupported' };
    expect(() => validateTaskSourceBindingRequest(unsupportedModeRequest)).toThrow(/operation is invalid/);

    for (const branchRef of [
      'codex/task-source',
      'refs/heads/',
      'refs/heads/a..b',
      'refs/heads/.hidden',
      'refs/heads/a.lock',
      'refs/heads/a//b',
      'refs/heads/a?b',
      'refs/heads/a\\b',
    ]) {
      expect(() =>
        validateTaskSourceBindingRequest(request({ operation: 'propose-create', branch_ref: branchRef })),
      ).toThrow(/branch ref/);
    }

    expect(validateTaskSourceBindingRequest(request()).branch_ref).toBeUndefined();
  });

  test('fails closed when Git roots, common directories, scope, or project identity disagree', () => {
    expect(() => gitObservation(sourceRoot, hostCommonDir, 'main', 'b'.repeat(40))).not.toThrow();
    expect(() =>
      parseTaskSourceGitObservation(sourceRoot, [hostRoot, hostCommonDir, 'main', 'b'.repeat(40)], hostRoot),
    ).toThrow(/does not match/);
    expect(() => bindingFor(request({ source_root: sourceRoot }), sourceRoot, path.join(sourceRoot, '.git'))).toThrow(
      /common directory/,
    );

    const mismatchedAttempt = request({ attempt: 3 });
    expect(() => validateTaskSourceBindingRequest(mismatchedAttempt)).toThrow(/journal attempt/);
    expect(() => validateTaskSourceBindingRequest({ ...request(), authorize: true })).toThrow(/unexpected/);
    expect(() => validateTaskSourceBindingRequest(request({ project_ids: ['plugin', 'agent'] }))).toThrow(
      /noncanonical/,
    );
    expect(() => validateTaskSourceBindingRequest(request({ project_ids: ['agent', 'agent'] }))).toThrow(/project IDs/);

    const malformedScope = { ...sourceScope, digest: '0'.repeat(64) };
    expect(() =>
      createTaskSourceBinding({
        request: request({ source_root: sourceRoot }),
        source_scope: malformedScope,
        canonical_host_common_dir: hostCommonDir,
        git: gitObservation(sourceRoot, hostCommonDir, null, 'b'.repeat(40)),
      }),
    ).toThrow(/source scope digest/);
  });

  test('matches report IDs, operation and Host CAS to the exact request without granting authority', () => {
    const taskRequest = request({ source_root: sourceRoot });
    const binding = bindingFor(taskRequest, sourceRoot);
    const report: TaskSourceBindingReport = {
      schema: 'TaskSourceBindingReport/v1',
      operation: taskRequest.operation,
      operation_id: taskRequest.operation_id,
      request_id: taskRequest.request_id,
      report_id: 'report-1',
      expected_host: taskRequest.expected_host,
      status: 'observed',
      binding,
    };
    expect(validateTaskSourceBindingExchange(taskRequest, report)).toEqual(report);
    expect(() => validateTaskSourceBindingExchange(taskRequest, { ...report, request_id: 'foreign-request' })).toThrow(
      /request ID/,
    );
    expect(() =>
      validateTaskSourceBindingExchange(taskRequest, {
        ...report,
        expected_host: { ...taskRequest.expected_host, ledger: { revision: 96, digest: 'c'.repeat(64) } },
      }),
    ).toThrow(/CAS references/);
    expect(() =>
      validateTaskSourceBindingExchange(taskRequest, {
        ...report,
        binding: { ...binding, config_digest: '0'.repeat(64) },
      }),
    ).toThrow(/configuration/);

    const unknown: TaskSourceBindingReport = {
      schema: 'TaskSourceBindingReport/v1',
      operation: taskRequest.operation,
      operation_id: taskRequest.operation_id,
      request_id: taskRequest.request_id,
      report_id: 'report-unknown',
      expected_host: taskRequest.expected_host,
      status: 'unknown',
      binding: null,
      reason: 'native outcome is uncertain',
    };
    expect(validateTaskSourceBindingExchange(taskRequest, unknown).status).toBe('unknown');
    expect(() => validateTaskSourceBindingReport({ ...unknown, binding })).toThrow(/require a binding/);
  });

  test('ships strict binding, request and report JSON schemas', () => {
    const parsedSchema: unknown = JSON.parse(
      readFileSync(new URL('../../schemas/task-source-binding.v1.schema.json', import.meta.url), 'utf8'),
    );
    if (!isPlainRecord(parsedSchema)) throw new Error('task-source binding schema must be an object');
    const defs = parsedSchema['$defs'];
    if (!isPlainRecord(defs)) throw new Error('task-source binding schema definitions must be an object');
    const expectedHostSchema = defs['expectedHost'];
    const taskSourceRequestSchema = defs['taskSourceRequest'];
    const taskSourceReportSchema = defs['taskSourceReport'];
    if (!isPlainRecord(expectedHostSchema)) throw new Error('expected Host schema must be an object');
    if (!isPlainRecord(taskSourceRequestSchema)) throw new Error('task-source request schema must be an object');
    if (!isPlainRecord(taskSourceReportSchema)) throw new Error('task-source report schema must be an object');
    const requestConditions = taskSourceRequestSchema['allOf'];
    const bindingConditions = parsedSchema['allOf'];
    if (!isUnknownArray(requestConditions) || !isPlainRecord(requestConditions[0]))
      throw new Error('task-source request schema condition must be an object');
    if (!isUnknownArray(bindingConditions) || !isPlainRecord(bindingConditions[0]))
      throw new Error('task-source binding schema condition must be an object');
    const requestCondition = requestConditions[0]['then'];
    const bindingCondition = bindingConditions[0]['then'];
    if (!isPlainRecord(requestCondition)) throw new Error('task-source request schema branch must be an object');
    if (!isPlainRecord(bindingCondition)) throw new Error('task-source binding schema branch must be an object');
    const schema = parsedSchema;
    expect(schema.$id).toBe('TaskSourceBinding/v1');
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toContain('canonical_host_root');
    expect(schema.required).toContain('expected_host');
    expect(expectedHostSchema['additionalProperties']).toBe(false);
    expect(taskSourceRequestSchema['required']).toContain('project_context_digest');
    expect(taskSourceRequestSchema['required']).not.toContain('source_root');
    expect(taskSourceRequestSchema['required']).not.toContain('branch_ref');
    expect(requestCondition['required']).toContain('branch_ref');
    expect(bindingCondition['required']).toContain('branch_ref');
    expect(taskSourceReportSchema['required']).toContain('report_id');
  });
});
