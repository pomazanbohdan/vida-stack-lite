---
instruction_id: allowlist-server-side-fetch-targets
title: Allowlist the targets of a server-side fetch
summary: "Allowlist the scheme and the host, resolve every address and refuse the private or reserved ones, and forbid the redirects."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: The server fetches a URL that a user can influence.
conditions_does_not_apply_when: The fetch target is fixed in the code and cannot be influenced.
artifact_contract_output_type: fetch-allowlist
artifact_contract_required_data:
  - the allowed schemes and hosts
  - the address check
  - the redirect policy
artifact_contract_verified_by: a fetch to a private or reserved address is refused and the redirects are not followed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/references/hardening-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Allowlist the targets of a server-side fetch

Any URL the user influences — webhooks, import-from-URL, image proxies, link previews — can be aimed at internal services.
Allowlist scheme and host, resolve **all** DNS records and reject any private or reserved address (loopback, link-local `169.254.169.254`, private, unique-local, for IPv4 and IPv6), and forbid redirects.
That check still has a DNS-rebinding TOCTOU gap: for high-risk surfaces, pin the resolved IP or put a filtering agent in front.
