---
instruction_id: pass-context-to-the-planner-and-keep-the-method-in-the-role
title: Pass the context to the planner and keep the method in the role
summary: The prompt carries the planning context and the role carries the planning method.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A planner is handed the material it needs.
conditions_does_not_apply_when: The method itself is being written into the prompt.
artifact_contract_output_type: planner-handoff
artifact_contract_required_data:
  - the context that is passed
  - the method that stays in the role
artifact_contract_verified_by: the prompt contains the context and the method stays in the role
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/planner-subagent-prompt.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Pass the context to the planner and keep the method in the role
The agent contains all planning expertise - this template provides planning context only.
Planning methodology, task breakdown, dependency analysis, wave assignment, TDD detection, and goal-backward derivation are baked into the planner agent. This template only passes context.
