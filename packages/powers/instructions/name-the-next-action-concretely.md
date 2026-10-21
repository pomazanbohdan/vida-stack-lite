---
instruction_id: name-the-next-action-concretely
title: Name the next action concretely
summary: "The next action is a specific step with a location, not a phrase such as \"continue investigating\"."
capability_tags:
  - execute-plan
pattern_tags:
  - completion-criteria
conditions_applies_when: The current focus of a session is recorded.
conditions_does_not_apply_when: The session has no next step.
artifact_contract_output_type: next-action
artifact_contract_required_data:
  - the concrete next step
  - the place it happens
artifact_contract_verified_by: the next action names a concrete step and a location
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/DEBUG.md
status: active
revision: 1
---

# Name the next action concretely
`next_action`: must be concrete and actionable — bad: "continue investigating"; good: "Add logging at line 47 of auth.js to observe token value before jwt.verify()"
