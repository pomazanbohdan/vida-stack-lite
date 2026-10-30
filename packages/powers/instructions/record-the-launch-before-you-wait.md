---
instruction_id: record-the-launch-before-you-wait
title: Record the launch before you wait
summary: The launch identity and the place the result will land are written down right after the spawn and before any wait.
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A worker is started in the background and the run may end before it returns.
conditions_does_not_apply_when: The call returns inline and the result is already in hand.
artifact_contract_output_type: worker-launch-record
artifact_contract_required_data:
  - the launch identity
  - the result location
  - the worker process identity
artifact_contract_verified_by: the record exists before the wait starts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/executor-isolation-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Record the launch before you wait
A bare background `wait` left the wave with no durable lifecycle
when the orchestrator's turn ended first, a finished worker sat undiscovered and a blocked one sat unreported, and a resumed session had nothing to recover from.
Immediately after the spawn — before waiting on anything — persist the launch identity and result location:
