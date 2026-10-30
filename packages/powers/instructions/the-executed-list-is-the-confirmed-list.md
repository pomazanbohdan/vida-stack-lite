---
instruction_id: the-executed-list-is-the-confirmed-list
title: The executed list is the confirmed list
summary: "The set that is executed is the same set that was shown and confirmed, produced by the same filter, so nothing runs that was not agreed."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A preview was shown and confirmed and then the same set is executed.
conditions_does_not_apply_when: Nothing was previewed or confirmed.
artifact_contract_output_type: confirmed-execution-list
artifact_contract_required_data:
  - the confirmed list
  - the executed list
  - the shared filter
artifact_contract_verified_by: "the executed list is the confirmed list, item for item"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/cleanup.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# The executed list is the confirmed list
Use the same filter as the dry-run so the execution list matches exactly what the user confirmed:
The execution list matches exactly what the user confirmed
