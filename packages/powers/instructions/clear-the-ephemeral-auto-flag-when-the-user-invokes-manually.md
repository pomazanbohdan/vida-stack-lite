---
instruction_id: clear-the-ephemeral-auto-flag-when-the-user-invokes-manually
title: Clear the ephemeral auto flag when the user invokes manually
summary: An interrupted automatic run leaves no stale flag behind when the user comes back by hand.
capability_tags:
  - detect-the-run-mode
pattern_tags:
  - unattended-execution
conditions_applies_when: The user invoked the run by hand after an earlier automatic run was interrupted.
conditions_does_not_apply_when: The user asked for the automatic run.
artifact_contract_output_type: run-mode
artifact_contract_required_data:
  - the invocation that was detected
artifact_contract_verified_by: the ephemeral flag of the interrupted run is cleared and the persistent preference is untouched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase/modes/chain.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Clear the ephemeral auto flag when the user invokes manually
if user invoked manually (no `--auto` and no `--chain`), clear the ephemeral chain flag from any previous interrupted `--auto` chain. This does NOT touch `workflow.auto_advance` (the user's persistent settings preference)
