---
instruction_id: archive-the-old-artifacts-before-you-reuse-the-identifier
title: Archive the old artifacts before you reuse the identifier
summary: "Before the numbering restarts, the old directories are moved into the archive and checked; without an archive target the run stops and explains why."
capability_tags:
  - manage-technical-debt
pattern_tags:
  - incremental-cutover
conditions_applies_when: The numbering of a planned sequence is about to restart.
conditions_does_not_apply_when: The numbering continues where it stopped.
artifact_contract_output_type: archive-report
artifact_contract_required_data:
  - the archive target
  - the directories that were moved
  - the verification of the move
artifact_contract_verified_by: the old directories are gone before the new numbering starts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-milestone/steps/reset-phase-safety.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Archive the old artifacts before you reuse the identifier
Stop and explain that reset numbering is unsafe without a completed milestone archive target.
Archive the old directories first.
Verify the old directories are gone.
