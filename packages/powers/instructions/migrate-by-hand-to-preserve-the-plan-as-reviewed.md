---
instruction_id: migrate-by-hand-to-preserve-the-plan-as-reviewed
title: Migrate by hand to preserve the plan as reviewed
summary: "A plan that predates the rule is migrated by adding the statements by hand, so the reviewed plan stays the reviewed plan."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A plan written before the rule exists is checked against it.
conditions_does_not_apply_when: The plan is written with the rule in force.
artifact_contract_output_type: plan-migration
artifact_contract_required_data:
  - the plan that was migrated
  - the statements that were added
artifact_contract_verified_by: the plan carries the statements and the rest of the reviewed plan is unchanged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/state-a-failing-direction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Migrate by hand to preserve the plan as reviewed
**Add the statements by hand.** Run the probe with `--raw`, and for each `missing` row open the named `plan` and `task` and add a `<fails_when>` after that command. This preserves the plan as reviewed.
Do this when the plan needs revising anyway; it discards any hand edits.
