---
instruction_id: never-persist-a-value-the-capability-gate-would-reject
title: Never persist a value the capability gate would reject
summary: "A setting surface never writes a value that the run-time gate would fail closed on, whatever the answer to the question was."
capability_tags:
  - write-configuration-override
pattern_tags:
  - override-layering
conditions_applies_when: A setting is written whose value the execution gate checks again later.
conditions_does_not_apply_when: The setting is not checked by a gate.
artifact_contract_output_type: capability-aware-setting
artifact_contract_required_data:
  - the resolved capability
  - the value that was written
artifact_contract_verified_by: the written value is one the gate accepts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/settings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Never persist a value the capability gate would reject
never persist a value the isolation gate would fail closed on
Failing closed is right in both columns
Only the explanation changes
