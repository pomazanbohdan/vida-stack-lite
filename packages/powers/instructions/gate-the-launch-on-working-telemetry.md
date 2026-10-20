---
instruction_id: gate-the-launch-on-working-telemetry
title: Gate the launch on working telemetry
summary: "Before a feature reaches production, its logs flow, its metrics are on a dashboard, one alert is tested, a request can be traced and the runbooks are findable."
capability_tags:
  - instrument-production-code
pattern_tags:
  - operational-telemetry
conditions_applies_when: A feature is about to be released to production.
conditions_does_not_apply_when: The feature is not going to production.
artifact_contract_output_type: launch-telemetry-gate
artifact_contract_required_data:
  - the log stream
  - the dashboards
  - the test-fired alert
  - the traced request
  - the location of the runbooks
artifact_contract_verified_by: each of the five launch conditions is true for the released build
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/observability-checklist.md
status: active
revision: 1
---

# Gate the launch on working telemetry
Before a feature ships to production, all of the following are true:
Structured logs flowing to the log aggregator
RED metrics visible in dashboards for every new endpoint and dependency
At least one symptom-based alert configured, with runbook, test-fired
A request can be traced across every service it touches
On-call knows where the runbooks are
