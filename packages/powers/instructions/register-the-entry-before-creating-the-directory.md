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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/add-backlog.md
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
