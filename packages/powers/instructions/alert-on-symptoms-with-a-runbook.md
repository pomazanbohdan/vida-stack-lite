---
instruction_id: alert-on-symptoms-with-a-runbook
title: "Alert on symptoms, and give every alert a runbook"
summary: "An alert fires on a user-visible symptom, states what to do first, and has been fired once to prove it reaches the right channel."
capability_tags:
  - instrument-production-code
pattern_tags:
  - symptom-based-alerting
conditions_applies_when: An alert is created or changed on a running service.
conditions_does_not_apply_when: The work emits no alert.
artifact_contract_output_type: alert-review
artifact_contract_required_data:
  - the symptom the alert watches
  - the threshold and its justification
  - the severity
  - the runbook link
  - the test-fire result
artifact_contract_verified_by: the alert was fired once and reached the right channel with a working runbook link
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=addy-skills; license=MIT; revision=aeac41d4d005999432bb7312f7ff06383a91d59d; path=references/observability-checklist.md
status: active
revision: 1
---

# Alert on symptoms, and give every alert a runbook
Every alert is symptom-based (error rate, p99 latency, queue age) — causes (CPU, disk, restarts) go to dashboards, not pagers
Every alert is actionable; "ignore it, it self-heals" alerts are deleted
Every alert links to a runbook — minimum three lines: what it means, first query to run, escalation path
Thresholds and durations justified by an SLO or historical data, not guesses
Two severities only: **page** (user-facing, act now) and **ticket** (degradation, act this week)
Each new alert test-fired once: it reached the right channel and the runbook link works
No alerts that fire daily and get acknowledged without action
