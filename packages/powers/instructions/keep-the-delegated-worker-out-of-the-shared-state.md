---
instruction_id: keep-the-delegated-worker-out-of-the-shared-state
title: Keep the delegated worker out of the shared state
summary: "A delegated worker is a leaf: it executes, it commits its own code and it returns a status, while the shared state documents and the documentation artifacts are written by the orchestrator."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A worker agent is dispatched to carry out a unit of work.
conditions_does_not_apply_when: The worker runs in the same session and owns the state itself.
artifact_contract_output_type: worker-contract
artifact_contract_required_data:
  - the files the worker owns
  - the files the orchestrator owns
artifact_contract_verified_by: the worker wrote only what it owns and the orchestrator wrote the shared records
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch/steps/worktree-dispatch.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/secure-phase.md
status: active
revision: 1
---

# Keep the delegated worker out of the shared state
NEVER invoke the orchestrator or any other coordinating command — you are a leaf, not a coordinator
the orchestrator owns those writes after every item in this dispatch round completes
the orchestrator commits them at completion
Never modify implementation files
Return a structured verdict only — do NOT write
the orchestrator owns the file write
