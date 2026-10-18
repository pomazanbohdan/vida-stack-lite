import { expect, test } from 'bun:test';
import {
  assertFsSafeCrapApplicabilityReceipt,
  fsSafeApplicabilityReview,
  proveFsSafeCrapApplicability,
} from '../tooling/crap-gate.ts';
import { contourAttempts, contourAttemptMaximum, mergeContourProgress } from '../tooling/contour-progress.ts';
import { crapApplicabilityFixture, crapApplicabilityReceiptFixture } from './helpers/crap-applicability-fixture.ts';
import { instrumentSource } from '../tooling/bun-coverage-evidence.ts';
import { exactFullCoverage } from '../tooling/coverage-math.ts';

test('data-only review proves null applicability from the existing canonical function map', () => {
  const { input } = crapApplicabilityFixture();
  expect(() => exactFullCoverage(input.summary, 'functions', fsSafeApplicabilityReview.source)).toThrow('functions');
  expect(proveFsSafeCrapApplicability(input)).toMatchObject({
    current_callable_count: 0,
    original_callable_count: 0,
    maximum_complexity: null,
    maximum_crap: null,
  });
});

test.each([
  'foreign contour',
  'foreign key',
  'foreign Source',
  'extra Source',
  'stale binding',
  'wrong baseline',
  'present alias',
  'missing alias',
  'baseline callable',
  'current callable',
  'delegated role',
  'numeric ceiling',
  'moved responsibility',
  'function map',
  'branch count',
  'empty lines',
  'empty statements',
  'uncovered data',
  'incomplete map',
])('data-only applicability rejects %s', (scenario) => {
  const { input, review, original } = crapApplicabilityFixture();
  switch (scenario) {
    case 'foreign contour':
      input.contour = 'main-config';
      break;
    case 'foreign key':
      input.reviewKey = 'scope_review_20261013_small';
      break;
    case 'foreign Source':
      input.sources = [{ path: 'src/runtime.ts', sha256: 'a'.repeat(64) }];
      break;
    case 'extra Source':
      input.sources = [...input.sources, { path: 'src/runtime.ts', sha256: 'a'.repeat(64) }];
      break;
    case 'stale binding':
      input.sources = [{ path: fsSafeApplicabilityReview.source, sha256: 'a'.repeat(64) }];
      break;
    case 'wrong baseline':
      input.baselineCommit = 'f'.repeat(40);
      break;
    case 'present alias':
      input.baselineAliases[1]!.source = 'export function old() {}';
      break;
    case 'missing alias':
      input.baselineAliases = input.baselineAliases.slice(1);
      break;
    case 'baseline callable':
      input.review = { ...review, original_baseline: { ...original, owned_callable_count: 1 } };
      break;
    case 'current callable':
      input.review = { ...review, current_callable_count: 1 };
      break;
    case 'delegated role':
      input.review = { ...review, selected_rows: { retained: 1, new: 0, removed: 0 } };
      break;
    case 'numeric ceiling':
      input.review = { ...review, numeric_ceilings: { maximum_complexity: 0, maximum_crap: 0 } };
      break;
    case 'moved responsibility':
      input.review = { ...review, responsibility_review: { current_owner_path: 'elsewhere' } };
      break;
    case 'function map':
      input.sourceMap = instrumentSource('/synthetic-unit/function.ts', 'export function hit() {}').fileCoverage;
      break;
    case 'branch count':
      input.summary.branches.total = 1;
      break;
    case 'empty lines':
      input.summary.lines.total = input.summary.lines.covered = 0;
      break;
    case 'empty statements':
      input.summary.statements.total = input.summary.statements.covered = 0;
      break;
    case 'uncovered data':
      input.summary.lines.covered--;
      break;
    case 'incomplete map':
      input.sourceMap.statementMap = {};
      break;
  }
  expect(() => proveFsSafeCrapApplicability(input)).toThrow();
});

const receipt = {
  artifact: '/synthetic-unit/applicability.json',
  commit: 'fixture',
  recorded_at: '2026-10-18T00:00:00Z',
};
test('persisted applicability is a distinct nonnumeric observation and never a maximum', () => {
  const proof = crapApplicabilityReceiptFixture();
  assertFsSafeCrapApplicabilityReceipt(proof);
  const attempts = contourAttempts(proof, receipt);
  expect(attempts).toHaveLength(1);
  expect(attempts[0]).toMatchObject({ lane: 'crap-applicability', max_cc: null, max_entry_crap: null });
  expect(contourAttemptMaximum(attempts[0]!)).toBe(false);
  expect(mergeContourProgress({ schema: 'VidaContourProgress/v1', attempts: [] }, attempts).attempts).toHaveLength(1);
});

test.each([
  { maximum_crap: 0 },
  { maximum_complexity: 0 },
  { current_callable_count: 1 },
  { original_callable_count: 1 },
  { full_qualification: true },
  { contour: 'main-config' },
  { budget_commit: 'f'.repeat(40) },
  { budget_sha256: 'f'.repeat(64) },
  { budget_review_key: 'broad-review' },
  { original_aliases: [] },
  { coverage_report_sha256: 'missing' },
  { manifest_sha256: 'missing' },
  { functions: [] },
  { schema: 'VidaScopedCrapBudgetReport/v3' },
])('persisted applicability rejects changed claims %j', (changed) => {
  expect(() => assertFsSafeCrapApplicabilityReceipt({ ...crapApplicabilityReceiptFixture(), ...changed })).toThrow();
});
