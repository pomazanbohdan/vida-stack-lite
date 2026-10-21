---
instruction_id: detect-file-overlap-between-parallel-plans
title: Detect file overlap between parallel plans
summary: "Two plans that touch the same file do not run in parallel, and the overlap is reported as a planning defect."
capability_tags:
  - parallelize-tasks
pattern_tags:
  - parallel-execution
conditions_applies_when: Several plans of one round are about to run in parallel.
conditions_does_not_apply_when: The plans of the round do not touch the same files.
artifact_contract_output_type: scheduling-decision
artifact_contract_required_data:
  - the overlapping pairs
  - the files they share
artifact_contract_verified_by: the overlapping plans ran one after the other and the overlap was reported as a planning defect
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
status: active
revision: 1
---

# Detect file overlap between parallel plans
Before spawning any agents for this wave, inspect the `files_modified` list of all plans in the wave.
Check every pair of plans in the wave — if any two plans share even one file in their `files_modified` lists, those plans have an implicit dependency and MUST NOT run in parallel.
run all plans in the wave sequentially regardless of the global parallelization setting.
This is a safety net for plans that were incorrectly assigned to the same wave. The planner should have caught this; flag it as a planning defect so the user can replan the phase if desired.
