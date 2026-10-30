---
instruction_id: lock-four-decisions-before-the-planner-starts
title: Lock four decisions before the planner starts
summary: "The framework choice with its alternative, the implementation guidance, the domain context and the evaluation strategy are fixed before a plan is written, so the wrong framework and a late evaluation cannot happen."
capability_tags:
  - plan-implementation
pattern_tags:
  - specification-gate
conditions_applies_when: A plan is about to be written for work that builds an AI system.
conditions_does_not_apply_when: The four decisions are already locked in the plan.
artifact_contract_output_type: design-contract
artifact_contract_required_data:
  - the framework and its alternative
  - the implementation guidance
  - the domain context
  - the evaluation strategy
artifact_contract_verified_by: all four decisions are written before the planner creates tasks
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ai-integration-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - research
---

# Lock four decisions before the planner starts
Locks four things before the planner creates tasks:
Framework selection (with rationale and alternatives)
Implementation guidance (correct syntax, patterns, pitfalls from official docs)
Domain context (practitioner rubric ingredients, failure modes, regulatory constraints)
Evaluation strategy (dimensions, rubrics, tooling, reference dataset, guardrails)
This prevents the two most common AI development failures: choosing the wrong framework for the use case, and treating evaluation as an afterthought.
