---
instruction_id: refuse-to-assemble-a-partial-user-story
title: Refuse to assemble a partial user story
summary: "The actor, the capability and the outcome are all required; a story that lacks one is not written."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: A user story is assembled.
conditions_does_not_apply_when: The story already carries all three parts.
artifact_contract_output_type: user-story
artifact_contract_required_data:
  - the actor
  - the capability
  - the outcome
artifact_contract_verified_by: all three parts are present and the goal line stays on one line
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/user-story-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Refuse to assemble a partial user story
All three must be present. Refuse to assemble a partial story
The `**Goal:**` line stays on a single line (no line breaks inside the story). If the story is longer than ~120 chars, it should be split into multiple phases via SPIDR
The `**Mode:** mvp` line is added immediately below `**Goal:**`. If `**Mode:**` already exists, it is replaced (not duplicated)
