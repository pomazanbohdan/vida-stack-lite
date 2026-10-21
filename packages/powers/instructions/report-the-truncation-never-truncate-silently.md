---
instruction_id: report-the-truncation-never-truncate-silently
title: "Report the truncation, never truncate silently"
summary: "When the selection is larger than the operation wants, the count is shown and the operation stops; a partial rollback leaves a worse state than none at all."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: A rollback selects more commits than it is willing to take back in one go.
conditions_does_not_apply_when: The selection is small enough to take back whole.
artifact_contract_output_type: truncation-report
artifact_contract_required_data:
  - the number of selected commits
  - the decision to stop
artifact_contract_verified_by: the count was reported and nothing was partially reverted
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/undo.md
status: active
revision: 1
---

# Report the truncation, never truncate silently
**Report truncation, never truncate silently.** If the selection exceeds 50 commits, show the count and stop rather than capping — a partial phase revert leaves a worse tree state than either reverting the phase or not:
