---
instruction_id: stop-working-on-the-task-while-the-dispatched-agent-is-active
title: Stop working on the task while the dispatched agent is active
summary: While a dispatched agent works on the task the orchestrator does not touch the same task; it waits and resumes only when the result is there.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: An agent was dispatched for the task you are on.
conditions_does_not_apply_when: The agent already returned.
artifact_contract_output_type: dispatch-wait-record
artifact_contract_required_data:
  - the dispatched agent
  - the result it returned
  - the point where the work resumed
artifact_contract_verified_by: no file of the task was read or written while the agent was active
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/verify-phase-goal.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/map-codebase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/manager.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/import.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/plan-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Stop working on the task while the dispatched agent is active
stop working on this task immediately.
Do not read more files, edit code, or run tests related to this task while the subagent is active.
Wait for the subagent to return its result. This prevents duplicate work, conflicting edits, and wasted context.
Only resume when the subagent result is available.
# Do not duplicate the work of a running agent
do NOT read any source files, analyze the codebase, or write any mapping documents independently while the subagents are active.
This prevents duplicate work and wasted context.
do NOT do any planning work for this phase independently.
Only resume planning-related work when the subagent result is available.
This prevents duplicate work, conflicting edits, and wasted context.
# Stop working on the task while the agent runs
Wait for the subagent to return its result.
Stop working on the task immediately.
