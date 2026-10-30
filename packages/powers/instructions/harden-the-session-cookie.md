---
instruction_id: harden-the-session-cookie
title: Harden the session cookie
summary: "Session cookies are httpOnly, secure and sameSite, with a bounded lifetime, and the session secret comes from the environment."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: The application issues a session.
conditions_does_not_apply_when: No session is issued.
artifact_contract_output_type: session-policy
artifact_contract_required_data:
  - the cookie flags
  - the bounded lifetime
  - where the secret comes from
artifact_contract_verified_by: the session cookie carries the flags and the secret is read from the environment
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/references/hardening-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Harden the session cookie

The session secret comes from the environment, never from code.
Session cookies are `httpOnly`, `secure`, and `sameSite: 'lax'` or `'strict'` (the CSRF defense; `'none'` sends the cookie on cross-site requests), with a bounded `maxAge`.
