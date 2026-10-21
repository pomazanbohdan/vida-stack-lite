---
instruction_id: gate-the-spec-on-a-quantified-clarity-score
title: Gate the spec on a quantified clarity score
summary: The clarity of a request is scored on weighted dimensions; the specification is written only when the aggregate and every dimension clear their thresholds.
capability_tags:
  - define-quality-bar
pattern_tags:
  - quality-bar-contract
conditions_applies_when: A specification is about to be written from a conversation.
conditions_does_not_apply_when: The requirements are already written down and settled.
artifact_contract_output_type: clarity-score
artifact_contract_required_data:
  - the dimension scores
  - the weighted aggregate
  - the thresholds
artifact_contract_verified_by: the aggregate and every dimension are at or above their thresholds
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/spec-phase.md
status: active
revision: 1
---

# Gate the spec on a quantified clarity score
Score each dimension 0.0 (completely unclear) to 1.0 (crystal clear):
**Ambiguity score** = 1.0 − (0.35×goal + 0.25×boundary + 0.20×constraint + 0.20×acceptance)
**Gate:** ambiguity ≤ 0.20 AND all dimensions ≥ their minimums → ready to write SPEC.md.
A score of 0.20 means 80% weighted clarity — enough precision that the planner won't silently make wrong assumptions.
