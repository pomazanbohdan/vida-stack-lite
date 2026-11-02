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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/UAT.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Record a gap with its root cause and the missing piece
After diagnosis: fill `root_cause`, `artifacts`, `missing`, `debug_session`
- APPEND only when issue found (YAML format)
