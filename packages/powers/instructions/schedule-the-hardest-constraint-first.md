---
instruction_id: schedule-the-hardest-constraint-first
title: Schedule the hardest constraint first
summary: "The one constraint that makes everything else irrelevant is scheduled first, and an unfamiliar dependency gets a spike before the implementation."
capability_tags:
  - plan-implementation
pattern_tags:
  - risk-first-ordering
conditions_applies_when: The tasks of a phase are ordered.
conditions_does_not_apply_when: The phase has no constraint that dominates the rest.
artifact_contract_output_type: constraint-order
artifact_contract_required_data:
  - the hardest constraint
  - the task it was scheduled into
artifact_contract_verified_by: the hardest constraint is in the first two tasks
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-models-planning.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Schedule the hardest constraint first
Identify the single hardest constraint in this phase -- the one thing that, if it doesn't work, makes everything else irrelevant. Schedule that constraint as Task 1 or 2, not last. If the constraint involves an external API or unfamiliar library, add a spike/proof-of-concept task before the main implementation
