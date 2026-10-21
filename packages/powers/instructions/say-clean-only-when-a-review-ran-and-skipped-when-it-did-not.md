---
instruction_id: say-clean-only-when-a-review-ran-and-skipped-when-it-did-not
title: Say clean only when a review ran and skipped when it did not
summary: A review that found nothing and a review that was not performed are two different results and are reported differently.
capability_tags:
  - verify-work-results
pattern_tags:
  - empty-result-policy
conditions_applies_when: A review finishes and its outcome is recorded.
conditions_does_not_apply_when: The review ran and produced findings.
artifact_contract_output_type: review-report
artifact_contract_required_data:
  - the outcome
  - the reason for the outcome
artifact_contract_verified_by: the outcome distinguishes a completed review from a review that was not performed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-code-reviewer.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-code-reviewer.compact.md
status: active
revision: 1
---

# Say clean only when a review ran and skipped when it did not
status: clean means "reviewed and found no issues."
status: skipped means "no reviewable files — review was not performed."
This distinction matters for downstream consumers.
