---
instruction_id: size-a-task-by-the-context-it-consumes
title: Size a task by the context it consumes
summary: "A task is sized by the context it consumes and not by time: too small it is combined with a related task, too large it is split in two."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: The tasks of a plan are being sized.
conditions_does_not_apply_when: The tasks are already sized and only their content is being written.
artifact_contract_output_type: task-sizing
artifact_contract_required_data:
  - the context cost of each task
  - the split or merge it needs
artifact_contract_verified_by: every task sits in the band that fits one context window and no task was split for a reason other than its size
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/planner-guidance.md
status: active
revision: 1
---

# Size a task by the context it consumes
Each task targets **10-30% context consumption**.
| Context Cost | Action |
|--------------|--------|
| < 10% context | Too small - combine with a related task |
| 10-30% context | Right size - proceed |
| > 30% context | Too large - split into two tasks |
**Context cost signals (use these, not time estimates):**
Files modified: 0-3 = ~10-15%, 4-6 = ~20-30%, 7+ = ~40%+ (split)
New subsystem: ~25-35%
Migration + data transform: ~30-40%
Pure config/wiring: ~5-10%
**Too large signals:** Touches >3-5 files, multiple distinct chunks, action section >1 paragraph.
**Combine signals:** One task sets up for the next, separate tasks touch same file, neither meaningful alone.
**Rule:** Plans should complete within ~50% context. More plans, smaller scope, consistent quality. Each plan: 2-3 tasks max.
- Estimate effort in context window cost, not time
