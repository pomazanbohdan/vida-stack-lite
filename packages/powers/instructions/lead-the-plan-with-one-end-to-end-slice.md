---
instruction_id: lead-the-plan-with-one-end-to-end-slice
title: Lead the plan with one end-to-end slice
summary: The first task wires one path through every layer and carries a real check; the rest expand from the proven slice.
capability_tags:
  - plan-implementation
pattern_tags:
  - vertical-slicing
conditions_applies_when: A piece of work touches several layers.
conditions_does_not_apply_when: The work is a single isolated change.
artifact_contract_output_type: plan
artifact_contract_required_data:
  - the leading task
  - the check that proves the path
artifact_contract_verified_by: the leading task is an end-to-end path with a runnable check
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-planner.md
status: active
revision: 1
---

# Lead the plan with one end-to-end slice
Every phase plan LEADS with one `type="tracer"` task — the thinnest path that touches every layer the phase will modify, wired end-to-end, carrying a real runnable `<verify>`.
A tracer is production-quality, not a prototype.
Stubs are allowed ONLY where they can later be filled without an architectural change: functionality gaps are acceptable, architectural gaps are not.
after each task a real user can do something they could not before.
