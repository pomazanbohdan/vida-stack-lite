---
instruction_id: lock-every-requirement-from-the-source-and-name-the-gaps
title: Lock every requirement from the source and name the gaps
summary: Every requirement of the source becomes a locked decision and every area the source does not cover is named as discretion.
capability_tags:
  - curate-context
pattern_tags:
  - frozen-intent
conditions_applies_when: A source document is turned into the context the work is planned from.
conditions_does_not_apply_when: The source carries no requirements.
artifact_contract_output_type: locked-decision-context
artifact_contract_required_data:
  - each requirement as a locked decision
  - the areas left to discretion
artifact_contract_verified_by: every requirement of the source is locked and no uncovered area is silently invented
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase/steps/prd-express-path.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
---

# Lock every requirement from the source and name the gaps
Extract all requirements, user stories, acceptance criteria, and constraints from the PRD
Map each to a locked decision (everything in the PRD is treated as a locked decision)
Identify any areas the PRD doesn't cover and mark as
