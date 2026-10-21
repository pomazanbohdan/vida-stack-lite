---
instruction_id: keep-the-unanswered-questions-visible
title: Keep the unanswered questions visible
summary: "Questions that came back unanswered stay visible as deferred items, with the share answered named."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: Questions were put to the user outside the live session and some came back unanswered.
conditions_does_not_apply_when: Every question was answered.
artifact_contract_output_type: decision-set
artifact_contract_required_data:
  - the answered questions
  - the unanswered questions
  - the share answered
artifact_contract_verified_by: the unanswered questions appear as deferred items and a warning names the share answered
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/discuss-phase-power.md
status: active
revision: 1
---

# Keep the unanswered questions visible
Unanswered questions preserved as deferred items (not silently dropped)
If fewer than 50% of questions were answered, warn the user
Warning: Only {answered}/{total} questions answered ({pct}%).
