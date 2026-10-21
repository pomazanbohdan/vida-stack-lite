---
instruction_id: record-the-async-job-so-it-survives-the-pause
title: Record the async job so it survives the pause
summary: An external job that is still running is recorded with everything needed to check and resume it — and it is never cancelled by the pause.
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: The run pauses while an external job is still in flight.
conditions_does_not_apply_when: No external job is running.
artifact_contract_output_type: async-job-record
artifact_contract_required_data:
  - the job identity
  - its state
  - the expected artifacts
  - the verification and resume commands
artifact_contract_verified_by: the job was recorded with its resume path and was not cancelled
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/pause-work.md
status: active
revision: 1
---

# Record the async job so it survives the pause
record job id, backend, status, expected artifacts, verification + resume commands, and any watcher/daemon state.
Do NOT cancel the external job; it keeps running across the pause.
