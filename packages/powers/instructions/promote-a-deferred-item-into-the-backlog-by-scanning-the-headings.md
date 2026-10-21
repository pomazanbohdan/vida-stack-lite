---
instruction_id: promote-a-deferred-item-into-the-backlog-by-scanning-the-headings
title: Promote a deferred item into the backlog by scanning the headings
summary: "The next free number for a backlog entry is found by looking at the headings that exist, not by counting them, and the text of the deferred item is flattened onto one line."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - stable-identity
conditions_applies_when: A deferred item is to be moved into a numbered backlog.
conditions_does_not_apply_when: The backlog numbering is known to be contiguous and empty.
artifact_contract_output_type: backlog-entry
artifact_contract_required_data:
  - the number that was found
  - the item
  - the date it was deferred at
artifact_contract_verified_by: the number was taken from the headings that exist and the entry stayed on one line
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/verify-work.md
status: active
revision: 1
---

# Promote a deferred item into the backlog by scanning the headings
Compute the next backlog number:
the smallest positive integer not already used by an existing `### Phase 999.{n}` heading
scan the headings rather than counting them, since numbering may be non-contiguous.
with `test`/`idea`/`deferred_at` verbatim from the section's YAML and `{idea}` flattened to a single line (newlines → spaces — a multi-line response would corrupt the single-line entry
