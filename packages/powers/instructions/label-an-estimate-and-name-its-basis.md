---
instruction_id: label-an-estimate-and-name-its-basis
title: Label an estimate and name its basis
summary: "A quantity that was not measured is presented as an estimate, and the report says which observable signals it was derived from and that it reflects the activity of the session only."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: A report states a quantity that no instrument measured.
conditions_does_not_apply_when: The quantity was measured.
artifact_contract_output_type: estimated-metrics
artifact_contract_required_data:
  - the estimated values
  - the signals they were derived from
  - the note that they are estimates
artifact_contract_verified_by: the report marks the values as estimates and names their basis
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/session-report.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Label an estimate and name its basis
Count of tool calls is not directly available, so estimate from git activity and file operations
This is an **estimate** — exact token counts require API-level instrumentation not available to hooks
Token and cost estimates require API-level instrumentation
These metrics reflect observable session activity only
