---
instruction_id: pair-each-negative-trigger-with-the-sibling-that-owns-it
title: Pair each negative trigger with the sibling that owns it
summary: "A negative prompt names the skill that should own it, and the check asserts that owner outranks the skill under test, so the negative cannot pass vacuously."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: "A skill's trigger test has negative prompts that must not route to it."
conditions_does_not_apply_when: The skill has no sibling that could own a prompt.
artifact_contract_output_type: trigger-case
artifact_contract_required_data:
  - the negative prompt
  - the sibling skill that owns it
  - the assertion that the owner outranks
artifact_contract_verified_by: the owner skill outranks the skill under test for the negative prompt
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=evals/README.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Pair each negative trigger with the sibling that owns it
`negative` prompts belong to a *different* skill; this skill must not rank first for them.
Declare that skill in `owner` where you can: the runner then asserts the owner **outranks** this skill, turning the negative into a real pairwise routing test instead of one that can pass vacuously when the prompt matches nothing.
