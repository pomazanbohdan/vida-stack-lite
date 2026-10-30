---
instruction_id: check-for-a-built-in-capability-before-defining-your-own
title: Check for a built-in capability before defining your own
summary: "Before writing a custom agent, check whether the ready-made read-only or general-purpose agents already cover the role."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A new agent or subagent is about to be defined.
conditions_does_not_apply_when: No new agent is being defined.
artifact_contract_output_type: agent-reuse-check
artifact_contract_required_data:
  - the ready-made agents checked
  - the role they cover
  - why a custom agent is still needed
artifact_contract_verified_by: the existing capabilities were checked first and a custom agent is defined only for what they miss
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/orchestration-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Check for a built-in capability before defining your own
Before defining a custom subagent, check whether one of these covers the role:
- Read-only codebase search and analysis. Use this for research isolation
- Read-only research during plan mode
- Multi-step tasks needing both exploration and modification
Don't redefine these. Layer your specialist personas on top of them.
Define a custom research subagent only when the built-in doesn't fit (e.g. you need a domain-specific system prompt the model wouldn't infer).
