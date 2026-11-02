---
instruction_id: tear-down-the-side-effect-when-the-next-step-fails
title: Tear down the side effect when the next step fails
summary: "When a step already created something and the step after it fails, the created thing is torn down and the run halts — it is never left behind as an orphan."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: A step has already produced a side effect and the following step turns out to be unusable.
conditions_does_not_apply_when: "No side effect exists yet, or the following step succeeded."
artifact_contract_output_type: partial-step-rollback
artifact_contract_required_data:
  - the side effect created
  - the reason the next step failed
  - the teardown performed
artifact_contract_verified_by: no side effect of the failed step survives and the run halted instead of continuing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/executor-isolation-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Tear down the side effect when the next step fails
Fail-closed is the invariant: an undeclared, unknown, or unresolvable isolation declaration degrades to `none`, never to an unsafe parallel path.
A `harness-worktree` host with no declared flag, and an `orchestrator-worktree` host whose exec descriptor does not resolve, both degrade to `none` rather than dispatching executors that only believe they are isolated.
