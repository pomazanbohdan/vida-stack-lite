---
instruction_id: do-not-plan-the-items-that-are-already-scheduled
title: Do not plan the items that are already scheduled
summary: Only the gaps section of a report holds items that need new plans; the deferred section holds work that is already scheduled for a later phase.
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A report of gaps and deferred items is read to plan the closure work.
conditions_does_not_apply_when: The report holds only gaps.
artifact_contract_output_type: gap-set
artifact_contract_required_data:
  - the items that are gaps
  - the items that were deferred
artifact_contract_verified_by: no deferred item produced a plan and every gap produced one
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-gap-closure.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Do not plan the items that are already scheduled
**Important: Skip deferred items.**
only the `gaps:` section contains actionable items that need closure plans. The `deferred:` section (if present) lists items explicitly addressed in later milestone phases - these are NOT gaps and must be ignored during gap closure planning. Creating plans for deferred items wastes effort on work already scheduled for future phases.
