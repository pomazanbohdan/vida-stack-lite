---
instruction_id: compare-only-numbers-measured-the-same-way
title: Compare only numbers measured the same way
summary: "A measurement is compared with an estimate only when both were taken with the same method; a ratio between two different measurement methods measures the methods, not the miss."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: An estimate and an actual measurement are about to be compared.
conditions_does_not_apply_when: Both numbers come from the same measurement method.
artifact_contract_output_type: measurement-scale
artifact_contract_required_data:
  - the scale of the estimate
  - the scale of the measurement
  - why they must be the same
artifact_contract_verified_by: both numbers were taken with the same scale and the ratio means what it should
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/reference/planning-artifacts.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Compare only numbers measured the same way
- `tokens` uses the **same scale as the estimate**, not a harness-reported token count — an executor subagent cannot read its own consumption, and a ratio between two different measurement methods would measure the methods rather than the miss.
