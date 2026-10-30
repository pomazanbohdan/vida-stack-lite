---
instruction_id: merge-in-dispatch-order-not-completion-order
title: "Merge in dispatch order, not completion order"
summary: "The merges of a wave are applied in the order the work was sent out, so the result does not depend on who finished first."
capability_tags:
  - integrate-branch
pattern_tags:
  - branch-integration
conditions_applies_when: Several finished pieces of work are merged together.
conditions_does_not_apply_when: One piece of work is merged.
artifact_contract_output_type: merge-order
artifact_contract_required_data:
  - the dispatch order
  - the merge order
artifact_contract_verified_by: the merges followed the dispatch order and not the completion order
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Merge in dispatch order, not completion order
Merges apply strictly in the wave's original dispatch order
never completion order.
