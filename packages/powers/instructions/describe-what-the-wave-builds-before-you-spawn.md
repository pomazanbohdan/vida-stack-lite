---
instruction_id: describe-what-the-wave-builds-before-you-spawn
title: Describe what the wave builds before you spawn
summary: "The round is announced with what it builds, how, and why it matters."
capability_tags:
  - coordinate-program
pattern_tags:
  - program-orchestration
conditions_applies_when: A round of plans is about to be dispatched.
conditions_does_not_apply_when: The round contains a single trivial plan.
artifact_contract_output_type: round-brief
artifact_contract_required_data:
  - what the round builds
  - the approach
  - why it matters
artifact_contract_verified_by: "the brief says what is built and why, not only which plan is running"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Describe what the wave builds before you spawn
read each plan's `<objective>`. Extract what's being built and why.
{2-3 sentences: what this builds, technical approach, why it matters}
Bad: "Executing terrain generation plan"
Good: "Procedural terrain generator using Perlin noise — creates height maps and biome zones. Required before vehicle physics."
