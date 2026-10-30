---
instruction_id: answer-in-one-of-the-three-research-modes
title: Answer in one of the three research modes
summary: "The question decides the mode: what exists, whether it can be done, or how two options compare."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: Research is commissioned for a question.
conditions_does_not_apply_when: The question was already answered.
artifact_contract_output_type: research-note
artifact_contract_required_data:
  - the mode
  - the answer in that shape
artifact_contract_verified_by: the output matches the shape of the mode that matches the question
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-project-researcher.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-project-researcher.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Answer in one of the three research modes
Feasibility | "Can we do X?" | Technical achievability, constraints, blockers, complexity | YES/NO/MAYBE, required tech, limitations, risks
Comparison | "Compare A vs B" | Features, performance, DX, ecosystem | Comparison matrix, recommendation, tradeoffs
