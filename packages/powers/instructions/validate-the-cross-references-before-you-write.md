---
instruction_id: validate-the-cross-references-before-you-write
title: Validate the cross-references before you write
summary: "Every reference is checked before the write, and an invalid reference blocks it."
capability_tags:
  - harden-validation
pattern_tags:
  - defense-in-depth
conditions_applies_when: A record that names other records is about to be written.
conditions_does_not_apply_when: The record names nothing.
artifact_contract_output_type: validation-report
artifact_contract_required_data:
  - the references checked
  - the invalid ones
artifact_contract_verified_by: the invalid references blocked the write
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/edit-phase.md
status: active
revision: 1
---

# Validate the cross-references before you write
validate that every referenced phase number exists
It must not reference itself
Exit (do not write).
invalid references block writes
