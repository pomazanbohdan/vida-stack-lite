---
instruction_id: verify-a-repair-by-re-running-the-check-without-it
title: Verify a repair by re-running the check without it
summary: "After a repair, the check is run again in its ordinary mode and the final state is reported; a configuration that blocks the pipeline makes the state degraded even when the structural check is clean."
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: A repair was applied to a state that a check reported on.
conditions_does_not_apply_when: No repair was applied.
artifact_contract_output_type: repair-verification
artifact_contract_required_data:
  - the check that was run again
  - the final status
  - the state that still blocks the pipeline
artifact_contract_verified_by: the check was re-run without the repair and the reported status follows its result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/health.md
status: active
revision: 1
---

# Verify a repair by re-running the check without it
Re-run health check without --repair to confirm issues are resolved
Report final status.
