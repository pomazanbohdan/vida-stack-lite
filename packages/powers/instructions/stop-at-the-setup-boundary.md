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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/onboard.md
status: active
revision: 1
---

# Stop at the setup boundary
Do not run implementation execution or shipping from onboarding.
