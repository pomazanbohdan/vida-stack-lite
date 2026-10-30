---
instruction_id: skip-a-restore-that-would-overwrite-something
title: Skip a restore that would overwrite something
summary: A restore is skipped when it would overwrite a file the new release ships or a file that is already there.
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: A backed-up file is about to be restored over an existing path.
conditions_does_not_apply_when: The path is free.
artifact_contract_output_type: skipped-restore
artifact_contract_required_data:
  - the path that was skipped
  - the reason it was skipped
artifact_contract_verified_by: the restore was skipped with the reason recorded and the file stayed in the backup
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
  - operations
---

# Skip a restore that would overwrite something
A different file is already sitting at that path (restoring would overwrite your current version).
Both stay in the backup and are reported with the reason.
