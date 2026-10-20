---
instruction_id: write-the-abuse-case-next-to-the-use-case
title: Write the abuse case next to the use case
summary: "For each feature ask how you would misuse it, and make that the first test."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: The use cases of a feature are written.
conditions_does_not_apply_when: The feature takes no input and performs no action.
artifact_contract_output_type: abuse-case
artifact_contract_required_data:
  - the misuse
  - the first test it drives
artifact_contract_verified_by: the abuse case is the first test for the feature
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
status: active
revision: 1
---

# Write the abuse case next to the use case

**Write abuse cases next to use cases.**
For each feature, ask "how would I misuse this?" — then make that your first test.
