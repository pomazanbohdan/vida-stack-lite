---
instruction_id: look-on-disk-before-you-call-a-run-empty
title: Look on disk before you call a run empty
summary: "A run that returned nothing is checked on disk before it is called empty: the plans it wrote are offered as accept, retry or stop."
capability_tags:
  - verify-work-results
  - read-large-artifacts
pattern_tags:
  - empty-result-policy
  - verification-before-completion
conditions_applies_when: A dispatched run returned nothing or a truncated result.
conditions_does_not_apply_when: The run returned its result.
artifact_contract_output_type: empty-run-recovery
artifact_contract_required_data:
  - the plans found on disk
  - the recovery route that was taken
artifact_contract_verified_by: the disk was checked before the run was declared empty and the recovery route was taken
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase/detail/elaboration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Look on disk before you call a run empty
The planner wrote plans to disk but the return was empty or truncated
The planner produced no output.
1. **Accept plans**
2. **Retry planner** — re-spawn the planner with the same prompt
3. **Stop**
