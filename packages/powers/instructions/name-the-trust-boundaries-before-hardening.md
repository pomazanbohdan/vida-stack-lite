---
instruction_id: name-the-trust-boundaries-before-hardening
title: Name the trust boundaries before you harden
summary: "Map where untrusted data crosses into the system and name the assets, because trust follows who wrote a value and not which channel delivered it."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: "A feature accepts untrusted data, stores sensitive data or calls an external service."
conditions_does_not_apply_when: The change touches no external input and handles no sensitive data.
artifact_contract_output_type: trust-boundary-map
artifact_contract_required_data:
  - the boundaries
  - the assets
  - the values that look internal but are not
artifact_contract_verified_by: every boundary names what crosses it and what is worth stealing or breaking
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
status: active
revision: 1
---

# Name the trust boundaries before you harden

Controls bolted on without a threat model are guesses.
Before hardening, spend five minutes thinking like an attacker:

**Map the trust boundaries.**
Where does untrusted data cross into your system? HTTP requests, form fields, file uploads, webhooks, third-party APIs, message queues, and **LLM output** — plus the local values that look internal because the OS handed them to you: another process's command line or environment, filenames on a shared volume, a path in a job payload.
Trust follows who *wrote* a value, not which channel delivered it.
Every boundary is attack surface.

**Name the assets.**
What's worth stealing or breaking? Credentials, PII, payment data, admin actions, money movement.

If you can't name the trust boundaries for a feature, you're not ready to secure it. This is OWASP **A04: Insecure Design** — most breaches begin in design, not code.
