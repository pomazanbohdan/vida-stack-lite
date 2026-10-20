---
instruction_id: batch-same-shape-tasks
title: Batch small same-shape tasks into one dispatch
summary: "Send repeated small edits of the same kind as one brief to one implementer, and review the resulting diff as a single unit."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: The plan lists several small edits of the same kind.
conditions_does_not_apply_when: "Each task needs its own judgment, its own tests, or its own review surface."
artifact_contract_output_type: batched-dispatch
artifact_contract_required_data:
  - files
  - changes
  - shared constraints
  - review
artifact_contract_verified_by: one diff reviewed as a unit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=superpowers; license=MIT; revision=bb92a77741419a4ab5f06e711a283343f1ada0c3; path=skills/subagent-driven-development/SKILL.md
status: active
revision: 1
---

# Batch small same-shape tasks into one dispatch
Batch small same-shape work.
When the plan lists several tasks that are each a small, independent edit of the same kind — the same one-line fix, constant change, or field addition repeated across files — do not dispatch one subagent per task.
Compose ONE dispatch brief listing every file and its change, send the whole batch to a single subagent, and review its diff as one unit.
Reserve one-dispatch-per-task for work that needs its own judgment, its own tests, or its own review surface.
If the brief lists several files each with its own change, check the diff against that list file by file: every listed file must have its corresponding hunk.
A listed file the diff never touches is a Missing finding, no matter how clean the rest of the batch looks.
Do not add a task with its own tests to a batch.
Do not add a task with its own review surface to a batch.
Do not treat a batch as permission to widen the scope.
Stop the batch if the edits stop being the same shape.
Everything you paste into a dispatch prompt stays resident in your context for the rest of the session and is re-read on every later turn.
Warnings or other noise in the implementer's reported test output are findings — test output should be pristine.
Each task ends with an independently testable deliverable.
Split only where a reviewer could meaningfully reject one task while approving its neighbor.
