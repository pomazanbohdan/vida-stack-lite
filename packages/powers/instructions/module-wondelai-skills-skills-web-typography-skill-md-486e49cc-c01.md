---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-web-typography-skill-md-486e49cc-c01"
title: "wondelai-skills: skills/web-typography/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/web-typography/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/web-typography/SKILL.md\"}"
atom_ids:
  - web-typography-choosing
  - web-typography-common-mistakes
  - web-typography-contexts
  - web-typography-core
  - web-typography-evaluation
  - web-typography-hierarchy
  - web-typography-measurements
  - web-typography-pairing
atom_count: 8
atoms: "[{\"atom_id\":\"web-typography-choosing\",\"file_sha256\":\"cd5e229ce32eb14111db2b996012e65fa24fbcf06723af186c9baa6b3447995c\",\"content_sha256\":\"7358b2dfdd7a4a45f32b20436d1215c72d8ea4761462d4ffc9a9031dcd5fb3a3\",\"file_bytes\":2053,\"body_bytes\":982},{\"atom_id\":\"web-typography-common-mistakes\",\"file_sha256\":\"ce45996ae29dcf6cc561ee49430d7adbdd12e6d0d9c4d7cee0a68fad2c6fdd27\",\"content_sha256\":\"3cfc9dda0fd650e39a56afff6ef2987d04c5f607b87c4084131713ebc7b34b16\",\"file_bytes\":2305,\"body_bytes\":1203},{\"atom_id\":\"web-typography-contexts\",\"file_sha256\":\"24d0a6f27db251adc3e355df595ec3210e303f8a9620bf9be18f4a46faa4bf77\",\"content_sha256\":\"421f98957ba3f8e99a4b56d01f706e425acb81697be01593dd0a6654a710ed80\",\"file_bytes\":1648,\"body_bytes\":525},{\"atom_id\":\"web-typography-core\",\"file_sha256\":\"f70a734b255d824f82f436e2f3914684de94fc55d70f19a12c2d0acc38c84093\",\"content_sha256\":\"91fb5787bac7d6d9395b19aa27034fa2445235785f9f07ac23ad88b6cbeed80d\",\"file_bytes\":1544,\"body_bytes\":414},{\"atom_id\":\"web-typography-evaluation\",\"file_sha256\":\"9e73d1ed1f4a34efc8fdc4d95ff73d3f6843d0d774c120a24420a5ea64ceed88\",\"content_sha256\":\"72187c4e42350f915f5280e1f2b992fe47c7bcb2dbb63727eaab0d7e2f4af8c2\",\"file_bytes\":2329,\"body_bytes\":1241},{\"atom_id\":\"web-typography-hierarchy\",\"file_sha256\":\"54ba749b64ddd473dca7d766ded6172114689ead2af6580ee91e35e296d6d664\",\"content_sha256\":\"24b1f2d3764a8a825abf125d6bce7661c9696a37a4e6299d9ed6b46e5757cbd2\",\"file_bytes\":1847,\"body_bytes\":720},{\"atom_id\":\"web-typography-measurements\",\"file_sha256\":\"fa3cb2d2df042c1319d6d545304ef353119419a9901630999278114d9b9ceb5f\",\"content_sha256\":\"5b408cc5c25dbbe6e1aafdc761fd32406b4eecc04c6c5213347c88636f3c5e0e\",\"file_bytes\":2086,\"body_bytes\":962},{\"atom_id\":\"web-typography-pairing\",\"file_sha256\":\"98e2e3c0296d513e384b2c37107e03dd3ccec412b354153d1b82dad470d40005\",\"content_sha256\":\"7941a31c0f90f8aad38597cb0926ea19e2ce710455480189fa69fffaa8abb3b5\",\"file_bytes\":1767,\"body_bytes\":688}]"
carrier_sha256: 81523663070a0607506cefdcf10452c0eb04a93e242ef8d58474e50710d69658
carrier_bytes: 16428
revision: 1
status: active
---
<!-- vpmodule:atom:begin web-typography-choosing -->
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
<!-- vpmodule:atom:end web-typography-choosing -->
<!-- vpmodule:atom:begin web-typography-common-mistakes -->
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
<!-- vpmodule:atom:end web-typography-common-mistakes -->
<!-- vpmodule:atom:begin web-typography-contexts -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: web-typography-contexts
title: Separate type for a moment from type to live with
summary: "Choose distinctive, impactful type for headlines, buttons, navigation and logos, and readable, comfortable, enduring type for body text, articles and documentation."
capability_tags:
  - set-web-type
pattern_tags:
  - type-context
conditions_applies_when: Assigning typefaces to display and reading roles.
conditions_does_not_apply_when: A single-word logo with no reading text.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Display and reading roles are named and carry different priorities.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/web-typography/SKILL.md; sha256=53fa4e5ef426bced13c56ca13d9e47151d89033f934318dc34f7a8eeb44ce75b; locator=skills/web-typography/SKILL.md#L22-L32"
status: active
revision: 1
---

# Separate type for a moment from type to live with

Classify typography into two contexts: type for a moment covers headlines, buttons, navigation, and logos and prioritizes personality, impact, and distinctiveness; type to live with covers body text, articles, and documentation and prioritizes readability, comfort, and endurance. Workhorse typefaces excel at type to live with by being versatile across sizes, weights, and contexts without drawing attention; examples are Georgia, Source Sans, Freight Text, and FF Meta.
<!-- vpmodule:atom:end web-typography-contexts -->
<!-- vpmodule:atom:begin web-typography-core -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: web-typography-core
title: Let typography carry the content
summary: "Treat typography as the voice of the content and follow the clear-goblet principle: the type stays invisible so the reader focuses on the content, not the type."
capability_tags:
  - set-web-type
pattern_tags:
  - invisible-typography
conditions_applies_when: Choosing or reviewing typography for a web project.
conditions_does_not_apply_when: A display-only brand mark with no reading text.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The type choice serves the content's tone and does not call attention to itself."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/web-typography/SKILL.md; sha256=53fa4e5ef426bced13c56ca13d9e47151d89033f934318dc34f7a8eeb44ce75b; locator=skills/web-typography/SKILL.md#L14-L17"
status: active
revision: 1
---

# Let typography carry the content

Typography is the voice of content: the chosen typeface sets tone before any word is read, so typeface tone must match the content's context (e.g., a legal site must not feel playful, a children's app must not feel corporate). Apply the 'clear goblet' principle: typography should be like a crystal-clear wine glass that keeps focus on the wine (content), not the glass (type).
<!-- vpmodule:atom:end web-typography-core -->
<!-- vpmodule:atom:begin web-typography-evaluation -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: web-typography-evaluation
title: Evaluate a typeface before committing
summary: "Gate every candidate on technical quality, structure, practical fit and real-content testing, and verify the web license before shipping."
capability_tags:
  - set-web-type
pattern_tags:
  - typeface-evaluation
conditions_applies_when: Vetting a typeface for a project.
conditions_does_not_apply_when: Reusing an already approved brand face.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The evaluation records technical, structural, practical and licensing checks."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/web-typography/SKILL.md; sha256=53fa4e5ef426bced13c56ca13d9e47151d89033f934318dc34f7a8eeb44ce75b; locator=skills/web-typography/SKILL.md#L66-L97"
status: active
revision: 1
---

# Evaluate a typeface before committing

A candidate typeface must pass technical, structural, and practical quality checks before it earns a place in a project because beautiful specimens can fail on screen. Technical quality requires consistent stroke weights, even visual color across text blocks, good kerning pairs such as AV, To, and Ty, a complete character set, and multiple weights with at least regular, bold, and italic. Structural assessment favors a generous x-height for screen readability, open counters and apertures (a, e, c), and distinct letterforms (Il1, O0, rn vs. m). Practical needs require testing at actual use sizes on target screens, checking file size, and verifying the license; do not rely on Lorem ipsum because it hides problems with character frequency, word length, and paragraph rhythm, so test with real representative content. Match checks to use: body text prioritizes x-height, open counters, and even color; UI/system text prioritizes small-size legibility and weight range; multilingual products must verify glyph coverage for target languages. Always verify the web license before shipping a font because desktop/print licenses rarely cover web embedding and unlicensed use creates legal liability.
<!-- vpmodule:atom:end web-typography-evaluation -->
<!-- vpmodule:atom:begin web-typography-hierarchy -->
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
<!-- vpmodule:atom:end web-typography-hierarchy -->
<!-- vpmodule:atom:begin web-typography-measurements -->
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
<!-- vpmodule:atom:end web-typography-measurements -->
<!-- vpmodule:atom:begin web-typography-pairing -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: web-typography-pairing
title: Pair typefaces with clear contrast
summary: "Use at most two typefaces with obvious structural contrast, or a same-designer pair or superfamily, and avoid near-identical faces that compete."
capability_tags:
  - set-web-type
pattern_tags:
  - type-pairing-contrast
conditions_applies_when: Combining more than one typeface.
conditions_does_not_apply_when: A single-family system with weight variation.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The pairing names its contrast type or family relationship.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/web-typography/SKILL.md; sha256=53fa4e5ef426bced13c56ca13d9e47151d89033f934318dc34f7a8eeb44ce75b; locator=skills/web-typography/SKILL.md#L129-L157"
status: active
revision: 1
---

# Pair typefaces with clear contrast

Use successful typeface pairings only when the faces have clear, obvious contrast rather than confusing similarity, and use no more than two typefaces. Create contrast through structure (serif + sans), weight (light + regular), era (humanist + geometric), or width (condensed + normal); same-designer faces and superfamilies designed to work together can reduce guesswork. Avoid pairing failures: two near-identical faces, two faces competing for attention, or one face overwhelming the other. Illustrative pairings include serif headlines with sans body, monospace code with sans prose from one family, or a single family varied by weight and size.
<!-- vpmodule:atom:end web-typography-pairing -->