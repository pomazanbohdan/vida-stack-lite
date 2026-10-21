---
instruction_id: one-owner-writes-the-shared-state
title: One owner writes the shared state
summary: In a parallel run the worker edits and commits only inside its own workspace; the owner of the run performs every merge and writes the shared state files.
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: Several units run in parallel and write into shared artefacts.
conditions_does_not_apply_when: A single unit runs alone in the main checkout.
artifact_contract_output_type: ownership-split
artifact_contract_required_data:
  - the owner of the shared state
  - what the workers may write
  - what the owner performs
artifact_contract_verified_by: no worker wrote a shared state file and every merge was performed by the owner
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/executor-isolation-dispatch.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/worktree-recovery-policy.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-plan.md
status: active
revision: 1
---

# One owner writes the shared state
the orchestrator performs every git operation — create, merge, cleanup; the spawned executor only edits files and commits inside its own worktree.
The orchestrator — the worktree lifecycle owner — performs any base correction
The executor never touches `STATE.md`/`ROADMAP.md`, and that guard needs no new code
the orchestrator owns the post-merge sync centrally
