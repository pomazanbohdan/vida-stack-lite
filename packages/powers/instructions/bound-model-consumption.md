---
instruction_id: bound-model-consumption
title: Bound model consumption
summary: "Tokens, request rate and recursion depth are capped, so a model call cannot run away."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: "The work calls a model, directly or through an agent loop."
conditions_does_not_apply_when: No model is called.
artifact_contract_output_type: consumption-limits
artifact_contract_required_data:
  - the token cap
  - the request rate cap
  - the recursion or loop cap
artifact_contract_verified_by: all three caps are set and the call stops when one of them is reached
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/security-checklist.md
status: active
revision: 1
---

# Bound model consumption
Token, rate, and recursion/loop limits set (bound consumption)
LLM10 Unbounded Consumption | Cap tokens, request rate, and loop/recursion depth
