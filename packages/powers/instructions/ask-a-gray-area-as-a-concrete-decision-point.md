---
instruction_id: ask-a-gray-area-as-a-concrete-decision-point
title: Ask a gray area as a concrete decision point
summary: "A gray area is an implementation decision that would change the outcome and that the owner should weigh in on, phrased as a concrete decision point with concrete options, and asked lightly."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The intent leaves a decision open that the owner has to make.
conditions_does_not_apply_when: The intent is already unambiguous.
artifact_contract_output_type: decision-questions
artifact_contract_required_data:
  - the gray areas
  - the concrete options
  - the recommended choice
artifact_contract_verified_by: every gray area names a concrete decision and the options are concrete choices
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick/steps/discussion-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Ask a gray area as a concrete decision point
implementation decisions that would change the outcome and that the user should weigh in on
Each gray area should be a concrete decision point, not a vague category
Options must be concrete choices, not abstract categories
Highlight recommended choice where you have a clear opinion
Max 2 questions per area — this is lightweight, not a deep dive
