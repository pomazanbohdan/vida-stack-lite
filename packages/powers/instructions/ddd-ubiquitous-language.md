---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: ddd-ubiquitous-language
title: Use one ubiquitous language
summary: "Use a rigorous shared language across discussion, documentation and code, and refine the model when naming becomes difficult."
capability_tags:
  - model-domain-language
pattern_tags:
  - domain-language
conditions_applies_when: Naming domain concepts or aligning developers with domain experts.
conditions_does_not_apply_when: Infrastructure names that have no domain meaning.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The same domain term is used in discussion, documentation and code."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/domain-driven-design/SKILL.md; sha256=14f80bc0c209e8500f52813158afb8b6b819b47a54b92576f0c0586acac38668; locator=skills/domain-driven-design/SKILL.md#L24-L45"
status: active
revision: 1
---

# Use one ubiquitous language

Use a rigorous shared language between developers and domain experts across discussion, documentation and code; let changes in the language update the code, and use naming difficulty to refine the model.
