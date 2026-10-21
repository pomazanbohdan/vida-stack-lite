---
instruction_id: mark-an-under-specified-dimension-as-an-assumption
title: Mark an under-specified dimension as an assumption
summary: "A dimension below its minimum is marked, so it is carried as an assumption and not as a locked requirement."
capability_tags:
  - clarify-requirements
pattern_tags:
  - dimension-sweep
conditions_applies_when: A quality dimension of the specification is scored.
conditions_does_not_apply_when: Every dimension is at or above its minimum.
artifact_contract_output_type: dimension-report
artifact_contract_required_data:
  - the dimension
  - the score
  - the mark
artifact_contract_verified_by: the dimension below its minimum is marked as an assumption
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/spec.md
status: active
revision: 1
---

# Mark an under-specified dimension as an assumption
**Ambiguity Report must reflect the actual interview.** If a dimension is below minimum, mark it ⚠ — the planner knows to treat it as an assumption rather than a locked requirement.
