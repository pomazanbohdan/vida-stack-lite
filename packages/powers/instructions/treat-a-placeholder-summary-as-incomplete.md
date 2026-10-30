---
instruction_id: treat-a-placeholder-summary-as-incomplete
title: Treat a placeholder summary as incomplete
summary: "A summary that still holds placeholder text is reported as an unfinished item, not as done work."
capability_tags:
  - triage-reports
pattern_tags:
  - report-triage
conditions_applies_when: A summary written earlier is checked before the work is treated as finished.
conditions_does_not_apply_when: The summary carries real content.
artifact_contract_output_type: false-completion-check
artifact_contract_required_data:
  - the summaries that hold placeholder text
  - the way each was reported
artifact_contract_verified_by: every summary with placeholder content is reported as an incomplete item
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/pause-work.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Treat a placeholder summary as incomplete
Check for placeholder content in existing summaries
Report any summaries with placeholder content as incomplete items.
