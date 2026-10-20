---
instruction_id: enforce-permissions-outside-the-prompt
title: Enforce permissions outside the prompt
summary: "Prompt injection is assumed, the permissions are enforced in code, and the secrets, the cross-tenant data and the system prompt stay out of the context window."
capability_tags:
  - harden-security-controls
pattern_tags:
  - defense-in-depth
conditions_applies_when: The work calls a model or lets an agent act.
conditions_does_not_apply_when: No model is called and no agent acts.
artifact_contract_output_type: model-permission-review
artifact_contract_required_data:
  - the permissions enforced in code
  - the tool scopes
  - the confirmations required
  - what is kept out of the context window
artifact_contract_verified_by: every permission is enforced outside the prompt and no destructive action happens without a confirmation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/security-checklist.md
status: active
revision: 1
---

# Enforce permissions outside the prompt
Prompt injection assumed; permissions enforced in code, not in the system prompt
Secrets, cross-tenant data, and full system prompts kept out of the context window
Tool/agent permissions scoped; destructive or irreversible actions require confirmation
LLM01 Prompt Injection | Don't trust the system prompt as a boundary; enforce permissions in code
LLM05 Improper Output Handling | Treat model output as untrusted; validate, parameterize, encode
LLM06 Excessive Agency | Scope tool permissions; confirm destructive actions
LLM07 System Prompt Leakage | Assume the system prompt can leak; put no secrets in it
LLM08 Vector and Embedding Weaknesses | Partition RAG embeddings per tenant; validate documents before indexing
