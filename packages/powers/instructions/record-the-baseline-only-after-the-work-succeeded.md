---
instruction_id: record-the-baseline-only-after-the-work-succeeded
title: Record the baseline only after the work succeeded
summary: "The baseline is recorded only after the refresh succeeded, and only for the documents that were refreshed."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - release-readiness
conditions_applies_when: A tool refreshed documents that carry a recorded baseline.
conditions_does_not_apply_when: The tool failed and nothing was refreshed.
artifact_contract_output_type: baseline-record
artifact_contract_required_data:
  - the refreshed documents
  - the recorded baseline
artifact_contract_verified_by: the baseline was recorded only after the refresh succeeded and only for the documents that were refreshed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/codebase-drift-gate.md
status: active
revision: 1
---

# Record the baseline only after the work succeeded
Only stamp on success: stamping after a failed remap would record a baseline the map never reached.
The stamp is a shell step, not a line in the mapper's prompt.
An agent that concludes its work is already done skips a prose instruction silently, and the stamp is the one marker no human reviewing the documents would notice missing
