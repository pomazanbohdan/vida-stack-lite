---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-architecture-entities-and-use-cases
title: Separate entities from use cases
summary: "Entities hold enterprise rules; use cases hold application rules, one operation each, with request/response models and boundaries."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Modeling domain rules and application operations.
conditions_does_not_apply_when: A CRUD handler with no domain rule.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Entities have no framework dependency and each use case is one operation with request/response models.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-architecture/SKILL.md; sha256=fc9fe201ae040df80164bc7a407507882783e2c8cdbc0379a1fbdcf3719e4446; locator=skills/clean-architecture/SKILL.md#L45-L68"
status: active
revision: 1
---

# Separate entities from use cases

Keep Entities for enterprise-wide business rules that would exist without software, and Use Cases for application-specific rules that orchestrate data to and from Entities. Entities are not database rows: they are objects or pure functions that encapsulate critical rules without framework dependencies. Use Cases accept Request Models and return Response Models, never framework objects; make each Use Case one application operation. An Interactor implements an input boundary and calls an output boundary. A Use Case change should never affect an Entity, while Entity changes may ripple to Use Cases.
