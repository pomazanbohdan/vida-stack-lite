---
instruction_id: design-for-removability
title: Design for removability
summary: "When you build something new, ask how it will be removed in three years; clean interfaces and a small surface make deprecation possible."
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: "You are designing a new system, interface or module."
conditions_does_not_apply_when: The change is mechanical and the shape is already fixed.
artifact_contract_output_type: removal-plan
artifact_contract_required_data:
  - the answer to how the thing would be removed in three years
  - the interfaces and flags that make it possible
artifact_contract_verified_by: the design records how it would be removed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/deprecation-and-migration/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Design for removability

### Deprecation Planning Starts at Design Time

When building something new, ask: "How would we remove this in 3 years?" Systems designed with clean interfaces, feature flags, and minimal surface area are easier to deprecate than systems that leak implementation details everywhere.
