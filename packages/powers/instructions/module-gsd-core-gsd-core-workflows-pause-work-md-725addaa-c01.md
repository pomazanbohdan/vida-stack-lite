---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-pause-work-md-725addaa-c01"
title: "gsd-core: gsd-core/workflows/pause-work.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/workflows/pause-work.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/pause-work.md\"}"
atom_ids:
  - measure-the-uncommitted-files-never-assert-them
  - record-only-the-constraints-you-actually-hit
  - record-the-async-job-so-it-survives-the-pause
  - treat-a-placeholder-summary-as-incomplete
atom_count: 4
atoms: "[{\"atom_id\":\"measure-the-uncommitted-files-never-assert-them\",\"file_sha256\":\"e76afce36b0d20f9b338083571848a975b9b1fc9bdd013deb8fb94fdbf27255e\",\"content_sha256\":\"cca2db06fb01e5ce6a9f27549e127182136b629d4a6fe21682606c5f12b54edf\",\"file_bytes\":1508,\"body_bytes\":342},{\"atom_id\":\"record-only-the-constraints-you-actually-hit\",\"file_sha256\":\"b52cf6dbe3c12953b663fc563c07a5268d7f2812f875f07839fad5bfda84ed42\",\"content_sha256\":\"5e1d77f6e0bea5a0f8aa5769251d1e19307dcbfbce167917b5b20f36542c0423\",\"file_bytes\":1404,\"body_bytes\":313},{\"atom_id\":\"record-the-async-job-so-it-survives-the-pause\",\"file_sha256\":\"3643298a29e82625e86da4f2d6a9b9f011eceed603409dd64ca6b2247bf1d245\",\"content_sha256\":\"f5a4e34b2f28c5c2d46fcd4514417ce4b9443ac183422bcdb4521e359f0441aa\",\"file_bytes\":1348,\"body_bytes\":229},{\"atom_id\":\"treat-a-placeholder-summary-as-incomplete\",\"file_sha256\":\"c96971770e9a50481dd97e4ce10b4e7e05f1bd0fd4746fd4910116da624a7448\",\"content_sha256\":\"82b05f9b1a401c582ef11046455e3feffe5ceb6e0a2cd929bc8565361ff0fc05\",\"file_bytes\":1217,\"body_bytes\":163}]"
carrier_sha256: ac9e4562724b64edc8681abce6e2ba1e20447d56b9337bf58c02cec6f411ad41
carrier_bytes: 6062
revision: 1
status: active
---
<!-- vpmodule:atom:begin measure-the-uncommitted-files-never-assert-them -->
---
instruction_id: measure-the-uncommitted-files-never-assert-them
title: "Measure the uncommitted files, never assert them"
summary: "The list of uncommitted files comes from an actual call, never from memory, and it is never rounded to empty."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - verification-before-completion
conditions_applies_when: A handoff or a status record lists the files that are changed but not committed.
conditions_does_not_apply_when: The working copy is clean and the list is empty.
artifact_contract_output_type: working-copy-measurement
artifact_contract_required_data:
  - the measurement that was taken
  - the entries it produced
  - the elided count when the list was truncated
artifact_contract_verified_by: the list came from a call and a non-empty result was never rounded to empty
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/pause-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Measure the uncommitted files, never assert them
Populate it from an actual call, not from memory
NEVER round it to empty
One array entry per line ("XY path"); truncate the list at 50 entries and note the
elided count, but NEVER round it to empty — a non-empty porcelain output is the single
most load-bearing fact a resume session needs
<!-- vpmodule:atom:end measure-the-uncommitted-files-never-assert-them -->
<!-- vpmodule:atom:begin record-only-the-constraints-you-actually-hit -->
---
instruction_id: record-only-the-constraints-you-actually-hit
title: Record only the constraints you actually hit
summary: "A constraint is written down only when it was discovered through a real failure, and it carries a severity."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A run is being handed over and the constraints it hit are written down.
conditions_does_not_apply_when: The constraint was predicted or warned about but never hit.
artifact_contract_output_type: constraint-record
artifact_contract_required_data:
  - each constraint
  - how it was discovered
  - its severity
artifact_contract_verified_by: every recorded constraint came from an observed failure and carries a severity
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/pause-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Record only the constraints you actually hit
Only include items discovered through actual failure — not warnings or predictions.
Assign each constraint a `severity`:
blocking — The resuming agent MUST demonstrate understanding before proceeding.
advisory — Important context but does not gate resumption.
<!-- vpmodule:atom:end record-only-the-constraints-you-actually-hit -->
<!-- vpmodule:atom:begin record-the-async-job-so-it-survives-the-pause -->
---
instruction_id: record-the-async-job-so-it-survives-the-pause
title: Record the async job so it survives the pause
summary: An external job that is still running is recorded with everything needed to check and resume it — and it is never cancelled by the pause.
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - graceful-degradation
conditions_applies_when: The run pauses while an external job is still in flight.
conditions_does_not_apply_when: No external job is running.
artifact_contract_output_type: async-job-record
artifact_contract_required_data:
  - the job identity
  - its state
  - the expected artifacts
  - the verification and resume commands
artifact_contract_verified_by: the job was recorded with its resume path and was not cancelled
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/pause-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Record the async job so it survives the pause
record job id, backend, status, expected artifacts, verification + resume commands, and any watcher/daemon state.
Do NOT cancel the external job; it keeps running across the pause.
<!-- vpmodule:atom:end record-the-async-job-so-it-survives-the-pause -->
<!-- vpmodule:atom:begin treat-a-placeholder-summary-as-incomplete -->
---
instruction_id: treat-a-placeholder-summary-as-incomplete
title: Treat a placeholder summary as incomplete
summary: "A summary that still holds placeholder text is reported as an unfinished item, not as done work."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A summary written earlier is checked before the work is treated as finished.
conditions_does_not_apply_when: The summary carries real content.
artifact_contract_output_type: false-completion-check
artifact_contract_required_data:
  - the summaries that hold placeholder text
  - the way each was reported
artifact_contract_verified_by: every summary with placeholder content is reported as an incomplete item
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/pause-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Treat a placeholder summary as incomplete
Check for placeholder content in existing summaries
Report any summaries with placeholder content as incomplete items.
<!-- vpmodule:atom:end treat-a-placeholder-summary-as-incomplete -->