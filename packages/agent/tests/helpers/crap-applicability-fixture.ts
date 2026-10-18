import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import coverageApi from 'istanbul-lib-coverage';
import {
  fsSafeApplicabilityReview,
  fsSafeBaselineAliases,
  type proveFsSafeCrapApplicability,
} from '../../tooling/crap-gate.ts';
import { instrumentSource } from '../../tooling/bun-coverage-evidence.ts';

const scope = fsSafeApplicabilityReview;
const packageRoot = path.resolve(import.meta.dirname, '../..');
let captured:
  | {
      review: Record<string, unknown>;
      original: Record<string, unknown>;
      sourceMap: ReturnType<typeof instrumentSource>['fileCoverage'];
    }
  | undefined;

/** Synthetic unit inputs only; never a coverage or native-admission fixture. */
export function crapApplicabilityFixture() {
  if (!captured) {
    const plan = spawnSync(
      'git',
      ['show', `${scope.commit}:.agent/work/core-runtime-reactivation/crap-budgets.reviewed-partial.v1.json`],
      {
        cwd: packageRoot,
        encoding: 'utf8',
        timeout: 5000,
        maxBuffer: 32 * 1024 * 1024,
      },
    );
    if (plan.error || plan.signal || plan.status !== 0) throw new Error('Missing immutable unit review subject.');
    const value: unknown = JSON.parse(plan.stdout);
    if (typeof value !== 'object' || value === null) throw new Error('Invalid unit review subject.');
    const review: unknown = Reflect.get(value, scope.key);
    if (typeof review !== 'object' || review === null) throw new Error('Missing unit review scope.');
    const original: unknown = Reflect.get(review, 'original_baseline');
    if (typeof original !== 'object' || original === null) throw new Error('Missing unit original scope.');
    const file = path.join(packageRoot, scope.source);
    captured = {
      review: review as Record<string, unknown>,
      original: original as Record<string, unknown>,
      sourceMap: instrumentSource(file, readFileSync(file, 'utf8')).fileCoverage,
    };
  }
  const sourceMap = structuredClone(captured.sourceMap);
  for (const key of Object.keys(sourceMap.s)) sourceMap.s[key] = 1;
  const input: Parameters<typeof proveFsSafeCrapApplicability>[0] = {
    reviewKey: scope.key,
    contour: scope.contour,
    review: structuredClone(captured.review),
    sources: [{ path: scope.source, sha256: scope.source_sha256 }],
    baselineCommit: scope.baseline_commit,
    baselineAliases: fsSafeBaselineAliases.map((file) => ({ path: file, source: null })),
    summary: coverageApi
      .createCoverageMap({ [sourceMap.path]: sourceMap })
      .getCoverageSummary()
      .toJSON(),
    sourceMap,
  };
  return { review: structuredClone(captured.review), original: structuredClone(captured.original), input };
}

/** A projection-only owner-issued shape, not an actual measurement or native proof. */
export function crapApplicabilityReceiptFixture() {
  const tests = [{ path: 'tests/fs-safe-attestation.test.ts', sha256: 'a'.repeat(64) }];
  const sources = [{ path: scope.source, sha256: scope.source_sha256 }];
  return {
    schema: 'VidaScopedCrapApplicabilityNA/v1',
    status: 'reviewed-not-applicable',
    contour: scope.contour,
    qualification_scope: 'reviewed-data-only-crap-applicability',
    full_qualification: false,
    baseline_ref: 'b549951',
    baseline_commit: scope.baseline_commit,
    budget_commit: scope.commit,
    budget_review_key: scope.key,
    budget_file: '.agent/work/core-runtime-reactivation/crap-budgets.reviewed-partial.v1.json',
    budget_sha256: scope.budget_sha256,
    run_id: 'unit-data-coverage',
    coverage_run_id: 'unit-data-coverage',
    coverage_report: '/synthetic-unit/coverage.json',
    coverage_report_sha256: 'b'.repeat(64),
    manifest_sha256: 'c'.repeat(64),
    sources,
    test_inputs: tests,
    tool_inputs: [{ path: 'bun.lock', sha256: 'd'.repeat(64) }],
    module_inputs: sources,
    test_selection: {
      mode: 'focused-diagnostic',
      contour: scope.contour,
      sources: [scope.source],
      tests: tests.map(({ path }) => path),
    },
    current_callable_count: 0,
    original_callable_count: 0,
    original_aliases: fsSafeBaselineAliases.map((file) => ({ path: file, status: 'absent' })),
    maximum_complexity: null,
    maximum_crap: null,
    limits: 'Synthetic projection unit subject; never measurement or native qualification.',
  };
}
