---
instruction_id: record-a-gap-with-its-root-cause-and-the-missing-piece
title: Record a gap with its root cause and the missing piece
summary: "A recorded gap names the expected behaviour, the root cause and what is missing, so it can be planned against."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - decision-trail
conditions_applies_when: A failure has been diagnosed.
conditions_does_not_apply_when: The failure was not diagnosed yet.
artifact_contract_output_type: gap-record
artifact_contract_required_data:
  - the expected behaviour
  - the root cause
  - the missing piece
  - the files involved
artifact_contract_verified_by: "the gap names the root cause, the artifacts and what is missing"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/UAT.md
status: active
revision: 1
---

# Record a gap with its root cause and the missing piece
After diagnosis: fill `root_cause`, `artifacts`, `missing`, `debug_session`
- APPEND only when issue found (YAML format)
