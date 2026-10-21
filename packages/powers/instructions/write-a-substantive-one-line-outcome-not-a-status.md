---
instruction_id: write-a-substantive-one-line-outcome-not-a-status
title: "Write a substantive one-line outcome, not a status"
summary: "The one-line outcome says what shipped; \"phase complete\" says nothing."
capability_tags:
  - communicate-concisely
pattern_tags:
  - concise-communication
conditions_applies_when: The outcome of a piece of work is summarised.
conditions_does_not_apply_when: The summary is a longer document.
artifact_contract_output_type: outcome-one-liner
artifact_contract_required_data:
  - the one line that says what shipped
artifact_contract_verified_by: the one line names what shipped instead of a status
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/summary.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/summary.compact.md
status: active
revision: 1
---

# Write a substantive one-line outcome, not a status
The one-liner MUST be substantive:
The one-liner should tell someone what actually shipped.
**[Substantive one-liner describing outcome - NOT "phase complete" or "implementation finished"]**
