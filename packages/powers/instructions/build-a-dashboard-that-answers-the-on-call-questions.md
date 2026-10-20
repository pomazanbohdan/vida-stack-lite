---
instruction_id: build-a-dashboard-that-answers-the-on-call-questions
title: Build a dashboard that answers the on-call questions
summary: "The dashboard shows error rate, latency, traffic and saturation, and answers the questions written down for the feature instead of everything else."
capability_tags:
  - instrument-production-code
pattern_tags:
  - operational-telemetry
conditions_applies_when: A dashboard is built for a service or a feature.
conditions_does_not_apply_when: No dashboard is in scope.
artifact_contract_output_type: dashboard-review
artifact_contract_required_data:
  - the questions the dashboard answers
  - the panels and their measures
  - the default time range
artifact_contract_verified_by: each on-call question can be answered from the dashboard as it stands
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/observability-checklist.md
status: active
revision: 1
---

# Build a dashboard that answers the on-call questions
Service health dashboard exists: error rate, latency p99, traffic, saturation
Dependency health panel shows per-service error rates and latency
Dashboard answers the on-call questions from the top of this checklist — not "everything except the answer"
Default time range is sensible (1h–6h, not 30d)
