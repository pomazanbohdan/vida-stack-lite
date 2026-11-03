---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: software-design-deep-modules
title: Prefer deep modules with simple interfaces
summary: "Judge abstractions by the functionality hidden behind the interface, not by module size, and avoid shallow modules."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: Designing or refactoring module boundaries and interfaces.
conditions_does_not_apply_when: An interface fixed by an external API.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The interface hides substantial functionality and does not impose more complexity than it removes.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/software-design-philosophy/SKILL.md; sha256=d5971fdfc51e6a6f729856a9c3874d56628bb6802fdd31eb1c97adbfa4b51a73; locator=skills/software-design-philosophy/SKILL.md#L54-L75"
status: active
revision: 1
---

# Prefer deep modules with simple interfaces

Prefer deep modules that provide powerful functionality through simple interfaces; avoid shallow modules whose interfaces impose more complexity than their functionality hides. Judge abstractions by depth, not size, and merge related shallow classes where appropriate.
