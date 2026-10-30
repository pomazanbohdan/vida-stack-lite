---
instruction_id: overwrite-the-record-instead-of-appending
title: Overwrite the record instead of appending
summary: "The learning record of a phase is replaced, never appended to, so running the extraction twice yields the same document."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - single-source-of-truth
conditions_applies_when: The learning record of a phase already exists.
conditions_does_not_apply_when: The record is written for the first time.
artifact_contract_output_type: learnings-record
artifact_contract_required_data:
  - the path of the record
  - the fact that it was replaced
artifact_contract_verified_by: "the record contains one extraction, not two"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/extract-learnings.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Overwrite the record instead of appending
If a previous LEARNINGS.md exists, overwrite it (replace the file entirely).
Running extract-learnings twice on the same phase must overwrite (replace) the previous LEARNINGS.md, not append
