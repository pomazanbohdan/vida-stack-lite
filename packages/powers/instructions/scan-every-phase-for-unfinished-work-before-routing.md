---
instruction_id: scan-every-phase-for-unfinished-work-before-routing
title: Scan every phase for unfinished work before routing
summary: "The routing looks across all phases for work that was started and not finished, not only in the phase the record points at."
capability_tags:
  - coordinate-program
pattern_tags:
  - change-impact-assessment
conditions_applies_when: The run decides what to do next.
conditions_does_not_apply_when: Only one phase can hold unfinished work and it is the recorded one.
artifact_contract_output_type: incomplete-work-scan
artifact_contract_required_data:
  - the phase that holds unfinished work
  - the reason the record was not enough
artifact_contract_verified_by: unfinished work was found across the phases before the route was chosen
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/progress.md
status: active
revision: 1
---

# Scan every phase for unfinished work before routing
Before any current-phase-scoped counting, scan ALL phases for incomplete execution.
was advanced past the phase that actually has unfinished work
Without this guard, the current-phase-scoped count in Step 1 would inspect the wrong phase and the routing would skip the unfinished work.
