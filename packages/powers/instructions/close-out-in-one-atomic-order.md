---
instruction_id: close-out-in-one-atomic-order
title: Close out in one atomic order
summary: "Production commits, then the summary commit, then the state update; returning without the committed summary leaves an illegal partial state that the next resume has to detect."
capability_tags:
  - execute-plan
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A unit of work finished and has to be closed out.
conditions_does_not_apply_when: Nothing was committed in this run.
artifact_contract_output_type: close-out-sequence
artifact_contract_required_data:
  - the production commits
  - the summary commit
  - the state update
artifact_contract_verified_by: the summary was committed and no narrative was emitted between the write and the commit
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Close out in one atomic order
the only complete close-out order is: production-code commit(s) -> summary commit -> state/roadmap update.
Once production commits for a plan exist, returning without a committed SUMMARY.md is an illegal partial-plan state.
The next execute-phase resume must detect that condition before dispatching another executor.
Do NOT emit narrative output between the Write tool call and the commit tool call.
Truncation at this boundary is a known failure mode
