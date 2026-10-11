import {
  forwardReviewFileDigest as sha,
  hasForwardReviewKeys as keys,
  readForwardReviewFile as read,
  validForwardReview as validReview,
  validForwardReverse as validReverse,
} from '../../../packages/agent/bin/forward-review-proof.ts';

const hex = /^[a-f0-9]{64}$/;

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function reviewKind(item: unknown): string {
  return item !== null && typeof item === 'object' && 'kind' in item && typeof item.kind === 'string' ? item.kind : '';
}

/** Consistency gate for three real, separately attributable review and reverse records.
 * File content remains an assertion; the operator must verify native provenance separately. */
export function verifyForwardReviewSet(
  root: string,
  operationId: string,
  planSha: string,
  evidence: unknown,
  receiptRoot = '.agent/cutover',
): void {
  if (
    !['.agent/cutover', '.agent/release-assurance'].includes(receiptRoot) ||
    !hex.test(planSha) ||
    !isArray(evidence) ||
    evidence.length !== 3
  )
    throw new Error('forward review set invalid');

  const items: readonly unknown[] = evidence;
  if (items.map(reviewKind).sort().join(',') !== 'assurance,correctness,security')
    throw new Error('forward review set invalid');

  const actors = new Set<string>();
  const histories = new Set<string>();
  const calls = new Set<string>();
  const files = new Set<unknown>();
  for (const item of items) {
    if (
      !keys(item, ['kind', 'path', 'sha256', 'reverse_path', 'reverse_sha256', 'status']) ||
      item.status !== 'passed' ||
      !hex.test(String(item.sha256)) ||
      !hex.test(String(item.reverse_sha256)) ||
      files.has(item.path) ||
      files.has(item.reverse_path)
    )
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
