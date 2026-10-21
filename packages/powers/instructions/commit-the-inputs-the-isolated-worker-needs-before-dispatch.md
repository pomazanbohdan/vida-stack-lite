---
instruction_id: commit-the-inputs-the-isolated-worker-needs-before-dispatch
title: Commit the inputs the isolated worker needs before dispatch
summary: "The plan and the artifacts the phase produced are committed to the branch before the worker is dispatched, so the isolated checkout inherits them; a file counts only when it exists on disk."
capability_tags:
  - isolate-workspace
pattern_tags:
  - worktree-isolation
conditions_applies_when: A worker runs in an isolated checkout and has to read the plan and the phase artifacts.
conditions_does_not_apply_when: The worker runs in the same checkout as the plan.
artifact_contract_output_type: pre-dispatch-commit
artifact_contract_required_data:
  - the committed artifacts
  - the branch head they were committed at
artifact_contract_verified_by: the isolated checkout inherits the artifacts at its head and only files that exist were committed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick/steps/worktree-pre-dispatch-commit.md
status: active
revision: 1
---

# Commit the inputs the isolated worker needs before dispatch
This ensures the worktree inherits these artifacts at its branch HEAD
so the executor can read them via a worktree-rooted path
mode flag alone is not proof the file exists
the plan is always in scope
ERROR: pre-dispatch artifact commit failed
Aborting before executor dispatch
