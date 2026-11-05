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
