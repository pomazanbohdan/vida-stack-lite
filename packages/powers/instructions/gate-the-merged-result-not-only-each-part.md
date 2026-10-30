---
instruction_id: gate-the-merged-result-not-only-each-part
title: "Gate the merged result, not only each part"
summary: "After parallel units are merged, a combined build and test gate runs: the self-checks of the individual units cannot see a cross-unit integration failure."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: Several units were executed in parallel and have been merged into one result.
conditions_does_not_apply_when: A single unit ran and its own checks already cover the result.
artifact_contract_output_type: integration-gate-report
artifact_contract_required_data:
  - the merged result that was gated
  - the gate outcomes
  - the cross-unit conflicts found
artifact_contract_verified_by: the merged result passed a combined build and test gate after the merge
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/post-merge-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Gate the merged result, not only each part
Post-merge build & test gate. Runs after all worktrees in a wave are merged (parallel mode), or after the last plan completes (serial mode). Catches cross-plan integration failures that individual worktree self-checks cannot detect.
✓ Post-merge test gate passed — no cross-plan conflicts
