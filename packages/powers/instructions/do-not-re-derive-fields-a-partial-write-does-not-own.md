---
instruction_id: do-not-re-derive-fields-a-partial-write-does-not-own
title: Do not re-derive fields a partial write does not own
summary: A write that touches one part of a record does not re-derive the rest and replace the curated values.
capability_tags:
  - persist-work-to-disk
pattern_tags:
  - override-layering
conditions_applies_when: A writer changes one part of a record that also holds values someone curated by hand.
conditions_does_not_apply_when: The write owns the whole record.
artifact_contract_output_type: partial-write
artifact_contract_required_data:
  - the part of the record the write changes
  - the fields the write leaves alone
  - the curated value that stayed
artifact_contract_verified_by: the curated value survived the append
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/features/reachable-lint-rules-and-non-destructive-quick-task-append.md
status: active
revision: 1
---

# Do not re-derive fields a partial write does not own
A body-only append no longer re-derives progress.
Appending one row triggered a full re-derive of the disk-derived `progress.*` frontmatter and replaced curated values.
Reproduced: a project with two real phase directories and a curated `total_phases: 25` collapsed to `2` on append.
