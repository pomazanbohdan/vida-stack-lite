---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-references-performance-checklist-md-6952a05f-c01"
title: "addy-skills: references/performance-checklist.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:references/performance-checklist.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"references/performance-checklist.md\"}"
atom_ids:
  - budget-the-initial-payload
  - cache-the-misses-and-protect-the-hot-key
  - capture-the-query-plan-before-the-fix
  - design-the-cache-deliberately
  - design-the-index-for-the-query-shape
  - keep-the-main-thread-free
  - keep-the-request-path-light
  - load-images-without-paying-for-them
atom_count: 8
atoms: "[{\"atom_id\":\"budget-the-initial-payload\",\"file_sha256\":\"2cc42afff56049acc054a95ce42e5d3f8ea3a23bc5cb51ad15a2e93015abd42a\",\"content_sha256\":\"215ab109f54b21eabcdc988e9454bcff1c1e10288c03bb7d3c0464cb7b59a638\",\"file_bytes\":1912,\"body_bytes\":824},{\"atom_id\":\"cache-the-misses-and-protect-the-hot-key\",\"file_sha256\":\"bab9d25417c589d7d522f814ee96bf0d6b9c6ccdcb3a51bd082facc91405bf65\",\"content_sha256\":\"85fd4073117dfaed32e665973cef0c84a38bed56a66da7b1b6498276ae774a81\",\"file_bytes\":2042,\"body_bytes\":885},{\"atom_id\":\"capture-the-query-plan-before-the-fix\",\"file_sha256\":\"2ca376facd41cd47356c4da62361487d8967c02fb6ef4343eaf4193d51dc84ee\",\"content_sha256\":\"700a5e29e907d749096ed45e5a63890cd9208f2fe1398d435d126378c697c42f\",\"file_bytes\":1765,\"body_bytes\":608},{\"atom_id\":\"design-the-cache-deliberately\",\"file_sha256\":\"ce843986fc60c52266b7592c38bd0389051ffbb6989420d07147522f352f30f4\",\"content_sha256\":\"18fde2496f41874a19a3be9dd54273c2ccad487c018e5d2ef7055c3c09fe0629\",\"file_bytes\":2989,\"body_bytes\":1814},{\"atom_id\":\"design-the-index-for-the-query-shape\",\"file_sha256\":\"fee6bc16b5609ea5f04182fe5b342a418388ce9293d99e5af65281b7c5365ed1\",\"content_sha256\":\"c4b7946b2d22d4e41d45e7911b0e38a1be51ae6f7c493d85eb34c077d90dadcb\",\"file_bytes\":1989,\"body_bytes\":899},{\"atom_id\":\"keep-the-main-thread-free\",\"file_sha256\":\"ec0a5eca2ffcd69d5a1f2488c23747baf9e9241f92cc905b6ee9e103b5f48c4f\",\"content_sha256\":\"db29f2792ab6effb46cff0cfdeccb9bd6b253df634ee3e7cd7a9b394dbddde14\",\"file_bytes\":2361,\"body_bytes\":1248},{\"atom_id\":\"keep-the-request-path-light\",\"file_sha256\":\"679cab1162256be435704e185caf2b6ecbae4284c67c0b73c233381251f5248c\",\"content_sha256\":\"1e9e48f985ca31af064fe86b7ed1e95af1c4c855f88503a4e457e1edce312fb9\",\"file_bytes\":1290,\"body_bytes\":215},{\"atom_id\":\"load-images-without-paying-for-them\",\"file_sha256\":\"3e8fd7f849667b0f6db68c3d851af8b501f75b8525059ead908eb706aa86de3e\",\"content_sha256\":\"9a45d9c4a5c43cca2d9a7f64592817426aca0adac41b64dedf742ea0898030ee\",\"file_bytes\":1504,\"body_bytes\":445}]"
carrier_sha256: 18cbb9d937852075512246e73a61cf150c468b9f25f2657140d6896fd55fbb49
carrier_bytes: 16825
revision: 1
status: active
---
<!-- vpmodule:atom:begin budget-the-initial-payload -->
---
instruction_id: budget-the-initial-payload
title: Budget the initial payload
summary: "The initial download stays inside a written budget, the heavy parts are split out, and nothing blocks the first render."
capability_tags:
  - improve-performance
pattern_tags:
  - delivery-budget
conditions_applies_when: A client application is shipped or its dependencies change.
conditions_does_not_apply_when: The work ships no client application.
artifact_contract_output_type: payload-budget-review
artifact_contract_required_data:
  - the initial bundle size
  - the split points
  - the blocking scripts
  - the third-party scripts
artifact_contract_verified_by: the measured initial bundle is inside the budget and no script blocks the first render
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/performance-checklist.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Budget the initial payload
Bundle size under 200KB gzipped (initial load)
Code splitting with dynamic `import()` for routes and heavy features
Tree shaking enabled (verify dependency ships ESM and marks `sideEffects: false`)
No blocking JavaScript in `<head>` (use `defer` or `async`)
Heavy computation offloaded to Web Workers (if applicable)
`React.memo()` on expensive components that re-render with same props
`useMemo()` / `useCallback()` only where profiling shows benefit
Third-party scripts loaded with `async` / `defer`, audited for size, and fronted by a facade when heavy (chat widgets, embeds)
Critical CSS inlined or preloaded
No render-blocking CSS for non-critical styles
No CSS-in-JS runtime cost in production (use extraction)
Large bundles | Slow Time to Interactive | Code split, tree shake, audit deps
<!-- vpmodule:atom:end budget-the-initial-payload -->
<!-- vpmodule:atom:begin cache-the-misses-and-protect-the-hot-key -->
---
instruction_id: cache-the-misses-and-protect-the-hot-key
title: Cache the misses and protect the hot key
summary: "A repeated miss is cached for a shorter time than a hit, an origin error is never cached, and a hot key is protected from a stampede."
capability_tags:
  - improve-performance
pattern_tags:
  - cache-design
conditions_applies_when: "A cache serves a key that is looked up often and misses often, or that expires under load."
conditions_does_not_apply_when: The cache never misses and never expires under load.
artifact_contract_output_type: miss-and-stampede-plan
artifact_contract_required_data:
  - the negative TTL
  - the stampede protection
  - what happens to an origin error
artifact_contract_verified_by: a miss is served from the cache and an origin error never becomes a cached entry
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/performance-checklist.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Cache the misses and protect the hot key
Cache the *absence* of a result too. A key that misses on every lookup (a nonexistent user ID probed in a loop, a 404 asset) sends every request to the origin, which is a cache that only protects the happy path.
Store an explicit "not found" sentinel with a **shorter** TTL than positive entries
Keep the negative TTL short enough that a newly created record appears promptly
Never let an origin *error* become a negative cache entry, or one failing minute becomes many
One recompute, N waiters. Prevents a hot key's expiry from delivering the full concurrent load to the origin
For a shared cache, the same idea needs a distributed lock, or `stale-while-revalidate` so waiters serve the stale value instead of blocking.
Cache stampede on a hot key | Origin takes full concurrent load at expiry | Coalesce misses, or `stale-while-revalidate`
<!-- vpmodule:atom:end cache-the-misses-and-protect-the-hot-key -->
<!-- vpmodule:atom:begin capture-the-query-plan-before-the-fix -->
---
instruction_id: capture-the-query-plan-before-the-fix
title: Capture the query plan before the fix
summary: "The query plan is captured before the change as the baseline and re-checked afterwards, and an index that did not change the plan is reverted."
capability_tags:
  - improve-performance
pattern_tags:
  - query-plan-discipline
conditions_applies_when: A slow query is about to be fixed with an index or a query change.
conditions_does_not_apply_when: No query is being changed.
artifact_contract_output_type: query-plan-before-and-after
artifact_contract_required_data:
  - the plan before the change
  - the plan after the change
  - the difference between them
artifact_contract_verified_by: "the plan after the change differs from the plan before it, and an unchanged plan means the change is reverted"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/performance-checklist.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Capture the query plan before the fix
`EXPLAIN ANALYZE` captured **before** the fix, not just after — it is the baseline
`Seq Scan` on a large table understood: index missing, unusable, or genuinely not worth it
Estimated vs actual `rows=` within an order of magnitude (if not, refresh statistics before touching indexes)
No `Sort` node that a composite index could absorb
Plan re-checked after the change — an index that did not change the plan gets reverted
Indexing without reading the plan | Write cost paid, read gain unproven | `EXPLAIN ANALYZE` before and after; revert if the plan is unchanged
<!-- vpmodule:atom:end capture-the-query-plan-before-the-fix -->
<!-- vpmodule:atom:begin design-the-cache-deliberately -->
---
instruction_id: design-the-cache-deliberately
title: Design the cache deliberately
summary: "A cache is only added for a call measured as expensive, keyed on every input the response varies on, invalidated by one written strategy and bounded in size and staleness."
capability_tags:
  - improve-performance
pattern_tags:
  - cache-design
conditions_applies_when: A cache is added or changed.
conditions_does_not_apply_when: The work adds no cache.
artifact_contract_output_type: cache-design-note
artifact_contract_required_data:
  - the call that was measured as expensive
  - the cache key
  - the invalidation strategy
  - the staleness window
  - the eviction policy and the memory ceiling
  - what must never be cached
artifact_contract_verified_by: every item of the cache note is filled in and the hit rate is monitored
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/performance-checklist.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Design the cache deliberately
| **Cache-aside** (lazy) | App checks cache, on miss reads origin and populates | Default choice; read-heavy, tolerant of a cold first hit | Every miss hits the origin, so it needs stampede protection |
| **Read-through** | Cache layer itself loads on miss | You want the load path in one place, not at every call site | Hides origin latency; a slow origin looks like a slow cache |
| **Write-through** | Write goes to cache and origin together, synchronously | Reads must never see a stale value after a write | Adds cache latency to every write |
| **Write-behind** (write-back) | Write hits cache, origin updated asynchronously | Write-heavy, and the origin is the bottleneck | Data loss window if the cache dies before the flush. Needs durability you can defend |
The cached call was measured as expensive first (caching a fast call adds a hop and buys nothing)
Read/write ratio justifies the cache (re-read far more often than written)
Cache key includes every input the response varies on: tenant, viewer, locale, permissions, feature flags
No per-user data cached under a key that does not identify the user
One invalidation strategy chosen (TTL, event/tag, or versioned keys), not an accidental mix
Acceptable staleness window written down, not implied by whatever TTL was typed
Eviction policy and memory ceiling set (an unbounded cache is a memory leak)
Hit rate monitored — a cache nobody measures is an assumption, and a low hit rate is pure overhead
Nothing cached whose staleness is a correctness bug (balances, permissions, inventory at checkout)
Cache key missing the viewer | One user's data served to another | Key on tenant, viewer, locale, permissions
Unbounded cache | Memory leak wearing an optimization's clothing | Set eviction policy and a memory ceiling
<!-- vpmodule:atom:end design-the-cache-deliberately -->
<!-- vpmodule:atom:begin design-the-index-for-the-query-shape -->
---
instruction_id: design-the-index-for-the-query-shape
title: Design the index for the query shape
summary: "An index is built for the filter and the sort of one query, its write cost is measured, and the indexes nothing reads are dropped."
capability_tags:
  - improve-performance
pattern_tags:
  - query-plan-discipline
conditions_applies_when: An index is added to a table.
conditions_does_not_apply_when: No index is added or changed.
artifact_contract_output_type: index-design-note
artifact_contract_required_data:
  - the query the index serves
  - the column order
  - the write cost measured
  - the indexes dropped
artifact_contract_verified_by: the index serves the filter and the sort of the named query and the write cost was measured
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/performance-checklist.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Design the index for the query shape
Composite index column order is equality first, then range/sort
Index covers the query shape (filter + sort), not just one column in isolation
Covering index considered for hot read paths (index-only scan avoids the heap fetch)
Not indexing low-selectivity columns *for the dominant value*; a partial index still serves the rare-value query (`WHERE status = 'failed'`)
Expression index used where the query applies a function (`lower(email)`)
Full-text or trigram index used for leading-wildcard search, not a B-tree
Write cost measured on write-heavy tables (every index taxes every `INSERT`/`UPDATE`)
Unused and duplicate indexes dropped (they cost writes and buy nothing)
Missing indexes | Slow reads as data grows | Add indexes for filtered/sorted columns
Redundant / unused indexes | Every write pays for them | Audit usage stats, drop what nothing reads
<!-- vpmodule:atom:end design-the-index-for-the-query-shape -->
<!-- vpmodule:atom:begin keep-the-main-thread-free -->
---
instruction_id: keep-the-main-thread-free
title: Keep the main thread free
summary: "Long tasks are broken up and yielded to the browser, non-urgent work waits for an idle moment, and rendering never forces a synchronous layout."
capability_tags:
  - improve-performance
pattern_tags:
  - delivery-budget
conditions_applies_when: An interaction feels slow or the main thread is busy in the browser.
conditions_does_not_apply_when: The work runs no user interface.
artifact_contract_output_type: main-thread-review
artifact_contract_required_data:
  - the long tasks found
  - where the work yields
  - the deferred work
  - the rendering changes
artifact_contract_verified_by: no task on the main thread runs longer than the stated limit without yielding
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/performance-checklist.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - design-ux
---

# Keep the main thread free
Long tasks (> 50ms) broken up to keep the main thread available — main lever for INP
`yieldToMain` pattern used inside long-running loops so input events can run between chunks
Modern scheduling APIs used where available: `scheduler.yield()` (preferred), `scheduler.postTask()` with priorities, `isInputPending()` to yield only when needed
`requestIdleCallback` for deferrable, non-urgent work (analytics flush, prefetch, warmup)
Non-critical work deferred out of event handlers (e.g. analytics, logging) so the response to the interaction is not delayed
No layout thrashing (forced synchronous layouts)
Animations use `transform` and `opacity` (GPU-accelerated)
Long lists use virtualization (e.g., `react-window`)
No unnecessary full-page re-renders
Off-screen sections use `content-visibility: auto` with `contain-intrinsic-size` to skip layout/paint of non-visible areas
No `unload` event handlers and no `Cache-Control: no-store` on HTML responses — preserves back/forward cache (bfcache) eligibility
Blocking main thread | Poor INP, unresponsive UI | Chunk long tasks with `scheduler.yield()` / `yieldToMain`, offload to Web Workers
Layout thrashing | Jank, dropped frames | Batch DOM reads, then batch writes
<!-- vpmodule:atom:end keep-the-main-thread-free -->
<!-- vpmodule:atom:begin keep-the-request-path-light -->
---
instruction_id: keep-the-request-path-light
title: Keep the request path light
summary: "The request handler does no heavy computation, bulk work is done in one operation, and the response is compressed and cached where it can be."
capability_tags:
  - improve-performance
pattern_tags:
  - delivery-budget
conditions_applies_when: A request handler or an API endpoint is written or changed.
conditions_does_not_apply_when: The work touches no request handler.
artifact_contract_output_type: request-path-review
artifact_contract_required_data:
  - the work done inside the handler
  - the bulk operation
  - the compression
  - the caching layer
artifact_contract_verified_by: no heavy computation runs inside the request handler
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/performance-checklist.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Keep the request path light
No synchronous heavy computation in request handlers
Bulk operations instead of loops of individual calls
Response compression (gzip/brotli)
Appropriate caching (in-memory, Redis, CDN)
<!-- vpmodule:atom:end keep-the-request-path-light -->
<!-- vpmodule:atom:begin load-images-without-paying-for-them -->
---
instruction_id: load-images-without-paying-for-them
title: Load images without paying for them
summary: "Images are served in a modern format, sized responsively, given their dimensions, and only loaded eagerly when they are the largest thing on the page."
capability_tags:
  - improve-performance
pattern_tags:
  - delivery-budget
conditions_applies_when: A page ships images.
conditions_does_not_apply_when: The work ships no images.
artifact_contract_output_type: image-loading-review
artifact_contract_required_data:
  - the format
  - the responsive sizes
  - the dimensions
  - the loading priority
artifact_contract_verified_by: "every image has a format, a size, explicit dimensions and a loading strategy"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=references/performance-checklist.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
---

# Load images without paying for them
Images use modern formats (WebP, AVIF)
Images are responsively sized (`srcset` and `sizes`)
Images and `<source>` elements have explicit `width` and `height` (prevents CLS in art direction)
Below-the-fold images use `loading="lazy"` and `decoding="async"`
Hero/LCP images use `fetchpriority="high"` and no lazy loading
Unoptimized images | Slow LCP, wasted bandwidth | Use WebP, responsive sizes, lazy load
<!-- vpmodule:atom:end load-images-without-paying-for-them -->