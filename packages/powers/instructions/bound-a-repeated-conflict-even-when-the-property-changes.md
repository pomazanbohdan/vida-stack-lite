---
instruction_id: bound-a-repeated-conflict-even-when-the-property-changes
title: Bound a repeated conflict even when the property changes
summary: "A conflict that the same loop cannot resolve does not spend the retry budget; it is put to the owner, and a repeated conflict is bounded by count as well as by name."
capability_tags:
  - review-code
pattern_tags:
  - stop-on-conflict
conditions_applies_when: A repair step keeps hitting a constraint that the plan itself encodes.
conditions_does_not_apply_when: The conflict is resolved by the first repair.
artifact_contract_output_type: conflict-escalation
artifact_contract_required_data:
  - the conflict
  - the alternatives
  - the owner question
artifact_contract_verified_by: the conflict was put to the owner and the retry budget was not spent on it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch/steps/plan-checker-loop.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick/steps/plan-checker-loop.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Bound a repeated conflict even when the property changes
a conflict is not resolvable by re-running the same loop, so it must not consume retry budget
Do NOT increment `iteration_count` and do NOT re-spawn the checker yet
Present the conflict table and its alternatives to the user and ask which to take
Accepting the plan with the blocker still open is NOT offered here
A conflict naming the SAME `required_property` twice in a row (no successful revision in between) is a stall
alternating property names would otherwise never trip the repeat rule and the path would be unbounded
Stop re-spawning and route it to the same iteration-count check below
