---
instruction_id: read-the-domain-glossary-in-full-before-you-name-anything
title: Read the domain glossary in full before you name anything
summary: The glossary of domain terms and recurring mistakes is read completely before anything is named or a structure is proposed; an absent glossary is not an error.
capability_tags:
  - model-domain-language
pattern_tags:
  - domain-language
conditions_applies_when: Anything is about to be named or a structural change is about to be proposed.
conditions_does_not_apply_when: The repository has no glossary file at all.
artifact_contract_output_type: glossary-read
artifact_contract_required_data:
  - the glossary file
  - the fact that it was read in full
  - what happens when it is absent
artifact_contract_verified_by: "the glossary was read in full before naming, and its absence did not stop the work"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/agents/domain.md
status: active
revision: 1
---

# Read the domain glossary in full before you name anything
- Read in full before naming anything or proposing architecture changes.
- If either file doesn't exist yet, proceed silently.
