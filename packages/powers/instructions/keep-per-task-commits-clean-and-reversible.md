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
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build/step-01-clarify-and-route.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-executor.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-code-fixer.md
status: active
revision: 3
---

# Keep the per-task commits clean and reversible
Establish a clean baseline.
Run `git status --porcelain`.
If there are uncommitted changes outside the expected planning artifacts (`SPEC.md`, `docs/SPEC.md`, `spec/*`, `tasks/plan.md`, `tasks/todo.md`), stop and ask the user to commit, stash, or confirm how to handle them.
Autonomous per-task commits must not absorb unrelated local work, or the clean-rollback guarantee breaks.
Stage only the files that task touched plus its task-status update — never `git add -A` blindly — and make one commit per task so any point is a clean rollback.

Does the current branch make sense for this intent — considering its name and recent history? If the tree is dirty or the branch is an obvious mismatch, HALT and ask the human before proceeding. If version control is unavailable, skip this check.

Stage task-related files individually (NEVER `git add .` or `git add -A`):
DO commit each fix atomically — one commit per finding, listing ALL modified file paths after the commit message.
