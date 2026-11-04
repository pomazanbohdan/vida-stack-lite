---
schema: VPInstruction/v1.2
classification_status: unclassified
classification_reason: classification-not-assessed
instruction_id: grow-app-metrics
title: Measure the one number
summary: "Choose a comparative ratio OMTM, use the Empathy, Stickiness, Virality, Revenue, Scale order, keep retention as the OMTM while weak, pair it with a counter-metric and a target line, and keep the dashboard to at most six supporting metrics."
capability_tags:
  - design-retention-engine
pattern_tags:
  - one-metric
  - stickiness-stage
conditions_applies_when: "Choosing the app's operating metric."
conditions_does_not_apply_when: A model or stage that makes another metric primary.
artifact_contract_output_type: none
artifact_contract_required_data: []
artifact_contract_verified_by: "The OMTM, counter-metric, target line, cohort baselines and retired vanity metrics are recorded."
compatibility_excludes: []
compatibility_requires: []
provenance:
  - "donor=wondelai-skills; license=MIT; revision=c172996495bed0fcd26896a9416b2093fd7073f0; path=skills/grow-app/SKILL.md; sha256=b4c840ff8ae77ebedd97748307658216afeb51277c5655b5a1daf5e179171051; locator=skills/grow-app/SKILL.md#L148-L164"
status: active
revision: 1
---

# Measure the one number

Select an OMTM that is comparative, a ratio or rate rather than a cumulative total, and changes behavior. Let business model determine relevant metrics and use this stage order: Empathy, Stickiness, Virality, Revenue, Scale. When retention is weak, use Stickiness-stage retention as the OMTM; working a later stage first is the canonical mistake. Define a target, date, and precommitted response to missing it, pair the OMTM with a counter-metric, and cohort the data. Review current dashboard and business model; flag vanity measures; specify a one-screen dashboard with the OMTM prominent and no more than six supporting metrics, plus a cohorted retention view. With the user, choose the OMTM, counter-metric, target/date/miss response, and vanity metrics to retire. Create METRICS.md with stage/OMTM, KPI definitions, baselines/targets, funnel, and cohort notes; update the tracker. Completion requires these records, the dashboard specification, and the Rule 8 retention bar.
