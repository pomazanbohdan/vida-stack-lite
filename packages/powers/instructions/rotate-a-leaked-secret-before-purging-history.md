---
instruction_id: rotate-a-leaked-secret-before-purging-history
title: Rotate a leaked secret before you purge the history
summary: "A secret that reaches a remote is compromised the moment it lands, so revoke and reissue it first and only then remove it from the history."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "A secret was committed, logged, shared or otherwise left the machine."
conditions_does_not_apply_when: The secret never left the machine and was never committed.
artifact_contract_output_type: rotation-record
artifact_contract_required_data:
  - the secret
  - the rotation
  - the purge
artifact_contract_verified_by: the key was revoked and reissued before the history was rewritten
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/references/hardening-patterns.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/security/baseline.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Rotate a leaked secret before you purge the history

**If a secret is ever committed, rotate it.**
Deleting the line or rewriting history is not enough — assume it's compromised the moment it reaches a remote.
Revoke and reissue the key first, then purge it from history.
- Immediately revoke the exposed credential in the issuing service (GitHub, npm, cloud, etc.)
- Rotate all credentials that shared the same scope as the exposed one
