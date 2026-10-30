---
instruction_id: weight-a-review-by-the-evidence-it-was-collected-under
title: Weight a review by the evidence it was collected under
summary: "A reviewer that ran without source access, or one that never received the source-grounded prompt, contributes its concerns but not a verdict at full weight; the consensus is computed from the grounded reviewers."
capability_tags:
  - review-code
pattern_tags:
  - trust-graded-context
conditions_applies_when: Findings from reviewers with different evidence are combined into one consensus.
conditions_does_not_apply_when: Every reviewer worked with the same evidence.
artifact_contract_output_type: weighted-consensus
artifact_contract_required_data:
  - the reviewers
  - the evidence class of each
  - the ones that carry full weight
artifact_contract_verified_by: the reviewers without source grounding are noted but do not carry the consensus
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/review.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Weight a review by the evidence it was collected under
do not weight its verdict as a grounded plan review — fold in its diff findings
note its concerns, but do not count its verdict at full consensus weight
