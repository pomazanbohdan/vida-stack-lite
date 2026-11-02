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
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/quick-batch/steps/completion.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: "The frozen body contains incomplete status fragments without the labels or mapping they refer to, so a form cannot be chosen without reconstructing omitted content."
---

# Report the batch by status
read-only in effect when nothing changed) and summarize by status:
this is a clean finish — no further action needed
the batch stays resumable: fix the underlying issue (or accept the failure)
