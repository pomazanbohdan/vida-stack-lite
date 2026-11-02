---
instruction_id: stop-at-the-setup-boundary
title: Stop at the setup boundary
summary: A setup step prepares the workspace and stops there; it does not run the work or ship it.
capability_tags:
  - execute-plan
pattern_tags:
  - approval-policy-gate
conditions_applies_when: A setup or onboarding step is running.
conditions_does_not_apply_when: The run has already moved past setup into execution.
artifact_contract_output_type: setup-boundary
artifact_contract_required_data:
  - what the setup prepared
  - the step that was handed on to
artifact_contract_verified_by: no implementation was executed and nothing was shipped by the setup step
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/onboard.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Stop at the setup boundary
Do not run implementation execution or shipping from onboarding.
