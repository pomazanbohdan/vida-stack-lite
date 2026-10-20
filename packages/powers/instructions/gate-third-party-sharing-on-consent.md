---
instruction_id: gate-third-party-sharing-on-consent
title: Gate third-party sharing on consent
summary: "Sending personal data to an analytics, ad or model vendor is sharing, so it needs an auditable consent and a data-processing agreement."
capability_tags:
  - manage-personal-data
pattern_tags:
  - data-minimization
conditions_applies_when: Personal data leaves your system for a third party.
conditions_does_not_apply_when: Nothing leaves the system.
artifact_contract_output_type: sharing-gate
artifact_contract_required_data:
  - the recipient
  - the consent record
  - the agreement
artifact_contract_verified_by: a consent record exists for every recipient and the agreement is in place
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
status: active
revision: 1
---

# Gate third-party sharing on consent

**Consent gates collection and third-party sharing, and is auditable.**
Sending PII to an analytics, ad, or LLM vendor is sharing; the vendor needs a data-processing agreement.
