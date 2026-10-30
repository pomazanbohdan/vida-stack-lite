---
instruction_id: apply-the-declared-rubric-exactly-and-invent-nothing-beyond-it
title: Apply the declared rubric exactly and invent nothing beyond it
summary: "The rubric that the reference document defines is the whole rulebook; no dimension, scale or pattern is added to it."
capability_tags:
  - consult-guidance
pattern_tags:
  - guidance-selection
conditions_applies_when: "A rubric document defines the dimensions, the scales and the thresholds."
conditions_does_not_apply_when: The document states no rubric and the task is open.
artifact_contract_output_type: rubric-application
artifact_contract_required_data:
  - the rubric applied
  - the score for each declared dimension
artifact_contract_verified_by: every score comes from a declared dimension and no dimension was invented
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-user-profiler.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-user-profiler.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Apply the declared rubric exactly and invent nothing beyond it
CRITICAL: You must apply the rubric defined in the reference document. Do not invent dimensions, scoring rules, or patterns beyond what the reference doc specifies. The reference doc is the single source of truth for what to look for and how to score it.
- Rating values match the defined spectrums (no invented ratings)
