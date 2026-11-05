---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: web-typography-reading
title: Design for how reading works
summary: "Respect 7-9 character saccades, fixations and word-shape recognition; distinguish legibility from readability and set long-form text at 16-18px, 1.5-1.7 line height and 45-75 characters."
capability_tags:
  - set-web-type
pattern_tags:
  - reading-mechanics
conditions_applies_when: Setting long-form or reading-heavy text.
conditions_does_not_apply_when: A short label or single-line heading.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The reading text meets the size, leading and measure values."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/web-typography/SKILL.md; sha256=53fa4e5ef426bced13c56ca13d9e47151d89033f934318dc34f7a8eeb44ce75b; locator=skills/web-typography/SKILL.md#L35-L65"
status: active
revision: 1
---

# Design for how reading works

Base typography decisions on reading mechanics: eyes move in saccades of 7-9 characters, pause in fixations, and experienced readers recognize word shapes (bouma) rather than individual letters; line length and letter spacing affect saccade efficiency, while dense or poorly spaced text slows reading. Distinguish legibility (whether characters can be distinguished, a typeface concern) from readability (whether text can be read comfortably for extended periods through size, spacing, and line length); a legible typeface can still be set unreadably. Apply context-specific settings: long-form content should optimize sustained comfort with 16-18px body, 1.5-1.7 line height, and 45-75 character lines; dashboard UI should optimize rapid scanning with distinct weight hierarchy and whitespace between data groups; mobile reading should use larger 17-18px body and higher contrast. Example prose uses font-size 1.125rem (18px), line-height 1.6, and max-width 65ch.
