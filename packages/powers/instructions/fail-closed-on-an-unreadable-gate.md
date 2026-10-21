---
instruction_id: fail-closed-on-an-unreadable-gate
title: Fail closed on an unreadable gate
summary: "A gate whose record cannot be read blocks the run: \"I cannot tell\" is never read as \"nothing is wrong\"."
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: A gate has to be evaluated and its record cannot be read.
conditions_does_not_apply_when: The record was read and the gate evaluated.
artifact_contract_output_type: gate-read-failure
artifact_contract_required_data:
  - the record that could not be read
  - the block that was raised
artifact_contract_verified_by: the run stopped instead of declaring the gate satisfied
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 1
---

# Fail closed on an unreadable gate
A missing file is not an empty result.
is "I cannot tell", never "no conflicts".
Refusing to declare convergence on an unverifiable gate.
