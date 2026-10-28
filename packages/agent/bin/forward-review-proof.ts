import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';

interface ReviewItem {
  kind: string;
  path: string;
  sha256: string;
  reverse_path: string;
  reverse_sha256: string;
  status: 'passed';
}

interface ValidReview extends Record<string, unknown> {
  actor: string;
  history_id: string;
  native_tool_ref: string;
}

interface ReviewFile {
  bytes: Buffer;
  parsed: unknown;
}

const hex = /^[a-f0-9]{64}$/;

function sha(bytes: string | Uint8Array): string {
  return new Bun.CryptoHasher('sha256').update(bytes).digest('hex');
}

function json(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function keys(value: unknown, expected: readonly string[]): value is Record<string, unknown> {
  return isRecord(value) && Object.keys(value).sort().join(',') === [...expected].sort().join(',');
}

function read(root: string, relative: unknown, operationId: string, receiptRoot: string): ReviewFile {
  if (
    typeof relative !== 'string' ||
    !relative.startsWith(`${receiptRoot}/${operationId}/`) ||
    relative.includes('\\') ||
    relative.split('/').some((part) => !part || part === '.' || part === '..' || part.includes(':'))
  )
    throw new Error('forward review path invalid');

  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    const info = lstatSync(current);
    if (info.isSymbolicLink()) throw new Error('forward review symlink invalid');
  }
  if (!lstatSync(current).isFile()) throw new Error('forward review file invalid');
  const bytes = readFileSync(current);
  const parsed: unknown = JSON.parse(bytes.toString('utf8'));
  if (!bytes.equals(json(parsed))) throw new Error('forward review encoding invalid');
  return { bytes, parsed };
}

function reviewKind(item: unknown): string {
  return keys(item, ['kind', 'path', 'sha256', 'reverse_path', 'reverse_sha256', 'status']) &&
    typeof item.kind === 'string'
    ? item.kind
    : '';
}

function isReviewItem(item: unknown): item is ReviewItem {
  return (
    keys(item, ['kind', 'path', 'sha256', 'reverse_path', 'reverse_sha256', 'status']) &&
    typeof item.path === 'string' &&
    typeof item.reverse_path === 'string' &&
    typeof item.sha256 === 'string' &&
    typeof item.reverse_sha256 === 'string' &&
    item.status === 'passed' &&
    hex.test(item.sha256) &&
    hex.test(item.reverse_sha256)
  );
}

function validReviewBinding(
  review: Record<string, unknown>,
  operationId: string,
  planSha: string,
  kind: unknown,
): boolean {
  return (
    review.schema === 'VidaForwardReviewReceipt/v1' &&
    review.operation_id === operationId &&
    review.kind === kind &&
    review.sealed_fingerprint === planSha &&
    review.fresh_blind === true &&
    review.verdict === 'pass' &&
    review.scope_reviewed === 'complete'
  );
}

function validReviewAttribution(review: Record<string, unknown>): boolean {
  return (
    typeof review.actor === 'string' &&
    !!review.actor.trim() &&
    typeof review.history_id === 'string' &&
    !!review.history_id.trim() &&
    typeof review.native_tool_ref === 'string' &&
    !!review.native_tool_ref.trim()
  );
}

function validReview(review: unknown, operationId: string, planSha: string, kind: unknown): review is ValidReview {
  return (
    keys(review, [
      'schema',
      'operation_id',
      'kind',
      'actor',
      'history_id',
      'native_tool_ref',
      'sealed_fingerprint',
      'fresh_blind',
      'verdict',
      'scope_reviewed',
    ]) &&
    validReviewBinding(review, operationId, planSha, kind) &&
    validReviewAttribution(review)
  );
}

function validReverse(
  reversed: unknown,
  review: ValidReview,
  item: ReviewItem | Readonly<Record<string, unknown>>,
  operationId: string,
  planSha: string,
): boolean {
  return (
    keys(reversed, [
      'schema',
      'operation_id',
      'kind',
      'actor',
      'history_id',
      'sealed_fingerprint',
      'review_sha256',
      'result',
    ]) &&
    reversed.schema === 'VidaForwardReverseValidation/v1' &&
    reversed.operation_id === operationId &&
    reversed.kind === item.kind &&
    reversed.actor === review.actor &&
    reversed.history_id === review.history_id &&
    reversed.sealed_fingerprint === planSha &&
    reversed.review_sha256 === item.sha256 &&
    reversed.result === 'pass'
  );
}

// Repository adapters share the byte/provenance checks while retaining their ingress guard order.
export {
  read as readForwardReviewFile,
  keys as hasForwardReviewKeys,
  sha as forwardReviewFileDigest,
  validReview as validForwardReview,
  validReverse as validForwardReverse,
};

/** Consistency gate for three real, separately attributable review and reverse records.
 * File content remains an assertion; the operator must verify native provenance separately. */
export function verifyForwardReviewSet(
  root: string,
  operationId: string,
  planSha: string,
  evidence: unknown,
  receiptRoot = '.agent/cutover',
): void {
  if (!['.agent/cutover', '.agent/release-assurance'].includes(receiptRoot))
    throw new Error('forward review receipt root invalid');
  if (!hex.test(planSha) || !Array.isArray(evidence) || evidence.length !== 3)
    throw new Error('forward review set invalid');
  const items: readonly unknown[] = evidence;
  if (items.map(reviewKind).sort().join(',') !== 'assurance,correctness,security')
    throw new Error('forward review set invalid');

  const actors = new Set<string>();
  const histories = new Set<string>();
  const calls = new Set<string>();
  const files = new Set<string>();
  for (const item of items) {
    if (!isReviewItem(item) || files.has(item.path) || files.has(item.reverse_path))
      throw new Error('forward review binding invalid');
    files.add(item.path);
    files.add(item.reverse_path);
    const receipt = read(root, item.path, operationId, receiptRoot);
    const reverse = read(root, item.reverse_path, operationId, receiptRoot);
    if (sha(receipt.bytes) !== item.sha256 || sha(reverse.bytes) !== item.reverse_sha256)
      throw new Error('forward review bytes differ');
    const review = receipt.parsed;
    const reversed = reverse.parsed;
    if (
      !validReview(review, operationId, planSha, item.kind) ||
      actors.has(review.actor) ||
      histories.has(review.history_id) ||
      calls.has(review.native_tool_ref) ||
      !validReverse(reversed, review, item, operationId, planSha)
    )
      throw new Error('forward review provenance or reverse binding invalid');
    actors.add(review.actor);
    histories.add(review.history_id);
    calls.add(review.native_tool_ref);
  }
}
