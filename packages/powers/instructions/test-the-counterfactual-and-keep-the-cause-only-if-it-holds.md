---
instruction_id: test-the-counterfactual-and-keep-the-cause-only-if-it-holds
title: Test the counterfactual and keep the cause only if it holds
summary: "The suspected cause is tested by changing one thing; if the symptom survives the change, the cause is wrong."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A hypothesis about the root cause is in hand.
conditions_does_not_apply_when: The cause is already confirmed by a failing reproduction.
artifact_contract_output_type: counterfactual-result
artifact_contract_required_data:
  - the single variable changed
  - the result
  - the verdict on the hypothesis
artifact_contract_verified_by: the counterfactual was executed and the hypothesis kept or dropped on its result
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/thinking-models-debug.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - research
---

# Test the counterfactual and keep the cause only if it holds
When you have a hypothesis about the root cause, construct a counterfactual: "If I change ONLY this one variable/config/line, the bug should disappear (or appear)." Execute the counterfactual test. If the bug persists after your targeted change, your hypothesis is wrong -- the cause is elsewhere. If the bug disappears, you have strong causal evidence. This is more powerful than correlation ("the bug appeared after deploy X") because it tests the mechanism, not just the timeline.
