---
instruction_id: never-let-a-fallback-turn-a-missing-input-into-a-passing-check
title: Never let a fallback turn a missing input into a passing check
summary: A fallback that substitutes a default for a missing input turns a failed read into a passing comparison; the failure has to propagate or the check has to guard the input explicitly.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A check reads an input that may be missing and compares the result against another value.
conditions_does_not_apply_when: The absence of the input is the semantic default and the result is not compared against anything.
artifact_contract_output_type: fallback-free-check
artifact_contract_required_data:
  - the fallback that was removed or kept
  - "the reason it is safe to keep, if it is kept"
artifact_contract_verified_by: "a missing input fails the check instead of making it pass, and any surviving fallback is justified"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Never let a fallback turn a missing input into a passing check
`2>/dev/null || echo "0"` in an assignment that feeds a comparison converts any failure into a passing gate that measures nothing.
If files don't exist (wrong path, etc.), both sides become `"0"`. Comparison passes. Gate certifies parity while measuring nothing.
**Good - let failure propagate:**
**Good - explicit guard:**
**When `|| echo "default"` is acceptable:** only when absence is semantically the default AND the result is NOT used in a comparison that should detect absence.
