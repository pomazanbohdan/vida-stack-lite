---
instruction_id: group-the-work-into-waves-before-you-spawn-anything
title: Group the work into waves before you spawn anything
summary: "The dependencies declared by the units of work are read first and the units are grouped into waves, so a unit never starts before the units it depends on."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Several units of work are about to be dispatched in parallel.
conditions_does_not_apply_when: There is only one unit of work.
artifact_contract_output_type: wave-analysis
artifact_contract_required_data:
  - the declared dependencies
  - the wave each unit was placed in
  - what may run at the same time
artifact_contract_verified_by: the waves were computed from the declared dependencies before anything was dispatched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/multi-agent-orchestration.md
status: active
revision: 1
---

# Group the work into waves before you spawn anything
- Before spawning any executor, the orchestrator performs a **wave analysis**: it reads the dependency declarations in each `PLAN.md` file and groups plans into waves.
