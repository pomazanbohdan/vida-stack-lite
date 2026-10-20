---
instruction_id: prefer-additive-changes
title: Prefer addition over modification of a public surface
summary: New fields are additive and optional; changing or removing an existing field breaks the consumers that depend on it.
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: You change a field or an endpoint that already has consumers.
conditions_does_not_apply_when: The surface has no consumer yet.
artifact_contract_output_type: compatibility-decision
artifact_contract_required_data:
  - the change
  - whether it breaks an existing consumer
artifact_contract_verified_by: "the change is backward compatible, or a deprecation is planned"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/api-and-interface-design/SKILL.md
status: active
revision: 1
---

# Prefer addition over modification of a public surface
Extend interfaces without breaking existing consumers:

New fields are additive and optional (backward compatible)

Breaking changes without versioning break consumers. Design for extension from the start.
