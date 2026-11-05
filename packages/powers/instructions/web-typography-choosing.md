---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: web-typography-choosing
title: Choose typefaces from purpose
summary: "Define the job first, match tone to content, confirm the needed weights and styles, and start from the stated safe serif and sans options."
capability_tags:
  - set-web-type
pattern_tags:
  - purposeful-type-choice
conditions_applies_when: "Selecting a typeface for body, headings or UI."
conditions_does_not_apply_when: A fixed brand face that cannot be changed.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each choice names its job and the tone it serves.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/web-typography/SKILL.md; sha256=53fa4e5ef426bced13c56ca13d9e47151d89033f934318dc34f7a8eeb44ce75b; locator=skills/web-typography/SKILL.md#L98-L128"
status: active
revision: 1
---

# Choose typefaces from purpose

Select typefaces by purpose rather than aesthetics: the content's tone, reading context, and duration drive selection, not personal preference or trends. Define the job first because body text, headlines, and UI elements may each need different faces; match tone to content; and confirm the family has the needed weights, italics, and styles before committing. Safe starting points include Georgia, Source Serif Pro, or Charter for body serif; system fonts, Source Sans Pro, Inter, or IBM Plex Sans for body sans; and Atkinson Hyperlegible for accessibility-focused use. Context guidance: content-heavy sites use a workhorse serif or sans for sustained reading; SaaS dashboards use a clean sans with strong tabular figures; accessibility-focused products use faces designed for maximum legibility. A web font should be paired with a system fallback stack such as 'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif.
