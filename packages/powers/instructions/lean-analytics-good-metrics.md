---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-analytics-good-metrics
title: Separate good metrics from vanity metrics
summary: "Prefer comparative, understandable ratios or rates that change behavior; use cohorts, segments and experiments, and treat cumulative charts as a vanity warning."
capability_tags:
  - measure-performance
pattern_tags:
  - performance-measurement
conditions_applies_when: Auditing a dashboard or choosing a product metric.
conditions_does_not_apply_when: A statutory financial report with a fixed format.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "Each metric is a ratio or rate, has a comparison, and states the decision it changes; totals are rewritten or removed."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-analytics/SKILL.md; sha256=ed66ef399bdfeb2ab56583940b47d58b516162826bb81a40d121c9a17c0c8006; locator=skills/lean-analytics/SKILL.md#L30-L53"
status: active
revision: 1
---

# Separate good metrics from vanity metrics

Prefer metrics that are comparative, understandable, ratios or rates rather than ever-growing totals, and capable of changing behavior; stop measuring a number that will not change an action. Use qualitative/quantitative, exploratory/reporting, leading/lagging, and correlated/causal lenses for their distinct purposes. Treat correlation as a way to find candidate levers, then use a randomized experiment changing one factor to test causality. Compare cohorts over time and segment by channel, plan, and geography; use medians and percentiles where skew makes averages misleading. Treat cumulative up-and-to-the-right charts as a strong vanity warning. In dashboard audits rewrite totals as ratios; in board reports show cohorts rather than cumulative curves; for feature decisions require a behavior-changing metric. Consult the linked detailed reference for its stated audit use cases.
