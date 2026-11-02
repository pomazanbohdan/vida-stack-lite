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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/api-and-interface-design/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Use one error format across an interface
Pick one error strategy and use it everywhere. An error carries a stable machine-readable `code` and a human-readable `message`, not a bare string: `{ error: { code: 'IDEMPOTENCY_KEY_REUSED', message: 'Idempotency key reused with a different payload' } }`.

**Don't mix patterns.** If some endpoints throw, others return null, and others return `{ error }` — the consumer can't predict behavior.
