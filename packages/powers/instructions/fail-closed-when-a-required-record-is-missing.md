---
instruction_id: fail-closed-when-a-required-record-is-missing
title: Fail closed when a required record is missing
summary: "When the record a step depends on is absent, the step is routed as blocked; nothing is guessed and the dependent operation is not attempted."
capability_tags:
  - verify-work-results
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: A step reads a record that should have been written earlier and finds nothing.
conditions_does_not_apply_when: The record exists and only its content is at issue.
artifact_contract_output_type: blocked-entry
artifact_contract_required_data:
  - the missing record
  - the blocked entry
artifact_contract_verified_by: the entry is routed as blocked and the dependent call was not made
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch/steps/merge-wave.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Fail closed when a required record is missing
fail closed rather than guess
the same as any other blocked entry below
do NOT attempt the cleanup-wave call for it
