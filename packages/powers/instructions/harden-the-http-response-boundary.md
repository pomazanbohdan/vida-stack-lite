---
instruction_id: harden-the-http-response-boundary
title: Harden the HTTP response boundary
summary: "The response carries a restrictive content policy, transport security and frame protection, and the allowed origins are an explicit list rather than a wildcard."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: The work serves HTTP responses to a browser or to a client that can be cross-origin.
conditions_does_not_apply_when: The work serves no HTTP response.
artifact_contract_output_type: response-header-review
artifact_contract_required_data:
  - the headers sent
  - the allowed origins
  - the allowed methods and headers
artifact_contract_verified_by: every response carries the security headers and the wildcard origin appears nowhere in production
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/security-checklist.md
status: active
revision: 1
---

# Harden the HTTP response boundary
Content-Security-Policy: default-src 'self'; script-src 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0  (disabled, rely on CSP)
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
// Restrictive (recommended)
cors({
  origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})
// NEVER use in production:
cors({ origin: '*' })  // Allows any origin
Security Misconfiguration | Security headers, minimal permissions, audit deps
