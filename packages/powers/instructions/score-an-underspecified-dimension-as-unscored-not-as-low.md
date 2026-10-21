---
instruction_id: score-an-underspecified-dimension-as-unscored-not-as-low
title: "Score an underspecified dimension as unscored, not as low"
summary: "A dimension with too little data is scored unscored with empty evidence, never as a weak rating."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A dimension of an assessment has too little data to rate.
conditions_does_not_apply_when: The dimension has enough data to rate.
artifact_contract_output_type: dimension-score
artifact_contract_required_data:
  - the confidence
  - the summary
  - the evidence count
artifact_contract_verified_by: the dimension is unscored with an empty evidence list
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/user-profiling.md
status: active
revision: 1
---

# Score an underspecified dimension as unscored, not as low
Set confidence to `UNSCORED`
Set summary to: "Insufficient data -- no clear signals detected for this dimension."
Set evidence_quotes to empty array `[]`
Set evidence_count to `0`
All dimensions scored LOW or UNSCORED. Recommend questionnaire fallback as primary profile source
