---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-perf-browser-render
title: Clear the critical rendering path
summary: "Defer scripts by default, use async only for independent scripts, preload critical resources, inline above-the-fold CSS, use font-display swap and lazy-load below-fold images in modern formats."
capability_tags:
  - optimize-web-performance
pattern_tags:
  - critical-render-path
conditions_applies_when: Improving first paint or first contentful paint.
conditions_does_not_apply_when: A page with no render-blocking resources.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Script, CSS, font and image loading choices are recorded with their render impact."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-perf-browser/SKILL.md; sha256=fed643149198165eadf1bb3bf8b6bfb173e18ba29c886e7f3d6a7681ad03a57d; locator=skills/high-perf-browser/SKILL.md#L77-L99"
status: active
revision: 1
---

# Clear the critical rendering path

Resource loading and critical rendering path: the browser must build DOM, CSSOM, and render tree before painting (HTML -> DOM -> CSSOM -> Render Tree -> Layout -> Paint -> Composite), and any resource blocking this pipeline delays first paint. CSS is render-blocking (no paint until CSSOM is ready) while <script> is parser-blocking (halts DOM construction until download and execution), so each needs a different strategy. Use async for independent scripts (downloads in parallel, executes immediately) and defer for most scripts (downloads in parallel, executes after DOM parsing), defer by default; use rel="preload" for critical resources at high priority now and rel="prefetch" for likely next-navigation resources at low priority; inline above-the-fold CSS and async-load the rest to eliminate the render-blocking CSS request; fonts can block text rendering for up to 3s so use font-display: swap; lazy-load below-fold images and use modern formats such as AVIF with srcset.
