---
instruction_id: bound-the-selection-not-the-switch
title: "Bound the selection, not the switch"
summary: "A parallel switch with no throttle of its own runs everything it is given at once, so the size of the selected set is the control."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: A parallel setting has no throttle of its own and the selected set can grow.
conditions_does_not_apply_when: The setting carries its own limit on how many run at once.
artifact_contract_output_type: concurrency-bound
artifact_contract_required_data:
  - the selected set
  - the number that runs at once
artifact_contract_verified_by: the number that runs at once is bounded by the size of the selected set
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/enable-parallel-reviewer-lanes.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Bound the selection, not the switch
There is no concurrency bound. Every selected lane dispatches at once.
If that is more than you want, the control is the size of your selected set
