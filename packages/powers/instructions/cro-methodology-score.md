---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: cro-methodology-score
title: Score the page against the conversion diagnostic
summary: "Score a page, funnel or flow against the seven diagnostic rows, report the score and failing rows, and apply the stated 9-10, 5-6 and 3-or-below characteristics."
capability_tags:
  - verify-work-results
pattern_tags:
  - scoring-rubric
conditions_applies_when: "Assessing a landing page, funnel or conversion flow."
conditions_does_not_apply_when: A code review that does not assess conversion.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, the failing rows, and the stated characteristics that apply."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/cro-methodology/SKILL.md; sha256=52bfedca17750ad117d838bfdcb5c5db190fb8a7c6e9b82abe44f939830e3897; locator=skills/cro-methodology/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the page against the conversion diagnostic

Score a landing page, funnel, or conversion flow against the seven Quick Diagnostic rows, awarding about 1.4 points for each yes (7 rows total 9.8, capped at 10). Report the current score and failing rows. Interpret 9–10, 5–6 and 3-or-below using the listed characteristics; the source does not define bands 4, 7, or 8.
