---
instruction_id: gate-the-dispatch-on-the-per-item-decision
title: Gate the dispatch on the per-item decision
summary: "The isolation decision is taken per item of the batch and the dispatch gates on that decision, not on the project default."
capability_tags:
  - isolate-workspace
pattern_tags:
  - worktree-isolation
conditions_applies_when: A batch of items is dispatched and some of them may not be able to run isolated.
conditions_does_not_apply_when: The whole batch shares one decision.
artifact_contract_output_type: per-item-isolation-decision
artifact_contract_required_data:
  - the decision for the item being dispatched
  - the reason for it
  - the items that were kept isolated
artifact_contract_verified_by: the dispatch of each item followed its own decision
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/per-plan-worktree-gate.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/executor-isolation-dispatch.md
status: active
revision: 1
---

# Gate the dispatch on the per-item decision
gates the dispatch branch (worktree mode vs sequential mode) for that plan only — other plans in the same wave can still take the worktree path.
for the current plan, not on the project-level `USE_WORKTREES`
planned paths are unknown/unparseable - fall back to the safe
behavior (disable worktree isolation for this plan) and log why.
A path outside the declared scope is reported in the result's `warnings` array; it does not block the merge.
