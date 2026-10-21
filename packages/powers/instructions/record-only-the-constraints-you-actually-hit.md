---
instruction_id: record-only-the-constraints-you-actually-hit
title: Record only the constraints you actually hit
summary: "A constraint is written down only when it was discovered through a real failure, and it carries a severity."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A run is being handed over and the constraints it hit are written down.
conditions_does_not_apply_when: The constraint was predicted or warned about but never hit.
artifact_contract_output_type: constraint-record
artifact_contract_required_data:
  - each constraint
  - how it was discovered
  - its severity
artifact_contract_verified_by: every recorded constraint came from an observed failure and carries a severity
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/pause-work.md
status: active
revision: 1
---

# Record only the constraints you actually hit
Only include items discovered through actual failure — not warnings or predictions.
Assign each constraint a `severity`:
blocking — The resuming agent MUST demonstrate understanding before proceeding.
advisory — Important context but does not gate resumption.
