---
instruction_id: alert-on-symptoms-not-causes
title: "Alert on symptoms users feel, not on causes"
summary: "Page on the error rate and the latency the user experiences, and keep the resource causes on a dashboard."
capability_tags:
  - instrument-production-code
pattern_tags:
  - symptom-based-alerting
conditions_applies_when: You write or review an alert rule.
conditions_does_not_apply_when: The rule is a dashboard panel that never notifies anyone.
artifact_contract_output_type: alert-rule
artifact_contract_required_data:
  - the symptom
  - the threshold
  - the duration
artifact_contract_verified_by: the rule fires on the user-visible symptom and not on the cause
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 1
---

# Alert on symptoms users feel, not on causes

Alert on **symptoms users feel**, not on causes:

```
SYMPTOM (page-worthy):           CAUSE (dashboard, not a page):
error rate > 1% for 5 min        CPU at 85%
p99 latency > 2s                 one pod restarted
queue age > 10 min               disk at 70%
```

Cause-based alerts fire when nothing is wrong and miss failures you didn't predict.
Symptom-based alerts fire exactly when users are hurt, regardless of the cause.
