---
instruction_id: describe-the-concept-by-its-grain-range-and-caveats
title: "Describe the concept by its grain, its range and its caveats"
summary: "A concept is described by what one row is, over which time range it holds and what was obfuscated or sampled; a description without those is not yet a description of the thing."
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A concept is described in prose.
conditions_does_not_apply_when: The concept is a definition that has no rows and no range.
artifact_contract_output_type: document
artifact_contract_required_data:
  - the grain
  - the time range
  - the obfuscation or sampling caveats
artifact_contract_verified_by: "the prose names the grain, the time range and the caveats"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=open-knowledge-format; license=Apache-2.0; revision=ad30107c31c06aec8a7d5636e0d1058118604e6f; path=src/reference_agent/prompts/reference_instruction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - research
---

# Describe the concept by its grain, its range and its caveats
A short prose description (1–3 paragraphs) of what this concept is, what it represents, and how it is typically used.
For tables, describe the grain (one row per X), the time range, and any obfuscation or sampling caveats.
