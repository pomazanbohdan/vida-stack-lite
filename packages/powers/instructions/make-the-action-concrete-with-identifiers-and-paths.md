---
instruction_id: make-the-action-concrete-with-identifiers-and-paths
title: Make the action concrete with identifiers and paths
summary: "The action of a task names the exact identifiers, file paths, signatures and values it touches, and never says to align one thing with another without stating the target state."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The action of a task is being written.
conditions_does_not_apply_when: The action is a research question that is not yet decided.
artifact_contract_output_type: task-action
artifact_contract_required_data:
  - the identifiers the action names
  - the target state it specifies
  - what it does not contain
artifact_contract_verified_by: "the action names exact identifiers, paths and values and states the target"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/plan-md.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Make the action concrete with identifiers and paths
- Concrete instructions with exact identifiers, file paths, function signatures, and expected values. Never says "align X with Y" without specifying the target state. Never contains fenced code blocks or full implementations.
