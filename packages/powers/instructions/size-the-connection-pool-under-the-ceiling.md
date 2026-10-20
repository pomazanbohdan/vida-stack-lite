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
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/SKILL.md
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/performance-optimization/references/optimization-patterns.md
status: active
revision: 2
---

# Size the connection pool under the ceiling

**Connection pool exhaustion.**
Signature: *every* endpoint slows at once, time is spent waiting for a connection rather than executing, and the database shows mostly idle sessions.
One pool per process, sized so `instances × max` stays under the database's connection ceiling.
Bigger is not faster; it relocates the queue to the database where it is harder to see.
With unbounded instance counts (serverless, autoscaling), multiplex through a proxy (pgbouncer, RDS Proxy) instead of raising `max`.
