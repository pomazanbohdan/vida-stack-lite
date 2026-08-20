'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020').default;
const routing = require('../../lib/agent-routing.cjs');
const runtime = require('../../lib/runtime.cjs');

const repositoryRoot = path.resolve(__dirname, '../../..');
const registryFile = path.join(repositoryRoot, 'agent-runtime', 'config', 'agent-profiles.v1.json');

function registry() { return routing.loadRegistry({ repository_root: repositoryRoot, registry_file: registryFile }); }

function base(overrides = {}) {
  return { role: 'researcher', phase: 'trace', work_id: 'routing-work', task_id: 'research-1', scope_id: 'scope-1', source_revision: 'git:routing', context_digest: 'context-1', ...overrides };
}

describe('config-driven agent routing', () => {
  test('loads the checked-in registry and resolves a bounded Luna research specialist', () => {
    routing.clearCache();
    const value = registry();
    expect(value.role_profiles).toHaveLength(12);
    const decision = routing.resolve(base(), { registry: value });
    expect(decision.model).toBe('gpt-5.6-luna');
    expect(decision.reasoning).toBe('high');
    expect(decision.assurance_stage).toBe(1);
    expect(decision.mode).toBe('specialist');
    expect(decision.context_mode).toBe('task_contract');
    expect(decision.forbidden_context).toContain('full_conversation_transcript');
    expect(() => routing.validateDecision(decision, { registry: value })).not.toThrow();
    expect(runtime.resolveAgentRoute(base(), { registry: value }).routing_id).toBe(decision.routing_id);
    expect(runtime.agentRouting.schema).toBe('AgentRoutingDecision/v1');
  });

  test('keeps all non-architect roles on Luna and reserves Sol/high for stage four', () => {
    routing.clearCache();
    const value = registry();
    expect(new Set(value.role_profiles.map(item => item.reasoning))).toEqual(new Set(['high', 'xhigh', 'max']));
    for (const profile of value.role_profiles) {
      if (profile.role === 'blind-architect') {
        expect(profile).toMatchObject({ model: 'gpt-5.6-sol', reasoning: 'high', assurance_stage: 4, blind: true });
      } else {
        expect(profile.model).toBe('gpt-5.6-luna');
        expect(profile.assurance_stage).toBeGreaterThanOrEqual(1);
        expect(profile.assurance_stage).toBeLessThanOrEqual(3);
      }
    }
    const architect = routing.resolve(base({ role: 'blind-architect', requires_independence: true }), { registry: value });
    expect(architect).toMatchObject({ model: 'gpt-5.6-sol', reasoning: 'high', assurance_stage: 4, mode: 'independent' });
    expect(architect.next_action).toMatch(/assurance stage 4/);
  });

  test('reuses an active same-scope agent only when source and context are bound', () => {
    routing.clearCache();
    const value = registry();
    const decision = routing.resolve(base({ role: 'executor', existing_agent: { agent_id: 'agent-1', status: 'active', scope_id: 'scope-1', source_revision: 'git:routing', context_digest: 'context-1' } }), { registry: value });
    expect(decision.mode).toBe('reuse');
    expect(decision.reused_agent_id).toBe('agent-1');
    const stale = routing.resolve(base({ role: 'executor', existing_agent: { agent_id: 'agent-1', status: 'active', scope_id: 'scope-1', source_revision: 'git:stale', context_digest: 'context-1' } }), { registry: value });
    expect(stale.mode).toBe('specialist');
    expect(stale.reused_agent_id).toBeNull();
  });

  test('forces fresh independent routing for blind and explicitly independent roles', () => {
    routing.clearCache();
    const value = registry();
    const existing = { agent_id: 'old', status: 'active', scope_id: 'scope-1', source_revision: 'git:routing', context_digest: 'context-1' };
    const review = routing.resolve(base({ role: 'correctness-reviewer', existing_agent: existing }), { registry: value });
    expect(review.mode).toBe('independent');
    expect(review.blind).toBe(true);
    expect(review.history_isolation).toBe(true);
    expect(review.reused_agent_id).toBeNull();
    expect(review.required_context).toEqual(['br_sr_ac', 'observable_behavior', 'evidence_pointers']);
    expect(review.forbidden_context).toContain('prior_findings');
  });

  test('disabled, unknown and invalid profiles fail closed', () => {
    routing.clearCache();
    const value = registry();
    const disabled = { ...value, role_profiles: value.role_profiles.map(item => item.role === 'researcher' ? { ...item, enabled: false } : item) };
    expect(() => routing.resolve(base(), { registry: disabled })).toThrow(expect.objectContaining({ code: 'GAP-AGENT-ROLE-DISABLED-001' }));
    expect(() => routing.resolve(base({ role: 'missing-role' }), { registry: value })).toThrow(expect.objectContaining({ code: 'GAP-AGENT-ROLE-UNKNOWN-001' }));
    expect(() => routing.loadRegistry({ registry: { ...value, role_profiles: [{ ...value.role_profiles[0], blind: true, required_independence: false }] } })).toThrow(/blind agent profile/);
  });

  test('rejects unreadable registries and non-Luna non-architect profiles', () => {
    routing.clearCache();
    const value = registry();
    expect(() => routing.loadRegistry({ repository_root: repositoryRoot, registry_file: 'agent-runtime/config/missing-agent-profiles.json' })).toThrow(expect.objectContaining({ code: 'GAP-AGENT-PROFILE-REGISTRY-001' }));
    const wrongModel = { ...value, role_profiles: value.role_profiles.map(item => item.role === 'executor' ? { ...item, model: 'gpt-5.6-sol' } : item) };
    expect(() => routing.loadRegistry({ registry: wrongModel })).toThrow(/non-architect agent/);
  });

  test('stale registry decisions are rejected and cache hits do not alter the digest', () => {
    routing.clearCache();
    const value = registry();
    const first = routing.resolve(base(), { registry: value });
    const second = routing.resolve(base(), { registry: value });
    expect(second.cache_hit).toBe(true);
    expect(second.decision_digest).toBe(first.decision_digest);
    const changed = { ...value, version: value.version + 1 };
    expect(() => routing.validateDecision(first, { registry: changed })).toThrow(expect.objectContaining({ code: 'GAP-AGENT-PROFILE-STALE-001' }));
  });

  test('creates a bounded typed task contract without parent transcript', () => {
    routing.clearCache();
    const value = registry();
    const decision = routing.resolve(base({ role: 'web-researcher' }), { registry: value });
    const task = routing.contract({ registry: value, allowed_paths: ['docs/project'], protected_paths: ['.agent'], stop_condition: 'Return sources and a compact finding list.' }, decision);
    expect(task.schema).toBe('AgentTaskContract/v1');
    expect(task.allowed_paths).toEqual(['docs/project']);
    expect(task.forbidden_context).toContain('full_conversation_transcript');
    expect(JSON.stringify(task)).not.toContain('parent transcript');
  });

  test('default registry path is repository-owned and external path traversal is rejected', () => {
    routing.clearCache();
    expect(routing.loadRegistry({ repository_root: repositoryRoot }).registry_id).toBe('codex-default-agent-routing');
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'routing-outside-'));
    const file = path.join(outside, 'registry.json');
    fs.writeFileSync(file, '{}');
    expect(() => routing.loadRegistry({ repository_root: repositoryRoot, registry_file: file })).toThrow(/outside repository/);
  });

  test('registry and decision validate against their closed schemas', () => {
    routing.clearCache();
    const schemaRoot = path.resolve(repositoryRoot, 'agent-runtime', 'schemas');
    const ajv = new Ajv2020({ strict: false, allErrors: true, validateFormats: false });
    const registrySchema = JSON.parse(fs.readFileSync(path.join(schemaRoot, 'agent-role-profile-registry.v1.schema.json'), 'utf8'));
    const decisionSchema = JSON.parse(fs.readFileSync(path.join(schemaRoot, 'agent-routing-decision.v1.schema.json'), 'utf8'));
    const taskSchema = JSON.parse(fs.readFileSync(path.join(schemaRoot, 'agent-task-contract.v1.schema.json'), 'utf8'));
    const value = registry();
    const decision = routing.resolve(base(), { registry: value });
    const task = routing.contract({ registry: value, allowed_paths: [], protected_paths: [], stop_condition: 'Return a compact result.' }, decision);
    expect(ajv.compile(registrySchema)(JSON.parse(fs.readFileSync(registryFile, 'utf8')))).toBe(true);
    expect(ajv.compile(decisionSchema)(decision)).toBe(true);
    expect(ajv.compile(taskSchema)(task)).toBe(true);
    expect(ajv.compile(decisionSchema)({ ...decision, unknown: true })).toBe(false);
  });
});

