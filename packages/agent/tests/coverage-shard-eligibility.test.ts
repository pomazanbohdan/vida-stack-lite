import { describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import * as coverageConsumerBinding from '../tooling/coverage-consumer-binding.ts';
import { buildCoverageReviewScope } from '../tooling/coverage-consumer-binding.ts';
import {
  canonicalCoverageReviewScope,
  resolveCoverageShardEligibility,
} from '../tooling/coverage-shard-eligibility.ts';
import type { CoverageInputs, InputDigest } from '../tooling/bun-coverage-evidence.ts';
import {
  coverageEnvironmentSha256,
  coverageReviewEnvironmentSha256,
  sha256,
} from '../tooling/bun-coverage-evidence.ts';
import type { CoverageReviewScope } from '../tooling/coverage-shard-eligibility.ts';
import { prepareCoverageShardLaunches } from '../tooling/run-bun-coverage.ts';
import * as runBunCoverageModule from '../tooling/run-bun-coverage.ts';
import { requireSafeRepositoryAccess } from '../src/config/safe-repository-access.ts';
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
const configurationRows = [
  { path: '.bun-version', sha256: '1'.repeat(64) },
  { path: 'bunfig.toml', sha256: '2'.repeat(64) },
  { path: 'package.json', sha256: '3'.repeat(64) },
  { path: 'bun.lock', sha256: '4'.repeat(64) },
];
const packageAccess = (options: { provider?: string; identities?: string[] } = {}) => {
  let identityIndex = 0;
  const identityCalls: string[] = [];
  const access = {
    schema: 'SafeRepositoryAccess/v1',
    provider: options.provider ?? 'linux-proc-fd',
    platform: process.platform,
    repository_root: '/fixture/packages/agent',
    directoryIdentity: (target: string, label: string) => {
      identityCalls.push(`${target}:${label}`);
      const identities = options.identities ?? ['package-identity'];
      return identities[Math.min(identityIndex++, identities.length - 1)]!;
    },
    readCapturedBytes: () => {
      throw new Error('Scope preparation must reuse captured configuration bytes.');
    },
    readBytes: () => {
      throw new Error('Scope preparation must not read package files.');
    },
    listFiles: () => {
      throw new Error('Scope preparation must not scan the package.');
    },
  } as unknown as import('../src/config/safe-repository-access.ts').SafeRepositoryAccess;
  return { access, identityCalls };
};
const scopeInputs = (overrides: Record<string, unknown> = {}) => ({
  packageAccess: packageAccess().access,
  inputs: {
    source_fingerprint: 'a'.repeat(64),
    test_fingerprint: 'b'.repeat(64),
    tool_fingerprint: 'c'.repeat(64),
    tool_inputs: [...configurationRows, { path: 'tooling/coverage-shard-eligibility.ts', sha256: '5'.repeat(64) }],
  },
  runtimeExecutableSha256: 'd'.repeat(64),
  bunVersion: '1.4.3',
  environment: { PATH: '/qualified/bun', TEST_SETTING: 'one' },
  ...overrides,
});
const scopeBuilder = () => {
  const candidate = Reflect.get(coverageConsumerBinding, 'buildCoverageReviewScope');
  expect(typeof candidate).toBe('function');
  return candidate as (input: ReturnType<typeof scopeInputs>) => CoverageReviewScope;
};
const currentShardBuilder = () => {
  const candidate = Reflect.get(runBunCoverageModule, 'prepareCurrentCoverageShardLaunches');
  expect(typeof candidate).toBe('function');
  return candidate as (input: {
    root: string;
    temporary_root: string;
    run_id: string;
    inputs: CoverageInputs;
    runtimeExecutableSha256: string;
    bunVersion: string;
    environment: NodeJS.ProcessEnv;
    wrappedInvocation?: boolean;
    consumerConfiguration?: Awaited<ReturnType<typeof coverageConsumerBinding.captureCoverageConsumerBinding>>;
  }) => ReturnType<typeof prepareCoverageShardLaunches>;
};

function currentShardPolicyFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'coverage-current-shard-policy-'));
  const temporaryRoot = path.resolve(os.tmpdir());
  const tests = ['tests/policy-a.test.ts', 'tests/policy-b.test.ts'];
  const testInputs = tests.map((file, index) => ({ path: file, sha256: String(index + 1).repeat(64) }));
  const sourceInputs = [{ path: 'src/policy.ts', sha256: '3'.repeat(64) }];
  const toolInputs = [...configurationRows];
  const inputs: CoverageInputs = {
    sources: sourceInputs,
    source_fingerprint: sha256(JSON.stringify(sourceInputs)),
    tests,
    test_selection: { mode: 'full-current-test-set', tests },
    test_inputs: testInputs,
    test_fingerprint: sha256(JSON.stringify(testInputs)),
    tool_inputs: toolInputs,
    tool_fingerprint: sha256(JSON.stringify(toolInputs)),
    module_inputs: sourceInputs,
    input_bytes: {},
  };
  const environment: NodeJS.ProcessEnv = {
    PATH: process.env.PATH ?? '/qualified/bun',
    NODE_ENV: 'test',
    TZ: 'Etc/UTC',
    TMPDIR: temporaryRoot,
  };
  const consumerConfiguration = {
    repository_root: path.join(root, 'consumer'),
    root_identity_sha256: '4'.repeat(64),
    source: 'agent-runtime.config.v1.yaml' as const,
    source_digest: '5'.repeat(64),
  };
  const runtimeExecutableSha256 = sha256('fixture-selected-runtime-executable');
  const bunVersion = '1.4.3';
  const artifactPath = path.join(root, 'coverage', 'bun-unified', 'shard-eligibility.v1.json');
  const runId = randomUUID();
  return {
    root,
    temporaryRoot,
    tests,
    testInputs,
    inputs,
    environment,
    consumerConfiguration,
    runtimeExecutableSha256,
    bunVersion,
    artifactPath,
    runId,
  };
}

function writeCurrentShardReview(
  fixture: ReturnType<typeof currentShardPolicyFixture>,
  options: {
    packageRoot?: string;
    inputs?: CoverageInputs;
    environment?: NodeJS.ProcessEnv;
    consumerConfiguration?: typeof fixture.consumerConfiguration;
  } = {},
) {
  const effectiveEnvironment = {
    ...(options.environment ?? fixture.environment),
    AGENT_RUNTIME_TEST_REPOSITORY_ROOT: (options.consumerConfiguration ?? fixture.consumerConfiguration)
      .repository_root,
  };
  const reviewScope = buildCoverageReviewScope({
    packageAccess: requireSafeRepositoryAccess(options.packageRoot ?? fixture.root),
    inputs: options.inputs ?? fixture.inputs,
    runtimeExecutableSha256: fixture.runtimeExecutableSha256,
    bunVersion: fixture.bunVersion,
    environment: effectiveEnvironment,
    wrappedInvocation: true,
    consumerConfiguration: options.consumerConfiguration ?? fixture.consumerConfiguration,
  });
  const reviewScopeSha256 = canonicalCoverageReviewScope(reviewScope);
  const reviews = fixture.testInputs.map((row) => ({
    test_file: row.path,
    test_sha256: row.sha256,
    review_scope_sha256: reviewScopeSha256,
    shared_resources: [],
    exclusive_run: false,
    reviewer_ref: 'synthetic-current-shard-policy-fixture',
  }));
  mkdirSync(path.dirname(fixture.artifactPath), { recursive: true });
  writeFileSync(
    fixture.artifactPath,
    JSON.stringify({
      schema: 'VidaCoverageShardEligibility/v1',
      scope: reviewScope,
      review_scope_sha256: reviewScopeSha256,
      reviews,
    }),
  );
}

function callCurrentShardBuilder(
  fixture: ReturnType<typeof currentShardPolicyFixture>,
  overrides: Partial<Parameters<ReturnType<typeof currentShardBuilder>>[0]> = {},
) {
  return currentShardBuilder()({
    root: fixture.root,
    temporary_root: fixture.temporaryRoot,
    run_id: fixture.runId,
    inputs: fixture.inputs,
    runtimeExecutableSha256: fixture.runtimeExecutableSha256,
    bunVersion: fixture.bunVersion,
    environment: fixture.environment,
    wrappedInvocation: true,
    consumerConfiguration: fixture.consumerConfiguration,
    ...overrides,
  });
}

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

describe('buildCoverageReviewScope', () => {
  test('binds captured input digests, actual runtime metadata, environment and package identity', () => {
    const { access, identityCalls } = packageAccess();
    const built = scopeBuilder()({ ...scopeInputs(), packageAccess: access });

    expect<Record<string, unknown>>(built).toEqual({
      source_fingerprint: 'a'.repeat(64),
      test_fingerprint: 'b'.repeat(64),
      tool_fingerprint: 'c'.repeat(64),
      configuration_fingerprint: expect.any(String),
      runtime_executable_sha256: 'd'.repeat(64),
      environment_sha256: coverageReviewEnvironmentSha256({ PATH: '/qualified/bun', TEST_SETTING: 'one' }),
      bun_version: '1.4.3',
      provider: access.provider,
      platform: process.platform,
      architecture: process.arch,
      package_root_identity_sha256: sha256('package-identity'),
    });
    expect(Object.keys(built).sort()).toEqual([
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
    ]);
    expect(identityCalls).toHaveLength(2);
    expect(identityCalls[0]).toBe(identityCalls[1]);
  });

  test('changes with captured config digests, consumer origin, provider and actual environment', () => {
    const build = scopeBuilder();
    const original = build(scopeInputs());
    const changedConfigRows = configurationRows.map((row) =>
      row.path === 'package.json' ? { ...row, sha256: '8'.repeat(64) } : row,
    );
    const changedConfig = build({
      ...scopeInputs(),
      inputs: { ...scopeInputs().inputs, tool_inputs: changedConfigRows },
    });
    const consumerConfiguration = {
      repository_root: '/fixture/consumer',
      root_identity_sha256: '9'.repeat(64),
      source: '.vida/project.yaml' as const,
      source_digest: '0'.repeat(64),
    };
    const changedConsumer = build(scopeInputs({ consumerConfiguration }));
    const changedProviderAccess = packageAccess({ provider: 'fs-safe-windows' }).access;
    const changedProvider = build({ ...scopeInputs(), packageAccess: changedProviderAccess });
    const changedEnvironment = build(scopeInputs({ environment: { PATH: '/qualified/bun', TEST_SETTING: 'two' } }));

    expect(changedConfig.configuration_fingerprint).not.toBe(original.configuration_fingerprint);
    expect(changedConsumer.configuration_fingerprint).not.toBe(original.configuration_fingerprint);
    expect(changedProvider.provider).not.toBe(original.provider);
    expect(changedEnvironment.environment_sha256).not.toBe(original.environment_sha256);
  });

  test('rejects duplicate or missing captured configuration owner rows', () => {
    const build = scopeBuilder();
    const rows = scopeInputs().inputs.tool_inputs;
    expect(() => build(scopeInputs({ inputs: { ...scopeInputs().inputs, tool_inputs: [...rows, rows[0]!] } }))).toThrow(
      /configuration/i,
    );
    expect(() =>
      build(
        scopeInputs({
          inputs: { ...scopeInputs().inputs, tool_inputs: rows.filter((row) => row.path !== 'bun.lock') },
        }),
      ),
    ).toThrow(/configuration/i);
  });

  test('rejects package identity drift and returns no fabricated review resources or eligibility', () => {
    const unstable = packageAccess({ identities: ['before', 'after'] });
    expect(() => scopeBuilder()({ ...scopeInputs(), packageAccess: unstable.access })).toThrow(/changed/i);

    const built = scopeBuilder()(scopeInputs());
    expect(built).not.toHaveProperty('reviews');
    expect(built).not.toHaveProperty('shared_resources');
    expect(built).not.toHaveProperty('status');
  });
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

describe('prepareCurrentCoverageShardLaunches', () => {
  test('reads the fixed review artifact and prepares two fixture assignments without creating outputs', () => {
    const fixture = currentShardPolicyFixture();
    let passed = false;
    try {
      writeCurrentShardReview(fixture);
      const prepared = callCurrentShardBuilder(fixture);

      expect(prepared.status).toBe('prepared');
      if (prepared.status !== 'prepared') throw new Error('Complete current fixture review was denied.');
      expect(prepared.plan.waves).toHaveLength(1);
      expect(prepared.plan.waves[0]?.assignments.length).toBeGreaterThan(0);
      expect(prepared.plan.waves[0]?.assignments.length).toBeLessThanOrEqual(2);
      expect(prepared.launches).toHaveLength(prepared.plan.waves[0]!.assignments.length);
      expect(
        prepared.invocations
          .flatMap(({ output_paths }) => Object.values(output_paths))
          .every((file) => !existsSync(file)),
      ).toBe(true);
      expect(existsSync(path.join(fixture.root, 'coverage', 'bun-unified', 'runs', fixture.runId))).toBe(false);
      expect(
        prepared.launches.flatMap((launch) => launch.args.filter((arg) => arg.startsWith('./tests/'))).sort(),
      ).toEqual(fixture.tests.map((file) => './' + file).sort());
      for (const launch of prepared.launches) {
        expect(launch.args).toContain('--parallel=1');
        expect(launch.args).toContain('--no-isolate');
        expect(launch.env.AGENT_RUNTIME_TEST_REPOSITORY_ROOT).toBe(fixture.consumerConfiguration.repository_root);
        expect(launch.env.TMPDIR).toBe(path.resolve(launch.env.TMPDIR!));
        expect(path.relative(fixture.root, launch.env.TMPDIR!).startsWith('..')).toBe(true);
        const externalTempPath = path.relative(fixture.temporaryRoot, launch.env.TMPDIR!);
        expect(externalTempPath.length).toBeGreaterThan(0);
        expect(externalTempPath.startsWith('..')).toBe(false);
      }
      passed = true;
    } finally {
      if (passed) rmSync(fixture.root, { recursive: true, force: true });
      else console.error('Preserved failed current shard policy fixture at ' + fixture.root);
    }
  });

  test.each(['missing', 'unreadable', 'malformed'] as const)(
    'keeps serial fallback before output allocation for a %s review artifact',
    (artifactState) => {
      const fixture = currentShardPolicyFixture();
      let passed = false;
      try {
        if (artifactState === 'unreadable') mkdirSync(fixture.artifactPath, { recursive: true });
        if (artifactState === 'malformed') {
          mkdirSync(path.dirname(fixture.artifactPath), { recursive: true });
          writeFileSync(fixture.artifactPath, '{');
        }
        const result = callCurrentShardBuilder(fixture);
        expect(result.status).toBe('serial-fallback');
        expect('launches' in result).toBe(false);
        expect(existsSync(path.join(fixture.root, 'coverage', 'bun-unified', 'runs', fixture.runId))).toBe(false);
        passed = true;
      } finally {
        if (passed) rmSync(fixture.root, { recursive: true, force: true });
        else console.error(`Preserved ${artifactState} current shard policy fixture at ${fixture.root}`);
      }
    },
  );

  test('keeps serial fallback before output allocation for stale config, environment or package identity', () => {
    const fixture = currentShardPolicyFixture();
    const foreignPackageRoot = mkdtempSync(path.join(os.tmpdir(), 'coverage-current-shard-foreign-package-'));
    let passed = false;
    try {
      writeCurrentShardReview(fixture);
      const changedToolInputs = fixture.inputs.tool_inputs.map((row) =>
        row.path === 'package.json' ? { ...row, sha256: '6'.repeat(64) } : row,
      );
      expect(
        callCurrentShardBuilder(fixture, {
          inputs: {
            ...fixture.inputs,
            tool_inputs: changedToolInputs,
            tool_fingerprint: sha256(JSON.stringify(changedToolInputs)),
          },
        }).status,
      ).toBe('serial-fallback');
      expect(
        callCurrentShardBuilder(fixture, {
          environment: { ...fixture.environment, NODE_ENV: 'development' },
        }).status,
      ).toBe('serial-fallback');
      writeCurrentShardReview(fixture, { packageRoot: foreignPackageRoot });
      expect(callCurrentShardBuilder(fixture).status).toBe('serial-fallback');
      expect(existsSync(path.join(fixture.root, 'coverage', 'bun-unified', 'runs', fixture.runId))).toBe(false);
      passed = true;
    } finally {
      if (passed) {
        rmSync(fixture.root, { recursive: true, force: true });
        rmSync(foreignPackageRoot, { recursive: true, force: true });
      } else
        console.error(`Preserved stale current shard policy fixtures at ${fixture.root} and ${foreignPackageRoot}`);
    }
  });

  test('rejects ambient BUN_OPTIONS before allocating outputs', () => {
    const fixture = currentShardPolicyFixture();
    let passed = false;
    try {
      writeCurrentShardReview(fixture);
      expect(() =>
        callCurrentShardBuilder(fixture, {
          environment: { ...fixture.environment, BUN_OPTIONS: '--bail=1' },
        }),
      ).toThrow('Ambient BUN_OPTIONS');
      expect(existsSync(path.join(fixture.root, 'coverage', 'bun-unified', 'runs', fixture.runId))).toBe(false);
      passed = true;
    } finally {
      if (passed) rmSync(fixture.root, { recursive: true, force: true });
      else console.error('Preserved ambient BUN_OPTIONS current shard policy fixture at ' + fixture.root);
    }
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
