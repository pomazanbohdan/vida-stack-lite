---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: improve-retention-score
title: Score the retention design
summary: "Score the six Quick Diagnostic rows pass/fail, start at 10, subtract 2 for each failure in rows 1-2 and 1.5 for rows 3-6, and report the score, failing rows and stated band."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a retention design against the six-row rubric.
conditions_does_not_apply_when: A code review that does not assess the behavior design.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, the failing rows and the band interpretation."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/improve-retention/SKILL.md; sha256=f25f70aed02080dc62a90ed107623bad3f32d4a79866941cf1b5f7e4a7a77051; locator=skills/improve-retention/SKILL.md#L37-L40"
status: active
revision: 1
---

# Score the retention design

Target 10/10. Score six Quick Diagnostic rows pass/fail, start at 10, subtract 2 per failing low-Motivation or below-Action-Line row (1–2), and 1.5 per failing prompt, celebration, bottleneck, or scaling row (3–6). All-pass is 10 and all-fail is 0. State score and failing rows. Bands: 9–10 means reliable crossing at low Motivation, event/anchor prompts and celebration; 5–6 means motivation-spike dependence or non-bottleneck optimization; <=3 means core action below the Action Line, spam prompts, no habit wiring.
