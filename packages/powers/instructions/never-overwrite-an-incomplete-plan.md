---
instruction_id: never-overwrite-an-incomplete-plan
title: Never overwrite an incomplete plan
summary: "Before writing a plan or a task list, check for unchecked tasks, update the same work in place and ask about different work."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A plan document or a task list file may already exist.
conditions_does_not_apply_when: No plan file exists yet.
artifact_contract_output_type: plan-conflict-report
artifact_contract_required_data:
  - the existing plan
  - its unchecked tasks
  - the decision taken
artifact_contract_verified_by: no incomplete plan was overwritten without an explicit decision
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/planning-and-task-breakdown/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=.claude/commands/plan.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/add-todo.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/check-todos.md
status: active
revision: 2
---

# Never overwrite an incomplete plan

**Never overwrite an incomplete plan.**
Before writing the plan document or the task list, check whether they already exist and still contain unchecked tasks:

- Same work being replanned (the user asked to revise or extend this plan) → update the existing files in place.
- Different work → **stop and ask.** The unchecked tasks may be mid-build in another session. Do not delete, overwrite, or rename the existing files on your own; present the conflict and let the user decide (finish the old plan first, explicitly discard it, or tell you where the new plan should go).

The same rule applies to an external task list target: never bulk-close or delete another plan's open tracker items to make room for new ones.

Save the plan to tasks/plan.md and task list to tasks/todo.md.
If tasks/plan.md or tasks/todo.md already exists with unchecked tasks for different work, stop and ask before writing — never silently overwrite an incomplete plan.
If the read that would produce the new content failed or returned an unusable value, do NOT touch the existing content - leave it exactly as-is and continue to the next step.
A partial or malformed result must never overwrite a good existing section.
