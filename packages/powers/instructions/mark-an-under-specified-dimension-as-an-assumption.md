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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/spec.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Mark an under-specified dimension as an assumption
**Ambiguity Report must reflect the actual interview.** If a dimension is below minimum, mark it ⚠ — the planner knows to treat it as an assumption rather than a locked requirement.
