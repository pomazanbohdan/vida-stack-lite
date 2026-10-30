---
instruction_id: set-security-headers-on-every-response
title: Set security headers on every response
summary: "Start the content security policy from the default self source and tighten it, never loosen it."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: The application serves responses over HTTP.
conditions_does_not_apply_when: The application serves no HTTP responses.
artifact_contract_output_type: security-headers
artifact_contract_required_data:
  - the headers
  - the content security policy directives
artifact_contract_verified_by: the headers are present on the response
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

# Set security headers on every response

Security headers on every response (helmet or the framework equivalent); CSP starts from `default-src 'self'` and is tightened, not loosened.
