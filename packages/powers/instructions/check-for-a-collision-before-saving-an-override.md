---
instruction_id: check-for-a-collision-before-saving-an-override
title: Check for a collision before saving an override
summary: "Resolve the current set once, compare every new entry's key against it, and surface a collision instead of silently overwriting."
capability_tags:
  - check-for-name-collisions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A new entry is about to be saved into a set that already holds entries with keys.
conditions_does_not_apply_when: The entry is written into a place with no existing entries under the same key.
artifact_contract_output_type: collision-check
artifact_contract_required_data:
  - the resolved set
  - the new key
  - the collision
  - the decision
artifact_contract_verified_by: a colliding key was put to the user before anything was written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-party-mode/references/create-party.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Check for a collision before saving an override
A custom member whose `code` matches an installed agent silently *overrides* that agent in the collective.
Before composing, resolve the collective once
and check each new member's `code` against the returned members.
On a collision, surface it
and let the user confirm or rename.
One check, not a gate.
