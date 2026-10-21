---
instruction_id: name-the-dropped-items-not-only-the-count
title: "Name the dropped items, not only the count"
summary: "Every item removed from a scope is named, because a count hides whether the dropped item held the whole deliverable."
capability_tags:
  - verify-work-results
pattern_tags:
  - evidence-analysis
conditions_applies_when: Items are removed from a scope or a list.
conditions_does_not_apply_when: Nothing is removed.
artifact_contract_output_type: dropped-item-list
artifact_contract_required_data:
  - each dropped item by name
  - the count
artifact_contract_verified_by: "every dropped item is named, not only counted"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/code-review.md
status: active
revision: 1
---

# Name the dropped items, not only the count
Remove paths that don't exist on disk, and name each one
A count hides whether the dropped file held the phase's entire deliverable
