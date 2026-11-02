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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/security-and-hardening/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - business
---

# Gate third-party sharing on consent

**Consent gates collection and third-party sharing, and is auditable.**
Sending PII to an analytics, ad, or LLM vendor is sharing; the vendor needs a data-processing agreement.
