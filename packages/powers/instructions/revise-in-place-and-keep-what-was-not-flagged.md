---
instruction_id: revise-in-place-and-keep-what-was-not-flagged
title: Revise in place and keep what was not flagged
summary: Only the flagged sections are edited; the working parts of the plan survive a revision.
capability_tags:
  - apply-review-feedback
pattern_tags:
  - behavior-preserving-refactor
conditions_applies_when: A plan is revised against checker findings.
conditions_does_not_apply_when: The whole plan is being written from scratch.
artifact_contract_output_type: revision-diff
artifact_contract_required_data:
  - the sections that changed
  - the sections that were preserved
artifact_contract_verified_by: no unflagged part of the plan was rewritten
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-revision.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Revise in place and keep what was not flagged
**DO:** Edit specific flagged sections, preserve working parts, update waves if dependencies change.
**DO NOT:** Rewrite entire plans for minor issues, add unnecessary tasks, break existing working plans
