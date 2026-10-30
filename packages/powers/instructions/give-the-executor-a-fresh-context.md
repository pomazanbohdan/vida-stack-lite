---
instruction_id: give-the-executor-a-fresh-context
title: Give the executor a fresh context
summary: "The executor starts from a clean, narrowly scoped context and reads only what its own task requires; an executor that carries the accumulated history of the session is a degraded executor."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: An executor is about to be dispatched for a task.
conditions_does_not_apply_when: The task is being done in the session that accumulated the history.
artifact_contract_output_type: fresh-context
artifact_contract_required_data:
  - the task the executor receives
  - the artifacts it is given
  - what it is not given
artifact_contract_verified_by: the executor ran with a fresh context and only the artifacts its task needs
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/the-phase-loop.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/context-engineering.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Give the executor a fresh context
- The executor's fresh context is not a convenience — it is the mechanism by which context rot is prevented. An executor that runs with 180k tokens of accumulated session history is a degraded executor. An executor that starts clean and reads only what its plan requires is an executor operating at full capacity.
- Each can be handed to a specialised subagent that starts with a clean, carefully scoped context window — and reports its result back to a thin orchestrator that stays lean.
