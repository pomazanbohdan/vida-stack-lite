---
instruction_id: show-the-current-values-before-you-ask-what-to-change
title: Show the current values before you ask what to change
summary: "The current values are shown first, and a field the user does not answer keeps its old value."
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: An existing record is about to be edited field by field.
conditions_does_not_apply_when: The record is being written from scratch.
artifact_contract_output_type: edit-request
artifact_contract_required_data:
  - the current values
  - the fields the user named
artifact_contract_verified_by: the current values were shown and a field the user did not answer kept its old value
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/edit-phase.md
status: active
revision: 1
---

# Show the current values before you ask what to change
Display the current phase fields clearly:
Ask which fields to edit. For each field the user wants to change, prompt for the new value.
Only fields the user explicitly answers become updates; empty answers preserve the existing value.
**If user chose [3] Cancel:** Exit cleanly.
