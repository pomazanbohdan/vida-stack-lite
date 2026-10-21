---
instruction_id: state-the-concrete-consequence-if-the-assumption-is-wrong
title: State the concrete consequence if the assumption is wrong
summary: "Each assumption names what breaks if it turns out false, instead of a vague warning."
capability_tags:
  - clarify-requirements
pattern_tags:
  - testable-criteria
conditions_applies_when: An assumption about the system is recorded.
conditions_does_not_apply_when: The statement is a fact read directly from a file.
artifact_contract_output_type: assumption-list
artifact_contract_required_data:
  - the assumption
  - the consequence if it is wrong
artifact_contract_verified_by: "no assumption says only that it \"could cause issues\""
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-assumptions-analyzer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-assumptions-analyzer.compact.md
status: active
revision: 1
---

# State the concrete consequence if the assumption is wrong
Every assumption MUST state a concrete consequence if wrong (not vague "could cause issues").
Read 5-15 most relevant source files to understand existing patterns
Do NOT pad with obvious assumptions -- only surface decisions that could go multiple ways.
