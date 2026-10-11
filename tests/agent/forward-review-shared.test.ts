import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, test } from 'bun:test';
import { verifyForwardReviewSet as repositoryVerifier } from '../../tooling/agent/controllers/forward-review-proof.ts';
import { verifyForwardReviewSet as packageVerifier } from '../../packages/agent/bin/forward-review-proof.ts';

interface Evidence {
  kind: string;
  path: string;
  sha256: string;
  reverse_path: string;
  reverse_sha256: string;
  status: 'passed';
}

const roots: string[] = [];
const operation = 'forward-shared-test';
const fingerprint = '2'.repeat(64);
const verifiers = [repositoryVerifier, packageVerifier];
const encode = (value: unknown): Buffer => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const digest = (value: Uint8Array): string => createHash('sha256').update(value).digest('hex');

function fixture(receiptRoot = '.agent/cutover'): { root: string; evidence: Evidence[] } {
  const root = mkdtempSync(path.join(tmpdir(), 'vida-forward-review-shared-'));
  roots.push(root);
  mkdirSync(path.join(root, receiptRoot, operation), { recursive: true });
  const evidence = ['correctness', 'security', 'assurance'].map((kind): Evidence => {
    const review = {
      schema: 'VidaForwardReviewReceipt/v1',
      operation_id: operation,
      kind,
      actor: `actor-${kind}`,
      history_id: `history-${kind}`,
      native_tool_ref: `call-${kind}`,
      sealed_fingerprint: fingerprint,
      fresh_blind: true,
      verdict: 'pass',
      scope_reviewed: 'complete',
    };
    const bytes = encode(review);
    const item: Evidence = {
      kind,
      path: `${receiptRoot}/${operation}/${kind}.json`,
      sha256: digest(bytes),
      reverse_path: `${receiptRoot}/${operation}/${kind}-reverse.json`,
      reverse_sha256: '',
      status: 'passed',
    };
    const reverseBytes = encode({
      schema: 'VidaForwardReverseValidation/v1',
      operation_id: operation,
      kind,
      actor: review.actor,
      history_id: review.history_id,
      sealed_fingerprint: fingerprint,
      review_sha256: item.sha256,
      result: 'pass',
    });
    item.reverse_sha256 = digest(reverseBytes);
    writeFileSync(path.join(root, item.path), bytes);
    writeFileSync(path.join(root, item.reverse_path), reverseBytes);
    return item;
  });
  return { root, evidence };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test.each(['.agent/cutover', '.agent/release-assurance'])(
  'both verifiers accept independently attributable records at %s without modifying bytes',
  (receiptRoot) => {
    const { root, evidence } = fixture(receiptRoot);
    const files = evidence.flatMap((item) => [item.path, item.reverse_path]);
    const before = files.map((file) => readFileSync(path.join(root, file)));
    for (const verify of verifiers)
      assert.equal(verify(root, operation, fingerprint, evidence, receiptRoot), undefined);
    assert.deepEqual(
      files.map((file) => readFileSync(path.join(root, file))),
      before,
    );
  },
);

test('repository ingress retains its own invalid-root error contract', () => {
  assert.throws(
    () => repositoryVerifier('', operation, fingerprint, [], '.agent/other'),
    /^Error: forward review set invalid$/,
  );
  assert.throws(
    () => packageVerifier('', operation, fingerprint, [], '.agent/other'),
    /^Error: forward review receipt root invalid$/,
  );
});

test('repository ingress reads preceding records before rejecting a later malformed item', () => {
  const { root, evidence } = fixture();
  const first = evidence[0];
  const third = evidence[2];
  assert.ok(first && third);
  rmSync(path.join(root, first.path));
  const malformed = [first, evidence[1], { ...third, extra: true }];
  assert.throws(() => repositoryVerifier(root, operation, fingerprint, malformed), { code: 'ENOENT' });
  assert.throws(() => packageVerifier(root, operation, fingerprint, malformed), /^Error: forward review set invalid$/);
});

test.each(['bytes', 'reverse-binding', 'symlink', 'attribution'])(
  'both verifiers reject changed %s evidence',
  (fault) => {
    const { root, evidence } = fixture();
    const first = evidence[0];
    const second = evidence[1];
    assert.ok(first && second);
    let expected = /forward review bytes differ/;
    if (fault === 'bytes') writeFileSync(path.join(root, first.path), 'false\n');
    if (fault === 'symlink') {
      rmSync(path.join(root, first.path));
      symlinkSync(path.join(root, second.path), path.join(root, first.path));
      expected = /forward review symlink invalid/;
    }
    if (fault === 'reverse-binding') {
      const bytes = encode({ schema: 'VidaForwardReverseValidation/v1', operation_id: 'foreign' });
      writeFileSync(path.join(root, first.reverse_path), bytes);
      first.reverse_sha256 = digest(bytes);
      expected = /forward review provenance or reverse binding invalid/;
    }
    if (fault === 'attribution') {
      const bytes = encode({
        schema: 'VidaForwardReviewReceipt/v1',
        operation_id: operation,
        kind: first.kind,
        actor: ' ',
        history_id: 'history',
        native_tool_ref: 'call',
        sealed_fingerprint: fingerprint,
        fresh_blind: true,
        verdict: 'pass',
        scope_reviewed: 'complete',
      });
      writeFileSync(path.join(root, first.path), bytes);
      first.sha256 = digest(bytes);
      expected = /forward review provenance or reverse binding invalid/;
    }
    for (const verify of verifiers) assert.throws(() => verify(root, operation, fingerprint, evidence), expected);
  },
);
