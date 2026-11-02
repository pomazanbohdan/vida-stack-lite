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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/worktree-branch-check.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Verify the worktree and halt instead of self-recovering
The sub-agent only *verifies* and fails closed; the orchestrator (the worktree lifecycle owner) performs any base recovery — the sub-agent never rewrites a worktree it did not create
If ANY assertion below fails, HALT immediately — print the FATAL line, `exit 42`, and let the orchestrator (the lifecycle owner) decide recovery. Do NOT self-recover, do NOT commit
