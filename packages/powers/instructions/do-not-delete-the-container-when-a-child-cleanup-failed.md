---
instruction_id: do-not-delete-the-container-when-a-child-cleanup-failed
title: Do not delete the container when a child cleanup failed
summary: "When one of the inner removals fails, the outer directory is not deleted; the run stops and names what has to be resolved by hand."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - staged-exposure
conditions_applies_when: A cleanup removes several inner resources and then the container that holds them.
conditions_does_not_apply_when: Every inner removal succeeded.
artifact_contract_output_type: cleanup-refusal
artifact_contract_required_data:
  - the failed removal
  - the container that was kept
artifact_contract_verified_by: the container still exists and the failed removal is named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/remove-workspace.md
status: active
revision: 1
---

# Do not delete the container when a child cleanup failed
stop before deleting the workspace directory
because one or more git worktrees could not be removed
Resolve the failed worktree removal manually
then rerun the removal
