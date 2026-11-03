---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddd-bounded-contexts
title: Define bounded contexts and map their relationships
summary: "Set explicit model boundaries, map translation between contexts, and protect the core with an Anti-Corruption Layer."
capability_tags:
  - design-structure
pattern_tags:
  - state-modeling
conditions_applies_when: Defining domain boundaries or integrating models from different contexts.
conditions_does_not_apply_when: A single-context system with no boundary decision.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each context has an explicit boundary and foreign models are translated at the edge.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/domain-driven-design/SKILL.md; sha256=14f80bc0c209e8500f52813158afb8b6b819b47a54b92576f0c0586acac38668; locator=skills/domain-driven-design/SKILL.md#L46-L69"
status: active
revision: 1
---

# Define bounded contexts and map their relationships

Define explicit model boundaries where domain meanings apply, and map relationships and translation between contexts. Do not equate a bounded context with a microservice; prevent foreign models from leaking into the core with an Anti-Corruption Layer, govern shared kernels and map current boundaries before defining target ones.
