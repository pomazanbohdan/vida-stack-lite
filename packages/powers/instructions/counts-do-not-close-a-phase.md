---
instruction_id: counts-do-not-close-a-phase
title: Counts do not close a phase
summary: A phase is finished only when its verification passed; matching counts alone never close it.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: The status of a phase is derived from what was produced.
conditions_does_not_apply_when: The verification report already says it passed.
artifact_contract_output_type: phase-status
artifact_contract_required_data:
  - the count of the artifacts
  - the verification status
  - the route that follows
artifact_contract_verified_by: the phase was not called complete while its verification had not passed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/progress.md
status: active
revision: 1
---

# Counts do not close a phase
only sees plans/summaries, so without this check such a phase is reported complete and routing skips straight to the next phase.
every other status routes back to close verification debt
