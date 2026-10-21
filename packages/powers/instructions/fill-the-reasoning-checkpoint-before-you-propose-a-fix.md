---
instruction_id: fill-the-reasoning-checkpoint-before-you-propose-a-fix
title: Fill the reasoning checkpoint before you propose a fix
summary: "The hypothesis, its evidence, the falsification test and the blind spots are written down before any code changes."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A fix is about to be proposed.
conditions_does_not_apply_when: The diagnosis is only being reported and no fix is proposed.
artifact_contract_output_type: reasoning-checkpoint
artifact_contract_required_data:
  - the hypothesis
  - the confirming evidence
  - the falsification test
  - the blind spots
artifact_contract_verified_by: every field of the checkpoint holds a specific answer
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-debugger.md
status: active
revision: 1
---

# Fill the reasoning checkpoint before you propose a fix
Before proposing any fix. This is MANDATORY — not optional.
Forces articulation of the hypothesis and its evidence BEFORE changing code. Catches fixes that address symptoms instead of root causes.
If you cannot fill all seven fields with specific, concrete answers — you do not have a confirmed root cause yet. Return to investigation_loop.
Is the confirming evidence direct observation, not inference?
Does the fix address the root cause or a symptom?
