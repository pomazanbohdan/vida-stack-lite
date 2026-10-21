---
instruction_id: present-a-checkpoint-with-what-is-awaited
title: Present a checkpoint with what is awaited
summary: "The checkpoint names the plan, the progress, the blocker and what the person is being asked for."
capability_tags:
  - triage-reports
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A delegated agent stopped at a checkpoint that needs a person.
conditions_does_not_apply_when: The agent completed the plan.
artifact_contract_output_type: checkpoint-report
artifact_contract_required_data:
  - the checkpoint type
  - the completed tasks
  - the current task and blocker
  - what is awaited
artifact_contract_verified_by: "the report names the plan, the progress and what the person is being asked for"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
status: active
revision: 1
---

# Present a checkpoint with what is awaited
Agent return includes: completed tasks table, current task + blocker, checkpoint type/details, what's awaited
**Progress:** 2/3 tasks complete
User responds: "approved"/"done" | issue description | decision selection
