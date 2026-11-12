---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-performance-optimization-skill-md-d66b44bb-c02"
title: "addy-skills: skills/performance-optimization/SKILL.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:skills/performance-optimization/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/performance-optimization/SKILL.md\"}"
atom_ids:
  - justify-an-index-with-a-query-plan
  - key-the-cache-on-every-input-that-changes-the-response
  - profile-to-find-the-real-bottleneck
  - set-and-enforce-performance-budgets
  - size-the-connection-pool-under-the-ceiling
  - split-the-bundle-and-lazy-load-heavy-features
  - start-from-the-symptom-to-choose-the-measurement
  - state-one-invalidation-strategy-and-the-staleness-window
atom_count: 8
atoms: "[{\"atom_id\":\"justify-an-index-with-a-query-plan\",\"file_sha256\":\"b4e7707727c58062ab7862c07de94a73221397b996db5f5a68a42534ce6c5833\",\"content_sha256\":\"f6bddb4219d29629490b25fc8f78742389458ecbd3162d4c89fd500df7b1f280\",\"file_bytes\":2030,\"body_bytes\":805},{\"atom_id\":\"key-the-cache-on-every-input-that-changes-the-response\",\"file_sha256\":\"1a5e577a7c0c1bbb93094f114b909a562044fc3d1016873b06af466add00cde9\",\"content_sha256\":\"c53c40cf47ba5e6a353c31926915d8293ce6b1fa576a1f871413e4170ca847f8\",\"file_bytes\":1521,\"body_bytes\":236},{\"atom_id\":\"profile-to-find-the-real-bottleneck\",\"file_sha256\":\"447e10a1fde246784c0adebf4586f30eb4fa4a723f977714faf08b5e33bcae83\",\"content_sha256\":\"f52313fdea2ffa6aafb78f2e601768520cfef7ef62b874e7b54dc30c74aa102d\",\"file_bytes\":2759,\"body_bytes\":1666},{\"atom_id\":\"set-and-enforce-performance-budgets\",\"file_sha256\":\"d7390a7dd35d8905636be1a744075841f682703bb6a3d3abeba1d2160a20367d\",\"content_sha256\":\"b3fe9a560d84517dcbbac178ed26b949084581a8ee6f88e62f126a4268b5ea03\",\"file_bytes\":1345,\"body_bytes\":340},{\"atom_id\":\"size-the-connection-pool-under-the-ceiling\",\"file_sha256\":\"a048198a7594fe9b15180c8a421736ed1f514f496c9c721f1d1ef777b412fe31\",\"content_sha256\":\"bf81602822ce1a0ac26b02732c0da8afdd37eb730da3e7d8dc04b9f8a3181cde\",\"file_bytes\":1880,\"body_bytes\":546},{\"atom_id\":\"split-the-bundle-and-lazy-load-heavy-features\",\"file_sha256\":\"e5f5f1a2d30e200ce60059a8b4b373b29993ae4565eecd42918f1dc9b90061d1\",\"content_sha256\":\"fd00c4e2be5f9d71506c229eed15d9208795b87313ec44c6a2bcc1dc6fddee56\",\"file_bytes\":1497,\"body_bytes\":257},{\"atom_id\":\"start-from-the-symptom-to-choose-the-measurement\",\"file_sha256\":\"d6de2fd1e397bbbea6ead4552f983e2f520416c532394352c86ee8ee20babb9f\",\"content_sha256\":\"168fb70a0b143b551efec67d574d852116fc9fbe748ed2b0d729c8d38dd8d762\",\"file_bytes\":2533,\"body_bytes\":1429},{\"atom_id\":\"state-one-invalidation-strategy-and-the-staleness-window\",\"file_sha256\":\"d812d71520a0f36347b70a5c505f056fbb33ee86b11e6cf98e24921164579b5c\",\"content_sha256\":\"e910974f0737a75e43dafa6ab41e220dd44e80308b1dccb46e82c8284740771c\",\"file_bytes\":1740,\"body_bytes\":497}]"
carrier_sha256: 5cd34073f0d6e08872d7185cede26adc3c9fb2285a54bff56b2133ed79d129f5
carrier_bytes: 16466
revision: 1
status: active
---
<!-- vpmodule:atom:begin justify-an-index-with-a-query-plan -->
---
instruction_id: justify-an-index-with-a-query-plan
title: Justify an index with a query plan
summary: "Adding an index is the guess and the query plan is the measurement, and an index that did not change the plan is a revert."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: A query is slow and an index is proposed.
conditions_does_not_apply_when: The query is already served by a usable index.
artifact_contract_output_type: index-justification
artifact_contract_required_data:
  - the plan before the change
  - the plan after it
  - the write cost considered
artifact_contract_verified_by: the plan after the change is compared with the plan before it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/performance-optimization/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/performance-optimization/references/optimization-patterns.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Justify an index with a query plan

"Add an index" is the guess; `EXPLAIN ANALYZE` is the measurement.
A `Seq Scan` where you expected an index, a `rows=` estimate off by an order of magnitude, and a `Sort` node above the scan each call for a different fix; a bad `rows=` estimate means stale statistics, so run `ANALYZE` rather than adding an index.
Index for the shape of the query (equality columns first, then the range or sort column).
A plain index will not help a query on a low-selectivity dominant value (a partial index serves the rare value), a leading wildcard (needs trigram or full-text), or a function applied to the column (index the expression, as in `WHERE lower(email) = ?`), and every index taxes every write.
Re-run the plan afterwards; an index that did not change it is a revert.
<!-- vpmodule:atom:end justify-an-index-with-a-query-plan -->
<!-- vpmodule:atom:begin key-the-cache-on-every-input-that-changes-the-response -->
---
instruction_id: key-the-cache-on-every-input-that-changes-the-response
title: Key the cache on every input that changes the response
summary: "Tenant, locale, permissions and feature flags belong in the key, because a key that omits the viewer serves one user's data to another."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: You put a cache in front of something that varies per caller.
conditions_does_not_apply_when: The response is identical for every caller.
artifact_contract_output_type: cache-key
artifact_contract_required_data:
  - the inputs the response depends on
  - the key that carries them
artifact_contract_verified_by: every input that changes the response appears in the key
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/performance-optimization/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/performance-optimization/references/optimization-patterns.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Key the cache on every input that changes the response

Every input that changes the response belongs in the key (tenant, locale, permissions, feature flags): a key that omits the viewer is how one user's data gets served to another.
<!-- vpmodule:atom:end key-the-cache-on-every-input-that-changes-the-response -->
<!-- vpmodule:atom:begin profile-to-find-the-real-bottleneck -->
---
instruction_id: profile-to-find-the-real-bottleneck
title: Profile to find the real bottleneck
summary: "Measure, identify the actual bottleneck, fix only that, then measure again, and never optimize without evidence of a problem."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: Performance requirements exist or slow behaviour is reported.
conditions_does_not_apply_when: No measurement shows a problem at all.
artifact_contract_output_type: bottleneck-report
artifact_contract_required_data:
  - the symptom
  - the measurement
  - the bottleneck
  - the fix that addressed it
artifact_contract_verified_by: the named bottleneck is confirmed by a measurement and not by inspection
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/performance-optimization/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Profile to find the real bottleneck

Measure before optimizing.
Performance work without measurement is guessing — and guessing leads to premature optimization that adds complexity without improving what matters.
Profile first, identify the actual bottleneck, fix it, measure again.
Optimize only what measurements prove matters.

```
1. MEASURE  → Establish baseline with real data
2. IDENTIFY → Find the actual bottleneck (not assumed)
3. FIX      → Address the specific bottleneck
4. VERIFY   → Measure again; keep or revert
5. GUARD    → Add monitoring or tests to prevent regression
```

Fix the one thing Step 2 identified, nothing else.

**Frontend:**

| Symptom | Likely Cause | Investigation |
|---------|-------------|---------------|
| Slow LCP | Large images, render-blocking resources, slow server | Check network waterfall, image sizes |
| High CLS | Images without dimensions, late-loading content, font shifts | Check layout shift attribution |
| Poor INP | Heavy JavaScript on main thread, large DOM updates | Check long tasks in Performance trace |
| Slow initial load | Large bundle, many network requests | Check bundle size, code splitting |

**Backend:**

| Symptom | Likely Cause | Investigation |
|---------|-------------|---------------|
| Slow API responses | N+1 queries, missing indexes, unoptimized queries | Check database query log |
| Memory growth | Leaked references, unbounded caches, large payloads | Heap snapshot analysis |
| CPU spikes | Synchronous heavy computation, regex backtracking | CPU profiling |
| High latency | Missing caching, redundant computation, network hops | Trace requests through the stack |
<!-- vpmodule:atom:end profile-to-find-the-real-bottleneck -->
<!-- vpmodule:atom:begin set-and-enforce-performance-budgets -->
---
instruction_id: set-and-enforce-performance-budgets
title: Set and enforce performance budgets
summary: "Write the budgets down and enforce them in the build, so the number cannot drift back."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: A user-facing surface has a known size or latency budget.
conditions_does_not_apply_when: There is no budget to enforce.
artifact_contract_output_type: performance-budget
artifact_contract_required_data:
  - the budgets
  - the enforcement check
  - its result
artifact_contract_verified_by: the budget check runs and its result is recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/performance-optimization/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - design-ux
---

# Set and enforce performance budgets

**Set budgets and enforce them:**

```
JavaScript bundle: < 200KB gzipped (initial load)
CSS: < 50KB gzipped
Images: < 200KB per image (above the fold)
Fonts: < 100KB total
API response time: < 200ms (p95)
Time to Interactive: < 3.5s on 4G
Lighthouse Performance score: ≥ 90
```

**Enforce in CI.**
<!-- vpmodule:atom:end set-and-enforce-performance-budgets -->
<!-- vpmodule:atom:begin size-the-connection-pool-under-the-ceiling -->
---
instruction_id: size-the-connection-pool-under-the-ceiling
title: Size the connection pool under the ceiling
summary: "One pool per process, sized so the instance count times the maximum stays under the database's connection ceiling."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: The application opens database connections and may run on more than one instance.
conditions_does_not_apply_when: The datastore the application talks to has no connection limit.
artifact_contract_output_type: pool-sizing
artifact_contract_required_data:
  - the instance count
  - the pool maximum
  - "\"the database's connection ceiling\""
artifact_contract_verified_by: "the instance count times the pool maximum stays under the database's connection ceiling"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/performance-optimization/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/performance-optimization/references/optimization-patterns.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# Size the connection pool under the ceiling

**Connection pool exhaustion.**
Signature: *every* endpoint slows at once, time is spent waiting for a connection rather than executing, and the database shows mostly idle sessions.
One pool per process, sized so `instances × max` stays under the database's connection ceiling.
Bigger is not faster; it relocates the queue to the database where it is harder to see.
With unbounded instance counts (serverless, autoscaling), multiplex through a proxy (pgbouncer, RDS Proxy) instead of raising `max`.
<!-- vpmodule:atom:end size-the-connection-pool-under-the-ceiling -->
<!-- vpmodule:atom:begin split-the-bundle-and-lazy-load-heavy-features -->
---
instruction_id: split-the-bundle-and-lazy-load-heavy-features
title: Split the bundle and lazy-load heavy features
summary: "Route-level code splitting and lazy loading are the real gains, because modern bundlers already tree-shake named ESM imports."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: The initial bundle carries code the first page does not need.
conditions_does_not_apply_when: The bundle was not measured as too large.
artifact_contract_output_type: bundle-change
artifact_contract_required_data:
  - the measured bundle size
  - the feature that was split or lazy-loaded
artifact_contract_verified_by: the bundle size was measured before the change
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/performance-optimization/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/performance-optimization/references/optimization-patterns.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Split the bundle and lazy-load heavy features

Modern bundlers tree-shake ESM named imports on their own; the real gains are route-level code splitting and lazy-loading heavy, rarely-used features behind `Suspense`.
Profile before changing import styles.
<!-- vpmodule:atom:end split-the-bundle-and-lazy-load-heavy-features -->
<!-- vpmodule:atom:begin start-from-the-symptom-to-choose-the-measurement -->
---
instruction_id: start-from-the-symptom-to-choose-the-measurement
title: Start from the symptom to choose the measurement
summary: "Let the reported symptom decide what you measure first, instead of measuring everything."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: Something is reported slow and the place to start measuring is not yet known.
conditions_does_not_apply_when: The bottleneck is already identified by a measurement.
artifact_contract_output_type: measurement-plan
artifact_contract_required_data:
  - the symptom
  - the measurement chosen for it
artifact_contract_verified_by: the chosen measurement follows from the symptom that was reported
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/performance-optimization/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - design-ux
  - engineering
  - operations
---

# Start from the symptom to choose the measurement

Use the symptom to decide what to measure first:

```
What is slow?
├── First page load
│   ├── Large bundle? --> Measure bundle size, check code splitting
│   ├── Slow server response? --> Measure TTFB in DevTools Network waterfall
│   │   ├── DNS long? --> Add dns-prefetch / preconnect for known origins
│   │   ├── TCP/TLS long? --> Enable HTTP/2, check edge deployment, keep-alive
│   │   └── Waiting (server) long? --> Profile backend, check queries and caching
│   └── Render-blocking resources? --> Check network waterfall for CSS/JS blocking
├── Interaction feels sluggish
│   ├── UI freezes on click? --> Profile main thread, look for long tasks (>50ms)
│   ├── Form input lag? --> Check re-renders, controlled component overhead
│   └── Animation jank? --> Check layout thrashing, forced reflows
├── Page after navigation
│   ├── Data loading? --> Measure API response times, check for waterfalls
│   └── Client rendering? --> Profile component render time, check for N+1 fetches
└── Backend / API
    ├── Single endpoint slow? --> Profile database queries, check indexes
    ├── All endpoints slow? --> Check connection pool, memory, CPU
    └── Intermittent slowness? --> Check for lock contention, GC pauses, external deps
```
<!-- vpmodule:atom:end start-from-the-symptom-to-choose-the-measurement -->
<!-- vpmodule:atom:begin state-one-invalidation-strategy-and-the-staleness-window -->
---
instruction_id: state-one-invalidation-strategy-and-the-staleness-window
title: State one invalidation strategy and the staleness window
summary: "Choose TTL, event-based or versioned keys, and state the acceptable staleness window explicitly."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: A cached value exists and has to be allowed to go stale.
conditions_does_not_apply_when: Nothing is cached.
artifact_contract_output_type: invalidation-policy
artifact_contract_required_data:
  - the chosen strategy
  - the acceptable staleness window
artifact_contract_verified_by: the staleness window is stated and exactly one invalidation strategy is chosen
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/performance-optimization/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/performance-optimization/references/optimization-patterns.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
  - operations
---

# State one invalidation strategy and the staleness window

Choose one invalidation strategy, not three:

| Strategy | Trade-off |
|---|---|
| TTL | Simplest. You accept staleness up to the TTL, so state the acceptable window explicitly |
| Event or tag based | Fresh on write, but writers now have to know the cache topology |
| Versioned keys (`user:42:profile:v7`) | Never invalidate, just stop reading old keys. Costs memory until eviction |

State the acceptable staleness window explicitly.
<!-- vpmodule:atom:end state-one-invalidation-strategy-and-the-staleness-window -->