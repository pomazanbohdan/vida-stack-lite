---
instruction_id: place-checkpoints-and-front-load-the-risky-work
title: Place checkpoints and front-load the risky work
summary: "Arrange tasks so that dependencies are satisfied, each task leaves the system working, the verification checkpoints sit at the right cadence and the high-risk tasks are early."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
  - checkpoint-cadence-policy
conditions_applies_when: A plan has several tasks to execute in order.
conditions_does_not_apply_when: The plan is a single task.
artifact_contract_output_type: checkpoint-plan
artifact_contract_required_data:
  - the task order
  - the checkpoints
  - the high-risk tasks placed first
artifact_contract_verified_by: a checkpoint exists after every two or three tasks and the highest-risk task comes first
compatibility_excludes:
  - put-one-checkpoint-at-the-end-of-the-meaningful-work
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/planning-and-task-breakdown/SKILL.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 4
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Place checkpoints and front-load the risky work

Arrange tasks so that:

1. Dependencies are satisfied (build foundation first)
2. Each task leaves the system in a working state
3. Verification checkpoints occur after every 2-3 tasks
4. High-risk tasks are early (fail fast)

Add explicit checkpoints to the task list target:

```markdown
## Checkpoint: After Tasks 1-3
- [ ] All tests pass
- [ ] Application builds without errors
- [ ] Core user flow works end-to-end
- [ ] Review with human before proceeding
```
