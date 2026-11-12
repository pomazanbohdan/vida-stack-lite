---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-quick-batch-steps-merge-wave-md-9eda4ff4-c01"
title: "gsd-core: gsd-core/workflows/quick-batch/steps/merge-wave.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:gsd-core/workflows/quick-batch/steps/merge-wave.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/quick-batch/steps/merge-wave.md\"}"
atom_ids:
  - fail-closed-when-a-required-record-is-missing
  - keep-the-failed-units-artifact-for-diagnosis
  - let-one-failed-unit-not-block-the-others
  - merge-only-the-ready-prefix-of-a-wave
atom_count: 4
atoms: "[{\"atom_id\":\"fail-closed-when-a-required-record-is-missing\",\"file_sha256\":\"70b6a8c4d7a1345492e2be93f3fc4873a83c1a4d75c2caea63893185999c0e14\",\"content_sha256\":\"0130010d68fa86eee2eb10f60ff87d629b04630fd52fd5bd6d7daa79fb322e8c\",\"file_bytes\":1287,\"body_bytes\":164},{\"atom_id\":\"keep-the-failed-units-artifact-for-diagnosis\",\"file_sha256\":\"380f42a0d802f5e2ae71d523aa54fdbff8c4be36bbf695adecc5add2c80ca91c\",\"content_sha256\":\"33052edfc22cf5f50562f32cc01eb94caf09fd8ba78bdc90d4444cf98959a938\",\"file_bytes\":1439,\"body_bytes\":227},{\"atom_id\":\"let-one-failed-unit-not-block-the-others\",\"file_sha256\":\"833546e9955b95c99be24a690d7947ace72f1f23aa34f13d05088100d28206c1\",\"content_sha256\":\"3a9a6cb121d6998b4490b972404030cfb487d93fc32f7e56e9b0faf0650fbd3f\",\"file_bytes\":1743,\"body_bytes\":314},{\"atom_id\":\"merge-only-the-ready-prefix-of-a-wave\",\"file_sha256\":\"f45a587f54d6817d8102f5020cac9ec1ddf40f590384f98e4579534b82747523\",\"content_sha256\":\"bfbda7259569889f318f27de0162211afb20578c57fb3fba0fd06efd5044fdd2\",\"file_bytes\":1428,\"body_bytes\":345}]"
carrier_sha256: adf461118b56a7c5a7e1d4f0449db2d6d59bf4d778f17d01b7168ff37c0d1444
carrier_bytes: 6460
revision: 1
status: active
---
<!-- vpmodule:atom:begin fail-closed-when-a-required-record-is-missing -->
---
instruction_id: fail-closed-when-a-required-record-is-missing
title: Fail closed when a required record is missing
summary: "When the record a step depends on is absent, the step is routed as blocked; nothing is guessed and the dependent operation is not attempted."
capability_tags:
  - verify-work-results
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: A step reads a record that should have been written earlier and finds nothing.
conditions_does_not_apply_when: The record exists and only its content is at issue.
artifact_contract_output_type: blocked-entry
artifact_contract_required_data:
  - the missing record
  - the blocked entry
artifact_contract_verified_by: the entry is routed as blocked and the dependent call was not made
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch/steps/merge-wave.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Fail closed when a required record is missing
fail closed rather than guess
the same as any other blocked entry below
do NOT attempt the cleanup-wave call for it
<!-- vpmodule:atom:end fail-closed-when-a-required-record-is-missing -->
<!-- vpmodule:atom:begin keep-the-failed-units-artifact-for-diagnosis -->
---
instruction_id: keep-the-failed-units-artifact-for-diagnosis
title: "Keep the failed unit's artifact for diagnosis"
summary: "When an integration of one unit fails, the isolated workspace of that unit is kept for diagnosis instead of being deleted, and the unit is not marked complete."
capability_tags:
  - isolate-workspace
pattern_tags:
  - worktree-isolation
conditions_applies_when: A unit could not be integrated and its isolated workspace still holds the evidence.
conditions_does_not_apply_when: The integration succeeded and the workspace was already removed.
artifact_contract_output_type: failed-unit-diagnosis
artifact_contract_required_data:
  - the failed unit
  - the preserved workspace
  - the failure reason
artifact_contract_verified_by: the workspace of the failed unit is still there and the unit is not marked complete
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch/steps/merge-wave.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Keep the failed unit's artifact for diagnosis
do NOT remove the worktree or branch for this item; leave it for diagnosis
Do NOT mark the item complete for it
Continue with the rest of the batch
unrelated items are unaffected
<!-- vpmodule:atom:end keep-the-failed-units-artifact-for-diagnosis -->
<!-- vpmodule:atom:begin let-one-failed-unit-not-block-the-others -->
---
instruction_id: let-one-failed-unit-not-block-the-others
title: Let one failed unit not block the others
summary: A unit that fails inside a batch is recorded as failed and the batch continues; one unit never holds up the units that do not depend on it.
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Several independent units run in one batch and one of them fails.
conditions_does_not_apply_when: The units are ordered and the later one depends on the earlier one.
artifact_contract_output_type: batch-outcome
artifact_contract_required_data:
  - the failed unit
  - its failure reason
  - the units that continued
artifact_contract_verified_by: the failed unit carries a reason and the unrelated units were still dispatched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch/steps/merge-wave.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch/steps/plan-checker-loop.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch/steps/planner-wave.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Let one failed unit not block the others
one item's planner failure does not block unrelated items
one item's unresolved plan-check does not block unrelated items
do NOT block the whole batch
Display the remaining issues for this item and offer: 1) force-proceed with this item as-is, 2) mark this item `failed`
<!-- vpmodule:atom:end let-one-failed-unit-not-block-the-others -->
<!-- vpmodule:atom:begin merge-only-the-ready-prefix-of-a-wave -->
---
instruction_id: merge-only-the-ready-prefix-of-a-wave
title: Merge only the ready prefix of a wave
summary: "Independent units are merged in the order the wave assignment gave them, and only the prefix that is actually ready merges in a round."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: Independent units are merged in dependency-ordered waves.
conditions_does_not_apply_when: There is a single unit and no wave order.
artifact_contract_output_type: merge-round
artifact_contract_required_data:
  - the wave order
  - the ready subset
  - the mergeable prefix
artifact_contract_verified_by: only the ready prefix of a wave was merged and an out-of-order finisher waited
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch/steps/merge-wave.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Merge only the ready prefix of a wave
Repeat until no wave has a mergeable prefix left
never re-sort it
an executor may still be mid-flight for a sibling in the same wave
merges happen strictly in wave order, an out-of-order finisher waits
the PREFIX of the wave order
If empty, skip this wave this round (its first item hasn't finished yet).
<!-- vpmodule:atom:end merge-only-the-ready-prefix-of-a-wave -->