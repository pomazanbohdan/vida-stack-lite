---
instruction_id: resume-at-the-first-step-that-is-missing
title: Resume at the first step that is missing
summary: A resumed run continues at the first step that is actually missing and skips none of the gates.
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: A run is resuming a unit of work that was interrupted.
conditions_does_not_apply_when: The run starts a unit of work that has not begun.
artifact_contract_output_type: resume-plan
artifact_contract_required_data:
  - the recorded state
  - the step to continue at
artifact_contract_verified_by: the run continued at the first step that was actually missing and did not skip the gates
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Resume at the first step that is missing
branch on the owner's answer, never on a status word
