---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: scorecard-marketing-results
title: Design the results page
summary: "Show the overall score and category breakdown, provide dynamic content for each tier, and give each tier a specific next step and CTA without inflating the computed score."
capability_tags:
  - design-scorecard-funnel
pattern_tags:
  - scorecard-tiers
conditions_applies_when: Designing scorecard results and tiers.
conditions_does_not_apply_when: A single generic result for every respondent.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each tier has dynamic content and a specific CTA, and the score is not inflated."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/scorecard-marketing/SKILL.md; sha256=bb8aa862f93ef1004844e0947f3b196db5d8e758617e977b2d90e6c23be506bd; locator=skills/scorecard-marketing/SKILL.md#L85-L114"
status: active
revision: 1
---

# Design the results page

Show the respondent's overall score and category breakdown. Provide dynamic content for each tier, defaulting to Low, Medium, and High; custom tiers are optional. Calibrate a clear next step and CTA to the tier. Do not inflate or deflate a computed score to steer the respondent toward an offer; the tier must reflect their actual answers. Personalized PDF reports are an optional way to extend the result.
