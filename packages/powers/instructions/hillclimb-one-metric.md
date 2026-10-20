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
status: active
revision: 1
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
Accept only when the metric moves past noise and the gate stays green; otherwise revert the change in full.
A tweak that "might help" is not kept.
Log the row either way, kept or reverted.
Push past the first plateau: pivot category, combine near-misses, re-read the source, or try something more radical.
Correctness and simplicity outrank the number.
Revert a win that breaks behavior, and keep a simplification that holds the number.
Stop when the predicate is met, or when the remaining ideas are marginal and not worth their cost.
Do not relax the predicate to meet it, and do not quit while cheap untried hypotheses remain.
If you are stuck, surface it instead of spinning.
