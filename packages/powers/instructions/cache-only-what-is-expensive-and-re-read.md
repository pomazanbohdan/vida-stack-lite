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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/references/optimization-patterns.md
status: active
revision: 2
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
