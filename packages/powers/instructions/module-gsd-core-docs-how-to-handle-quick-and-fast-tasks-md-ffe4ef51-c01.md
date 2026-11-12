---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-handle-quick-and-fast-tasks-md-ffe4ef51-c01"
title: "gsd-core: docs/how-to/handle-quick-and-fast-tasks.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:docs/how-to/handle-quick-and-fast-tasks.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/handle-quick-and-fast-tasks.md\"}"
atom_ids:
  - build-the-index-from-the-filesystem-not-from-the-drifting-table
  - never-reshape-a-closed-record
atom_count: 2
atoms: "[{\"atom_id\":\"build-the-index-from-the-filesystem-not-from-the-drifting-table\",\"file_sha256\":\"d303b525064d9819e28796be4bbc8d38903d066c93cc1828f518524c4fc83f99\",\"content_sha256\":\"31fb3d5d27109b66e4bce30ae80e17b519785badb7abb20a8c8434997b40d0fe\",\"file_bytes\":1397,\"body_bytes\":253},{\"atom_id\":\"never-reshape-a-closed-record\",\"file_sha256\":\"f482d413b88cae61a0880b6f7f0837299c0497d1680524ca32f90704eba20dc6\",\"content_sha256\":\"c065e3e59faf9a3734b4eeaf65519f62962899c38707bd7dbe3c8b4b80717347\",\"file_bytes\":2524,\"body_bytes\":798}]"
carrier_sha256: b4a38a1a422b61340c24358842aa344d865cbbb81f1f49c19707bd24fe7a8961
carrier_bytes: 4220
revision: 1
status: active
---
<!-- vpmodule:atom:begin build-the-index-from-the-filesystem-not-from-the-drifting-table -->
---
instruction_id: build-the-index-from-the-filesystem-not-from-the-drifting-table
title: "Build the index from the filesystem, not from the drifting table"
summary: The index is built by scanning the archive directory; the summary table beside it is known to drift from disk and is never the source.
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - single-source-of-truth
conditions_applies_when: An index of stored items has to be produced.
conditions_does_not_apply_when: The table and the filesystem are known to agree.
artifact_contract_output_type: index
artifact_contract_required_data:
  - the scan of the archive directory
  - the entries the scan found
artifact_contract_verified_by: every indexed entry came from the directory scan and no entry came from the summary table
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/handle-quick-and-fast-tasks.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Build the index from the filesystem, not from the drifting table
The index is built by scanning the archive directory itself, never from `STATE.md`'s table — the table is known to drift from disk, so the filesystem is the only source of truth here.
<!-- vpmodule:atom:end build-the-index-from-the-filesystem-not-from-the-drifting-table -->
<!-- vpmodule:atom:begin never-reshape-a-closed-record -->
---
instruction_id: never-reshape-a-closed-record
title: Never reshape a closed record
summary: A finished or dropped item and its plan are the record; they are not reshaped to a newer template and completed work is not rewritten as a new breakdown.
capability_tags:
  - plan-implementation
pattern_tags:
  - stable-identity
conditions_applies_when: "A work item is finished, dropped, or already published."
conditions_does_not_apply_when: The item is still open and is being revised.
artifact_contract_output_type: closed-record
artifact_contract_required_data:
  - the record as it was written
  - the reason it is left alone
artifact_contract_verified_by: the closed record is unchanged
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/ticket.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=skills/bmad-agent-po/references/slice.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/existing-codebases/getting-deeper.md
  - donor=bmad-method; license=MIT; revision=bd70c643a7ec85d1ec2e88076b3fbdd8e4517f41; path=docs/plan/break-work-into-stories-and-track-it.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-phase/steps/closed-phase-gate.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/handle-quick-and-fast-tasks.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Never reshape a closed record
A done or dropped ticket and its plan are the record: do not reshape them to a newer template.
Do not rewrite completed or active work as a new breakdown.
Keep the plans: they own status and historical evidence.
Keep completed plans. Deleting one removes the state and evidence later builds, review, and retrospective read.
Replanning a closed phase silently rewrites plan docs that no longer match the shipped code, so the workflow must hard-stop here unless the operator explicitly overrides.
those states mean planning was finished but verification did not pass (or has gone stale), and replanning is a legitimate next step.
The reset is **refused** — every row is preserved untouched rather than risk destroying data under a schema the tool doesn't recognize.
<!-- vpmodule:atom:end never-reshape-a-closed-record -->