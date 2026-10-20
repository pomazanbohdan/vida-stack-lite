---
instruction_id: apply-the-three-tier-security-boundary
title: "Classify every control into always, ask first, or never"
summary: "Each security control is either always applied, requires human approval before it is added, or is never done."
capability_tags:
  - harden-security-controls
pattern_tags:
  - control-tiering
conditions_applies_when: A security control is proposed or an existing one is changed.
conditions_does_not_apply_when: The change has no security consequence.
artifact_contract_output_type: control-classification
artifact_contract_required_data:
  - the control
  - its tier
  - the approval the tier requires
artifact_contract_verified_by: every control named in the change is classified into one of the three tiers
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
status: active
revision: 1
---

# Classify every control into always, ask first, or never

Security isn't a phase — it's a constraint on every line of code that touches user data, authentication, or external systems.

### Always Do (No Exceptions)

- **Validate all external input** at the system boundary (API routes, form handlers)
- **Parameterize all database queries** — never concatenate user input into SQL
- **Encode output** to prevent XSS (use framework auto-escaping, don't bypass it)
- **Use HTTPS** for all external communication
- **Hash passwords** with bcrypt/scrypt/argon2 (never store plaintext)
- **Set security headers** (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- **Use httpOnly, secure, sameSite cookies** for sessions
- **Run the detected package manager's native audit** against the committed lockfile before every release

### Ask First (Requires Human Approval)

- Adding new authentication flows or changing auth logic
- Storing new categories of sensitive data (PII, payment info)
- Adding new external service integrations
- Changing CORS configuration
- Adding file upload handlers
- Modifying rate limiting or throttling
- Granting elevated permissions or roles

### Never Do

- **Never commit secrets** to version control (API keys, passwords, tokens)
- **Never log sensitive data** (passwords, tokens, full credit card numbers)
- **Never trust client-side validation** as a security boundary
- **Never disable security headers** for convenience
- **Never use `eval()` or `innerHTML`** with user-provided data
- **Never store sessions in client-accessible storage** (localStorage for auth tokens)
- **Never expose stack traces** or internal error details to users
