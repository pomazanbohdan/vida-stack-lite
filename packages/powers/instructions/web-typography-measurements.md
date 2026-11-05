---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: web-typography-measurements
title: "Fix size, measure and line height"
summary: "Use at least 16px body (18px for reading-heavy pages), 45-75 characters with 66 optimal, 1.4-1.8 body line height, 1.1-1.25 heading height and a 1.2-1.5 heading scale."
capability_tags:
  - set-web-type
pattern_tags:
  - readable-measure
conditions_applies_when: Setting the core typographic measurements.
conditions_does_not_apply_when: A decorative display block with no reading text.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Body size, measure and line heights fall inside the stated ranges."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/web-typography/SKILL.md; sha256=53fa4e5ef426bced13c56ca13d9e47151d89033f934318dc34f7a8eeb44ce75b; locator=skills/web-typography/SKILL.md#L158-L192"
status: active
revision: 1
---

# Fix size, measure and line height

Build comfortable reading from three measurements—font size, line length, and line height—which the source says matter more than typeface choice. Body font size must be at least 16px, should err larger at 18px for reading-heavy sites, and mobile users should be assumed to hold phones farther away. Keep measure at 45-75 characters ideal with 66 optimal, enforced with ch units or max-width. Use 1.4-1.8 line height for body, increase it for longer lines, and keep headlines tighter at 1.1-1.25. Use a consistent modular heading ratio of 1.2-1.5 between levels rather than arbitrary sizes. Context examples: blogs/articles use about 65ch max-width and 1.6 line height; dense dashboard table cells and labels may use about 1.3; landing pages may use about 1.25rem with 1.7 line height. Example CSS uses clamp(1rem, 0.95rem + 0.25vw, 1.125rem) for prose, line-height 1.1 for h1/h2, 1.35 for UI text, and 1.6 for body text.
