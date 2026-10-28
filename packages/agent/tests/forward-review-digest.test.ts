import { expect, test } from 'bun:test';
import { forwardReviewFileDigest } from '../bin/forward-review-proof.ts';

test('forward review digests preserve UTF-8 and the visible bytes of a view', () => {
  expect(forwardReviewFileDigest('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  expect(forwardReviewFileDigest('café 🌱')).toBe('ef245b5b504b94982e0a48f6f38390132f01fc74bb5230055adeb9d6e026986f');
  const bytes = new Uint8Array([9, 0, 255, 1, 128, 9]);
  expect(forwardReviewFileDigest(bytes.subarray(1, 5))).toBe(
    'edc81f7e4ee358fb91e94bd9bd74079c3dcba36f40f2c8a36e7ae0567afecc8f',
  );
});

import { createHash } from 'node:crypto';
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { verifyForwardReviewSet } from '../bin/forward-review-proof.ts';

type ReceiptItem = {
  kind: string;
  path: string;
  sha256: string;
  reverse_path: string;
  reverse_sha256: string;
  status: 'passed';
};
const reviewOperation = 'fixture-operation';
const reviewPlan = 'a'.repeat(64);
const reviewHash = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');
const reviewJson = (value: unknown): Buffer => Buffer.from(JSON.stringify(value, null, 2) + '\n');

function withReviewFixture(run: (root: string, items: ReceiptItem[]) => void): void {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-forward-review-proof-'));
  let success = false;
  try {
    const directory = path.join(root, '.agent/cutover', reviewOperation);
    mkdirSync(directory, { recursive: true });
    const items = ['correctness', 'security', 'assurance'].map((kind) => {
      const receipt = reviewJson({
        schema: 'VidaForwardReviewReceipt/v1',
        operation_id: reviewOperation,
        kind,
        actor: 'actor-' + kind,
        history_id: 'history-' + kind,
        native_tool_ref: 'call-' + kind,
        sealed_fingerprint: reviewPlan,
        fresh_blind: true,
        verdict: 'pass',
        scope_reviewed: 'complete',
      });
      const reverse = reviewJson({
        schema: 'VidaForwardReverseValidation/v1',
        operation_id: reviewOperation,
        kind,
        actor: 'actor-' + kind,
        history_id: 'history-' + kind,
        sealed_fingerprint: reviewPlan,
        review_sha256: reviewHash(receipt),
        result: 'pass',
      });
      const receiptPath = `.agent/cutover/${reviewOperation}/${kind}.json`;
      const reversePath = `.agent/cutover/${reviewOperation}/${kind}-reverse.json`;
      writeFileSync(path.join(root, receiptPath), receipt);
      writeFileSync(path.join(root, reversePath), reverse);
      return {
        kind,
        path: receiptPath,
        sha256: reviewHash(receipt),
        reverse_path: reversePath,
        reverse_sha256: reviewHash(reverse),
        status: 'passed' as const,
      };
    });
    run(root, items);
    success = true;
  } finally {
    if (success) rmSync(root, { recursive: true, force: true });
    else process.stderr.write('Retained failed or uncertain forward review fixture: ' + root + '\n');
  }
}

function reviewTree(root: string): string[] {
  const entries: string[] = [];
  const walk = (relative: string): void => {
    for (const name of readdirSync(path.join(root, relative)).sort()) {
      const file = relative ? `${relative}/${name}` : name;
      const absolute = path.join(root, file);
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink()) entries.push(`link:${file}:${readlinkSync(absolute)}`);
      else if (stat.isDirectory()) {
        entries.push(`directory:${file}`);
        walk(file);
      } else entries.push(`file:${file}:${readFileSync(absolute).toString('hex')}`);
    }
  };
  walk('');
  return entries;
}

function deniedReview(root: string, evidence: unknown, message: string, receiptRoot?: string): void {
  const before = reviewTree(root);
  expect(() => verifyForwardReviewSet(root, reviewOperation, reviewPlan, evidence, receiptRoot)).toThrow(message);
  expect(reviewTree(root)).toEqual(before);
}

function replaceReviewRecord(
  root: string,
  item: ReceiptItem,
  reverse: boolean,
  changes: Record<string, unknown>,
): void {
  const file = path.join(root, reverse ? item.reverse_path : item.path);
  const record = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
  const bytes = reviewJson({ ...record, ...changes });
  writeFileSync(file, bytes);
  if (reverse) item.reverse_sha256 = reviewHash(bytes);
  else {
    item.sha256 = reviewHash(bytes);
    const updated = { ...record, ...changes };
    const reverseFile = path.join(root, item.reverse_path);
    const paired = JSON.parse(readFileSync(reverseFile, 'utf8')) as Record<string, unknown>;
    const pairedBytes = reviewJson({
      ...paired,
      actor: updated.actor,
      history_id: updated.history_id,
      review_sha256: item.sha256,
    });
    writeFileSync(reverseFile, pairedBytes);
    item.reverse_sha256 = reviewHash(pairedBytes);
  }
}

test('forward review accepts three separately attributed canonical receipt pairs without writes', () => {
  withReviewFixture((root, items) => {
    const before = reviewTree(root);
    expect(() => verifyForwardReviewSet(root, reviewOperation, reviewPlan, items)).not.toThrow();
    expect(reviewTree(root)).toEqual(before);
  });
});

test('forward review rejects malformed sets and duplicate receipt paths without writes', () => {
  withReviewFixture((root, items) => {
    deniedReview(root, items, 'forward review receipt root invalid', 'foreign');
    deniedReview(root, items.slice(0, 2), 'forward review set invalid');
    deniedReview(
      root,
      items.map((item, i) => (i === 0 ? { ...item, kind: 'other' } : item)),
      'forward review set invalid',
    );
    deniedReview(
      root,
      items.map((item, i) => (i === 0 ? { ...item, status: 'failed' } : item)),
      'forward review binding invalid',
    );
    deniedReview(
      root,
      items.map((item, i) => (i === 1 ? { ...item, path: items[0]!.path } : item)),
      'forward review binding invalid',
    );
  });
});

test('forward review rejects escaped paths, noncanonical JSON and digest drift without writes', () => {
  withReviewFixture((root, items) => {
    const first = items[0]!;
    deniedReview(
      root,
      items.map((item, i) => (i === 0 ? { ...item, path: `.agent/cutover/${reviewOperation}/../other.json` } : item)),
      'forward review path invalid',
    );
    writeFileSync(path.join(root, first.path), '{}');
    deniedReview(root, items, 'forward review encoding invalid');
    writeFileSync(path.join(root, first.path), reviewJson({ changed: true }));
    deniedReview(root, items, 'forward review bytes differ');
  });
});

test('forward review refuses a junction in a receipt path without writes', () => {
  withReviewFixture((root, items) => {
    const directory = path.join(root, '.agent/cutover', reviewOperation);
    const target = path.join(directory, 'actual');
    mkdirSync(target);
    writeFileSync(path.join(target, 'receipt.json'), reviewJson({}));
    symlinkSync(target, path.join(directory, 'alias'), process.platform === 'win32' ? 'junction' : 'dir');
    deniedReview(
      root,
      items.map((item, i) =>
        i === 0 ? { ...item, path: `.agent/cutover/${reviewOperation}/alias/receipt.json` } : item,
      ),
      'forward review symlink invalid',
    );
  });
});

for (const [label, field, value] of [
  ['missing actor', 'actor', ' '],
  ['wrong operation', 'operation_id', 'foreign'],
  ['wrong fingerprint', 'sealed_fingerprint', 'b'.repeat(64)],
  ['not blind', 'fresh_blind', false],
  ['failed verdict', 'verdict', 'fail'],
  ['incomplete scope', 'scope_reviewed', 'partial'],
  ['duplicate actor', 'actor', 'actor-security'],
  ['duplicate history', 'history_id', 'history-security'],
  ['duplicate native call', 'native_tool_ref', 'call-security'],
] as const)
  test('forward review rejects ' + label + ' without writes', () => {
    withReviewFixture((root, items) => {
      const item = label.startsWith('duplicate') ? items[1]! : items[0]!;
      const actual =
        label.startsWith('duplicate') && typeof value === 'string' ? value.replace('security', 'correctness') : value;
      replaceReviewRecord(root, item, false, { [field]: actual });
      deniedReview(root, items, 'forward review provenance or reverse binding invalid');
    });
  });

for (const [label, field, value] of [
  ['actor', 'actor', 'foreign'],
  ['history', 'history_id', 'foreign'],
  ['receipt digest', 'review_sha256', 'b'.repeat(64)],
  ['result', 'result', 'fail'],
] as const)
  test('forward reverse rejects mismatched ' + label + ' without writes', () => {
    withReviewFixture((root, items) => {
      replaceReviewRecord(root, items[0]!, true, { [field]: value });
      deniedReview(root, items, 'forward review provenance or reverse binding invalid');
    });
  });
