---
instruction_id: skip-silently-when-there-is-not-enough-data
title: Skip silently when there is not enough data
summary: "With too few phases or too few items to compare, the scan prints nothing at all rather than a thin report."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - empty-result-policy
conditions_applies_when: The scan found too few phases or too few items to compare.
conditions_does_not_apply_when: There was enough data to cluster.
artifact_contract_output_type: silent-skip
artifact_contract_required_data:
  - the reason the scan was skipped
artifact_contract_verified_by: nothing was printed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/graduation.md
status: active
revision: 1
---

# Skip silently when there is not enough data
**Skip silently (print nothing) if:**
completed prior phases exist (not enough data)
**Skip silently (print nothing) if total items across all LEARNINGS.md files in the window is fewer than 5.**
