---
instruction_id: harden-credential-handling
title: Harden credential handling
summary: "Passwords are hashed with a strong algorithm, sessions are protected by cookie flags and expiry, and login and reset flows are rate limited."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "The work stores, transports or accepts credentials."
conditions_does_not_apply_when: The work handles no credential at all.
artifact_contract_output_type: credential-review
artifact_contract_required_data:
  - the hashing algorithm and cost
  - the session cookie flags
  - the session lifetime
  - the rate limit
  - the reset token lifetime
artifact_contract_verified_by: every credential-handling item is checked against the stated values
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/security-checklist.md
status: active
revision: 1
---

# Harden credential handling
Passwords hashed with bcrypt (≥12 rounds), scrypt, or argon2
Session cookies: `httpOnly`, `secure`, `sameSite: 'lax'`
Session expiration configured (reasonable max-age)
Rate limiting on login endpoint (≤10 attempts per 15 minutes)
Password reset tokens: time-limited (≤1 hour), single-use
Account lockout after repeated failures (optional, with notification)
MFA supported for sensitive operations (optional but recommended)
Auth Failures | Strong passwords, rate limiting, session management
