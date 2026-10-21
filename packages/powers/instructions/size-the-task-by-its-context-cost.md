---
instruction_id: size-the-task-by-its-context-cost
title: Size the task by its context cost
summary: "A task is sized by the context it consumes, not by an estimate in time; below the floor it is merged, above the ceiling it is split."
capability_tags:
  - plan-implementation
pattern_tags:
  - resource-bounds
conditions_applies_when: The tasks of a plan are written.
conditions_does_not_apply_when: The plan is a single mechanical change.
artifact_contract_output_type: task-sizing
artifact_contract_required_data:
  - the context cost of the task
  - the files it touches
  - the sizing decision
artifact_contract_verified_by: every task falls inside the context band or was merged or split
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-guidance.md
status: active
revision: 1
---

# Size the task by its context cost
Each task targets **10–30% context consumption**
| Context Cost | Action |
|--------------|--------|
| < 10% context | Too small — combine with a related task |
| 10-30% context | Right size — proceed |
| > 30% context | Too large — split into two tasks |
**Context cost signals (use these, not time estimates):**
- Files modified: 0-3 = ~10-15%, 4-6 = ~20-30%, 7+ = ~40%+ (split)
- New subsystem: ~25-35%
- Migration + data transform: ~30-40%
- Pure config/wiring: ~5-10%
**Too large signals:** Touches >3-5 files, multiple distinct chunks, action section >1 paragraph
