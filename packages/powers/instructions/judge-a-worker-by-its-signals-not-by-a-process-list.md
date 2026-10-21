---
instruction_id: judge-a-worker-by-its-signals-not-by-a-process-list
title: "Judge a worker by its signals, not by a process list"
summary: "Progress is judged by commits, the produced artefact and the worker’s own activity — never by the absence of a visible operating-system process."
capability_tags:
  - coordinate-program
pattern_tags:
  - evidence-analysis
conditions_applies_when: The supervisor has to decide whether a delegated worker is still working.
conditions_does_not_apply_when: The worker runs as a visible local process whose state can be observed directly.
artifact_contract_output_type: worker-progress-assessment
artifact_contract_required_data:
  - the signals observed
  - the progress verdict
  - the time since the last sign of progress
artifact_contract_verified_by: the verdict rests on the named signals and not on a process listing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/executor-progress-policy.md
status: active
revision: 1
---

# Judge a worker by its signals, not by a process list
The absence of a local OS test/build process is NOT idleness
The orchestrator cannot see the child's work that way.
A native subagent runs in the runtime's own session, not as a visible local process, and an executor between two tool calls — reasoning, reading a file, waiting on a runtime round-trip — shows no process at all.
Judge progress ONLY by the signals this workflow names: commits on the expected branch
A process listing is not one of them.
