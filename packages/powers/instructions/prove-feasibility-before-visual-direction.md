---
instruction_id: prove-feasibility-before-visual-direction
title: Prove feasibility before visual direction
summary: A spike proves the approach is buildable and a sketch proves the design is worth building; run the spike first.
capability_tags:
  - design-experiments
pattern_tags:
  - explore-then-exploit
conditions_applies_when: Both the technical approach and the visual direction are undecided.
conditions_does_not_apply_when: The technical approach is already proven.
artifact_contract_output_type: feasibility-then-direction
artifact_contract_required_data:
  - the feasibility question
  - the visual question
artifact_contract_verified_by: the feasibility verdict precedes the visual direction
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/spike-and-sketch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - design-ux
---

# Prove feasibility before visual direction
Spikes answer binary feasibility questions with executable code and a VALIDATED / INVALIDATED / PARTIAL verdict. Sketches answer visual questions with 2–3 browser-comparable HTML variants.
They are complementary — a spike proves the approach is buildable, a sketch proves the design is worth building.
| "What's the right technical approach, and what should it look like?" | Both, in order: spike first, then sketch |
