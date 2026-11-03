---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddd-repositories-and-factories
title: Hide persistence behind repositories and factories
summary: Put repository interfaces in the domain and implementations in infrastructure; use domain language and reserve factories for complex creation.
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Persisting aggregates or creating complex domain objects.
conditions_does_not_apply_when: A simple CRUD store with no domain model.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Persistence is hidden behind a domain-language interface and aggregates are created in valid states.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/domain-driven-design/SKILL.md; sha256=14f80bc0c209e8500f52813158afb8b6b819b47a54b92576f0c0586acac38668; locator=skills/domain-driven-design/SKILL.md#L117-L139"
status: active
revision: 1
---

# Hide persistence behind repositories and factories

Use repositories to hide persistence and factories to ensure aggregates are created in valid states. Put repository interfaces in the domain and implementations in infrastructure; use domain language in methods and reserve factories for complex creation.
