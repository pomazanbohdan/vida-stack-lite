---
instruction_id: revert-without-resetting-the-history
title: Revert without resetting the history
summary: "A rollback is made by reverting commits, never by resetting; a dirty tree stops the rollback before it starts, and the result is one commit."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: Committed work has to be taken back.
conditions_does_not_apply_when: The work was never committed.
artifact_contract_output_type: revert
artifact_contract_required_data:
  - the commits that were reverted
  - the single commit that records it
artifact_contract_verified_by: "the history was preserved, the tree was clean when the revert started and one commit records the rollback"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/undo.md
status: active
revision: 1
---

# Revert without resetting the history
**HARD CONSTRAINT: Use git revert --no-commit. NEVER use git reset (except for conflict cleanup as documented below).**
**Dirty-tree guard (run first, before any revert):**
Run `git status --porcelain`. If the output is non-empty, display the dirty files and abort:
Exit immediately — do not proceed to any revert operations.
Sort COMMITS in reverse chronological order (newest first).
After all reverts are staged successfully, create a single commit:
git reset --hard is NEVER used anywhere in this workflow
