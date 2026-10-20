---
instruction_id: check-authorization-on-every-resource-access
title: Check authorization on every resource access
summary: "Every protected entry point checks authentication and every resource access checks ownership or role, so no object is reachable by accident."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "The work exposes a protected endpoint, an object, an admin action or a token."
conditions_does_not_apply_when: The surface is public and carries no data.
artifact_contract_output_type: authorization-review
artifact_contract_required_data:
  - the protected entry points
  - the ownership or role check of each
  - the scope of every issued key
artifact_contract_verified_by: every protected entry point and every resource access names the check that guards it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/security-checklist.md
status: active
revision: 1
---

# Check authorization on every resource access
Every protected endpoint checks authentication
Every resource access checks ownership/role (prevents IDOR)
Admin endpoints require admin role verification
API keys scoped to minimum necessary permissions
JWT tokens validated (signature, expiration, issuer)
Broken Access Control | Auth checks on every endpoint, ownership verification
