---
instruction_id: write-structured-logs-with-a-correlation-id
title: Write structured logs with a correlation id
summary: "Log lines are structured events with stable names, a correlation id that travels with the request, and no secrets or raw bodies."
capability_tags:
  - instrument-production-code
pattern_tags:
  - operational-telemetry
conditions_applies_when: A component writes logs that another person will have to read.
conditions_does_not_apply_when: The component produces no logs.
artifact_contract_output_type: logging-standard
artifact_contract_required_data:
  - the event names
  - the correlation id source
  - the allowlisted fields
  - the level meanings
artifact_contract_verified_by: a real log line shows the structured fields and the correlation id rather than an object dump
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/observability-checklist.md
status: active
revision: 1
---

# Write structured logs with a correlation id
Logs are structured (JSON) with stable event names — not free-form strings
Every log line carries a correlation/request ID, generated or accepted at the system boundary
Correlation ID is propagated on every outbound call and async boundary (HTTP headers, queue metadata)
Any log stream written by more than one entry point (scheduler, replay endpoint, manual run) carries an entry-point field, set where the run starts and propagated alongside the correlation ID
Log levels are consistent: `error` = invariant broken, someone may act; `warn` = degraded but handled; `info` = significant business event; `debug` = off in production
No secrets, tokens, passwords, or unredacted PII in any log line
Fields are allowlisted — no whole request/response bodies, no auth headers
External service calls logged with metadata only: endpoint, status, latency, attempt count, sanitized identifiers
Actual log output spot-checked: structured fields, not `[object Object]`
