---
instruction_id: collect-personal-data-only-against-a-stated-purpose
title: Collect personal data only against a stated purpose
summary: "A later need is latent breach scope and not a purpose, so collect against a stated purpose, keep personal data out of telemetry and make the region a configurable policy."
capability_tags:
  - manage-personal-data
pattern_tags:
  - data-minimization
conditions_applies_when: "A field is added to a personal-data store, or personal data is sent to a third party."
conditions_does_not_apply_when: The field carries no personal data.
artifact_contract_output_type: purpose-statement
artifact_contract_required_data:
  - the stated purpose
  - the fields collected against it
artifact_contract_verified_by: every collected field maps to a stated purpose
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/profile-user.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Collect personal data only against a stated purpose

Hardening asks "can an attacker read it?" Privacy asks "should *we* hold it at all, and for how long?"
The cheapest data to protect, breach, and comply over is the data you never collected; treat personal data as a liability to minimize.
**Collect only against a stated purpose.**
"Might be useful later" is latent breach scope, not a purpose.
Keep PII out of telemetry.
Make region a configurable policy, not a hardcoded assumption.
Reads session files locally (read-only, nothing modified)
Analyzes message patterns (not content meaning)
Nothing is sent to external services
Sensitive content (API keys, passwords) is automatically excluded
