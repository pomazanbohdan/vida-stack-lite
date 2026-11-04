---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: monetizing-innovation-score
title: Score the pricing and packaging decisions
summary: "Score pricing and packaging decisions 0-10 against the principles, report the current score, the failing principles and the changes needed to reach 10/10."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a pricing and packaging decision.
conditions_does_not_apply_when: A code review that does not assess pricing.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, the failing principles and the changes needed."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/monetizing-innovation/SKILL.md; sha256=690c57380a24a34f41069d3915366160be8d4db08fa7a643ff5c3751dad14375; locator=skills/monetizing-innovation/SKILL.md#L18-L27"
status: active
revision: 1
---

# Score the pricing and packaging decisions

Score pricing and packaging decisions 0–10 against the principles, report current score and changes needed for 10/10. Bands: 9–10 requires concept-stage WTP, value segments, leader-led tiers/killer unbundling, value-tracking metric, and pre-agreed launch triggers; 7–8 indicates real but late WTP or a remaining killer, with a deliberate model; 5–6 indicates near-launch cost/competitor pricing, one-size offer, or copied tiers/freemium; 3–4 indicates feature-led roadmap, finance-afterthought pricing, or week-one discounting; 0–2 indicates no pre-launch pricing talk, feature-shocked flagship, no segments, or price cuts as sole lever.
