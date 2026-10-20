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
status: active
revision: 1
---

# Rotate a leaked secret before you purge the history

**If a secret is ever committed, rotate it.**
Deleting the line or rewriting history is not enough — assume it's compromised the moment it reaches a remote.
Revoke and reissue the key first, then purge it from history.
