---
instruction_id: load-every-required-reading-before-any-other-action
title: Load every required reading before any other action
summary: "When the prompt carries a required-reading block, every file it lists is read before anything else happens."
capability_tags:
  - curate-context
pattern_tags:
  - guidance-selection
conditions_applies_when: The prompt contains a required-reading block.
conditions_does_not_apply_when: The prompt names no required reading.
artifact_contract_output_type: loaded-context
artifact_contract_required_data:
  - the files listed in the required reading
  - the fact that all of them were read first
artifact_contract_verified_by: every listed file was read before the first other action
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/mandatory-initial-read.md
status: active
revision: 1
---

# Load every required reading before any other action
If the prompt contains a `<required_reading>` block, you MUST use the `Read` tool to load every file listed there before performing any other actions. This is your primary context
