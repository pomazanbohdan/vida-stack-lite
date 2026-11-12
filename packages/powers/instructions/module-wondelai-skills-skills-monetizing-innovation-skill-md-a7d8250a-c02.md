---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-monetizing-innovation-skill-md-a7d8250a-c02"
title: "wondelai-skills: skills/monetizing-innovation/SKILL.md module"
summary: "Carrier for 3 atomic instructions from wondelai-skills:skills/monetizing-innovation/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/monetizing-innovation/SKILL.md\"}"
atom_ids:
  - monetizing-innovation-quick-diagnostic
  - monetizing-innovation-score
  - monetizing-innovation-segments
atom_count: 3
atoms: "[{\"atom_id\":\"monetizing-innovation-quick-diagnostic\",\"file_sha256\":\"e9a924ab30ae08ab3343025623ae3a46f181e8d9a93c3597ac7416d5acefae6a\",\"content_sha256\":\"e0f20a337cfaee981cf986a7cbddfbd0b0f13536cbacfcc03ac1486382ec7292\",\"file_bytes\":1810,\"body_bytes\":568},{\"atom_id\":\"monetizing-innovation-score\",\"file_sha256\":\"b1e8fd951ed571d16d3b4db82836df1a373a975e033c158ef548d158d4335c79\",\"content_sha256\":\"27e539c449b1a558b08ea337a81a659d3d4262442ba695374287c22490ae87d9\",\"file_bytes\":1848,\"body_bytes\":695},{\"atom_id\":\"monetizing-innovation-segments\",\"file_sha256\":\"7ded4a50e8227ed694c8dd20f64581fd9a39a3c1635936bd65019e55f73f45fa\",\"content_sha256\":\"36769a715d2eb590e8d5979119445afda02a4cd9ecd6f4497b22ef4a54414158\",\"file_bytes\":1817,\"body_bytes\":626}]"
carrier_sha256: f6fbc6950ffb73c495886e0c38b5187ada6e31604488cb789168724fdd628b12
carrier_bytes: 5838
revision: 1
status: active
---
<!-- vpmodule:atom:begin monetizing-innovation-quick-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: monetizing-innovation-quick-diagnostic
title: Run the pricing diagnostic
summary: "Check WTP timing, failure classification, segment basis, feature roles, leader withholding, value-tracking metric, living business case and pre-agreed triggers; apply the listed action for each failed answer."
capability_tags: []
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a pricing decision.
conditions_does_not_apply_when: A full audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/monetizing-innovation/SKILL.md; sha256=690c57380a24a34f41069d3915366160be8d4db08fa7a643ff5c3751dad14375; locator=skills/monetizing-innovation/SKILL.md#L197-L209"
status: active
revision: 1
---

# Run the pricing diagnostic

Check that WTP was answered before specs freeze; classify the four failures; define segments by needs/WTP; classify every feature; withhold the leader from the lowest tier; use a metric growing with customer value; maintain a WTP-price-volume-cost business case; and agree post-launch triggers in advance. If concept WTP answers are absent, run 15-20 concept interviews; for each other failed diagnostic, do the listed classification, re-clustering, feature scoring, metric selection, business-case creation/update or trigger definition.
<!-- vpmodule:atom:end monetizing-innovation-quick-diagnostic -->
<!-- vpmodule:atom:begin monetizing-innovation-score -->
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
<!-- vpmodule:atom:end monetizing-innovation-score -->
<!-- vpmodule:atom:begin monetizing-innovation-segments -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: monetizing-innovation-segments
title: Segment by willingness to pay
summary: "Segment first by needs, value and WTP, then find observable markers; limit to three or four segments, give each its own value proposition and leader features, and differentiate by delivered value rather than captivity."
capability_tags:
  - design-monetization
pattern_tags:
  - wtp-segmentation
conditions_applies_when: Designing offers for a heterogeneous market.
conditions_does_not_apply_when: A single homogeneous buyer group.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each segment has a WTP band, observable markers and its own value proposition."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/monetizing-innovation/SKILL.md; sha256=690c57380a24a34f41069d3915366160be8d4db08fa7a643ff5c3751dad14375; locator=skills/monetizing-innovation/SKILL.md#L82-L107"
status: active
revision: 1
---

# Segment by willingness to pay

Segment first by needs, value and WTP, then use observable markers to identify groups; never derive segments from demographics or firmographics first. Limit to three or four segments; rerun as the market matures because early-adopter WTP may not predict mainstream WTP. Serve segments where WTP, cost to serve and reachability align, and explicitly skip others. Give each segment its own value proposition and leader features. Merge groups buying for the same reason at the same WTP. Differentiate prices by delivered value and offer differences, never captivity or protected characteristics.
<!-- vpmodule:atom:end monetizing-innovation-segments -->