import { afterEach, expect, test } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertCrapPlanPrerequisites } from '../tooling/crap-gate.ts';
import { assertMutationSummary, readBudgetPlan } from '../tooling/quality-final.ts';
import { qualityFingerprint, type CoverageInputs } from '../tooling/bun-coverage-evidence.ts';
import { expectRejection, rejectionReason } from './helpers/expect-rejection.ts';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const originalBudgetPlan = process.env.VIDA_CRAP_BUDGET_PLAN;
const temporaryRoots: string[] = [];

test('final quality rejects a perfect selected mutation pilot even with matching input identities', () => {
  const inputs: CoverageInputs = {
    sources: [],
    source_fingerprint: 'a'.repeat(64),
    tests: [],
    test_selection: { mode: 'full-current-test-set', tests: [] },
    test_inputs: [],
    test_fingerprint: 'b'.repeat(64),
    tool_inputs: [],
    tool_fingerprint: 'c'.repeat(64),
    module_inputs: [],
    input_bytes: {},
  };
  const summary = {
    schema: 'CandidateMutationReport/v3',
    status: 'pass',
    input_fingerprint: qualityFingerprint(inputs),
    source_fingerprint: inputs.source_fingerprint,
    test_fingerprint: inputs.test_fingerprint,
    tool_fingerprint: inputs.tool_fingerprint,
    required_effective_score: 1,
    effective_score: 1,
    mutants: 2,
    killed: 2,
    non_killed: [],
    unknown_mutants: [],
  };
  expect(() => assertMutationSummary(summary, inputs)).not.toThrow();
  for (const status of ['pass', 'pilot-pass'])
    expect(() =>
      assertMutationSummary(
        { ...summary, schema: 'CandidateMutationPilotReport/v1', status, full_qualification: false },
        inputs,
      ),
    ).toThrow(/100% confirmed assertion-caused Killed/);
});

function fixtureRoot(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'final-quality-plan-prerequisite-'));
  temporaryRoots.push(root);
  return root;
}

afterEach(() => {
  if (originalBudgetPlan === undefined) delete process.env.VIDA_CRAP_BUDGET_PLAN;
  else process.env.VIDA_CRAP_BUDGET_PLAN = originalBudgetPlan;
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

test('CRAP prerequisite denies an explicit non-executable partial-plan marker', () => {
  const root = path.resolve(packageRoot, '../..');
  const partialPlanMarker = {
    schema: 'VidaReviewedFunctionLineagePartial/v1',
    status: 'SOURCE_LINEAGE_ONLY_NON_EXECUTABLE_NOT_EXHAUSTIVE',
    baseline_ref: 'b549951',
  };
  // This synthetic marker exercises rejection only; it is not genuine baseline evidence.
  expect(() => assertCrapPlanPrerequisites(partialPlanMarker, root)).toThrow(/schema or published baseline ref/u);
});

test('CRAP prerequisite accepts a nonempty disposition shape with no actual removal roles', () => {
  const root = path.resolve(packageRoot, '../..');
  const shapeOnlyPlan = {
    schema: 'VidaCrapBudgetPlan/v1',
    baseline_ref: 'b549951',
    baseline_coverage_report_ref: 'packages/agent/coverage/bun-unified/coverage-final.json',
    baseline_coverage_report_sha256: 'a'.repeat(64),
    baseline_functions: [{ identity: 'shape-only' }],
    new_functions: [],
    removed_functions: [],
    new_sources: [],
    removed_sources: [],
  };
  // This is only a prerequisite shape check; it is not valid baseline evidence or an accepted complete plan.
  expect(() => assertCrapPlanPrerequisites(shapeOnlyPlan, root)).not.toThrow();
});

test('CRAP prerequisite rejects evidence paths that normalize to the repository parent', () => {
  const root = path.resolve(packageRoot, '../..');
  const shapeOnlyPlan = {
    schema: 'VidaCrapBudgetPlan/v1',
    baseline_ref: 'b549951',
    baseline_coverage_report_ref: 'packages/agent/../../..',
    baseline_coverage_report_sha256: 'a'.repeat(64),
    baseline_functions: [{ identity: 'shape-only' }],
    new_functions: [],
    removed_functions: [],
    new_sources: [],
    removed_sources: [],
  };
  expect(() => assertCrapPlanPrerequisites(shapeOnlyPlan, root)).toThrow(/inside the Source repository/u);
});

test('final quality budget preflight rejects malformed, incomplete, non-exhaustive, non-executable, and wrong-baseline plans', async () => {
  const root = fixtureRoot();
  const planPath = path.join(root, 'plan.json');
  const plan = {
    schema: 'VidaCrapBudgetPlan/v1',
    baseline_ref: 'b549951',
    baseline_coverage_report_ref: 'packages/agent/coverage/bun-unified/coverage-final.json',
    baseline_coverage_report_sha256: 'a'.repeat(64),
    baseline_functions: [],
    new_functions: [],
    removed_functions: [],
    new_sources: [],
    removed_sources: [],
  };
  const cases: { name: string; bytes: string }[] = [
    { name: 'malformed JSON', bytes: '{' },
    {
      name: 'incomplete exact disposition arrays',
      bytes: JSON.stringify({ ...plan, removed_sources: undefined }),
    },
    { name: 'no baseline or removed function dispositions', bytes: JSON.stringify(plan) },
    { name: 'explicitly non-exhaustive plan', bytes: JSON.stringify({ ...plan, exhaustive: false }) },
    {
      name: 'explicitly non-executable plan',
      bytes: JSON.stringify({ ...plan, status: 'SOURCE_LINEAGE_ONLY_NON_EXECUTABLE_NOT_EXHAUSTIVE' }),
    },
    { name: 'wrong published baseline', bytes: JSON.stringify({ ...plan, baseline_ref: 'different-baseline' }) },
  ];

  for (const item of cases) {
    writeFileSync(planPath, item.bytes);
    process.env.VIDA_CRAP_BUDGET_PLAN = planPath;
    await expectRejection(readBudgetPlan(), /./u);
  }
});

test('final quality budget preflight rejects a missing frozen plan before creating run inventory', async () => {
  const root = fixtureRoot();
  const missingPath = path.join(root, 'missing-plan.json');
  process.env.VIDA_CRAP_BUDGET_PLAN = missingPath;
  const failure = await rejectionReason(readBudgetPlan());
  expect(failure).toBeInstanceOf(Error);
  expect((failure as Error).message).toContain('ENOENT');
  expect((failure as Error).message).toContain(missingPath);
});
