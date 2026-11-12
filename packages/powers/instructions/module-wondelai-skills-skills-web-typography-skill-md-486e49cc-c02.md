---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-web-typography-skill-md-486e49cc-c02"
title: "wondelai-skills: skills/web-typography/SKILL.md module"
summary: "Carrier for 4 atomic instructions from wondelai-skills:skills/web-typography/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/web-typography/SKILL.md\"}"
atom_ids:
  - web-typography-quick-diagnostic
  - web-typography-reading
  - web-typography-responsive
  - web-typography-score
atom_count: 4
atoms: "[{\"atom_id\":\"web-typography-quick-diagnostic\",\"file_sha256\":\"7dea7baddadef2f63766e79861fcad57835a6f9524cabc5497c66b4017e8b463\",\"content_sha256\":\"6515dbd5313f6f2bda014a4fbdadf546d5412569dd95ea9b636f042eb4f44c8a\",\"file_bytes\":2141,\"body_bytes\":957},{\"atom_id\":\"web-typography-reading\",\"file_sha256\":\"8f760f5481161d0efe6181c630278265746b18aa7ef72eccae8a1e225ee35110\",\"content_sha256\":\"ea63bc08043615febfaf158ea7c0bc84c998146c1494d57a0c45f2e08aa55f47\",\"file_bytes\":2108,\"body_bytes\":997},{\"atom_id\":\"web-typography-responsive\",\"file_sha256\":\"5c370f0d64dcbd421c0cda2dd62b1aa830bb0d7b6af050b6e4c3292c1f1344cf\",\"content_sha256\":\"5fa8fedb6677d93a1ee216d425dd33b638335e9ee57f235539f253216eeeafba\",\"file_bytes\":2166,\"body_bytes\":995},{\"atom_id\":\"web-typography-score\",\"file_sha256\":\"3d6b41f79c1a3952cf9973611f8b3b50c7a9600430085798861b45a3a2ebde6f\",\"content_sha256\":\"382cf692770fb6ba81ec6e04c81924eb340d2c672d580e09511f53b0e468234e\",\"file_bytes\":1656,\"body_bytes\":546}]"
carrier_sha256: 29375e019646b1987caefb42df61d1ab39c2841211c900541bfc37e86e09599e
carrier_bytes: 8498
revision: 1
status: active
---
<!-- vpmodule:atom:begin web-typography-quick-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: web-typography-quick-diagnostic
title: Run the 10-row type diagnostic
summary: "Check body size, measure, line height, level contrast, real-device testing, 200KB payload, fallbacks, 200% zoom, headline orphans and link distinction, with a score and action for every no."
capability_tags: []
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of web typography.
conditions_does_not_apply_when: A full typeface selection exercise.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers all 10 rows and states the score with an action for every no.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/web-typography/SKILL.md; sha256=53fa4e5ef426bced13c56ca13d9e47151d89033f934318dc34f7a8eeb44ce75b; locator=skills/web-typography/SKILL.md#L276-L290"
status: active
revision: 1
---

# Run the 10-row type diagnostic

Use this ten-row diagnostic and act on every No: body text must be 16px or larger, prefer 18px for reading-heavy pages, otherwise increase to at least 16px; line length must be under 75 characters, otherwise set max-width 65ch on prose containers; body line height must be 1.4+, otherwise increase to 1.5-1.7; type levels must have clear contrast, otherwise increase size or weight differences; every actual use size must be tested on real screens/target devices; total font payload must be under 200KB, otherwise subset, use WOFF2, and consider variable fonts; fallback fonts must be specified in every font-family, otherwise add system fallbacks to prevent FOIT/blank text; the page must work at 200% zoom, otherwise fix overflow and truncation; headings must be free of orphaned words, otherwise use text-wrap: balance or manual breaks; links must be visually distinct, otherwise use color and/or underline distinction.
<!-- vpmodule:atom:end web-typography-quick-diagnostic -->
<!-- vpmodule:atom:begin web-typography-reading -->
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
<!-- vpmodule:atom:end web-typography-reading -->
<!-- vpmodule:atom:begin web-typography-responsive -->
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
<!-- vpmodule:atom:end web-typography-responsive -->
<!-- vpmodule:atom:begin web-typography-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: web-typography-score
title: Score the typography out of 10
summary: "Score one point per satisfied Quick Diagnostic row out of 10, read the 9-10, 5-6 and at most 3 bands, and always state the score and the failing rows."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a web typography implementation.
conditions_does_not_apply_when: A visual review that does not assess reading.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: The report states the score and the specific failing diagnostic rows.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/web-typography/SKILL.md; sha256=53fa4e5ef426bced13c56ca13d9e47151d89033f934318dc34f7a8eeb44ce75b; locator=skills/web-typography/SKILL.md#L18-L21"
status: active
revision: 1
---

# Score the typography out of 10

Score a web-typography implementation from 0 to 10 as the number of the 10 Quick Diagnostic rows it satisfies, with a goal of 10/10. Bands: 9-10 means body 16px+, measure under 75ch, line-height 1.4+, clear level contrast, font payload under 200KB, fallbacks set, and survives 200% zoom; 5-6 means readable but missing measure control, fallbacks, or zoom resilience; <=3 means sub-16px body, no measure cap, FOIT, or unreadable hierarchy. Always state the current score and the specific diagnostic rows failing.
<!-- vpmodule:atom:end web-typography-score -->