---
instruction_id: keep-one-task-per-file
title: Keep one task per file
summary: A task names the file it changes; tightly coupled changes stay in one task rather than being split artificially.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The work is split into tasks.
conditions_does_not_apply_when: The work is one task.
artifact_contract_output_type: task-list
artifact_contract_required_data:
  - the tasks
  - the file each task changes
  - the action
  - the rationale
artifact_contract_verified_by: "each task names one file, or a set of files that cannot be split"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/plan-template.md
status: active
revision: 1
---

# Keep one task per file
Tasks: backtick-quoted file path -- action -- rationale. Prefer one task per file; group tightly-coupled changes when splitting would be artificial.
