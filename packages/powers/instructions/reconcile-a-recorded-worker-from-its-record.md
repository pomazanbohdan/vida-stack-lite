---
instruction_id: reconcile-a-recorded-worker-from-its-record
title: Reconcile a recorded worker from its record
summary: "A worker that a previous session left behind is reconciled from its persisted record — never re-dispatched, never reconciled on narration alone."
capability_tags:
  - diagnose-agent-behavior
pattern_tags:
  - evidence-analysis
conditions_applies_when: A previous session left a worker behind and the run continues.
conditions_does_not_apply_when: No worker was ever recorded.
artifact_contract_output_type: worker-reconciliation
artifact_contract_required_data:
  - the recorded worker
  - the persisted record
  - the reconciliation outcome
artifact_contract_verified_by: the recorded worker was reconciled from its record and was not dispatched a second time
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/executor-isolation-dispatch.md
status: active
revision: 1
---

# Reconcile a recorded worker from its record
Never re-dispatch a recorded plan, and never reconcile on narration alone.
The launching turn may end while external workers are still live — that is expected here, not an error.
So before dispatching ANY plan in this section, sweep for workers a previous session left behind:
