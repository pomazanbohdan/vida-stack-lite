---
instruction_id: define-the-contract-before-the-code
title: Define the contract before the implementation
summary: The contract is the spec; the implementation follows it.
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: You are about to implement a surface other code will call.
conditions_does_not_apply_when: The change is internal to a single function.
artifact_contract_output_type: interface-contract
artifact_contract_required_data:
  - the input shape
  - the output shape
  - the error shape
artifact_contract_verified_by: the contract is written before the implementation and the implementation matches it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/api-and-interface-design/SKILL.md
status: active
revision: 1
---

# Define the contract before the implementation
Define the interface before implementing it. The contract is the spec — implementation follows.
