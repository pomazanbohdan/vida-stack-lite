---
instruction_id: refuse-to-mark-the-work-planned-when-an-item-has-no-plan
title: Refuse to mark the work planned when an item has no plan
summary: The planning step is not closed while a requirement or a locked decision is invisible to every plan.
capability_tags:
  - plan-implementation
pattern_tags:
  - matrix-coverage-audit
conditions_applies_when: The coverage of the plans against the tracked requirements and decisions is checked.
conditions_does_not_apply_when: Nothing is tracked against the plans.
artifact_contract_output_type: coverage-gate
artifact_contract_required_data:
  - the requirement or decision that no plan covers
  - the options offered
artifact_contract_verified_by: the work was not marked planned while an uncovered tracked item remained
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase.md
status: active
revision: 1
---

# Refuse to mark the work planned when an item has no plan
Extract requirement IDs claimed by plans
Re-plan to include missing requirements (recommended)
Move uncovered requirements to next phase
Catching that now beats discovering it after thousands of dollars of execution.
