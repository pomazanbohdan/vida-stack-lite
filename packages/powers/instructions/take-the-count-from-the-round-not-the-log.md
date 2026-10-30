---
instruction_id: take-the-count-from-the-round-not-the-log
title: "Take the count from the round, not from the log"
summary: "The number of open findings comes from the round that just ran, never from a log that accumulates the history of every round."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: The number of open findings is counted to decide whether the loop continues.
conditions_does_not_apply_when: The artifact holds only the current round.
artifact_contract_output_type: round-count
artifact_contract_required_data:
  - the count of the round
  - the source the count was taken from
artifact_contract_verified_by: the count came from the round and was not inflated by resolved findings left in the log
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Take the count from the round, not from the log
accumulates history across cycles — resolved findings from prior cycles remain in the file as audit trail, inflating a raw grep count and causing false stall detection.
