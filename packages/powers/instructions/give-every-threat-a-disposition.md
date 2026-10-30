---
instruction_id: give-every-threat-a-disposition
title: Give every threat a disposition
summary: "Each threat is mitigated, accepted or transferred; a threat without a disposition cannot be closed."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: A threat register is written or reviewed.
conditions_does_not_apply_when: The threat was already closed.
artifact_contract_output_type: threat-disposition
artifact_contract_required_data:
  - the threat
  - the disposition
  - the control that implements it
artifact_contract_verified_by: every threat carries a disposition and the control that implements it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/SECURITY.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Give every threat a disposition
All threats have a disposition (mitigate / accept / transfer)
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*
