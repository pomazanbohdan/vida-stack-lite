---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: lean-analytics-omtm
title: Run the One Metric That Matters
summary: "Select one OMTM for the current riskiest assumption, rotate it at stage gates, pair it with a counter-metric, and pre-commit a target, date and miss response."
capability_tags:
  - measure-performance
pattern_tags:
  - metric-gated-decision
conditions_applies_when: "Planning a quarter, designing a dashboard or aligning a team on a metric."
conditions_does_not_apply_when: A metric used only for external reporting.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The OMTM, its counter-metric, its target date and the miss response are written before results arrive."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/lean-analytics/SKILL.md; sha256=ed66ef399bdfeb2ab56583940b47d58b516162826bb81a40d121c9a17c0c8006; locator=skills/lean-analytics/SKILL.md#L54-L79"
status: active
revision: 1
---

# Run the One Metric That Matters

At any moment select the one metric that indicates whether the current riskiest assumption is working, display it broadly, and let it drive experiments until the next stage. Rotate it when a stage gate is passed or the business pivots. Pair it with a counter-metric to limit gaming; define a line in the sand with a target, date, and precommitted response to a miss, and decide “good enough” in advance. If the team cannot agree on the OMTM, resolve disagreement about the riskiest business issue. Collect many metrics but watch one, keeping others in drill-down reports. The line disciplines company bets, not individuals; personal OMTM quotas invite gaming and conceal truth. Apply these rules to planning, dashboards, and team alignment.
