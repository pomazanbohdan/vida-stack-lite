---
instruction_id: keep-a-non-blocking-gate-from-failing-the-run
title: Keep a non-blocking gate from failing the run
summary: A diagnostic gate that breaks does not fail the run; it reports and the run continues.
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: A diagnostic gate runs inside a larger run.
conditions_does_not_apply_when: The gate is one the run is required to pass.
artifact_contract_output_type: gate-report
artifact_contract_required_data:
  - the reason the gate was skipped
  - the drift found
artifact_contract_verified_by: an internal error of the gate did not fail the run and the skip was logged in one line
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/codebase-drift-gate.md
status: active
revision: 1
---

# Keep a non-blocking gate from failing the run
The phase is never failed by this gate.
Do NOT prompt the user. Do NOT block.
The phase is NOT failed by a remap failure.
This step is fully non-blocking — it never fails the phase
and any exception path returns control to
