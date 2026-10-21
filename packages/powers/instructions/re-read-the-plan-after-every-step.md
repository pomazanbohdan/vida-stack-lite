---
instruction_id: re-read-the-plan-after-every-step
title: Re-read the plan after every step
summary: "The plan is re-read after each unit of work, because an item inserted during the run changes what the next step should do."
capability_tags:
  - execute-plan
pattern_tags:
  - plan-execution
conditions_applies_when: A run works through a sequence of items.
conditions_does_not_apply_when: The run is a single step.
artifact_contract_output_type: plan-reread-record
artifact_contract_required_data:
  - the plan as re-read
  - the items it now contains
artifact_contract_verified_by: the plan was re-read after each step and the queue was taken from it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/autonomous.md
status: active
revision: 1
---

# Re-read the plan after every step
ROADMAP.md re-read after each phase (catches inserted phases)
