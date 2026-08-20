/* Read-only resolver for official Academy and repository skill evidence. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const knowledge = require('./platform-knowledge.cjs');

function sha256File(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function contained(root, relative) { const file = path.resolve(root, relative); const base = path.resolve(root); if (!(file === base || file.startsWith(`${base}${path.sep}`))) throw new Error('knowledge source escapes repository'); return file; }
function readHash(root, relative) { const file = contained(root, relative); if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`knowledge source unavailable: ${relative}`); return sha256File(file); }
function sourceRecord(input) { return { url: input.url, title: input.title, platform_version: input.platform_version || 'unknown', last_verified: input.last_verified || new Date().toISOString(), ...(input.lastmod ? { lastmod: input.lastmod } : {}), source_hash: input.source_hash, applicability: input.applicability, ...(input.pointer ? { pointer: input.pointer } : {}) }; }
function skillRecord(root, input) { return { skill_id: input.skill_id, path: input.path, skill_sha256: readHash(root, input.path), role: input.role, phase: input.phase, status: input.status || 'applied', evidence_pointer: input.evidence_pointer || input.path }; }
function cacheLookup(input, officialInput, localInput, skillsInput) {
  const suppliedHashes = officialInput.every(item => item.source_hash) && localInput.every(item => item.source_hash) && skillsInput.every(item => item.skill_sha256);
  return input.cache_key || (suppliedHashes ? knowledge.cacheKey({ ...input, official_sources: officialInput, local_sources: localInput, skills: skillsInput }) : null);
}
function cachedContext(input, key) {
  if (!input.cache || !key || typeof input.cache.get !== 'function') return null;
  const cached = input.cache.get(key);
  if (!cached) return null;
  const hit = JSON.parse(JSON.stringify(cached));
  hit.cache = { ...hit.cache, hit: true };
  const result = knowledge.withDigest(hit);
  knowledge.validateContext(result, { work_id: input.work_id, source_revision: input.source_revision });
  return result;
}
function resolveSources(root, input, officialInput, localInput, skillsInput) {
  return {
    official: officialInput.map(sourceRecord),
    local: localInput.map(item => ({ path: item.path, source_hash: item.source_hash || readHash(root, item.path), applicability: item.applicability, pointer: item.pointer || item.path })),
    skills: skillsInput.map(item => item.skill_sha256 ? { ...item, evidence_pointer: item.evidence_pointer || item.path, status: item.status || 'applied' } : skillRecord(root, item))
  };
}
function resolveInputs(input) { return { officialInput: input.official_sources || [], localInput: input.local_sources || [], skillsInput: input.skills || [] }; }
function buildContext(input, official, local, skills) {
  const warnings = [...(input.warnings || [])];
  if (!official.length) warnings.push('official source unavailable; context is degraded');
  const snapshot = { official, local, skills, capability_epoch: input.capability_epoch || 'host:unknown' };
  return knowledge.withDigest({ schema: 'PlatformKnowledgeContext/v1', context_id: input.context_id, work_id: input.work_id, cycle_id: input.cycle_id, source_revision: input.source_revision, scope_id: input.scope_id, change_kind: input.change_kind, br_sr_ac: input.br_sr_ac || { br: [], sr: [], ac: [] }, official_sources: official, local_sources: local, skills, cache: { capability_epoch: snapshot.capability_epoch, hit: input.cache_hit === true, snapshot_digest: knowledge.digest(snapshot) }, warnings, conflicts: input.conflicts || [], created_at: input.created_at || new Date().toISOString(), next_action: 'Apply the recorded platform documentation and skills before mutation.' });
}
function resolve(root, input) {
  const { officialInput, localInput, skillsInput } = resolveInputs(input);
  const key = cacheLookup(input, officialInput, localInput, skillsInput);
  const cached = cachedContext(input, key);
  if (cached) return cached;
  const { official, local, skills } = resolveSources(root, input, officialInput, localInput, skillsInput);
  const context = buildContext(input, official, local, skills);
  knowledge.validateContext(context, { work_id: input.work_id, source_revision: input.source_revision });
  if (input.cache && typeof input.cache.set === 'function') input.cache.set(knowledge.cacheKey({ ...input, official_sources: official, local_sources: local, skills }), context);
  return context;
}
module.exports = { sha256File, resolve, readHash };
