---
instruction_id: date-the-repeated-report-so-it-does-not-overwrite
title: Date the repeated report so it does not overwrite
summary: "A report that is written again in a later session carries the date in its name, so the earlier one is still there."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A report is written more than once in the life of a project.
conditions_does_not_apply_when: The report is written once.
artifact_contract_output_type: dated-report
artifact_contract_required_data:
  - the report name
  - the date it carries
artifact_contract_verified_by: the earlier report is still readable next to the newer one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/session-report.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Date the repeated report so it does not overwrite
Collect session data from available sources
Filename includes date to prevent overwrites
