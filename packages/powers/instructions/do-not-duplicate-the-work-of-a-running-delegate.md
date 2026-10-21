---
instruction_id: do-not-duplicate-the-work-of-a-running-delegate
title: Do not duplicate the work of a running delegate
summary: Nothing is done in the main session while a delegate holds the work.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A delegated agent is running and holds the work.
conditions_does_not_apply_when: The delegate has returned its result.
artifact_contract_output_type: terminal-status
artifact_contract_required_data:
  - the delegate that is running
  - the result it returned
artifact_contract_verified_by: no work was done in the main session while the delegate was running
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/docs-update.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/codebase-drift-gate.md
status: active
revision: 1
---

# Do not duplicate the work of a running delegate
do NOT generate any documentation independently while the subagents are active.
Wait for all Wave 1 agents to complete before proceeding.
This prevents duplicate work and wasted context.
Do not read more files, edit code, or run tests related to this task while the subagent is active. Wait for the subagent to return its result.
Only resume when the subagent result is available.
