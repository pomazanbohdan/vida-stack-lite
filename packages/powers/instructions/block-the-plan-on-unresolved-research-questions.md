---
instruction_id: block-the-plan-on-unresolved-research-questions
title: Block the plan on unresolved research questions
summary: "Open questions left by the research stop the planning, and the questions themselves are put to the person who can answer them."
capability_tags:
  - plan-implementation
pattern_tags:
  - specification-gate
conditions_applies_when: Planning is about to start on the back of research that left open questions.
conditions_does_not_apply_when: The research left no open questions.
artifact_contract_output_type: research-gate
artifact_contract_required_data:
  - the unresolved questions
  - the decision to hold the planning
  - the question put to the person
artifact_contract_verified_by: the planning was held and the unresolved questions were surfaced
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/research-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Block the plan on unresolved research questions
Preventing plans built on incomplete information.
Gate — Block planning if unresolved questions are found
System MUST surface the specific unresolved questions to the user
Display the specific open questions requiring resolution
