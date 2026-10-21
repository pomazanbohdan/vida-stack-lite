---
instruction_id: split-only-on-a-size-signal-and-one-axis-at-a-time
title: Split only on a size signal and one axis at a time
summary: "A story is split only when a size signal fires, and only along one axis at a time."
capability_tags:
  - plan-implementation
pattern_tags:
  - implementation-planning
conditions_applies_when: A user story is too large for one phase.
conditions_does_not_apply_when: No size signal fired.
artifact_contract_output_type: story-split
artifact_contract_required_data:
  - the size signal
  - the axis
  - the resulting phases
artifact_contract_verified_by: a size signal fired and exactly one axis was applied
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/spidr-splitting.md
status: active
revision: 1
---

# Split only on a size signal and one axis at a time
Trigger SPIDR splitting if **any** of these size signals fire on the user story
**Compound capabilities.** The story names two or more independent user actions joined by "and"
**Multi-actor.** The story names more than one `[user role]`
**Length.** The assembled story exceeds ~120 chars on a single line
**Vague capability.** The capability is a noun phrase, not a verb-noun pair
If none of these fire, skip SPIDR entirely
For each axis, ask one targeted question. The user picks the axis that best fits their story; only one axis is applied per split
**Splitting more than one axis at once.** SPIDR is one axis per split
**Splitting by technical layer.** "Phase 1: schema. Phase 2: API. Phase 3: UI." That's horizontal planning. Reject
**Pre-splitting before the user even sees the original.** Always show the user-supplied story first; only offer split if it triggers a size signal
