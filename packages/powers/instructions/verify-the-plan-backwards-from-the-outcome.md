---
instruction_id: verify-the-plan-backwards-from-the-outcome
title: Verify the plan backwards from the outcome
summary: The check starts from what has to be true for the goal and asks whether a task makes it true; effort and intent earn nothing.
capability_tags:
  - plan-implementation
pattern_tags:
  - code-review
conditions_applies_when: A plan is checked before it is executed.
conditions_does_not_apply_when: The code that a plan produced is being checked.
artifact_contract_output_type: plan-review
artifact_contract_required_data:
  - the outcome
  - the truths
  - the covering tasks
artifact_contract_verified_by: every truth is traced to a task and the gaps are listed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-plan-checker.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - product
---

# Verify the plan backwards from the outcome
Verify they WILL achieve the phase goal — do not credit effort or intent, only verifiable coverage.
Plan completeness =/= Goal achievement
What must be TRUE for the phase goal to be achieved?
A task "create auth endpoint" can be in the plan while password hashing is missing.
Are artifacts wired together, not just created in isolation?
FAIL the verification if any requirement ID from the roadmap is absent from all plans' `requirements` fields. This is a blocking issue, not a warning.
