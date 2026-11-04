---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: scorecard-marketing-score
title: Score the funnel against the diagnostic
summary: "Score all six Quick Diagnostic rows as round(satisfied/6 x 10), report the score and the rows needed to reach 10, and apply the stated bands."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a scorecard funnel.
conditions_does_not_apply_when: A code review that does not assess the funnel.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, each row's status and the band."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/scorecard-marketing/SKILL.md; sha256=bb8aa862f93ef1004844e0947f3b196db5d8e758617e977b2d90e6c23be506bd; locator=skills/scorecard-marketing/SKILL.md#L20-L23"
status: active
revision: 1
---

# Score the funnel against the diagnostic

Score the funnel against all six Quick Diagnostic rows using round(satisfied_rows / 6 × 10). Report the current score and specific rows needed to reach 10/10. A score of 9–10 requires all six criteria: dormant-desire hook, email captured first, scored categories, unique per-tier content and CTA, and tier-segmented follow-up. Scores 5–7 indicate the funnel exists but generic results or late email capture cost 2–3 rows. Scores ≤3 indicate no concept hook or no scoring.
