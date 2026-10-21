---
instruction_id: bind-a-claim-to-a-source-with-a-matching-label
title: Bind a claim to a source with a matching label
summary: "A claim that rests on a source is marked with a footnote whose label is the id of that source entry, so the claim and its evidence are found together."
capability_tags:
  - define-output-format
pattern_tags:
  - source-cited-decisions
conditions_applies_when: A claim in the body rests on a named source.
conditions_does_not_apply_when: The body carries no claim that rests on a source.
artifact_contract_output_type: document
artifact_contract_required_data:
  - the claim
  - the footnote label
  - the id of the source entry it names
artifact_contract_verified_by: the label of the footnote on the claim is the id of a source entry and the footnote is defined in the body
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
status: active
revision: 1
---

# Bind a claim to a source with a matching label
Each entry is a mapping with a required `resource` (the URI), a stable `id` key, and a human-readable `title`.
To attribute a specific claim in the body, end the sentence with a markdown footnote whose label matches a `sources[].id` (e.g. a sentence ending in `[^export-docs]`, with a matching `[^export-docs]: Export schema` footnote definition later in the body).
