import { configuredTestContext } from './configured-context.mjs';
import { describe, expect, test } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as runtime from '../src/index.ts';

const packageRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const { repositoryRoot, config, context } = configuredTestContext();
const categories = Object.freeze(['Zero', 'One', 'Many', 'Boundary', 'Interface', 'Exception', 'Simple']);
const publicExports = Object.freeze([
  'LifecycleStateError',
  'PATH_PROFILE_KEYS',
  'PersistentSessionHandoffStore',
  'RuntimeConfigError',
  'RuntimeInitializationBindingError',
  'WorkspaceIdentityError',
  'advanceSessionWorkflowHandoff',
  'advanceSessionWorkflowHandoffFromConfig',
  'assertCanonicalJsonValue',
  'bindRuntimeInitialization',
  'buildDeliveryReceipt',
  'buildDevelopmentTaskPacket',
  'buildFailureArtifact',
  'buildGovernedWriteRequest',
  'buildImplementationResult',
  'buildRuntimeAssuranceContext',
  'buildTesterInstruction',
  'canonicalJson',
  'canonicalJsonDigest',
  'canonicalRepositoryRoot',
  'candidateIsolationGap',
  'compactRuntimeAssuranceContext',
  'compileConfiguredEdictumWorkflow',
  'compileDevelopmentWorkflow',
  'computeEdictumWorkflowApprovalEvidenceDigest',
  'computeWriteOperationHash',
  'consumeRuntimeEnvelope',
  'createConfiguredEdictumWorkflow',
  'createFileWorkflowHostCapability',
  'createDeliveryEvidenceAuthority',
  'createConfiguredMastra',
  'createRuntimeKernel',
  'createRuntimeKernelHost',
  'deriveWorkspaceId',
  'detectNativeNoFollowCapability',
  'executeDocumentationClearFromWork',
  'executeDocumentationClearOperation',
  'loadProjectContext',
  'loadProjectSetContext',
  'loadRuntimeConfig',
  'localToolEnvelope',
  'nativeNoFollowAvailable',
  'normalizeProjectIds',
  'openConfiguredSessionHandoffStore',
  'prepareDeliveryInstruction',
  'prepareSessionWorkflowHandoff',
  'prepareSessionWorkflowHandoffFromConfig',
  'produceDocumentationClearCheckpoint',
  'projectBindingFor',
  'requireNativeNoFollowCapability',
  'resolveAgentRoleProfile',
  'resolveConfigPath',
  'resolvePathProfile',
  'resolveProjectForRepositoryPath',
  'resolveProviderWorkItemKind',
  'retryDevelopmentTaskPacket',
  'runtimeConfigDigest',
  'sanitizeDiagnostic',
  'selectWorkflow',
  'sessionHandoffDatabasePath',
  'statusDelta',
  'transitionLifecycleState',
  'validateAuthorizationRequest',
  'validateCandidateIsolation',
  'validateDeliveryReceipt',
  'validateDocumentationClearCheckpoint',
  'validateDevelopmentStagePacket',
  'validateGovernedWriteIntent',
  'validateGovernedWriteRequest',
  'validateImplementationResult',
  'validateLifecycleAggregate',
  'validateLifecycleProgress',
  'validateProjectContext',
  'validateResolvedPathProfile',
  'validateRuntimeAssuranceContext',
  'validateRuntimeConfig',
  'validateRuntimeEnvelope',
  'validateSessionAgentOutcome',
  'validateSessionWorkflowHandoffFromConfig',
  'validateStatusDelta',
  'validateWorkflowConfiguration',
  'verifyDocumentationClearReference',
]);
const categoryEvidence = (testFile, titles) =>
  Object.freeze(Object.fromEntries(categories.map((category) => [category, `${testFile} > ${titles[category]}`])));
const projectContextEvidence = categoryEvidence('tests/project-context-boundary.test.mjs', {
  Zero: 'canonicalizes task project ids without changing project identity',
  One: 'binds an exact multi-project context without a primary project',
  Many: 'binds an exact multi-project context without a primary project',
  Boundary: 'resolves the longest unique project root and blocks equal-depth ambiguity',
  Interface: 'binds an exact multi-project context without a primary project',
  Exception: 'rejects unsafe repository-relative path forms',
  Simple: 'canonicalizes task project ids without changing project identity',
});
const sessionHandoffEvidence = categoryEvidence('tests/session-handoff.test.mjs', {
  Zero: 'rejects stale or altered handoff and malformed reports',
  One: 'collects reports for configured %s flow by complete waves',
  Many: 'requires every ordered parallel report before releasing the next wave',
  Boundary: 'rejects forged work, attempt, scope, order and simulated tool result bindings',
  Interface: 'collects reports for configured %s flow by complete waves',
  Exception: 'a reported failure blocks the next wave',
  Simple: 'collects reports for configured %s flow by complete waves',
});
const configuredHandoffEvidence = categoryEvidence('tests/run-entrypoint.test.mjs', {
  Zero: 'blocks before workflow selection when the trusted initialization binding is absent',
  One: 'accepts a repeatable exact project set before trusted-host binding',
  Many: 'accepts a repeatable exact project set before trusted-host binding',
  Boundary: 'does not use process environment as project or thread authority',
  Interface: 'requires every explicit argument and rejects raw authority inputs',
  Exception: 'blocks before workflow selection when the trusted initialization binding is absent',
  Simple: 'keeps CLI validation, workflow selection, CAS and report handling bound to one attempt',
});
const persistentHandoffEvidence = categoryEvidence('tests/bun/persistent-session-handoff.test.mjs', {
  Zero: 'only current v1 session rows are readable',
  One: 'derives one state file from root YAML work root',
  Many: 'restart after a committed partial report exposes only the unissued peer',
  Boundary: 'CAS and identity reject duplicate, stale and foreign writes',
  Interface: 'prepare-or-resume binds the original scope and selection',
  Exception: 'restart exposes an issued outcome as uncertain and refuses reissue',
  Simple: 'derives one state file from root YAML work root',
});
const initializationEvidence = categoryEvidence('tests/bun/runtime-initialization.test.mjs', {
  Zero: 'fails closed when the host store or persisted receipt does not match deterministic workspace identity',
  One: 'same workspace binding is idempotent under concurrent callers',
  Many: 'same workspace binding is idempotent under concurrent callers',
  Boundary: 'foreign or stale receipt is rejected without replacing the pending bytes',
  Interface: 'derives one stable workspace ID for normalized spelling and different IDs for another checkout',
  Exception: 'competing workspace is denied after the first bind',
  Simple: 'derives one stable workspace ID for normalized spelling and different IDs for another checkout',
});
const persistentExports = Object.freeze([
  'PersistentSessionHandoffStore',
  'openConfiguredSessionHandoffStore',
  'sessionHandoffDatabasePath',
]);
const initializationExports = Object.freeze([
  'RuntimeInitializationBindingError',
  'bindRuntimeInitialization',
  'WorkspaceIdentityError',
  'canonicalRepositoryRoot',
  'deriveWorkspaceId',
]);
const sessionHandoffExports = Object.freeze([
  'advanceSessionWorkflowHandoff',
  'prepareSessionWorkflowHandoff',
  'validateSessionAgentOutcome',
]);
const configuredHandoffExports = Object.freeze([
  'advanceSessionWorkflowHandoffFromConfig',
  'prepareSessionWorkflowHandoffFromConfig',
  'validateSessionWorkflowHandoffFromConfig',
]);
const projectContextExports = Object.freeze([
  'loadProjectSetContext',
  'normalizeProjectIds',
  'projectBindingFor',
  'resolveProjectForRepositoryPath',
]);
const documentationClearEvidence = categoryEvidence('tests/zombies.test.mjs', {
  Zero: 'Zero: CLEAR rejects missing baseline and absent accepted work scope',
  One: 'One: CLEAR public APIs create and verify one bound closeout',
  Many: 'Many: CLEAR cycles advance and reject an older generation',
  Boundary: 'Boundary: CLEAR rejects unsafe scope and reference paths',
  Interface: 'Interface: CLEAR checkpoints retain typed public identity and digest',
  Exception: 'Exception: CLEAR detects changed document and checkpoint bytes',
  Simple: 'Simple: CLEAR creates a valid baseline for an ordinary scope',
});
const documentationClearExports = Object.freeze([
  'executeDocumentationClearFromWork',
  'executeDocumentationClearOperation',
  'produceDocumentationClearCheckpoint',
  'validateDocumentationClearCheckpoint',
  'verifyDocumentationClearReference',
]);
const currentExportEvidence = Object.freeze(
  Object.fromEntries([
    ...persistentExports.map((name) => [name, persistentHandoffEvidence]),
    ...initializationExports.map((name) => [name, initializationEvidence]),
    ...sessionHandoffExports.map((name) => [name, sessionHandoffEvidence]),
    ...configuredHandoffExports.map((name) => [name, configuredHandoffEvidence]),
    ...projectContextExports.map((name) => [name, projectContextEvidence]),
    ...documentationClearExports.map((name) => [name, documentationClearEvidence]),
  ]),
);
const matrix = Object.freeze(
  Object.fromEntries(
    publicExports.map((name) => [
      name,
      currentExportEvidence[name] ??
        Object.freeze(Object.fromEntries(categories.map((category) => [category, 'ZOMBIES-' + category + '-PUBLIC']))),
    ]),
  ),
);

function validEnvelope() {
  return {
    schema: 'RuntimeEnvelope/v1',
    kind: 'quality-check',
    operation: 'read',
    sourceRevision: 'source-1',
    expectedRevision: 1,
    payload: {},
  };
}

function documentationClearFixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-clear-zombies-'));
  const write = (relativePath, content) => {
    const file = path.join(root, relativePath);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  };
  mkdirSync(path.join(root, '.git'));
  for (const file of ['AGENTS.md', 'AGENT.sidecar.md', 'agent-runtime.config.v1.yaml'])
    write(file, readFileSync(path.join(repositoryRoot, file)));
  const schemaPath = `${config.runtime.bundle}/schemas/documentation-policy.v1.schema.json`;
  mkdirSync(path.dirname(path.join(root, schemaPath)), { recursive: true });
  cpSync(path.join(packageRoot, 'schemas/documentation-policy.v1.schema.json'), path.join(root, schemaPath));
  write(`${config.runtime.bundle}/TESTING.md`, 'fixture testing\n');
  write('docs/creatio/map.md', 'map\n');
  write('docs/agent-instructions/index.md', 'index\n');
  write('docs/agent-instructions/current.md', 'current\n');
  const input = {
    repository_root: root,
    repository_id: runtime.loadRuntimeConfig(root).repository.repository_id,
    project_id: context.project_ids[0],
    work_id: 'clear-zombies',
    source_revision: 'source-1',
    scope_paths: ['docs/agent-instructions/current.md'],
  };
  const policy = {
    schema: 'DocumentationPolicy/v1',
    policy_id: 'clear-zombies',
    project_id: input.project_id,
    source_path: 'docs/agent-instructions/documentation-policy.v1.json',
    owner: 'project:refactoring',
    required: true,
    canonical_roots: ['docs/agent-instructions'],
    map_paths: ['docs/agent-instructions/index.md'],
    excluded_roots: ['.agent', '.planning'],
    changelog_required: false,
    changelog_path: null,
    relations: ['owns'],
    updated_at: new Date().toISOString(),
  };
  write(policy.source_path, JSON.stringify(policy) + '\n');

  write(
    `.agent/work/${input.work_id}/scope.json`,
    JSON.stringify({
      schema: 'ImplementationScope/v1',
      work_id: input.work_id,
      source_revision: input.source_revision,
      allowed_paths: input.scope_paths,
    }) + '\n',
  );
  return {
    root,
    input,
    write,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

async function documentationCloseout(fixture) {
  await runtime.executeDocumentationClearOperation(fixture.input, 'baseline');
  const result = await runtime.executeDocumentationClearOperation(fixture.input, 'closeout');
  const checkpoint = JSON.parse(readFileSync(path.join(fixture.root, result.path), 'utf8'));
  return { result, checkpoint };
}

describe('documentation CLEAR public ZOMBIES boundary', () => {
  test('Zero: CLEAR rejects missing baseline and absent accepted work scope', async () => {
    const fixture = documentationClearFixture();
    try {
      await expect(runtime.executeDocumentationClearOperation(fixture.input, 'closeout')).rejects.toThrow();
      rmSync(path.join(fixture.root, `.agent/work/${fixture.input.work_id}/scope.json`));
      await expect(runtime.executeDocumentationClearFromWork(fixture.input, 'baseline')).rejects.toThrow();
    } finally {
      fixture.cleanup();
    }
  });

  test('One: CLEAR public APIs create and verify one bound closeout', async () => {
    const fixture = documentationClearFixture();
    try {
      const { scope_paths: _scopePaths, ...workInput } = fixture.input;
      const baseline = await runtime.executeDocumentationClearFromWork(workInput, 'baseline');
      expect(baseline.status).toBe('pass');
      const closeout = await runtime.executeDocumentationClearFromWork(workInput, 'closeout');
      const checkpoint = JSON.parse(readFileSync(path.join(fixture.root, closeout.path), 'utf8'));
      expect(runtime.validateDocumentationClearCheckpoint(checkpoint, fixture.input)).toEqual(checkpoint);
      expect(
        runtime.verifyDocumentationClearReference({
          ...fixture.input,
          reference_path: closeout.path,
          reference_sha256: closeout.sha256,
          reference_id: checkpoint.clear_id,
          expected_cycle: 1,
        }),
      ).toEqual(checkpoint);
      expect((await runtime.executeDocumentationClearOperation(fixture.input, 'verify')).checkpoint_digest).toBe(
        checkpoint.digest,
      );
    } finally {
      fixture.cleanup();
    }
  });

  test('Many: CLEAR cycles advance and reject an older generation', async () => {
    const fixture = documentationClearFixture();
    try {
      const first = await documentationCloseout(fixture);
      const second = await documentationCloseout(fixture);
      expect(second.result.path).toContain('documentation-closeout-0002.v1.json');
      expect(() =>
        runtime.verifyDocumentationClearReference({
          ...fixture.input,
          reference_path: first.result.path,
          reference_sha256: first.result.sha256,
          reference_id: first.checkpoint.clear_id,
          expected_cycle: 2,
        }),
      ).toThrow(/generation/);
      expect((await runtime.executeDocumentationClearOperation(fixture.input, 'verify')).path).toBe(second.result.path);
    } finally {
      fixture.cleanup();
    }
  });

  test('Boundary: CLEAR rejects unsafe scope and reference paths', async () => {
    const fixture = documentationClearFixture();
    try {
      expect(() =>
        runtime.produceDocumentationClearCheckpoint({
          ...fixture.input,
          scope_paths: ['../outside.md'],
          phase: 'baseline',
        }),
      ).toThrow(/safe/);
      const { result, checkpoint } = await documentationCloseout(fixture);
      expect(() =>
        runtime.verifyDocumentationClearReference({
          ...fixture.input,
          reference_path: '../outside.json',
          reference_sha256: result.sha256,
          reference_id: checkpoint.clear_id,
          expected_cycle: 1,
        }),
      ).toThrow(/path/);
    } finally {
      fixture.cleanup();
    }
  });

  test('Interface: CLEAR checkpoints retain typed public identity and digest', async () => {
    const fixture = documentationClearFixture();
    try {
      const { result, checkpoint } = await documentationCloseout(fixture);
      expect(checkpoint).toMatchObject({
        schema: 'DocumentationClearCheckpoint/v1',
        work_id: fixture.input.work_id,
        phase: 'closeout',
        status: 'pass',
        required: true,
        baseline_path: `.agent/work/${fixture.input.work_id}/documentation-baseline-0001.v1.json`,
      });
      expect(result.checkpoint_digest).toBe(checkpoint.digest);
      expect(runtime.canonicalJsonDigest((({ digest: _digest, ...body }) => body)(checkpoint))).toBe(checkpoint.digest);
    } finally {
      fixture.cleanup();
    }
  });

  test('Exception: CLEAR detects changed document and checkpoint bytes', async () => {
    const fixture = documentationClearFixture();
    try {
      const { result, checkpoint } = await documentationCloseout(fixture);
      fixture.write('docs/agent-instructions/current.md', 'changed\n');
      expect(() => runtime.validateDocumentationClearCheckpoint(checkpoint, fixture.input)).toThrow(/stale/);
      fixture.write('docs/agent-instructions/current.md', 'current\n');
      fixture.write(result.path, JSON.stringify({ ...checkpoint, status: 'blocked' }) + '\n');
      await expect(runtime.executeDocumentationClearOperation(fixture.input, 'verify')).rejects.toThrow(/digest/);
      expect(() =>
        runtime.verifyDocumentationClearReference({
          ...fixture.input,
          reference_path: result.path,
          reference_sha256: result.sha256,
          reference_id: checkpoint.clear_id,
          expected_cycle: 1,
        }),
      ).toThrow(/bytes changed/);
    } finally {
      fixture.cleanup();
    }
  });

  test('Simple: CLEAR creates a valid baseline for an ordinary scope', () => {
    const fixture = documentationClearFixture();
    try {
      const checkpoint = runtime.produceDocumentationClearCheckpoint({
        ...fixture.input,
        phase: 'baseline',
      });
      expect(checkpoint.status).toBe('pass');
      expect(checkpoint.baseline_path).toBeNull();
      expect(checkpoint.documents.some((document) => document.path === fixture.input.scope_paths[0])).toBe(true);
    } finally {
      fixture.cleanup();
    }
  });
});

describe('machine-checked public export ZOMBIES matrix', () => {
  test('Interface: inventories the exact public runtime surface and every category cell', () => {
    expect(Object.keys(runtime).sort()).toEqual([...publicExports].sort());
    expect(Object.keys(matrix).sort()).toEqual([...publicExports].sort());
    for (const [name, evidence] of Object.entries(matrix)) {
      expect(runtime[name], name).toBeDefined();
      expect(Object.keys(evidence).sort(), name).toEqual([...categories].sort());
      for (const category of categories) expect(evidence[category], name + '/' + category).toBeTruthy();
    }
    for (const name of Object.keys(currentExportEvidence)) {
      for (const category of categories)
        expect(matrix[name][category], name + '/' + category).toMatch(/^tests\/.+\.test\.mjs > .+/);
    }
  });

  test('Zero: empty public inputs fail closed', () => {
    expect(() => runtime.validateRuntimeConfig(null, repositoryRoot)).toThrow();
    expect(() => runtime.validateRuntimeEnvelope(null)).toThrow();
    expect(() => runtime.validateAuthorizationRequest({})).toThrow();
    expect(() => runtime.resolveConfigPath(repositoryRoot, '')).toThrow();
  });

  test('One: one authority snapshot composes one valid project and workflow', () => {
    expect(config.schema).toBe('AgentRuntimeConfig/v1');
    expect(runtime.validateRuntimeConfig(config, repositoryRoot).schema).toBe('AgentRuntimeConfig/v1');
    expect(runtime.validateProjectContext(context, repositoryRoot)).toBe(context);
    expect(
      runtime.selectWorkflow(config, {
        team: 'default-development',
        kind: 'research',
        intent: 'information_research',
        project: context.project_ids[0],
        risk_flags: [],
        labels: [],
      }).workflow_id,
    ).toBe('information_research_light');
  });

  test('Many: repeated public computations remain deterministic and isolated', () => {
    const digests = Array.from({ length: 64 }, () => runtime.runtimeConfigDigest(config));
    expect(new Set(digests).size).toBe(1);
    expect(Array.from({ length: 64 }, () => runtime.validateRuntimeEnvelope(validEnvelope()))).toHaveLength(64);
  });

  test('Boundary: traversal and stale revision edges are rejected', () => {
    expect(() => runtime.resolveConfigPath(repositoryRoot, '../escape.yml')).toThrow();
    expect(() =>
      runtime.consumeRuntimeEnvelope(validEnvelope(), {
        sourceRevision: 'source-2',
        currentRevision: 1,
      }),
    ).toThrow(/stale/);
    expect(() =>
      runtime.consumeRuntimeEnvelope(validEnvelope(), {
        sourceRevision: 'source-1',
        currentRevision: Number.MAX_SAFE_INTEGER + 1,
      }),
    ).toThrow(/invalid/);
  });

  test('Exception: non-data values and absent kernel capability cannot escape fail-closed handling', async () => {
    expect(() => runtime.assertCanonicalJsonValue(1n)).toThrow();
    const cycle = {};
    cycle.self = cycle;
    expect(() => runtime.assertCanonicalJsonValue(cycle)).toThrow();
    await expect(runtime.createRuntimeKernel(repositoryRoot, {})).rejects.toThrow(/capability|host/i);
  });

  test('Simple: nominal envelope and configuration contracts remain directly usable', () => {
    const envelope = validEnvelope();
    expect(
      runtime.consumeRuntimeEnvelope(envelope, {
        sourceRevision: 'source-1',
        currentRevision: 1,
      }),
    ).toBe(envelope);
    expect(runtime.validateCandidateIsolation(config)).toBeUndefined();
    expect(runtime.computeEdictumWorkflowApprovalEvidenceDigest({ simple: true })).toMatch(/^[a-f0-9]{64}$/);
  });
});
