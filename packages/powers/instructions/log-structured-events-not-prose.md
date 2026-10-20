---
instruction_id: log-structured-events-not-prose
title: "Log structured events, not prose"
summary: Every log line is a structured record with a stable event name and machine-readable fields.
capability_tags:
  - instrument-production-code
pattern_tags:
  - structured-observability
conditions_applies_when: You add logging to a code path that runs in production.
conditions_does_not_apply_when: The output is a human-facing report rather than telemetry.
artifact_contract_output_type: structured-log-record
artifact_contract_required_data:
  - the event name
  - the machine-readable fields
  - the log level
artifact_contract_verified_by: a line from the new path is queryable by its event name and its fields
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 1
---

# Log structured events, not prose

Log events, not prose.
Every log line is a JSON object with a stable event name and machine-readable fields:

```typescript
// BAD: string interpolation — unqueryable, inconsistent
logger.info(`Payment ${id} failed for user ${userId} after ${n} retries`);

// GOOD: stable event name + structured fields
logger.warn({
  event: 'payment_failed',
  paymentId: id,
  provider: 'stripe',
  errorCode: err.code,
  attempt: n,
}, 'payment failed');
```
