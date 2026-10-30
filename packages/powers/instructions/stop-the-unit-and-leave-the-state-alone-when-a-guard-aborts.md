---
instruction_id: stop-the-unit-and-leave-the-state-alone-when-a-guard-aborts
title: Stop the unit and leave the state alone when a guard aborts
summary: "When a guard aborts the operation, the commit is not attempted, the staged files are not cleared, the following steps are not run, and the abort message is carried in the report."
capability_tags:
  - harden-validation
pattern_tags:
  - automated-enforcement
conditions_applies_when: A guard refuses the operation the unit was about to perform.
conditions_does_not_apply_when: The operation failed for a reason the guard did not detect.
artifact_contract_output_type: guard-abort
artifact_contract_required_data:
  - the abort message
  - the state that was left untouched
artifact_contract_verified_by: the staged files are still there and no later step of the unit ran
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Stop the unit and leave the state alone when a guard aborts
If the guard aborts, do NOT attempt the commit, do NOT remove the staged files, and do NOT continue subsequent tasks
Surface the abort message
and stop
