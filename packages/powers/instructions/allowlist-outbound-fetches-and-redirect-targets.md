---
instruction_id: allowlist-outbound-fetches-and-redirect-targets
title: Allowlist outbound fetches and redirect targets
summary: A redirect target is validated before it is followed and a server-side fetch may only reach an allowlisted host that is not a private or reserved address.
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: The work follows a redirect or fetches a URL that the caller supplies.
conditions_does_not_apply_when: Every URL the work follows is fixed in the code.
artifact_contract_output_type: outbound-request-review
artifact_contract_required_data:
  - the allowed destinations
  - the redirect validation
  - the blocked address ranges
artifact_contract_verified_by: a caller-supplied URL that names a private or reserved address is refused
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/security-checklist.md
status: active
revision: 1
---

# Allowlist outbound fetches and redirect targets
URLs validated before redirect (prevent open redirect)
Server-side URL fetches allowlisted; private/reserved IPs blocked (prevent SSRF)
SSRF | Validate/allowlist URLs, restrict outbound requests
