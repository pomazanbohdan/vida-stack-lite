---
instruction_id: fail-the-assertion-when-the-evidence-is-uncertain
title: Fail the assertion when the evidence is uncertain
summary: "No partial credit, the burden of proof sits on a passing grade, and an outcome that is only technically satisfied is a failure."
capability_tags:
  - design-experiments
pattern_tags:
  - verification-before-completion
conditions_applies_when: A check has to return a verdict on what an output produced.
conditions_does_not_apply_when: The check reports a measurement and no judgement is involved.
artifact_contract_output_type: expectation-verdicts
artifact_contract_required_data:
  - the verdict per expectation
  - the evidence cited for each verdict
artifact_contract_verified_by: every passing verdict carries quoted evidence and every uncertain one is failed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/references/grader.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/uat-passed-predicate.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/spec-phase-prohibition-probe.md
status: active
revision: 2
---

# Fail the assertion when the evidence is uncertain
No partial credit. Each expectation is pass or fail.
The burden of proof is on a passing grade, so when the evidence is uncertain the expectation fails.
Pass only when there is clear evidence the expectation holds and the evidence reflects substance rather than surface compliance, so a file that exists but holds only placeholders fails a content expectation.
Fail when no evidence is found, the evidence contradicts the expectation, or the assertion is technically satisfied while the underlying outcome is wrong.
existence alone never passes a content claim.
Cite the evidence every time by quoting a line, naming a file with its path, or pointing to a tool call by its index and arguments.
No silent defaults. If a file or the transcript genuinely cannot be read, mark the affected expectations failed with that as the evidence rather than guessing.
Returns `passed: true` only when at least one check exists AND all checks pass AND no blockers — fail-closed, no vacuous pass.
A heading block with no column-0 `result:` line emits `result:'missing'` (blocker); test items are never silently dropped.
A well-formed but unwired `test`-tier prohibition MUST fail closed at verify time — never a silent pass.
a partial, invalid, or absent descriptor falls through to the producer's existing fail-closed locate, never a silent green.
