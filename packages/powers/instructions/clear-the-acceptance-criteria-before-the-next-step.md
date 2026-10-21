---
instruction_id: clear-the-acceptance-criteria-before-the-next-step
title: Clear the acceptance criteria before the next step
summary: "The acceptance criteria of a finished unit are checked before the next unit starts: a failing criterion is fixed and re-checked, and a criterion that cannot be satisfied is recorded as a deviation — never silently skipped."
capability_tags:
  - execute-plan
pattern_tags:
  - testable-criteria
  - acceptance-criteria-timing-policy
conditions_applies_when: A unit declares acceptance criteria and the implementation has just finished them.
conditions_does_not_apply_when: The unit declares no acceptance criteria.
artifact_contract_output_type: acceptance-criteria-gate
artifact_contract_required_data:
  - the criteria checked
  - the result of each check
  - the deviations recorded
artifact_contract_verified_by: every criterion passed before the next unit started and no failing criterion was skipped
compatibility_excludes:
  - judge-the-acceptance-criteria-at-review-not-during-implementation
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-plan.md
status: active
revision: 2
---

# Clear the acceptance criteria before the next step
After completing each task, if it has `<acceptance_criteria>` (inline or resolved), you MUST run a verification loop before proceeding:
For each criterion: execute the grep, file check, or CLI command that proves it passes
If ANY criterion fails: fix the implementation immediately, then re-run ALL criteria
Repeat until all criteria pass — you are BLOCKED from starting the next task until this gate clears
If a criterion cannot be satisfied after 2 fix attempts, log it as a deviation with reason — do NOT silently skip it
This is not advisory. A task with failing acceptance criteria is an incomplete task.
