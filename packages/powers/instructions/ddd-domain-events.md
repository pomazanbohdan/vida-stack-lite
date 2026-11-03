---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddd-domain-events
title: Represent domain facts as events
summary: "Use immutable past-tense domain events, distinguish internal from integration events, and publish only meaningful state changes."
capability_tags:
  - design-structure
pattern_tags:
  - state-modeling
conditions_applies_when: Modeling state changes or decoupling domain components in time.
conditions_does_not_apply_when: A state change that no domain expert needs to observe.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Domain events are immutable, past-tense and distinct from cross-boundary integration events."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/domain-driven-design/SKILL.md; sha256=14f80bc0c209e8500f52813158afb8b6b819b47a54b92576f0c0586acac38668; locator=skills/domain-driven-design/SKILL.md#L94-L116"
status: active
revision: 1
---

# Represent domain facts as events

Represent domain facts that matter to experts as immutable past-tense events. Distinguish internal domain events from cross-boundary integration events; use events for temporal decoupling, and publish only meaningful state changes.
