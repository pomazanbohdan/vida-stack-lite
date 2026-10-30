---
instruction_id: validate-semantics-not-just-shape
title: "Validate semantics, not just shape"
summary: "Make the generator check the values it writes, not only the shape of the file it writes them into."
capability_tags:
  - author-agent-instructions
pattern_tags:
  - instruction-authoring
conditions_applies_when: A generator or a checker writes configuration values it can verify.
conditions_does_not_apply_when: The tool only copies text it does not interpret.
artifact_contract_output_type: semantic-validation
artifact_contract_required_data:
  - checked values
  - known valid values
  - rejected value
artifact_contract_verified_by: an invalid value in the checked set is rejected
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=docs/advanced-per-agent-configuration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Validate semantics, not just shape
Generation also lets the tooling validate **semantics, not just shape**: confirm that a model name is a known model, that a tool name is a real tool, that `max_turns` is a positive integer, and that `temperature` (where still applicable) is a valid number in range.

Shape-only checks let invalid values such as `parseInt("1.5")` or `parseFloat("0.2oops")` slip through.
