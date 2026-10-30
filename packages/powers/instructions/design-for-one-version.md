---
instruction_id: design-for-one-version
title: Design for one version of a dependency
summary: Avoid forcing consumers to choose between multiple versions of the same dependency or API.
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "You publish a surface that consumers depend on, or a shared dependency."
conditions_does_not_apply_when: Nothing outside your own code consumes the surface.
artifact_contract_output_type: versioning-decision
artifact_contract_required_data:
  - the consumers of the surface
  - the chosen way to extend it
artifact_contract_verified_by: no consumer is asked to pick a version
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/api-and-interface-design/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Design for one version of a dependency
Avoid forcing consumers to choose between multiple versions of the same dependency or API. Diamond dependency problems arise when different consumers need different versions of the same thing. Design for a world where only one version exists at a time — extend rather than fork.
