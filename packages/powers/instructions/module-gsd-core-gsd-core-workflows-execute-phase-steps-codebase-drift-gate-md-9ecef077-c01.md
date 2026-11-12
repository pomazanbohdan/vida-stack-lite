---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-execute-phase-steps-codebase-drift-gate-md-9ecef077-c01"
title: "gsd-core: gsd-core/workflows/execute-phase/steps/codebase-drift-gate.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/workflows/execute-phase/steps/codebase-drift-gate.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/execute-phase/steps/codebase-drift-gate.md\"}"
atom_ids:
  - keep-a-non-blocking-gate-from-failing-the-run
  - record-the-baseline-only-after-the-work-succeeded
  - withhold-the-untrusted-paths-from-the-tool
atom_count: 3
atoms: "[{\"atom_id\":\"keep-a-non-blocking-gate-from-failing-the-run\",\"file_sha256\":\"247a491e10adcdd4afd2a485c42e6f0ace75e6db517aebbeb1db1e39a8c8a2e8\",\"content_sha256\":\"3d0f8bd1db381e93480e7767930d164809859558edef3e342448c3b9ffc6ff1e\",\"file_bytes\":1343,\"body_bytes\":273},{\"atom_id\":\"record-the-baseline-only-after-the-work-succeeded\",\"file_sha256\":\"a8f90e04f5070e1b93e89da28c0fb0c8c721e95149ee37fca0532a06ff85047b\",\"content_sha256\":\"7e8d86f7c222f5d4954c5b3dff1d96f45ad10bf0288f52d891610e840a933c3e\",\"file_bytes\":1505,\"body_bytes\":385},{\"atom_id\":\"withhold-the-untrusted-paths-from-the-tool\",\"file_sha256\":\"fdd112328206210c231dcf3ea7b1990fac816600d47e2b7a908299c53f048d30\",\"content_sha256\":\"9720212943299abecf9067e34e99034c41a79d2bd6ad9f0954d0f32efaf276ae\",\"file_bytes\":1269,\"body_bytes\":181}]"
carrier_sha256: 1ab80a7cb83248f06582809e6993e4c03dace877156181340b0ee5c2e8cde0b0
carrier_bytes: 4562
revision: 1
status: active
---
<!-- vpmodule:atom:begin keep-a-non-blocking-gate-from-failing-the-run -->
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
<!-- vpmodule:atom:end keep-a-non-blocking-gate-from-failing-the-run -->
<!-- vpmodule:atom:begin record-the-baseline-only-after-the-work-succeeded -->
---
instruction_id: record-the-baseline-only-after-the-work-succeeded
title: Record the baseline only after the work succeeded
summary: "The baseline is recorded only after the refresh succeeded, and only for the documents that were refreshed."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - release-readiness
conditions_applies_when: A tool refreshed documents that carry a recorded baseline.
conditions_does_not_apply_when: The tool failed and nothing was refreshed.
artifact_contract_output_type: baseline-record
artifact_contract_required_data:
  - the refreshed documents
  - the recorded baseline
artifact_contract_verified_by: the baseline was recorded only after the refresh succeeded and only for the documents that were refreshed
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
  - engineering
---

# Record the baseline only after the work succeeded
Only stamp on success: stamping after a failed remap would record a baseline the map never reached.
The stamp is a shell step, not a line in the mapper's prompt.
An agent that concludes its work is already done skips a prose instruction silently, and the stamp is the one marker no human reviewing the documents would notice missing
<!-- vpmodule:atom:end record-the-baseline-only-after-the-work-succeeded -->
<!-- vpmodule:atom:begin withhold-the-untrusted-paths-from-the-tool -->
---
instruction_id: withhold-the-untrusted-paths-from-the-tool
title: Withhold the untrusted paths from the tool
summary: "Paths that are absolute, traversing, or carry odd characters are neither passed to the tool nor listed."
capability_tags:
  - harden-validation
pattern_tags:
  - untrusted-content-handling
conditions_applies_when: Paths found in the workspace are about to be handed to a tool that acts on them.
conditions_does_not_apply_when: The paths came from the trusted configuration of the run.
artifact_contract_output_type: path-list
artifact_contract_required_data:
  - the paths passed on
  - the paths withheld
artifact_contract_verified_by: the withheld paths are neither passed to the tool nor listed
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
  - engineering
---

# Withhold the untrusted paths from the tool
{N} path(s) withheld: not passed to the mapper or listed (absolute, traversal, whitespace, non-ASCII or shell-metacharacter characters)
<!-- vpmodule:atom:end withhold-the-untrusted-paths-from-the-tool -->