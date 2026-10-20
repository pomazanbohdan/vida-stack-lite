---
instruction_id: bound-the-cardinality-of-metric-labels
title: Bound the cardinality of metric labels
summary: "Labels come from small fixed sets, and unbounded values belong in logs and traces instead."
capability_tags:
  - instrument-production-code
pattern_tags:
  - structured-observability
conditions_applies_when: You add a label to a metric series.
conditions_does_not_apply_when: The label value is a small fixed set by construction.
artifact_contract_output_type: label-set
artifact_contract_required_data:
  - the allowed labels
  - the values that must never be labels
artifact_contract_verified_by: every label value comes from a bounded set
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 1
---

# Bound the cardinality of metric labels

**Cardinality is the failure mode.**
Every unique label combination is a separate time series.
Labels must come from small, fixed sets (route template, status class, provider name).
Never use user IDs, raw URLs, error messages, or other unbounded values as labels — that belongs in logs and traces.

```
OK as label:    route="/api/tasks/:id"   status_class="5xx"   provider="stripe"
NEVER a label:  user_id, email, request_id, full URL, error message text
```
