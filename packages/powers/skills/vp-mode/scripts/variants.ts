import { createHash } from 'node:crypto';
import { parseApplicability } from './applicability.ts';

export type VariantSource = { donor: string; path: string; rowKey: string; rawSha256: string };
export type VariantRecord = {
  variant_id: string;
  title: string;
  summary: string;
  capability_tags: string[];
  pattern_tags: string[];
  conditions_applies_when: string;
  conditions_does_not_apply_when: string;
  artifact_contract_output_type: string;
  artifact_contract_required_data: string[];
  artifact_contract_verified_by: string;
  compatibility_excludes: string[];
  compatibility_requires: string[];
  roles?: string[];
  products?: string[];
  provenance: string[];
  status: 'active' | 'disabled';
  revision: number;
  classification_status: 'classified' | 'unclassified';
  instruction_form?: 'principle' | 'decision-rule' | 'procedure' | 'checklist';
  domains?: string[];
  classification_reason?: string;
  approach_assessments?: string[];
  approach_body_sha256?: string;
  source: VariantSource;
  sourceLabel: string;
  applicability: unknown;
  contentSha256: string;
};

export class VariantError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(code: string, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'VariantError';
    this.code = code;
    this.details = details;
  }
}

const variantKeys = new Set([
  'variant_id', 'title', 'summary', 'capability_tags', 'pattern_tags', 'conditions_applies_when',
  'conditions_does_not_apply_when', 'artifact_contract_output_type', 'artifact_contract_required_data',
  'artifact_contract_verified_by', 'compatibility_excludes', 'compatibility_requires', 'roles', 'products',
  'provenance', 'status', 'revision', 'classification_status', 'instruction_form', 'domains',
  'classification_reason', 'approach_assessments', 'approach_body_sha256', 'source', 'sourceLabel',
  'applicability', 'contentSha256',
]);
const kebab = /^[a-z0-9]+(-[a-z0-9]+)*$/u;
const tag = /^[a-z0-9]+(-[a-z0-9]+)+$/u;
const roleOrProduct = /^[a-z0-9]+(-[a-z0-9]+)*$/u;
const provenanceEntry = /^donor=[^;]+; license=[^;]+; revision=[0-9a-f]{40}; path=[^;]+(?:; sha256=[0-9a-f]{64})?(?:; locator=[^;]+)?$/u;
const lowerHash = /^[0-9a-f]{64}$/u;
const forbiddenPayload = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u;

function fail(code: string, message: string, details: Record<string, unknown> = {}): never {
  throw new VariantError(code, message, details);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') fail('INVALID_FIELD', `${field} must be a non-empty string`, { field });
  return value;
}

function stringArray(value: unknown, field: string, nonEmptyItems: boolean): string[] {
  if (!Array.isArray(value)) fail('INVALID_FIELD', `${field} must be an array`, { field });
  if (!value.every((item) => typeof item === 'string' && (!nonEmptyItems || item.trim() !== ''))) {
    fail('INVALID_FIELD', `${field} must contain ${nonEmptyItems ? 'non-empty ' : ''}strings`, { field });
  }
  return value as string[];
}

function scanStringValues(value: unknown, code: 'INVALID_PAYLOAD' | 'INVALID_FIELD', path = '$', visited = new Set<object>()): void {
  if (typeof value === 'string') {
    if (forbiddenPayload.test(value)) fail(code, `${path} contains a forbidden control or separator character`, { field: path });
    return;
  }
  if (typeof value !== 'object' || value === null || visited.has(value)) return;
  visited.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanStringValues(item, code, `${path}[${index}]`, visited));
  } else {
    for (const [key, child] of Object.entries(value)) scanStringValues(child, code, `${path}.${key}`, visited);
  }
}

export function validateVariantFamily(value: unknown, familyId?: string): VariantRecord[] {
  if (!Array.isArray(value)) fail('INVALID_FAMILY', 'variant family must be an array');
  if (value.length < 2) fail('INVALID_FAMILY', 'variant family must contain at least two variants');
  scanStringValues(value, 'INVALID_FIELD');
  const ids = new Set<string>();
  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) fail('INVALID_VARIANT', `variant ${index} must be an object`, { index });
    for (const key of Object.keys(item)) if (!variantKeys.has(key)) fail('UNKNOWN_KEY', `unknown variant key: ${key}`, { index, key });
    const id = nonEmpty(item.variant_id, `variants[${index}].variant_id`);
    if (!kebab.test(id)) fail('INVALID_ID', `variant ID is not kebab-case: ${id}`, { id });
    if (id.startsWith('family-')) fail('INVALID_ID', `variant ID uses reserved family prefix: ${id}`, { id });
    if (id === familyId) fail('ID_COLLISION', `variant ID collides with family ID: ${id}`, { id });
    if (ids.has(id)) fail('DUPLICATE_ID', `duplicate variant ID: ${id}`, { id });
    ids.add(id);

    for (const key of ['title', 'summary', 'conditions_applies_when', 'conditions_does_not_apply_when', 'artifact_contract_output_type'] as const) nonEmpty(item[key], `variants[${index}].${key}`);
    // v2 requires a string type only; empty artifact_contract_verified_by remains valid.
    if (typeof item.artifact_contract_verified_by !== 'string') fail('INVALID_FIELD', `variants[${index}].artifact_contract_verified_by must be a string`);
    for (const key of ['capability_tags', 'pattern_tags'] as const) {
      const entries = stringArray(item[key], `variants[${index}].${key}`, false);
      if (!entries.every((entry) => tag.test(entry))) fail('INVALID_FIELD', `variants[${index}].${key} contains an invalid tag`);
    }
    stringArray(item.compatibility_excludes, `variants[${index}].compatibility_excludes`, false);
    stringArray(item.compatibility_requires, `variants[${index}].compatibility_requires`, false);
    stringArray(item.artifact_contract_required_data, `variants[${index}].artifact_contract_required_data`, false);
    const provenance = stringArray(item.provenance, `variants[${index}].provenance`, false);
    if (provenance.length === 0 || !provenance.every((entry) => provenanceEntry.test(entry))) fail('INVALID_FIELD', `variants[${index}].provenance contains an invalid entry`);
    for (const key of ['roles', 'products'] as const) {
      if (item[key] !== undefined) {
        const entries = stringArray(item[key], `variants[${index}].${key}`, false);
        if (!entries.every((entry) => roleOrProduct.test(entry))) fail('INVALID_FIELD', `variants[${index}].${key} contains an invalid value`);
      }
    }
    if (item.approach_assessments !== undefined) {
      const assessments = stringArray(item.approach_assessments, `variants[${index}].approach_assessments`, true);
      if (new Set(assessments).size !== assessments.length) fail('INVALID_FIELD', `variants[${index}].approach_assessments must be unique`);
    }
    if (item.approach_body_sha256 !== undefined && (typeof item.approach_body_sha256 !== 'string' || !lowerHash.test(item.approach_body_sha256))) fail('INVALID_HASH', `variants[${index}].approach_body_sha256 must be 64 lowercase hexadecimal characters`);
    if ((item.approach_assessments === undefined) !== (item.approach_body_sha256 === undefined)) fail('INVALID_FIELD', `variants[${index}] approach metadata fields must appear together`);
    if (item.status !== 'active' && item.status !== 'disabled') fail('INVALID_STATUS', `variants[${index}].status must be active or disabled`);
    if (!Number.isInteger(item.revision) || (item.revision as number) < 1) fail('INVALID_REVISION', `variants[${index}].revision must be an integer >= 1`);
    if (item.source === null || !isRecord(item.source)) fail('INVALID_SOURCE', `variants[${index}].source must be an object`);
    for (const key of ['donor', 'path', 'rowKey'] as const) nonEmpty(item.source[key], `variants[${index}].source.${key}`);
    if (typeof item.source.rawSha256 !== 'string' || !lowerHash.test(item.source.rawSha256)) fail('INVALID_HASH', `variants[${index}].source.rawSha256 must be 64 lowercase hexadecimal characters`);
    nonEmpty(item.sourceLabel, `variants[${index}].sourceLabel`);
    if (typeof item.contentSha256 !== 'string' || !lowerHash.test(item.contentSha256)) fail('INVALID_HASH', `variants[${index}].contentSha256 must be 64 lowercase hexadecimal characters`);
    if (!isRecord(item.applicability)) fail('INVALID_APPLICABILITY', `variants[${index}].applicability must be an object`);
    try {
      parseApplicability(JSON.stringify(item.applicability));
    } catch (error) {
      fail('INVALID_APPLICABILITY', `variants[${index}].applicability is invalid`, { cause: error instanceof Error ? error.message : String(error) });
    }
    if (item.classification_status !== 'classified' && item.classification_status !== 'unclassified') fail('INVALID_CLASSIFICATION', `variants[${index}].classification_status is invalid`);
    if (item.classification_status === 'classified') {
      if (item.instruction_form === undefined || !Array.isArray(item.domains) || item.domains.length === 0) fail('INVALID_CLASSIFICATION', `variants[${index}] classified metadata requires instruction_form and domains`);
      if (!['principle', 'decision-rule', 'procedure', 'checklist'].includes(String(item.instruction_form))) fail('INVALID_CLASSIFICATION', `variants[${index}].instruction_form is invalid`);
      if (!item.domains.every((domain) => typeof domain === 'string' && ['engineering', 'design-ux', 'product', 'business', 'research', 'operations'].includes(domain))) fail('INVALID_CLASSIFICATION', `variants[${index}].domains is invalid`);
      if (item.classification_reason !== undefined) fail('INVALID_CLASSIFICATION', `variants[${index}] classified metadata forbids classification_reason`);
    } else {
      nonEmpty(item.classification_reason, `variants[${index}].classification_reason`);
      if (item.instruction_form !== undefined || item.domains !== undefined) fail('INVALID_CLASSIFICATION', `variants[${index}] unclassified metadata forbids instruction_form and domains`);
    }
  }
  return value as VariantRecord[];
}

export function encodeVariantScalar(value: readonly VariantRecord[], familyId?: string): string {
  validateVariantFamily(value, familyId);
  const compact = JSON.stringify(value);
  if (forbiddenPayload.test(compact)) fail('INVALID_PAYLOAD', 'variant JSON contains a forbidden control or separator character');
  return `"${compact.replace(/\\/gu, '\\\\').replace(/"/gu, '\\"')}"`;
}

export function parseVariantScalar(raw: string, familyId?: string): VariantRecord[] {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail('INVALID_SCALAR', 'variant decoded value does not contain valid JSON');
  }
  scanStringValues(value, 'INVALID_PAYLOAD');
  return validateVariantFamily(value, familyId);
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function parseVariantSections(body: string, variants: readonly VariantRecord[], familyId?: string): Map<string, string> {
  if (body.includes('\r')) fail('INVALID_BODY', 'variant family body must use LF only');
  validateVariantFamily(variants, familyId);
  const lines = body.split('\n');
  const result = new Map<string, string>();
  let cursor = 0;
  for (const variant of variants) {
    const begin = `<!-- sbvf:variant:begin ${variant.variant_id} -->`;
    const end = `<!-- sbvf:variant:end ${variant.variant_id} -->`;
    if (lines[cursor] !== begin) fail('INVALID_SECTION_ORDER', `expected begin marker for ${variant.variant_id}`, { id: variant.variant_id });
    const payloadStart = cursor + 1;
    let endIndex = payloadStart;
    while (endIndex < lines.length && lines[endIndex] !== end) {
      if (lines[endIndex]!.includes('<!-- sbvf:variant:')) fail('INVALID_MARKER', 'nested, duplicate, or unknown variant marker', { line: endIndex + 1 });
      endIndex += 1;
    }
    if (endIndex >= lines.length) fail('MISSING_END_MARKER', `missing end marker for ${variant.variant_id}`, { id: variant.variant_id });
    const payload = lines.slice(payloadStart, endIndex).join('\n') + (endIndex > payloadStart ? '\n' : '');
    if (!payload.endsWith('\n')) fail('INVALID_PAYLOAD', `payload for ${variant.variant_id} must end with LF`, { id: variant.variant_id });
    if (sha256(payload) !== variant.contentSha256) fail('HASH_MISMATCH', `payload hash mismatch for ${variant.variant_id}`, { id: variant.variant_id });
    result.set(variant.variant_id, payload);
    cursor = endIndex + 1;
  }
  if (cursor === lines.length - 1 && lines[cursor] === '') cursor += 1;
  if (cursor !== lines.length) fail('OUTSIDE_TEXT', 'text or markers exist outside variant sections', { line: cursor + 1 });
  return result;
}
