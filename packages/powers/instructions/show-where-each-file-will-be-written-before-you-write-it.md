---
instruction_id: show-where-each-file-will-be-written-before-you-write-it
title: Show where each file will be written before you write it
summary: "The resolved path, the mode and the source of every item are shown once, before the write."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A set of files is about to be written.
conditions_does_not_apply_when: A single file is written and its path is not in question.
artifact_contract_output_type: work-manifest
artifact_contract_required_data:
  - the resolved path of every item
  - the mode of every item
  - the source of every item
artifact_contract_verified_by: the table was shown before the write and it was not duplicated in another shape
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/docs-update.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Show where each file will be written before you write it
Present a table showing the resolved path, mode, and source for every doc in the queue:
This table MUST be shown to the user — it is the primary confirmation of where files will be written and whether existing files will be updated.
The mode resolution table IS the queue presentation — it shows every doc with its resolved path, mode, and source. Do not duplicate the list in a separate format.
Present the assembled queue to the user before proceeding:
Doc queue assembled ({N} docs). Proceed with generation?
