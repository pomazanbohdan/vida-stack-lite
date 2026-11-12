---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-gsd-core-workflows-add-backlog-md-2c316ca4-c01"
title: "gsd-core: gsd-core/workflows/add-backlog.md module"
summary: "Carrier for 2 atomic instructions from gsd-core:gsd-core/workflows/add-backlog.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"gsd-core/workflows/add-backlog.md\"}"
atom_ids:
  - park-an-unready-idea-outside-the-plan-sequence
  - register-the-entry-before-creating-the-directory
atom_count: 2
atoms: "[{\"atom_id\":\"park-an-unready-idea-outside-the-plan-sequence\",\"file_sha256\":\"9911c62623b4f78cc82a259513e789c2b81b0acddb921e00fb728ca25e79be9b\",\"content_sha256\":\"5e17c9b9a6929fb4923e70cf370bbc584a6ef46f7e0d6362c5eeb5511f92160c\",\"file_bytes\":1486,\"body_bytes\":296},{\"atom_id\":\"register-the-entry-before-creating-the-directory\",\"file_sha256\":\"b1fccb5479e62fccd6670cbd6861df75654855cbb1c40e493783479f8bc8143c\",\"content_sha256\":\"d046eaf374e8bb0575cc7ddc5c50cc395988b8171ddb22abf681e929ae85dde7\",\"file_bytes\":1474,\"body_bytes\":279}]"
carrier_sha256: 96c53d2e7adb120eadbd982ba2ba3474edd897714690d1efbc37e827fcda6fba
carrier_bytes: 3263
revision: 1
status: active
---
<!-- vpmodule:atom:begin park-an-unready-idea-outside-the-plan-sequence -->
---
instruction_id: park-an-unready-idea-outside-the-plan-sequence
title: Park an unready idea outside the plan sequence
summary: "An idea that is not ready for planning waits in a parking lot outside the sequence: it is unsequenced, it carries no dependency field, and it accumulates context over time."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - technical-debt
conditions_applies_when: An idea surfaces that is worth keeping but is not ready to be planned or sequenced.
conditions_does_not_apply_when: The idea is ready to be planned now and belongs in the plan sequence.
artifact_contract_output_type: parked-item
artifact_contract_required_data:
  - the parked item
  - why it is not ready
  - the number it was given
artifact_contract_verified_by: the parked item carries no dependency field and sits outside the active sequence
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/add-backlog.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Park an unready idea outside the plan sequence
Backlog items are unsequenced ideas that aren't ready for active planning - they live outside the normal phase sequence and accumulate context over time.
No `Depends on:` field - backlog items are unsequenced by definition
Never guess the number.
<!-- vpmodule:atom:end park-an-unready-idea-outside-the-plan-sequence -->
<!-- vpmodule:atom:begin register-the-entry-before-creating-the-directory -->
---
instruction_id: register-the-entry-before-creating-the-directory
title: Register the entry before creating the directory
summary: "The record of an item is written before the artefact it describes exists, because the existence of the artefact is what other parts read to decide whether the item is already registered."
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A new item is registered and both the record and the artefact are created.
conditions_does_not_apply_when: Only the artefact is created and no record names it.
artifact_contract_output_type: registration-order
artifact_contract_required_data:
  - the record written first
  - the artefact created second
artifact_contract_verified_by: "the record exists before the artefact, so an existence check cannot report a false duplicate"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/add-backlog.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Register the entry before creating the directory
Write the roadmap entry BEFORE creating the directory.
Directory existence is a reliable indicator that the phase is already registered, which prevents false duplicate detection in any hook that checks for existing directories.
<!-- vpmodule:atom:end register-the-entry-before-creating-the-directory -->