import { describe, expect, test } from 'bun:test';
import {
  canonicalCoverageReviewScope,
  resolveCoverageShardEligibility,
} from '../tooling/coverage-shard-eligibility.ts';
import type { InputDigest } from '../tooling/bun-coverage-evidence.ts';
import { coverageEnvironmentSha256, coverageReviewEnvironmentSha256 } from '../tooling/bun-coverage-evidence.ts';
import { prepareCoverageShardLaunches } from '../tooling/run-bun-coverage.ts';
import {
  coverageAssignmentPlanSha256,
  validateCoverageShardLaunchBinding,
} from '../tooling/coverage-shard-evidence.ts';

const scope = {
  source_fingerprint: 'a'.repeat(64),
  test_fingerprint: 'b'.repeat(64),
  tool_fingerprint: 'c'.repeat(64),
  configuration_fingerprint: '6'.repeat(64),
  runtime_executable_sha256: 'd'.repeat(64),
  environment_sha256: '7'.repeat(64),
  bun_version: '1.4.3',
  provider: 'verified-native-readonly',
  platform: 'linux',
  architecture: 'x64',
  package_root_identity_sha256: 'e'.repeat(64),
};
const input = (name: string, fill = 'f'): InputDigest => ({ path: `tests/${name}.test.ts`, sha256: fill.repeat(64) });
const resource = `package-root:${'9'.repeat(64)}`;

const clockEnvironment = (
  issuedAt: number,
  budget: number,
  originalDuration: string | null = null,
): NodeJS.ProcessEnv => ({
  PATH: '/qualified/bun',
  VIDA_PINNED_COMMAND_BUDGET_MS: String(budget),
  VIDA_PINNED_COMMAND_DEADLINE_MS: String(issuedAt + budget),
  VIDA_COVERAGE_REVIEW_CLOCK_POLICY: JSON.stringify({
    maximum_ms: 300000,
    report_reserve_ms: 30000,
    original_duration_ms: originalDuration,
    original_expiry_ms: null,
    ancestor_duration_ms: null,
    ancestor_expiry_ms: null,
    budget_ms: String(budget),
    deadline_ms: String(issuedAt + budget),
    issued_at_ms: issuedAt,
  }),
});

test('review-base hashes normalize consistent generated clocks while exact child hashes remain distinct', () => {
  const first = clockEnvironment(1000000, 299000);
  const second = clockEnvironment(2000000, 298000);
  expect(coverageReviewEnvironmentSha256(first, true)).toBe(coverageReviewEnvironmentSha256(second, true));
  expect(coverageEnvironmentSha256(first)).not.toBe(coverageEnvironmentSha256(second));
  expect(coverageReviewEnvironmentSha256(clockEnvironment(1000000, 299000, '300000'), true)).not.toBe(
    coverageReviewEnvironmentSha256(first, true),
  );
  expect(coverageReviewEnvironmentSha256({ ...first, VIDA_FRONTIER_PHASE_TRACE: '1' }, true)).not.toBe(
    coverageReviewEnvironmentSha256(first, true),
  );
  expect(coverageReviewEnvironmentSha256({ ...first, UNRECOGNIZED_SWITCH: '1' }, true)).not.toBe(
    coverageReviewEnvironmentSha256(first, true),
  );
  expect(coverageReviewEnvironmentSha256({ ...first, NODE_ENV: 'test', TZ: 'Etc/UTC' }, true)).toBe(
    coverageReviewEnvironmentSha256(first, true),
  );
  expect(coverageReviewEnvironmentSha256(first)).toBe(coverageEnvironmentSha256(first));
});

test('review-base hashing keeps malformed or inconsistent clocks exact', () => {
  const first = clockEnvironment(1000000, 299000);
  const original: unknown = JSON.parse(first.VIDA_COVERAGE_REVIEW_CLOCK_POLICY!);
  if (typeof original !== 'object' || original === null || Array.isArray(original))
    throw new Error('Missing clock fixture.');
  const changedPolicy = (change: Record<string, unknown>) => ({
    ...first,
    VIDA_COVERAGE_REVIEW_CLOCK_POLICY: JSON.stringify({ ...original, ...change }),
  });
  for (const altered of [
    { ...first, VIDA_COVERAGE_REVIEW_CLOCK_POLICY: undefined },
    { ...first, VIDA_COVERAGE_REVIEW_CLOCK_POLICY: '{}' },
    { ...first, VIDA_COVERAGE_REVIEW_CLOCK_POLICY: '[' },
    { ...first, VIDA_PINNED_COMMAND_BUDGET_MS: '300000' },
    clockEnvironment(1000000, 299000, '123'),
    clockEnvironment(1000000, 300001),
    { ...first, VIDA_COVERAGE_REVIEW_CLOCK_POLICY: '[]' },
    changedPolicy({ extra: true }),
    changedPolicy({ maximum_ms: 0 }),
    changedPolicy({ report_reserve_ms: 0 }),
    changedPolicy({ issued_at_ms: -1 }),
    changedPolicy({ original_duration_ms: 300000 }),
    changedPolicy({ ancestor_duration_ms: '12' }),
    changedPolicy({ original_expiry_ms: '1000001' }),
    changedPolicy({ ancestor_expiry_ms: '1000001' }),
    changedPolicy({ deadline_ms: '1300000' }),
  ])
    expect(coverageReviewEnvironmentSha256(altered, true)).toBe(coverageEnvironmentSha256(altered));
});
const review = (row: InputDigest, reviewScope = canonicalCoverageReviewScope(scope)) => ({
  test_file: row.path,
  test_sha256: row.sha256,
  review_scope_sha256: reviewScope,
  shared_resources: [resource],
  exclusive_run: false,
  reviewer_ref: 'review:coverage-resource-ownership',
});
const envelope = (rows: readonly InputDigest[], options: { scope?: unknown; reviews?: unknown } = {}) => {
  const boundScope = options.scope ?? scope;
  return {
    schema: 'VidaCoverageShardEligibility/v1',
    scope: boundScope,
    review_scope_sha256: canonicalCoverageReviewScope(boundScope),
    reviews: options.reviews ?? rows.map((row) => review(row)),
  };
};

describe('resolveCoverageShardEligibility', () => {
  test('accepts a complete current review and allows files sharing one resource in one serial assignment', () => {
    const selected = [input('a'), input('b', '8')];
    const result = resolveCoverageShardEligibility({
      mode: 'current',
      envelope: envelope(selected),
      selectedTests: selected,
      scope,
    });

    expect(result.status).toBe('eligible');
    expect(result.reviewScopeSha256).toBe(canonicalCoverageReviewScope(scope));
    const plan = result.status === 'eligible' ? result.plan : undefined;
    expect(plan?.waves).toHaveLength(1);
    expect(plan?.waves[0]?.assignments).toHaveLength(1);
    expect(plan?.waves[0]?.assignments[0]?.tests).toEqual(selected.map(({ path }) => path));
  });

  test('admits two independent assignments when every test has an explicit resource review', () => {
    const selected = ['a', 'b', 'c', 'd'].map((name) => input(name));
    const reviewed = selected.map((row) => ({ ...review(row), shared_resources: [] }));
    const result = resolveCoverageShardEligibility({
      mode: 'current',
      envelope: envelope(selected, { reviews: reviewed }),
      selectedTests: selected,
      scope,
    });
    const assignments = result.status === 'eligible' ? result.plan.waves[0]?.assignments : undefined;

    expect(result.status).toBe('eligible');
    expect(assignments).toHaveLength(2);
    expect(assignments?.flatMap((assignment) => assignment.tests).sort()).toEqual(
      selected.map(({ path }) => path).sort(),
    );
  });

  test('falls back for historical runs and never creates a shard plan', () => {
    const selected = [input('a')];
    const result = resolveCoverageShardEligibility({
      mode: 'historical',
      envelope: envelope(selected),
      selectedTests: selected,
      scope,
    });
    expect(result.status).toBe('serial-fallback');
    expect('plan' in result).toBe(false);
  });

  test.each([
    ['stale source scope with unchanged tests', { ...scope, source_fingerprint: '0'.repeat(64) }],
    ['different test fingerprint', { ...scope, test_fingerprint: '0'.repeat(64) }],
    ['different tool fingerprint', { ...scope, tool_fingerprint: '0'.repeat(64) }],
    ['different configuration', { ...scope, configuration_fingerprint: '0'.repeat(64) }],
    ['different runtime', { ...scope, runtime_executable_sha256: '0'.repeat(64) }],
    ['different environment', { ...scope, environment_sha256: '0'.repeat(64) }],
    ['different Bun version', { ...scope, bun_version: '1.4.2' }],
    ['different provider', { ...scope, provider: 'different-provider' }],
    ['different platform', { ...scope, platform: 'darwin' }],
    ['different architecture', { ...scope, architecture: 'arm64' }],
    ['different package owner', { ...scope, package_root_identity_sha256: '0'.repeat(64) }],
  ])('falls back for %s', (_label, changedScope) => {
    const selected = [input('a')];
    expect(
      resolveCoverageShardEligibility({
        mode: 'current',
        envelope: envelope(selected),
        selectedTests: selected,
        scope: changedScope,
      }).status,
    ).toBe('serial-fallback');
  });

  test.each(['duplicate', 'foreign', 'malformed', 'missing'])('falls back for %s review rows', (kind) => {
    const selected = [input('a'), input('b', '8')];
    let rows: unknown[] = selected.map((row) => review(row));
    if (kind === 'duplicate') rows = [rows[0]!, rows[0]!];
    if (kind === 'foreign') rows[1] = review(input('outside', '7'));
    if (kind === 'malformed') rows[0] = { ...(rows[0] as object), shared_resources: ['../not-an-owner'] };
    if (kind === 'missing') rows.pop();
    expect(
      resolveCoverageShardEligibility({
        mode: 'current',
        envelope: envelope(selected, { reviews: rows }),
        selectedTests: selected,
        scope,
      }).status,
    ).toBe('serial-fallback');
  });

  test('falls back when planner output requires an exclusive or later wave', () => {
    const selected = [input('a'), input('b', '8')];
    const rows = selected.map((row) => ({ ...review(row), exclusive_run: row.path.endsWith('/b.test.ts') }));
    const result = resolveCoverageShardEligibility({
      mode: 'current',
      envelope: envelope(selected, { reviews: rows }),
      selectedTests: selected,
      scope,
    });
    expect(result.status).toBe('serial-fallback');
    expect('plan' in result).toBe(false);
  });

  test('falls back when resource bridging requires a later wave', () => {
    const selected = [input('a'), input('b', '8'), input('bridge', '7')];
    const firstResource = `package-root:${'1'.repeat(64)}`;
    const secondResource = `worktree:${'2'.repeat(64)}`;
    const rows = [
      { ...review(selected[0]!), shared_resources: [firstResource] },
      { ...review(selected[1]!), shared_resources: [secondResource] },
      { ...review(selected[2]!), shared_resources: [firstResource, secondResource] },
    ];
    const result = resolveCoverageShardEligibility({
      mode: 'current',
      envelope: envelope(selected, { reviews: rows }),
      selectedTests: selected,
      scope,
    });

    expect(result.status).toBe('serial-fallback');
    expect('plan' in result).toBe(false);
  });

  test('falls back for unknown envelope keys and invalid full-selection bindings', () => {
    const selected = [input('a')];
    const unknown = { ...envelope(selected), extra: true };
    const changedTests = [input('a', '0')];
    const unknownResult = resolveCoverageShardEligibility({
      mode: 'current',
      envelope: unknown,
      selectedTests: selected,
      scope,
    });
    const changedResult = resolveCoverageShardEligibility({
      mode: 'current',
      envelope: envelope(selected),
      selectedTests: changedTests,
      scope,
    });
    expect(unknownResult.status).toBe('serial-fallback');
    expect(changedResult.status).toBe('serial-fallback');
  });
});

describe('prepareCoverageShardLaunches', () => {
  const selected = [input('a'), input('b', '8')];
  const reviewedEnvelope = (environment: NodeJS.ProcessEnv) => {
    const actualScope = {
      ...scope,
      environment_sha256: coverageReviewEnvironmentSha256({ ...environment, TMPDIR: '/external' }, true),
    };
    return envelope(selected, {
      scope: actualScope,
      reviews: selected.map((row) => ({
        ...review(row, canonicalCoverageReviewScope(actualScope)),
        shared_resources: [],
      })),
    });
  };
  const prepare = (environment: NodeJS.ProcessEnv, boundEligibility: unknown = reviewedEnvelope(environment)) =>
    prepareCoverageShardLaunches({
      root: '/synthetic',
      temporary_root: '/external',
      run_id: '11111111-1111-1111-1111-111111111111',
      scope: {
        ...scope,
        environment_sha256: coverageReviewEnvironmentSha256({ ...environment, TMPDIR: '/external' }, true),
      },
      selected_test_inputs: selected,
      eligibility: boundEligibility,
      environment,
      wrapped_invocation: true,
    });

  test('seals complete serial assignments and separate outputs before the supervisor receives them', () => {
    const environment = { NODE_ENV: 'test', PATH: '/qualified/bun', BUN_OPTIONS: '' };
    const result = prepare(environment);
    expect(result.status).toBe('prepared');
    if (result.status !== 'prepared') throw new Error('Synthetic complete review was denied.');
    expect(result.launches).toHaveLength(2);
    expect(result.binding.tests).toEqual(selected.map(({ path: file }) => file));
    const outputs = result.invocations.flatMap(({ output_paths }) => Object.values(output_paths));
    expect(new Set(outputs).size).toBe(10);
    for (const [index, launch] of result.launches.entries()) {
      const invocation = result.invocations[index]!;
      expect(launch.args).toEqual(invocation.argv);
      expect(launch.args).toContain('--no-isolate');
      expect(launch.args).toContain('--parallel=1');
      expect(launch.args.slice(1, 3)).toEqual(['--timeout', '5000']);
      expect(launch.env.BUN_TEST_WORKER_ID).toBe('1');
      expect(launch.env.JEST_WORKER_ID).toBe('1');
      expect(launch.env.BUN_OPTIONS).toBeUndefined();
      expect(launch.env.TMPDIR).toBe(invocation.output_paths.temp_directory);
      expect(invocation.environment_sha256).toBe(coverageEnvironmentSha256(launch.env));
      expect(Object.isFrozen(launch.env)).toBe(true);
      expect(Object.isFrozen(launch.args)).toBe(true);
      expect(Object.isFrozen(invocation.output_paths)).toBe(true);
    }
    environment.PATH = '/changed';
    expect(result.launches[0]!.env.PATH).toBe('/qualified/bun');
    expect(result.launches.flatMap(({ args }) => args.filter((arg) => arg.startsWith('./tests/'))).sort()).toEqual(
      selected.map(({ path: file }) => './' + file),
    );
  });

  test('prepared launches reuse reviewed clock policy while sealing each exact changed child environment', () => {
    const first = clockEnvironment(1000000, 299000);
    const second = clockEnvironment(2000000, 298000);
    const review = reviewedEnvelope(first);
    const initial = prepare(first, review);
    const changed = prepare(second, review);
    expect(initial.status).toBe('prepared');
    expect(changed.status).toBe('prepared');
    if (initial.status !== 'prepared' || changed.status !== 'prepared')
      throw new Error('Consistent clock policy denied.');
    expect(initial.plan).toEqual(changed.plan);
    const direct = prepareCoverageShardLaunches({
      root: '/synthetic',
      temporary_root: '/external',
      run_id: '11111111-1111-1111-1111-111111111111',
      scope: { ...scope, environment_sha256: coverageReviewEnvironmentSha256({ ...first, TMPDIR: '/external' }, true) },
      selected_test_inputs: selected,
      eligibility: review,
      environment: first,
    });
    expect(direct).toMatchObject({ status: 'serial-fallback', reason: 'review-environment-stale-or-mismatched' });
    for (const [index, invocation] of changed.invocations.entries()) {
      expect(invocation.environment_sha256).toBe(coverageEnvironmentSha256(changed.launches[index]!.env));
      expect(invocation.environment_sha256).not.toBe(initial.invocations[index]!.environment_sha256);
    }
    expect(prepare(clockEnvironment(2000000, 298000, '300000'), review).status).toBe('serial-fallback');
    const limited = clockEnvironment(1000000, 299000);
    const policy: unknown = JSON.parse(limited.VIDA_COVERAGE_REVIEW_CLOCK_POLICY!);
    if (typeof policy !== 'object' || policy === null) throw new Error('Missing clock fixture.');
    Reflect.set(policy, 'original_expiry_ms', '2000000');
    limited.VIDA_COVERAGE_REVIEW_CLOCK_POLICY = JSON.stringify(policy);
    expect(coverageReviewEnvironmentSha256(limited, true)).not.toBe(coverageReviewEnvironmentSha256(first, true));
  });

  test('returns serial fallback for missing reviews and denies ambient selection modifiers before launch', () => {
    const missing = prepare({}, null);
    expect(missing.status).toBe('serial-fallback');
    expect('launches' in missing).toBe(false);
    expect(() => prepare({ BUN_OPTIONS: '--bail=1' })).toThrow('Ambient BUN_OPTIONS');
    expect(prepare({ VIDA_FRONTIER_PHASE_TRACE: '1' }, reviewedEnvelope({})).status).toBe('serial-fallback');
    const changedEnvironment = prepareCoverageShardLaunches({
      root: '/synthetic',
      temporary_root: '/external',
      run_id: '11111111-1111-1111-1111-111111111111',
      scope: { ...scope, environment_sha256: coverageEnvironmentSha256({ TMPDIR: '/external' }) },
      selected_test_inputs: selected,
      eligibility: reviewedEnvelope({}),
      environment: { VIDA_FRONTIER_PHASE_TRACE: '1' },
    });
    expect(changedEnvironment).toMatchObject({
      status: 'serial-fallback',
      reason: 'review-environment-stale-or-mismatched',
    });
    expect(changedEnvironment.status === 'serial-fallback' ? changedEnvironment.reviewScopeSha256 : undefined).toBe(
      canonicalCoverageReviewScope({
        ...scope,
        environment_sha256: coverageEnvironmentSha256({ TMPDIR: '/external' }),
      }),
    );
    const changedTemporaryRoot = prepareCoverageShardLaunches({
      root: '/synthetic',
      temporary_root: '/other-external',
      run_id: '11111111-1111-1111-1111-111111111111',
      scope: { ...scope, environment_sha256: coverageEnvironmentSha256({ TMPDIR: '/external' }) },
      selected_test_inputs: selected,
      eligibility: reviewedEnvelope({}),
      environment: {},
    });
    expect(changedTemporaryRoot.status).toBe('serial-fallback');
    expect('launches' in changedTemporaryRoot).toBe(false);
  });

  test.each(['cwd', 'preload', 'layout', 'temp-root'])(
    'launch guard denies altered %s before output allocation',
    (alteration) => {
      const result = prepare({});
      if (result.status !== 'prepared') throw new Error('Synthetic complete review was denied.');
      const binding = structuredClone(result.binding);
      const invocation = binding.shard_invocations[0]!;
      if (alteration === 'cwd') invocation.cwd = '/foreign';
      if (alteration === 'preload') {
        const index = invocation.argv.indexOf('--preload');
        invocation.argv.splice(index, 2);
      }
      if (alteration === 'layout') {
        invocation.output_paths.log_file = '/foreign/child.log';
      }
      binding.assignment_plan_sha256 = coverageAssignmentPlanSha256(result.plan, binding.shard_invocations);
      expect(() =>
        validateCoverageShardLaunchBinding(
          binding,
          result.plan,
          '/synthetic',
          alteration === 'temp-root' ? '/synthetic/tmp' : '/external',
        ),
      ).toThrow(/canonical|outside|omits/u);
    },
  );
});
