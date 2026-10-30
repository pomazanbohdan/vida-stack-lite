---
instruction_id: leave-backlogged-work-pending-never-failed
title: "Leave backlogged work pending, never failed"
summary: A unit that did not get a slot because the fan-out was full stays pending; the fan-out is never widened to compensate and a pending unit is never marked failed.
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: More units are eligible than the current concurrency allows.
conditions_does_not_apply_when: Every eligible unit has already been dispatched.
artifact_contract_output_type: dispatch-plan
artifact_contract_required_data:
  - the units dispatched now
  - the units left pending
artifact_contract_verified_by: the pending units are still pending and the fan-out was not widened
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch/steps/worktree-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Leave backlogged work pending, never failed
Not every eligible item necessarily spawns this round
cap the fan-out at the concurrency limit, minus the current in-flight count
NEVER mark these `failed`, NEVER increase fan-out to compensate
