---
instruction_id: assert-the-unchanged-surface-as-an-absence
title: Assert the unchanged surface as an absence
summary: A surface that must not change is asserted as an absence — the thing that must not be there is checked — because that is the only way the unchanged state is observable.
capability_tags:
  - build-verification-harness
pattern_tags:
  - verification-harness
conditions_applies_when: A capability surface of a role must not widen.
conditions_does_not_apply_when: The surface is expected to change.
artifact_contract_output_type: absence-invariant
artifact_contract_required_data:
  - the surface that must not change
  - what is asserted to be absent
  - the configurations it is asserted in
artifact_contract_verified_by: the forbidden surface was asserted to be absent in every configuration
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/live-dom-uat-capability.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Assert the unchanged surface as an absence
- That is a tested invariant, asserted as an absence, because that is the only way it is observable.
