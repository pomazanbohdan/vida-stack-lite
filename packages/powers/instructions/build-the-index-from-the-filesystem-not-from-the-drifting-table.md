---
instruction_id: build-the-index-from-the-filesystem-not-from-the-drifting-table
title: "Build the index from the filesystem, not from the drifting table"
summary: The index is built by scanning the archive directory; the summary table beside it is known to drift from disk and is never the source.
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - single-source-of-truth
conditions_applies_when: An index of stored items has to be produced.
conditions_does_not_apply_when: The table and the filesystem are known to agree.
artifact_contract_output_type: index
artifact_contract_required_data:
  - the scan of the archive directory
  - the entries the scan found
artifact_contract_verified_by: every indexed entry came from the directory scan and no entry came from the summary table
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/handle-quick-and-fast-tasks.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Build the index from the filesystem, not from the drifting table
The index is built by scanning the archive directory itself, never from `STATE.md`'s table — the table is known to drift from disk, so the filesystem is the only source of truth here.
