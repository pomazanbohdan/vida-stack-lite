---
instruction_id: let-the-first-party-always-win-every-collision
title: Let the first party always win every collision
summary: "When two independently authored extensions collide, the shipped one keeps the name and the newcomer is rejected; an extension may only add, never override."
capability_tags:
  - harden-validation
pattern_tags:
  - safe-defaults
conditions_applies_when: "Two extensions claim the same name, stem, key or family."
conditions_does_not_apply_when: Only one extension exists.
artifact_contract_output_type: collision-precedence
artifact_contract_required_data:
  - the collision
  - which side keeps it
  - what the rejected side may still do
artifact_contract_verified_by: the shipped extension keeps every collision and the newcomer can only add
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/capability-overlay-model.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Let the first party always win every collision
- The single load-bearing precedence rule is: **first-party always wins.** When a third-party overlay collides with a first-party capability, the overlay is rejected — never the other way round.
- An overlay can only *add*; it can never *override*.
