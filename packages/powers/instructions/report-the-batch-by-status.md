---
instruction_id: report-the-batch-by-status
title: Report the batch by status
summary: "The batch closes with a count per status and, when something is not done, the route to resume it."
capability_tags:
  - communicate-concisely
pattern_tags:
  - output-formatting
conditions_applies_when: A batch of work is finished or partly finished.
conditions_does_not_apply_when: The batch is still running.
artifact_contract_output_type: batch-report
artifact_contract_required_data:
  - the count per status
  - the resume route when something is open
artifact_contract_verified_by: the report carries the count per status and the way back in
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch/steps/completion.md
status: active
revision: 1
---

# Report the batch by status
read-only in effect when nothing changed) and summarize by status:
this is a clean finish — no further action needed
the batch stays resumable: fix the underlying issue (or accept the failure)
