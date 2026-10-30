---
instruction_id: strip-the-enterprise-ceremony-from-the-plan
title: Strip the enterprise ceremony from the plan
summary: "Team structures, matrices, sprint ceremonies, time estimates and documentation for its own sake are removed from the plan."
capability_tags:
  - plan-implementation
pattern_tags:
  - code-minimization
conditions_applies_when: A plan is written for one person and one implementer.
conditions_does_not_apply_when: The work genuinely runs across a team that owns the ceremonies.
artifact_contract_output_type: plan-content
artifact_contract_required_data:
  - the removed ceremony
  - the plan that remains
artifact_contract_verified_by: "no team structure, matrix, ceremony or time estimate remains in the plan"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-guidance.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Strip the enterprise ceremony from the plan
**Anti-enterprise patterns (delete if seen):** team structures, RACI matrices, sprint ceremonies, time estimates in human units, complexity/difficulty as scope justification, documentation for documentation's sake
