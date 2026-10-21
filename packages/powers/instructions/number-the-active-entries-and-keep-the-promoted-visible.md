---
instruction_id: number-the-active-entries-and-keep-the-promoted-visible
title: Number the active entries and keep the promoted ones visible
summary: The list numbers the active entries in order and shows the promoted ones dimmed instead of dropping them.
capability_tags:
  - capture-an-idea
pattern_tags:
  - output-formatting
conditions_applies_when: A list of captured entries is rendered.
conditions_does_not_apply_when: The list was already rendered and numbered.
artifact_contract_output_type: numbered-list
artifact_contract_required_data:
  - the active entries in order
  - the promoted entries shown dimmed
  - the note about how many entries were left out
artifact_contract_verified_by: the active entries are numbered sequentially and every promoted entry is still visible
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/note.md
status: active
revision: 1
---

# Number the active entries and keep the promoted ones visible
Sort by date, number all active entries sequentially starting at 1
Exclude files where `promoted: true` from active counts (but still show them, dimmed)
If total active entries > 20, show only the last 10 with a note about how many were omitted
