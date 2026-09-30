import { createHash } from 'node:crypto';

const assuranceSchema = 'RuntimeAssuranceContext/v1';
const deltaSchema = 'RuntimeStatusDelta/v1';
const digestPattern = /^[a-f0-9]{64}$/;

type JsonObject = Record<string, unknown>;

export interface RuntimeAssuranceContextInput extends JsonObject {}

export interface RuntimeAssuranceContext extends JsonObject {
  readonly schema: typeof assuranceSchema;
  readonly context_id: string;
  readonly work_id: string;
  readonly revision: number | null;
  readonly source_revision: string;
  readonly lifecycle_state: string;
  readonly next_action: string;
  readonly authority: 'derived_non_authoritative';
}

export interface RuntimeStatusDelta extends JsonObject {
  readonly schema: typeof deltaSchema;
  readonly status: 'changed' | 'unchanged';
  readonly work_id: string;
  readonly from_revision: number | null;
  readonly to_revision: number | null;
  readonly context_id: string;
  readonly changed: readonly { readonly field: string; readonly value: unknown }[];
  readonly next_action: string;
  readonly watermark: { readonly context_id: string; readonly revision: number | null };
}

function fail(message: string): never {
  const error = new Error(message) as Error & { code?: string };
  error.code = 'GATE_BLOCKED';
  throw error;
}

export function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    const object = value as JsonObject;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(object[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) as string;
}

function digest(value: unknown): string {
  return createHash('sha256').update(stable(value)).digest('hex');
}

function text(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) fail(`${name} missing`);
  return value.trim();
}

function optionalText(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null;
  return text(value, name);
}

function integerOrNull(value: unknown, name: string, minimum = 0): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || (value as number) < minimum) fail(`${name} invalid`);
  return value as number;
}

function digestOrNull(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || !digestPattern.test(value)) fail(`${name} invalid`);
  return value;
}

function objectOrEmpty(value: unknown): JsonObject {
  return value && typeof value === 'object' ? (value as JsonObject) : {};
}

function pick(input: JsonObject, key: string, defaultValue: unknown): unknown {
  return input[key] === undefined ? defaultValue : input[key];
}

function identity(input: JsonObject): JsonObject {
  const packet = objectOrEmpty(input.packet);
  const value: JsonObject = {
    work_id: text(input.work_id, 'assurance context work id'),
    revision: integerOrNull(input.revision, 'assurance context revision', 1),
    source_revision: text(input.source_revision, 'assurance context source revision'),
    lifecycle_state: text(input.lifecycle_state, 'assurance context lifecycle state'),
    sealed_revision: integerOrNull(
      pick(input, 'sealed_revision', packet.sealed_revision),
      'assurance context sealed revision',
      1,
    ),
    implementation_fingerprint: digestOrNull(
      pick(input, 'implementation_fingerprint', packet.implementation_fingerprint),
      'assurance context fingerprint',
    ),
    packet_id: optionalText(pick(input, 'packet_id', packet.packet_id), 'assurance context packet id'),
    packet_version: integerOrNull(
      pick(input, 'packet_version', packet.packet_version),
      'assurance context packet version',
      1,
    ),
    wave: integerOrNull(pick(input, 'wave', packet.wave), 'assurance context wave', 1),
    generation: integerOrNull(pick(input, 'generation', packet.generation), 'assurance context generation', 1),
    review_mode: optionalText(input.review_mode, 'assurance context review mode'),
    requested_reviewers: integerOrNull(input.requested_reviewers, 'assurance context reviewer count', 1),
    capability_epoch: optionalText(input.capability_epoch, 'assurance context capability epoch'),
    lease_expires_at: optionalText(input.lease_expires_at, 'assurance context lease expiry'),
    platform_knowledge_context_id: optionalText(input.platform_knowledge_context_id, 'assurance context knowledge id'),
    platform_knowledge_digest: digestOrNull(input.platform_knowledge_digest, 'assurance context knowledge digest'),
    documentation_skill_validation_status:
      input.documentation_skill_validation_status === undefined ? null : input.documentation_skill_validation_status,
  };
  if (
    Object.hasOwn(input, 'documentation_clear_id') ||
    Object.hasOwn(input, 'documentation_inventory_digest') ||
    Object.hasOwn(input, 'current_documentation_artifact')
  ) {
    value.documentation_clear_id = optionalText(
      input.documentation_clear_id,
      'assurance context documentation CLEAR id',
    );
    value.documentation_inventory_digest = digestOrNull(
      input.documentation_inventory_digest,
      'assurance context documentation inventory digest',
    );
    value.current_documentation_artifact =
      input.current_documentation_artifact === undefined ? null : input.current_documentation_artifact;
  }
  return value;
}

function validateDocumentationStatus(value: unknown): void {
  if (value !== undefined && value !== null && !['pass', 'warning', 'changes_required'].includes(value as string))
    fail('assurance context documentation validation status invalid');
}

export function buildRuntimeAssuranceContext(input: RuntimeAssuranceContextInput = {}): RuntimeAssuranceContext {
  if (!input || typeof input !== 'object') fail('assurance context input required');
  validateDocumentationStatus(input.documentation_skill_validation_status);
  const values = identity(input);
  const nextAction = text(input.next_action, 'assurance context next action');
  const value = {
    schema: assuranceSchema,
    context_id: digest(values),
    ...values,
    next_action: nextAction,
    authority: 'derived_non_authoritative' as const,
  };
  return Object.freeze(value) as RuntimeAssuranceContext;
}

export function validateRuntimeAssuranceContext(value: unknown): RuntimeAssuranceContext {
  if (!value || typeof value !== 'object' || (value as JsonObject).schema !== assuranceSchema)
    fail('assurance context schema invalid');
  const context = value as RuntimeAssuranceContext;
  validateDocumentationStatus(context.documentation_skill_validation_status);
  const expected = digest(identity(context));
  if (context.context_id !== expected || !digestPattern.test(context.context_id))
    fail('assurance context digest invalid');
  text(context.next_action, 'assurance context next action');
  if (context.authority !== 'derived_non_authoritative') fail('assurance context authority invalid');
  return context;
}

/** A bounded status projection; validation keeps its digest and authority tied to the full context. */
export function compactRuntimeAssuranceContext(value: unknown): JsonObject {
  const context = validateRuntimeAssuranceContext(value);
  return {
    schema: context.schema,
    context_id: context.context_id,
    work_id: context.work_id,
    revision: context.revision,
    source_revision: context.source_revision,
    lifecycle_state: context.lifecycle_state,
    sealed_revision: context.sealed_revision,
    implementation_fingerprint: context.implementation_fingerprint,
    packet_id: context.packet_id,
    packet_version: context.packet_version,
    wave: context.wave,
    generation: context.generation,
    review_mode: context.review_mode,
    requested_reviewers: context.requested_reviewers,
    capability_epoch: context.capability_epoch,
    lease_expires_at: context.lease_expires_at,
    documentation_clear_id: context.documentation_clear_id,
    documentation_inventory_digest: context.documentation_inventory_digest,
    current_documentation_artifact: context.current_documentation_artifact,
    next_action: context.next_action,
  };
}

const deltaFields = [
  'revision',
  'source_revision',
  'lifecycle_state',
  'sealed_revision',
  'implementation_fingerprint',
  'packet_id',
  'packet_version',
  'wave',
  'generation',
  'review_mode',
  'requested_reviewers',
  'capability_epoch',
  'lease_expires_at',
  'platform_knowledge_context_id',
  'platform_knowledge_digest',
  'documentation_skill_validation_status',
  'documentation_clear_id',
  'documentation_inventory_digest',
  'current_documentation_artifact',
  'next_action',
] as const;

export function statusDelta(previous: RuntimeAssuranceContext, current: RuntimeAssuranceContext): RuntimeStatusDelta {
  validateRuntimeAssuranceContext(previous);
  validateRuntimeAssuranceContext(current);
  if (previous.work_id !== current.work_id) fail('assurance status work id mismatch');
  const changed = deltaFields
    .filter((field) => previous[field] !== current[field])
    .map((field) => ({ field, value: current[field] }));
  return Object.freeze({
    schema: deltaSchema,
    status: changed.length ? 'changed' : 'unchanged',
    work_id: current.work_id,
    from_revision: previous.revision,
    to_revision: current.revision,
    context_id: current.context_id,
    changed,
    next_action: current.next_action,
    watermark: { context_id: current.context_id, revision: current.revision },
  });
}

function exactFields(value: unknown, fields: readonly string[]): value is JsonObject {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === fields.length &&
    fields.every((field) => Object.hasOwn(value, field))
  );
}

function validateDeltaIdentity(value: unknown): RuntimeStatusDelta {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    (value as JsonObject).schema !== deltaSchema ||
    !['changed', 'unchanged'].includes((value as JsonObject).status as string)
  )
    fail('assurance status delta invalid');
  const delta = value as RuntimeStatusDelta;
  const fields = [
    'schema',
    'status',
    'work_id',
    'from_revision',
    'to_revision',
    'context_id',
    'changed',
    'next_action',
    'watermark',
  ];
  if (!exactFields(delta, fields)) fail('assurance status delta fields invalid');
  text(delta.work_id, 'assurance status delta work id');
  if (delta.from_revision === undefined || delta.to_revision === undefined)
    fail('assurance status delta revisions invalid');
  integerOrNull(delta.from_revision, 'assurance status delta from revision', 1);
  integerOrNull(delta.to_revision, 'assurance status delta to revision', 1);
  if (digestOrNull(delta.context_id, 'assurance status delta context id') === null)
    fail('assurance status delta context id invalid');
  return delta;
}

function validateDeltaChanges(delta: RuntimeStatusDelta): void {
  if (!Array.isArray(delta.changed)) fail('assurance status delta changes invalid');
  for (const change of delta.changed) {
    if (!exactFields(change, ['field', 'value'])) fail('assurance status delta change invalid');
    text(change.field, 'assurance status delta change field');
  }
}

function validateDeltaWatermark(delta: RuntimeStatusDelta): void {
  const watermark = delta.watermark;
  if (!exactFields(watermark, ['context_id', 'revision'])) fail('assurance status delta watermark invalid');
  if (watermark.context_id !== delta.context_id || watermark.revision !== delta.to_revision)
    fail('assurance status delta watermark mismatch');
}

export function validateStatusDelta(value: unknown): RuntimeStatusDelta {
  const delta = validateDeltaIdentity(value);
  validateDeltaChanges(delta);
  if (delta.status === 'unchanged' && delta.changed.length) fail('assurance status unchanged delta has changes');
  text(delta.next_action, 'assurance status delta next action');
  validateDeltaWatermark(delta);
  return delta;
}
