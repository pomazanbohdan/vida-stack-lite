---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: drive-motivation-score
title: Score the motivation system against the diagnostic
summary: "Score a motivation system from 5, add 1 for each of the first five yes answers, subtract 2 if the sixth is yes, and apply the stated bands."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: "Assessing a product feature, team incentive, gamification or engagement loop."
conditions_does_not_apply_when: A code review that does not assess motivation.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, each answer and the band."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/drive-motivation/SKILL.md; sha256=f4683c7ab6846f168272a6905cea24ebfa56218c07f1168230f0991ae3eb6c5b; locator=skills/drive-motivation/SKILL.md#L18-L27"
status: active
revision: 1
---

# Score the motivation system against the diagnostic

Score any motivation system (product features, team incentives, gamification, or engagement loops) against the Quick Diagnostic: start at 5, add 1 for each of the first five yes answers, then subtract 2 if the sixth answer is yes because an if-then reward doing the motivating crowds out the rest. Bands: 9–10 means autonomy, mastery, and purpose are all present with no if-then crowding-out; 5–6 means one pillar carries the system and the other two are weak or extrinsic; 3 or lower means rewards, mandates, or controlling behaviors dominate and intrinsic motivation is absent. Always state the current score, failed diagnostic rows, and specific fixes to reach 10/10.
