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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/references/optimization-patterns.md
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
