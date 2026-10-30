---
instruction_id: validate-with-a-schema-at-the-boundary
title: Validate with a schema at the boundary
summary: "Validate at the boundary against a schema of allowlisted shapes, lengths, enums and formats, reject with a structured error, and let only the parsed value downstream."
capability_tags:
  - harden-validation
pattern_tags:
  - defense-in-depth
conditions_applies_when: "A request body, a form field or a query parameter enters the system."
conditions_does_not_apply_when: The value was already parsed and validated at its boundary.
artifact_contract_output_type: schema-validation
artifact_contract_required_data:
  - the schema
  - the rejection status and details
  - the parsed value
artifact_contract_verified_by: invalid input is rejected with the structured error and the downstream code receives only the parsed value
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/references/hardening-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Validate with a schema at the boundary

Validate at the boundary with a schema: allowlisted shape, lengths, enums, formats.
Reject with 422 and structured details; downstream code uses only the parsed, typed value.
