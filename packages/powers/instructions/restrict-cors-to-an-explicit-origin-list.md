---
instruction_id: restrict-cors-to-an-explicit-origin-list
title: Restrict CORS to an explicit origin list
summary: "Take the allowed origins from configuration, and never answer with a wildcard when credentials are allowed."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: A browser may call the application cross-origin.
conditions_does_not_apply_when: The application serves no cross-origin browser traffic.
artifact_contract_output_type: cors-policy
artifact_contract_required_data:
  - the allowed origins
  - the credentials setting
artifact_contract_verified_by: the allowed origin list is explicit and no wildcard is combined with credentials
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/references/hardening-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Restrict CORS to an explicit origin list

CORS restricted to an explicit origin list from configuration.
Never `*` with credentials.
