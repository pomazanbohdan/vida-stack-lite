---
instruction_id: strip-sensitive-fields-from-responses
title: Strip sensitive fields from responses
summary: "Remove the secret-bearing fields before a response is built, and keep the error bodies generic while the internals go to the server log only."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "A response carries a record that holds secret-bearing fields, or an error."
conditions_does_not_apply_when: The response carries no record and no error.
artifact_contract_output_type: response-policy
artifact_contract_required_data:
  - the stripped fields
  - the error body
artifact_contract_verified_by: no secret-bearing field and no internal detail reaches the response
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/references/hardening-patterns.md
status: active
revision: 1
---

# Strip sensitive fields from responses

Strip sensitive fields (`passwordHash`, reset tokens) before any response.
Error bodies are generic; internals go to server logs only.
