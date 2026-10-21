---
instruction_id: floor-the-confidence-of-a-cheap-source
title: Floor the confidence of a cheap source
summary: "When the source of a finding runs on a weak or unknown tier, the claim is held back instead of stated; the floor suppresses unearned confidence but never a correction."
capability_tags:
  - research-primary-sources
pattern_tags:
  - trust-graded-context
conditions_applies_when: A finding would be stated as admitted and the tier of its source can be read.
conditions_does_not_apply_when: The tier of the source is known to be strong.
artifact_contract_output_type: confidence-floor
artifact_contract_required_data:
  - the tier of the source
  - the tier floor that applies
  - the disposition the claim received
artifact_contract_verified_by: no claim was admitted on a tier below the floor and the corrections were not affected
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/explore.md
status: active
revision: 1
---

# Floor the confidence of a cheap source
present every would-be **admit** as an **abstain** instead when the researcher's resolved tier is the budget tier
An *unknown* tier is treated as potentially-cheap and floored, never as verified-adequate: a resolver failure degrades to a stated default, it does not silently disarm the floor.
the floor suppresses unearned confidence, it does not suppress corrections.
