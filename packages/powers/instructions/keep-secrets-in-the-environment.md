---
instruction_id: keep-secrets-in-the-environment
title: Keep secrets in the environment
summary: "Secrets come from the environment, the committed example file carries placeholders, and the staged diff is checked before every commit."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: The project holds secrets or key material.
conditions_does_not_apply_when: The project holds no secret.
artifact_contract_output_type: secret-handling
artifact_contract_required_data:
  - where each secret comes from
  - the committed example file
  - the staged diff check
artifact_contract_verified_by: the staged diff was checked for secrets before the commit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/references/hardening-patterns.md
status: active
revision: 1
---

# Keep secrets in the environment

Secrets come from the environment.
`.env.example` is committed with placeholders; real `.env*` files and key material are gitignored; grep the staged diff before committing.

```
.env files:
  ├── .env.example  → Committed (template with placeholder values)
  ├── .env          → NOT committed (contains real secrets)
  └── .env.local    → NOT committed (local overrides)

.gitignore must include:
  .env
  .env.local
  .env.*.local
  *.pem
  *.key
```
