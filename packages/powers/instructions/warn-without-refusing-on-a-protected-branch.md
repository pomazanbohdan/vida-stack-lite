---
instruction_id: warn-without-refusing-on-a-protected-branch
title: Warn without refusing on a protected branch
summary: The run says that the branch is protected and continues; the warning is not a veto over the work.
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - risk-first-ordering
conditions_applies_when: The work continues on a branch that is protected.
conditions_does_not_apply_when: The branch is not protected.
artifact_contract_output_type: protected-branch-warning
artifact_contract_required_data:
  - the branch
  - whether it is protected
  - the fact that the run continued
artifact_contract_verified_by: the warning was printed and the work still ran
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/protected-branch.md
status: active
revision: 1
---

# Warn without refusing on a protected branch
It warns without refusing execution
still runs on whatever branch it started on.
