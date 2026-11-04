---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: hooked-ux-trigger
title: Design the trigger
summary: "Use external cues such as notifications, email or ads, or internal emotional cues, to move users from external to internal triggers; map the product to the negative emotion it resolves and never trigger vulnerable states."
capability_tags: []
pattern_tags:
  - internal-trigger
conditions_applies_when: "Designing a notification, prompt or emotional cue."
conditions_does_not_apply_when: A product with no repeat trigger.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The trigger names its cue, timing and target emotion, and excludes vulnerable states."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/hooked-ux/SKILL.md; sha256=775ae946b15f03d787077c35d166a9addb1e241cb9ffea03ceee3a1be198175e; locator=skills/hooked-ux/SKILL.md#L30-L57"
status: active
revision: 1
---

# Design the trigger

A trigger actuates behavior and may be external (environment-driven, such as notifications, email, or ads) or internal (emotion-driven); the goal is to move users from external to internal triggers. Map the product to the specific negative emotion it resolves. External triggers should be well-timed, actionable, and lead to the simplest next action; if users still need external prompts after about 30 days, no internal trigger has formed. Do not trigger behavior from vulnerable emotional states such as depression, addiction, or grief, where users cannot exercise the autonomy the loop assumes.
