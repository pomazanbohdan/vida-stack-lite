---
instruction_id: keep-secrets-out-of-code-and-logs
title: Keep secrets out of code and logs
summary: "No secret is written into the repository, into an example file or into a log line, and secret fields never leave the server in a response."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "The work handles a secret, a token, a credential or personal data."
conditions_does_not_apply_when: The work handles no secret at all.
artifact_contract_output_type: secret-handling-review
artifact_contract_required_data:
  - the secrets in scope
  - where each one is allowed to appear
  - the secret fields excluded from responses
artifact_contract_verified_by: "no secret appears in the tracked files, in the example files, in the responses or in the logs"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/security-checklist.md
status: active
revision: 1
---

# Keep secrets out of code and logs
No secrets in code
`.gitignore` covers: `.env`, `.env.local`, `*.pem`, `*.key`
`.env.example` uses placeholder values (not real secrets)
Sensitive fields excluded from API responses (`passwordHash`, `resetToken`, etc.)
Sensitive data not logged (passwords, tokens, full CC numbers)
LLM02 Sensitive Information Disclosure | Keep secrets/PII out of prompts; filter outputs
Cryptographic Failures | HTTPS, strong hashing, no secrets in code
