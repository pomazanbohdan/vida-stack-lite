---
instruction_id: write-an-action-with-concrete-values-not-alignments
title: "Write an action with concrete values, not alignments"
summary: "An action names the exact identifiers, parameters, outputs, paths and arguments; \"align X with Y\" is not an action."
capability_tags:
  - plan-implementation
pattern_tags:
  - output-formatting
conditions_applies_when: A task action is written for the implementer.
conditions_does_not_apply_when: The action is a mechanical edit with a fixed value.
artifact_contract_output_type: task-action
artifact_contract_required_data:
  - the exact identifiers
  - the parameters
  - the expected output
artifact_contract_verified_by: the action names concrete values instead of an alignment between two things
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

# Write an action with concrete values, not alignments
Include CONCRETE values: exact identifiers, parameters, expected outputs, file paths, command arguments. Never say "align X with Y" without specifying the exact target state.
