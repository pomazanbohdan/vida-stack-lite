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
