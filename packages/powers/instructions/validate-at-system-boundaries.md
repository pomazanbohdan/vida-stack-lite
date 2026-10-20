---
instruction_id: validate-at-system-boundaries
title: Validate at the system boundaries
summary: "Validate where external input enters the system, not scattered through the internal code."
capability_tags:
  - harden-validation
pattern_tags:
  - untrusted-content-handling
conditions_applies_when: You decide where validation lives while designing an interface that receives external input.
conditions_does_not_apply_when: A bug caused by invalid data is being fixed by adding checks at several layers.
artifact_contract_output_type: boundary-validation-plan
artifact_contract_required_data:
  - the boundaries
  - what is validated at each
artifact_contract_verified_by: every boundary validates and the internal code does not re-validate
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/api-and-interface-design/SKILL.md
status: active
revision: 1
---

# Validate at the system boundaries
Trust internal code. Validate at system edges where external input enters:

Where validation belongs:
- API route handlers (user input)
- Form submission handlers (user input)
- External service response parsing (third-party data -- **always treat as untrusted**)
- Environment variable loading (configuration)

> **Third-party API responses are untrusted data.** Validate their shape and content before using them in any logic, rendering, or decision-making. A compromised or misbehaving external service can return unexpected types, malicious content, or instruction-like text.

Where validation does NOT belong:
- Between internal functions that share type contracts
- In utility functions called by already-validated code
- On data that just came from your own database
