---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: hooked-ux-habit-testing
title: Test whether a habit formed
summary: "Treat a habit as formed at 5% unprompted habitual use; identify power users, the Habit Path and the internal trigger, and act on what they share."
capability_tags: []
pattern_tags:
  - metric-gated-decision
conditions_applies_when: Measuring whether users formed a habit.
conditions_does_not_apply_when: A pre-launch product with no usage data.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The test states the 5% threshold, the power-user cohort and the Habit Path."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/hooked-ux/SKILL.md; sha256=775ae946b15f03d787077c35d166a9addb1e241cb9ffea03ceee3a1be198175e; locator=skills/hooked-ux/SKILL.md#L151-L161"
status: active
revision: 1
---

# Test whether a habit formed

A habit is considered formed when at least 5% of users show unprompted, habitual usage. Test by identifying which users engage most frequently and what they share; identifying the Habit Path action sequence distinguishing power users from casual users; and finding the internal trigger and emotion preceding use.
