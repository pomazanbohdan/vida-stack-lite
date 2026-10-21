---
instruction_id: never-dispatch-a-unit-that-has-already-finished
title: Never dispatch a unit that has already finished
summary: "A unit whose result file is already on disk is not dispatched a second time; it is routed to the integration instead, because the result still belongs to the batch."
capability_tags:
  - make-retries-idempotent
pattern_tags:
  - idempotent-retry-design
conditions_applies_when: A run is resumed and a unit may already have produced its result.
conditions_does_not_apply_when: No unit has produced a result yet.
artifact_contract_output_type: dispatch-decision
artifact_contract_required_data:
  - the units that were already executed
  - the units that were dispatched
artifact_contract_verified_by: no unit with an existing result was dispatched again and it is still in the batch
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch/steps/worktree-dispatch.md
status: active
revision: 1
---

# Never dispatch a unit that has already finished
NEVER re-dispatch it into a second worktree for any id
It is not lost
dropping it here only prevents the duplicate dispatch, it does not remove it from the batch
