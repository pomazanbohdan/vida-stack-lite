---
instruction_id: design-the-cache-deliberately
title: Design the cache deliberately
summary: "A cache is only added for a call measured as expensive, keyed on every input the response varies on, invalidated by one written strategy and bounded in size and staleness."
capability_tags:
  - improve-web-performance
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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/performance-checklist.md
status: active
revision: 1
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
