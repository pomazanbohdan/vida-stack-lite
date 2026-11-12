---
schema: VPInstructionModule/v1
instruction_id: "module-gsd-core-docs-how-to-update-gsd-md-ac1fb304-c01"
title: "gsd-core: docs/how-to/update-gsd.md module"
summary: "Carrier for 4 atomic instructions from gsd-core:docs/how-to/update-gsd.md."
source: "{\"donor\":\"gsd-core\",\"path\":\"docs/how-to/update-gsd.md\"}"
atom_ids:
  - back-up-user-files-before-an-update-wipes-the-directory
  - report-every-invalid-path-with-its-consequence
  - skip-a-restore-that-would-overwrite-something
  - warn-but-still-restore
atom_count: 4
atoms: "[{\"atom_id\":\"back-up-user-files-before-an-update-wipes-the-directory\",\"file_sha256\":\"9ee3f783fac1d8d11610ccd024d250e26455b007c3ba260f5ca343cec72aca8e\",\"content_sha256\":\"88987483464e9fe1282945720b3f0721b175a3b33ffad1a64b32b3d381e0fbd3\",\"file_bytes\":1350,\"body_bytes\":273},{\"atom_id\":\"report-every-invalid-path-with-its-consequence\",\"file_sha256\":\"64e4d946a5534d335178419951da61ea90bc677b43307f559f0448650d508603\",\"content_sha256\":\"65005058996805f9df7f576ff36deec4a3faf58edf37120a6b9e877184a9f405\",\"file_bytes\":1199,\"body_bytes\":158},{\"atom_id\":\"skip-a-restore-that-would-overwrite-something\",\"file_sha256\":\"69f8ab2b30dcdb67306f5a06bcfba0821b6370768e885c1a791869f45b2c91ba\",\"content_sha256\":\"24c46a54128b62bc8bd27f331080c4222b97d7df0cad1c9d32ce4d5abf330ecf\",\"file_bytes\":1241,\"body_bytes\":205},{\"atom_id\":\"warn-but-still-restore\",\"file_sha256\":\"ea1b2cf9cb77ccac22fb1a0c56133c24e5f1b8cded6562f8b51017ac08123ee1\",\"content_sha256\":\"33dd641c073fb7e9a090dd673ca73493ec9aa3711f270133eec78cb9e0dfab73\",\"file_bytes\":1319,\"body_bytes\":333}]"
carrier_sha256: 2919b30c292ea1cf3233f34514c4f59e6dfa2d849378eace3d78bbac558ed6d3
carrier_bytes: 5676
revision: 1
status: active
---
<!-- vpmodule:atom:begin back-up-user-files-before-an-update-wipes-the-directory -->
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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/update-gsd.md
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
<!-- vpmodule:atom:end back-up-user-files-before-an-update-wipes-the-directory -->
<!-- vpmodule:atom:begin report-every-invalid-path-with-its-consequence -->
---
instruction_id: report-every-invalid-path-with-its-consequence
title: Report every invalid path with its consequence
summary: A failing update reports every invalid path and says what happens to that runtime configuration next.
capability_tags:
  - verify-work-results
pattern_tags:
  - verification-before-completion
conditions_applies_when: An update fails on an invalid path.
conditions_does_not_apply_when: The update succeeded.
artifact_contract_output_type: invalid-path-report
artifact_contract_required_data:
  - the invalid paths
  - what happens to the configuration for each
artifact_contract_verified_by: every invalid path is reported with the consequence for the configuration
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/update-gsd.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Report every invalid path with its consequence
the update fails and reports every invalid path, each tagged with what happens to that runtime's config next
<!-- vpmodule:atom:end report-every-invalid-path-with-its-consequence -->
<!-- vpmodule:atom:begin skip-a-restore-that-would-overwrite-something -->
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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/update-gsd.md
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
<!-- vpmodule:atom:end skip-a-restore-that-would-overwrite-something -->
<!-- vpmodule:atom:begin warn-but-still-restore -->
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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=docs/how-to/update-gsd.md
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
<!-- vpmodule:atom:end warn-but-still-restore -->