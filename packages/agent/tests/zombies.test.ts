import { configuredTestContext } from './configured-context.ts';
import { describe, expect, test } from 'bun:test';
import * as runtime from '../src/index.ts';
import type { RuntimeEnvelope } from '../src/contracts/envelopes.ts';
import { expectReturned } from './helpers/expect-rejection.ts';

const { repositoryRoot, config, context } = configuredTestContext();
function requiredProjectId(): string {
  const projectId = context.project_ids[0];
  if (!projectId) throw new Error('Configured test context has no project ID.');
  return projectId;
}
type ZombiesCategory = 'Zero' | 'One' | 'Many' | 'Boundary' | 'Interface' | 'Exception' | 'Simple';
// Candidate references never establish reviewed applicability or execution.
// The function audit owns those bindings and their Source/test/config hashes.
type ScenarioCandidate = Readonly<{ status: 'unreviewed'; reference?: string }>;
type CategoryEvidence = Readonly<Record<ZombiesCategory, ScenarioCandidate>>;

const categories: readonly ZombiesCategory[] = Object.freeze([
  'Zero',
  'One',
  'Many',
  'Boundary',
  'Interface',
  'Exception',
  'Simple',
]);
const publicExports: readonly (keyof typeof runtime)[] = Object.freeze([
  'LifecycleStateError',
  'PATH_PROFILE_KEYS',
  'PersistentSessionHandoffStore',
  'RuntimeConfigError',
  'RuntimeInitializationBindingError',
  'WorkspaceIdentityError',
  'advanceSessionWorkflowHandoff',
  'advanceSessionWorkflowHandoffFromConfig',
  'assertCanonicalJsonValue',
  'bindProjectInitialization',
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
  'correctiveAssignmentAuthorizationSchema',
  'correctiveExecutionPlanSchema',
  'correctiveExecutionSchema',
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
  'finalAssurancePacketSchema',
  'finalAssurancePreparationSchema',
  'finalAssuranceReverseSchema',
  'finalAssuranceReviewSchema',
  'finalAssuranceStateSchema',
  'inspectProjectUpgrade',
  'loadProjectContext',
  'loadProjectSetContext',
  'loadRuntimeConfig',
  'localToolEnvelope',
  'nativeNoFollowAvailable',
  'normalizeProjectIds',
  'openConfiguredSessionHandoffStore',
  'planProjectUpgradeRepair',
  'prepareDeliveryInstruction',
  'prepareSessionWorkflowHandoff',
  'prepareSessionWorkflowHandoffFromConfig',
  'produceDocumentationClearCheckpoint',
  'projectBindingFor',
  'projectMayScopeRepositoryPath',
  'recoverProjectUpgradeIntent',
  'requireNativeNoFollowCapability',
  'resolveAgentRoleProfile',
  'resolveConfigPath',
  'resolvePathProfile',
  'resolveProjectForRepositoryPath',
  'resolveProjectPathMembership',
  'resolveSelectedProjectForRepositoryPath',
  'resumeFreshProjectUpgrade',
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
function categoryEvidence(testFile: string, titles: Readonly<Record<ZombiesCategory, string>>): CategoryEvidence {
  return Object.freeze({
    Zero: Object.freeze({ status: 'unreviewed', reference: `${testFile} > ${titles.Zero}` }),
    One: Object.freeze({ status: 'unreviewed', reference: `${testFile} > ${titles.One}` }),
    Many: Object.freeze({ status: 'unreviewed', reference: `${testFile} > ${titles.Many}` }),
    Boundary: Object.freeze({ status: 'unreviewed', reference: `${testFile} > ${titles.Boundary}` }),
    Interface: Object.freeze({ status: 'unreviewed', reference: `${testFile} > ${titles.Interface}` }),
    Exception: Object.freeze({ status: 'unreviewed', reference: `${testFile} > ${titles.Exception}` }),
    Simple: Object.freeze({ status: 'unreviewed', reference: `${testFile} > ${titles.Simple}` }),
  });
}
const projectContextEvidence = categoryEvidence('tests/project-context-boundary.test.ts', {
  Zero: 'canonicalizes task project ids without changing project identity',
  One: 'binds an exact multi-project context without a primary project',
  Many: 'binds an exact multi-project context without a primary project',
  Boundary: 'resolves deepest project membership and requires a selected member for shared roots',
  Interface: 'binds an exact multi-project context without a primary project',
  Exception: 'rejects unsafe repository-relative path forms',
  Simple: 'canonicalizes task project ids without changing project identity',
});
const sessionHandoffEvidence = categoryEvidence('tests/session-handoff.test.ts', {
  Zero: 'rejects stale or altered handoff and malformed reports',
  One: 'collects reports for configured %s flow by complete waves',
  Many: 'requires every ordered parallel report before releasing the next wave',
  Boundary: 'rejects forged work, attempt, scope, order and simulated tool result bindings',
  Interface: 'collects reports for configured %s flow by complete waves',
  Exception: 'a reported failure blocks the next wave',
  Simple: 'collects reports for configured %s flow by complete waves',
});
const configuredHandoffEvidence = categoryEvidence('tests/run-entrypoint.test.ts', {
  Zero: 'blocks before workflow selection when the trusted initialization binding is absent',
  One: 'accepts a repeatable exact project set before trusted-host binding',
  Many: 'accepts a repeatable exact project set before trusted-host binding',
  Boundary: 'does not use process environment as project or thread authority',
  Interface: 'requires every explicit argument and rejects raw authority inputs',
  Exception: 'blocks before workflow selection when the trusted initialization binding is absent',
  Simple: 'keeps CLI validation, workflow selection, CAS and report handling bound to one attempt',
});
const persistentHandoffEvidence = categoryEvidence('tests/bun/persistent-session-handoff.test.ts', {
  Zero: 'only current v1 session rows are readable',
  One: 'derives one state file from root YAML work root',
  Many: 'restart after a committed partial report exposes only the unissued peer',
  Boundary: 'CAS and identity reject duplicate, stale and foreign writes',
  Interface: 'prepare-or-resume binds the original scope and selection',
  Exception: 'restart exposes an issued outcome as uncertain and refuses reissue',
  Simple: 'derives one state file from root YAML work root',
});
const initializationEvidence = categoryEvidence('tests/bun/runtime-initialization.test.ts', {
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
  'projectMayScopeRepositoryPath',
  'resolveProjectForRepositoryPath',
  'resolveProjectPathMembership',
  'resolveSelectedProjectForRepositoryPath',
]);
const documentationClearEvidence = categoryEvidence('tests/documentation-clear-boundary.test.ts', {
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
const currentExportEvidence: Record<string, CategoryEvidence> = {};
for (const name of persistentExports) currentExportEvidence[name] = persistentHandoffEvidence;
for (const name of initializationExports) currentExportEvidence[name] = initializationEvidence;
for (const name of sessionHandoffExports) currentExportEvidence[name] = sessionHandoffEvidence;
for (const name of configuredHandoffExports) currentExportEvidence[name] = configuredHandoffEvidence;
for (const name of projectContextExports) currentExportEvidence[name] = projectContextEvidence;
for (const name of documentationClearExports) currentExportEvidence[name] = documentationClearEvidence;
Object.freeze(currentExportEvidence);
function publicUnreviewedEvidence(): CategoryEvidence {
  return Object.freeze({
    Zero: Object.freeze({ status: 'unreviewed' }),
    One: Object.freeze({ status: 'unreviewed' }),
    Many: Object.freeze({ status: 'unreviewed' }),
    Boundary: Object.freeze({ status: 'unreviewed' }),
    Interface: Object.freeze({ status: 'unreviewed' }),
    Exception: Object.freeze({ status: 'unreviewed' }),
    Simple: Object.freeze({ status: 'unreviewed' }),
  });
}

const matrixEntries: readonly (readonly [string, CategoryEvidence])[] = publicExports.map((name) => [
  name,
  currentExportEvidence[name] ?? publicUnreviewedEvidence(),
]);
const matrix: Readonly<Record<string, CategoryEvidence>> = Object.freeze(Object.fromEntries(matrixEntries));

type ValidEnvelope = RuntimeEnvelope;

function validEnvelope(): ValidEnvelope {
  return {
    schema: 'RuntimeEnvelope/v1',
    kind: 'quality-check',
    operation: 'read',
    sourceRevision: 'source-1',
    expectedRevision: 1,
    payload: {},
  };
}

describe('machine-checked public export ZOMBIES matrix', () => {
  test('Interface: inventories the exact public runtime surface and every category cell', () => {
    expect(Object.keys(runtime).sort()).toEqual([...publicExports].sort());
    expect(Object.keys(matrix).sort()).toEqual([...publicExports].sort());
    for (const name of publicExports) {
      const evidence = matrix[name];
      expect(evidence, name).toBeDefined();
      if (!evidence) throw new Error(`missing ZOMBIES matrix row: ${name}`);
      expect(runtime[name], name).toBeDefined();
      expect(Object.keys(evidence).sort(), name).toEqual([...categories].sort());
      for (const category of categories) {
        const candidate = evidence[category];
        expect(candidate.status, name + '/' + category).toBe('unreviewed');
        if (candidate.reference === undefined) expect(candidate).toEqual({ status: 'unreviewed' });
        else expect(candidate.reference).toMatch(/^tests\/.+\.test\.ts > .+/);
      }
    }
    for (const name of Object.keys(currentExportEvidence)) {
      const evidence = currentExportEvidence[name];
      if (!evidence) throw new Error(`missing current export evidence: ${name}`);
      const publicName = publicExports.find((candidate) => candidate === name);
      expect(publicName, name).toBeDefined();
      if (!publicName) throw new Error(`current export has no public runtime binding: ${name}`);
      const row = matrix[publicName];
      if (!row) throw new Error(`current export has no ZOMBIES matrix row: ${name}`);
      for (const category of categories)
        expect(row[category].reference, name + '/' + category).toMatch(/^tests\/.+\.test\.ts > .+/);
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
        project: requiredProjectId(),
        risk_flags: [],
        labels: [],
      }).workflow_id,
    ).toBe('information_research_light');

    const request = {
      principal: 'principal-1',
      role: 'developer',
      action: 'write' as const,
      tenant: 'tenant-1',
      project: 'project-1',
      resourceTenant: 'tenant-1',
      resourceProject: 'project-1',
      registryHash: 'a'.repeat(64),
      operationHash: 'b'.repeat(64),
    };
    const returned = expectReturned(() => runtime.validateAuthorizationRequest(request));
    expect(returned).not.toBeNull();
    expect(typeof returned).toBe('object');
    expect(Array.isArray(returned)).toBe(false);
    expect(returned).toEqual(request);
    expect(returned).not.toBe(request);
    expect(Object.isFrozen(returned)).toBe(true);
    request.principal = 'changed-after-validation';
    expect(returned.principal).toBe('principal-1');
    expect(returned.action).toBe('write');
    expect(returned.registryHash).toBe('a'.repeat(64));
    expect(returned.operationHash).toBe('b'.repeat(64));
    expect(() => runtime.validateAuthorizationRequest({ ...request, registryHash: 'A'.repeat(64) })).toThrow(
      'authorization request rejected: /registryHash must match pattern "^[a-f0-9]{64}$"',
    );
  });

  test('Many: repeated public computations remain deterministic and isolated', () => {
    const digests = Array.from({ length: 64 }, () => runtime.runtimeConfigDigest(config));
    expect(new Set(digests).size).toBe(1);
    const envelopes = Array.from({ length: 64 }, () => {
      const input = validEnvelope();
      return { input, returned: runtime.validateRuntimeEnvelope(input) };
    });
    expect(envelopes).toHaveLength(64);
    for (const { input, returned } of envelopes) expect(returned).toBe(input);
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
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(() => runtime.assertCanonicalJsonValue(cycle)).toThrow();
    const untrustedHost: unknown = {};
    const kernelAttempt: unknown = Reflect.apply(runtime.createRuntimeKernel, undefined, [
      repositoryRoot,
      untrustedHost,
    ]);
    await Promise.resolve(expect(Promise.resolve(kernelAttempt)).rejects.toThrow(/capability|host/i));
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
    expect(
      runtime.computeEdictumWorkflowApprovalEvidenceDigest({
        schema: 'EdictumWorkflowApproval/v1',
        stage_id: 'test-stage',
        approval_id: 'test-approval',
        approver: 'test-approver',
        operation_hash: 'a'.repeat(64),
        tenant: context.repository_id,
        project: requiredProjectId(),
        approved_at: '2026-10-11T00:00:00.000Z',
        expires_at: '2026-10-11T00:01:00.000Z',
      }),
    ).toMatch(/^[a-f0-9]{64}$/);
  });
});
