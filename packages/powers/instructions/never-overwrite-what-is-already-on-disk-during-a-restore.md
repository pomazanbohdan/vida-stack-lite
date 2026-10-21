---
instruction_id: never-overwrite-what-is-already-on-disk-during-a-restore
title: Never overwrite what is already on disk during a restore
summary: A restore puts back what is missing; a file that is present was never lost and is left alone.
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - prepared-reversal
conditions_applies_when: A staged copy is restored over the working directory.
conditions_does_not_apply_when: Nothing is staged.
artifact_contract_output_type: restore-record
artifact_contract_required_data:
  - the files that were restored
  - the files that were left alone
artifact_contract_verified_by: no file that was already present was overwritten by the restore
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/recover-and-troubleshoot.md
status: active
revision: 1
---

# Never overwrite what is already on disk during a restore
The next install or uninstall looks for staged copies left behind by an interrupted run and restores them before doing anything else. It will not overwrite a file that is already there — a file present on disk was never lost — and it leaves alone any staging belonging to another install still running.
