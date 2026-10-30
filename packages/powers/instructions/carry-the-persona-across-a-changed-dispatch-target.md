---
instruction_id: carry-the-persona-across-a-changed-dispatch-target
title: Carry the persona across a changed dispatch target
summary: "When the runtime forces a different agent, the persona still rides along, so the behaviour comes from the persona and not from the agent that happened to be available."
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: The dispatch target had to be resolved to a different agent than the role names.
conditions_does_not_apply_when: The named agent is available and is dispatched directly.
artifact_contract_output_type: dispatch-resolution
artifact_contract_required_data:
  - the role that was requested
  - the agent that was dispatched
  - the persona that rode along
artifact_contract_verified_by: the persona of the requested role was injected into the agent that was dispatched
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/runtime-aware-dispatch.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Carry the persona across a changed dispatch target
The persona rides along regardless of the resolved type - on runtimes with no persona config, the query returns the installed agent prompt as the block.
So a coder dispatch with the planner persona injected gives
the planner's behavior in the coder built-in's process.
