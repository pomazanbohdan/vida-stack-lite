---
instruction_id: keep-a-diagnostic-out-of-the-gate
title: Keep a diagnostic out of the gate
summary: "A coverage diagnostic never blocks the run, never fails a reviewer and never changes the gate; it is reported only when there is something to report."
capability_tags:
  - triage-reports
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A measure of the coverage of a run is collected next to a gate that decides whether the run passes.
conditions_does_not_apply_when: The measure is the gate.
artifact_contract_output_type: coverage-diagnostic
artifact_contract_required_data:
  - the coverage
  - the lanes it is incomplete for
  - the gate decision
artifact_contract_verified_by: the diagnostic was reported and the gate decision did not change because of it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/review.md
status: active
revision: 1
---

# Keep a diagnostic out of the gate
This is diagnostic only: it never blocks the workflow, never fails a lane, and never changes the
only when at least one graded lane has `complete: false`
