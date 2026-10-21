---
instruction_id: write-the-rubric-in-the-language-of-the-domain-experts
title: Write the rubric in the language of the domain experts
summary: "The dimensions, the good case and the bad case are written so that two practitioners of the field would agree on them."
capability_tags:
  - model-domain-language
pattern_tags:
  - domain-language
conditions_applies_when: Evaluation criteria for a domain are written.
conditions_does_not_apply_when: The criteria are about the machinery rather than the domain.
artifact_contract_output_type: rubric
artifact_contract_required_data:
  - the dimensions
  - the good case
  - the bad case
  - the stakes
artifact_contract_verified_by: no criterion is generic and the good and bad cases are specific
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-domain-researcher.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-domain-researcher.compact.md
status: active
revision: 1
---

# Write the rubric in the language of the domain experts
Rubric ingredients in practitioner language, not AI/ML jargon
Good/Bad specific enough that two domain experts would agree — not "accurate" or "helpful"
Regulatory context: only what is directly relevant — do not list every possible regulation
Do not fabricate criteria — only surface research or well-established practitioner knowledge
