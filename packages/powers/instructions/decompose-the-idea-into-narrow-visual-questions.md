---
instruction_id: decompose-the-idea-into-narrow-visual-questions
title: Decompose the idea into narrow visual questions
summary: "A design idea becomes two to five narrow visual questions, each answered by its own exploration, and the list is agreed before anything is built."
capability_tags:
  - design-user-interface
pattern_tags:
  - specification-gate
conditions_applies_when: A design idea is about to be explored and it is wider than one question.
conditions_does_not_apply_when: The question to answer is already narrow and settled.
artifact_contract_output_type: question-decomposition
artifact_contract_required_data:
  - the questions
  - the approach per question
  - the risk per question
artifact_contract_verified_by: every question is one specific visual question and the list is agreed before building
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/sketch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - design-ux
---

# Decompose the idea into narrow visual questions
Break the idea into 2-5 design questions.
Each sketch answers one specific visual question.
"Design the whole app" — too broad
"Set up the component library" — that's implementation
"Pick a color palette" — apply it to UI instead
Present the table and get alignment before building.
