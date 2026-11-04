---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: predictable-revenue-score
title: Score the sales process against the diagnostic
summary: "Score five diagnostic rows at 2 points each, report the score and failing rows, and apply the stated 9-10, 5-6 and 3-or-below characteristics."
capability_tags:
  - verify-work-results
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a B2B sales process.
conditions_does_not_apply_when: A code review that does not assess sales.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, the failing rows and the stated characteristics."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/predictable-revenue/SKILL.md; sha256=1a80df1eba0b27b9be1f398083ada69fddc445a6e189a68174edd294da2fcc3d; locator=skills/predictable-revenue/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the sales process against the diagnostic

Score a sales process from 0 to 10 by awarding 2 points for each satisfied Quick Diagnostic row: separated prospecting and closing, a defined outbound process, pipeline predictability three months ahead, known lead-type mix, and a standardized SDR-to-AE handoff. Interpret 9-10 as role separation plus a repeatable process that predicts pipeline; 5-6 as some specialization with ad hoc prospecting or unpredictable pipeline; and 3 or below as one person prospecting and closing with revenue depending on heroics. Always report the current score and the diagnostic rows preventing 10/10.
