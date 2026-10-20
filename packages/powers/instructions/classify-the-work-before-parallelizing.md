---
instruction_id: classify-the-work-before-parallelizing
title: Classify the work before parallelizing it
summary: "Independent slices, tests and documentation can run together, while migrations, shared state and dependency chains cannot."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Several tasks could run at the same time.
conditions_does_not_apply_when: There is only one task.
artifact_contract_output_type: parallelization-classification
artifact_contract_required_data:
  - the tasks
  - the class of each
  - the shared contract to define first
artifact_contract_verified_by: every task is classified and every coordinated pair has its contract named
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/planning-and-task-breakdown/SKILL.md
status: active
revision: 1
---

# Classify the work before parallelizing it

When multiple agents or sessions are available:

- **Safe to parallelize:** Independent feature slices, tests for already-implemented features, documentation
- **Must be sequential:** Database migrations, shared state changes, dependency chains
- **Needs coordination:** Features that share an API contract (define the contract first, then parallelize)
