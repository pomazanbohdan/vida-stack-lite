---
instruction_id: write-a-rubric-before-you-trust-a-judge
title: Write a rubric before you trust a judge
summary: "A rubric names the dimension, the scores and the domain examples; a judge that was never calibrated against human judgement produces noise."
capability_tags:
  - define-quality-bar
pattern_tags:
  - quality-bar-contract
conditions_applies_when: "A model, or a person, judges the quality of an output."
conditions_does_not_apply_when: The judgement is a deterministic check.
artifact_contract_output_type: rubric
artifact_contract_required_data:
  - the dimension
  - the scores and what they mean
  - the domain examples
  - the calibration against human judgement
artifact_contract_verified_by: the rubric is complete and the judge was calibrated before it was trusted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/ai-evals.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Write a rubric before you trust a judge
A rubric must define:
The dimension being measured
What scores 1, 3, and 5 on a 5-point scale (or pass/fail criteria)
Domain-specific examples of acceptable vs. unacceptable behavior
Without rubrics, LLM judges produce noise rather than signal.
Trusting uncalibrated LLM judges — validate against human judgment before relying on them
Calibrate LLM judges against human scores (target ≥ 0.7 correlation before trusting)
