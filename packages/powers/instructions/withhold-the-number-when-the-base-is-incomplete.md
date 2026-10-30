---
instruction_id: withhold-the-number-when-the-base-is-incomplete
title: Withhold the number when the base is incomplete
summary: A percentage computed from a partial set is a confidently wrong number; it is withheld rather than substituted or recomputed from partial counts.
capability_tags:
  - measure-performance
pattern_tags:
  - empty-result-policy
conditions_applies_when: A derived number is computed from a set whose scope is not complete.
conditions_does_not_apply_when: The set is complete.
artifact_contract_output_type: derived-metric
artifact_contract_required_data:
  - the scope of the base
  - the withheld marker
artifact_contract_verified_by: the number is withheld under an incomplete scope and was not substituted with zero or recomputed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/consume-the-planning-snapshot.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Withhold the number when the base is incomplete
**`percent` is `null` whenever `scope` is not `complete`.**
That is deliberate. A percentage computed from a partial phase set is a confidently wrong number, and a consumer cannot tell it apart from a real one. Do not substitute `0`, and do not compute your own from `completed / total` — those counts are partial too.
