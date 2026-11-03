---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: 37signals-way-score
title: Score the product process against the framework
summary: "Rate product plans, feature scopes and team processes 0-10, report the score and the changes needed to reach 10, and apply the five stated bands."
capability_tags:
  - verify-work-results
pattern_tags:
  - scoring-rubric
conditions_applies_when: "Assessing a product plan, feature scope or team process."
conditions_does_not_apply_when: A code review that does not assess the product process.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - improvement-changes
artifact_contract_verified_by: "The report states the current score, the band it falls in, and the specific changes needed to reach 10."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/37signals-way/SKILL.md; sha256=b6882f6f197ed4eee0bfe71518f7aa16a2bf30a3bf6446b7738e6f04d39b08b4; locator=skills/37signals-way/SKILL.md#L18-L27"
status: active
revision: 1
---

# Score the product process against the framework

Rate product plans, feature scopes, and team processes from 0 to 10 against the framework; report both the current score and specific changes needed to reach the goal of 10/10. Score 9–10 for fixed-time cycles, shaped pitches, small teams, no backlog, opinionated defaults, and clear copy; 7–8 for mostly shaped work and small teams with some scope creep or process overhead; 5–6 for some shaping but persistent backlogs, oversized teams, or preferences replacing decisions; 3–4 for heavy process with occasional simplicity efforts; and 0–2 for a feature factory with long-term roadmaps, large teams, estimation rituals, and no shaping.
