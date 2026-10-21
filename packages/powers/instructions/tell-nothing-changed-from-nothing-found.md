---
instruction_id: tell-nothing-changed-from-nothing-found
title: Tell nothing changed from nothing found
summary: "An empty file list means there is nothing new to re-review, not that the work has no standing findings; the two are reported differently."
capability_tags:
  - review-code
pattern_tags:
  - empty-result-policy
conditions_applies_when: The computed scope of a review is empty.
conditions_does_not_apply_when: The scope contains at least one file.
artifact_contract_output_type: empty-scope-report
artifact_contract_required_data:
  - the empty scope
  - what the empty scope means
artifact_contract_verified_by: "the report says there is nothing new to review, not that there are no findings"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/code-review.md
status: active
revision: 1
---

# Tell nothing changed from nothing found
Means nothing new to re-review - NOT a phase with no standing findings.
No source files changed in phase
Skipping review.
