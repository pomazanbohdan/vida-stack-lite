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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/capability-trust-model.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Allowlist outbound fetches and redirect targets
URLs validated before redirect (prevent open redirect)
Server-side URL fetches allowlisted; private/reserved IPs blocked (prevent SSRF)
SSRF | Validate/allowlist URLs, restrict outbound requests
- **loopback, link-local, and unspecified hosts** — `127.0.0.0/8`, `169.254.0.0/16` (which contains the cloud metadata addresses), `0.0.0.0/8`, `::1`, `fe80::/10`, `::`, their IPv4-mapped IPv6 spellings, and `localhost`/`*.localhost` names. No legitimate capability install fetches these.
- **plaintext `http://` URLs** — the transport is `https`-only; an `http://` tarball spec still *classifies* (so an internal-mirror workflow fails with a clear, named reason instead of a raw protocol error) but never fetches.
- Deliberate limits: RFC1918 private ranges (`10/8`, `172.16/12`, `192.168/16`) are **not** denied — an internal https mirror is a legitimate install source, and the denylist is not an allowlist.
