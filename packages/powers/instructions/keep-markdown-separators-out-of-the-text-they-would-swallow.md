---
instruction_id: keep-markdown-separators-out-of-the-text-they-would-swallow
title: Keep markdown separators out of the text they would swallow
summary: A rule under a line of text turns that line into a heading; a heading boxed between two rules is its own separator.
capability_tags:
  - write-technical-prose
pattern_tags:
  - technical-writing
conditions_applies_when: A markdown document is written.
conditions_does_not_apply_when: The output is not markdown.
artifact_contract_output_type: markdown-layout
artifact_contract_required_data:
  - the separators used
  - the blank lines around them
artifact_contract_verified_by: no rule sits directly under a line of text and no heading is boxed between two rules
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/ui-brand.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - design-ux
---

# Keep markdown separators out of the text they would swallow
A `---` directly under a line of text with no blank line between — that is a setext heading underline, not a break, and it swallows the line above
Boxing a heading between two rules — the heading is the separator
Table rules use ASCII `-`, never box-drawing characters.
Fixed-width runs of `━`, `─` or `═` as separators — they wrap in a narrow pane
