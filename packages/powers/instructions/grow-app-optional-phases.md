---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-optional-phases
title: Add optional phases when their condition appears
summary: "Add cold-start-problem, monetizing-innovation, contagious, crossing-the-chasm or jobs-to-be-done when its stated condition first becomes true; keep acquisition-leaning phases locked behind the retention bar."
capability_tags:
  - design-retention-engine
pattern_tags: []
conditions_applies_when: A journey whose named condition matches an optional phase.
conditions_does_not_apply_when: A condition that has not yet appeared.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The optional phase is inserted at its condition, and acquisition phases stay locked until the bar clears."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L199-L210"
status: active
revision: 1
---

# Add optional phases when their condition appears

Optional skills and their add-when conditions/artifacts are: cold-start-problem for a network or marketplace app (PRODUCT.md); monetizing-innovation when engaged users do not convert to revenue (OFFER.md); contagious when users love the app but do not mention it (MARKETING.md); crossing-the-chasm when growth stalls at the early-adopter boundary (STRATEGY.md); and jobs-to-be-done when usage suggests the app is hired for another job (CUSTOMER.md). Follow the same operating rules as core phases, load and use each listed skill, and insert it when its add-when condition first becomes true. Keep cold-start-problem, contagious, and crossing-the-chasm locked behind Rule 8 until retention clears the bar.
