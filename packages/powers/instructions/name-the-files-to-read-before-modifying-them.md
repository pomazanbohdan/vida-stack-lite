---
instruction_id: name-the-files-to-read-before-modifying-them
title: Name the files to read before modifying them
summary: "A task that will change a file names the files to read first, so the implementer knows the current state and the conventions."
capability_tags:
  - execute-plan
pattern_tags:
  - implementation-planning
conditions_applies_when: A task will modify an existing file.
conditions_does_not_apply_when: The task creates a new file from scratch.
artifact_contract_output_type: task-read-first
artifact_contract_required_data:
  - the files to read before the change
artifact_contract_verified_by: the task names the files to read before it modifies anything
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/phase-prompt.md
status: active
revision: 1
---

# Name the files to read before modifying them
**Bad: Missing read_first (executor modifies files it hasn't read)**
Executor doesn't know current state or conventions
