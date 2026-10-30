---
instruction_id: escape-every-cell-of-a-generated-table
title: Escape every cell of a generated table
summary: "Every cell of a generated table is escaped and every record field is checked, so an adversarial input cannot break the table or the record boundaries."
capability_tags:
  - treat-runtime-content-as-untrusted
pattern_tags:
  - untrusted-content-handling
conditions_applies_when: A table is generated from text that somebody else wrote.
conditions_does_not_apply_when: Every cell is written by the agent itself.
artifact_contract_output_type: generated-table
artifact_contract_required_data:
  - the cells
  - the escaping applied
  - the rejected records
artifact_contract_verified_by: no cell can carry a delimiter or a line break out of its column or record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/ship.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Escape every cell of a generated table
Harden every table cell against injection, not just subjects: escape `|` as `\|` and strip `\r`/`\n` from both commit subjects and the rendered `gate-status` value.
Prefer NUL (`-z` / `%x00`) record separation, and reject any record whose fields contain the `\x1f`/`\x1e` delimiters, so an adversarial commit message cannot corrupt record or field boundaries.
