---
instruction_id: classify-a-failed-task-into-one-repair-strategy
title: Classify a failed task into one repair strategy
summary: "A failed verification is classified into exactly one of four repair strategies, each with the trigger that selects it and the output it produces."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A task has failed its verification and the failure has to be answered.
conditions_does_not_apply_when: The failure was already classified and the repair is running.
artifact_contract_output_type: repair-strategy
artifact_contract_required_data:
  - the strategy that was chosen
  - the trigger that selected it
  - the output the strategy produces
artifact_contract_verified_by: exactly one strategy is named and the reason for it is on the record
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/node-repair.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Classify a failed task into one repair strategy
Analyze the failure and choose exactly one repair strategy:
**RETRY** — The approach was right but execution failed. Try again with a concrete adjustment.
Use when: command error, missing dependency, wrong path, env issue, transient failure
**DECOMPOSE** — The task is too coarse. Break it into smaller verifiable sub-steps.
Use when: done-criteria covers multiple concerns, implementation gaps are structural
**PRUNE** — The task is infeasible given current constraints. Skip with justification.
Use when: prerequisite missing and not fixable here, out of scope, contradicts an earlier decision
**ESCALATE** — Repair budget exhausted, or this is an architectural decision
Use when: RETRY failed more than once with different approaches, or fix requires structural change
