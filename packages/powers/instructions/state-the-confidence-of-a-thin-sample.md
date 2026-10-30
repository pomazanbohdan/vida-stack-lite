---
instruction_id: state-the-confidence-of-a-thin-sample
title: State the confidence of a thin sample
summary: A profile built from too little data says so instead of presenting itself as certain.
capability_tags:
  - profile-the-working-style
pattern_tags:
  - stakes-calibrated-rigor
conditions_applies_when: A profile or an estimate is produced from a small sample.
conditions_does_not_apply_when: The sample is large enough to stand on its own.
artifact_contract_output_type: confidence-note
artifact_contract_required_data:
  - the size of the sample
  - the confidence that follows from it
artifact_contract_verified_by: the thin sample is named and the result carries the lower confidence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/profile-user.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
  - research
---

# State the confidence of a thin sample
Note that a questionnaire supplement could improve accuracy.
Display: "Note: Limited session data (N messages). Results may have lower confidence."
