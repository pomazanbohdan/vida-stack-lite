import { canonicalJson, sha256 } from './bun-coverage-evidence.ts';
import type { InputDigest } from './bun-coverage-evidence.ts';
import { planCoverageShards } from './coverage-shard-plan.ts';
import type { CoverageShardPlan, ReviewedTestResource } from './coverage-shard-plan.ts';

export type CoverageReviewScope = {
  source_fingerprint: string;
  test_fingerprint: string;
  tool_fingerprint: string;
  configuration_fingerprint: string;
  runtime_executable_sha256: string;
  environment_sha256: string;
  bun_version: string;
  provider: string;
  platform: string;
  architecture: string;
  package_root_identity_sha256: string;
};

type CoverageShardEligibilityEnvelope = {
  schema: 'VidaCoverageShardEligibility/v1';
  scope: CoverageReviewScope;
  review_scope_sha256: string;
  reviews: readonly ReviewedTestResource[];
};

export type CoverageShardEligibilityResult =
  | { status: 'eligible'; reason: 'complete-current-review'; reviewScopeSha256: string; plan: CoverageShardPlan }
  | { status: 'serial-fallback'; reason: string; reviewScopeSha256?: string };

const scopeKeys = [
  'architecture',
  'bun_version',
  'configuration_fingerprint',
  'environment_sha256',
  'package_root_identity_sha256',
  'platform',
  'provider',
  'runtime_executable_sha256',
  'source_fingerprint',
  'test_fingerprint',
  'tool_fingerprint',
] as const;
const envelopeKeys = ['review_scope_sha256', 'reviews', 'schema', 'scope'];
const reviewKeys = [
  'exclusive_run',
  'review_scope_sha256',
  'reviewer_ref',
  'shared_resources',
  'test_file',
  'test_sha256',
];
const digestPattern = /^[0-9a-f]{64}$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).sort().join(',') === keys.join(',');
}

function validDigest(value: unknown): string | undefined {
  return typeof value === 'string' && digestPattern.test(value) ? value : undefined;
}

function boundedText(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 && value.length <= 128 && value.trim() === value
    ? value
    : undefined;
}

function decodeScope(value: unknown): CoverageReviewScope | undefined {
  if (!isRecord(value) || !exactKeys(value, scopeKeys)) return undefined;
  const source = validDigest(value.source_fingerprint);
  const tests = validDigest(value.test_fingerprint);
  const tools = validDigest(value.tool_fingerprint);
  const configuration = validDigest(value.configuration_fingerprint);
  const runtime = validDigest(value.runtime_executable_sha256);
  const environment = validDigest(value.environment_sha256);
  const packageRoot = validDigest(value.package_root_identity_sha256);
  const bun = boundedText(value.bun_version);
  const provider = boundedText(value.provider);
  const platform = boundedText(value.platform);
  const architecture = boundedText(value.architecture);
  if (
    !source ||
    !tests ||
    !tools ||
    !configuration ||
    !runtime ||
    !environment ||
    !packageRoot ||
    !bun ||
    !provider ||
    !platform ||
    !architecture
  )
    return undefined;
  return {
    source_fingerprint: source,
    test_fingerprint: tests,
    tool_fingerprint: tools,
    configuration_fingerprint: configuration,
    runtime_executable_sha256: runtime,
    environment_sha256: environment,
    bun_version: bun,
    provider,
    platform,
    architecture,
    package_root_identity_sha256: packageRoot,
  };
}

function decodeReviews(value: unknown): ReviewedTestResource[] | undefined {
  if (!Array.isArray(value) || value.length > 20_000) return undefined;
  const reviews: ReviewedTestResource[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || !exactKeys(entry, reviewKeys)) return undefined;
    const resources = entry.shared_resources;
    if (!Array.isArray(resources) || resources.length > 128) return undefined;
    const resourceIds: string[] = [];
    for (const resource of resources) {
      if (typeof resource !== 'string') return undefined;
      resourceIds.push(resource);
    }
    if (
      typeof entry.test_file !== 'string' ||
      typeof entry.test_sha256 !== 'string' ||
      typeof entry.review_scope_sha256 !== 'string' ||
      typeof entry.exclusive_run !== 'boolean' ||
      typeof entry.reviewer_ref !== 'string'
    )
      return undefined;
    reviews.push({
      test_file: entry.test_file,
      test_sha256: entry.test_sha256,
      review_scope_sha256: entry.review_scope_sha256,
      exclusive_run: entry.exclusive_run,
      reviewer_ref: entry.reviewer_ref,
      shared_resources: resourceIds,
    });
  }
  return reviews;
}

export function canonicalCoverageReviewScope(value: unknown): string {
  const scope = decodeScope(value);
  if (!scope) throw new Error('Coverage resource review scope is malformed.');
  const canonical = canonicalJson({
    source_fingerprint: scope.source_fingerprint,
    test_fingerprint: scope.test_fingerprint,
    tool_fingerprint: scope.tool_fingerprint,
    configuration_fingerprint: scope.configuration_fingerprint,
    runtime_executable_sha256: scope.runtime_executable_sha256,
    environment_sha256: scope.environment_sha256,
    bun_version: scope.bun_version,
    provider: scope.provider,
    platform: scope.platform,
    architecture: scope.architecture,
    package_root_identity_sha256: scope.package_root_identity_sha256,
  });
  if (canonical === undefined) throw new Error('Coverage resource review scope cannot be serialized.');
  return sha256(canonical);
}

function decodeEnvelope(value: unknown): CoverageShardEligibilityEnvelope | undefined {
  if (!isRecord(value) || !exactKeys(value, envelopeKeys) || value.schema !== 'VidaCoverageShardEligibility/v1')
    return undefined;
  const scope = decodeScope(value.scope);
  if (!scope || typeof value.review_scope_sha256 !== 'string' || !digestPattern.test(value.review_scope_sha256))
    return undefined;
  const reviews = decodeReviews(value.reviews);
  if (!reviews) return undefined;
  return {
    schema: 'VidaCoverageShardEligibility/v1',
    scope,
    review_scope_sha256: value.review_scope_sha256,
    reviews,
  };
}

function fallback(reason: string, reviewScopeSha256?: string): CoverageShardEligibilityResult {
  return reviewScopeSha256 === undefined
    ? { status: 'serial-fallback', reason }
    : { status: 'serial-fallback', reason, reviewScopeSha256 };
}

export function resolveCoverageShardEligibility(input: {
  mode: 'current' | 'historical';
  envelope: unknown;
  selectedTests: readonly InputDigest[];
  scope: unknown;
}): CoverageShardEligibilityResult {
  if (input.mode !== 'current') return fallback('historical-mode');
  const expectedScope = decodeScope(input.scope);
  if (!expectedScope) return fallback('current-scope-malformed');
  const expectedReviewScope = canonicalCoverageReviewScope(expectedScope);
  const decoded = decodeEnvelope(input.envelope);
  if (!decoded) return fallback('eligibility-envelope-malformed', expectedReviewScope);
  if (
    canonicalCoverageReviewScope(decoded.scope) !== expectedReviewScope ||
    decoded.review_scope_sha256 !== expectedReviewScope
  )
    return fallback('review-scope-stale-or-mismatched', expectedReviewScope);

  try {
    if (decoded.reviews.length !== input.selectedTests.length)
      return fallback('review-selection-incomplete', expectedReviewScope);
    const plan = planCoverageShards(input.selectedTests, decoded.reviews, 2, expectedReviewScope);
    if (plan.waves.length !== 1 || plan.waves[0]?.exclusive !== false)
      return fallback('plan-requires-serial-wave', expectedReviewScope);
    const assignments = plan.waves[0].assignments;
    if (assignments.length < 1 || assignments.length > 2)
      return fallback('plan-assignment-count-invalid', expectedReviewScope);
    const assigned = assignments.flatMap((assignment) => assignment.tests);
    const selected = input.selectedTests.map(({ path }) => path).sort();
    if (
      assigned.length !== selected.length ||
      new Set(assigned).size !== selected.length ||
      [...assigned].sort().some((path, index) => path !== selected[index])
    )
      return fallback('plan-selection-mismatch', expectedReviewScope);
    return { status: 'eligible', reason: 'complete-current-review', reviewScopeSha256: expectedReviewScope, plan };
  } catch {
    return fallback('review-or-plan-validation-failed', expectedReviewScope);
  }
}
