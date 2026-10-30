---
instruction_id: warn-but-still-restore
title: Warn but still restore
summary: A restore that may no longer work carries a warning and is still performed; the warning is advisory.
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - graceful-degradation
conditions_applies_when: A backed-up file is restored after an update.
conditions_does_not_apply_when: The file is known to be compatible with the new version.
artifact_contract_output_type: restore-warning
artifact_contract_required_data:
  - the warning that was raised
  - the file that was restored
artifact_contract_verified_by: the file was restored and the warning is shown next to it
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

# Warn but still restore
Before copying anything back, the restore runs a compatibility pass against the version that was just installed and attaches a warning to any file that looks like it may no longer work
Warnings are advisory: the file is still restored, with the warning shown next to it, so you can decide whether to fix it.
