---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-next-md-d1ab2011-c01"
title: "gsd-core: gsd-core/workflows/next.md module"
summary: "Carrier for 3 atomic instructions from gsd-core:gsd-core/workflows/next.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/next.md\"}"
atom_ids:
  - derive-the-next-step-from-the-artifacts-not-the-pointer
  - record-the-deferral-when-you-advance-past-incomplete-work
  - run-the-hard-stop-gates-before-you-route
atom_count: 3
atoms: "[{\"atom_id\":\"derive-the-next-step-from-the-artifacts-not-the-pointer\",\"file_sha256\":\"f02875e641b8654aee53783f9577192a40b7787465294e474082cff20b810eef\",\"content_sha256\":\"edf4e42c17cc5cb300efb95ab5c57ab36f6a171b503d8f92b3dc7562048c1f35\",\"file_bytes\":1465,\"body_bytes\":387},{\"atom_id\":\"record-the-deferral-when-you-advance-past-incomplete-work\",\"file_sha256\":\"26ba1877432838c681725faa89e459f51dd3787b4ff176673bec78bac4227ed5\",\"content_sha256\":\"5ec5a8d908d69f20582e957b08477b9f4e8218f567de951091cc96ef9d4d92ac\",\"file_bytes\":1534,\"body_bytes\":424},{\"atom_id\":\"run-the-hard-stop-gates-before-you-route\",\"file_sha256\":\"3fc1b9777949cbfa805b2ca29126d5ea08b92498908fe47d1ce73c7a6dd122ed\",\"content_sha256\":\"26734148baffbf30cece3a09c4a3b80d2ae845ec53846140c4be7ccefeb4757c\",\"file_bytes\":1312,\"body_bytes\":248}]"
carrier_sha256: 044540955a13065590ab44c4ae19e92b70b3c5c8582898f78f5dba74542b324b
carrier_bytes: 4788
revision: 1
status: active
---
<!-- vpmodule:atom:begin derive-the-next-step-from-the-artifacts-not-the-pointer -->
---
instruction_id: derive-the-next-step-from-the-artifacts-not-the-pointer
title: "Derive the next step from the artifacts, not from the pointer"
summary: The next step is derived from what the artefacts show - a unit whose plans have no matching summaries is unfinished even when the pointer has moved past it.
capability_tags:
  - execute-plan
pattern_tags:
  - scope-routing
conditions_applies_when: The run has to decide what to do next.
conditions_does_not_apply_when: The next step is already decided and recorded.
artifact_contract_output_type: next-step-decision
artifact_contract_required_data:
  - the unfinished unit
  - the reason the pointer was not trusted
artifact_contract_verified_by: the next step follows the artefacts on disk
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/next.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Derive the next step from the artifacts, not from the pointer
This catches the common failure mode where a session died mid-execution (hang, token exhaustion, API connection drop)
Stop at the first such phase.
This is the lowest-numbered phase that needs continued execution.
errors are surfaced rather than suppressed
Plans without summaries: unfinished.
The pointer is not evidence.
<!-- vpmodule:atom:end derive-the-next-step-from-the-artifacts-not-the-pointer -->
<!-- vpmodule:atom:begin record-the-deferral-when-you-advance-past-incomplete-work -->
---
instruction_id: record-the-deferral-when-you-advance-past-incomplete-work
title: Record the deferral when you advance past incomplete work
summary: "Advancing past unfinished work is a recorded decision: the report names the gaps, the cost of advancing, and every deferred item keeps its source."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: The run is about to advance although earlier work is incomplete.
conditions_does_not_apply_when: Nothing earlier is incomplete.
artifact_contract_output_type: deferral-record
artifact_contract_required_data:
  - the incomplete items
  - the consequences of advancing
  - the source of each deferred item
artifact_contract_verified_by: every deferred item is recorded with its source
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/next.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Record the deferral when you advance past incomplete work
If incomplete prior work is found, show a structured completeness report:
Advancing before resolving these may cause:
Verification gaps - future phase verification won't have visibility into what prior phases shipped
Context loss - plans that ran without summaries leave no record for future agents
Each deferred item keeps its source.
Commit the deferral record.
<!-- vpmodule:atom:end record-the-deferral-when-you-advance-past-incomplete-work -->
<!-- vpmodule:atom:begin run-the-hard-stop-gates-before-you-route -->
---
instruction_id: run-the-hard-stop-gates-before-you-route
title: Run the hard-stop gates before you route
summary: The validity gates run before any routing decision and the run stops at the first gate that fires; an explicit override skips them and says so.
capability_tags:
  - verify-work-results
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: The run is about to advance to the next step.
conditions_does_not_apply_when: The run only reports; it does not advance.
artifact_contract_output_type: gate-report
artifact_contract_required_data:
  - the gates that were checked
  - the first gate that fired
  - the override notice
artifact_contract_verified_by: no routing happens before the gates are checked
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/next.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Run the hard-stop gates before you route
Run hard-stop checks before routing.
Exit on first hit.
Hard stop: Unresolved checkpoint
Hard stop: Project in error state
Hard stop: unchecked verification failures
An explicit override skips every gate.
<!-- vpmodule:atom:end run-the-hard-stop-gates-before-you-route -->