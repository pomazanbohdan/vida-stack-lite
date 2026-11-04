---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-website-optional-phases
title: Add optional phases when their condition appears
summary: "Add lean-analytics, high-perf-browser, hooked-ux or ux-heuristics when its stated condition first becomes true, following the same operating rules."
capability_tags:
  - design-website-growth
pattern_tags: []
conditions_applies_when: A journey whose named condition matches an optional phase.
conditions_does_not_apply_when: A condition that has not yet appeared.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The optional phase is inserted at its condition and extends its named artifact.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-website/SKILL.md; sha256=6ae045554ee3e1ee65a4fd30afad42d40e31c7070ef6b806ec1b8eb8edcec008; locator=skills/grow-website/SKILL.md#L206-L216"
status: active
revision: 1
---

# Add optional phases when their condition appears

Optional phases: four additional skills may be inserted when their trigger condition first becomes true — lean-analytics when growth work has no single metric keeping it honest (extends docs/METRICS.md); high-perf-browser when slow pages bleed the traffic already earned (extends docs/WEBSITE.md); hooked-ux when return visits should become a habit loop (extends docs/PRODUCT.md); ux-heuristics when friction, not persuasion, blocks the funnel (extends docs/WEBSITE.md). Optional phases follow the same operating rules — load and use each listed skill exactly as a core phase would, inserting where the Add-when condition first becomes true.
