---
instruction_id: categorize-review-feedback-by-what-it-can-change
title: Categorize review feedback by what it can change
summary: "Review feedback is sorted into the buckets that decide whether it lands in the plan, changes the executable contract or is only noted."
capability_tags:
  - apply-review-feedback
pattern_tags:
  - finding-severity-policy
conditions_applies_when: A review produced feedback that has to be placed.
conditions_does_not_apply_when: The feedback is a single finding with no severity.
artifact_contract_output_type: feedback-categorisation
artifact_contract_required_data:
  - the bucket of each piece of feedback
  - the reason for the bucket
artifact_contract_verified_by: every piece of feedback sits in exactly one bucket
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-reviews.md
status: active
revision: 1
---

# Categorize review feedback by what it can change
Must address: Critical severity consensus concerns
Must represent in PLAN.md: actionable Important/Minor findings that require task, action, acceptance criteria, verify command, must_haves, threat-model, artifact, stale-path, or execution-contract changes
Should address: Important severity concerns from 2+ reviewers that improve quality but do not change the executable contract
Consider: Individual reviewer suggestions, Minor severity items
