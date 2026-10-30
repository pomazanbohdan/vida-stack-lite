---
instruction_id: treat-an-unexpected-result-as-new-evidence
title: Treat an unexpected result as new evidence
summary: "A result that matches nothing the hypothesis predicted is evidence, not a failed hypothesis."
capability_tags:
  - debug-root-cause
pattern_tags:
  - evidence-analysis
conditions_applies_when: A test produced a result the hypothesis did not predict.
conditions_does_not_apply_when: The result confirmed or refuted the prediction.
artifact_contract_output_type: hypothesis-outcome
artifact_contract_required_data:
  - the prediction
  - the observed result
  - the outcome class
artifact_contract_verified_by: the outcome was classified and an unexpected result was carried forward as evidence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-models-debug.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Treat an unexpected result as new evidence
CONCLUDE (matched = SUPPORTED, failed = ELIMINATED, unexpected = new evidence)
Never skip the PREDICT step -- without a prediction, you cannot distinguish a meaningful result from noise
Never change more than one variable per test -- if you change two things and the bug disappears, you don't know which change fixed it
