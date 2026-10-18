import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import {
  QUALITY_BASELINE_COMMIT,
  QUALITY_BASELINE_REF,
  QUALITY_BUDGET_FILE,
  readQualityGitSnapshot,
  type QualityGitBlob,
  type QualityGitSnapshot,
} from '../tooling/quality-git-snapshot.js';

const budgetCommit = '1234567890123456789012345678901234567890';

function blob(commit: string, path: string, text: string): QualityGitBlob {
  const bytes = Buffer.from(text);
  const oid = createHash('sha1')
    .update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]))
    .digest('hex');
  return {
    commit,
    path,
    mode: '100644',
    oid,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.toString('base64'),
  };
}

function fixture(): QualityGitSnapshot {
  return {
    schema: 'VidaQualityGitSnapshot/v1',
    baselineRef: QUALITY_BASELINE_REF,
    baselineCommit: QUALITY_BASELINE_COMMIT,
    baselinePaths: ['packages/agent/package.json', 'packages/agent/src/core.ts', 'packages/agent/tests/core.test.ts'],
    budgetRef: budgetCommit,
    budgetCommit,
    blobs: [
      blob(QUALITY_BASELINE_COMMIT, 'packages/agent/package.json', '{"files":["src"]}'),
      blob(QUALITY_BASELINE_COMMIT, 'packages/agent/src/core.ts', 'export const core = 1;'),
      blob(QUALITY_BASELINE_COMMIT, 'packages/agent/tests/core.test.ts', 'test("core", () => {});'),
      blob(budgetCommit, QUALITY_BUDGET_FILE, '{"schema":"VidaReviewedFunctionLineagePartial/v1"}'),
    ],
  };
}

test('snapshot reader serves only committed immutable baseline and pinned budget blobs', () => {
  const reader = readQualityGitSnapshot(fixture(), budgetCommit);
  expect(reader.resolveCommit(QUALITY_BASELINE_REF)).toBe(QUALITY_BASELINE_COMMIT);
  expect(reader.resolveCommit(`${budgetCommit}^{commit}`)).toBe(budgetCommit);
  expect(reader.readBlob(QUALITY_BASELINE_COMMIT, 'packages/agent/src/core.ts')).toBe('export const core = 1;');
  expect(reader.readBlob(QUALITY_BASELINE_COMMIT, 'packages/agent/src/missing.ts')).toBeNull();
  expect(reader.readBlob(budgetCommit, QUALITY_BUDGET_FILE)).toContain('VidaReviewedFunctionLineagePartial/v1');
  expect(reader.listPaths(QUALITY_BASELINE_COMMIT, 'packages/agent/tests')).toEqual([
    'packages/agent/tests/core.test.ts',
  ]);
  expect(() => reader.resolveCommit('HEAD')).toThrow('Unsupported frozen quality Git ref');
  expect(() => reader.readBlob('f'.repeat(40), QUALITY_BUDGET_FILE)).toThrow('Unsupported frozen quality Git blob');
  expect(() => reader.readBlob(budgetCommit, 'packages/agent/package.json')).toThrow(
    'Unsupported frozen quality Git blob',
  );
  expect(() => reader.listPaths(QUALITY_BASELINE_COMMIT, 'packages/agent/.git')).toThrow(
    'Unsupported frozen quality Git tree query',
  );
});

test('reader owns its path inventory after schema validation', () => {
  const input = fixture();
  const reader = readQualityGitSnapshot(input);
  (input.baselinePaths as string[]).splice(0);
  expect(reader.listPaths(QUALITY_BASELINE_COMMIT, 'packages/agent/tests')).toEqual([
    'packages/agent/tests/core.test.ts',
  ]);
});

test('snapshot reader rejects malformed, extra, missing, or foreign refs and content', () => {
  const baseline = fixture();
  expect(() => readQualityGitSnapshot({ ...baseline, surprise: true })).toThrow('refs or schema are invalid');
  expect(() => readQualityGitSnapshot({ ...baseline, baselineCommit: '0'.repeat(40) })).toThrow(
    'refs or schema are invalid',
  );
  expect(() => readQualityGitSnapshot(baseline, 'f'.repeat(40))).toThrow('refs or schema are invalid');
  expect(() => readQualityGitSnapshot({ ...baseline, blobs: baseline.blobs.slice(0, -1) })).toThrow(
    'missing its pinned budget bytes',
  );
  expect(() =>
    readQualityGitSnapshot({
      ...baseline,
      blobs: baseline.blobs.filter((entry) => entry.path !== 'packages/agent/src/core.ts'),
    }),
  ).toThrow('baseline path inventory is incomplete or inconsistent');
  const foreign = fixture();
  const foreignBlob = blob('f'.repeat(40), 'src/foreign.ts', 'foreign');
  expect(() => readQualityGitSnapshot({ ...foreign, blobs: [...foreign.blobs, foreignBlob] })).toThrow(
    'blob metadata is invalid or foreign',
  );
  for (const unsafePath of ['packages/agent\\src\\core.ts', 'packages/agent/src/\0core.ts', 'elsewhere/core.ts']) {
    const unsafe = fixture();
    const first = unsafe.blobs[0]!;
    expect(() =>
      readQualityGitSnapshot({
        ...unsafe,
        blobs: [{ ...first, path: unsafePath }, ...unsafe.blobs.slice(1)],
      }),
    ).toThrow('blob metadata is invalid or foreign');
  }
  const corrupt = fixture();
  const first = corrupt.blobs[0]!;
  expect(() =>
    readQualityGitSnapshot({
      ...corrupt,
      blobs: [{ ...first, sha256: '0'.repeat(64) }, ...corrupt.blobs.slice(1)],
    }),
  ).toThrow('content digest is invalid');
});
