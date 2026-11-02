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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/discuss-phase-power.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Keep the unanswered questions visible
Unanswered questions preserved as deferred items (not silently dropped)
If fewer than 50% of questions were answered, warn the user
Warning: Only {answered}/{total} questions answered ({pct}%).
