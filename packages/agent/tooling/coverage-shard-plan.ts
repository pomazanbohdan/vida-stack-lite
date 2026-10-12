import { canonicalJson, sha256 } from './bun-coverage-evidence.ts';
import type { InputDigest } from './bun-coverage-evidence.ts';

export type ReviewedTestResource = {
  test_file: string;
  test_sha256: string;
  review_scope_sha256: string;
  shared_resources: readonly string[];
  exclusive_run: boolean;
  reviewer_ref: string;
};

type CoverageShardAssignment = {
  shard_id: string;
  tests: readonly string[];
  selection_sha256: string;
  shared_resources: readonly string[];
};

type CoverageShardWave = {
  exclusive: boolean;
  assignments: readonly CoverageShardAssignment[];
};

export type CoverageShardPlan = {
  schema: 'VidaCoverageShardPlan/v1';
  concurrency: 2;
  waves: readonly CoverageShardWave[];
};

const maxSelectedTests = 20_000;
const maxResourcesPerTest = 128;
const maxTextLength = 512;
const comparePath = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);
const reviewKeys = 'exclusive_run,review_scope_sha256,reviewer_ref,shared_resources,test_file,test_sha256';
const canonicalResourceId = /^[a-z][a-z0-9-]{0,63}:[0-9a-f]{64}$/u;

function boundedArray<T>(value: unknown, limit: number): value is readonly T[] {
  return Array.isArray(value) && value.length <= limit;
}

function safeRelativePath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maxTextLength &&
    !value.includes('\\') &&
    !value.includes('\0') &&
    !value.startsWith('/') &&
    !/^[A-Za-z]:/u.test(value) &&
    !value.split('/').some((part) => part === '' || part === '.' || part === '..')
  );
}

function validDigest(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value);
}

function validateTestInputs(tests: readonly InputDigest[]): InputDigest[] {
  if (!boundedArray<InputDigest>(tests, maxSelectedTests))
    throw new Error('Coverage shard test selection exceeds its bound.');
  const rows = [...tests];
  const paths = new Set<string>();
  for (const row of rows) {
    if (
      typeof row !== 'object' ||
      row === null ||
      Object.keys(row).sort(comparePath).join(',') !== 'path,sha256' ||
      !safeRelativePath(row.path) ||
      !/^tests\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.(?:test|spec)\.(?:ts|tsx|mts|cts)$/u.test(row.path) ||
      !validDigest(row.sha256) ||
      paths.has(row.path)
    )
      throw new Error('Coverage shard test input is malformed or duplicated.');
    paths.add(row.path);
  }
  return rows.sort((left, right) => comparePath(left.path, right.path));
}

function validateReviews(
  reviews: readonly ReviewedTestResource[],
  tests: readonly InputDigest[],
  reviewScopeSha256: string,
): Map<string, ReviewedTestResource> {
  if (!boundedArray<ReviewedTestResource>(reviews, tests.length) || !validDigest(reviewScopeSha256))
    throw new Error('Coverage shard resource review scope is malformed.');
  const selected = new Map(tests.map((row) => [row.path, row]));
  const result = new Map<string, ReviewedTestResource>();
  for (const review of reviews) {
    if (typeof review !== 'object' || review === null || Object.keys(review).sort(comparePath).join(',') !== reviewKeys)
      throw new Error('Coverage shard resource review is malformed.');
    const input = selected.get(review.test_file);
    if (
      !input ||
      !safeRelativePath(review.test_file) ||
      result.has(review.test_file) ||
      review.test_sha256 !== input.sha256 ||
      review.review_scope_sha256 !== reviewScopeSha256 ||
      !validDigest(review.test_sha256) ||
      !validDigest(review.review_scope_sha256) ||
      typeof review.exclusive_run !== 'boolean' ||
      typeof review.reviewer_ref !== 'string' ||
      review.reviewer_ref.trim().length === 0 ||
      review.reviewer_ref.length > maxTextLength ||
      !boundedArray<string>(review.shared_resources, maxResourcesPerTest)
    )
      throw new Error('Coverage shard resource review is stale, foreign, or malformed.');
    const resources = new Set<string>();
    for (const resource of review.shared_resources) {
      if (
        typeof resource !== 'string' ||
        resource.trim().length === 0 ||
        resource.length > maxTextLength ||
        !canonicalResourceId.test(resource) ||
        resources.has(resource)
      )
        throw new Error('Coverage shard resource review contains an invalid resource.');
      resources.add(resource);
    }
    result.set(review.test_file, review);
  }
  return result;
}

function assignment(
  inputs: readonly InputDigest[],
  resources: ReadonlySet<string>,
  ordinal: number,
): CoverageShardAssignment {
  const selection = canonicalJson(inputs.map((input) => ({ path: input.path, sha256: input.sha256 })));
  if (selection === undefined) throw new Error('Coverage shard selection cannot be serialized.');
  return {
    shard_id: `shard-${String(ordinal).padStart(4, '0')}`,
    tests: inputs.map((input) => input.path),
    selection_sha256: sha256(selection),
    shared_resources: [...resources].sort(comparePath),
  };
}

function appendKnownWaves(
  inputs: readonly InputDigest[],
  reviews: ReadonlyMap<string, ReviewedTestResource>,
): CoverageShardWave[] {
  const waves: CoverageShardWave[] = [];
  let buckets: [InputDigest[], InputDigest[]] = [[], []];
  let bucketResources: [Set<string>, Set<string>] = [new Set(), new Set()];
  let resourceOwners = new Map<string, 0 | 1>();
  let ordinal = 0;
  const flush = () => {
    const assignments = buckets.flatMap((bucket, index) =>
      bucket.length ? [assignment(bucket, bucketResources[index]!, ++ordinal)] : [],
    );
    if (assignments.length) waves.push({ exclusive: false, assignments });
    buckets = [[], []];
    bucketResources = [new Set(), new Set()];
    resourceOwners = new Map();
  };
  for (const input of inputs) {
    const review = reviews.get(input.path);
    if (!review) continue;
    if (review.exclusive_run) {
      flush();
      ordinal += 1;
      waves.push({ exclusive: true, assignments: [assignment([input], new Set(review.shared_resources), ordinal)] });
      continue;
    }
    let owners = new Set(
      review.shared_resources.map((resource) => resourceOwners.get(resource)).filter((owner) => owner !== undefined),
    );
    if (owners.size > 1) {
      flush();
      owners = new Set();
    }
    const bucket = owners.size === 1 ? [...owners][0]! : buckets[0].length <= buckets[1].length ? 0 : 1;
    buckets[bucket].push(input);
    for (const resource of review.shared_resources) {
      bucketResources[bucket].add(resource);
      resourceOwners.set(resource, bucket);
    }
  }
  flush();
  return waves;
}

export function planCoverageShards(
  testInputs: readonly InputDigest[],
  eligibility: readonly ReviewedTestResource[],
  concurrency: 2,
  reviewScopeSha256: string,
): CoverageShardPlan {
  if (concurrency !== 2) throw new Error('Coverage shard concurrency must remain two.');
  const tests = validateTestInputs(testInputs);
  const reviews = validateReviews(eligibility, tests, reviewScopeSha256);
  const waves = appendKnownWaves(tests, reviews);
  let ordinal = waves.reduce((count, wave) => count + wave.assignments.length, 0);
  for (const input of tests) {
    if (reviews.has(input.path)) continue;
    ordinal += 1;
    waves.push({ exclusive: true, assignments: [assignment([input], new Set(), ordinal)] });
  }
  return { schema: 'VidaCoverageShardPlan/v1', concurrency: 2, waves };
}
