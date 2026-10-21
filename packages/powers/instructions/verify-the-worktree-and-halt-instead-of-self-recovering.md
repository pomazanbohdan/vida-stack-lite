---
instruction_id: verify-the-worktree-and-halt-instead-of-self-recovering
title: Verify the worktree and halt instead of self-recovering
summary: "The guard only verifies: when an assertion fails it halts and the lifecycle owner decides the recovery."
capability_tags:
  - isolate-workspace
pattern_tags:
  - worktree-isolation
conditions_applies_when: A subagent is spawned into an isolated workspace.
conditions_does_not_apply_when: No isolated workspace is in use.
artifact_contract_output_type: workspace-guard
artifact_contract_required_data:
  - the assertions checked
  - the halt
  - the owner that recovers
artifact_contract_verified_by: the run halted on a failed assertion and did not change the workspace
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/worktree-branch-check.md
status: active
revision: 1
---

# Verify the worktree and halt instead of self-recovering
The sub-agent only *verifies* and fails closed; the orchestrator (the worktree lifecycle owner) performs any base recovery — the sub-agent never rewrites a worktree it did not create
If ANY assertion below fails, HALT immediately — print the FATAL line, `exit 42`, and let the orchestrator (the lifecycle owner) decide recovery. Do NOT self-recover, do NOT commit
