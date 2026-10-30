---
instruction_id: treat-an-authentication-error-as-a-gate-not-a-failure
title: "Treat an authentication error as a gate, not a failure"
summary: "An access refusal stops the task and asks for the credential; it is recorded as ordinary flow, not as a defect."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A tool or an API refuses the call because nobody is signed in.
conditions_does_not_apply_when: The call failed for a reason other than the credential.
artifact_contract_output_type: checkpoint
artifact_contract_required_data:
  - the steps to authenticate
  - the check that confirms it
artifact_contract_verified_by: the run stopped and named the authentication steps instead of retrying blindly
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-executor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Treat an authentication error as a gate, not a failure
Auth errors during `type="auto"` execution are gates, not failures.
Recognize it's an auth gate (not a bug)
STOP current task
Provide exact auth steps (CLI commands, where to get keys)
Document auth gates as normal flow, not deviations.
