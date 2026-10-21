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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/review.md
status: active
revision: 1
---

# Join every review lane before you aggregate
Join every dispatched lane
NOTHING below this line may run before every lane has finished
assembled from a partial set looks complete while silently missing a reviewer
