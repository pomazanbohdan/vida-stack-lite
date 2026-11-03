---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: clean-architecture-score
title: Score the architecture against the diagnostic
summary: "Score seven diagnostic rows, map 6-7 to 9-10, 4-5 to 6-8, 2-3 to 3-5 and 0-1 to 0-2, and report failed rows and inversions."
capability_tags:
  - verify-work-results
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a clean-architecture implementation.
conditions_does_not_apply_when: A narrow code review that does not assess architecture.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
  - inversion-list
artifact_contract_verified_by: "The report states the score, failed diagnostic rows and the inversion needed for each."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/clean-architecture/SKILL.md; sha256=fc9fe201ae040df80164bc7a407507882783e2c8cdbc0379a1fbdcf3719e4446; locator=skills/clean-architecture/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the architecture against the diagnostic

Score one point for each of the seven Quick Diagnostic rows satisfied, then map the total to 0–10: 6–7 satisfied maps to 9–10; 4–5 maps to 6–8; 2–3 maps to 3–5; 0–1 maps to 0–2. Report the score, failed diagnostic rows, and the specific inversion needed to fix each failure.
