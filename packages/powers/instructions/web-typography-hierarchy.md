---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: web-typography-hierarchy
title: Build a legible type hierarchy
summary: "Vary size, weight or color by one or two levers between adjacent levels, keep a 1.2-1.5 modular ratio, never skip levels, pass the squint test and never bury material information."
capability_tags:
  - set-web-type
pattern_tags:
  - type-level-contrast
conditions_applies_when: Setting heading and text levels.
conditions_does_not_apply_when: A single-level document with no headings.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Adjacent levels differ by one or two levers and the hierarchy survives squinting.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/web-typography/SKILL.md; sha256=53fa4e5ef426bced13c56ca13d9e47151d89033f934318dc34f7a8eeb44ce75b; locator=skills/web-typography/SKILL.md#L193-L226"
status: active
revision: 1
---

# Build a legible type hierarchy

Create visual hierarchy by controlled variation in size, weight, and color so readers can see what matters most; vary only one or two of those levers between adjacent levels and never all three. The hierarchy should survive the squint test, use a consistent modular ratio of 1.2-1.5 between heading levels instead of arbitrary sizes, and must not skip levels such as jumping from H1 to H3 because that breaks the reader's mental model. Example heading CSS uses line-height 1.2 and more space above headings than below, for example margin 1.5em 0 0.5em. Do not bury fees, disclaimers, or opt-outs in small or low-contrast type; hierarchy must not hide material information from readers.
