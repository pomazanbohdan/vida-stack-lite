---
instruction_id: report-all-validation-errors-at-once
title: Report all validation errors at once
summary: "Every validation failure is reported in one pass, not one message per failure."
capability_tags:
  - triage-reports
pattern_tags:
  - output-formatting
conditions_applies_when: Several inputs are validated before anything is created.
conditions_does_not_apply_when: A single input is validated.
artifact_contract_output_type: validation-report
artifact_contract_required_data:
  - every failed input
  - the reason of each failure
artifact_contract_verified_by: no validation failure is reported alone
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-workspace.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Report all validation errors at once
Report all validation errors at once, not one at a time.
Validate before creating anything.
