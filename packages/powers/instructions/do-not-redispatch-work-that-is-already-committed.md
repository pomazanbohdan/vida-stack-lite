---
instruction_id: do-not-redispatch-work-that-is-already-committed
title: Do not redispatch work that is already committed
summary: Committed work is not dispatched again; the anomaly is recorded and the recovery options are offered.
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: The commits of a unit of work exist but its summary artifact does not.
conditions_does_not_apply_when: Neither the commits nor the summary exist.
artifact_contract_output_type: recovery-options
artifact_contract_required_data:
  - the commits found
  - the recovery options
artifact_contract_verified_by: no new executor was started and the anomaly was recorded before moving on
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Do not redispatch work that is already committed
stop before spawning a new executor; continuing risks duplicate work
revert or supersede partial commits before dispatch
record the anomaly and move on only with explicit confirmation
Offer these recovery options:
