---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: release-it-observability
title: Design health checks and observability
summary: "Use deep dependency health checks, structured logs, metrics and correlated traces; measure RED and USE, define SLI then SLO then SLA, alert on user symptoms and keep dashboards answerable in five seconds."
capability_tags:
  - design-production-readiness
pattern_tags:
  - observability-first
conditions_applies_when: Instrumenting a service or defining SLOs.
conditions_does_not_apply_when: A batch job with no service health surface.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Deep checks, correlated telemetry, SLI/SLO/SLA and symptom alerts are recorded."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/release-it/SKILL.md; sha256=747c1130a348ede99b6533de5ec75bb77fb5dd05efc8cef35f0524f7a9f87e7e; locator=skills/release-it/SKILL.md#L123-L146"
status: active
revision: 1
---

# Design health checks and observability

Treat observability as a first-class production design concern because a system cannot be operated if it cannot be observed. Emit high-cardinality structured events, not only pre-aggregated counters, so past incidents can answer new questions without shipping new instrumentation first. Distinguish shallow health checks, which only prove the process is alive, from deep health checks, which verify dependencies are reachable and resources are available; deep checks should report dependencies such as database, cache, queue, and disk status. Use three pillars: structured logs for what happened, metrics for how much, and distributed traces for where and how long; propagate trace context such as trace IDs in headers and correlate logs across services. Measure services with RED (Rate, Errors, Duration), including representative p50/p95/p99 latency per endpoint, and resources with USE (Utilization, Saturation, Errors). Define SLIs for user experience first, then SLOs as targets, then SLAs as contracts, in that order. Alert on symptoms users feel, such as error rate and latency, rather than causes such as CPU; prefer SLO burn-rate alerts over raw thresholds, such as error budget burning 10x versus CPU above 80%. Dashboards must answer whether the system is healthy within 5 seconds.
