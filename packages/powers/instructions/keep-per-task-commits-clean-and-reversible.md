---
instruction_id: keep-per-task-commits-clean-and-reversible
title: Keep the per-task commits clean and reversible
summary: "The tree starts clean, each task stages only its own files, and one commit per task leaves every point a clean rollback."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: A run makes one commit per task and the working tree may hold unrelated work.
conditions_does_not_apply_when: The change is a single edit that gets no commit of its own.
artifact_contract_output_type: commit-sequence
artifact_contract_required_data:
  - the baseline state of the working tree
  - the files staged for each task
  - one commit per task
artifact_contract_verified_by: no commit carries files that another task did not touch
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=.claude/commands/build.md
status: active
revision: 1
---

# Keep the per-task commits clean and reversible
Establish a clean baseline.
Run `git status --porcelain`.
If there are uncommitted changes outside the expected planning artifacts (`SPEC.md`, `docs/SPEC.md`, `spec/*`, `tasks/plan.md`, `tasks/todo.md`), stop and ask the user to commit, stash, or confirm how to handle them.
Autonomous per-task commits must not absorb unrelated local work, or the clean-rollback guarantee breaks.
Stage only the files that task touched plus its task-status update — never `git add -A` blindly — and make one commit per task so any point is a clean rollback.
