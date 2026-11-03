---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddd-aggregates-and-value-objects
title: "Model entities, value objects and aggregates"
summary: "Use identity for entities, immutable attributes for value objects and small aggregates with one consistency boundary; reference other aggregates by ID."
capability_tags:
  - design-structure
pattern_tags:
  - state-modeling
conditions_applies_when: Modeling domain objects and consistency boundaries.
conditions_does_not_apply_when: A read-only projection with no domain invariants.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each aggregate has one root and a small consistency boundary, and other aggregates are referenced by ID."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/domain-driven-design/SKILL.md; sha256=14f80bc0c209e8500f52813158afb8b6b819b47a54b92576f0c0586acac38668; locator=skills/domain-driven-design/SKILL.md#L70-L93"
status: active
revision: 1
---

# Model entities, value objects and aggregates

Model entities by persistent identity, value objects by immutable attributes, and aggregates as consistency boundaries with one root. Prefer value objects, keep aggregates small, reference other aggregates by ID, and allow eventual consistency between aggregates.
