---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: web-typography-responsive
title: Make type fluid and fonts efficient
summary: "Use clamp() for fluid sizes, larger 17-18px body on mobile, font-display swap, preload of critical fonts, subset characters, WOFF2 and a total payload under 200KB; never drop needed glyphs or weights for speed."
capability_tags:
  - set-web-type
pattern_tags:
  - fluid-type
conditions_applies_when: Implementing responsive type and web-font loading.
conditions_does_not_apply_when: A system-font-only page with no web fonts.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The type scales fluidly and the font payload stays under 200KB with fallbacks.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/web-typography/SKILL.md; sha256=53fa4e5ef426bced13c56ca13d9e47151d89033f934318dc34f7a8eeb44ce75b; locator=skills/web-typography/SKILL.md#L227-L261"
status: active
revision: 1
---

# Make type fluid and fonts efficient

Make type adapt to screens and make web fonts load efficiently. Use fluid typography with clamp(min, preferred, max) so sizes scale smoothly between viewports without media-query breakpoint jumps; a fixed size cannot serve both a 320px phone and a 1440px desktop. Mobile needs slightly larger 17-18px body and a tighter heading scale, while desktop can push display sizes if line-length limits are kept. For loading, use font-display: swap so fallback text appears immediately, preload critical fonts, subset fonts to needed characters, keep total font payload under 200KB, prefer WOFF2, and use a variable font that can replace 4-6 static weight files. Example implementation uses @font-face with a .woff2 source, font-display: swap, and a Latin unicode-range subset, plus a crossorigin font preload. Do not optimize users out: subsetting must not drop characters non-English readers need, and italic/bold weights needed for emphasis must not be removed.
