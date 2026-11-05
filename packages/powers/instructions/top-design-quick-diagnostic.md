---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: top-design-quick-diagnostic
title: Run the 12-row design diagnostic
summary: "Score one point per yes across 12 craft checks, map 11-12 to 9-10, 8-10 to 7-8, 5-7 to 5-6 and below 5 to 0-4, and state the resulting score."
capability_tags: []
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick scored diagnostic of a digital experience.
conditions_does_not_apply_when: A full category-by-category score.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers all 12 rows and states the mapped score.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/top-design/SKILL.md; sha256=38e84e4c254697514ec1c2f52c5faafa927baea87b05ae3fa8e31ef76cdf1679; locator=skills/top-design/SKILL.md#L258-L276"
status: active
revision: 1
---

# Run the 12-row design diagnostic

Quick Diagnostic: score 1 point per row answered yes, then map the count to the Scoring Rubric band — 11-12 -> 9-10, 8-10 -> 7-8, 5-7 -> 5-6, below 5 -> 0-4 — and state that score. The 12 rows are: (1) Does the hero typography make someone pause mid-scroll? If No, display type is not commanding — fix with Pillar 1 scale, distinctive typeface, viewport-filling type. (2) Would someone screenshot any section? If No, there is no signature moment — fix with Process step 2 by making one section extraordinary. (3) Does the design still read when you blur your eyes? If No, hierarchy is too flat — use bigger headlines, more white space, stronger accents. (4) Are all easing curves custom (no ease/linear)? If No, motion feels default — fix with Pillar 3 custom cubic-bezier. (5) Is there asymmetric tension in the composition? If No, the layout feels safe — fix with Pillar 2 offset, bleed, vary density. (6) Do the colors feel invented for THIS project? If No, the palette is generic — fix with Pillar 4 monochromatic tension, signature, or contextual color. (7) Is the page load choreographed? If No, elements pop in at once — fix with Pillar 3 staggered reveal sequence. (8) Does scroll feel custom and weighted? If No, it is default browser scroll — fix with Pillar 5 smooth-scroll library. (9) Are micro-details considered (selection, focus, cursor)? If No, default browser behaviors remain — fix with Pillar 7 branded selection, designed focus, and cursors opt-in only. (10) Is CLS near zero and LCP under 2.5s? If No, performance undermines quality — fix with Pillar 6 subset fonts, WebP/AVIF, transform/opacity only. (11) Does every animation answer 'why does this move?' If No, motion is decorative — fix with Pillar 3 by cutting motion with no narrative or guidance. (12) Are focus states both beautiful AND accessible? If No, one was sacrificed for the other — fix with Pillar 7 on-brand indicators meeting WCAG visibility.
