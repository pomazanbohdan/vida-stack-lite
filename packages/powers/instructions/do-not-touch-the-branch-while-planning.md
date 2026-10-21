---
instruction_id: do-not-touch-the-branch-while-planning
title: Do not touch the branch while planning
summary: "Planning does not create, rename or switch branches: the branch identity belongs to whoever owns it."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A planning step is running in a repository with branches.
conditions_does_not_apply_when: The branch change was requested explicitly by the owner.
artifact_contract_output_type: branch-invariance
artifact_contract_required_data:
  - the branch that was left untouched
  - the owner of the branch identity
artifact_contract_verified_by: "no branch was created, renamed or switched during the planning step"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase.md
status: active
revision: 1
---

# Do not touch the branch while planning
Do not switch branches.
A phase rename in the plan document
is a plan-level change only — it does not mutate git branch names.
Branch identity belongs to the user.
