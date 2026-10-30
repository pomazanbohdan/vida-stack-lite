---
instruction_id: enforce-permissions-in-code-not-in-the-prompt
title: "Enforce permissions in code, not in the prompt"
summary: "Untrusted text in the context can carry instructions, so the system prompt is not a security boundary."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: A model is given untrusted text in its context.
conditions_does_not_apply_when: The model never sees untrusted text.
artifact_contract_output_type: permission-enforcement
artifact_contract_required_data:
  - the untrusted context
  - the code check that enforces the permission
artifact_contract_verified_by: the permission is enforced outside the prompt
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Enforce permissions in code, not in the prompt

**Prompts can be hijacked.**
Untrusted text in the context — a user message, a fetched page, a PDF — can carry instructions.
The system prompt is not a security boundary; enforce permissions in code.
