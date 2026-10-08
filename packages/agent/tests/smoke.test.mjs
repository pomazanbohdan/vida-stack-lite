import { describe, expect, test } from 'bun:test';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { configuredTestContext } from './configured-context.mjs';
import * as runtime from '../src/index.ts';
import { runLibSqlSmoke } from '../src/orchestration/mastra-boundary.ts';
import { loadConfiguredEdictumGovernancePolicy } from '../src/governance/edictum-boundary.ts';
import { createConfiguredProjectAuthorizer } from '../src/authorization/cedar-boundary.ts';
import { createRuntimeKernelHostProofForCompositionRoot } from '../src/runtime-kernel.ts';
import { stable } from '../src/lifecycle/runtime-facade.ts';
const { repositoryRoot, config, context: projectContext } = configuredTestContext();
const projectId = projectContext.project_ids[0];

function identity(role = 'developer-orchestrator') {
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

function authorization(action = 'read', role = 'developer-orchestrator') {
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

function assuranceInput(overrides = {}) {
  return {
    work_id: 'migration-work',
    revision: 1,
    source_revision: 'source-a',
    lifecycle_state: 'EXECUTE',
    next_action: 'Continue implementation.',
    ...overrides,
  };
}

describe('clean v1 package surface', () => {
  test('exposes derived assurance context and a validated same-work status delta', () => {
    const first = runtime.buildRuntimeAssuranceContext({
      work_id: 'migration-work',
      revision: 1,
      source_revision: 'source-a',
      lifecycle_state: 'EXECUTE',
      next_action: 'Continue implementation.',
    });
    expect(first.schema).toBe('RuntimeAssuranceContext/v1');
    expect(Object.isFrozen(first)).toBe(true);
    expect(runtime.validateRuntimeAssuranceContext(first)).toBe(first);
    const compact = runtime.compactRuntimeAssuranceContext(first);
    expect(compact.context_id).toBe(first.context_id);
    expect(compact).not.toHaveProperty('platform_knowledge_digest');
    expect(() => runtime.compactRuntimeAssuranceContext({ ...first, context_id: '0'.repeat(64) })).toThrow(
      /digest invalid/,
    );
    const unchanged = runtime.statusDelta(first, first);
    expect(unchanged.status).toBe('unchanged');
    expect(runtime.validateStatusDelta(unchanged)).toBe(unchanged);
    const second = runtime.buildRuntimeAssuranceContext({
      ...first,
      revision: 2,
      lifecycle_state: 'VERIFY',
      next_action: 'Verify result.',
    });
    const delta = runtime.statusDelta(first, second);
    expect(delta.schema).toBe('RuntimeStatusDelta/v1');
    expect(runtime.validateStatusDelta(delta)).toBe(delta);
    expect(delta.status).toBe('changed');
    expect(delta.changed).toContainEqual({ field: 'revision', value: 2 });
    expect(delta.watermark).toEqual({ context_id: second.context_id, revision: 2 });
    expect(() => runtime.validateRuntimeAssuranceContext({ ...first, authority: 'trusted' })).toThrow(
      /authority invalid/,
    );
    expect(() => runtime.statusDelta(first, { ...second, work_id: 'other-work' })).toThrow();
    const otherWork = runtime.buildRuntimeAssuranceContext(assuranceInput({ work_id: 'other-work' }));
    expect(() => runtime.statusDelta(first, otherWork)).toThrow(/work id mismatch/);
  });

  test('canonicalizes nested context values without changing array order', () => {
    expect(stable({ b: [2, { y: 2, x: 1 }], a: 1 })).toBe('{"a":1,"b":[2,{"x":1,"y":2}]}');
    expect(stable({ a: 1, b: [2, { x: 1, y: 2 }] })).toBe(stable({ b: [2, { y: 2, x: 1 }], a: 1 }));
    expect(stable([1, 2])).not.toBe(stable([2, 1]));
  });

  test('rejects malformed assurance identities before they become status evidence', () => {
    for (const input of [null, [], 'not an object'])
      expect(() => runtime.buildRuntimeAssuranceContext(input)).toThrow();
    for (const input of [null, 'not an object'])
      expect(() => runtime.buildRuntimeAssuranceContext(input)).toThrow('assurance context input required');
    for (const [field, values] of [
      ['work_id', [undefined, '', '  ']],
      ['source_revision', [undefined, '', '  ']],
      ['lifecycle_state', [undefined, '', '  ']],
      ['next_action', [undefined, '', '  ']],
      ['revision', [0, -1, 1.5, '1']],
      ['sealed_revision', [0, -1, 1.5, '1']],
      ['packet_version', [0, -1, 1.5, '1']],
      ['wave', [0, -1, 1.5, '1']],
      ['generation', [0, -1, 1.5, '1']],
      ['requested_reviewers', [0, -1, 1.5, '1']],
      ['implementation_fingerprint', ['', 'A'.repeat(64), 'g'.repeat(64), `x${'a'.repeat(64)}`, `${'a'.repeat(64)}x`]],
      ['platform_knowledge_digest', ['', 'A'.repeat(64), 'g'.repeat(64), `x${'a'.repeat(64)}`, `${'a'.repeat(64)}x`]],
      [
        'documentation_inventory_digest',
        ['', 'A'.repeat(64), 'g'.repeat(64), `x${'a'.repeat(64)}`, `${'a'.repeat(64)}x`],
      ],
    ])
      for (const value of values)
        expect(() => runtime.buildRuntimeAssuranceContext(assuranceInput({ [field]: value }))).toThrow();
    expect(runtime.buildRuntimeAssuranceContext(assuranceInput({ revision: null })).revision).toBeNull();
    expect(runtime.buildRuntimeAssuranceContext(assuranceInput({ packet_version: null })).packet_version).toBeNull();
    expect(
      runtime.buildRuntimeAssuranceContext(assuranceInput({ source_revision: ' source-a ' })).source_revision,
    ).toBe('source-a');
    const notText = { toString: () => 'a'.repeat(64) };
    for (const [field, value] of [
      ['work_id', 123],
      ['implementation_fingerprint', notText],
    ]) {
      try {
        runtime.buildRuntimeAssuranceContext(assuranceInput({ [field]: value }));
        throw new Error('expected invalid assurance identity to be blocked');
      } catch (error) {
        expect(error.code).toBe('GATE_BLOCKED');
      }
    }
  });

  test('binds packet fallback, explicit precedence, and documentation status into the context', () => {
    const packet = {
      sealed_revision: 2,
      implementation_fingerprint: 'a'.repeat(64),
      packet_id: 'packet-a',
      packet_version: 3,
      wave: 4,
      generation: 5,
    };
    const inherited = runtime.buildRuntimeAssuranceContext(assuranceInput({ packet }));
    for (const [field, value] of Object.entries(packet)) expect(inherited[field]).toEqual(value);
    const explicit = runtime.buildRuntimeAssuranceContext(
      assuranceInput({ packet, sealed_revision: 6, packet_id: 'packet-b' }),
    );
    expect(explicit.sealed_revision).toBe(6);
    expect(explicit.packet_id).toBe('packet-b');
    expect(explicit.context_id).not.toBe(inherited.context_id);
    expect(runtime.buildRuntimeAssuranceContext(assuranceInput({ packet: null })).packet_id).toBeNull();
    const callablePacket = Object.assign(() => {}, { packet_id: 'not-an-object' });
    expect(runtime.buildRuntimeAssuranceContext(assuranceInput({ packet: callablePacket })).packet_id).toBeNull();
    expect(inherited).not.toHaveProperty('documentation_clear_id');
    const documented = runtime.buildRuntimeAssuranceContext(assuranceInput({ documentation_clear_id: 'clear-a' }));
    expect(documented.documentation_clear_id).toBe('clear-a');
    expect(documented.documentation_inventory_digest).toBeNull();
    expect(documented.current_documentation_artifact).toBeNull();
    const artifactOnly = runtime.buildRuntimeAssuranceContext(
      assuranceInput({ current_documentation_artifact: 'doc-a' }),
    );
    expect(artifactOnly.current_documentation_artifact).toBe('doc-a');
    expect(artifactOnly.documentation_clear_id).toBeNull();
    expect(runtime.buildRuntimeAssuranceContext(assuranceInput()).documentation_skill_validation_status).toBeNull();
    for (const status of [undefined, null, 'pass', 'warning', 'changes_required'])
      expect(
        runtime.buildRuntimeAssuranceContext(assuranceInput({ documentation_skill_validation_status: status })),
      ).toBeDefined();
    for (const status of ['unknown', 1, {}, []])
      expect(() =>
        runtime.buildRuntimeAssuranceContext(assuranceInput({ documentation_skill_validation_status: status })),
      ).toThrow();
  });

  test('reports every bound assurance status change with the current watermark', () => {
    const baseline = runtime.buildRuntimeAssuranceContext(
      assuranceInput({
        documentation_clear_id: null,
        documentation_inventory_digest: null,
        current_documentation_artifact: null,
      }),
    );
    const changes = [
      ['revision', 2],
      ['source_revision', 'source-b'],
      ['lifecycle_state', 'VERIFY'],
      ['sealed_revision', 2],
      ['implementation_fingerprint', 'a'.repeat(64)],
      ['packet_id', 'packet-b'],
      ['packet_version', 2],
      ['wave', 2],
      ['generation', 2],
      ['review_mode', 'blind'],
      ['requested_reviewers', 3],
      ['capability_epoch', 'epoch-b'],
      ['lease_expires_at', '2026-09-21T00:00:00.000Z'],
      ['platform_knowledge_context_id', 'knowledge-b'],
      ['platform_knowledge_digest', 'b'.repeat(64)],
      ['documentation_skill_validation_status', 'pass'],
      ['documentation_clear_id', 'clear-b'],
      ['documentation_inventory_digest', 'c'.repeat(64)],
      ['current_documentation_artifact', 'doc-b'],
      ['next_action', 'Verify result.'],
    ];
    for (const [field, value] of changes) {
      const current = runtime.buildRuntimeAssuranceContext({ ...baseline, [field]: value });
      const delta = runtime.statusDelta(baseline, current);
      expect(delta.status).toBe('changed');
      expect(delta.changed).toEqual([{ field, value }]);
      expect(delta.from_revision).toBe(baseline.revision);
      expect(delta.to_revision).toBe(current.revision);
      expect(delta.context_id).toBe(current.context_id);
      expect(delta.watermark).toEqual({ context_id: current.context_id, revision: current.revision });
      expect(runtime.validateStatusDelta(delta)).toBe(delta);
    }
  });

  test('rejects malformed status deltas and tampered contexts', () => {
    const first = runtime.buildRuntimeAssuranceContext(assuranceInput());
    const second = runtime.buildRuntimeAssuranceContext(assuranceInput({ revision: 2 }));
    const delta = runtime.statusDelta(first, second);
    for (const changed of [
      { schema: 'Wrong/v1' },
      { status: 'approved' },
      { work_id: '' },
      { from_revision: 0 },
      { to_revision: 0 },
      { context_id: 'not-a-digest' },
      { context_id: `x${'a'.repeat(64)}` },
      { context_id: `${'a'.repeat(64)}x` },
      { changed: {} },
      { status: 'unchanged' },
      { next_action: ' ' },
    ])
      expect(() => runtime.validateStatusDelta({ ...delta, ...changed })).toThrow();
    for (const changed of [
      { schema: 'Wrong/v1' },
      { context_id: '0'.repeat(64) },
      { next_action: '' },
      { authority: 'trusted' },
      { revision: 0 },
      { implementation_fingerprint: 'bad' },
      { documentation_skill_validation_status: 'unknown' },
    ])
      expect(() => runtime.validateRuntimeAssuranceContext({ ...first, ...changed })).toThrow();
    expect(() => runtime.statusDelta({ ...first, next_action: '' }, second)).toThrow(/next action/);
    expect(() => runtime.statusDelta(first, { ...second, authority: 'trusted' })).toThrow(/authority invalid/);
    for (const value of [null, [], { ...first, schema: 'Wrong/v1' }])
      expect(() => runtime.validateRuntimeAssuranceContext(value)).toThrow(/schema invalid/);
    expect(() => runtime.validateRuntimeAssuranceContext(Object.assign(() => {}, first))).toThrow(/schema invalid/);
    for (const value of [null, [], { ...delta, schema: 'Wrong/v1' }, { ...delta, status: 'approved' }])
      expect(() => runtime.validateStatusDelta(value)).toThrow(/delta invalid/);
    expect(() => runtime.validateStatusDelta(Object.assign(() => {}, delta))).toThrow(/delta invalid/);
    try {
      runtime.validateStatusDelta(null);
      throw new Error('expected a blocked status delta');
    } catch (error) {
      expect(error.code).toBe('GATE_BLOCKED');
    }
    for (const value of [null, 'not an object']) {
      try {
        runtime.validateRuntimeAssuranceContext(value);
        throw new Error('expected invalid context to be blocked');
      } catch (error) {
        expect(error.code).toBe('GATE_BLOCKED');
      }
    }
    const identityValues = Object.fromEntries(
      Object.entries(first).filter(([key]) => !['schema', 'context_id', 'next_action', 'authority'].includes(key)),
    );
    const invalidStatus = { ...identityValues, documentation_skill_validation_status: 'invalid' };
    const invalidDigest = createHash('sha256').update(stable(invalidStatus)).digest('hex');
    expect(() =>
      runtime.validateRuntimeAssuranceContext({
        ...first,
        documentation_skill_validation_status: 'invalid',
        context_id: invalidDigest,
      }),
    ).toThrow(/documentation validation status invalid/);
  });

  test('requires complete v1 delta shape and a matching watermark', () => {
    const first = runtime.buildRuntimeAssuranceContext(assuranceInput());
    const second = runtime.buildRuntimeAssuranceContext(assuranceInput({ revision: 2 }));
    const delta = runtime.statusDelta(first, second);
    for (const field of Object.keys(delta)) {
      const incomplete = { ...delta };
      delete incomplete[field];
      expect(() => runtime.validateStatusDelta(incomplete)).toThrow();
    }
    for (const invalid of [
      { ...delta, extra: true },
      { ...delta, context_id: null },
      { ...delta, from_revision: undefined },
      { ...delta, to_revision: undefined },
      { ...delta, watermark: null },
      { ...delta, watermark: { context_id: first.context_id, revision: second.revision } },
      { ...delta, watermark: { context_id: second.context_id, revision: first.revision } },
      { ...delta, watermark: { context_id: second.context_id } },
      { ...delta, watermark: { context_id: second.context_id, revision: second.revision, extra: true } },
      { ...delta, changed: [null] },
      { ...delta, changed: [{ field: 'revision' }] },
      { ...delta, changed: [{ field: '', value: 2 }] },
      { ...delta, changed: [{ field: 'revision', value: 2, extra: true }] },
    ])
      expect(() => runtime.validateStatusDelta(invalid)).toThrow();
    expect(runtime.validateStatusDelta(delta)).toBe(delta);
  });

  test('blocks malformed v1 delta objects with governed diagnostics', () => {
    const first = runtime.buildRuntimeAssuranceContext(assuranceInput());
    const second = runtime.buildRuntimeAssuranceContext(assuranceInput({ revision: 2 }));
    const delta = runtime.statusDelta(first, second);
    const blocked = (input, message) => {
      try {
        runtime.validateStatusDelta(input);
      } catch (error) {
        expect(error.code).toBe('GATE_BLOCKED');
        if (message) expect(error.message).toBe(message);
        return;
      }
      throw new Error('malformed delta was accepted');
    };
    blocked({ ...delta, extra: true }, 'assurance status delta fields invalid');
    blocked({ ...delta, from_revision: undefined }, 'assurance status delta revisions invalid');
    blocked(
      { ...delta, to_revision: undefined, watermark: { ...delta.watermark, revision: undefined } },
      'assurance status delta revisions invalid',
    );
    blocked({ ...delta, context_id: null }, 'assurance status delta context id invalid');
    blocked({ ...delta, changed: [{}] }, 'assurance status delta change invalid');
    blocked({ ...delta, changed: [{ field: '', value: 1 }] }, 'assurance status delta change field missing');
    blocked({ ...delta, watermark: null }, 'assurance status delta watermark invalid');
    blocked(
      { ...delta, watermark: { context_id: first.context_id, revision: delta.to_revision } },
      'assurance status delta watermark mismatch',
    );
    blocked({ ...delta, changed: [null] });
    blocked({ ...delta, changed: [{ field: 'revision', extra: true }] });
    blocked({ ...delta, changed: [Object.assign([], { field: 'revision', value: 2 })] });
    blocked({ ...delta, changed: [Object.assign(() => {}, { field: 'revision', value: 2 })] });
  });

  test('reports the invalid assurance field and status delta in blocked diagnostics', () => {
    const fieldCases = [
      ['work_id', undefined, 'work id missing'],
      ['revision', 0, 'revision invalid'],
      ['source_revision', undefined, 'source revision missing'],
      ['lifecycle_state', undefined, 'lifecycle state missing'],
      ['sealed_revision', 0, 'sealed revision invalid'],
      ['implementation_fingerprint', 'bad', 'fingerprint invalid'],
      ['packet_id', 123, 'packet id missing'],
      ['packet_version', 0, 'packet version invalid'],
      ['wave', 0, 'wave invalid'],
      ['generation', 0, 'generation invalid'],
      ['review_mode', 123, 'review mode missing'],
      ['requested_reviewers', 0, 'reviewer count invalid'],
      ['capability_epoch', 123, 'capability epoch missing'],
      ['lease_expires_at', 123, 'lease expiry missing'],
      ['platform_knowledge_context_id', 123, 'knowledge id missing'],
      ['platform_knowledge_digest', 'bad', 'knowledge digest invalid'],
      ['documentation_clear_id', 123, 'documentation CLEAR id missing'],
      ['documentation_inventory_digest', 'bad', 'documentation inventory digest invalid'],
      ['next_action', '', 'next action missing'],
    ];
    for (const [field, value, suffix] of fieldCases) {
      try {
        runtime.buildRuntimeAssuranceContext(assuranceInput({ [field]: value }));
        throw new Error('expected invalid assurance field to be blocked');
      } catch (error) {
        expect(error.code).toBe('GATE_BLOCKED');
        expect(error.message).toBe(`assurance context ${suffix}`);
      }
    }
    try {
      runtime.buildRuntimeAssuranceContext(assuranceInput({ documentation_skill_validation_status: 'unknown' }));
      throw new Error('expected invalid documentation status to be blocked');
    } catch (error) {
      expect(error.code).toBe('GATE_BLOCKED');
      expect(error.message).toBe('assurance context documentation validation status invalid');
    }

    const first = runtime.buildRuntimeAssuranceContext(assuranceInput());
    const second = runtime.buildRuntimeAssuranceContext(assuranceInput({ revision: 2 }));
    const delta = runtime.statusDelta(first, second);
    const deltaCases = [
      { change: { work_id: '' }, suffix: 'delta work id missing' },
      { change: { from_revision: 0 }, suffix: 'delta from revision invalid' },
      { change: { to_revision: 0 }, suffix: 'delta to revision invalid' },
      { change: { context_id: 'bad' }, suffix: 'delta context id invalid' },
      { change: { changed: {} }, suffix: 'delta changes invalid' },
      { change: { status: 'unchanged' }, suffix: 'unchanged delta has changes' },
      { change: { next_action: '' }, suffix: 'delta next action missing' },
    ];
    for (const { change, suffix } of deltaCases) {
      try {
        runtime.validateStatusDelta({ ...delta, ...change });
        throw new Error('expected invalid status delta to be blocked');
      } catch (error) {
        expect(error.code).toBe('GATE_BLOCKED');
        expect(error.message).toBe(`assurance status ${suffix}`);
      }
    }
  });

  test('exports production host and evidence-authority factories', async () => {
    for (const name of [
      'loadRuntimeConfig',
      'selectWorkflow',
      'compileDevelopmentWorkflow',
      'compileConfiguredEdictumWorkflow',
      'createConfiguredMastra',
      'createRuntimeKernel',
      'createRuntimeKernelHost',
      'createFileWorkflowHostCapability',
      'createDeliveryEvidenceAuthority',
    ])
      expect(typeof runtime[name]).toBe('function');
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
    await Promise.resolve(expect(runtime.createRuntimeKernel(path.resolve(repositoryRoot, '..'), host)).rejects.toThrow(
      /runtime kernel host is bound to a different repository root/,
    ));
    expect(() => runtime.createRuntimeKernelHost(Object.freeze({}))).toThrow(
      /runtime kernel host authentication proof is required/,
    );
    await Promise.resolve(expect(runtime.createFileWorkflowHostCapability(Object.freeze({}))).rejects.toThrow(
      /Edictum workflow host authentication proof is required/,
    ));
  });

  test('keeps the clean surface free of activation or lifecycle APIs', () => {
    for (const removed of [
      'applyActivation',
      'validateActivationRequest',
      'buildProfileCrosswalk',
      'partitionReviewTriageFindings',
      'loadAgentRoleProfileRegistry',
    ])
      expect(runtime[removed]).toBeUndefined();
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
    await Promise.resolve(expect(runtime.createRuntimeKernel(repositoryRoot, Object.freeze({}))).rejects.toThrow(
      /opaque host capability/,
    ));
  });

  test('persists and reopens the configured LibSQL memory store', async () => {
    const result = await runLibSqlSmoke();
    expect(result.reopened).toBe(true);
    expect(result.persisted).toBe(true);
  });
});
