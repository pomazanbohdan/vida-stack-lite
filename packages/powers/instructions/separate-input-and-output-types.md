---
instruction_id: separate-input-and-output-types
title: Separate the input and output types of an interface
summary: The type a surface accepts and the type it returns are two different contracts.
capability_tags:
  - design-structure
pattern_tags:
  - structural-design
conditions_applies_when: A surface both accepts data and returns data.
conditions_does_not_apply_when: The surface only returns data.
artifact_contract_output_type: type-contract
artifact_contract_required_data:
  - the input type
  - the output type
artifact_contract_verified_by: the input and the output types are distinct and both are typed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/api-and-interface-design/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Separate the input and output types of an interface
Input: what the caller provides

Output: what the system returns (includes server-generated fields)

Every endpoint has typed input and output schemas
