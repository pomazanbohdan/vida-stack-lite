---
instruction_id: give-the-plan-two-to-three-tasks
title: Give the plan two to three tasks
summary: "A plan carries two or three tasks; more than three, or a task that touches many files, means the plan is split."
capability_tags:
  - plan-implementation
pattern_tags:
  - resource-bounds
conditions_applies_when: The work is grouped into plans.
conditions_does_not_apply_when: The plan is already within the bound.
artifact_contract_output_type: plan
artifact_contract_required_data:
  - the task count
  - the file count
artifact_contract_verified_by: no plan exceeds the task bound and the oversized ones were split
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-planner.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Give the plan two to three tasks
2-3 tasks per plan. ALWAYS split if: >3 tasks, multiple subsystems, or any task touching >5 files.
Plan with 5+ tasks (quality degrades)
Plan with 15+ file modifications
