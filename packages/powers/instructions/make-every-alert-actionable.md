---
instruction_id: make-every-alert-actionable
title: Make every alert actionable
summary: "An alert that needs no action is deleted, and the rest carry a threshold, a duration, a severity and a runbook link."
capability_tags:
  - instrument-production-code
pattern_tags:
  - symptom-based-alerting
conditions_applies_when: You create an alert rule or review an existing one.
conditions_does_not_apply_when: The signal is a dashboard panel and never notifies anyone.
artifact_contract_output_type: alert-rule-review
artifact_contract_required_data:
  - the severity
  - the threshold
  - the duration
  - the runbook link
artifact_contract_verified_by: "every alert has a justified threshold, a duration, one of the two severities and a runbook"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=skills/observability-and-instrumentation/SKILL.md
status: active
revision: 1
---

# Make every alert actionable

Rules for every alert you create:

1. **It must be actionable.** If the response is "ignore it, it self-heals", delete the alert.
2. **It links to a runbook** — even three lines: what it means, first query to run, escalation path.
3. **It has a threshold and duration** justified by the SLO or by historical data, not by a guess.
4. Use two severities only: **page** (user-facing, act now) and **ticket** (degradation, act this week). A third tier becomes noise that trains people to ignore everything.
