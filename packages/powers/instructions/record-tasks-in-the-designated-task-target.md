---
instruction_id: record-tasks-in-the-designated-task-target
title: Record tasks in the designated task target
summary: "Write the checklist file by default, and when the project names a tracker create one tracker item per task and keep the plan document as an index."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: "The plan's tasks have to be recorded somewhere the project will read."
conditions_does_not_apply_when: The tasks are already recorded in the designated target.
artifact_contract_output_type: task-target-record
artifact_contract_required_data:
  - the designated target
  - the tracker items
  - the note in the plan document
artifact_contract_verified_by: the tasks exist only in the designated target and the plan document points at them
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/planning-and-task-breakdown/SKILL.md
status: active
revision: 1
---

# Record tasks in the designated task target

The task list target is where tasks and checkpoints are recorded.

- **Default: a checklist-style markdown file.** This is the convention the build command and other downstream tooling expect. Use it unless the project says otherwise.
- **External tracker:** if the project's agent rules (`CLAUDE.md`, `AGENTS.md`, etc.) or the user designate an issue tracker (e.g. GitHub Issues, Jira, Linear, `bd`/beads), create one tracker item per task instead of writing the checklist file. Map the Step 4 structure onto the tracker's fields: acceptance criteria and verification steps in the item body, dependencies via the tracker's linking mechanism (`bd dep add`, "blocked by", etc.). Record Step 5 checkpoints as tracker items too, or as a checklist in the plan document if the tracker has no natural equivalent.

When using an external tracker, note it in the plan document (e.g. "Tasks tracked in Linear project FOO") so downstream steps and future sessions know where to look, and keep the plan document's Task List section as an ordered index of tracker item IDs or links rather than a duplicate checklist.
