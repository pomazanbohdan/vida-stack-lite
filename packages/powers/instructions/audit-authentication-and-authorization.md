---
instruction_id: audit-authentication-and-authorization
title: Audit authentication and authorization
summary: Check how the system proves identity and enforces access on every protected endpoint.
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The reviewed system authenticates users or protects resources by access control.
conditions_does_not_apply_when: "The system has no login, no sessions and no protected resources."
artifact_contract_output_type: authentication-review
artifact_contract_required_data:
  - authentication finding
  - authorization finding
  - fix
artifact_contract_verified_by: each finding names the credential flow or the protected endpoint it applies to
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=agents/security-auditor.md
status: active
revision: 1
---

# Audit authentication and authorization
## Authentication & Authorization
- Are passwords hashed with a strong algorithm (bcrypt, scrypt, argon2)?
- Are sessions managed securely (httpOnly, secure, sameSite cookies)?
- Is authorization checked on every protected endpoint?
- Can users access resources belonging to other users (IDOR)?
- Are password reset tokens time-limited and single-use?
- Is rate limiting applied to authentication endpoints?
