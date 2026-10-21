---
instruction_id: name-the-valid-options-when-nothing-matches
title: Name the valid options when nothing matches
summary: A request that matches nothing is answered with a one-line error and the list of the names that do exist - then the run stops.
capability_tags:
  - communicate-concisely
pattern_tags:
  - output-formatting
conditions_applies_when: A named target does not resolve to anything.
conditions_does_not_apply_when: The request resolves to a known target.
artifact_contract_output_type: unmatched-list
artifact_contract_required_data:
  - the one-line error
  - the list of the valid names
artifact_contract_verified_by: the error names the valid options and the run stops there
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/help/modes/topic.md
status: active
revision: 1
---

# Name the valid options when nothing matches
If no match: emit a one-line error followed by a comma-separated list of the canonical topic names from the leftmost column (one per row, deduplicated).
Name the complete reference.
Stop.
