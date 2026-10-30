---
instruction_id: check-authorization-on-every-request
title: Check authorization on every request
summary: "Authentication is not authorization: the authenticated caller must own, or be permitted on, the specific resource."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: A request touches a resource that belongs to somebody.
conditions_does_not_apply_when: The endpoint touches no per-caller resource.
artifact_contract_output_type: authorization-check
artifact_contract_required_data:
  - the resource
  - the ownership rule
  - the response when the check fails
artifact_contract_verified_by: every protected request checks ownership or permission
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

# Check authorization on every request

Check **authorization** on every request, not just authentication: the authenticated user must own, or be permitted on, the specific resource (A01, IDOR).
