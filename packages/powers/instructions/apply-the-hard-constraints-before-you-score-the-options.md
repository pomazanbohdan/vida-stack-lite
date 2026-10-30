---
instruction_id: apply-the-hard-constraints-before-you-score-the-options
title: Apply the hard constraints before you score the options
summary: An option that breaks a hard constraint is dropped first; only the survivors are scored and only the recommendation is shown.
capability_tags:
  - evaluate-dependencies
pattern_tags:
  - metric-gated-decision
conditions_applies_when: Options are scored against a set of constraints and a priority.
conditions_does_not_apply_when: There is a single option.
artifact_contract_output_type: recommendation
artifact_contract_required_data:
  - the eliminated options
  - the recommendation
artifact_contract_verified_by: the constraints were applied first and the scoring table is not shown
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-framework-selector.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-framework-selector.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The body gives a clear framework-scoring sequence, but neither it nor its applicability conditions identify the framework subject area; no supported domain can be grounded."
---

# Apply the hard constraints before you score the options
Eliminate frameworks failing any hard constraint
Produce ranked top 3 — show only the recommendation, not the scoring table
Weight by user's stated priority
