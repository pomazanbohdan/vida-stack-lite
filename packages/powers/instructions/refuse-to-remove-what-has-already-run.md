---
instruction_id: refuse-to-remove-what-has-already-run
title: Refuse to remove what has already run
summary: Only work that has not started yet can be removed; a unit that is current or already executed is refused unless the owner confirms the force.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A unit of the plan is to be removed and renumbered.
conditions_does_not_apply_when: The unit was never started and no work depends on it.
artifact_contract_output_type: removal-refusal
artifact_contract_required_data:
  - the unit
  - its state
  - the confirmation that was asked for
artifact_contract_verified_by: the removal was refused for a unit that has already run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/remove-phase.md
status: active
revision: 1
---

# Refuse to remove what has already run
Verify the phase is a future phase (not started)
Target must be > current phase number
Only future phases can be removed
If the phase has executed plans
the removal may be forced
only if the user confirms
