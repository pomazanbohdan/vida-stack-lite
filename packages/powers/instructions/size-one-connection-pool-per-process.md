---
instruction_id: size-one-connection-pool-per-process
title: Size one connection pool per process
summary: "There is one pool per process, its size stays under the server limit, exhaustion fails fast, and the holder of the connections is found before the pool is resized."
capability_tags:
  - improve-performance
pattern_tags:
  - resource-bounds
conditions_applies_when: A process talks to a database over more than one connection.
conditions_does_not_apply_when: The process holds a single connection or none.
artifact_contract_output_type: pool-sizing-note
artifact_contract_required_data:
  - the number of instances
  - the pool maximum
  - the server limit
  - the timeout
  - what holds connections when the pool is exhausted
artifact_contract_verified_by: the instance count times the pool maximum stays under the server limit and exhaustion fails fast
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
  - operations
---

# Size one connection pool per process
One pool per process, not per request or per module
`instances × pool max` stays under the database's `max_connections`
`connectionTimeoutMillis` set so exhaustion fails fast instead of queueing forever
Exhaustion diagnosed before resizing: find what holds connections (long transactions, missing `await`, leaked clients)
Serverless / autoscaling fronted by a multiplexing proxy (pgbouncer, RDS Proxy) rather than a larger pool
Connection pool per request | Exhausts `max_connections` under load | One pool per process; proxy for serverless
