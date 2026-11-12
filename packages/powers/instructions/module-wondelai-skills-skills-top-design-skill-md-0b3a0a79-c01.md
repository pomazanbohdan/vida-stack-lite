---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-top-design-skill-md-0b3a0a79-c01"
title: "wondelai-skills: skills/top-design/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/top-design/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/top-design/SKILL.md\"}"
atom_ids:
  - top-design-bands
  - top-design-categories
  - top-design-color
  - top-design-common-mistakes
  - top-design-core
  - top-design-formula
  - top-design-implementation
  - top-design-layout
atom_count: 8
atoms: "[{\"atom_id\":\"top-design-bands\",\"file_sha256\":\"9a12538afd639ba9a08f5cb5ebaea8ccb72ef14f2b86703fd1331bac85ef3160\",\"content_sha256\":\"4e9434848e3ab3920299eec3a3cc5221d2447545f2e4f8e0d6675df175402f35\",\"file_bytes\":1567,\"body_bytes\":505},{\"atom_id\":\"top-design-categories\",\"file_sha256\":\"0a12426116fead5df82eb2becf4574a3769e5bc37dee95117fd0f20d4bbb70be\",\"content_sha256\":\"285f6ac8b56dfe26cc0627e05656bb93a7607f980a7e0df9e8e849e548d48e73\",\"file_bytes\":2675,\"body_bytes\":1588},{\"atom_id\":\"top-design-color\",\"file_sha256\":\"3382114926f43a522a2971477984882183b45d477d870f7b342b3aa40a35f71b\",\"content_sha256\":\"8998d4a3dc989f608de9eb7af938eb1c5e045186acbae352c8c31c8b836cd4e2\",\"file_bytes\":2115,\"body_bytes\":977},{\"atom_id\":\"top-design-common-mistakes\",\"file_sha256\":\"20979e861a690131782e98ec539c7169ed44047143d676771a707073cdaaac5b\",\"content_sha256\":\"158d4b9c79def4e39530195b306f2a9c308160d8d6c1987bedd248e6465efced\",\"file_bytes\":3335,\"body_bytes\":2212},{\"atom_id\":\"top-design-core\",\"file_sha256\":\"401e7af99fa759b6365c3d46a9501ea87a23ec1f0b512701fc1de162fc142f04\",\"content_sha256\":\"214d89a9a15f2f9bb6415d4190c4fa544836203b39e26f1d1ee7331d6f8ed65e\",\"file_bytes\":1441,\"body_bytes\":268},{\"atom_id\":\"top-design-formula\",\"file_sha256\":\"a000159852348b0e49e0f0d1013261de5ef0c27f7071172c8e0c26b7730042c0\",\"content_sha256\":\"35cc69c8c3237ed23507fe00c834190511a820eaab33057c716f8aeac405d66b\",\"file_bytes\":1244,\"body_bytes\":200},{\"atom_id\":\"top-design-implementation\",\"file_sha256\":\"df2cb6f938d10493ef8a55d25bf59261553932b3919d866f0a0e6be0f75c8f1d\",\"content_sha256\":\"a16a8d97d9361d5fccc2802483c5fefaf8b2d8f0380de981839294ab064d2766\",\"file_bytes\":1502,\"body_bytes\":362},{\"atom_id\":\"top-design-layout\",\"file_sha256\":\"503fca024ef33538978d6cae3c9e521824afb52d9a72411383eafff87d6f43e8\",\"content_sha256\":\"672c54b4c4e94c6984dad5c930bd5cfa370b717c2184c11c2745e31e48454e8f\",\"file_bytes\":1989,\"body_bytes\":821}]"
carrier_sha256: aa37e1d6c719c1452fc3f8930c7f31b0781ac3d7aeae36a33f57b4e90696cf9c
carrier_bytes: 16639
revision: 1
status: active
---
<!-- vpmodule:atom:begin top-design-bands -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: top-design-bands
title: Use the 0-10 score bands
summary: "Map the experience to the six bands: 0-2 Amateur, 3-4 Basic, 5-6 Competent, 7-8 Professional, 9 Exceptional and 10 World-class, each with its stated markers."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assigning an overall score to a digital experience.
conditions_does_not_apply_when: A component-level review with no overall judgment.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The assigned score uses one of the six defined bands.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/top-design/SKILL.md; sha256=38e84e4c254697514ec1c2f52c5faafa927baea87b05ae3fa8e31ef76cdf1679; locator=skills/top-design/SKILL.md#L24-L34"
status: active
revision: 1
---

# Use the 0-10 score bands

Rate digital experiences on a 0-10 scale with these bands: 0-2 Amateur (default fonts, no hierarchy, generic layout, template feel); 3-4 Basic (decent typography, some hierarchy, but forgettable); 5-6 Competent (good fundamentals, clean execution, but lacks soul); 7-8 Professional (strong typography, intentional motion, clear POV); 9 Exceptional (signature moments, memorable details, near-flawless craft); 10 World-class (would win Awwwards SOTD and defines new standards).
<!-- vpmodule:atom:end top-design-bands -->
<!-- vpmodule:atom:begin top-design-categories -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: top-design-categories
title: Score the five weighted categories
summary: "Score Typography 25%, Visual Composition 25%, Motion & Interaction 20%, Color & Atmosphere 15% and Details & Craft 15%, each 0-10 against its stated criteria."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Scoring the craft dimensions of a web experience.
conditions_does_not_apply_when: A single-dimension audit such as typography only.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: All five categories carry a 0-10 score and their stated criteria.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/top-design/SKILL.md; sha256=38e84e4c254697514ec1c2f52c5faafa927baea87b05ae3fa8e31ef76cdf1679; locator=skills/top-design/SKILL.md#L35-L76"
status: active
revision: 1
---

# Score the five weighted categories

Score five categories, each 0-10, with weights: Typography 25%, Visual Composition 25%, Motion & Interaction 20%, Color & Atmosphere 15%, Details & Craft 15%. Typography: 0-3 system fonts, uniform scale, default tracking; 4-6 premium fonts, some scale contrast, basic hierarchy; 7-8 dramatic scale contrast (10:1+), perfect tracking, optical alignment; 9-10 typography is the design, with gasping moments, custom/variable fonts, and type as architecture. Visual Composition: 0-3 centered everything, equal spacing, rigid grid, no tension; 4-6 some asymmetry, decent spacing rhythm, basic depth; 7-8 intentional grid breaks, layered elements, strong negative space; 9-10 magnetic compositions, unexpected scale shifts, elements that breathe and surprise. Motion & Interaction: 0-3 no animation or default/linear motion; 4-6 basic transitions, some scroll effects; 7-8 custom easing, orchestrated reveals, purposeful parallax; 9-10 motion tells stories, perfectly timed choreography, scroll feels invented. Color & Atmosphere: 0-3 random colors, pure black/white, no mood; 4-6 cohesive palette, some atmosphere; 7-8 colors feel owned, contextual shifts, intentional contrast; 9-10 colors feel invented for this project, atmosphere you can feel. Details & Craft: 0-3 default cursors, no hover states, generic everything; 4-6 basic hover states, some custom elements; 7-8 magnetic buttons, branded selection colors, custom cursor if user-approved; 9-10 every micro-detail considered, including focus states, loading, empty states, and scroll indicators.
<!-- vpmodule:atom:end top-design-categories -->
<!-- vpmodule:atom:begin top-design-color -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: top-design-color
title: Invent the palette
summary: "Build color for the project with one of three approaches, avoid pure #000 and #fff, define a functional opacity hierarchy, use one restrained accent and support light and dark contexts."
capability_tags:
  - art-direct-web-experience
pattern_tags:
  - invented-palette
conditions_applies_when: Choosing the color system for a high-craft experience.
conditions_does_not_apply_when: A brand palette that is fixed by an external identity system.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The palette names its approach and avoids pure black or white.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/top-design/SKILL.md; sha256=38e84e4c254697514ec1c2f52c5faafa927baea87b05ae3fa8e31ef76cdf1679; locator=skills/top-design/SKILL.md#L138-L154"
status: active
revision: 1
---

# Invent the palette

Color should feel invented for each project, never pulled from a generic palette generator. Three approaches are allowed: monochromatic tension (95% one color, 5% accent), bold signature (own a combination), or contextual shifting (the palette responds to content). Never use pure black or pure white: #0a0a0a and #fafaf9 have the required physical quality that #000/#fff lack. Build a functional hierarchy with text-primary, text-secondary at 60% opacity, text-tertiary at 40%, surface, and border at 10% for consistent depth. Use one strong accent sparingly (#ff4d00 or similar) rather than a complex multi-color palette. Contextual color shifts between sections create visual chapters. Design the system for both light and dark contexts, not individual instances. Drive everything from CSS custom properties (--color-dark/-light/-accent plus functional --color-text-primary/-surface), and restrict the accent to CTAs, links, and single-detail moments.
<!-- vpmodule:atom:end top-design-color -->
<!-- vpmodule:atom:begin top-design-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: top-design-common-mistakes
title: Avoid the 15 craft mistakes
summary: "Check the 15 recurring failures, from generic fonts and default easing to pure black, purple-blue gradients, emoji icons, text parallax and default form styles, and apply each stated fix."
capability_tags: []
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing a high-craft experience for the listed failures.
conditions_does_not_apply_when: A finding already covered by a narrower instruction.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/top-design/SKILL.md; sha256=38e84e4c254697514ec1c2f52c5faafa927baea87b05ae3fa8e31ef76cdf1679; locator=skills/top-design/SKILL.md#L236-L257"
status: active
revision: 1
---

# Avoid the 15 craft mistakes

Avoid these 15 common mistakes; each fix points to the pillar that defines the rule rather than re-deriving values here: (1) Inter, Roboto, Arial, or system-ui as primary typeface fails because application fonts signal generic rather than premium — use a premium foundry or quality Google alternative (Pillar 1). (2) Uniform type scale with everything within 2x fails because there is no hierarchy or gasping moment — hit the display-to-body ratio (Pillar 1). (3) ease, ease-in, ease-out, or linear easing fails because it is mechanical and lifeless — banned; use a custom cubic-bezier (Pillar 3). (4) Animating everything simultaneously fails as visual noise with no hierarchy or narrative — stagger and sequence by importance (Pillar 3). (5) Center-aligning everything fails as safe but boring with no tension — use asymmetry, grid offsets, and bleeding elements (Pillar 2). (6) Equal spacing everywhere fails as monotony with nowhere for the eye to rest — vary density with dense sections then breathing room (Pillar 2). (7) Pure #000000/#ffffff fails as lifeless and harsh — use warm variants (Pillar 4). (8) Default browser scroll fails as mechanical and treats all content equally — use a smooth-scroll library (Pillar 5). (9) Purple-to-blue gradient hero fails as the generic AI-gradient trend — use a signature color approach specific to the project (Pillar 4). (10) No signature moment fails as competent but forgettable — design the screenshot-worthy moment first (Process step 2). (11) Any emoji in professional interfaces fails as casual/amateur craft — use custom iconography or typographic treatments. (12) Parallax on text or critical content fails through motion sickness and accessibility failures — restrict parallax to decorative background elements (Pillar 5). (13) Animations blocking interaction fails as hostile UX — keep all animation non-blocking (Pillar 3). (14) Unmodified Font Awesome icons fail as template-level design — use custom icons or heavily customize them to match the brand. (15) Default form styles fail by breaking the illusion of craft instantly — design every input, select, checkbox, and button (Pillar 7).
<!-- vpmodule:atom:end top-design-common-mistakes -->
<!-- vpmodule:atom:begin top-design-core -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: top-design-core
title: Create award-winning web experiences
summary: "Build websites and applications at the level of agencies that win FWA, Awwwards, CSS Design Awards and Webby Awards, with every pixel intentional."
capability_tags:
  - art-direct-web-experience
pattern_tags:
  - award-winning-craft
conditions_applies_when: Designing or reviewing an immersive brand or portfolio web experience.
conditions_does_not_apply_when: "A utility interface whose goal is task completion, not spectacle."
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The experience is judged against the award-level craft standard rather than a template baseline.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/top-design/SKILL.md; sha256=38e84e4c254697514ec1c2f52c5faafa927baea87b05ae3fa8e31ef76cdf1679; locator=skills/top-design/SKILL.md#L10-L13"
status: active
revision: 1
---

# Create award-winning web experiences

The skill's mission is to create websites and applications at the level of world-class digital agencies that consistently win FWA, Awwwards, CSS Design Awards, and Webby Awards; this craft standard frames every subsequent rule.
<!-- vpmodule:atom:end top-design-core -->
<!-- vpmodule:atom:begin top-design-formula -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: top-design-formula
title: Compute the weighted total
summary: Compute Total = Typography x 0.25 + Composition x 0.25 + Motion x 0.20 + Color x 0.15 + Details x 0.15 from the five category scores.
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Combining the five category scores into one total.
conditions_does_not_apply_when: A qualitative review with no numeric score.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The total is the stated weighted sum of the five category scores.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/top-design/SKILL.md; sha256=38e84e4c254697514ec1c2f52c5faafa927baea87b05ae3fa8e31ef76cdf1679; locator=skills/top-design/SKILL.md#L77-L81"
status: active
revision: 1
---

# Compute the weighted total

Compute the total score as Total = (Typography x 0.25) + (Composition x 0.25) + (Motion x 0.20) + (Color x 0.15) + (Details x 0.15), using the five 0-10 category scores.
<!-- vpmodule:atom:end top-design-formula -->
<!-- vpmodule:atom:begin top-design-implementation -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: top-design-implementation
title: Build progressively with project conventions
summary: "Conceptualize desktop-first but build mobile-first, and extend the project's existing design tokens and components instead of fighting them."
capability_tags:
  - art-direct-web-experience
pattern_tags:
  - responsive-build-order
conditions_applies_when: Moving a high-craft design into implementation.
conditions_does_not_apply_when: A design-only deliverable with no build.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The build order is mobile-first and the existing design system is extended rather than replaced.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/top-design/SKILL.md; sha256=38e84e4c254697514ec1c2f52c5faafa927baea87b05ae3fa8e31ef76cdf1679; locator=skills/top-design/SKILL.md#L231-L235"
status: active
revision: 1
---

# Build progressively with project conventions

Implementation follows two notes: conceptualize desktop-first but build mobile-first — dream big, then implement progressively; and use project conventions — when Tailwind 4+ and/or shadcn/ui are available, extend their design tokens and components as the foundation for 10/10 craft rather than fighting them.
<!-- vpmodule:atom:end top-design-implementation -->
<!-- vpmodule:atom:begin top-design-layout -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: top-design-layout
title: Compose with tension and negative space
summary: "Master the grid before breaking it: use asymmetry, bleeding elements, varied density and scale shifts for narrative pacing, while keeping navigation clear."
capability_tags:
  - art-direct-web-experience
pattern_tags:
  - compositional-tension
conditions_applies_when: Laying out sections of a high-craft web experience.
conditions_does_not_apply_when: A dense data table whose primary goal is scannability.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The layout uses asymmetry, negative space and deliberate grid breaks without losing navigation clarity."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/top-design/SKILL.md; sha256=38e84e4c254697514ec1c2f52c5faafa927baea87b05ae3fa8e31ef76cdf1679; locator=skills/top-design/SKILL.md#L102-L119"
status: active
revision: 1
---

# Compose with tension and negative space

Master the grid so it can be broken with intention — every violation must feel deliberate, not accidental; the rhythm of density and breathing room creates a reading experience that holds attention. White space is active design material that creates tension and controls pacing; amateurs fill every gap while 10/10 designers use emptiness to control the eye. Use asymmetric balance — offset elements from center and let images bleed beyond containers; create unexpected scale shifts (massive/intimate, dense/sparse) for narrative pacing; a strong underlying grid is what makes breaks meaningful, without it breaks are chaos. Ethical boundary: layout experimentation must never compromise navigation clarity — users must always know where they are and how to move forward.
<!-- vpmodule:atom:end top-design-layout -->