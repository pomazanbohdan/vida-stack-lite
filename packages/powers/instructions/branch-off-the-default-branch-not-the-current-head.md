---
instruction_id: branch-off-the-default-branch-not-the-current-head
title: "Branch off the default branch, not the current head"
summary: A new branch is forked from the default branch so consecutive units of work do not compound.
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A branch is created for a unit of work.
conditions_does_not_apply_when: The run does not create branches.
artifact_contract_output_type: branch
artifact_contract_required_data:
  - the base the branch was forked from
artifact_contract_verified_by: the branch was forked from the default branch and the commits stayed on it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
status: active
revision: 1
---

# Branch off the default branch, not the current head
Fork the new phase branch off `origin/HEAD` (the project's default branch), not the current HEAD
otherwise consecutive phases compound and stay unpushed
All subsequent commits go to this branch. User handles merging.
