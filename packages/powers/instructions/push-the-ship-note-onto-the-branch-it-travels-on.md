---
instruction_id: push-the-ship-note-onto-the-branch-it-travels-on
title: Push the ship note onto the branch it travels on
summary: "The note that records the shipping action is committed and pushed onto the same branch as the change, so it is not lost when that branch is deleted."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - branch-integration
conditions_applies_when: A record of the shipping action is committed next to the change that is being shipped.
conditions_does_not_apply_when: The record is kept only locally by design.
artifact_contract_output_type: ship-note
artifact_contract_required_data:
  - the note
  - the branch it is pushed to
  - where it ends up after the merge
artifact_contract_verified_by: the note is pushed onto the branch that carries the change into the default branch
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ship.md
status: active
revision: 1
---

# Push the ship note onto the branch it travels on
If `commit_docs` is true, commit the ship-note AND push it onto the PR branch so it reaches the default branch when the PR merges.
Without this push the ship-note commit stays local-only and is silently discarded when the branch is deleted on merge (#2138).
