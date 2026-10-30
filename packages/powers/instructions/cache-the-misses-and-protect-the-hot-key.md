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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/performance-checklist.md
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
