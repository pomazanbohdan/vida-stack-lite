---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: contagious-score
title: Score the six STEPPS drivers
summary: "Score each STEPPS driver 0-2 for a raw 0-12, map the stated bands to 10-3, and report the raw count, mapped score and drivers to raise next."
capability_tags:
  - verify-work-results
pattern_tags:
  - scoring-rubric
conditions_applies_when: "Assessing a product, campaign or content for shareability."
conditions_does_not_apply_when: A code review that does not assess sharing.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the raw count, the mapped score, the band, and the drivers to raise next."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/contagious/SKILL.md; sha256=cbebc68767b7e2e2ec881e7e08dd7241f5e50134368c3867eba2646d8fababbe; locator=skills/contagious/SKILL.md#L20-L28"
status: active
revision: 1
---

# Score the six STEPPS drivers

Score each of six STEPPS drivers, corresponding to the six Quick Diagnostic rows, as 0 absent, 1 present but weak, or 2 strong and deliberate, for a raw score from 0–12; map 11–12 to 10, 9–10 to 8–9, 6–8 to 6–7, 3–5 to 4–5, and 0–2 to 3-or-below. Report raw count, mapped score, and drivers to raise next to reach 10/10. The 9–10 band requires at least three strength-2 drivers, including Public or Social Currency, and a brand that passes the Trojan Horse test; 6–8 means two genuinely strong drivers but continued reliance on paid reach or product quality alone; 5-or-below means at most one weak driver and incidental sharing.
