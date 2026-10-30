---
instruction_id: recompute-the-layering-after-every-layer
title: Recompute the layering after every layer
summary: "The work is planned one dependency layer at a time and the layering is recomputed after each layer, so a later layer can differ from the one that was assigned at the start."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: Several units are planned and a plan can reveal a dependency between them.
conditions_does_not_apply_when: The units are independent and already ordered.
artifact_contract_output_type: recomputed-layering
artifact_contract_required_data:
  - the layer that was planned
  - the recomputed layering
  - the difference it produced
artifact_contract_verified_by: the layering after the layer differs from the one that was assigned before it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch/steps/planner-wave.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The frozen body ends mid-sentence after requiring whole-batch wave recomputation, so its operative form cannot be established without supplying missing text."
---

# Recompute the layering after every layer
Planning proceeds one DAG layer at a time, driven by the CURRENT wave assignment
RECOMPUTES waves for the whole batch
so a later layer can genuinely differ from what
