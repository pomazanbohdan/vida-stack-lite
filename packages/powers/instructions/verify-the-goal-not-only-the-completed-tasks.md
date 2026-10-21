---
instruction_id: verify-the-goal-not-only-the-completed-tasks
title: "Verify the goal, not only the completed tasks"
summary: "The verification asks whether the goal was achieved, and every requirement identifier is accounted for — a full task list is not the same as a reached goal."
capability_tags:
  - verify-work-results
pattern_tags:
  - completion-criteria
conditions_applies_when: A finished unit is verified against the goal it was meant to reach.
conditions_does_not_apply_when: The check is a mechanical test of one function.
artifact_contract_output_type: goal-verification
artifact_contract_required_data:
  - the goal
  - the requirement identifiers
  - the accounting of every identifier
artifact_contract_verified_by: the verdict names the goal and every requirement identifier is accounted for
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/verify-phase-goal.md
status: active
revision: 1
---

# Verify the goal, not only the completed tasks
Verify the phase achieved its GOAL, not just completed tasks.
Cross-reference requirement IDs
every ID MUST be accounted for.
