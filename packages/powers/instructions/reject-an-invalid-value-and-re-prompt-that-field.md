---
instruction_id: reject-an-invalid-value-and-re-prompt-that-field
title: Reject an invalid value and re-prompt that field
summary: A value that fails validation is rejected by name and only that field is asked again; an empty answer keeps the current value and an invalid number is never coerced.
capability_tags:
  - harden-validation
pattern_tags:
  - automated-enforcement
conditions_applies_when: A value is typed into a field that has an accepted shape.
conditions_does_not_apply_when: The value comes from a fixed list.
artifact_contract_output_type: field-validation
artifact_contract_required_data:
  - the rejected value
  - the field it was rejected for
  - the value that was kept
artifact_contract_verified_by: the invalid value was rejected by name and the field was asked again
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/settings-advanced.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Reject an invalid value and re-prompt that field
the workflow MUST reject it, state which value was invalid, and re-prompt that single field
An empty input means "keep current" — the existing value is retained
Non-numeric input is never silently coerced
