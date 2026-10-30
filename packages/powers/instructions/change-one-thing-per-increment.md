---
instruction_id: change-one-thing-per-increment
title: Change one thing per increment
summary: "Each increment changes one logical thing; a new component, a refactor and a build-config change are three increments, not one."
capability_tags:
  - execute-plan
pattern_tags:
  - code-minimization
conditions_applies_when: A change is about to be made and its size has to be decided.
conditions_does_not_apply_when: "The change is a single-file, single-function edit with a minimal scope already."
artifact_contract_output_type: increment-scope
artifact_contract_required_data:
  - the one logical thing this increment changes
  - the increments it was split into
artifact_contract_verified_by: each increment changes exactly one logical thing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/incremental-implementation/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Change one thing per increment

Each increment changes one logical thing. Don't mix concerns:

**Bad:** One commit that adds a new component, refactors an existing one, and updates the build config.

**Good:** Three separate commits — one for each change.
