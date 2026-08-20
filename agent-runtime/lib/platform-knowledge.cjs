/* Immutable platform-documentation and skill evidence for one implementation cycle. */
'use strict';

const crypto = require('crypto');

const CHANGE_KINDS = ['documentation', 'feature', 'defect', 'refactor', 'incident', 'migration', 'destructive'];
const SKILL_STATUSES = ['applied', 'reviewed_not_applied', 'not_applicable'];
const VALIDATION_STATUSES = ['pass', 'warning', 'changes_required'];

function fail(message, code = 'GATE_BLOCKED') {
  /** @type {Error & {code?: string}} */
  const error = new Error(message);
  error.code = code;
  throw error;
}
function text(value, name) { if (typeof value !== 'string' || !value.trim()) fail(`${name} missing`); return value; }
function pointer(value, name = 'knowledge pointer') { text(value, name); if (value.length > 512 || /[\r\n]|(?:password|secret|token|apikey|authorization|bearer)/i.test(value)) fail(`${name} unsafe`); return value; }
function array(value, name, required = false) { if (!Array.isArray(value) || (required && !value.length)) fail(`${name} invalid`); return value; }
function digestable(value) { if (Array.isArray(value)) return `[${value.map(digestable).join(',')}]`; if (value && typeof value === 'object') return `{${Object.keys(value).filter(key => key !== 'digest').sort().map(key => `${JSON.stringify(key)}:${digestable(value[key])}`).join(',')}}`; return JSON.stringify(value); }
function digest(value) { return crypto.createHash('sha256').update(digestable(value)).digest('hex'); }
function cacheKey(value) {
  if (!value || typeof value !== 'object') fail('knowledge cache key invalid');
  const official = (value.official_sources || []).map(item => ({ url: item.url, source_hash: item.source_hash || null, lastmod: item.lastmod || null })).sort((a, b) => `${a.url}`.localeCompare(`${b.url}`));
  const local = (value.local_sources || []).map(item => ({ path: item.path, source_hash: item.source_hash || null })).sort((a, b) => `${a.path}`.localeCompare(`${b.path}`));
  const skills = (value.skills || []).map(item => ({ skill_id: item.skill_id, path: item.path, skill_sha256: item.skill_sha256 || null })).sort((a, b) => `${a.skill_id}`.localeCompare(`${b.skill_id}`));
  return digest({ cache_key: value.cache_key || null, source_revision: value.source_revision, scope_id: value.scope_id, scope_digest: value.scope_digest || null, affected_paths: value.affected_paths || [], official, local, skills, capability_epoch: value.capability_epoch || 'host:unknown' });
}
function sha(value, name) { if (!/^[a-f0-9]{64}$/.test(value || '')) fail(`${name} invalid`); return value; }
function source(x) {
  if (!x || typeof x !== 'object') fail('official knowledge source invalid');
  text(x.url, 'official source URL'); text(x.title, 'official source title'); text(x.platform_version, 'official platform version');
  if (!x.last_verified && !x.lastmod) fail('official source verification date missing');
  sha(x.source_hash, 'official source hash'); text(x.applicability, 'official source applicability'); if (x.pointer !== undefined) pointer(x.pointer, 'official source pointer');
  return x;
}
function localSource(x) { if (!x || typeof x !== 'object') fail('local knowledge source invalid'); text(x.path, 'local knowledge path'); sha(x.source_hash, 'local knowledge hash'); text(x.applicability, 'local knowledge applicability'); if (x.pointer !== undefined) pointer(x.pointer, 'local knowledge pointer'); return x; }
function skill(x) { if (!x || typeof x !== 'object') fail('knowledge skill invalid'); text(x.skill_id, 'skill id'); text(x.path, 'skill path'); sha(x.skill_sha256, 'skill hash'); text(x.role, 'skill role'); text(x.phase, 'skill phase'); if (!SKILL_STATUSES.includes(x.status)) fail('skill status invalid'); pointer(x.evidence_pointer, 'skill evidence pointer'); return x; }
function validateContextIdentity(c) { if (!c || typeof c !== 'object' || c.schema !== 'PlatformKnowledgeContext/v1') fail('platform knowledge context invalid'); ['context_id', 'work_id', 'cycle_id', 'source_revision', 'scope_id'].forEach(key => text(c[key], `knowledge ${key}`)); if (!CHANGE_KINDS.includes(c.change_kind)) fail('knowledge change kind invalid'); }
function validateContextSources(c) { array(c.official_sources, 'official knowledge sources').forEach(source); array(c.local_sources, 'local knowledge sources').forEach(localSource); array(c.skills, 'knowledge skills').forEach(skill); }
function validateContextState(c) { if (!c.cache || typeof c.cache !== 'object' || typeof c.cache.hit !== 'boolean') fail('knowledge cache invalid'); text(c.cache.capability_epoch, 'knowledge capability epoch'); sha(c.cache.snapshot_digest, 'knowledge snapshot digest'); array(c.warnings, 'knowledge warnings'); array(c.conflicts, 'knowledge conflicts'); text(c.created_at, 'knowledge created_at'); if (!Number.isFinite(Date.parse(c.created_at))) fail('knowledge created_at invalid'); text(c.next_action, 'knowledge next action'); }
function validateContextBinding(c, options) { if (c.digest !== digest(c)) fail('platform knowledge context digest invalid'); if (options.work_id && c.work_id !== options.work_id) fail('platform knowledge context work binding invalid'); if (options.source_revision && c.source_revision !== options.source_revision) fail('platform knowledge context source binding invalid'); if (options.scope_id && c.scope_id !== options.scope_id) fail('platform knowledge context scope binding invalid'); }
function validateContext(value, options = {}) {
  const c = value; validateContextIdentity(c); const trace = c.br_sr_ac; if (!trace || typeof trace !== 'object') fail('knowledge BR/SR/AC trace invalid'); ['br', 'sr', 'ac'].forEach(key => array(trace[key], `knowledge ${key}`)); validateContextSources(c); validateContextState(c); validateContextBinding(c, options); return c;
}
function withDigest(context) { const next = { ...context }; delete next.digest; next.digest = digest(next); return next; }
function createKnowledgeCache(options = {}) {
  const maxEntries = options.maxEntries ?? 64;
  if (!Number.isInteger(maxEntries) || maxEntries < 1 || maxEntries > 4096) fail('knowledge cache max entries invalid');
  const values = new Map();
  const normalize = key => typeof key === 'string' ? `raw:${key}` : cacheKey(key);
  return {
    key: cacheKey,
    get(key) { const entry = values.get(normalize(key)); return entry ? entry : null; },
    set(key, context) {
      validateContext(context);
      const value = JSON.parse(JSON.stringify(context));
      const normalized = normalize(key);
      values.delete(normalized);
      values.set(normalized, Object.freeze(value));
      while (values.size > maxEntries) values.delete(values.keys().next().value);
      return value;
    },
    invalidate(key) { if (key === undefined) values.clear(); else values.delete(normalize(key)); },
    size() { return values.size; }
  };
}
function contextMatchesCheckpoint(context, checkpoint) {
  validateContext(context, { work_id: checkpoint.work_id, source_revision: checkpoint.source_revision });
  const scope = checkpoint.scope_contract?.scope_id || checkpoint.scope_id;
  if (scope && context.scope_id !== scope) fail('platform knowledge context scope binding invalid');
  if (checkpoint.platform_knowledge_cycle_id && context.cycle_id !== checkpoint.platform_knowledge_cycle_id) fail('platform knowledge context cycle binding invalid');
  return true;
}
function validateOfficialSources(context) {
  const unavailable = context.official_sources.length === 0;
  if (unavailable && !context.warnings.some(x => /source unavailable/i.test(x))) fail('official knowledge source absence must be a warning');
  return !unavailable;
}
function validateSkillHashes(context, expected = {}) {
  for (const item of context.skills) if (expected[item.skill_id] && expected[item.skill_id] !== item.skill_sha256) fail(`skill hash mismatch: ${item.skill_id}`);
  return true;
}
function validateDocumentationValidationCore(v, context, checkpoint) { if (!v || typeof v !== 'object' || v.schema !== 'DocumentationSkillValidation/v1') fail('documentation skill validation invalid'); ['validation_id', 'work_id', 'cycle_id', 'context_id', 'source_revision', 'validated_by', 'validated_at', 'next_action'].forEach(key => text(v[key], `documentation validation ${key}`)); if (!VALIDATION_STATUSES.includes(v.status)) fail('documentation validation status invalid'); if (v.work_id !== checkpoint.work_id || v.source_revision !== checkpoint.source_revision || v.cycle_id !== context.cycle_id || v.context_id !== context.context_id) fail('documentation validation binding invalid'); }
function validateDocumentationArrays(v) { array(v.official_matches, 'documentation official matches'); array(v.skill_matches, 'documentation skill matches'); array(v.findings, 'documentation findings'); array(v.evidence_pointers, 'documentation evidence pointers', true).forEach(x => pointer(x, 'documentation evidence pointer')); }
function validateDocumentationItems(v) { v.skill_matches.forEach(item => { text(item.skill_id, 'skill match id'); sha(item.skill_sha256, 'skill match hash'); pointer(item.evidence_pointer, 'skill match evidence'); }); v.official_matches.forEach(item => { text(item.source_url, 'official match URL'); pointer(item.evidence_pointer, 'official match evidence'); }); v.findings.forEach(item => { text(item.id, 'documentation finding id'); text(item.summary, 'documentation finding summary'); pointer(item.evidence_pointer, 'documentation finding evidence'); }); }
function validateDocumentationSkillValidation(value, context, checkpoint) { const v = value; validateDocumentationValidationCore(v, context, checkpoint); validateDocumentationArrays(v); text(v.validated_at, 'documentation validated_at'); if (!Number.isFinite(Date.parse(v.validated_at))) fail('documentation validated_at invalid'); validateDocumentationItems(v); return v; }
function compact(context, validation) {
  return { context_id: context.context_id, cycle_id: context.cycle_id, digest: context.digest, source_revision: context.source_revision, skill_ids: context.skills.map(x => `${x.skill_id}@${x.skill_sha256}`), official_sources: context.official_sources.map(x => x.url), documentation_skill_validation: validation?.status || null, warnings: context.warnings, next_action: validation?.next_action || context.next_action };
}

module.exports = { CHANGE_KINDS, SKILL_STATUSES, VALIDATION_STATUSES, digest, cacheKey, createKnowledgeCache, withDigest, validateContext, contextMatchesCheckpoint, validateOfficialSources, validateSkillHashes, validateDocumentationSkillValidation, compact, pointer };
