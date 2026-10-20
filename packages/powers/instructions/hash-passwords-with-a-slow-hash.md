---
instruction_id: hash-passwords-with-a-slow-hash
title: Hash passwords with a slow hash
summary: "Hash with bcrypt at twelve rounds or more, with scrypt or with argon2, and never store a plaintext password."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: A password is stored or compared.
conditions_does_not_apply_when: The system holds no passwords.
artifact_contract_output_type: password-storage
artifact_contract_required_data:
  - the algorithm
  - its cost factor
artifact_contract_verified_by: no password is stored or compared in plaintext
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/references/hardening-patterns.md
status: active
revision: 1
---

# Hash passwords with a slow hash

Hash passwords with bcrypt (≥12 rounds), scrypt, or argon2.
Never store plaintext.
