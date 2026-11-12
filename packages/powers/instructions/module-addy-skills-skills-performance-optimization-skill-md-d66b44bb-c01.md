---
schema: VPInstructionModule/v1
instruction_id: "module-addy-skills-skills-performance-optimization-skill-md-d66b44bb-c01"
title: "addy-skills: skills/performance-optimization/SKILL.md module"
summary: "Carrier for 8 atomic instructions from addy-skills:skills/performance-optimization/SKILL.md."
source: "{\"donor\":\"addy-skills\",\"path\":\"skills/performance-optimization/SKILL.md\"}"
atom_ids:
  - cache-only-what-is-expensive-and-re-read
  - fetch-the-relation-in-the-same-query
  - give-images-dimensions-and-priority
  - guard-the-hot-key-against-a-stampede
  - guard-the-metric-the-user-feels
  - hillclimb-one-metric
  - hoist-render-allocations-and-memoize-what-the-profile-shows
  - judge-web-vitals-against-the-good-thresholds
atom_count: 8
atoms: "[{\"atom_id\":\"cache-only-what-is-expensive-and-re-read\",\"file_sha256\":\"f458345766a57b4285f713b2a2d22841aac03b48133a85a008126111201941d7\",\"content_sha256\":\"fa80e6b268b620b92fa34cbc579bf2d3bc1b3011565b0336e195736877b49d7e\",\"file_bytes\":2163,\"body_bytes\":879},{\"atom_id\":\"fetch-the-relation-in-the-same-query\",\"file_sha256\":\"6330a524d74b9adbfbdd9aab7ee3f9773d502981bdef82eaf7d1017a584be0f7\",\"content_sha256\":\"0a13377b28efced3767a5c33d6ba1b6a48793a8ec53dcac6b3996c61a8e95be6\",\"file_bytes\":1433,\"body_bytes\":190},{\"atom_id\":\"give-images-dimensions-and-priority\",\"file_sha256\":\"429736c2c1951df7e9a200923559fa26d6209915b1cf952e2b0ae1407a1321f6\",\"content_sha256\":\"508cce99286c8061a971a29b43ac2b075976acee4e78f2ba280608bbe86f78cc\",\"file_bytes\":1560,\"body_bytes\":294},{\"atom_id\":\"guard-the-hot-key-against-a-stampede\",\"file_sha256\":\"f88990e957e42d97b7a25bccb9e6daa20f71e2da0319ac154d63a99984f55ba0\",\"content_sha256\":\"79543ef892210eb9ad39c1de16f6113b6b5e37f1f2a3c6cb6660c9224f30c5bf\",\"file_bytes\":1561,\"body_bytes\":358},{\"atom_id\":\"guard-the-metric-the-user-feels\",\"file_sha256\":\"3001288fbcce23825b96da3eaa0432c4c7118a213f2130a52038bfd492a1d76c\",\"content_sha256\":\"9b52acdb5e503cd2a7cd15749e87eedc675f43c121f3a0b15f4b8163d560f5cb\",\"file_bytes\":2204,\"body_bytes\":1122},{\"atom_id\":\"hillclimb-one-metric\",\"file_sha256\":\"a1c33875a6bac3c0f817fa97f4c722c99eeaf4e5b828dcbcd65420d595927e08\",\"content_sha256\":\"a178237a4e1a4d5ebb4d9ffbcfc100d1ee24efd624219f549a4be2ab10eee495\",\"file_bytes\":5309,\"body_bytes\":4072},{\"atom_id\":\"hoist-render-allocations-and-memoize-what-the-profile-shows\",\"file_sha256\":\"c0bb32b10f1ffaa0c13982e33d316c0eba841e1676bc974d84b37950e93f94d7\",\"content_sha256\":\"34b75fd32c383b46d6b8e870726b5833877fd389336dffcd29f145a222b69927\",\"file_bytes\":1643,\"body_bytes\":302},{\"atom_id\":\"judge-web-vitals-against-the-good-thresholds\",\"file_sha256\":\"88af77f2af6d7dddb4d8c7f38855eca1b40ed5546084cc561ffe4bb0080c3b09\",\"content_sha256\":\"6db520ee21cbfabc688e43240bc4932e311ed34d29f1d02d30172ecdc6db83f2\",\"file_bytes\":1490,\"body_bytes\":428}]"
carrier_sha256: 6af24c6a9f5fb40ad55a35f4e2b5be0c805cee4d57fbc84b3e49ccafde2cdf3b
carrier_bytes: 18428
revision: 1
status: active
---
<!-- vpmodule:atom:begin cache-only-what-is-expensive-and-re-read -->
---
instruction_id: cache-only-what-is-expensive-and-re-read
title: Cache only what is expensive and re-read
summary: "Cache what is expensive to produce and read far more often than it changes, and never cache what must be fresh."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: A response or a query is produced repeatedly and might be cached.
conditions_does_not_apply_when: The value has to be fresh at the moment it is read.
artifact_contract_output_type: cache-decision
artifact_contract_required_data:
  - what is cached
  - how often it is read against how often it changes
  - the chosen layer
artifact_contract_verified_by: the cached value is expensive to produce and read far more often than it changes
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

# Cache only what is expensive and re-read

Cache what is expensive to produce and read far more often than it changes; caching an already-fast query adds a network hop and a staleness bug in exchange for nothing.
Pick the layer deliberately.

| Layer | Visible to | Use when | Cost |
|---|---|---|---|
| In-process (`Map`, LRU) | One instance | Small, hot, per-instance staleness is acceptable | Each instance drifts independently; invalidation reaches only one |
| Shared (Redis, Memcached) | All instances | Instances must agree, or the value is expensive to recompute | A network hop, and another service to run and monitor |
| CDN / edge | Everyone, per URL | Responses are public and identical for a given key | Invalidation is the hard part; assume you cannot recall a bad response quickly |

Never cache what must be fresh (balances, permissions, inventory at checkout).
<!-- vpmodule:atom:end cache-only-what-is-expensive-and-re-read -->
<!-- vpmodule:atom:begin fetch-the-relation-in-the-same-query -->
---
instruction_id: fetch-the-relation-in-the-same-query
title: Fetch the relation in the same query
summary: "One query per row is the most common backend bottleneck, so fetch the relation in the same query instead of in the loop."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: Code loads a collection and then loads a related record for each item.
conditions_does_not_apply_when: The related record is not loaded once per item.
artifact_contract_output_type: query-change
artifact_contract_required_data:
  - the loop that fetched per row
  - the single query that replaces it
artifact_contract_verified_by: the number of queries no longer grows with the number of rows
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

# Fetch the relation in the same query

**N+1 queries.**
One query per row is the most common backend bottleneck.
Fetch the relation in the same query (join/include) instead of in the loop.
<!-- vpmodule:atom:end fetch-the-relation-in-the-same-query -->
<!-- vpmodule:atom:begin give-images-dimensions-and-priority -->
---
instruction_id: give-images-dimensions-and-priority
title: Give images dimensions and priority
summary: "Every image declares its dimensions, the largest-contentful-paint image is high priority with modern formats and responsive sizes, and the images below the fold load lazily."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: A page ships images.
conditions_does_not_apply_when: The work ships no image.
artifact_contract_output_type: image-policy
artifact_contract_required_data:
  - the dimensions
  - the priority
  - the formats
  - the loading mode
artifact_contract_verified_by: every image declares its width and height and its loading mode matches its position on the page
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/performance-optimization/SKILL.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/performance-optimization/references/optimization-patterns.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - engineering
  - design-ux
---

# Give images dimensions and priority

Every image declares `width` and `height` (CLS).
The LCP image gets `fetchpriority="high"`, modern formats (AVIF, WebP) through `<picture>`, and `srcset`/`sizes` for resolution switching; below-the-fold images get `loading="lazy"` and `decoding="async"`.
<!-- vpmodule:atom:end give-images-dimensions-and-priority -->
<!-- vpmodule:atom:begin guard-the-hot-key-against-a-stampede -->
---
instruction_id: guard-the-hot-key-against-a-stampede
title: Guard the hot key against a stampede
summary: "Serve stale while one request recomputes, or coalesce the concurrent misses behind a single in-flight promise."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: A hot cache key can expire while many requests wait for it.
conditions_does_not_apply_when: The key is cold or the load on it is small.
artifact_contract_output_type: stampede-guard
artifact_contract_required_data:
  - the guard chosen
  - the behaviour on a miss
artifact_contract_verified_by: concurrent misses cause one recomputation instead of one per waiter
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

# Guard the hot key against a stampede

Guard hot keys against the stampede: serve stale while one request recomputes, or coalesce concurrent misses behind a single in-flight promise.
A hot key expires, every concurrent request misses together, and the origin takes the full load at once, which is how a cache turns into an outage instead of preventing one.
<!-- vpmodule:atom:end guard-the-hot-key-against-a-stampede -->
<!-- vpmodule:atom:begin guard-the-metric-the-user-feels -->
---
instruction_id: guard-the-metric-the-user-feels
title: Guard the metric the user feels
summary: "Keep the primary metric under a synthetic build gate and a field monitor, and take a fresh baseline whenever a guard fires."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: A performance fix has landed and must not silently regress.
conditions_does_not_apply_when: The change has no user-facing metric.
artifact_contract_output_type: regression-guard
artifact_contract_required_data:
  - the primary metric
  - the synthetic budget
  - the field signal
artifact_contract_verified_by: the primary metric has both a budget check and a field monitor
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
  - design-ux
  - operations
---

# Guard the metric the user feels

Guard the metric the user actually feels, not every available number.
Use the same LCP, INP, p95 latency, or other primary metric that justified the fix.

Two complementary approaches — use both:

- **Synthetic (Lighthouse, DevTools Performance tab):** Controlled conditions, reproducible. Best for CI regression detection and isolating specific issues.
- **RUM (web-vitals library, CrUX):** Real user data in real conditions. Required to validate that a fix actually improved user experience.

Use two complementary layers when the surface is user-facing:

- **Synthetic CI gate:** Catch reproducible regressions before merge with a performance budget. Repeat noisy measurements or compare a median/trend so normal run-to-run variance does not turn the gate into a flaky check.
- **Field monitoring:** Alert on a meaningful p75 movement in RUM data. Use attributed `web-vitals` data to locate the cause; treat CrUX's rolling window as confirmation rather than an immediate alert.

When either guard fires, return to Step 1 and establish a fresh baseline before proposing another fix.
<!-- vpmodule:atom:end guard-the-metric-the-user-feels -->
<!-- vpmodule:atom:begin hillclimb-one-metric -->
---
instruction_id: hillclimb-one-metric
title: Hillclimb one metric
summary: "Improve one measurable thing against a target: one change, one measurement, keep or revert, and never claim a win from code inspection."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: There is a measurable metric to improve without changing functional behavior.
conditions_does_not_apply_when: "The metric cannot be measured reproducibly, or the target is not defined yet."
artifact_contract_output_type: improvement-log
artifact_contract_required_data:
  - metric
  - baseline
  - steps
  - measurements
  - reverted attempts
artifact_contract_verified_by: the recorded measurement runs for every kept step
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=pstack; license=MIT; revision=2f8377461fd533f5af782e1fd643783b1067b847; path=skills/poteto-mode/playbooks/hillclimb.md
  - donor=addy-skills; license=MIT; revision=301b02b12bff98e4688e6984af6556802322bbde; path=skills/performance-optimization/SKILL.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Hillclimb one metric
You own the metric and the experiment's integrity.
Core discipline: one change, one measurement, keep or revert.
Never stack untested changes, and never claim a win from code inspection.
Ground the workload and architecture before choosing the metric.
Name the realistic workload dimensions that can move the result: data size, history, state, concurrency.
Select a case that reproduces the user's complaint; if no case reproduces it, fix the repro instead of hillclimbing.
Fix one metric, the direction that counts as better, and a checkable stop predicate that pairs a target with a floor on attempts so a lucky early win cannot end the run.
Use the user's numbers when given, otherwise agree them.
Build the measurement harness, prove its sensitivity, then freeze it.
Run contrasting realistic workloads and confirm the target case reproduces the symptom while easier cases separate as expected.
If the harness cannot distinguish them, revise the workload or metric.
Once frozen, one repeatable command emits the metric, sampled enough to clear the noise: a median of N, not a single run.
Record the baseline metric and a green run of the regression gate before any change.
Open a decision log with one row per attempt: id, hypothesis, change, before, after, delta, tests, verdict, note.
Read it before each attempt and keep it out of the tree.
Ground each hypothesis in the architecture model, so it names a specific mechanism, not "try memoizing something".
Measure before and after with the frozen harness, and run the regression gate.
Re-measure the way you measured the baseline: same command, same conditions, same fixed budget (wall-clock, sample count, or request count).
A baseline taken on a cold cache against a result taken on a warm one measures the cache, not your change.
Change one thing at a time.
Three optimizations landed together produce one number, and you cannot attribute it.
If they must ship together, measure each in isolation first.
Beat the noise, not just the mean.
Repeat the measurement and compare the delta against run-to-run variance.
A 3% gain inside ±5% variance is not a gain; it is a different sample.
Accept only when the metric moves past noise and the gate stays green; otherwise revert the change in full.
"Neutral" is a revert, not a keep.
This is the step teams skip: the change is already written, throwing it away feels wasteful, so it lands unmeasured, and the codebase accretes complexity that never bought anything.
Code you keep, you maintain forever.
Make it pay for itself.
Correctness gates the metric.
The suite stays green *and* the number moves.
An "optimization" that wins by dropping work the product needed (skipping a validation, caching something that must be fresh, removing an `await` that was load-bearing) is a regression, not a win.
A tweak that "might help" is not kept.
Log the row either way, kept or reverted.
Reverted work leaves no trace in git history, which is exactly why the same dead idea gets tried again next quarter.
Keep a short ledger so a discarded idea stays discarded:

| Idea | Baseline → Result | Verdict | Why |
|---|---|---|---|
| Memoize the row component | INP 240ms → 235ms | reverted | Inside noise (±15ms). Rows weren't the bottleneck. |
| Virtualize the list | INP 240ms → 90ms | kept | Long tasks gone from the trace. |
| Preconnect to the API origin | LCP 2.8s → 2.8s | reverted | Already same-origin. |

What matters is that the next person (or the next agent) reads it before proposing an experiment, and doesn't re-run one that already failed.
Push past the first plateau: pivot category, combine near-misses, re-read the source, or try something more radical.
Correctness and simplicity outrank the number.
Revert a win that breaks behavior, and keep a simplification that holds the number.
Stop when the predicate is met, or when the remaining ideas are marginal and not worth their cost.
Do not relax the predicate to meet it, and do not quit while cheap untried hypotheses remain.
If you are stuck, surface it instead of spinning.
<!-- vpmodule:atom:end hillclimb-one-metric -->
<!-- vpmodule:atom:begin hoist-render-allocations-and-memoize-what-the-profile-shows -->
---
instruction_id: hoist-render-allocations-and-memoize-what-the-profile-shows
title: Hoist render allocations and memoize what the profile shows
summary: "An object or function created in render is a new reference every time and re-renders every child that receives it, and memoization is reserved for work the profile shows is expensive."
capability_tags:
  - improve-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: A component tree re-renders children it did not need to.
conditions_does_not_apply_when: The rendering cost has not been measured at all.
artifact_contract_output_type: render-change
artifact_contract_required_data:
  - the allocation
  - the hoist
  - the profile evidence for the memoization
artifact_contract_verified_by: the profile names the work the memoization was added for
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

# Hoist render allocations and memoize what the profile shows

An object or function created in render is a new reference every time and re-renders every child that receives it.
Hoist constants; reserve `React.memo` and `useMemo` for work the profile shows is expensive, since overuse is its own cost.
<!-- vpmodule:atom:end hoist-render-allocations-and-memoize-what-the-profile-shows -->
<!-- vpmodule:atom:begin judge-web-vitals-against-the-good-thresholds -->
---
instruction_id: judge-web-vitals-against-the-good-thresholds
title: Judge web vitals against the Good thresholds
summary: Hold the three web vitals to their Good band and treat anything worse as a defect to fix.
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "A web page's experience is measured or judged."
conditions_does_not_apply_when: The work has no page load or no interaction in the browser.
artifact_contract_output_type: vitals-thresholds
artifact_contract_required_data:
  - the metric
  - the measured value
  - the band it falls in
artifact_contract_verified_by: each vital is inside the Good band or recorded as out of band
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
  - design-ux
  - engineering
---

# Judge web vitals against the Good thresholds

Core Web Vitals Targets:

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| **INP** (Interaction to Next Paint) | ≤ 200ms | ≤ 500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 | > 0.25 |

- [ ] Core Web Vitals are within "Good" thresholds
<!-- vpmodule:atom:end judge-web-vitals-against-the-good-thresholds -->