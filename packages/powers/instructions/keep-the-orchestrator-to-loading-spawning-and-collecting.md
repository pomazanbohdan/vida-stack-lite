---
instruction_id: keep-the-orchestrator-to-loading-spawning-and-collecting
title: "Keep the orchestrator to loading, spawning and collecting"
summary: "The orchestrator loads the context, spawns the right agent, collects the result and updates the shared state; it does no work of its own."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: The orchestrator is about to do the work itself instead of dispatching it.
conditions_does_not_apply_when: The work is a single step that needs no dispatch.
artifact_contract_output_type: thin-orchestrator
artifact_contract_required_data:
  - the work the orchestrator does
  - the work it dispatches
  - the state it updates
artifact_contract_verified_by: "the orchestrator only loaded, spawned, collected and updated state"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=docs/explanation/multi-agent-orchestration.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Keep the orchestrator to loading, spawning and collecting
- The orchestrator never does heavy lifting itself; it loads context, spawns the right agent, collects the result, and updates shared state in `.planning/`.
- a thin orchestrator spawns short-lived specialised agents, each with a **fresh 200 K-token context window** and *only the artifacts it needs* to do its specific job.
