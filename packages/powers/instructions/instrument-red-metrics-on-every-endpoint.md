---
instruction_id: instrument-red-metrics-on-every-endpoint
title: Instrument RED metrics on every endpoint
summary: "Every request-driven endpoint and every external dependency gets rate, errors and duration; resources get utilization, saturation and errors."
capability_tags:
  - instrument-production-code
pattern_tags:
  - structured-observability
conditions_applies_when: The code serves requests or depends on a remote service.
conditions_does_not_apply_when: The code is a batch job with no request traffic and no external dependency.
artifact_contract_output_type: metric-set
artifact_contract_required_data:
  - the endpoints
  - the external dependencies
  - the three measures of each
artifact_contract_verified_by: each new endpoint and dependency exposes its three measures with bounded label sets
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 1
---

# Instrument RED metrics on every endpoint

For request-driven services, instrument **RED** on every endpoint and every external dependency: **R**ate (requests/sec), **E**rrors (failure rate), **D**uration (latency histogram, not average).
For resources (queues, pools, hosts), use **USE**: **U**tilization, **S**aturation, **E**rrors.
