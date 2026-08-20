/* Config-driven, host-independent routing for bounded agent subtasks. */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const schema = 'AgentRoutingDecision/v1';
const registrySchema = 'AgentRoleProfileRegistry/v1';
const modes = Object.freeze(['reuse', 'specialist', 'independent']);
const reasoning = Object.freeze(['high', 'xhigh', 'max']);
const roles = Object.freeze([
  'researcher', 'web-researcher', 'codebase-mapper', 'implementation-planner', 'executor', 'debugger',
  'plan-checker', 'correctness-reviewer', 'security-reviewer', 'documentation-validator', 'blind-architect', 'synthesizer'
]);
const cache = new Map();

function fail(message, code = 'GAP-AGENT-ROUTING-001') {
  /** @type {Error & { code?: string }} */
  const error = new Error(message);
  error.code = code;
  throw error;
}

function text(value, name, nullable = false) {
  if (nullable && (value === null || value === undefined)) return null;
  if (typeof value !== 'string' || !value.trim()) fail(`${name} missing`);
  return value.trim();
}

function optionalText(value, name) { return text(value, name, true); }

function bool(value, name) { if (typeof value !== 'boolean') fail(`${name} invalid`); return value; }

function integer(value, name, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) fail(`${name} invalid`);
  return value;
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function digest(value) { return crypto.createHash('sha256').update(stable(value)).digest('hex'); }

function relativeFile(root, value) {
  const resolved = path.resolve(root, value);
  const base = path.resolve(root);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) fail('agent profile registry path outside repository');
  return resolved;
}

function readRegistryFile(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { fail('agent profile registry unreadable', 'GAP-AGENT-PROFILE-REGISTRY-001'); }
}

function budget(value) {
  if (!value || typeof value !== 'object') fail('agent context budget invalid');
  return {
    max_input_tokens: integer(value.max_input_tokens, 'agent max input tokens', 256, 200000),
    max_output_tokens: integer(value.max_output_tokens, 'agent max output tokens', 128, 50000),
    max_evidence_lines: integer(value.max_evidence_lines, 'agent max evidence lines', 1, 1000)
  };
}

function profileCore(value) {
  if (!value || typeof value !== 'object') fail('agent role profile invalid');
  const role = text(value.role, 'agent role');
  if (!roles.includes(role)) fail(`unknown agent role: ${role}`, 'GAP-AGENT-ROLE-UNKNOWN-001');
  return {
    role, profile_id: text(value.profile_id, 'agent profile id'), enabled: bool(value.enabled, 'agent profile enabled'),
    model: text(value.model, 'agent profile model'), reasoning: value.reasoning, assurance_stage: integer(value.assurance_stage, 'agent assurance stage', 1, 4), blind: bool(value.blind, 'agent profile blind'),
    required_independence: bool(value.required_independence, 'agent profile independence'),
    preferred_mode: value.preferred_mode, reuse_if_same_scope: bool(value.reuse_if_same_scope, 'agent profile reuse'),
    context_mode: value.context_mode, context_budget: budget(value.context_budget),
    output_schema: text(value.output_schema, 'agent output schema'), ponytail_role: optionalText(value.ponytail_role, 'agent Ponytail role')
  };
}

function validateModelPolicy(selected) {
  if (selected.role === 'blind-architect') {
    if (selected.model !== 'gpt-5.6-sol' || selected.reasoning !== 'high' || selected.assurance_stage !== 4) fail('blind architect must use gpt-5.6-sol/high at assurance stage 4');
  } else if (selected.model !== 'gpt-5.6-luna' || selected.assurance_stage === 4) {
    fail('non-architect agent must use gpt-5.6-luna at assurance stages 1-3');
  }
}

function validateProfilePolicy(selected) {
  if (!reasoning.includes(selected.reasoning)) fail('agent profile reasoning invalid');
  validateModelPolicy(selected);
  if (!modes.includes(selected.preferred_mode)) fail('agent profile preferred mode invalid');
  if (!['task_contract', 'parent_summary', 'sealed_packet', 'none'].includes(selected.context_mode)) fail('agent profile context mode invalid');
  if (selected.blind && (!selected.required_independence || selected.preferred_mode !== 'independent' || selected.reuse_if_same_scope)) fail('blind agent profile must be independent and non-reusable');
  if (selected.required_independence && selected.preferred_mode !== 'independent') fail('independent agent profile mode invalid');
}

function profile(value) {
  const selected = profileCore(value);
  validateProfilePolicy(selected);
  return selected;
}

function registryValue(value) {
  if (!value || value.schema !== registrySchema) fail('agent profile registry schema invalid', 'GAP-AGENT-PROFILE-REGISTRY-001');
  const result = { schema: registrySchema, registry_id: text(value.registry_id, 'agent registry id'), version: integer(value.version, 'agent registry version', 1, 1000000), capability_epoch: text(value.capability_epoch, 'agent registry capability epoch'), role_profiles: (value.role_profiles || []).map(profile) };
  if (!result.role_profiles.length) fail('agent profile registry is empty', 'GAP-AGENT-PROFILE-REGISTRY-001');
  const roleIds = result.role_profiles.map(item => item.role);
  const profileIds = result.role_profiles.map(item => item.profile_id);
  if (new Set(roleIds).size !== roleIds.length || new Set(profileIds).size !== profileIds.length) fail('agent profile registry contains duplicates', 'GAP-AGENT-PROFILE-REGISTRY-001');
  return result;
}

function loadRegistry(options = {}) {
  if (options && options.schema === registrySchema) return registryValue(options);
  if (options && options.registry && options.registry.schema === registrySchema) return registryValue(options.registry);
  const root = path.resolve(options.repository_root || process.cwd());
  const configured = options.registry_file || path.join(root, 'agent-runtime', 'config', 'agent-profiles.v1.json');
  return registryValue(readRegistryFile(relativeFile(root, configured)));
}

function registryDigest(registry) { return digest(registryValue(registry)); }

function profileFor(registry, role) {
  const value = registry.role_profiles.find(item => item.role === role);
  if (!value) fail(`agent role is not configured: ${role}`, 'GAP-AGENT-ROLE-UNKNOWN-001');
  if (!value.enabled) fail(`agent role is disabled: ${role}`, 'GAP-AGENT-ROLE-DISABLED-001');
  return value;
}

function existingAgentValid(input) {
  const current = input.existing_agent;
  if (!current || current.status !== 'active') return false;
  return Boolean(current.agent_id && current.scope_id === input.scope_id && current.source_revision === input.source_revision && current.context_digest === input.context_digest);
}

function independentRequired(input, configured) { return configured.required_independence || configured.blind || input.requires_independence === true; }

function routeMode(input, configured) {
  if (independentRequired(input, configured)) return 'independent';
  if (configured.reuse_if_same_scope && existingAgentValid(input)) return 'reuse';
  return configured.preferred_mode === 'reuse' ? 'specialist' : configured.preferred_mode;
}

function requiredContext(configured, mode) {
  if (configured.blind || mode === 'independent') return ['br_sr_ac', 'observable_behavior', 'evidence_pointers'];
  if (configured.context_mode === 'parent_summary') return ['task_contract', 'parent_summary', 'source_revision', 'scope_id'];
  if (configured.context_mode === 'none') return ['task_contract'];
  return ['task_contract', 'source_revision', 'scope_id'];
}

function forbiddenContext(configured, mode) {
  if (configured.blind || mode === 'independent') return ['parent_conversation', 'implementation_history', 'prior_findings', 'other_agent_outputs', 'broad_repository_scan'];
  return ['secrets', 'full_conversation_transcript', 'unbounded_repository_dump'];
}

function routeIdentity(input, registry, configured, mode) {
  return {
    registry_id: registry.registry_id, registry_version: registry.version, registry_digest: registryDigest(registry), capability_epoch: input.capability_epoch || registry.capability_epoch,
    work_id: optionalText(input.work_id, 'agent work id'), task_id: optionalText(input.task_id, 'agent task id'), scope_id: optionalText(input.scope_id, 'agent scope id'),
    source_revision: text(input.source_revision, 'agent source revision'), phase: text(input.phase || 'dispatch', 'agent phase'), role: configured.role,
    mode, profile_id: configured.profile_id, model: configured.model, reasoning: configured.reasoning, assurance_stage: configured.assurance_stage, blind: configured.blind,
    history_isolation: configured.blind || mode === 'independent', reused_agent_id: mode === 'reuse' ? input.existing_agent.agent_id : null,
    context_mode: configured.context_mode, context_budget: configured.context_budget, required_context: requiredContext(configured, mode),
    forbidden_context: forbiddenContext(configured, mode), output_schema: configured.output_schema
  };
}

function nextAction(mode, configured) {
  const stage = ` (assurance stage ${configured.assurance_stage})`;
  if (mode === 'reuse') return `Continue the existing ${configured.role}${stage} agent with the bounded task contract.`;
  if (mode === 'independent') return `Host should spawn one fresh history-isolated ${configured.role}${stage} agent with the bounded task contract.`;
  return `Host should spawn one bounded ${configured.role}${stage} specialist with the bounded task contract.`;
}

function decisionDigest(value) {
  const copy = { ...value };
  delete copy.decision_digest;
  delete copy.cache_hit;
  return digest(copy);
}

function decisionFrom(identity, cacheHit = false) {
  const value = { schema, routing_id: digest({ ...identity, decision: 'route' }), ...identity, cache_hit: cacheHit, next_action: nextAction(identity.mode, { role: identity.role, assurance_stage: identity.assurance_stage }), decision_digest: null };
  value.decision_digest = decisionDigest(value);
  return Object.freeze(value);
}

function cacheKey(input, registry, configured, mode) { return digest({ registry: registryDigest(registry), role: configured.role, phase: input.phase || 'dispatch', mode, work_id: input.work_id || null, task_id: input.task_id || null, scope_id: input.scope_id || null, source_revision: input.source_revision, capability_epoch: input.capability_epoch || registry.capability_epoch, existing_agent: mode === 'reuse' ? input.existing_agent?.agent_id : null, context_digest: input.context_digest || null }); }

function resolve(input, options = {}) {
  if (!input || typeof input !== 'object') fail('agent routing input required');
  const registry = loadRegistry(options.registry || options);
  const configured = profileFor(registry, text(input.role, 'agent role'));
  const mode = routeMode(input, configured);
  const key = cacheKey(input, registry, configured, mode);
  const cached = cache.get(key);
  if (cached) return Object.freeze({ ...cached, cache_hit: true });
  const decision = decisionFrom(routeIdentity(input, registry, configured, mode));
  cache.set(key, decision);
  return decision;
}

function expectedDecisionMode(value, configured) {
  return routeMode({
    scope_id: value.scope_id, source_revision: value.source_revision, context_digest: null,
    requires_independence: value.history_isolation,
    existing_agent: value.reused_agent_id ? { status: 'active', agent_id: value.reused_agent_id, scope_id: value.scope_id, source_revision: value.source_revision, context_digest: null } : null
  }, configured);
}

function validateDecisionBinding(value, configured) {
  const expectedMode = expectedDecisionMode(value, configured);
  if (value.mode !== expectedMode || value.profile_id !== configured.profile_id || value.model !== configured.model || value.reasoning !== configured.reasoning || value.assurance_stage !== configured.assurance_stage) fail('agent routing decision binding invalid');
}

function validateDecision(value, registryOrOptions = {}) {
  if (!value || value.schema !== schema) fail('agent routing decision schema invalid');
  const registry = loadRegistry(registryOrOptions.registry || registryOrOptions);
  if (value.registry_digest !== registryDigest(registry)) fail('agent routing registry is stale', 'GAP-AGENT-PROFILE-STALE-001');
  const configured = profileFor(registry, value.role);
  validateDecisionBinding(value, configured);
  if (decisionDigest(value) !== value.decision_digest) fail('agent routing decision digest invalid');
  return value;
}

function contract(input, decision) {
  validateDecision(decision, input.registry || {});
  const allowed = Array.isArray(input.allowed_paths) ? input.allowed_paths.slice(0, 100) : [];
  const protectedPaths = Array.isArray(input.protected_paths) ? input.protected_paths.slice(0, 100) : [];
  return Object.freeze({ schema: 'AgentTaskContract/v1', routing_id: decision.routing_id, work_id: decision.work_id, task_id: decision.task_id, source_revision: decision.source_revision, scope_id: decision.scope_id, role: decision.role, mode: decision.mode, profile_id: decision.profile_id, model: decision.model, reasoning: decision.reasoning, assurance_stage: decision.assurance_stage, context_mode: decision.context_mode, context_budget: decision.context_budget, allowed_paths: allowed, protected_paths: protectedPaths, required_context: decision.required_context, forbidden_context: decision.forbidden_context, output_schema: decision.output_schema, stop_condition: text(input.stop_condition, 'agent stop condition'), next_action: decision.next_action });
}

function clearCache() { cache.clear(); }

module.exports = { schema, registrySchema, modes, reasoning, roles, stable, digest, loadRegistry, registryDigest, resolve, validateDecision, contract, clearCache };
