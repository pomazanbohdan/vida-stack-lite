---
instruction_id: issue-parallel-dispatches-in-one-turn
title: Issue parallel dispatches in one turn
summary: "Parallel work is dispatched together in a single turn, because one dispatch per turn serialises the work."
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
status: active
revision: 1
---

# Issue parallel dispatches in one turn
Parallel fan-out requires issuing multiple agent dispatches in a single assistant turn. Sequential turns serialize execution.
Any new orchestrator command should do the same.
