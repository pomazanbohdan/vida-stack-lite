---
instruction_id: hand-off-to-a-fresh-agent-with-the-state-it-needs
title: Hand off to a fresh agent with the state it needs
summary: A checkpoint is continued by a fresh agent that carries the state and checks the earlier commits.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - subagent-delegation
conditions_applies_when: A checkpoint has been answered and the plan must continue.
conditions_does_not_apply_when: The plan continues in the same session.
artifact_contract_output_type: continuation-prompt
artifact_contract_required_data:
  - the completed tasks
  - the current task
  - the response of the person
  - the resume instructions
artifact_contract_verified_by: a fresh agent was given the state and it verified the previous commits before continuing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
status: active
revision: 1
---

# Hand off to a fresh agent with the state it needs
Spawn continuation agent (NOT resume)
**Why fresh agent, not resume:** Resume relies on internal serialization that breaks with parallel tool calls. Fresh agents with explicit state are more reliable.
Continuation agent verifies previous commits, continues from resume point
