---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-top-design-skill-md-0b3a0a79-c02"
title: "wondelai-skills: skills/top-design/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/top-design/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/top-design/SKILL.md\"}"
atom_ids:
  - top-design-micro-interactions
  - top-design-motion
  - top-design-performance
  - top-design-principle
  - top-design-process
  - top-design-quick-diagnostic
  - top-design-score
  - top-design-scroll
atom_count: 8
atoms: "[{\"atom_id\":\"top-design-micro-interactions\",\"file_sha256\":\"1f390a106ec779713c1a8c841c57fcda965c4063d78fa83ed5edabcfa12cdfdd\",\"content_sha256\":\"786e9d9b04c5989305547034d7605f93f3a6e55ed6b64d118494962f6ca2ebd4\",\"file_bytes\":2308,\"body_bytes\":1154},{\"atom_id\":\"top-design-motion\",\"file_sha256\":\"44f22c57b5833a2f92601d4cc35e01b3b9ecc552812620c6689298dbe218401b\",\"content_sha256\":\"3b753af43ae4213a703de4660bb4af6b5f4ca65728e839b8c751d0d2630ec87b\",\"file_bytes\":2341,\"body_bytes\":1167},{\"atom_id\":\"top-design-performance\",\"file_sha256\":\"f7001b4af1518e79220824bbe806118b74f6e9d442786948b5e311b007398f42\",\"content_sha256\":\"3d4e34d32e4af7935ed207d17864bdea887aa1cdc5ff319e080668b2e6f8f6ae\",\"file_bytes\":2300,\"body_bytes\":1134},{\"atom_id\":\"top-design-principle\",\"file_sha256\":\"16cd7ad42f095c35ac2a1a478d9bdee78ac5d52d4e665afc5887de178583d05e\",\"content_sha256\":\"cd02f2c1246b9f62364f10fd30e37d4afce61b83e302f32714baa306d4e51f3a\",\"file_bytes\":1531,\"body_bytes\":391},{\"atom_id\":\"top-design-process\",\"file_sha256\":\"6379df2fa5f6eeb352ad519a924d8c4a65e350a03d50cabb0e9b7d6150f3d8d8\",\"content_sha256\":\"37ba66067c5240fa4b571fa5ea8d5d34a4c0d9f4109be484d090a51e0131772f\",\"file_bytes\":2062,\"body_bytes\":886},{\"atom_id\":\"top-design-quick-diagnostic\",\"file_sha256\":\"e602488c341231c7ce32890cde1460590d34b3c3f3d4a6b3a6a547abcfdf9012\",\"content_sha256\":\"eff0818aef8b0d48f623d765d3b4de977d800bf2efd63465787071d815eb8f6f\",\"file_bytes\":3108,\"body_bytes\":1998},{\"atom_id\":\"top-design-score\",\"file_sha256\":\"f50638b068c7efa6c920c31bd07dc592c9779c07f4d24d80c31fe6e47aacc6d3\",\"content_sha256\":\"acd13ab2371d02f3e241f738f772d1742aed29985ef786d9cfcb80ccad1f6c3c\",\"file_bytes\":1355,\"body_bytes\":237},{\"atom_id\":\"top-design-scroll\",\"file_sha256\":\"5fe2584c9c70688ca92d458458c7c2ef8d3e7ecaef82140fd5c5fad3c2fde84b\",\"content_sha256\":\"39973ade179864f6ea0196f7cb59d579d7ec98674a9abc2c95b6fa1f5f239cfb\",\"file_bytes\":2089,\"body_bytes\":983}]"
carrier_sha256: 06031def81103795b8086c390ec708ba6072233d034eb70221bd8798118c0698
carrier_bytes: 17889
revision: 1
status: active
---
<!-- vpmodule:atom:begin top-design-micro-interactions -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: top-design-micro-interactions
title: Craft the micro-details
summary: "Design branded selection, considered hover and visible focus states, helpful loading, empty, 404 and error states, and correct micro-typography; custom cursors are opt-in only."
capability_tags:
  - art-direct-web-experience
pattern_tags:
  - craft-detail
conditions_applies_when: Finishing interactive details and edge states.
conditions_does_not_apply_when: A purely static poster with no interaction.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Selection, focus, hover and error states are designed, and no cursor is replaced without consent."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/top-design/SKILL.md; sha256=38e84e4c254697514ec1c2f52c5faafa927baea87b05ae3fa8e31ef76cdf1679; locator=skills/top-design/SKILL.md#L195-L214"
status: active
revision: 1
---

# Craft the micro-details

Craft lives in the details most designers skip: branded selection colors, magnetic buttons, designed focus states, considered loading states, crafted error pages, and correct micro-typography. Custom cursors are OPT-IN only: never replace the native cursor unless the user explicitly requests or confirms one, because misapplied custom cursors hurt usability and feel gimmicky; always ask first. When approved, a custom cursor should reflect brand personality, with variants on interactive elements. Use a branded ::selection color that works on all backgrounds. Every link and card needs a considered hover state such as scale, overlay, or meaningful transform. Focus states must be visible and beautiful: on-brand indicators that keyboard users can clearly see. Loading, empty, 404, and error states must be designed, helpful moments. Micro-typography must be correct: smart quotes, en/em dashes, no orphans on headlines, and text-wrap: balance on key text. Focus states must meet keyboard-visibility requirements even when styled on-brand, and error/empty/404 states must be genuinely helpful rather than merely decorative.
<!-- vpmodule:atom:end top-design-micro-interactions -->
<!-- vpmodule:atom:begin top-design-motion -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: top-design-motion
title: Choreograph motion with custom easing
summary: "Give every animation a reason; ban `ease`, `ease-in`, `ease-out` and `linear`; use named cubic-bezier curves, a staggered 0-1200ms load sequence, relationship-based reveals and 60fps, and respect reduced motion."
capability_tags:
  - art-direct-web-experience
pattern_tags:
  - choreographed-motion
conditions_applies_when: "Designing transitions, reveals or page-load animation."
conditions_does_not_apply_when: A static page with no motion.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Every animation has a purpose, a custom curve and a reduced-motion fallback."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/top-design/SKILL.md; sha256=38e84e4c254697514ec1c2f52c5faafa927baea87b05ae3fa8e31ef76cdf1679; locator=skills/top-design/SKILL.md#L120-L137"
status: active
revision: 1
---

# Choreograph motion with custom easing

Every animation must answer 'Why does this move?' under three laws: purpose over decoration, custom curves never linear, and orchestration over isolation. Custom easing is mandatory: ease, ease-in, ease-out, and linear are banned; use cubic-bezier(0.16, 1, 0.3, 1) (expo out), cubic-bezier(0.25, 1, 0.5, 1) (quart out), or cubic-bezier(0.87, 0, 0.13, 1) (expo in-out). Page load follows strict choreography: structure 0-200ms, hero title words staggered 200-600ms, subtitle 400-800ms, navigation cascade 600-900ms, and supporting elements 800-1200ms. Animate elements in relationship rather than isolation. 60fps is non-negotiable: if an animation drops frames, simplify or remove it. Apply choreographed staggered page-load reveals, clip-path/mask image reveals on scroll-enter, hover weight-shifts and magnetic buttons, and text lines sliding up individually with stagger; never fade text in as a block, and pages should morph rather than cut. Motion must never block interaction or cause motion sickness: respect prefers-reduced-motion, keep all content accessible without animation, and justify anything longer than 1.2s.
<!-- vpmodule:atom:end top-design-motion -->
<!-- vpmodule:atom:begin top-design-performance -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: top-design-performance
title: Treat performance as design
summary: "Subset and preload fonts, serve WebP or AVIF with responsive sources, animate only transform and opacity, keep CLS near zero, LCP under 2.5s, design loading states and never strip accessibility for speed."
capability_tags:
  - art-direct-web-experience
pattern_tags:
  - performance-as-design
conditions_applies_when: Setting the performance budget for a high-craft experience.
conditions_does_not_apply_when: A backend-only service with no rendered surface.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The budget states LCP, CLS and animation-property limits."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/top-design/SKILL.md; sha256=38e84e4c254697514ec1c2f52c5faafa927baea87b05ae3fa8e31ef76cdf1679; locator=skills/top-design/SKILL.md#L175-L194"
status: active
revision: 1
---

# Treat performance as design

Performance is a design constraint from day one, not an optimization step: a beautiful animation that drops frames or a stunning font that causes layout shift fails the craft test. Subset and preload fonts, using only needed glyphs, font-display: swap or optional, and preload critical files. Optimize images with WebP/AVIF and fallbacks, responsive srcset, and lazy-loading below the fold. GPU-accelerate animations by animating only transform and opacity; never animate width, height, top, left, or margin. Keep CLS near zero by reserving space for images, fonts, and dynamic content, using aspect-ratio on containers. Keep LCP under 2.5s by optimizing the critical rendering path for the hero. Treat loading states as designed elements with custom skeletons and progress indicators, not afterthoughts. Apply preload font links, AVIF/WebP picture fallbacks, GPU-only transform: translate3d() plus opacity animation, audit with Lighthouse targeting 90+, and code-split/defer non-critical JS. Fast-but-inaccessible is not a valid tradeoff: never strip accessibility features or semantic HTML for speed.
<!-- vpmodule:atom:end top-design-performance -->
<!-- vpmodule:atom:begin top-design-principle -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: top-design-principle
title: Make every pixel intentional
summary: "Treat typography as the design, motion as emotion, white space as a weapon and 60fps performance as non-negotiable; the gap between 8/10 and 10/10 is intention."
capability_tags:
  - art-direct-web-experience
pattern_tags:
  - award-winning-craft
conditions_applies_when: Setting the standard for a high-craft web experience.
conditions_does_not_apply_when: A conventional product UI with no brand-experience ambition.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each major decision answers whether it serves the experience or fills space.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/top-design/SKILL.md; sha256=38e84e4c254697514ec1c2f52c5faafa927baea87b05ae3fa8e31ef76cdf1679; locator=skills/top-design/SKILL.md#L14-L19"
status: active
revision: 1
---

# Make every pixel intentional

Every pixel must be intentional, with nothing default and nothing accidental. Typography is the design, motion creates emotion, white space is a weapon, and performance is non-negotiable at 60fps or nothing. The gap between 8/10 and 10/10 is intention rather than skill: every decision must answer whether it serves the experience or is merely filling space.
<!-- vpmodule:atom:end top-design-principle -->
<!-- vpmodule:atom:begin top-design-process -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: top-design-process
title: Follow the concept-first process
summary: "Work in order: define brand essence, visual tension, signature moment and technical ambition; design the signature moment and display type before layout; prototype motion alongside visuals; ship with restraint."
capability_tags:
  - art-direct-web-experience
pattern_tags:
  - signature-first-order
conditions_applies_when: Starting a new high-craft web project.
conditions_does_not_apply_when: A small maintenance edit to an existing experience.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The four concept answers and the signature moment exist before layout and build.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/top-design/SKILL.md; sha256=38e84e4c254697514ec1c2f52c5faafa927baea87b05ae3fa8e31ef76cdf1679; locator=skills/top-design/SKILL.md#L215-L230"
status: active
revision: 1
---

# Follow the concept-first process

Work in this order because the sequence is the discipline: (1) Concept before code — define BRAND ESSENCE (the single word capturing the soul), VISUAL TENSION (the opposing forces that create interest), SIGNATURE MOMENT (what people will screenshot and share), and TECHNICAL AMBITION (what pushes the browser's limits). (2) Design the signature moment first, not the header; every 10/10 project needs at least one moment people stop and share, pinned down by asking what they will screenshot, describe to a colleague, try to reverse-engineer, and what makes it unmistakably this project. (3) Choose the display typeface next because it dictates the rest (Pillar 1). (4) Prototype motion alongside visual design, not after, because motion is not polish (Pillar 3). (5) Ship with restraint: 3 things perfect beats 10 things mediocre; cut ruthlessly.
<!-- vpmodule:atom:end top-design-process -->
<!-- vpmodule:atom:begin top-design-quick-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: top-design-quick-diagnostic
title: Run the 12-row design diagnostic
summary: "Score one point per yes across 12 craft checks, map 11-12 to 9-10, 8-10 to 7-8, 5-7 to 5-6 and below 5 to 0-4, and state the resulting score."
capability_tags: []
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick scored diagnostic of a digital experience.
conditions_does_not_apply_when: A full category-by-category score.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers all 12 rows and states the mapped score.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/top-design/SKILL.md; sha256=38e84e4c254697514ec1c2f52c5faafa927baea87b05ae3fa8e31ef76cdf1679; locator=skills/top-design/SKILL.md#L258-L276"
status: active
revision: 1
---

# Run the 12-row design diagnostic

Quick Diagnostic: score 1 point per row answered yes, then map the count to the Scoring Rubric band — 11-12 -> 9-10, 8-10 -> 7-8, 5-7 -> 5-6, below 5 -> 0-4 — and state that score. The 12 rows are: (1) Does the hero typography make someone pause mid-scroll? If No, display type is not commanding — fix with Pillar 1 scale, distinctive typeface, viewport-filling type. (2) Would someone screenshot any section? If No, there is no signature moment — fix with Process step 2 by making one section extraordinary. (3) Does the design still read when you blur your eyes? If No, hierarchy is too flat — use bigger headlines, more white space, stronger accents. (4) Are all easing curves custom (no ease/linear)? If No, motion feels default — fix with Pillar 3 custom cubic-bezier. (5) Is there asymmetric tension in the composition? If No, the layout feels safe — fix with Pillar 2 offset, bleed, vary density. (6) Do the colors feel invented for THIS project? If No, the palette is generic — fix with Pillar 4 monochromatic tension, signature, or contextual color. (7) Is the page load choreographed? If No, elements pop in at once — fix with Pillar 3 staggered reveal sequence. (8) Does scroll feel custom and weighted? If No, it is default browser scroll — fix with Pillar 5 smooth-scroll library. (9) Are micro-details considered (selection, focus, cursor)? If No, default browser behaviors remain — fix with Pillar 7 branded selection, designed focus, and cursors opt-in only. (10) Is CLS near zero and LCP under 2.5s? If No, performance undermines quality — fix with Pillar 6 subset fonts, WebP/AVIF, transform/opacity only. (11) Does every animation answer 'why does this move?' If No, motion is decorative — fix with Pillar 3 by cutting motion with no narrative or guidance. (12) Are focus states both beautiful AND accessible? If No, one was sacrificed for the other — fix with Pillar 7 on-brand indicators meeting WCAG visibility.
<!-- vpmodule:atom:end top-design-quick-diagnostic -->
<!-- vpmodule:atom:begin top-design-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: top-design-score
title: Score the experience out of 10
summary: "Rate any digital experience 0-10 against the rubric with a 10/10 goal, and always state the current score and the specific improvements needed to reach 10/10."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a digital experience.
conditions_does_not_apply_when: A code review that does not assess the experience.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - score-improvements
artifact_contract_verified_by: The report states the score and the specific improvements needed to reach 10/10.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/top-design/SKILL.md; sha256=38e84e4c254697514ec1c2f52c5faafa927baea87b05ae3fa8e31ef76cdf1679; locator=skills/top-design/SKILL.md#L20-L23"
status: active
revision: 1
---

# Score the experience out of 10

Rate any digital experience 0-10 against the rubric with the goal of 10/10, where 10/10 means Awwwards-featured level; always state the current score and the specific improvements needed to reach 10/10.
<!-- vpmodule:atom:end top-design-score -->
<!-- vpmodule:atom:begin top-design-scroll -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: top-design-scroll
title: Design scroll as a narrative
summary: "Use weighted smooth scroll, sparing parallax only on decorative elements, pinned sections and progressive reveals; never hijack scroll or block access to content."
capability_tags:
  - art-direct-web-experience
pattern_tags:
  - scroll-narrative
conditions_applies_when: Designing scroll-driven pacing and reveals.
conditions_does_not_apply_when: A single-screen experience with no scroll.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Scroll remains user-paced and content stays reachable without animation.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/top-design/SKILL.md; sha256=38e84e4c254697514ec1c2f52c5faafa927baea87b05ae3fa8e31ef76cdf1679; locator=skills/top-design/SKILL.md#L155-L174"
status: active
revision: 1
---

# Design scroll as a narrative

Scroll is the web's primary interaction and must feel designed rather than default: treat scroll as a narrative device that controls pacing, creates reveals, builds tension, and delivers signature moments. Implement smooth scroll as the foundation with Lenis or Locomotive Scroll for the weighted, physical feel. Parallax must be purposeful: sparing and only on decorative elements, never on text or critical content. Pinned sections create storytelling beats by locking a section while content transforms within it. Horizontal scroll galleries need clear visual affordance. Reveals should be progressive, with elements entering as they become visible. Scroll velocity can modulate animation speed for a responsive feel. Use IntersectionObserver for lightweight class toggling and reserve GSAP ScrollTrigger for complex multi-step sequences. Scroll hijacking is hostile UX: users must always be able to scroll at their own pace and reach all content.
<!-- vpmodule:atom:end top-design-scroll -->