---
instruction_id: fail-closed-when-the-evidence-cannot-be-resolved
title: Fail closed when the evidence cannot be resolved
summary: A probe that could not be run is not read as a negative answer; the run stops for the user.
capability_tags:
  - verify-work-results
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: A probe that would decide whether the work happened could not be run.
conditions_does_not_apply_when: The probe ran and returned an answer.
artifact_contract_output_type: blocker
artifact_contract_required_data:
  - the probe that could not be resolved
  - the reason it stopped
artifact_contract_verified_by: an empty result was not read as a negative result and the run stopped for the user
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/completion-reconciliation.md
status: active
revision: 1
---

# Fail closed when the evidence cannot be resolved
empty is then NOT "no commits"
the commit probe has no answer
do not route to the failure handler on it, and do not re-dispatch an executor
and stop for the user.
