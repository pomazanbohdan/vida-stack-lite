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
