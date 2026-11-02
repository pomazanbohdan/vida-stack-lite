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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/execute-phase/steps/codebase-drift-gate.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep a non-blocking gate from failing the run
The phase is never failed by this gate.
Do NOT prompt the user. Do NOT block.
The phase is NOT failed by a remap failure.
This step is fully non-blocking — it never fails the phase
and any exception path returns control to
