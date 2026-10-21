---
instruction_id: put-one-checkpoint-at-the-end-of-the-meaningful-work
title: Put one checkpoint at the end of the meaningful work
summary: Verification checkpoints belong at a natural boundary; small steps are verified in one checkpoint at the end of the meaningful work.
capability_tags:
  - plan-implementation
pattern_tags:
  - human-in-the-loop
conditions_applies_when: Verification checkpoints are placed among the tasks of a plan.
conditions_does_not_apply_when: The task itself needs a human decision before the next task can run.
artifact_contract_output_type: checkpoint-placement
artifact_contract_required_data:
  - the checkpoint
  - the boundary it sits on
artifact_contract_verified_by: the plan carries one checkpoint at the boundary and not one per small step
compatibility_excludes:
  - place-checkpoints-and-front-load-the-risky-work
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 1
---

# Put one checkpoint at the end of the meaningful work
**Why bad:** Verification fatigue. Users should not be asked to verify every small step. Combine into one checkpoint at the end of meaningful work
A plan should not interleave multiple checkpoint types with implementation tasks. Checkpoints belong at natural verification boundaries, not scattered throughout
