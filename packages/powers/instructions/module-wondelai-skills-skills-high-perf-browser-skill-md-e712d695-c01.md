---
schema: VPInstructionModule/v1
instruction_id: "module-wondelai-skills-skills-high-perf-browser-skill-md-e712d695-c01"
title: "wondelai-skills: skills/high-perf-browser/SKILL.md module"
summary: "Carrier for 8 atomic instructions from wondelai-skills:skills/high-perf-browser/SKILL.md."
source: "{\"donor\":\"wondelai-skills\",\"path\":\"skills/high-perf-browser/SKILL.md\"}"
atom_ids:
  - high-perf-browser-apply
  - high-perf-browser-cache
  - high-perf-browser-common-mistakes
  - high-perf-browser-core
  - high-perf-browser-framework
  - high-perf-browser-http
  - high-perf-browser-network
  - high-perf-browser-quick-diagnostic
atom_count: 8
atoms: "[{\"atom_id\":\"high-perf-browser-apply\",\"file_sha256\":\"b35967eb826c97d6df7a83de6841d298ca9c3f9624dab2d469388e92e9a48b33\",\"content_sha256\":\"e353d903416ac9ddd8709ed48c228ca29d16e29ddcc2e4d4f1161a6c736b6052\",\"file_bytes\":1507,\"body_bytes\":341},{\"atom_id\":\"high-perf-browser-cache\",\"file_sha256\":\"a055de93f668a4ac92781a8e826e8a72f8bc190181870a4e27a62f8969ef03bf\",\"content_sha256\":\"0f4a1524e0f028ab264a298a7f83f53a7702b8332eeb95830645a461a442e7f0\",\"file_bytes\":2228,\"body_bytes\":1071},{\"atom_id\":\"high-perf-browser-common-mistakes\",\"file_sha256\":\"cb830c7218690dcdb61500636fb691eab16ef4128ca65034743d7a832b09fc7f\",\"content_sha256\":\"bd78bb4bdeae772cec3b8630e3d2faa3b38141fecd53ce5f057079d9ad30b5a3\",\"file_bytes\":2107,\"body_bytes\":942},{\"atom_id\":\"high-perf-browser-core\",\"file_sha256\":\"c57794c3f6f5b2ac2c120eadc311a55a251ef8ad6a3bb4f9aa6ae05bc1f5db81\",\"content_sha256\":\"8e3f44a4a7c3cb13cc19c000e14ffc1d1dd646ebf1e3443a68346bda3bca21e2\",\"file_bytes\":1783,\"body_bytes\":664},{\"atom_id\":\"high-perf-browser-framework\",\"file_sha256\":\"0e4c53904a6433702baf12083b058f13b2f40ab20f0efe5af8f81a0fe8b52314\",\"content_sha256\":\"d68e8df3ef9edcb9f94ebf311963252eca247f8191b7a889b937f294d754c921\",\"file_bytes\":1408,\"body_bytes\":320},{\"atom_id\":\"high-perf-browser-http\",\"file_sha256\":\"95cfd42d430a086fe6d3821cc4f58834243df5371985fd3f4ba486d7467dec9e\",\"content_sha256\":\"dc511d667c8898d7ba9c521d7456de83d8d840557e4b3b2d5a57dd37e1c0f09e\",\"file_bytes\":2066,\"body_bytes\":933},{\"atom_id\":\"high-perf-browser-network\",\"file_sha256\":\"5e4f94d800c4032aa4da29c3c6e6461a67f573a00d082eb130259ef309ce2277\",\"content_sha256\":\"3a6e654e56ef20b8468c3e701cb08c74cb07865d4d6d02a8404faeac049b4b51\",\"file_bytes\":2141,\"body_bytes\":992},{\"atom_id\":\"high-perf-browser-quick-diagnostic\",\"file_sha256\":\"b469fb08b5e09e170b4eb3b1eddec64a996b84f0ea687e1f3504a975ea640dbc\",\"content_sha256\":\"b6c7dc1014765e3e19e564bee4debf5fc2dd783ee8f6357ef1c0ac115b59c727\",\"file_bytes\":2015,\"body_bytes\":837}]"
carrier_sha256: 3dd60864d1219c1a08afd6be0bbe4028df1afc9566801ec6966afdb8a14aaf4d
carrier_bytes: 16136
revision: 1
status: active
---
<!-- vpmodule:atom:begin high-perf-browser-apply -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-perf-browser-apply
title: Apply the browser performance framework
summary: "Use a systematic web-performance approach grounded in browsers, protocols and networks for frontend work, performance budgets, server configuration or slow-page diagnosis."
capability_tags:
  - optimize-web-performance
pattern_tags: []
conditions_applies_when: "Frontend performance work, budgets, server configuration or diagnosis."
conditions_does_not_apply_when: A performance question with no browser or network dimension.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The work names the browser/network scope and the performance goal.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-perf-browser/SKILL.md; sha256=fed643149198165eadf1bb3bf8b6bfb173e18ba29c886e7f3d6a7681ad03a57d; locator=skills/high-perf-browser/SKILL.md#L10-L13"
status: active
revision: 1
---

# Apply the browser performance framework

The High Performance Browser Networking Framework is a systematic approach to web performance grounded in how browsers, protocols, and networks actually work; apply its principles when building frontend applications, setting performance budgets, configuring servers, or diagnosing slow page loads.
<!-- vpmodule:atom:end high-perf-browser-apply -->
<!-- vpmodule:atom:begin high-perf-browser-cache -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-perf-browser-cache
title: Layer the caches
summary: "Use content-hashed immutable assets, no-cache plus ETag for HTML, short TTL with stale-while-revalidate for APIs and correct Vary headers at the CDN; never confuse no-cache with no-store."
capability_tags:
  - optimize-web-performance
pattern_tags:
  - cache-layering
conditions_applies_when: "Designing a browser, service-worker, CDN or origin cache policy."
conditions_does_not_apply_when: A response that must never be cached.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each asset class has a cache policy, validation method and Vary decision."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-perf-browser/SKILL.md; sha256=fed643149198165eadf1bb3bf8b6bfb173e18ba29c886e7f3d6a7681ad03a57d; locator=skills/high-perf-browser/SKILL.md#L100-L122"
status: active
revision: 1
---

# Layer the caches

Caching strategies: the fastest network request is one that never happens, so layer caches (browser memory, disk, service worker, CDN, origin) to eliminate round trips for repeat visitors. Cache-Control headers tell browsers and intermediaries how long a response stays valid and content-hashed URLs make aggressive immutable caching safe; each cache hit eliminates a full round trip. no-cache still caches but revalidates every time while no-store never caches; ETag/Last-Modified enable conditional requests returning 304 Not Modified that skip body transfer; service workers provide a programmable cache layer that works offline (cache-first shell, network-first dynamic content); misconfigured Vary headers cause CDN cache pollution serving the wrong encoding or format. Apply immutable caching with content-hashed filenames (e.g., style.a1b2c3.css with max-age=31536000, immutable), no-cache plus ETag for HTML documents, short max-age with stale-while-revalidate for API responses, and correct Vary headers (Accept-Encoding, Accept) at the CDN.
<!-- vpmodule:atom:end high-perf-browser-cache -->
<!-- vpmodule:atom:begin high-perf-browser-common-mistakes -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-perf-browser-common-mistakes
title: Avoid the listed performance mistakes
summary: "Avoid adding bandwidth, loading all JS upfront, omitting resource hints, missing Cache-Control, ignoring CLS, WebSocket for everything, domain sharding on HTTP/2 and no compression; apply each fix."
capability_tags: []
pattern_tags:
  - mistake-list
conditions_applies_when: Reviewing a performance plan for the listed failure patterns.
conditions_does_not_apply_when: A narrower instruction already covers the finding.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: Each observed mistake is named and paired with its stated fix.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-perf-browser/SKILL.md; sha256=fed643149198165eadf1bb3bf8b6bfb173e18ba29c886e7f3d6a7681ad03a57d; locator=skills/high-perf-browser/SKILL.md#L171-L183"
status: active
revision: 1
---

# Avoid the listed performance mistakes

Common mistakes to avoid: adding bandwidth to fix slow pages (latency, not throughput, is the bottleneck — reduce round trips via preconnect, cache, CDN); loading all JS upfront (parser-blocking scripts delay paint — code-split, defer, lazy-load non-critical modules); omitting resource hints (the browser discovers critical resources too late — use preconnect plus preload for above-fold criticals); missing Cache-Control or using no-store everywhere (every visit re-downloads everything — use proper max-age with content hashing); ignoring CLS (layout shifts destroy trust and ranking — set explicit dimensions on images, embeds, ads); using WebSocket for everything (match transport to data flow; SSE suffices for server push); domain sharding on HTTP/2 (defeats multiplexing — consolidate origins); and enabling no compression (enable Brotli preferred or Gzip fallback on server/CDN).
<!-- vpmodule:atom:end high-perf-browser-common-mistakes -->
<!-- vpmodule:atom:begin high-perf-browser-core -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-perf-browser-core
title: Treat latency as the bottleneck
summary: "Reduce round trips rather than adding bandwidth: every request pays DNS, TCP, TLS and HTTP latency, and a 5x latency cut beats a 5x bandwidth increase."
capability_tags:
  - optimize-web-performance
pattern_tags:
  - latency-budget
conditions_applies_when: Diagnosing or budgeting web performance.
conditions_does_not_apply_when: A bandwidth-only transfer problem with no request latency.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The plan reduces round trips and does not rely on bandwidth alone.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-perf-browser/SKILL.md; sha256=fed643149198165eadf1bb3bf8b6bfb173e18ba29c886e7f3d6a7681ad03a57d; locator=skills/high-perf-browser/SKILL.md#L14-L19"
status: active
revision: 1
---

# Treat latency as the bottleneck

Latency, not bandwidth, is the bottleneck: most web performance problems stem from too many round trips rather than insufficient throughput, so a 5x bandwidth increase yields diminishing returns while a 5x latency reduction transforms the user experience. Every request passes through DNS resolution, TCP handshake, TLS negotiation, and HTTP exchange before any content arrives, each step adding round-trip latency; high-performance applications must therefore minimize round trips, parallelize requests, and eliminate unnecessary network hops, and understanding the protocol stack is a prerequisite for meaningful optimization.
<!-- vpmodule:atom:end high-perf-browser-core -->
<!-- vpmodule:atom:begin high-perf-browser-framework -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-perf-browser-framework
title: Use the six performance domains
summary: "Organize the work across network fundamentals, HTTP evolution, resource loading and the critical path, caching, Core Web Vitals and real-time communication."
capability_tags:
  - optimize-web-performance
pattern_tags: []
conditions_applies_when: Planning a full performance review.
conditions_does_not_apply_when: A single isolated performance tweak.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: The review covers the six domains or states why one is out of scope.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-perf-browser/SKILL.md; sha256=fed643149198165eadf1bb3bf8b6bfb173e18ba29c886e7f3d6a7681ad03a57d; locator=skills/high-perf-browser/SKILL.md#L24-L27"
status: active
revision: 1
---

# Use the six performance domains

The framework organizes web-performance guidance into six domains for building fast, resilient web applications: Network Fundamentals, HTTP Protocol Evolution, Resource Loading and Critical Rendering Path, Caching Strategies, Core Web Vitals Optimization, and Real-Time Communication.
<!-- vpmodule:atom:end high-perf-browser-framework -->
<!-- vpmodule:atom:begin high-perf-browser-http -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-perf-browser-http
title: Choose and configure HTTP
summary: "Remove HTTP/1.1 workarounds once HTTP/2+ is enabled, prefer 103 Early Hints over Server Push, advertise HTTP/3 with Alt-Svc and signal stream priority for CSS and fonts."
capability_tags:
  - optimize-web-performance
pattern_tags:
  - protocol-version-choice
conditions_applies_when: Choosing or migrating an HTTP protocol version.
conditions_does_not_apply_when: A server that cannot change protocol version.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The protocol choice, workaround removal and hints are recorded."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-perf-browser/SKILL.md; sha256=fed643149198165eadf1bb3bf8b6bfb173e18ba29c886e7f3d6a7681ad03a57d; locator=skills/high-perf-browser/SKILL.md#L52-L76"
status: active
revision: 1
---

# Choose and configure HTTP

HTTP protocol evolution: HTTP/1.1 allows only one outstanding request per TCP connection (browsers open ~6 per host as a workaround) and forces workarounds like domain sharding, sprites, and concatenation; HTTP/2 multiplexes unlimited streams over one connection with HPACK header compression cutting repetitive header overhead by 85-95%, making those HTTP/1.1 workarounds counterproductive; HTTP/3 (QUIC over UDP) additionally eliminates TCP head-of-line blocking and enables 0-RTT resumption and connection migration. Prefer 103 Early Hints over HTTP/2 Server Push, which over-pushes and is widely deprecated; connection coalescing lets one HTTP/2 connection serve multiple hostnames sharing a certificate. When migrating to HTTP/2, remove domain sharding, sprites, and file concatenation; advertise HTTP/3 via an Alt-Svc header; and signal stream priority with CSS and fonts highest and images lower.
<!-- vpmodule:atom:end high-perf-browser-http -->
<!-- vpmodule:atom:begin high-perf-browser-network -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-perf-browser-network
title: Reduce network round trips
summary: "Keep critical resources under the ~14KB slow-start threshold, use TLS 1.3 with session resumption, preconnect critical origins, dns-prefetch third parties and rely on keep-alive."
capability_tags:
  - optimize-web-performance
pattern_tags:
  - latency-budget
conditions_applies_when: Tuning servers or diagnosing handshake latency.
conditions_does_not_apply_when: A local-only resource with no network request.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Critical resources, TLS, preconnect and keep-alive decisions are recorded."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-perf-browser/SKILL.md; sha256=fed643149198165eadf1bb3bf8b6bfb173e18ba29c886e7f3d6a7681ad03a57d; locator=skills/high-perf-browser/SKILL.md#L28-L51"
status: active
revision: 1
---

# Reduce network round trips

Network Fundamentals: every HTTP request pays a latency tax — DNS lookup, TCP three-way handshake, TLS negotiation — before application data flows, and reducing or eliminating these round trips is the single highest-leverage optimization. TCP's three-way handshake adds one full RTT before data transfer; TCP slow start limits initial throughput to ~14KB (10 segments) in the first round trip, so critical resources should be kept under this threshold; head-of-line blocking means one lost packet stalls all streams on the connection; the bandwidth-delay product caps in-flight data so high-latency links underutilize bandwidth. Upgrade to TLS 1.3 because it halves handshake round trips versus TLS 1.2 and enables 0-RTT resumption for returning visitors. Apply connection warmup via preconnect to critical origins, dns-prefetch for third-party domains (saves ~20-120ms), TLS 1.3 with session tickets, and keep-alive connection reuse (default in HTTP/1.1+).
<!-- vpmodule:atom:end high-perf-browser-network -->
<!-- vpmodule:atom:begin high-perf-browser-quick-diagnostic -->
---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: high-perf-browser-quick-diagnostic
title: Run the performance diagnostic
summary: "Check TTFB 800ms, LCP 2.5s, INP 200ms, CLS 0.1, content-hashed caching, HTTP/2+, render-blocking resources and compression; apply the listed action for each no."
capability_tags: []
pattern_tags:
  - diagnostic-questions
conditions_applies_when: A quick diagnostic review of a web page.
conditions_does_not_apply_when: A full audit or a scored assessment.
artifact_contract_output_type: markdown
artifact_contract_required_data:
  - diagnostic-findings
  - corrective-actions
artifact_contract_verified_by: The report answers each question and names the matching corrective action for every failed check.
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/high-perf-browser/SKILL.md; sha256=fed643149198165eadf1bb3bf8b6bfb173e18ba29c886e7f3d6a7681ad03a57d; locator=skills/high-perf-browser/SKILL.md#L184-L196"
status: active
revision: 1
---

# Run the performance diagnostic

Quick Diagnostic — eight pass/fail checks, each with a required action on failure: (1) TTFB under 800ms — else CDN, server caching, check backend; (2) LCP under 2.5s — else preload the LCP resource and set fetchpriority="high"; (3) INP under 200ms — else break long tasks and defer non-critical JS; (4) CLS under 0.1 — else explicit dimensions and reserved space; (5) static assets content-hashed and cached — else hashed filenames plus Cache-Control: immutable; (6) HTTP/2 or HTTP/3 enabled — else enable HTTP/2 on server and HTTP/3 via CDN; (7) render-blocking resources minimized — else inline critical CSS, defer scripts, prune unused CSS; (8) compression enabled (Brotli preferred, Gzip fallback) — else enable on server/CDN. These eight rows are the basis for the Scoring bands.
<!-- vpmodule:atom:end high-perf-browser-quick-diagnostic -->