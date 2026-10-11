import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** @param {string | Uint8Array} bytes */
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** @param {unknown} value */
const json = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const hex = /^[a-f0-9]{64}$/;

/** @typedef {{bytes: Buffer, parsed: unknown}} ReviewFile */

/** @param {unknown} value @param {readonly string[]} expected @returns {value is Record<string, unknown>} */
const keys = (value, expected) => {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === [...expected].sort().join(',')
  );
};

/** @param {unknown} value @returns {value is unknown[]} */
function isArray(value) {
  return Array.isArray(value);
}

/** @param {unknown} value @returns {value is string} */
function nonEmptyString(value) {
  return typeof value === 'string' && !!value.trim();
}

/** @param {unknown} item @returns {string} */
function reviewKind(item) {
  return item !== null && typeof item === 'object' && 'kind' in item && typeof item.kind === 'string' ? item.kind : '';
}

/** @param {string} root @param {unknown} relative @param {string} operationId @param {string} receiptRoot @returns {ReviewFile} */
function read(root, relative, operationId, receiptRoot) {
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
  /** @type {unknown} */
  const parsed = JSON.parse(bytes.toString('utf8'));
  if (!bytes.equals(json(parsed))) throw new Error('forward review encoding invalid');
  return { bytes, parsed };
}

/** Consistency gate for three real, separately attributable review and reverse records.
 * File content remains an assertion; the operator must verify native provenance separately.
 * @param {string} root
 * @param {string} operationId
 * @param {string} planSha
 * @param {unknown} evidence
 * @param {string} [receiptRoot]
 */
export function verifyForwardReviewSet(root, operationId, planSha, evidence, receiptRoot = '.agent/cutover') {
  if (
    !['.agent/cutover', '.agent/release-assurance'].includes(receiptRoot) ||
    !hex.test(planSha) ||
    !isArray(evidence) ||
    evidence.length !== 3 ||
    evidence
      .map((item) => reviewKind(item))
      .sort()
      .join(',') !== 'assurance,correctness,security'
  )
    throw new Error('forward review set invalid');
  const actors = new Set();
  const histories = new Set();
  const calls = new Set();
  const files = new Set();
  for (const item of evidence) {
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
      !keys(review, [
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
      ]) ||
      review.schema !== 'VidaForwardReviewReceipt/v1' ||
      review.operation_id !== operationId ||
      review.kind !== item.kind ||
      review.sealed_fingerprint !== planSha ||
      review.fresh_blind !== true ||
      review.verdict !== 'pass' ||
      review.scope_reviewed !== 'complete' ||
      !nonEmptyString(review.actor) ||
      !nonEmptyString(review.history_id) ||
      !nonEmptyString(review.native_tool_ref) ||
      actors.has(review.actor) ||
      histories.has(review.history_id) ||
      calls.has(review.native_tool_ref) ||
      !keys(reversed, [
        'schema',
        'operation_id',
        'kind',
        'actor',
        'history_id',
        'sealed_fingerprint',
        'review_sha256',
        'result',
      ]) ||
      reversed.schema !== 'VidaForwardReverseValidation/v1' ||
      reversed.operation_id !== operationId ||
      reversed.kind !== item.kind ||
      reversed.actor !== review.actor ||
      reversed.history_id !== review.history_id ||
      reversed.sealed_fingerprint !== planSha ||
      reversed.review_sha256 !== item.sha256 ||
      reversed.result !== 'pass'
    )
      throw new Error('forward review provenance or reverse binding invalid');
    actors.add(review.actor);
    histories.add(review.history_id);
    calls.add(review.native_tool_ref);
  }
}
