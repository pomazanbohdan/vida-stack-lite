---
instruction_id: a-loop-that-does-not-change-the-input-cannot-converge
title: A loop that does not change the input cannot converge
summary: "Re-running the same step against the same unresolved conflict burns a cycle; the conflict has to be resolved by adopting an alternative, overriding the constraint or amending it."
capability_tags:
  - coordinate-program
pattern_tags:
  - verification-before-completion
  - stop-on-conflict
conditions_applies_when: A loop repeats a step that previously failed to resolve an open item.
conditions_does_not_apply_when: The step itself changed since the last attempt.
artifact_contract_output_type: loop-progress-decision
artifact_contract_required_data:
  - the open item
  - the change that was made to it
  - the decision to continue or to stop
artifact_contract_verified_by: "the open item was resolved or the loop stopped, and no cycle was repeated against an unchanged item"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# A loop that does not change the input cannot converge
the replan must resolve it by adopting one of its recorded alternatives, overriding the named constraint, or amending the constraint — and mark the entry resolved.

Re-running the planner against an unchanged conflict cannot resolve it and only burns a cycle.
