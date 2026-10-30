---
instruction_id: background-only-where-the-host-can-nest-the-gates
title: Background only where the host can nest the gates
summary: A step is only handed to a background agent when a backgrounded agent there can still run the sub-agents the step depends on; otherwise it runs in the foreground so the gates actually run.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A step could be dispatched in the background or run in the foreground.
conditions_does_not_apply_when: The step has no sub-agents of its own.
artifact_contract_output_type: dispatch-mode-decision
artifact_contract_required_data:
  - whether a backgrounded agent can nest the sub-agents
  - the mode that was chosen
artifact_contract_verified_by: the background was used only where the nested gates could still run
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/manager.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Background only where the host can nest the gates
First resolve whether background dispatch is safe.
Background dispatch is only safe on a runtime where a backgrounded agent can still nest the pipeline's subagents
This is determined from the documentation-sourced dispatch capability in the registry
the background agents continue while you verify/discuss.
run the chosen plan/execute step(s) **inline** via their handlers below (in order), then run verification actions, then run the inline discuss.
There is no overlap.
