---
instruction_id: dedupe-the-ids-before-you-dispatch
title: Dedupe the ids before you dispatch
summary: "The list of ids is deduplicated before anything is dispatched, so two runs never target the same output."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: A batch of ids is built from a source that may repeat them.
conditions_does_not_apply_when: The ids come from a source that cannot repeat them.
artifact_contract_output_type: dispatch-id-list
artifact_contract_required_data:
  - the deduplicated ids
  - the order they were dispatched in
artifact_contract_verified_by: no id appears twice in the dispatched batch
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase/steps/chunked-planning-mode.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Dedupe the ids before you dispatch
Build the batch's plan-ID list from the outline rows sharing this Wave value, in outline row order, deduplicated defensively
a malformed outline naming the same Plan ID twice must never produce two concurrent
