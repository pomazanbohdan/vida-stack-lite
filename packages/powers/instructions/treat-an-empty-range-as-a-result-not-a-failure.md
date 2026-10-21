---
instruction_id: treat-an-empty-range-as-a-result-not-a-failure
title: "Treat an empty range as a result, not a failure"
summary: "A query that matched nothing is an answer: the request was understood and the result is empty, and it is not reported as an error."
capability_tags:
  - define-output-format
pattern_tags:
  - empty-result-policy
conditions_applies_when: A query returns a set and the set is empty.
conditions_does_not_apply_when: The query could not be understood at all.
artifact_contract_output_type: empty-range-result
artifact_contract_required_data:
  - the query that was understood
  - the empty result
  - what the caller is told
artifact_contract_verified_by: the empty result was reported as a result and not as a failure
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=scripts/changeset/README.md
status: active
revision: 1
---

# Treat an empty range as a result, not a failure
- **Treat exit `2` as "empty range", not "failure".** For a well-formed invocation it means the request was understood and simply matched nothing — do not surface it as an error.
