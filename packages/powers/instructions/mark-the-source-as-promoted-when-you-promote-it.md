---
instruction_id: mark-the-source-as-promoted-when-you-promote-it
title: Mark the source as promoted when you promote it
summary: "A note that was turned into work is marked in its own record, so it is never counted or promoted twice."
capability_tags:
  - capture-an-idea
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A note is promoted into a work item.
conditions_does_not_apply_when: The note was already marked and the promotion is only being read.
artifact_contract_output_type: promotion-record
artifact_contract_required_data:
  - the note that was promoted
  - the mark that was written on it
artifact_contract_verified_by: the source record carries the promoted mark and a second promotion of it is refused
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/note.md
status: active
revision: 1
---

# Mark the source as promoted when you promote it
Mark the source note file as promoted: update its frontmatter to `promoted: true`
Tell user "Note {N} is already promoted" and stop
