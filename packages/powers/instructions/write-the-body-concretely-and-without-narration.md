---
instruction_id: write-the-body-concretely-and-without-narration
title: Write the body concretely and without narration
summary: "The body carries the content and nothing else: no preamble, no apology and no narration of the reasoning, and every name in it is a concrete one."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: The body of a document is written.
conditions_does_not_apply_when: "The text is a message to a person, not the body of a document."
artifact_contract_output_type: document-body
artifact_contract_required_data:
  - the body
artifact_contract_verified_by: "the body holds no preamble, apology or reasoning narration and names concrete fields and examples"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
status: active
revision: 1
---

# Write the body concretely and without narration
Do not include preamble, apologies, or reasoning narration in the document body.
The body must be valid markdown that a human or downstream agent can consume directly.
Be concrete. Prefer concrete examples and concrete field names over generic hand-waving.
