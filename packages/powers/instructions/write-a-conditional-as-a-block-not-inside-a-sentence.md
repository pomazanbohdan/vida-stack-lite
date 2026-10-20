---
instruction_id: write-a-conditional-as-a-block-not-inside-a-sentence
title: "Write a conditional as a block, not inside a sentence"
summary: A conditional in a template sits on its own lines; a whitespace difference in one variant is the acceptable price.
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A template carries a conditional.
conditions_does_not_apply_when: The file carries no conditional.
artifact_contract_output_type: template-rule
artifact_contract_required_data:
  - the conditional
  - where it sits
  - the price paid for the readable source
artifact_contract_verified_by: no conditional sits inside a sentence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=AGENTS.md
status: active
revision: 1
---

# Write a conditional as a block, not inside a sentence
Write template conditionals as block-level `{% if %}` on their own lines, never inside a sentence; a whitespace-only difference in one rendered variant is an acceptable price for readable source.
