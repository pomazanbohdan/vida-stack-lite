---
instruction_id: check-the-task-is-trivial-before-you-start
title: Check the task is trivial before you start
summary: "The trivial route checks its own premise before it starts: a task over a few edits, a minute, a new dependency or an open research question belongs to the planning route."
capability_tags:
  - clarify-requirements
pattern_tags:
  - specification-gate
conditions_applies_when: A task is small enough that the trivial route was chosen for it.
conditions_does_not_apply_when: The task was already routed to a planning route.
artifact_contract_output_type: trivial-route-decision
artifact_contract_required_data:
  - the checks that were made
  - the decision to continue or to route away
  - the way the work was done
artifact_contract_verified_by: no agent was spawned and no planning artefact was written
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/fast.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Check the task is trivial before you start
**Before doing anything, verify this is actually trivial.**
A task is trivial if it can be completed in:
≤ 3 file edits
≤ 1 minute of work
No new dependencies or architecture changes
No research needed
If the task seems non-trivial (multi-file refactor, new feature, needs research), say:
NEVER spawn a Task/subagent — this runs inline
NEVER create PLAN.md or SUMMARY.md files
NEVER run research or plan-checking
If you're unsure how to implement it, STOP and redirect
