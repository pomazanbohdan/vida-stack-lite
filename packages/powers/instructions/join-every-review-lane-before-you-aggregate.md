---
instruction_id: join-every-review-lane-before-you-aggregate
title: Join every review lane before you aggregate
summary: "Nothing aggregates before every dispatched lane has finished, because assembled from a partial set looks complete while silently missing a reviewer."
capability_tags:
  - review-code
pattern_tags:
  - parallel-execution
conditions_applies_when: Several reviewers run and their outputs are collected into one result.
conditions_does_not_apply_when: A single reviewer runs.
artifact_contract_output_type: joined-review-set
artifact_contract_required_data:
  - the dispatched lanes
  - the ones that finished
artifact_contract_verified_by: the aggregate was written only after every dispatched lane finished
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Join every review lane before you aggregate
Join every dispatched lane
NOTHING below this line may run before every lane has finished
assembled from a partial set looks complete while silently missing a reviewer
A lane refused because the prompt exceeds its context cap is not a lane result: keep the typed refusal in the run and name it in the aggregate. Never trim the prompt to make it fit — a trimmed prompt reviewed something other than the plans.
