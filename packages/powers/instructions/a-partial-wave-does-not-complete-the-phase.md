---
instruction_id: a-partial-wave-does-not-complete-the-phase
title: A partial wave does not complete the phase
summary: "When a selected wave finishes and other units of the phase remain incomplete, the run stops there: the phase verification and the phase completion are intentionally skipped."
capability_tags:
  - execute-plan
pattern_tags:
  - completion-criteria
conditions_applies_when: A wave was run as a selection and other units of the same phase are still outstanding.
conditions_does_not_apply_when: The wave was the last outstanding work of the phase.
artifact_contract_output_type: partial-wave-report
artifact_contract_required_data:
  - the wave that ran
  - the units still outstanding
  - the skipped steps
artifact_contract_verified_by: the phase was not marked complete and the phase verification did not run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/partial-wave.md
status: active
revision: 1
---

# A partial wave does not complete the phase
If incomplete plans still remain anywhere in the phase:
STOP here
Do NOT run phase verification
Do NOT mark the phase complete
Selected wave finished successfully. This phase still has incomplete plans, so phase-level verification and completion were intentionally skipped.
