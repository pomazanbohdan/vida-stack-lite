---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-business-metrics
title: Point everything at one metric
summary: "Choose a comparative OMTM from business model and stage, pair it with a counter-metric and a target line, cohort and segment the data and flag cumulative vanity metrics."
capability_tags:
  - build-growth-engine
pattern_tags:
  - one-metric
conditions_applies_when: Choosing the operating metric for growth.
conditions_does_not_apply_when: A stage where another metric is primary.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The OMTM, counter-metric, line in the sand and cohorted funnel are recorded."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-business/SKILL.md; sha256=114d4477a4d53234d3d58a4142a156bc55406137105f733ff6b9213236f762e7; locator=skills/grow-business/SKILL.md#L167-L180"
status: active
revision: 1
---

# Point everything at one metric

Phase 8 selects one metric indicating whether the riskiest business activity works and gates experiments. Use comparative ratios/rates that change behavior; stop measuring metrics that change no decision, and treat cumulative rising totals as vanity signals. Derive OMTM from business model and stage (Empathy, Stickiness, Virality, Revenue, Scale); SaaS examples include churn, MRR, LTV:CAC and time-to-value. Pair OMTM with a counter-metric to prevent gaming, and commit to a target, date and response if missed. Segment and cohort metrics because blended averages hide truth. Record stage, OMTM, counter-metric, line in the sand, KPI definitions, baselines/targets, funnel and cohort notes; flag vanity metrics.
