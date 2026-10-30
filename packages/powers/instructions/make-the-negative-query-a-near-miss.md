---
instruction_id: make-the-negative-query-a-near-miss
title: Make the negative query a near miss
summary: "The should-not queries share keywords, domain and phrasing with the should queries, because the signal lives in the pairs a careless reader would lump together."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: The set of queries that must not route to a skill is written.
conditions_does_not_apply_when: The set exists already and is only being run.
artifact_contract_output_type: negative-query-set
artifact_contract_required_data:
  - the near-miss pairs
  - the wording shared by each pair
artifact_contract_verified_by: each negative query shares vocabulary with a positive one that a careless reader would lump together
compatibility_excludes: []
compatibility_requires:
  - pair-each-negative-trigger-with-the-sibling-that-owns-it
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-eval/references/description-optimization.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Make the negative query a near miss
Generate about twenty near-miss queries, roughly half that should trigger the skill and half that should not.
The signal lives in the near misses, so make the should-not queries share keywords, domain, and phrasing with the should queries.
A should-not query that obviously belongs to another skill teaches the description nothing, because any wording already handles it.
The pairs that matter are the ones a careless reader would lump together: a request to build a workflow versus a request to debug an existing one, a request to write a brief versus a request to critique a brief someone already wrote.
Aim for variety in surface form (casual speech, a pasted error, a one-line ask, a paragraph of context) so the description is tested against the shapes real requests arrive in, not one tidy template.
