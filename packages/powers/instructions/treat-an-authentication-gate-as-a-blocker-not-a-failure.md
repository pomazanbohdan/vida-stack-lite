---
instruction_id: treat-an-authentication-gate-as-a-blocker-not-a-failure
title: "Treat an authentication gate as a blocker, not a failure"
summary: "A missing credential is an expected gate: the work stops once, the human is given the exact steps, and the original attempt is retried afterwards."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - human-in-the-loop
conditions_applies_when: An automated attempt stopped because credentials were missing or rejected.
conditions_does_not_apply_when: The attempt failed for a reason that credentials do not explain.
artifact_contract_output_type: authentication-gate
artifact_contract_required_data:
  - the attempt that was blocked
  - the exact authentication steps
  - the check that shows the credential works
artifact_contract_verified_by: "the original attempt was retried after the human authenticated, and it succeeded"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/checkpoints.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Treat an authentication gate as a blocker, not a failure
Auth gate = the agent tried CLI/API, got auth error. Not a failure — a gate requiring human input to unblock.
Recognize it's not a failure - missing auth is expected
Stop current task - don't retry repeatedly
Provide exact authentication steps
Verify authentication works
Retry the original task
Pre-planned checkpoint: "I need you to do X" (wrong - the agent should automate)
Auth gate: "I tried to automate X but need credentials" (correct - unblocks automation)
Auth gates are created dynamically when the agent encounters auth errors. NOT pre-planned — the agent automates first, asks for credentials only when blocked.
