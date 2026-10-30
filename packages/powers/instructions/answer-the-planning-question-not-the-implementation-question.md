---
instruction_id: answer-the-planning-question-not-the-implementation-question
title: "Answer the planning question, not the implementation question"
summary: "The research a planning step commissions is scoped by the question the plan has to answer, not by the question the implementation will have to answer."
capability_tags:
  - research-primary-sources
pattern_tags:
  - decision-scoped-research
conditions_applies_when: A planning step commissions research before the plan exists.
conditions_does_not_apply_when: The question the plan must answer has already been settled and recorded.
artifact_contract_output_type: research-brief
artifact_contract_required_data:
  - the phase the research serves
  - the question the plan must answer
  - the requirement ids the research must address
artifact_contract_verified_by: the research answers the planning question and names the requirement ids it covers
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=capabilities/research/fragments/plan-pre.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - research
---

# Answer the planning question, not the implementation question
- Research how to implement Phase {phase_number}: {phase_name}
- Answer: "What do I need to know to PLAN this phase well?"
