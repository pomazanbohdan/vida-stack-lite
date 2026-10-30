---
instruction_id: treat-an-authentication-error-as-an-interaction-point
title: Treat an authentication error as an interaction point
summary: "An authentication error during the work is an expected interaction, not a defect: stop, ask for the exact step, verify the credentials, retry — and record it as normal flow."
capability_tags:
  - handle-an-authentication-prompt
pattern_tags:
  - human-in-the-loop
conditions_applies_when: The work hits an authentication or authorisation demand from an external service.
conditions_does_not_apply_when: The failure is a defect of the code under work.
artifact_contract_output_type: authentication-interaction
artifact_contract_required_data:
  - the authentication demand
  - the exact step the human must take
  - the verification of the credentials
  - the retry
artifact_contract_verified_by: the credentials were verified after the human acted and the task was retried
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Treat an authentication error as an interaction point
Auth errors during execution are NOT failures — they're expected interaction points.
Recognize auth gate (not a bug)
STOP task execution
Verify credentials work
Retry original task
Document as normal flow under "## Authentication Gates", not as deviations.
