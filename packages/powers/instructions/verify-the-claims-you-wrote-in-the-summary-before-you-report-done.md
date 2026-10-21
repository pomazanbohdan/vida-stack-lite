---
instruction_id: verify-the-claims-you-wrote-in-the-summary-before-you-report-done
title: Verify the claims you wrote in the summary before you report done
summary: "The files and the commits the summary names are checked to exist, and a failed check stops the run."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A summary of the work has just been written.
conditions_does_not_apply_when: The summary is not the deliverable.
artifact_contract_output_type: task-report
artifact_contract_required_data:
  - the self-check result
  - the missing items
artifact_contract_verified_by: the self-check ran and a failure stopped the run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-executor.md
status: active
revision: 1
---

# Verify the claims you wrote in the summary before you report done
After writing SUMMARY.md, verify claims before proceeding.
Check created files exist:
Check commits exist:
Append result to SUMMARY.md: `## Self-Check: PASSED` or `## Self-Check: FAILED` with missing items listed.
Do NOT skip. Do NOT proceed to state updates if self-check fails.
