---
instruction_id: hillclimb-one-metric
title: Hillclimb one metric
summary: "Improve one measurable thing against a target: one change, one measurement, keep or revert, and never claim a win from code inspection."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: There is a measurable metric to improve without changing functional behavior.
conditions_does_not_apply_when: "The metric cannot be measured reproducibly, or the target is not defined yet."
artifact_contract_output_type: improvement-log
artifact_contract_required_data:
  - metric
  - baseline
  - steps
  - measurements
  - reverted attempts
artifact_contract_verified_by: the recorded measurement runs for every kept step
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/hillclimb.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Hillclimb one metric
You own the metric and the experiment's integrity.
Core discipline: one change, one measurement, keep or revert.
Never stack untested changes, and never claim a win from code inspection.
Ground the workload and architecture before choosing the metric.
Name the realistic workload dimensions that can move the result: data size, history, state, concurrency.
Select a case that reproduces the user's complaint; if no case reproduces it, fix the repro instead of hillclimbing.
Fix one metric, the direction that counts as better, and a checkable stop predicate that pairs a target with a floor on attempts so a lucky early win cannot end the run.
Use the user's numbers when given, otherwise agree them.
Build the measurement harness, prove its sensitivity, then freeze it.
Run contrasting realistic workloads and confirm the target case reproduces the symptom while easier cases separate as expected.
If the harness cannot distinguish them, revise the workload or metric.
Once frozen, one repeatable command emits the metric, sampled enough to clear the noise: a median of N, not a single run.
Record the baseline metric and a green run of the regression gate before any change.
Open a decision log with one row per attempt: id, hypothesis, change, before, after, delta, tests, verdict, note.
Read it before each attempt and keep it out of the tree.
Ground each hypothesis in the architecture model, so it names a specific mechanism, not "try memoizing something".
Measure before and after with the frozen harness, and run the regression gate.
Re-measure the way you measured the baseline: same command, same conditions, same fixed budget (wall-clock, sample count, or request count).
A baseline taken on a cold cache against a result taken on a warm one measures the cache, not your change.
Change one thing at a time.
Three optimizations landed together produce one number, and you cannot attribute it.
If they must ship together, measure each in isolation first.
Beat the noise, not just the mean.
Repeat the measurement and compare the delta against run-to-run variance.
A 3% gain inside ±5% variance is not a gain; it is a different sample.
Accept only when the metric moves past noise and the gate stays green; otherwise revert the change in full.
"Neutral" is a revert, not a keep.
This is the step teams skip: the change is already written, throwing it away feels wasteful, so it lands unmeasured, and the codebase accretes complexity that never bought anything.
Code you keep, you maintain forever.
Make it pay for itself.
Correctness gates the metric.
The suite stays green *and* the number moves.
An "optimization" that wins by dropping work the product needed (skipping a validation, caching something that must be fresh, removing an `await` that was load-bearing) is a regression, not a win.
A tweak that "might help" is not kept.
Log the row either way, kept or reverted.
Reverted work leaves no trace in git history, which is exactly why the same dead idea gets tried again next quarter.
Keep a short ledger so a discarded idea stays discarded:

| Idea | Baseline → Result | Verdict | Why |
|---|---|---|---|
| Memoize the row component | INP 240ms → 235ms | reverted | Inside noise (±15ms). Rows weren't the bottleneck. |
| Virtualize the list | INP 240ms → 90ms | kept | Long tasks gone from the trace. |
| Preconnect to the API origin | LCP 2.8s → 2.8s | reverted | Already same-origin. |

What matters is that the next person (or the next agent) reads it before proposing an experiment, and doesn't re-run one that already failed.
Push past the first plateau: pivot category, combine near-misses, re-read the source, or try something more radical.
Correctness and simplicity outrank the number.
Revert a win that breaks behavior, and keep a simplification that holds the number.
Stop when the predicate is met, or when the remaining ideas are marginal and not worth their cost.
Do not relax the predicate to meet it, and do not quit while cheap untried hypotheses remain.
If you are stuck, surface it instead of spinning.
