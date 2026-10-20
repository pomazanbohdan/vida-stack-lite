---
instruction_id: use-one-error-format-per-interface
title: Use one error format across an interface
summary: Mixed error patterns leave the consumer unable to predict the behaviour.
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A surface returns failures in more than one shape.
conditions_does_not_apply_when: The surface has a single documented failure shape.
artifact_contract_output_type: error-contract
artifact_contract_required_data:
  - the single error shape
  - the places that still deviate
artifact_contract_verified_by: every failure of the surface uses the same shape
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/api-and-interface-design/SKILL.md
status: active
revision: 1
---

# Use one error format across an interface
Pick one error strategy and use it everywhere:

**Don't mix patterns.** If some endpoints throw, others return null, and others return `{ error }` — the consumer can't predict behavior.
