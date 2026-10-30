---
instruction_id: encode-output-through-the-framework
title: Encode output through the framework
summary: "Let the framework escape the output, and sanitize it with an allowlist sanitizer first when raw HTML is unavoidable."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: A value that came from outside the program is written into a response.
conditions_does_not_apply_when: The output carries no external value.
artifact_contract_output_type: output-encoding
artifact_contract_required_data:
  - the output path
  - the escaping mechanism
artifact_contract_verified_by: "no external value reaches the output without the framework's escaping or an allowlist sanitizer"
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

# Encode output through the framework

Encode output through the framework's auto-escaping.
If raw HTML is unavoidable, sanitize with an allowlist sanitizer first.
