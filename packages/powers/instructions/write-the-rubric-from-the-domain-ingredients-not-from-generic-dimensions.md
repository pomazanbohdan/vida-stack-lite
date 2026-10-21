---
instruction_id: write-the-rubric-from-the-domain-ingredients-not-from-generic-dimensions
title: "Write the rubric from the domain ingredients, not from generic dimensions"
summary: The evaluation criteria start from what the domain experts wrote and only fall back to generic dimensions when those are thin.
capability_tags:
  - define-quality-bar
pattern_tags:
  - testable-criteria
conditions_applies_when: Evaluation criteria are written for a system.
conditions_does_not_apply_when: No domain criteria were produced upstream.
artifact_contract_output_type: rubric
artifact_contract_required_data:
  - the pass criterion
  - the fail criterion
  - the measurement approach
artifact_contract_verified_by: "every dimension carries a pass, a fail and a measurement approach"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-eval-planner.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-eval-planner.compact.md
status: active
revision: 1
---

# Write the rubric from the domain ingredients, not from generic dimensions
Start from domain rubric ingredients in Section 1b — these are your rubric starting points, not generic dimensions.
PASS: {specific acceptable behavior in domain language}
FAIL: {specific unacceptable behavior in domain language}
Measurement: Code / LLM Judge / Human
Each dimension has a measurement approach (Code / LLM Judge / Human)
