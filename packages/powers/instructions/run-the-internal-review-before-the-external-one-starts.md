---
instruction_id: run-the-internal-review-before-the-external-one-starts
title: Run the internal review before the external one starts
summary: "When opening a change triggers an automatic external review, the internal review lanes run first and the change is opened only after they are applied."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: Opening the change is known to trigger an automatic external review and the plan also has internal review lanes.
conditions_does_not_apply_when: There is no automatic external review on open.
artifact_contract_output_type: review-order
artifact_contract_required_data:
  - the internal review step
  - the accepted fixes
  - the moment the change is opened
artifact_contract_verified_by: the internal review and the fixes precede the opening
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Run the internal review before the external one starts
The external reviewer spends its first pass on a diff the plan already expects to change
Nothing may intervene between an applicable re-check and the open. Post-open work may follow; "immediately" constrains only that gap. Opening-time properties do not justify an early PR
