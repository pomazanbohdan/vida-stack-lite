---
instruction_id: keep-the-guard-and-the-step-it-protects-in-one-decision
title: Keep the guard and the step it protects in one decision
summary: "The check that protects a step and the step it protects form one decision: a failure of the check stops the run before the protected value is produced, and it is never treated as a default."
capability_tags:
  - harden-validation
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: A check guards the value that a later step consumes.
conditions_does_not_apply_when: The value is produced without a check.
artifact_contract_output_type: guard-decision
artifact_contract_required_data:
  - the check
  - the value it protects
  - the failure branch
artifact_contract_verified_by: a failed check stops the run before the protected value is produced
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/code-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep the guard and the step it protects in one decision
The guard and the extraction it protects must run as one shell control-flow decision - a prose sentence between two fenced blocks is not a guard, since fenced blocks do not share shell state.
Anything other than the literal string `true` (including an empty `DEPTH_OK`, which is what a crashed or missing resolver produces) is treated as failure, and the failure branch exits before any extraction can run:
