---
instruction_id: stop-and-offer-the-options-when-no-auto-mode-is-set
title: Stop and offer the options when no auto mode is set
summary: "Without an auto mode the run stops after the current step, presents the options and waits."
capability_tags:
  - hand-back-the-next-step
pattern_tags:
  - human-in-the-loop
conditions_applies_when: A step finished and neither the auto flag nor the auto preference is set.
conditions_does_not_apply_when: The auto flag or the auto preference is set and the verification passed with no gaps.
artifact_contract_output_type: options-presented
artifact_contract_required_data:
  - the options presented
  - the recommendation
  - the wait for the choice
artifact_contract_verified_by: the run stopped and presented the options instead of advancing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/offer-next.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Stop and offer the options when no auto mode is set
**STOP. Do not auto-advance. Do not execute transition. Do not plan next phase. Present options to the user and wait.**
If CONTEXT.md does **not** exist for the next phase, present:
