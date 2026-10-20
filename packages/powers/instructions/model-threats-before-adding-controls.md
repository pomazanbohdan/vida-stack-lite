---
instruction_id: model-threats-before-adding-controls
title: Model the threats before adding controls
summary: "Trust boundaries, assets, a threat per boundary and the abuse cases are written down before any control is chosen."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: A change adds or changes a surface that untrusted input can reach.
conditions_does_not_apply_when: The change touches no external surface.
artifact_contract_output_type: threat-model
artifact_contract_required_data:
  - the trust boundaries
  - the assets
  - the threat per boundary
  - the abuse cases
artifact_contract_verified_by: every boundary has a named threat and an abuse case next to its use cases
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/security-checklist.md
status: active
revision: 1
---

# Model the threats before adding controls
Before reaching for controls, spend five minutes thinking like an attacker:
Trust boundaries mapped (requests, uploads, webhooks, third-party APIs, LLM output, and local values written by processes you don't control)
Assets named (credentials, PII, payment data, admin actions, money movement)
STRIDE run per boundary (Spoofing, Tampering, Repudiation, Info disclosure, DoS, Elevation)
Abuse cases written next to use cases ("how would I misuse this?")
Insecure Design | Threat modeling, spec-driven development
