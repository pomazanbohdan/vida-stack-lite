---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-agents-web-performance-auditor-md-57e15398-c01"
title: "addy-skills: agents/web-performance-auditor.md module"
summary: "Carrier for 5 atomic instructions from addy-skills:agents/web-performance-auditor.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"agents/web-performance-auditor.md\"}"
atom_ids:
  - audit-core-web-vitals-and-loading
  - audit-rendering-and-network
  - match-the-check-to-the-stack
  - never-present-an-unmeasured-metric
  - rate-performance-findings-by-impact
atom_count: 5
atoms: "[{\"atom_id\":\"audit-core-web-vitals-and-loading\",\"file_sha256\":\"d426c6efa58abc39162be5776c6747ced3811fc268d3dbe23a8b9cfb6768176d\",\"content_sha256\":\"81f968ff991a50ae5de83454e35f8a862bce818f2e69768373f9567edfe17f54\",\"file_bytes\":2891,\"body_bytes\":1825},{\"atom_id\":\"audit-rendering-and-network\",\"file_sha256\":\"fb6586311ea2a39315af0669380184fb937d3ecaab49ebd0a78635942095a663\",\"content_sha256\":\"12881b69ebe7d609d5577db304dde39cd2332ca6312310fe7d554b758cbc8fbc\",\"file_bytes\":3013,\"body_bytes\":1952},{\"atom_id\":\"match-the-check-to-the-stack\",\"file_sha256\":\"774e6edc9e5a42e551f4270e8d08b99d9300a3c5afa89a984ae9f3173c9396d3\",\"content_sha256\":\"6e2f609b72b2ab5ab1d4d907a5bf717004baac668db86cc9b3c850edbc960e9d\",\"file_bytes\":1493,\"body_bytes\":400},{\"atom_id\":\"never-present-an-unmeasured-metric\",\"file_sha256\":\"4917e27bdfc53864d05f86e62860f2012e2d1ca107f07673d92070b0a27a40f1\",\"content_sha256\":\"7eb44e381b5c155bb660a6aa017e90283f2a9d80f0958ca61608d836506a0c95\",\"file_bytes\":2895,\"body_bytes\":1530},{\"atom_id\":\"rate-performance-findings-by-impact\",\"file_sha256\":\"9ca66a731111cb1ac32a28297a90c451e56638c11c0f195a7fe88622f5e4ae8b\",\"content_sha256\":\"1a22c5f7652379c2040c8cff7d73a2cde7b03e3bc6890f5d65b30c4a28fffd54\",\"file_bytes\":1643,\"body_bytes\":614}]"
carrier_sha256: acb62f4751d20b7969ecbf2ea7ba0df3c5e4735b8d8373cbd690a8df2c7e6cc6
carrier_bytes: 12538
revision: 1
status: active
---
<!-- vpmodule:atom:begin audit-core-web-vitals-and-loading -->
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
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/web-performance-auditor.md
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
<!-- vpmodule:atom:end audit-core-web-vitals-and-loading -->
<!-- vpmodule:atom:begin audit-rendering-and-network -->
---
instruction_id: audit-rendering-and-network
title: Audit the rendering and the network path
summary: "Check the rendering and the network path of a web page: re-renders, long lists, layout thrashing, caching, compression and the request pattern."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: A web page or component is audited for rendering and network performance.
conditions_does_not_apply_when: The deliverable is not a web page.
artifact_contract_output_type: rendering-network-audit
artifact_contract_required_data:
  - finding
  - area
  - location
  - recommendation
artifact_contract_verified_by: each finding names a location and a recommendation
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/web-performance-auditor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Audit the rendering and the network path
## Rendering / JavaScript
- Are there unnecessary full-page re-renders? Is state lifted (or colocated) correctly?
- Are long lists virtualized?
- Are animations using `transform` and `opacity` (compositor-only)?
- Is there layout thrashing (reading layout properties, then writing, in a loop)?
- Is `content-visibility: auto` used for off-screen sections?
- Is the **View Transitions API** used appropriately to avoid perceived CLS on SPA navigations?
- Is **bfcache** preserved? (No `unload` handlers, no `Cache-Control: no-store` on HTML)
- **AI-generated patterns:**
  - State duplication instead of lifting state.
  - `React.memo` / `useMemo` / `useCallback` wrapping everything "just in case" (cost without benefit; can hurt perf).
  - Over-eager `useEffect` dependencies causing redundant re-renders or update loops.
  - **Vue:** watchers (`watch`/`watchEffect`) with broad dependencies that trigger unnecessary updates; `computed` with side effects.
  - **Angular:** `ChangeDetectionStrategy.Default` where `OnPush` would suffice; subscriptions without `takeUntil`/`async pipe` that accumulate listeners.
  - **Svelte:** `$:` blocks with expensive logic that re-runs more than needed.
  - **Vanilla:** `scroll`/`resize` listeners without `passive: true` or debounce; DOM manipulation inside a loop that forces repeated reflow.

## Network
- Are static assets cached with long `max-age` + content hashing?
- Is HTTP/2 or HTTP/3 enabled?
- Are there unnecessary redirects?
- Are API responses paginated? Any `SELECT *` or unbounded fetch patterns?
- Are bulk operations used instead of loops of individual API calls?
- Is response compression enabled (gzip/brotli)?
- **AI-generated patterns:**
  - Over-fetching data "just in case."
  - Sequential `await`s when `Promise.all` (or parallel `fetch`) would work.
  - Redundant API calls where one would suffice; missing deduplication on parallel requests.
<!-- vpmodule:atom:end audit-rendering-and-network -->
<!-- vpmodule:atom:begin match-the-check-to-the-stack -->
---
instruction_id: match-the-check-to-the-stack
title: Match the check to the stack
summary: "Identify the framework and the rendering model before applying framework-specific checks, and file every finding under the area it belongs to."
capability_tags:
  - review-code
pattern_tags:
  - code-review
conditions_applies_when: A check or a recommendation depends on the framework in use.
conditions_does_not_apply_when: The framework and the rendering model are already known and recorded.
artifact_contract_output_type: stack-matched-review
artifact_contract_required_data:
  - framework and rendering model
  - checks applied
  - area of each finding
artifact_contract_verified_by: no recommendation names an idiom from a stack the project does not use
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/web-performance-auditor.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Match the check to the stack
Identify the framework and rendering model (React, Vue, Svelte, Angular, Next.js, Astro, vanilla HTML, etc.) before applying framework-specific checks. Do not recommend `<Image>` from `next/image` to a Vue app, or `React.memo` to a Svelte app.

Fold AI-generated anti-patterns into their relevant area (Network or Rendering/JS); do not create a separate "AI" category.
<!-- vpmodule:atom:end match-the-check-to-the-stack -->
<!-- vpmodule:atom:begin never-present-an-unmeasured-metric -->
---
instruction_id: never-present-an-unmeasured-metric
title: Never present an unmeasured metric
summary: "Never print a performance number that no run produced: mark it not measured, label every value with its source, call static findings potential impact, and never emit a count that was not measured in this session."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "A performance report is written, with or without measurement data."
conditions_does_not_apply_when: The report holds only numbers that a run produced.
artifact_contract_output_type: performance-report
artifact_contract_required_data:
  - metric value or not measured
  - source of every value
  - impact label per finding
artifact_contract_verified_by: every number in the report is backed by a source and every unmeasured field says not measured
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/web-performance-auditor.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/references/planner-antipatterns.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - research
---

# Never present an unmeasured metric
**Never fabricate metrics.** An LLM reading static source code cannot measure real-world LCP, INP, or CLS. If no tool data is provided:

- Return a source-level findings report.
- Mark the entire scorecard as `not measured`.
- Label every finding as `potential impact`, not as a measurement.

When data IS provided, label each scorecard value with its source (`Field`, `Lab`, `Trace`). Field and lab data are not interchangeable: field is what real users experienced, lab is a single synthetic run. Treating them as the same number is a form of fabrication.

Violating this rule is worse than returning no scorecard at all.

Populate the scorecard only with values backed by these sources. Mark unmeasured fields as `not measured`.

If a source is unavailable, do not fabricate. Skip the related section of the scorecard and continue with what you have.

Lead with the scorecard. If not measured, say so explicitly before listing findings.

Do not recommend micro-optimizations without evidence they affect a Core Web Vital or another measurable metric.

## Quick mode (default — no tool artifacts provided)
Scan source code directly for structural anti-patterns.

## Deep mode (activated when tool artifacts or live measurement are available)
In Deep mode, always state which artifacts were provided and which fields remain unmeasured.

Never emit `grep '714 tests'` or `grep '52 test files'` unless you ran the count command in this session. Model-recalled counts are stale from training.
<!-- vpmodule:atom:end never-present-an-unmeasured-metric -->
<!-- vpmodule:atom:begin rate-performance-findings-by-impact -->
---
instruction_id: rate-performance-findings-by-impact
title: Rate a performance finding by its impact
summary: Rate a performance finding by what it does to a Core Web Vital or to the loading path.
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: A performance finding needs a severity and an action.
conditions_does_not_apply_when: The finding is already rated against a fixed severity scale.
artifact_contract_output_type: rated-performance-finding
artifact_contract_required_data:
  - severity
  - criteria met
  - action
artifact_contract_verified_by: the severity matches the stated criteria
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=agents/web-performance-auditor.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - design-ux
  - operations
---

# Rate a performance finding by its impact
| Severity | Criteria | Action |
|----------|----------|--------|
| **Critical** | Directly causes a Core Web Vital to fail the "Good" threshold | Fix before release |
| **Important** | Likely degrades a CWV or causes significant loading/interaction slowdown | Fix before release |
| **Important** | Suboptimal pattern with measurable but contained impact | Fix in current sprint |
| **Minor** | Best practice gap with minor or speculative impact | Schedule for next sprint |
| **Minor** | Improvement opportunity with no current evidence of impact | Consider adopting |
<!-- vpmodule:atom:end rate-performance-findings-by-impact -->