---
instruction_id: back-up-and-offer-the-restore-of-what-the-wipe-would-destroy
title: Back up and offer the restore of what the wipe would destroy
summary: "The files that an installation does not know about are copied aside before it wipes its directories, and afterwards the restore is offered for the entries that can actually be restored."
capability_tags:
  - ship-a-change-safely
pattern_tags:
  - revertable-increments
conditions_applies_when: An installation replaces its directories and files the user added live inside them.
conditions_does_not_apply_when: The installation replaces nothing.
artifact_contract_output_type: restore-offer
artifact_contract_required_data:
  - the files that were backed up
  - the entries that can be restored
  - the decision
artifact_contract_verified_by: everything that would have been destroyed was backed up and only restorable entries were offered
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/update.md
status: active
revision: 1
---

# Back up and offer the restore of what the wipe would destroy
Before running the installer, detect and back up any user-added files inside the managed directories.
i.e., files the user added themselves that the installer does not know about and will delete during the wipe.
Drive the question off the number of entries that can actually be restored, never off the number sitting in the backup, or the prompt offers to restore files that accepting cannot restore.
Do not restore without an explicit answer either way.
The backup is **never** deleted.
Warnings are advisory — a file with warnings is still restored, so surface them next to what was restored rather than treating them as failures.
