---
instruction_id: propagate-trace-context-across-every-boundary
title: Propagate trace context across every boundary
summary: "Tracing starts at startup and its context is carried on every outbound call and every async boundary, so a request can be followed end to end."
capability_tags:
  - instrument-production-code
pattern_tags:
  - operational-telemetry
conditions_applies_when: A service or worker makes outbound calls or passes work through a queue.
conditions_does_not_apply_when: The component has no outbound call and no asynchronous boundary.
artifact_contract_output_type: trace-propagation-review
artifact_contract_required_data:
  - the outbound calls that carry the context
  - the async boundaries that carry the context
  - the manual spans
artifact_contract_verified_by: one request is followed end to end with no broken span across the boundaries
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/observability-checklist.md
status: active
revision: 1
---

# Propagate trace context across every boundary
OpenTelemetry (or equivalent) initialized at service startup, before other imports
Auto-instrumentation enabled for HTTP, gRPC, and DB clients
Trace context propagated on every outbound call (W3C `traceparent`/`tracestate`) and extracted from every inbound request
Context survives async boundaries — queue messages carry trace metadata
Manual spans only around meaningful internal units of work, with the attributes on-call will filter by
No secrets or PII as span attributes
Head-based sampling at a low default rate; 100% of errors kept if tail sampling is available
