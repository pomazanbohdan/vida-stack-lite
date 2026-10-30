---
instruction_id: report-the-missing-failure-signal-dont-write-it-for-them
title: "Report the missing failure signal, don't write it for them"
summary: "The missing failure signal is reported, not authored: a statement written for the planner is copied verbatim and carries no information."
capability_tags:
  - review-code
pattern_tags:
  - evidence-analysis
conditions_applies_when: An acceptance command has no stated failure mode.
conditions_does_not_apply_when: The plan is being written rather than checked.
artifact_contract_output_type: missing-failure-report
artifact_contract_required_data:
  - the command without a failure signal
  - the evidence that it lacks one
artifact_contract_verified_by: the finding names the command and writes no replacement statement
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/failing-direction.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Report the missing failure signal, don't write it for them
Report, never prescribe. State which command has no stated failure mode.
Do **not** author the statement for the planner.
A prescribed statement is copied verbatim and carries zero information
