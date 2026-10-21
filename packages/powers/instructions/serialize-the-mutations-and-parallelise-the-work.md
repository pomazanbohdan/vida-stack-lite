---
instruction_id: serialize-the-mutations-and-parallelise-the-work
title: Serialize the mutations and parallelise the work
summary: "The work runs in parallel, the state-changing operations run one at a time; concurrency is about how many workers act, not about how many mutate at once."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: "A batch runs independent units that create, merge and remove shared state."
conditions_does_not_apply_when: The units do not touch shared state.
artifact_contract_output_type: execution-schedule
artifact_contract_required_data:
  - the parallel stage
  - the serialized stage
artifact_contract_verified_by: no two state-changing operations overlap and the parallel stage respects the negotiated capacity
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/batch-quick-tasks.md
status: active
revision: 1
---

# Serialize the mutations and parallelise the work
Worktree creation, merging, and cleanup are always serialized one at a time (`git worktree add`/`git merge`/`git worktree remove` never overlap) — concurrency is about how many already-created worktrees' agents run at once, not about the git operations themselves.
Merges apply in the same deterministic order the batch's dependency/file-overlap waves were computed in, never in whichever order an executor happens to finish first.
