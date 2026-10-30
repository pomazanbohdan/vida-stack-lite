---
instruction_id: decompose-a-recommendation-to-its-constraints-before-you-trust-it
title: Decompose a recommendation to its constraints before you trust it
summary: A recommendation is taken apart to the requirements it must satisfy; a recommendation that cannot be explained from those is marked low confidence.
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: A technology or pattern recommendation is about to be accepted.
conditions_does_not_apply_when: The recommendation is a plain factual lookup.
artifact_contract_output_type: recommendation-rationale
artifact_contract_required_data:
  - the problem it solves
  - the non-negotiable requirements
  - the confidence
artifact_contract_verified_by: the recommendation was decomposed to its constraints and the confidence follows the explanation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-models-research.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Decompose a recommendation to its constraints before you trust it
Before accepting any technology recommendation or architectural pattern, decompose it to its fundamental constraints: What problem does this solve? What are the non-negotiable requirements? What are the physical/logical limits? Build your recommendation UP from these constraints rather than DOWN from conventional wisdom. If you cannot explain WHY a recommendation is correct from first principles, flag it as `[LOW]` regardless of source count.
