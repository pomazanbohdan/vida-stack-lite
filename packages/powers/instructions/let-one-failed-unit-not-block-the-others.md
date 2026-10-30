---
instruction_id: let-one-failed-unit-not-block-the-others
title: Let one failed unit not block the others
summary: A unit that fails inside a batch is recorded as failed and the batch continues; one unit never holds up the units that do not depend on it.
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Several independent units run in one batch and one of them fails.
conditions_does_not_apply_when: The units are ordered and the later one depends on the earlier one.
artifact_contract_output_type: batch-outcome
artifact_contract_required_data:
  - the failed unit
  - its failure reason
  - the units that continued
artifact_contract_verified_by: the failed unit carries a reason and the unrelated units were still dispatched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch/steps/merge-wave.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch/steps/plan-checker-loop.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/quick-batch/steps/planner-wave.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Let one failed unit not block the others
one item's planner failure does not block unrelated items
one item's unresolved plan-check does not block unrelated items
do NOT block the whole batch
Display the remaining issues for this item and offer: 1) force-proceed with this item as-is, 2) mark this item `failed`
