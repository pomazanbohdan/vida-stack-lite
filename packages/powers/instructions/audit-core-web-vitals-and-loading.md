---
instruction_id: audit-core-web-vitals-and-loading
title: Audit the Core Web Vitals and the loading path
summary: "Check the Core Web Vitals and the loading path of a web page: the LCP element, the layout shifts, the long tasks, the fonts, the scripts and the bundle."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: A web page or component is audited for loading performance.
conditions_does_not_apply_when: The deliverable is not a web page.
artifact_contract_output_type: core-web-vitals-audit
artifact_contract_required_data:
  - finding
  - area
  - location
  - recommendation
artifact_contract_verified_by: each finding names a location and a recommendation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=agents/web-performance-auditor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Audit the Core Web Vitals and the loading path
## Core Web Vitals
- Does the LCP element load within 2.5s? Is it a hero image, heading, or block of text?
- Is the LCP image (if applicable) using `fetchpriority="high"` and not lazy-loaded?
- Are layout shifts caused by images, embeds, ads, fonts, or dynamically injected content?
- Do images, `<source>` elements, iframes, and embeds have explicit `width` and `height` to reserve space?
- Are long tasks (> 50ms) blocking the main thread and delaying INP?
- Are event handlers doing synchronous heavy work before yielding to the browser?
- Is `scheduler.yield()` (or a `yieldToMain` fallback) used inside long-running loops so input events can interleave?
- Is the page using **soft navigation** APIs correctly so INP and LCP are tracked across SPA route changes?
- Is the **Long Animation Frames (LoAF)** API used (or planned) to attribute INP regressions in production?

## Loading
- Is TTFB acceptable (< 800ms)? Are there slow server responses or missing CDN coverage?
- Are critical origins `preconnect`-ed and known third-party origins `dns-prefetch`-ed?
- Are LCP-critical resources preloaded with `fetchpriority="high"`?
- Is the **Speculation Rules API** used to `prerender` or `prefetch` likely-next navigations?
- Are fonts self-hosted, preloaded, and using `font-display: swap` (or `optional` for non-critical)?
- Are fonts subsetted (`unicode-range`) and limited in count/weights?
- Are images in modern formats (WebP, AVIF) with responsive `srcset` and `sizes`?
- Is the initial JavaScript bundle under 200KB gzipped?
- Is code splitting applied for routes and heavy features?
- Are blocking scripts in `<head>` without `defer` or `async`?
- Are third-party scripts loaded with `async`/`defer` and fronted by a facade when heavy (chat widgets, video embeds)?
