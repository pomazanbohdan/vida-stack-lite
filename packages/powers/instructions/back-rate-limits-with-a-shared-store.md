---
instruction_id: back-rate-limits-with-a-shared-store
title: Back the rate limit with a shared store
summary: "Limit the API generally and the authentication endpoints strictly, and count in a shared store once more than one process serves traffic."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: The service is rate limited and more than one process or instance serves its traffic.
conditions_does_not_apply_when: Exactly one process serves the traffic and it always runs.
artifact_contract_output_type: rate-limit-policy
artifact_contract_required_data:
  - the limits
  - the shared store
artifact_contract_verified_by: the limit is enforced across all instances instead of per process
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/references/hardening-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Back the rate limit with a shared store

Limit the API generally and auth endpoints strictly (about 10 attempts per 15 minutes).
Once more than one process serves traffic, in-memory counters silently become `max × instances`, or never fire on serverless: back the limiter with a shared store.
