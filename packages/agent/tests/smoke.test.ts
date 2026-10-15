import { describe, expect, test } from 'bun:test';
import path from 'node:path';
import { configuredTestContext } from './configured-context.ts';
import * as runtime from '../src/index.ts';
import * as facade from '../src/lifecycle/runtime-facade.ts';
import { callWithUntrustedArguments } from './helpers/untrusted-call.ts';
import { runLibSqlSmoke } from '../src/orchestration/mastra-boundary.ts';
import { loadConfiguredEdictumGovernancePolicy } from '../src/governance/edictum-boundary.ts';
import { createConfiguredProjectAuthorizer } from '../src/authorization/cedar-boundary.ts';
import { createRuntimeKernelHostProofForCompositionRoot } from '../src/runtime-kernel.ts';
import type {
  AuthorizationAction,
  ProjectAuthorizationRequest,
  TrustedProjectIdentity,
} from '../src/contracts/public-ingress.ts';
const { repositoryRoot, config, context: projectContext } = configuredTestContext();
const configuredProjectId = projectContext.project_ids[0];
if (!configuredProjectId) throw new Error('Test configuration requires a project');
const projectId: string = configuredProjectId;

function identity(role = 'developer-orchestrator'): TrustedProjectIdentity {
  return Object.freeze({
    schema: 'TrustedProjectIdentity/v1',
    source: 'authenticated-context',
    principal: 'developer-1',
    role,
    tenant: projectContext.repository_id,
    project: projectId,
    registry_hash: projectContext.registry_hash,
  });
}

function authorization(
  action: AuthorizationAction = 'read',
  role = 'developer-orchestrator',
): ProjectAuthorizationRequest {
  return {
    principal: 'developer-1',
    role,
    action,
    tenant: projectContext.repository_id,
    project: projectId,
    resourceTenant: projectContext.repository_id,
    resourceProject: projectId,
    registryHash: projectContext.registry_hash,
    ...(action === 'read' ? {} : { operationHash: 'a'.repeat(64) }),
  };
}

describe('clean v1 package surface', () => {
  test('exports production host and evidence-authority factories', async () => {
    for (const name of [
      'buildRuntimeAssuranceContext',
      'compactRuntimeAssuranceContext',
      'validateRuntimeAssuranceContext',
      'statusDelta',
      'validateStatusDelta',
    ] as const)
      expect(runtime[name]).toBe(facade[name]);
    const names: readonly (keyof typeof runtime)[] = [
      'loadRuntimeConfig',
      'selectWorkflow',
      'compileDevelopmentWorkflow',
      'compileConfiguredEdictumWorkflow',
      'createConfiguredMastra',
      'createRuntimeKernel',
      'createRuntimeKernelHost',
      'createFileWorkflowHostCapability',
      'createDeliveryEvidenceAuthority',
    ];
    for (const name of names) expect(typeof runtime[name]).toBe('function');
    const bindings = {
      repositoryRoot,
      repositoryId: projectContext.repository_id,
      projectIds: [...projectContext.project_ids],
      integrationsDigest: projectContext.integrations_digest,
      resolveIdentity: () => null,
      verifyApproval: () => null,
      runtimeRevision: () => ({ sourceRevision: 'test-source', currentRevision: 1 }),
      casWriter: () => undefined,
    };
    const proof = createRuntimeKernelHostProofForCompositionRoot(bindings);
    const host = runtime.createRuntimeKernelHost(proof);
    expect(runtime.createDeliveryEvidenceAuthority(host)).toBeDefined();
    await Promise.resolve(
      expect(runtime.createRuntimeKernel(path.resolve(repositoryRoot, '..'), host)).rejects.toThrow(
        /runtime kernel host is bound to a different repository root/,
      ),
    );
    expect(() => callWithUntrustedArguments(runtime.createRuntimeKernelHost, [Object.freeze({})])).toThrow(
      /runtime kernel host authentication proof is required/,
    );
    await Promise.resolve(
      expect(
        Promise.resolve(callWithUntrustedArguments(runtime.createFileWorkflowHostCapability, [Object.freeze({})])),
      ).rejects.toThrow(/Edictum workflow host authentication proof is required/),
    );
  });

  test('keeps the clean surface free of activation or lifecycle APIs', () => {
    for (const removed of [
      'applyActivation',
      'validateActivationRequest',
      'buildProfileCrosswalk',
      'partitionReviewTriageFindings',
      'loadAgentRoleProfileRegistry',
    ])
      expect(Object.getOwnPropertyDescriptor(runtime, removed)).toBeUndefined();
  });

  test('loads and revalidates an embedded project context', () => {
    expect(projectContext.source).toBe('runtime-config');
    expect(projectContext.config_digest).toBe(runtime.runtimeConfigDigest(config));
    expect(runtime.validateProjectContext(projectContext, repositoryRoot)).toBe(projectContext);
    expect(projectContext.path_bindings_digest).toMatch(/^[a-f0-9]{64}$/);
  });

  test('builds configured Cedar and Edictum policy boundaries from the same snapshot', () => {
    const authorize = createConfiguredProjectAuthorizer(repositoryRoot, config);
    expect(authorize(authorization('read'), identity(), projectContext).decision).toBe('allow');
    expect(authorize(authorization('write'), identity(), projectContext).decision).toBe('allow');
    expect(authorize(authorization('write', 'researcher'), identity('researcher'), projectContext).decision).toBe(
      'deny',
    );
    const policy = loadConfiguredEdictumGovernancePolicy(repositoryRoot, config);
    const workflow = runtime.compileConfiguredEdictumWorkflow(config);
    expect(workflow.apiVersion).toBe('edictum/v1');
    expect(workflow.stages.map((stage) => stage.id)).toEqual(
      config.governance.edictum.workflow.stages.map((stage) => stage.id),
    );
    expect(policy.policyVersion).toBe(config.governance.edictum.policy_version);
    expect(policy.tools['runtime.write']).toEqual({ side_effect: 'write', idempotent: false });
  });

  test('builds the selected Mastra development workflow', () => {
    const result = runtime.createConfiguredMastra(repositoryRoot, {
      work_item: {
        kind: 'feature',
        intent: 'implementation_new',
        project: projectId,
        risk_flags: [],
        labels: [],
      },
    });
    expect(result.workflowId).toBe('implementation_new');
    expect(result.compiled.waves.flat().map((stage) => stage.kind)).toContain('deliver');
  });

  test('fails closed without an opaque runtime-kernel host capability', async () => {
    await Promise.resolve(
      expect(
        Promise.resolve(callWithUntrustedArguments(runtime.createRuntimeKernel, [repositoryRoot, Object.freeze({})])),
      ).rejects.toThrow(/opaque host capability/),
    );
  });

  test('persists and reopens the configured LibSQL memory store', async () => {
    const result = await runLibSqlSmoke();
    expect(result.reopened).toBe(true);
    expect(result.persisted).toBe(true);
  });
});
