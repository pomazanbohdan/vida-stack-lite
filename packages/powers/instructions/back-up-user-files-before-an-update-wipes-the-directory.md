---
instruction_id: back-up-user-files-before-an-update-wipes-the-directory
title: Back up user files before an update wipes the directory
summary: "Files the user added inside a managed directory are copied out before the directory is replaced, and the copy is never deleted."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: An update is about to replace a directory that can hold user files.
conditions_does_not_apply_when: The directory holds nothing but managed files.
artifact_contract_output_type: user-file-backup
artifact_contract_required_data:
  - the files that were backed up
  - the backup location
artifact_contract_verified_by: the backup exists and was kept after the update
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/update-gsd.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Back up user files before an update wipes the directory
Either way the backup is **never deleted**, so declining is not destructive and you can restore later.
Restore them now — each file is copied back to its original location and the update reports what it restored.
