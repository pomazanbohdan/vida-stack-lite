---
instruction_id: validate-the-user-input-before-the-capability-gate
title: Validate the user input before the capability gate
summary: "The input the user gave is checked before the configuration gate is consulted, so a wrong input is reported as a wrong input and never as a disabled capability."
capability_tags:
  - clarify-requirements
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: A command can be refused because a capability is switched off and the user input may also be wrong.
conditions_does_not_apply_when: The user input is already known to be valid.
artifact_contract_output_type: input-validation-order
artifact_contract_required_data:
  - the validation result
  - the gate consulted afterwards
artifact_contract_verified_by: the user error was reported before the gate was read
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/code-review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Validate the user input before the capability gate
This runs BEFORE config gate check so user errors are surfaced immediately regardless of config state.
Only skip when explicitly disabled.
