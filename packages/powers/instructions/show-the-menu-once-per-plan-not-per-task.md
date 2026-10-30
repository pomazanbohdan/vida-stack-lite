---
instruction_id: show-the-menu-once-per-plan-not-per-task
title: "Show the menu once per plan, not per task"
summary: "The menu appears once per plan, and the run stops only when the person actually says something."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A person drives the execution of a plan task by task.
conditions_does_not_apply_when: The plan runs unattended.
artifact_contract_output_type: menu
artifact_contract_required_data:
  - the options
  - the chosen option
artifact_contract_verified_by: the menu appeared once per plan and the run stopped only when the person actually said something
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/detail/elaboration.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Show the menu once per plan, not per task
Once per plan (not per task), present a 4-option menu (execute / review-first / skip / stop) before starting that plan's tasks.
Once executing, tasks run one at a time with only a brief pause after each — the agent stops mid-plan only if the user actually types something, it does not re-show the menu.
After all plans, proceed to verification as normal.
**If "Review first":** Read and display the full plan file. Ask again: Execute, Modify, Skip.
