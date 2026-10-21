---
instruction_id: stop-at-a-workstream-boundary-instead-of-completing-the-milestone
title: Stop at a workstream boundary instead of completing the milestone
summary: "When one line of work is done but others are still running, the milestone is not closed and nothing further is started; the person decides."
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: One line of work has finished while other lines of work are still active.
conditions_does_not_apply_when: All lines of work are finished.
artifact_contract_output_type: boundary-report
artifact_contract_required_data:
  - the active lines of work
  - their state
  - the decision left to the person
artifact_contract_verified_by: the milestone was not closed and no further command was started
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/transition.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/transition/steps/workstream-collision-check.md
status: active
revision: 1
---

# Stop at a workstream boundary instead of completing the milestone
Before routing to Route B, check whether other workstreams are still active.
This prevents one workstream from advancing or completing the milestone while other workstreams are still working on their phases.
Do NOT suggest completing the milestone or advancing to the next milestone — other workstreams are still working.
Do NOT auto-invoke any further slash commands.
**Stop here.** The user must explicitly decide what to do next.
