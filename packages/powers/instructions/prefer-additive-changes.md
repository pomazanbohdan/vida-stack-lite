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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/api-and-interface-design/SKILL.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/explanation/interface-versioning-policy.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Prefer addition over modification of a public surface
Extend interfaces without breaking existing consumers:

New fields are additive and optional (backward compatible)

Breaking changes without versioning break consumers. Design for extension from the start.
- Additive changes are the default; the interface prefers growing the vocabulary over changing it.
- A breaking change is never silent — it lands behind a version bump so a host that declares the old version negotiates down and gets a warning, not a crash.
