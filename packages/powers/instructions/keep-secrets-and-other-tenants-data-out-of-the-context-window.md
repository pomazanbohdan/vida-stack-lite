---
instruction_id: keep-secrets-and-other-tenants-data-out-of-the-context-window
title: "Keep secrets and other tenants' data out of the context window"
summary: "The context window carries only what the task needs, with no secret, no other tenant's data and no full system prompt in it."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: A context window is assembled for a model call.
conditions_does_not_apply_when: No model call is made.
artifact_contract_output_type: context-policy
artifact_contract_required_data:
  - what the context carries
  - what is excluded from it
artifact_contract_verified_by: "the assembled context contains no secret, no other tenant's data and no full system prompt"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Keep secrets and other tenants' data out of the context window

**Keep secrets, other tenants' data, and the full system prompt out of the context window** (LLM02, LLM07);
