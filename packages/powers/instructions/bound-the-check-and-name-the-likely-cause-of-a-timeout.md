---
instruction_id: bound-the-check-and-name-the-likely-cause-of-a-timeout
title: Bound the check and name the likely cause of a timeout
summary: A long-running check runs one-shot under a timeout; when it times out the run does not continue silently — the likely cause and the recovery options are named.
capability_tags:
  - verify-work-results
pattern_tags:
  - resource-bounds
conditions_applies_when: "A check that can run indefinitely (a test runner, a build) is executed."
conditions_does_not_apply_when: The check is known to terminate on its own.
artifact_contract_output_type: timeout-report
artifact_contract_required_data:
  - the budget the check ran under
  - the likely cause of the timeout
  - the recovery options
artifact_contract_verified_by: a timeout is reported with its cause and the run did not continue silently
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/regression-gate-run.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/post-merge-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Bound the check and name the likely cause of a timeout
The runner did not exit within the budget (watch/dev mode is the likely cause). Surface the watch-mode cause and the recovery options; never silently continue.
