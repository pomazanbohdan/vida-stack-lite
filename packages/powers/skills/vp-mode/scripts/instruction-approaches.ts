import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import type { Frontmatter } from './frontmatter.ts';

export const APPROACH_VOCABULARY = Object.freeze({
  execution: Object.freeze(['solo', 'delegated'] as const),
  'remediation-timing': Object.freeze(['none', 'immediate', 'after-review'] as const),
  'review-requirement': Object.freeze(['none', 'independent'] as const),
});

export type ApproachAssessment =
  | { dimension: string; state: 'declared'; values: string[]; evidence: { start: number; end: number } }
  | { dimension: string; state: 'unknown' | 'not-applicable' | 'no-decision'; reason: string; evidence: { start: number; end: number } };

// Declarations are supplied by the caller; they do not confer authority.
export function parseApproachAssessments(
  parsed: Frontmatter,
  declarations: ReadonlyMap<string, readonly string[]>,
): ApproachAssessment[] {
  const { approach_assessments: rows, approach_body_sha256: digest } = parsed.data;
  if (rows === undefined && digest === undefined) return [];
  if (!Array.isArray(rows) || rows.length === 0 || typeof digest !== 'string' || !/^[0-9a-f]{64}$/.test(digest)) {
    throw new Error('invalid approach assessments or body digest');
  }
  const bytes = Buffer.from(parsed.body, 'utf8');
  if (createHash('sha256').update(bytes).digest('hex') !== digest) throw new Error('approach body digest mismatch');
  const assessments: ApproachAssessment[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (typeof row !== 'string' || /[\r\n]/.test(row)) throw new Error('invalid approach row');
    const fields = new Map<string, string>();
    for (const part of row.split('; ')) {
      const match = /^([a-z-]+)=([^;=]+)$/.exec(part);
      if (!match || !match[1] || match[2] === undefined || fields.has(match[1])) throw new Error('invalid approach field');
      fields.set(match[1], match[2]);
    }
    const dimension = fields.get('dimension');
    const state = fields.get('state');
    const span = /^body:(0|[1-9]\d*)-(0|[1-9]\d*)$/.exec(fields.get('evidence') ?? '');
    if (!dimension || !declarations.has(dimension)) throw new Error('unknown approach dimension');
    if (seen.has(dimension)) throw new Error('duplicate approach dimension');
    if (!span) throw new Error('invalid approach evidence syntax');
    seen.add(dimension);
    const start = Number(span[1]);
    const end = Number(span[2]);
    const boundary = (offset: number): boolean => offset === bytes.length || ((bytes[offset] ?? 0) & 0xc0) !== 0x80;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= end || end > bytes.length || !boundary(start) || !boundary(end)) {
      throw new Error('invalid approach evidence range');
    }
    const evidence = { start, end };
    if (state === 'declared') {
      const values = (fields.get('values') ?? '').split(',');
      const allowed = declarations.get(dimension) ?? [];
      if (fields.size !== 4 || !['dimension', 'state', 'values', 'evidence'].every((key) => fields.has(key))) throw new Error('invalid declared approach keys');
      if (values.some((value) => value === '' || !allowed.includes(value)) || new Set(values).size !== values.length) {
        throw new Error('invalid declared approach values');
      }
      assessments.push({ dimension, state, values, evidence });
    } else if (state === 'unknown' || state === 'not-applicable' || state === 'no-decision') {
      const reason = fields.get('reason');
      if (fields.size !== 4 || !['dimension', 'state', 'reason', 'evidence'].every((key) => fields.has(key))) throw new Error('invalid assessed approach keys');
      if (!reason || reason.trim() === '') throw new Error('invalid approach reason');
      assessments.push({ dimension, state, reason, evidence });
    } else throw new Error('invalid approach state');
  }
  return assessments;
}
