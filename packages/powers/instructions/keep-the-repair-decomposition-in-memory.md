---
instruction_id: keep-the-repair-decomposition-in-memory
title: Keep the repair decomposition in memory
summary: A decomposed task is replaced in place by smaller sub-tasks; the plan on disk is not rewritten by the repair.
capability_tags:
  - debug-root-cause
pattern_tags:
  - implementation-planning
conditions_applies_when: A failed task is decomposed into smaller verifiable sub-tasks.
conditions_does_not_apply_when: The task was not decomposed and the plan on disk is being re-planned on purpose.
artifact_contract_output_type: decomposed-task
artifact_contract_required_data:
  - the sub-tasks that replaced the failed task
  - the verification each sub-task carries
artifact_contract_verified_by: the plan on disk is unchanged and every sub-task has a single verifiable outcome
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/node-repair.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Keep the repair decomposition in memory
Never modify the plan on disk.
Replace the failed task inline with the sub-tasks
Sub-tasks must each have a single verifiable outcome
DECOMPOSE sub-tasks must be more specific than the original, not synonymous rewrites.
The sub-tasks live in memory only.
