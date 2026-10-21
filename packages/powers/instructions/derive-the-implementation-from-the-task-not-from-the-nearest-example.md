---
instruction_id: derive-the-implementation-from-the-task-not-from-the-nearest-example
title: "Derive the implementation from the task, not from the nearest example"
summary: A pattern is copied only when the task carries the same constraint that produced it.
capability_tags:
  - execute-plan
pattern_tags:
  - project-conventions-first
conditions_applies_when: An existing pattern in another file or phase looks like the thing to copy.
conditions_does_not_apply_when: The constraint behind the pattern is already the task constraint.
artifact_contract_output_type: pattern-decision
artifact_contract_required_data:
  - the constraint the pattern satisfies
  - the constraint of this task
artifact_contract_verified_by: the pattern was taken only when the constraint matched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-models-execution.md
status: active
revision: 1
---

# Derive the implementation from the task, not from the nearest example
Before copying a pattern from another file or phase, decompose WHY that pattern exists: What constraint does it satisfy? Does your current task have the same constraint? If not, the pattern may be cargo cult. Build your implementation from the task's actual requirements, not from the nearest existing example. When in doubt, the plan's `<action>` steps define what to build -- derive the implementation from those, not from adjacent code.
