---
instruction_id: prove-the-branch-lost-nothing
title: Prove the branch lost nothing
summary: The published branch is checked for deleted paths and for commits that were dropped on the way.
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: A branch was rebuilt by replaying commits.
conditions_does_not_apply_when: The branch was created in one step.
artifact_contract_output_type: branch-integrity-report
artifact_contract_required_data:
  - the deletion count
  - the number of commits that landed
artifact_contract_verified_by: the deletion count is zero and every included commit landed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/pr-branch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Prove the branch lost nothing
That is data loss, not filtering — report it, do not tell the user to push, and rebuild the branch.
Every included commit landed — none dropped by a failed cherry-pick
