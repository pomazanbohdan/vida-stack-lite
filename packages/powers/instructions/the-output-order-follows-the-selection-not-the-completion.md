---
instruction_id: the-output-order-follows-the-selection-not-the-completion
title: "The output order follows the selection, not the completion"
summary: "The sections and the lines of a result are ordered by the order the work was selected, not by the order it finished, so two runs of the same selection diff cleanly."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: The result aggregates several independent runs.
conditions_does_not_apply_when: Only one run contributes to the result.
artifact_contract_output_type: ordered-result
artifact_contract_required_data:
  - the selection order
  - the order the sections appear in
artifact_contract_verified_by: "the order matches the selection order, so a diff of two runs shows no reordering churn"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/how-to/enable-parallel-reviewer-lanes.md
status: active
revision: 1
---

# The output order follows the selection, not the completion
They follow reviewer-selection order, not completion order, so a diff of two runs shows no reordering churn.
