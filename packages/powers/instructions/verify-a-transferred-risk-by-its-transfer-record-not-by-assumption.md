---
instruction_id: verify-a-transferred-risk-by-its-transfer-record-not-by-assumption
title: "Verify a transferred risk by its transfer record, not by assumption"
summary: "A risk handed to another party is closed only when the transfer record exists; 'not our problem' is not the evidence."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: A registered risk carries a disposition that hands it to somebody else.
conditions_does_not_apply_when: The risk is mitigated in this codebase and verified there.
artifact_contract_output_type: risk-verification
artifact_contract_required_data:
  - the disposition
  - the transfer record that was found
  - the verdict
artifact_contract_verified_by: "the verdict is closed only when the transfer record was located, and absent otherwise"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-security-auditor.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-security-auditor.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Verify a transferred risk by its transfer record, not by assumption
Treating `transfer` disposition as "not our problem" without verifying transfer documentation exists
For `transfer` threats: check for transfer documentation → present = `CLOSED`, absent = `OPEN`.
