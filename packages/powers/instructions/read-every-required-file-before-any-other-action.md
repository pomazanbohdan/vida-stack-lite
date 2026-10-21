---
instruction_id: read-every-required-file-before-any-other-action
title: Read every required file before any other action
summary: A prompt that names the files to read is read first and in full; that set is the primary context of the run and nothing else starts before it is loaded.
capability_tags:
  - curate-context
pattern_tags:
  - guidance-selection
conditions_applies_when: The prompt names the files that have to be read.
conditions_does_not_apply_when: The prompt names no files to read.
artifact_contract_output_type: required-reading
artifact_contract_required_data:
  - the files that were read
  - the order they were read in
artifact_contract_verified_by: every listed file was read before any other action
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/mandatory-initial-read.md
status: active
revision: 1
---

# Read every required file before any other action
If the prompt contains a `<required_reading>` block,
you MUST load every file listed there before performing any other actions. This is your primary context.
