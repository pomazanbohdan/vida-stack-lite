---
instruction_id: keep-secrets-out-of-code-and-logs
title: Keep secrets out of code and logs
summary: "No secret is written into the repository, into an example file or into a log line, secret fields never leave the server in a response, and a report that leaves the working copy is stripped of keys, tokens and machine paths."
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
  - the values stripped from the report
artifact_contract_verified_by: "no secret appears in the tracked files, in the example files, in the responses, in the logs or in the report"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/security-checklist.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=commands/gsd/forensics.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=skills/gsd-forensics/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - operations
---

# Keep secrets out of code and logs
No secrets in code
`.gitignore` covers: `.env`, `.env.local`, `*.pem`, `*.key`
`.env.example` uses placeholder values (not real secrets)
Sensitive fields excluded from API responses (`passwordHash`, `resetToken`, etc.)
Sensitive data not logged (passwords, tokens, full CC numbers)
LLM02 Sensitive Information Disclosure | Keep secrets/PII out of prompts; filter outputs
Cryptographic Failures | HTTPS, strong hashing, no secrets in code
**Redact sensitive data:** Strip absolute paths, API keys, tokens from reports and issues.
