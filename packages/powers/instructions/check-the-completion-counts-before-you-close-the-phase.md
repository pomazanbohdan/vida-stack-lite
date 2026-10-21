---
instruction_id: check-the-completion-counts-before-you-close-the-phase
title: Check the completion counts before you close the phase
summary: "The planned units and the finished units are counted against each other; skipping a unit is destructive and is always put to the person, and the record states how many really ran."
capability_tags:
  - verify-work-results
pattern_tags:
  - completion-criteria
conditions_applies_when: A unit of work is about to be declared finished.
conditions_does_not_apply_when: The unit of work has no planned sub-units.
artifact_contract_output_type: completion-check
artifact_contract_required_data:
  - the planned units
  - the finished units
  - the units that were skipped
artifact_contract_verified_by: the counts were compared and the record states the real number of finished units
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/transition.md
status: active
revision: 1
---

# Check the completion counts before you close the phase
If counts match: all plans complete
If counts don't match: incomplete
**SAFETY RAIL.** Skipping incomplete plans is destructive — ALWAYS prompt regardless of mode.
Update ROADMAP: "2/3 plans complete" (not "3/3")
Note in transition message which plans were skipped
