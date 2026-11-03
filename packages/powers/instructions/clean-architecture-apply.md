---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-architecture-apply
title: Apply Clean Architecture when designing architecture
summary: "Keep business rules independent of frameworks, databases and delivery when designing architecture or reviewing module boundaries."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "Designing system architecture, reviewing module boundaries or advising on dependency management."
conditions_does_not_apply_when: A local implementation choice with no architectural dependency.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The design keeps business rules independent of frameworks, databases and delivery."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-architecture/SKILL.md; sha256=fc9fe201ae040df80164bc7a407507882783e2c8cdbc0379a1fbdcf3719e4446; locator=skills/clean-architecture/SKILL.md#L10-L13"
status: active
revision: 1
---

# Apply Clean Architecture when designing architecture

Use Clean Architecture when designing software architecture, reviewing module boundaries, or advising on dependencies: structure software so business rules remain independent of frameworks, databases, and delivery mechanisms.
