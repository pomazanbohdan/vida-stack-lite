---
instruction_id: let-the-failure-propagate-in-a-verify-gate
title: Let the failure propagate in a verify gate
summary: A fallback that turns a failed read into a zero converts a failure into a passing gate that measures nothing.
capability_tags:
  - review-code
pattern_tags:
  - failure-first-analysis
conditions_applies_when: A verification gate computes a value it then compares.
conditions_does_not_apply_when: The absence of the input is semantically the default and the result is not compared.
artifact_contract_output_type: gate-reading
artifact_contract_required_data:
  - the command that reads the value
  - the comparison it feeds
  - the failure behaviour
artifact_contract_verified_by: a failed read leaves the gate failing rather than producing a comparable default
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 1
---

# Let the failure propagate in a verify gate
`2>/dev/null || echo "0"` in an assignment that feeds a comparison converts any failure into a passing gate that measures nothing
If files don't exist (wrong path, etc.), both sides become `"0"`. Comparison passes. Gate certifies parity while measuring nothing
**When `|| echo "default"` is acceptable:** only when absence is semantically the default AND the result is NOT used in a comparison that should detect absence
