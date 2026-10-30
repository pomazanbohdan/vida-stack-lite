---
instruction_id: derive-the-must-haves-goal-backward
title: Derive the must-haves goal-backward
summary: "The criteria are derived from the goal, because a finished task is not an achieved goal."
capability_tags:
  - plan-implementation
pattern_tags:
  - working-backwards
conditions_applies_when: The verification criteria of a plan are written.
conditions_does_not_apply_when: The criteria are given by the caller.
artifact_contract_output_type: must-haves
artifact_contract_required_data:
  - the observable truths
  - the artifacts
  - the connections between them
artifact_contract_verified_by: the criteria are derived from the goal and name what must actually work
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/phase-prompt.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Derive the must-haves goal-backward
Task completion ≠ Goal achievement. A task "create chat component" can complete by creating a placeholder.
The `must_haves` field captures what must actually work, enabling verification to catch gaps before they compound.
