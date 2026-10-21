---
instruction_id: one-primary-next-action-with-the-alternatives-secondary
title: "One primary next action, with the alternatives secondary"
summary: One next action is proposed as the primary and the alternatives are listed behind it.
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - concise-communication
conditions_applies_when: The next steps are presented to the user.
conditions_does_not_apply_when: Only one step exists.
artifact_contract_output_type: next-action-list
artifact_contract_required_data:
  - the primary next action
  - the secondary alternatives
artifact_contract_verified_by: exactly one action is marked primary
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/universal-anti-patterns.md
status: active
revision: 1
---

# One primary next action, with the alternatives secondary
Do not suggest multiple next actions without clear priority -- one primary suggestion, alternatives listed secondary
Do not create artifacts the user did not approve -- always confirm before writing new planning documents
Do not modify files outside the workflow's stated scope -- check the plan's files_modified list
