---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: create-business-optional-phases
title: Add optional phases when their condition appears
summary: "Add storybrand-messaging, one-page-marketing, lean-analytics, cold-start-problem, predictable-revenue or continuous-discovery when its stated condition first becomes true, following the same operating rules."
capability_tags:
  - build-validated-business
pattern_tags:
  - resumable-journey
conditions_applies_when: A journey whose named condition matches an optional phase.
conditions_does_not_apply_when: A condition that has not yet appeared.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The optional phase is inserted at its stated condition and produces its mapped artifact.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/create-business/SKILL.md; sha256=2da65aaa976f03e43c638d3d140c44fd9e270f38f8221e7fee495d52d800c925; locator=skills/create-business/SKILL.md#L200-L212"
status: active
revision: 1
---

# Add optional phases when their condition appears

Add optional phases when their stated conditions first become true: storybrand-messaging when a website or pitch needs customer-as-hero copy before launch; one-page-marketing when go-to-market planning starts before beachhead closure; lean-analytics when a live MVP needs its first metrics baseline; cold-start-problem for marketplace or network products; predictable-revenue for B2B sales-led motion; continuous-discovery post-launch for weekly discovery. Optional phases follow the same operating rules as core phases: load and use each listed skill, insert it when its Add-when condition first becomes true, and produce its mapped artifact.
