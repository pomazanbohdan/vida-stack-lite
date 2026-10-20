---
instruction_id: check-outbound-and-third-party-trust
title: Check outbound calls and third-party integrations
summary: "Check the traffic that leaves the system: stored credentials, verified webhooks, guarded OAuth flows and allowlisted outbound URLs."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: The system calls a third-party service or receives its callback.
conditions_does_not_apply_when: The system makes no outbound call and accepts no third-party callback.
artifact_contract_output_type: third-party-trust-review
artifact_contract_required_data:
  - outbound call or callback
  - missing verification
  - fix
artifact_contract_verified_by: each finding names the call or the callback and the check it is missing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=agents/security-auditor.md
status: active
revision: 1
---

# Check outbound calls and third-party integrations
## Third-Party Integrations
- Are API keys and tokens stored securely?
- Are webhook payloads verified (signature validation)?
- Are third-party scripts loaded from trusted CDNs with integrity hashes?
- Are OAuth flows using PKCE and state parameters?
- Are server-side fetches of user-supplied URLs allowlisted (SSRF)?
