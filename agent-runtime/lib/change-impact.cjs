/* Typed change-impact assessment for pre/post regression scope selection. */
'use strict';

const crypto = require('crypto');

const schema = 'ChangeImpactAssessment/v1';
const phases = Object.freeze(['pre', 'post']);
const profiles = Object.freeze(['focused', 'expanded', 'full']);
const statuses = Object.freeze(['pass', 'warning', 'full_profile_required', 'blocked']);
const riskFlags = Object.freeze([
  'public_contract', 'shared_boundary', 'security', 'data_loss',
  'migration', 'destructive', 'dirty_overlap', 'unknown_dependency'
]);
const digestPattern = /^[a-f0-9]{64}$/;

function fail(message, code = 'GAP-CHANGE-IMPACT-001') {
  /** @type {Error & {code?: string}} */
  const error = new Error(message);
  error.code = code;
  throw error;
}

function text(value, name) {
  if (typeof value !== 'string' || !value.trim()) fail(`${name} missing`);
  return value;
}

function uniqueStrings(value, name, required = false) {
  if (!Array.isArray(value) || (required && value.length === 0) || !value.every(item => typeof item === 'string' && item.trim())) fail(`${name} invalid`);
  if (new Set(value).size !== value.length) fail(`${name} duplicate`);
  return value;
}

function digest(value) {
  return crypto.createHash('sha256').update(stable(value)).digest('hex');
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function timestamp(value, name) {
  text(value, name);
  if (!Number.isFinite(Date.parse(value)) || Date.parse(value) > Date.now() + 300000) fail(`${name} invalid`);
}

function fingerprint(value, name) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || !digestPattern.test(value)) fail(`${name} invalid`);
  return value;
}

function optionalDigest(value, name) {
  if (value === null || value === undefined) return null;
  return fingerprint(value, name);
}

function riskFlagList(value) {
  uniqueStrings(value, 'impact risk flags');
  if (value.some(flag => !riskFlags.includes(flag))) fail('impact risk flag invalid');
}

function cacheShape(value) {
  if (!value || typeof value !== 'object') fail('impact cache invalid');
  text(value.cache_key, 'impact cache key');
  text(value.capability_epoch, 'impact cache capability epoch');
  if (typeof value.hit !== 'boolean') fail('impact cache hit invalid');
  return value;
}

function digestInput(value) {
  const rest = { ...value };
  delete rest.digest;
  return rest;
}

function expectedProfile(value) {
  const highRisk = value.risk_flags.some(flag => [
    'public_contract', 'shared_boundary', 'security', 'data_loss',
    'migration', 'destructive', 'dirty_overlap', 'unknown_dependency'
  ].includes(flag));
  if (highRisk || value.unknown_edges.length || value.unverified_edges.length || value.unexpected_paths.length) return 'full';
  if (value.transitive_impacts.length || value.contract_impacts.length || value.behavioral_impacts.length) return 'expanded';
  return 'focused';
}

function expectedStatus(value) {
  if (value.phase === 'pre' && value.unknown_edges.length) return 'full_profile_required';
  if (value.phase === 'post' && (value.unverified_edges.length || value.unexpected_paths.length)) return 'full_profile_required';
  return value.status;
}

function validateIdentity(value, context) {
  if (!value || value.schema !== schema) fail('change impact assessment schema invalid');
  text(value.assessment_id, 'impact assessment id');
  text(value.work_id, 'impact assessment work id');
  text(value.cycle_id, 'impact assessment cycle id');
  text(value.source_revision, 'impact assessment source revision');
  if (!phases.includes(value.phase)) fail('impact assessment phase invalid');
  if (context.work_id && value.work_id !== context.work_id) fail('impact assessment work binding invalid');
  if (context.source_revision && value.source_revision !== context.source_revision) fail('impact assessment source binding invalid');
  if (context.scope_id && value.scope_id !== context.scope_id) fail('impact assessment scope binding invalid');
  text(value.scope_id, 'impact assessment scope id');
  optionalDigest(value.snapshot_id, 'impact assessment snapshot id');
  fingerprint(value.implementation_fingerprint, 'impact assessment fingerprint');
}

function validateCollections(value) {
  uniqueStrings(value.predicted_paths, 'impact predicted paths', true);
  uniqueStrings(value.direct_impacts, 'impact direct impacts');
  uniqueStrings(value.transitive_impacts, 'impact transitive impacts');
  uniqueStrings(value.contract_impacts, 'impact contract impacts');
  uniqueStrings(value.behavioral_impacts, 'impact behavioral impacts');
  uniqueStrings(value.security_impacts, 'impact security impacts');
  uniqueStrings(value.verified_paths, 'impact verified paths');
  uniqueStrings(value.unverified_edges, 'impact unverified edges');
  uniqueStrings(value.unknown_edges, 'impact unknown edges');
  uniqueStrings(value.unexpected_paths, 'impact unexpected paths');
  riskFlagList(value.risk_flags);
}

function validatePhaseShape(value) {
  if (value.phase === 'pre' && value.implementation_fingerprint !== null) fail('pre impact assessment fingerprint must be null');
  if (value.phase === 'post' && !value.implementation_fingerprint) fail('post impact assessment fingerprint required');
  if (value.phase === 'post' && !value.verified_paths.length) fail('post impact verified paths required');
}

function validateProfileState(value) {
  if (!profiles.includes(value.predicted_test_profile)) fail('impact predicted test profile invalid');
  if (!statuses.includes(value.status)) fail('impact status invalid');
  if (value.predicted_test_profile !== expectedProfile(value)) fail('impact test profile is too narrow');
  if (expectedStatus(value) === 'full_profile_required' && value.status === 'pass') fail('impact full profile requirement hidden');
}

function validatePassState(value) {
  if (value.status === 'pass' && (value.unverified_edges.length || value.unknown_edges.length || value.unexpected_paths.length)) fail('passing impact assessment has unverified edges');
}

function validateEvidence(value) {
  if (value.cache !== null && value.cache !== undefined) cacheShape(value.cache);
  uniqueStrings(value.evidence_pointers, 'impact evidence pointers', true);
  value.evidence_pointers.forEach(pointer => {
    if (typeof pointer !== 'string' || pointer.length > 512 || /[\r\n]|(?:password|secret|token|apikey|authorization|bearer)/i.test(pointer)) fail('impact evidence pointer unsafe');
  });
  text(value.assessed_by, 'impact assessor');
  timestamp(value.created_at, 'impact timestamp');
}

function validate(value, context = {}) {
  validateIdentity(value, context);
  validateCollections(value);
  validatePhaseShape(value);
  validateProfileState(value);
  validatePassState(value);
  validateEvidence(value);
  if (!digestPattern.test(value.digest) || value.digest !== digest(digestInput(value))) fail('impact assessment digest invalid');
  return value;
}

function pre(value, context = {}) {
  validate(value, context);
  if (value.phase !== 'pre') fail('pre impact assessment required');
  if (value.status === 'blocked') fail('pre impact assessment blocked');
  return value;
}

function post(value, context = {}) {
  validate(value, context);
  if (value.phase !== 'post') fail('post impact assessment required');
  if (['blocked', 'full_profile_required'].includes(value.status) || value.unverified_edges.length || value.unknown_edges.length || value.unexpected_paths.length) fail('full impact profile required before seal');
  return value;
}

function matchesSnapshot(value, snapshot) {
  if (!value || !snapshot) fail('change impact snapshot binding missing');
  if (value.implementation_fingerprint !== snapshot.implementation_fingerprint) fail('change impact snapshot fingerprint mismatch', 'GAP-CHANGE-IMPACT-002');
  if (value.snapshot_id && value.snapshot_id !== snapshot.snapshot_id) fail('change impact snapshot identity mismatch', 'GAP-CHANGE-IMPACT-002');
  return true;
}

function compact(value) {
  validate(value);
  return {
    schema,
    assessment_id: value.assessment_id,
    cycle_id: value.cycle_id,
    phase: value.phase,
    status: value.status,
    predicted_test_profile: value.predicted_test_profile,
    direct_count: value.direct_impacts.length,
    transitive_count: value.transitive_impacts.length,
    contract_count: value.contract_impacts.length,
    behavioral_count: value.behavioral_impacts.length,
    security_count: value.security_impacts.length,
    unknown_count: value.unknown_edges.length,
    unverified_count: value.unverified_edges.length,
    unexpected_count: value.unexpected_paths.length,
    digest: value.digest
  };
}

module.exports = { schema, phases, profiles, statuses, riskFlags, stable, digest, validate, pre, post, matchesSnapshot, compact, expectedProfile };
