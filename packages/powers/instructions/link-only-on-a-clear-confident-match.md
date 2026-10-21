---
instruction_id: link-only-on-a-clear-confident-match
title: "Link only on a clear, confident match"
summary: A pending item is linked to a planned unit only when the match is clear and confident; a vague or cross-cutting item is left untouched.
capability_tags:
  - triage-reports
pattern_tags:
  - scope-routing
conditions_applies_when: Pending items are matched against the planned units.
conditions_does_not_apply_when: No item is matched against anything.
artifact_contract_output_type: match-record
artifact_contract_required_data:
  - the linked pairs
  - the items left unmatched
artifact_contract_verified_by: "no item was linked without a clear, confident match"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/new-milestone.md
status: active
revision: 1
---

# Link only on a clear, confident match
Only modify todos that have a clear, confident match.
Narrow, specific todos with concrete scopes are the best candidates.
Vague or cross-cutting todos should be left unlinked.
Leave unmatched todos unmodified.
