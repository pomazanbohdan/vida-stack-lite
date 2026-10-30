---
instruction_id: show-every-requirement-not-counts
title: "Show every requirement, not counts"
summary: "The confirmation shows the whole list of requirements, each one in full, so the caller can judge them item by item."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A list of requirements is put up for confirmation.
conditions_does_not_apply_when: Only a number is needed.
artifact_contract_output_type: full-requirement-list
artifact_contract_required_data:
  - every requirement in full
  - the confirmation question
artifact_contract_verified_by: every requirement is shown in full and not summarised as a count
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-project.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - operations
---

# Show every requirement, not counts
Show every requirement (not counts) for user confirmation:
Present full requirements list (interactive mode only):
Does this capture what you're building? (yes / adjust)
