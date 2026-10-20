---
instruction_id: issue-parallel-dispatches-in-one-turn
title: Issue parallel dispatches in one turn
summary: "Parallel work is dispatched together in a single turn, because one dispatch per turn serialises the work; a dispatched subagent is awaited in that same turn and is never left running in the background."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Several agents are to run at the same time.
conditions_does_not_apply_when: The agents run one after another by design.
artifact_contract_output_type: dispatch-shape-check
artifact_contract_required_data:
  - the dispatches
  - the turn they are issued in
artifact_contract_verified_by: all the parallel dispatches are issued in the same turn
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/orchestration-patterns.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/workflow.md
status: active
revision: 2
---

# Issue parallel dispatches in one turn
Parallel fan-out requires issuing multiple agent dispatches in a single assistant turn. Sequential turns serialize execution.
Any new orchestrator command should do the same.

Launch all the subagents a step calls for in one message — several blocking calls awaited together in the same turn — then wait for all their results before continuing.
Never split a step's launches across messages, and never run one detached.
Never run a subagent in the background / detached / async.
Never end your turn to "await a completion notification."
This workflow runs unattended: there is no event loop to resume a yielded turn, so a backgrounded subagent never hands control back and the run stalls.
