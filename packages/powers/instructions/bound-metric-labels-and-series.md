---
instruction_id: bound-metric-labels-and-series
title: Bound metric labels and series
summary: "Every series is a rate, error or duration, its labels come from a small fixed set, and no label value is unbounded."
capability_tags:
  - instrument-production-code
pattern_tags:
  - operational-telemetry
conditions_applies_when: "Metrics are emitted for an endpoint, a dependency or a resource."
conditions_does_not_apply_when: The work emits no metrics.
artifact_contract_output_type: metric-shape-review
artifact_contract_required_data:
  - the metric and its type
  - the label set
  - the cardinality bound
artifact_contract_verified_by: every label value comes from a fixed set and every latency is a histogram
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/observability-checklist.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - operations
---

# Bound metric labels and series
**RED** instrumented for every endpoint and every external dependency: Rate, Errors, Duration
**USE** instrumented for every resource (queues, pools, hosts): Utilization, Saturation, Errors
Latency is a histogram; p50/p95/p99 queryable — never an average
All labels come from small, fixed sets (route template, status class, provider name)
No unbounded label values: no user IDs, tenant IDs, emails, raw URLs, request IDs, or error message text
Status codes grouped by class (`5xx`, not `503`)
Queue depth and processing duration tracked for every worker/queue
