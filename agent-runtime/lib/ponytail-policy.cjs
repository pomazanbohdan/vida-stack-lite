/* Role-scoped Ponytail policy resolution for the portable runtime. */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const schema = 'PonytailPolicyDecision/v1';
const modes = Object.freeze(['off', 'lite', 'full', 'review']);
const roles = Object.freeze([
  'requirements', 'business-research', 'system-research', 'codebase-mapping',
  'implementation-planner', 'executor', 'debugger', 'code-producing-specialist',
  'final-complexity-reviewer', 'correctness-reviewer', 'security-data-migration-reviewer',
  'verifier', 'documentation-reconciler', 'blind-architect'
]);
const phases = Object.freeze(['bootstrap', 'intake', 'trace', 'plan', 'execute', 'verify', 'review', 'architect', 'reconcile', 'dispatch']);
const roleModes = Object.freeze({
  requirements: 'off', 'business-research': 'off', 'system-research': 'off', 'codebase-mapping': 'off',
  'implementation-planner': 'lite', executor: 'full', debugger: 'full', 'code-producing-specialist': 'full',
  'final-complexity-reviewer': 'review', 'correctness-reviewer': 'off',
  'security-data-migration-reviewer': 'off', verifier: 'off', 'documentation-reconciler': 'off', 'blind-architect': 'off'
});
const mutationRoles = new Set(['executor', 'debugger', 'code-producing-specialist']);
const supportedRelease = /^gsd-1\.11\.[0-9]+_ponytail-4\.9\.[0-9]+$/;
const versionPattern = /^\d+\.\d+\.\d+$/;
const skillRelativePath = 'surface/.codex/skills/ponytail/SKILL.md';
const defaultFragment = 'Apply Ponytail only to implementation mechanics: reuse existing behavior, prefer standard/native/dependency solutions, keep the smallest coherent root-cause change, and preserve validation, security, acceptance, review, and delivery gates.';
const plannerFragment = 'Use Ponytail lite for implementation planning: minimize mechanics and reuse existing patterns, but do not reduce requirements, acceptance, evidence, or verification scope.';
const reviewFragment = 'Use Ponytail review only as a complexity audit. Do not replace correctness, security, requirements, architect, Runtime, acceptance, or delivery evidence.';
const cache = new Map();

function fail(message, code = 'GAP-PONYTAIL-CAPABILITY-001') {
  /** @type {Error & { code?: string, gate_code?: string }} */
  const error = new Error(message);
  error.code = code;
  error.gate_code = 'GATE_BLOCKED';
  throw error;
}

function text(value, name) { if (typeof value !== 'string' || !value.trim()) fail(`${name} missing`); return value; }
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function stable(value) {
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function digest(value) { return crypto.createHash('sha256').update(stable(value)).digest('hex'); }
function localAppData() { return process.env.LOCALAPPDATA || process.env.LOCAL_APP_DATA || path.join(process.env.USERPROFILE || process.cwd(), 'AppData', 'Local'); }
function stackRoot(options) { return path.resolve(options.stack_root || path.join(localAppData(), 'CodexHarness', 'agent-stack')); }
function contained(candidate, root, name) {
  const resolved = path.resolve(candidate);
  const base = path.resolve(root);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) fail(`${name} outside trusted stack`, 'GAP-PONYTAIL-STACK-001');
  return resolved;
}
function readJson(file, name) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { fail(`${name} unreadable`, 'GAP-PONYTAIL-STACK-001'); } }
function trustedOverride(options, releaseName) {
  const trusted = options.trusted || {};
  if (trusted.release && trusted.release !== releaseName) fail('trusted Ponytail release mismatch', 'GAP-PONYTAIL-STACK-001');
  return trusted.skill_sha256 || trusted.skillSha256 || options.expected_skill_sha256 || null;
}
function repositoryManifest(options) {
  const file = path.resolve(options.repository_root || process.cwd(), 'agent-runtime', 'capability', 'capability.json');
  return fs.existsSync(file) ? readJson(file, 'repository Ponytail trust manifest') : null;
}
function repositoryTrust(options, releaseName) {
  const override = trustedOverride(options, releaseName);
  if (override) return override;
  const manifest = repositoryManifest(options);
  if (!manifest) return null;
  const entry = manifest.ponytailPolicy?.trustedReleases?.find(item => item.release === releaseName);
  if (!entry) fail('managed Ponytail release is not repository-trusted', 'GAP-PONYTAIL-CAPABILITY-001');
  return entry.skillSha256;
}
function readReleasePointer(currentFile) {
  try { return text(fs.readFileSync(currentFile, 'utf8').trim(), 'managed Ponytail stack release'); }
  catch { fail('managed Ponytail stack pointer unavailable', 'GAP-PONYTAIL-STACK-001'); }
}
function validateStackMetadata(stack, packageManifest, releaseName) {
  const expectedGsd = releaseName.split('_')[0].slice(4);
  const expectedPonytail = releaseName.split('_ponytail-')[1];
  const dependency = packageManifest.dependencies?.['@dietrichgebert/ponytail'];
  if (stack.gsdCore !== expectedGsd || stack.ponytail !== expectedPonytail || dependency !== stack.ponytail) fail('managed Ponytail stack metadata mismatch', 'GAP-PONYTAIL-STACK-001');
}
function validateSkillHash(expected, actual) {
  if (expected && (!/^[a-f0-9]{64}$/i.test(expected) || expected.toLowerCase() !== actual)) fail('managed Ponytail skill hash mismatch', 'GAP-PONYTAIL-CAPABILITY-001');
}
function trustedRelease(options) {
  const root = stackRoot(options);
  const currentFile = path.resolve(options.current_file || path.join(root, 'current.txt'));
  contained(currentFile, root, 'stack pointer');
  const release = readReleasePointer(currentFile);
  const releasePath = contained(release, path.join(root, 'releases'), 'stack release');
  const releaseName = path.basename(releasePath);
  if (!supportedRelease.test(releaseName)) fail('managed Ponytail stack release incompatible', 'GAP-PONYTAIL-STACK-001');
  const stack = readJson(path.join(releasePath, 'stack.json'), 'managed stack metadata');
  const packageManifest = readJson(path.join(releasePath, 'package.json'), 'managed stack package');
  validateStackMetadata(stack, packageManifest, releaseName);
  const codexHome = contained(stack.codexHome, releasePath, 'managed Codex surface');
  const skillFile = contained(path.join(codexHome, 'skills', 'ponytail', 'SKILL.md'), releasePath, 'Ponytail skill');
  if (!fs.existsSync(skillFile)) fail('managed Ponytail skill unavailable', 'GAP-PONYTAIL-CAPABILITY-001');
  const skillSha256 = sha256(skillFile);
  validateSkillHash(repositoryTrust(options, releaseName), skillSha256);
  return { releaseName, releasePath, stack, gsdVersion: stack.gsdCore, ponytailVersion: stack.ponytail, skillSha256, skillPath: skillRelativePath };
}
function roleMode(role) { if (!roles.includes(role)) fail('Ponytail role invalid'); return roleModes[role]; }
function policyPhase(phase) { if (!phases.includes(phase)) fail('Ponytail policy phase invalid'); return phase; }
function mutationRequired(input, mode) { return mutationRoles.has(input.role) && mode === 'full'; }
function fragmentFor(role, mode) {
  if (mode === 'off') return '';
  if (role === 'implementation-planner') return plannerFragment;
  if (mode === 'review') return reviewFragment;
  return defaultFragment;
}
function degradedDecision(input, mode, error, cacheHit = false) {
  const core = { schema, work_id: input.work_id || null, source_revision: input.source_revision || null, role: input.role, phase: input.phase, mode,
    stack_release: null, gsd_version: null, ponytail_version: null, skill_path: skillRelativePath, skill_sha256: null,
    capability_epoch: input.capability_epoch, degraded: true, cache_hit: cacheHit, mutation_allowed: false,
    evidence_pointer: 'GAP-PONYTAIL-CAPABILITY-001', reason: error.message, policy_fragment: '', next_action: 'Restore the trusted managed Ponytail capability before code mutation.' };
  return Object.freeze({ ...core, decision_digest: decisionDigest(core) });
}
function nullable(value) { return value === undefined ? null : value; }
function firstDefined(object, keys) { for (const key of keys) if (object[key] !== undefined) return object[key]; return null; }
function cacheSourceStamp(options) {
  const root = stackRoot(options);
  const currentFile = path.resolve(options.current_file || path.join(root, 'current.txt'));
  try {
    const pointerStat = fs.statSync(currentFile);
    const pointer = fs.readFileSync(currentFile, 'utf8').trim();
    const releasePath = path.resolve(pointer);
    let skillStamp = 'missing';
    try {
      const skillStat = fs.statSync(path.join(releasePath, 'surface', '.codex', 'skills', 'ponytail', 'SKILL.md'));
      skillStamp = `${skillStat.mtimeMs}:${skillStat.size}`;
    } catch { /* trustedRelease owns the typed failure on a cache miss */ }
    return `${pointerStat.mtimeMs}:${pointerStat.size}:${pointer}:${skillStamp}`;
  } catch {
    return 'missing';
  }
}
function cacheKey(input, mode, options) {
  return stable({
    role: input.role, phase: input.phase, mode, work_id: nullable(input.work_id),
    source_revision: nullable(input.source_revision), capability_epoch: input.capability_epoch,
    host_capability_epoch: nullable(input.host_capability_epoch),
    profile: firstDefined(input, ['profile', 'profile_id']), lease: firstDefined(input, ['lease', 'lease_id']),
    stack_root: stackRoot(options), stack_source: cacheSourceStamp(options),
    expected_skill_sha256: firstDefined(options, ['expected_skill_sha256']) || firstDefined(options.trusted || {}, ['skill_sha256', 'skillSha256'])
  });
}
function normalizedInput(input) {
  if (!input || typeof input !== 'object') fail('Ponytail policy input required');
  const role = text(input.role, 'Ponytail role');
  const phase = text(input.phase, 'Ponytail policy phase');
  const mode = roleMode(role); policyPhase(phase);
  if (input.mutation === true && !mutationRoles.has(role)) fail('Ponytail mutation role invalid');
  const epoch = text(input.capability_epoch || 'host-default', 'Ponytail capability epoch');
  return { ...input, role, phase, mode, capability_epoch: epoch };
}
function trustedDecision(input, stack) {
  const core = { schema, work_id: nullable(input.work_id), source_revision: nullable(input.source_revision), role: input.role, phase: input.phase, mode: input.mode,
    stack_release: stack.releaseName, gsd_version: stack.gsdVersion, ponytail_version: stack.ponytailVersion, skill_path: stack.skillPath,
    skill_sha256: stack.skillSha256, capability_epoch: input.capability_epoch, degraded: false, cache_hit: false,
    mutation_allowed: mutationRequired(input, input.mode), evidence_pointer: `.planning/agent-flow/test-output/ponytail-policy/${stack.releaseName}/${stack.skillSha256}.json`,
    reason: 'trusted managed Ponytail stack verified', policy_fragment: fragmentFor(input.role, input.mode), next_action: input.mode === 'off' ? 'Continue independent assurance without Ponytail context.' : 'Attach the compact policy fragment only to the permitted code-oriented dispatch.' };
  return Object.freeze({ ...core, decision_digest: decisionDigest(core) });
}
function uncachedDecision(input, options) {
  try { return trustedDecision(input, trustedRelease(options)); }
  catch (error) {
    if (mutationRequired(input, input.mode)) throw error;
    return degradedDecision(input, input.mode, error);
  }
}
function resolve(input, options = {}) {
  const normalized = normalizedInput(input);
  const key = cacheKey(normalized, normalized.mode, options);
  const cached = cache.get(key);
  if (cached) return Object.freeze({ ...cached, cache_hit: true });
  const decision = uncachedDecision(normalized, options);
  cache.set(key, decision);
  return decision;
}
function validatePolicyIdentity(value) {
  if (!value || value.schema !== schema) fail('Ponytail policy decision invalid');
  for (const key of ['role', 'phase', 'mode', 'capability_epoch', 'evidence_pointer', 'decision_digest']) text(value[key], `Ponytail policy ${key}`);
  const expectedMode = roleMode(value.role); policyPhase(value.phase);
  if (!modes.includes(value.mode)) fail('Ponytail policy mode invalid');
  if (value.mode !== expectedMode) fail('Ponytail policy role/mode binding invalid');
}
function validatePolicyMutation(value) {
  const expectedMutation = mutationRoles.has(value.role) && value.mode === 'full';
  if (value.mutation_allowed !== expectedMutation) fail('Ponytail policy mutation binding invalid');
}
function validatePolicyTrustedStack(value) {
  if (value.degraded !== false || !supportedRelease.test(String(value.stack_release || ''))) fail('Ponytail policy trusted stack binding invalid');
  if (!versionPattern.test(String(value.gsd_version || '')) || !versionPattern.test(String(value.ponytail_version || '')) || !/^[a-f0-9]{64}$/.test(String(value.skill_sha256 || ''))) fail('Ponytail policy trusted skill binding invalid');
}
function validatePolicyTrust(value) {
  validatePolicyMutation(value);
  if (value.mode !== 'off') validatePolicyTrustedStack(value);
}
function validatePolicyExpected(value, expected) {
  validateExpectedWork(value, expected); validateExpectedSource(value, expected); validateExpectedPhase(value, expected);
}
function validateExpectedWork(value, expected) { if (expected.work_id !== undefined && value.work_id !== expected.work_id) fail('Ponytail policy work binding invalid'); }
function validateExpectedSource(value, expected) { if (expected.source_revision !== undefined && value.source_revision !== expected.source_revision) fail('Ponytail policy source binding invalid'); }
function validateExpectedPhase(value, expected) { if (expected.phase !== undefined && value.phase !== expected.phase) fail('Ponytail policy phase binding invalid'); }
function validatePolicyDigest(value) {
  const copy = { ...value }; delete copy.decision_digest; delete copy.cache_hit;
  if (digest(copy) !== value.decision_digest) fail('Ponytail policy digest invalid');
}
function validateDecision(value, expected = {}) {
  validatePolicyIdentity(value); validatePolicyTrust(value); validatePolicyExpected(value, expected); validatePolicyDigest(value); return value;
}
function compact(value) { validateDecision(value); const result = {}; for (const key of ['schema', 'role', 'phase', 'mode', 'stack_release', 'gsd_version', 'ponytail_version', 'skill_sha256', 'capability_epoch', 'degraded', 'cache_hit', 'mutation_allowed', 'evidence_pointer', 'decision_digest', 'next_action']) result[key] = value[key]; return result; }
function dispatchContext(value) { return { policy_decision: compact(value), policy_fragment: value.mode === 'off' ? '' : value.policy_fragment }; }
function resolveDispatch(input, options = {}) {
  return dispatchContext(resolve(input, options));
}
function invalidate(predicate) { if (!predicate) { cache.clear(); return; } for (const key of cache.keys()) if (predicate(key)) cache.delete(key); }
function cacheSize() { return cache.size; }
function decisionDigest(value) { const copy = { ...value }; delete copy.decision_digest; delete copy.cache_hit; return digest(copy); }

module.exports = { schema, modes, roles, phases, roleModes, mutationRoles, resolve, resolveDispatch, validateDecision, compact, dispatchContext, invalidate, cacheSize, trustedRelease, fragmentFor, decisionDigest };
