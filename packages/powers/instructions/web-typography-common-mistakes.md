---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: web-typography-common-mistakes
title: Avoid the common type mistakes
summary: "Check the nine recurring failures, from cramped lines and long measures to slow fonts, small body text, clashing faces and lorem-ipsum testing, and apply each stated fix."
capability_tags: []
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing type for the listed failures.
conditions_does_not_apply_when: A finding already covered by a narrower instruction.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/web-typography/SKILL.md; sha256=53fa4e5ef426bced13c56ca13d9e47151d89033f934318dc34f7a8eeb44ce75b; locator=skills/web-typography/SKILL.md#L262-L275"
status: active
revision: 1
---

# Avoid the common type mistakes

Treat these as failure modes to avoid: cramped text, where tight line height fatigues readers, so increase line-height to 1.6+ and add paragraph spacing; lines too long, where beyond 75 characters the eye loses the return sweep, so cap text containers at max-width 65ch; disconnected headings, where the source says excess space above breaks association with content, so reduce space above the heading and keep space below; blurry text from font-smoothing or subpixel rendering issues, so check font-smoothing, try a different weight, or increase size; slow font loading from unoptimized files blocking rendering, so subset, use font-display: swap, and preload critical fonts; body text too small because phones are held farther than assumed and small text strains older eyes, so increase to 18px and test at real distance; unclear hierarchy from insufficient contrast between levels, so increase size/weight differences; clashing typefaces from pairing without clear contrast, so use one family or ensure structural contrast such as serif + sans; and Lorem ipsum testing, where dummy text hides rhythm and frequency problems, so test with real representative content.
