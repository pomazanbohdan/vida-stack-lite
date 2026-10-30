---
instruction_id: cap-and-scope-what-a-model-run-may-do
title: Cap and scope what a model run may do
summary: "Scope the tool permissions, validate every tool argument, confirm the destructive actions, and cap the tokens, the request rate and the recursion depth."
capability_tags:
  - harden-security-controls
pattern_tags:
  - threat-modeling
conditions_applies_when: A model can call tools or can run recursively.
conditions_does_not_apply_when: The model only returns text.
artifact_contract_output_type: run-caps
artifact_contract_required_data:
  - the tool permissions
  - the caps
  - the confirmation step
artifact_contract_verified_by: every tool argument is validated and the destructive action is confirmed before it runs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/security-and-hardening/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Cap and scope what a model run may do

Scope tool permissions, validate every tool argument, and confirm destructive actions (LLM06); cap tokens, request rate, and recursion depth (LLM10); partition RAG embeddings per tenant and validate documents before indexing (LLM08).
