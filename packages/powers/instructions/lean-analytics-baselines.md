---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-analytics-baselines
title: Set baselines and lines in the sand
summary: "Use published baselines as heuristics, define good enough, and pre-commit a target, date and miss action; re-derive benchmarks against your own cohorts."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: "Setting a metric target, triaging an anomaly or evaluating a channel."
conditions_does_not_apply_when: A metric with no decision attached.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The target names a number, a date and a miss action, and any benchmark is checked against the organization's cohorts."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-analytics/SKILL.md; sha256=ed66ef399bdfeb2ab56583940b47d58b516162826bb81a40d121c9a17c0c8006; locator=skills/lean-analytics/SKILL.md#L128-L151"
status: active
revision: 1
---

# Set baselines and lines in the sand

Do not treat a metric without a target as useful decision guidance. Use published baselines as starting heuristics, not laws, to define “good enough,” then set a target number, date, and precommitted miss action. Treat roughly 5% monthly early-SaaS customer churn as an upper viability bound and roughly 2% or lower as healthy direction; DAU/MAU around 20%+ as a real-engagement signal; casual mobile day-30 retention around 14% as an approximate average; e-commerce visitor conversion around 1–3% as typical; and 25–30% landing-page conversion on good paid traffic as exceptional, not a planning number. Viral coefficient above 1 is rare and fleeting; treat virality as CAC reduction and optimize cycle time before coefficient. Without a relevant benchmark, measure current performance, improve against it, and watch the derivative; 5% weekly improvement compounds. Re-derive benchmarks for market, channel, price point, and era, and validate against own cohorts before adopting another party’s number. Apply baselines and commitments to targets, anomaly triage, and channel evaluation.
