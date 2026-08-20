'use strict';

const crypto = require('crypto');

const schema = 'RuntimeAssuranceContext/v1';
const deltaSchema = 'RuntimeStatusDelta/v1';
const digestPattern = /^[a-f0-9]{64}$/;

function fail(message) {
  /** @type {Error & { code?: string }} */
  const error = new Error(message);
  error.code = 'GATE_BLOCKED';
  throw error;
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function digest(value) {
  return crypto.createHash('sha256').update(stable(value)).digest('hex');
}

function text(value, name) {
  if (typeof value !== 'string' || !value.trim()) fail(`${name} missing`);
  return value.trim();
}

function optionalText(value, name) {
  if (value === null || value === undefined) return null;
  return text(value, name);
}

function integerOrNull(value, name, minimum = 0) {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || value < minimum) fail(`${name} invalid`);
  return value;
}

function digestOrNull(value, name) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || !digestPattern.test(value)) fail(`${name} invalid`);
  return value;
}

function objectOrEmpty(value) {
  return value && typeof value === 'object' ? value : {};
}

function pick(input, key, fallback) {
  return input[key] === undefined ? fallback : input[key];
}

function identity(input) {
  const packet = objectOrEmpty(input.packet);
  return {
    work_id: text(input.work_id, 'assurance context work id'),
    revision: integerOrNull(input.revision, 'assurance context revision', 1),
    source_revision: text(input.source_revision, 'assurance context source revision'),
    lifecycle_state: text(input.lifecycle_state, 'assurance context lifecycle state'),
    sealed_revision: integerOrNull(pick(input, 'sealed_revision', packet.sealed_revision), 'assurance context sealed revision', 1),
    implementation_fingerprint: digestOrNull(pick(input, 'implementation_fingerprint', packet.implementation_fingerprint), 'assurance context fingerprint'),
    packet_id: optionalText(pick(input, 'packet_id', packet.packet_id), 'assurance context packet id'),
    packet_version: integerOrNull(pick(input, 'packet_version', packet.packet_version), 'assurance context packet version', 1),
    wave: integerOrNull(pick(input, 'wave', packet.wave), 'assurance context wave', 1),
    generation: integerOrNull(pick(input, 'generation', packet.generation), 'assurance context generation', 1),
    review_mode: optionalText(input.review_mode, 'assurance context review mode'),
    requested_reviewers: integerOrNull(input.requested_reviewers, 'assurance context reviewer count', 1),
    capability_epoch: optionalText(input.capability_epoch, 'assurance context capability epoch'),
    lease_expires_at: optionalText(input.lease_expires_at, 'assurance context lease expiry'),
    platform_knowledge_context_id: optionalText(input.platform_knowledge_context_id, 'assurance context knowledge id'),
    platform_knowledge_digest: digestOrNull(input.platform_knowledge_digest, 'assurance context knowledge digest'),
    documentation_skill_validation_status: input.documentation_skill_validation_status === undefined ? null : input.documentation_skill_validation_status
  };
}

function build(input = {}) {
  if (!input || typeof input !== 'object') fail('assurance context input required');
  if (input.documentation_skill_validation_status !== undefined && input.documentation_skill_validation_status !== null && !['pass', 'warning', 'changes_required'].includes(input.documentation_skill_validation_status)) fail('assurance context documentation validation status invalid');
  const values = identity(input);
  const nextAction = text(input.next_action, 'assurance context next action');
  const value = {
    schema,
    context_id: digest(values),
    ...values,
    next_action: nextAction,
    authority: 'derived_non_authoritative'
  };
  return Object.freeze(value);
}

function validate(value) {
  if (!value || value.schema !== schema) fail('assurance context schema invalid');
  const expected = digest(identity(value));
  if (value.context_id !== expected || !digestPattern.test(value.context_id)) fail('assurance context digest invalid');
  text(value.next_action, 'assurance context next action');
  if (value.authority !== 'derived_non_authoritative') fail('assurance context authority invalid');
  if (value.documentation_skill_validation_status !== undefined && value.documentation_skill_validation_status !== null && !['pass', 'warning', 'changes_required'].includes(value.documentation_skill_validation_status)) fail('assurance context documentation validation status invalid');
  return value;
}

function compact(value) {
  validate(value);
  return {
    schema: value.schema,
    context_id: value.context_id,
    work_id: value.work_id,
    revision: value.revision,
    source_revision: value.source_revision,
    lifecycle_state: value.lifecycle_state,
    sealed_revision: value.sealed_revision,
    implementation_fingerprint: value.implementation_fingerprint,
    packet_id: value.packet_id,
    packet_version: value.packet_version,
    wave: value.wave,
    generation: value.generation,
    review_mode: value.review_mode,
    requested_reviewers: value.requested_reviewers,
    capability_epoch: value.capability_epoch,
    lease_expires_at: value.lease_expires_at,
    next_action: value.next_action
  };
}

const deltaFields = Object.freeze([
  'revision', 'source_revision', 'lifecycle_state', 'sealed_revision',
  'implementation_fingerprint', 'packet_id', 'packet_version', 'wave',
  'generation', 'review_mode', 'requested_reviewers', 'capability_epoch',
  'lease_expires_at', 'platform_knowledge_context_id', 'platform_knowledge_digest',
  'documentation_skill_validation_status', 'next_action'
]);

function statusDelta(previous, current) {
  validate(previous);
  validate(current);
  if (previous.work_id !== current.work_id) fail('assurance status work id mismatch');
  const changed = deltaFields.filter(field => previous[field] !== current[field]).map(field => ({ field, value: current[field] }));
  return Object.freeze({
    schema: deltaSchema,
    status: changed.length ? 'changed' : 'unchanged',
    work_id: current.work_id,
    from_revision: previous.revision,
    to_revision: current.revision,
    context_id: current.context_id,
    changed,
    next_action: current.next_action,
    watermark: { context_id: current.context_id, revision: current.revision }
  });
}

function validateDelta(value) {
  if (!value || value.schema !== deltaSchema || !['changed', 'unchanged'].includes(value.status)) fail('assurance status delta invalid');
  text(value.work_id, 'assurance status delta work id');
  integerOrNull(value.from_revision, 'assurance status delta from revision', 1);
  integerOrNull(value.to_revision, 'assurance status delta to revision', 1);
  digestOrNull(value.context_id, 'assurance status delta context id');
  if (!Array.isArray(value.changed)) fail('assurance status delta changes invalid');
  if (value.status === 'unchanged' && value.changed.length) fail('assurance status unchanged delta has changes');
  text(value.next_action, 'assurance status delta next action');
  return value;
}

module.exports = { schema, deltaSchema, build, validate, compact, statusDelta, validateDelta, digest, stable };
