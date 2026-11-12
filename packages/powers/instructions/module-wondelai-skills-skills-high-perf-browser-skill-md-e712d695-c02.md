---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-high-perf-browser-skill-md-e712d695-c02"
title: "wondelai-skills: skills/high-perf-browser/SKILL.md module"
summary: "Carrier for 4 atomic instructions from wondelai-skills:skills/high-perf-browser/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/high-perf-browser/SKILL.md\"}"
atom_ids:
  - high-perf-browser-realtime
  - high-perf-browser-render
  - high-perf-browser-score
  - high-perf-browser-vitals
atom_count: 4
atoms: "[{\"atom_id\":\"high-perf-browser-realtime\",\"file_sha256\":\"d266ec0898f9536668347200d474a1f5b9a0d4d3ce9d9e8d1e2d39581e92a1d4\",\"content_sha256\":\"a379f20544c1d1d6ea21c4cbd5c01f95db37880170a70531e0e37cb88256b155\",\"file_bytes\":2164,\"body_bytes\":976},{\"atom_id\":\"high-perf-browser-render\",\"file_sha256\":\"bf52d6babf183f4d7ae55edb4db5a26d8402b49601a66bc6414a3c5170eb4a36\",\"content_sha256\":\"7abd3c82998e85eeda2a43831036447d0cc1fe6fee33b29c4830583e3fedb47a\",\"file_bytes\":2198,\"body_bytes\":1018},{\"atom_id\":\"high-perf-browser-score\",\"file_sha256\":\"a8ae9b75c8aeaeb6e1a0de6541ea50cadc513110cc75841b579ec9531f312c75\",\"content_sha256\":\"c27e4a611c0a707e5f77dc08602f0ee17bdacba28688d7ebc547389cc08717d1\",\"file_bytes\":1671,\"body_bytes\":572},{\"atom_id\":\"high-perf-browser-vitals\",\"file_sha256\":\"0f5681fad34b2003e106572e372d53a720ecbafc4cc43601754d14ab755134c7\",\"content_sha256\":\"56b0110bb2dffbd2d7475af5cc5c4d321ccc0bb404e12f628a2f51d868c83579\",\"file_bytes\":2271,\"body_bytes\":1143}]"
carrier_sha256: 21ab810540b8926b49036928c5abf7b49433ca48f4f045682a07f8b018500837
carrier_bytes: 8729
revision: 1
status: active
---
<!-- vpmodule:atom:begin high-perf-browser-realtime -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-perf-browser-realtime
title: Choose the real-time transport
summary: "Use WebSocket for bidirectional flows, SSE for server-to-client push and polling only as a fallback; send heartbeats, reconnect with exponential backoff, queue offline messages and scale behind a pub/sub broker."
capability_tags:
  - optimize-web-performance
pattern_tags:
  - realtime-transport
conditions_applies_when: A live feature with continuous data flow.
conditions_does_not_apply_when: A request-response feature with no live updates.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The transport matches the data direction and resilience rules are recorded.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-perf-browser/SKILL.md; sha256=fed643149198165eadf1bb3bf8b6bfb173e18ba29c886e7f3d6a7681ad03a57d; locator=skills/high-perf-browser/SKILL.md#L147-L170"
status: active
revision: 1
---

# Choose the real-time transport

Real-time communication: when data must flow continuously, the transport choice among WebSocket, SSE, and long polling determines latency, resource usage, and scalability; match the transport to data-flow direction and frequency rather than defaulting to the most powerful option. WebSocket is bidirectional full-duplex with ~2-byte framing (use for chat, gaming, collaborative editing) but each WebSocket is a separate TCP connection that bypasses HTTP/2 multiplexing; SSE offers simpler server-to-client push over plain HTTP with auto-reconnect (use for live feeds and notifications); long polling is a fallback only due to high overhead from repeated HTTP requests. Send heartbeat/ping frames because mobile networks silently drop idle connections; reconnect with exponential backoff (e.g., 1s, 2s, 4s, 8s capped at 30s) and queue messages while disconnected; scale WebSocket fan-out behind a pub/sub broker such as Redis Pub/Sub or NATS.
<!-- vpmodule:atom:end high-perf-browser-realtime -->
<!-- vpmodule:atom:begin high-perf-browser-render -->
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
<!-- vpmodule:atom:end high-perf-browser-render -->
<!-- vpmodule:atom:begin high-perf-browser-score -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-perf-browser-score
title: Score web performance
summary: "Score the eight diagnostic rows, report the score, failed rows and fixes, and use the 9-10, 5-6 and 3-or-less bands weighted by field metrics."
capability_tags: []
pattern_tags:
  - scoring-rubric
conditions_applies_when: Assessing a web page or frontend application.
conditions_does_not_apply_when: A code review that does not assess performance.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - quality-score
  - failed-rows
artifact_contract_verified_by: "The report states the score, failed rows and per-row fixes."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-perf-browser/SKILL.md; sha256=fed643149198165eadf1bb3bf8b6bfb173e18ba29c886e7f3d6a7681ad03a57d; locator=skills/high-perf-browser/SKILL.md#L20-L23"
status: active
revision: 1
---

# Score web performance

Score optimization work out of 10 based on how many of the eight Quick Diagnostic rows pass, weighted toward the field metrics: 9-10 requires all eight rows to pass (the four field-metric rows in the green plus content-hashed and cached static assets, HTTP/2+, minimized render-blocking resources, and compression); 5-6 means the four field-metric rows pass but one or more transport/caching/compression rows fail; <=3 means any field-metric row is in the red. Always report the score, which diagnostic rows failed, and the specific fix for each.
<!-- vpmodule:atom:end high-perf-browser-score -->
<!-- vpmodule:atom:begin high-perf-browser-vitals -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-perf-browser-vitals
title: Optimize Core Web Vitals
summary: "Optimize LCP, INP and CLS as user-facing milestones; fix TTFB and FCP first, use RUM in production and fail CI when a vital regresses past its threshold."
capability_tags:
  - optimize-web-performance
pattern_tags:
  - core-web-vitals
conditions_applies_when: A metric in the red or a performance-budget gate.
conditions_does_not_apply_when: A page with no field metrics or user interaction.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "LCP, INP, CLS, TTFB and FCP each have a measured value and a fix or gate."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-perf-browser/SKILL.md; sha256=fed643149198165eadf1bb3bf8b6bfb173e18ba29c886e7f3d6a7681ad03a57d; locator=skills/high-perf-browser/SKILL.md#L123-L146"
status: active
revision: 1
---

# Optimize Core Web Vitals

Core Web Vitals optimization: Core Web Vitals (LCP, INP, CLS) are Google's user-centric metrics covering loading, interactivity, and visual stability; they impact search ranking and reflect real user experience. A fast TTFB means nothing if the hero image still loads late (LCP) or main-thread JavaScript blocks interactions (INP), so optimize perceived milestones rather than the byte-delivery clock. For LCP, optimize the largest visible element (hero image, heading block, video poster) and preload it with fetchpriority="high"; for INP, keep the main thread free and break long tasks (scheduler.yield() or setTimeout chunking) so every interaction stays responsive; for CLS, reserve space for dynamic content before it loads via explicit image dimensions or CSS aspect-ratio; TTFB and FCP (<1.8s) are upstream gates that bound every downstream milestone so fix them first; measure with Real User Monitoring in production because lab/synthetic tests miss real-device and network variance; enforce budgets by failing CI (e.g., Lighthouse CI assertions) when a vital regresses past its Quick Diagnostic threshold.
<!-- vpmodule:atom:end high-perf-browser-vitals -->