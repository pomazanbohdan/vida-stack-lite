---
instruction_id: order-the-aggregate-by-selection-not-by-completion
title: "Order the aggregate by selection, not by completion"
summary: "The results are aggregated in the order the reviewers were selected, not in the order they happened to finish, so the result does not depend on the scheduling."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: Results of several workers are written into one record.
conditions_does_not_apply_when: There is only one result.
artifact_contract_output_type: ordered-aggregate
artifact_contract_required_data:
  - the selection order
  - the ordered results
artifact_contract_verified_by: the order of the results follows the selection and not the finishing order
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Order the aggregate by selection, not by completion
Aggregate in SELECTED_REVIEWERS order, NOT completion order
produces is byte-identical to the one a sequential run produces
leaves no result file and correctly contributes no line
