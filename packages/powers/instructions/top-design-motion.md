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
